// ff-wallet.js
// Wallet connect + restore + dashboard + owned/staked rendering

const {
  // config/state
  FF_COLLECTION_ADDRESS,
  FF_CONTROLLER_ADDRESS,
  FF_ALCHEMY_NFT_BASE,
  FF_WALLET_STORAGE_KEY,

  // shared state mutators
  get ffWeb3, set ffWeb3,
  get ffCurrentAccount, set ffCurrentAccount,
  get FF_CONNECTED_ADDRESS, set FF_CONNECTED_ADDRESS,

  get FF_WALLET_RENDER_TOKEN, set FF_WALLET_RENDER_TOKEN,
  get FF_WALLET_RENDER_INFLIGHT, set FF_WALLET_RENDER_INFLIGHT,
  get FF_LAST_WALLET_RENDERED_FOR, set FF_LAST_WALLET_RENDERED_FOR,

  // helpers
  parseTokenId,
  dedupeByTokenId,
  truncateAddress,
  normalizeMetadata,
  hasUsableMetadata,
  fetchFrogMetadata,
  ffFetchOpenSeaAccount,
  ffGetStakingData
} = window.FF;

// ------------------------
// Small UI helpers you already had
// ------------------------
function ffSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function ffSetAvatar(id, url) {
  const el = document.getElementById(id);
  if (el) el.src = url;
}
function ffUpdateWalletBasicUI(address) {
  ffSetText('wallet-status-label', address ? 'Connected' : 'Disconnected');
  ffSetText('dashboard-wallet', address ? `Wallet: ${truncateAddress(address)}` : 'Wallet: —');
}
function ffLinkWalletAddress(address) {
  const walletLink = document.getElementById('wallet-nav-link');
  if (!walletLink) return;

  walletLink.style.display = 'inline-block';
  walletLink.href = `/${address}`;
  walletLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/${address}`;
  });
}

function ffPersistConnectedWallet(address) {
  try {
    if (address) localStorage.setItem(FF_WALLET_STORAGE_KEY, address);
    else localStorage.removeItem(FF_WALLET_STORAGE_KEY);
  } catch {}
}

function ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile) {
  ffUpdateWalletBasicUI(address);
  if (typeof ownedCount === 'number') ffSetText('stat-owned', ownedCount.toString());

  if (stakingStats) {
    if (typeof stakingStats.stakedIds?.length === 'number') ffSetText('stat-staked', String(stakingStats.stakedIds.length));
    if (stakingStats.rewardsAvailable != null) ffSetText('stat-rewards-available', String(stakingStats.rewardsAvailable));
    if (stakingStats.rewardsEarned != null) ffSetText('stat-rewards-earned', String(stakingStats.rewardsEarned));
  }

  if (profile) {
    if (profile.username) ffSetText('dashboard-username', profile.username);
    if (profile.avatarUrl) ffSetAvatar('dashboard-avatar', profile.avatarUrl);
  }
}

// ------------------------
// Alchemy fetchers
// ------------------------
async function ffFetchOwnedFrogs(address) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = [];
  const seen  = new Set();
  for (const nft of all) {
    if (nft?.contract?.address?.toLowerCase() !== target) continue;
    const id = parseTokenId(nft.tokenId || nft.id?.tokenId);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    frogs.push(nft);
  }
  return frogs;
}

async function ffFetchOwnedFrogCount(address) {
  const nfts = await ffFetchOwnedFrogs(address);
  return nfts.length;
}

// ------------------------
// Connected wallet check helpers
// ------------------------
function ffIsViewingOwnWallet(address) {
  if (!address || !FF_CONNECTED_ADDRESS) return false;
  return address.toLowerCase() === FF_CONNECTED_ADDRESS.toLowerCase();
}

// ------------------------
// Wallet connect / restore
// ------------------------
async function connectWallet() {
  if (!window.ethereum) return alert('No Ethereum wallet detected.');

  try {
    const wasPublicWalletRoute = window.FF_PUBLIC_WALLET_VIEW && !!window.FF_PUBLIC_WALLET_ADDRESS;

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) return;

    const address = accounts[0];
    ffCurrentAccount = address;
    FF_CONNECTED_ADDRESS = address;

    try { sessionStorage.setItem('FF_SESSION_CONNECTED', '1'); } catch {}

    window.FF_PUBLIC_WALLET_VIEW = false;
    window.FF_PUBLIC_WALLET_ADDRESS = null;

    if (!ffWeb3) ffWeb3 = new Web3(window.ethereum);
    window.web3 = ffWeb3;
    window.user_address = address;

    ffLinkWalletAddress(address);
    ffPersistConnectedWallet(address);

    if (typeof COLLECTION_ABI !== 'undefined') {
      window.collection = new ffWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
    }
    if (typeof CONTROLLER_ABI !== 'undefined') {
      window.controller = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }

    const [ownedCount, stakingData, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch(() => null),
      ffGetStakingData(address).catch(() => null),
      ffFetchOpenSeaAccount(address).catch(() => null)
    ]);

    ffApplyDashboardUpdates(address, ownedCount, stakingData, profile);

    // show wallet/morph nav and hide connect buttons
    ffApplyConnectionVisibility(true);

    const activeNav = document.querySelector('.nav a.active[data-view]');
    const activeView = activeNav?.dataset.view;
    const onWalletView = activeView === 'wallet' || wasPublicWalletRoute;

    if (onWalletView) {
      window.ffShowView('wallet');
      renderOwnedAndStakedFrogs(address);
    }

  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet.');
  }
}
window.connectWallet = connectWallet;

function ffApplyConnectionVisibility(isConnected) {
  const morphNav =
    document.querySelector('.nav a[data-view="morph"]') ||
    document.querySelector('.nav a[href^="/morph"]');
  if (morphNav) morphNav.style.display = isConnected ? '' : 'none';

  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) walletNav.style.display = isConnected ? '' : 'none';

  const connectBtn =
    document.getElementById('header-connect-wallet-btn') ||
    document.getElementById('nav-connect-wallet-btn') ||
    document.getElementById('hero-connect-wallet-btn');
  if (connectBtn) connectBtn.style.display = isConnected ? 'none' : '';
}

function ffInitWalletOnLoad() {
  // wire any connect buttons that exist
  const btnIds = [
    'connect-wallet-button',
    'hero-connect-wallet-btn',
    'header-connect-wallet-btn'
  ];
  btnIds.forEach((id) => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', connectWallet);
  });

  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');

  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) walletNav.style.display = 'none';

  ffApplyConnectionVisibility(false);

  // Public wallet route (/0x...)
  if (window.FF_PUBLIC_WALLET_VIEW && ffCurrentAccount) {
    ffUpdateWalletBasicUI(ffCurrentAccount);
    renderOwnedAndStakedFrogs(ffCurrentAccount);
  }

  ffRestoreWalletSession();
}
window.ffInitWalletOnLoad = ffInitWalletOnLoad;

async function ffRestoreWalletSession() {
  if (!window.ethereum) return false;

  let flag = null;
  try { flag = sessionStorage.getItem('FF_SESSION_CONNECTED'); } catch {}
  if (flag !== '1') return false;

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts?.length) {
      try { sessionStorage.removeItem('FF_SESSION_CONNECTED'); } catch {}
      return false;
    }

    const address = accounts[0];

    ffCurrentAccount = address;
    FF_CONNECTED_ADDRESS = address;
    window.user_address = address;

    if (!ffWeb3) ffWeb3 = new Web3(window.ethereum);

    // if on /0x route and it matches ours, disable public mode
    if (
      window.FF_PUBLIC_WALLET_VIEW &&
      window.FF_PUBLIC_WALLET_ADDRESS &&
      window.FF_PUBLIC_WALLET_ADDRESS.toLowerCase() === address.toLowerCase()
    ) {
      window.FF_PUBLIC_WALLET_VIEW = false;
      window.FF_PUBLIC_WALLET_ADDRESS = null;
    }

    ffLinkWalletAddress(address);
    ffUpdateWalletBasicUI(address);
    ffApplyConnectionVisibility(true);

    // force wallet re-render if on wallet view
    const activeNav = document.querySelector('.nav a.active[data-view]');
    const activeView = activeNav?.dataset.view || window.ffDetermineInitialViewFromPath?.();

    if (activeView === 'wallet') {
      FF_LAST_WALLET_RENDERED_FOR = null;
      FF_WALLET_RENDER_INFLIGHT = false;
      renderOwnedAndStakedFrogs(address);
    }

    return true;
  } catch (err) {
    console.warn('ffRestoreWalletSession failed:', err);
    return false;
  }
}

// helper for views.js to call
window.ffEnsureWalletRender = function () {
  if (!ffCurrentAccount) return;
  const ownedGrid  = document.getElementById('owned-frogs-grid');
  const stakedGrid = document.getElementById('staked-frogs-grid');
  const gridsEmpty =
    (!ownedGrid || !ownedGrid.children.length) &&
    (!stakedGrid || !stakedGrid.children.length);

  if (!FF_WALLET_RENDER_INFLIGHT &&
      (FF_LAST_WALLET_RENDERED_FOR !== ffCurrentAccount || gridsEmpty)) {
    renderOwnedAndStakedFrogs(ffCurrentAccount);
  }
};

// ------------------------
// Render wallet frogs
// ------------------------
async function renderOwnedAndStakedFrogs(address) {
  const myToken = ++FF_WALLET_RENDER_TOKEN;
  FF_WALLET_RENDER_INFLIGHT = true;
  FF_LAST_WALLET_RENDERED_FOR = address;

  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const stakedGrid  = document.getElementById('staked-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedStatus= document.getElementById('staked-frogs-status');

  const viewingOwnWallet = ffIsViewingOwnWallet(address);
  const isPublic = window.FF_PUBLIC_WALLET_VIEW && !viewingOwnWallet;

  try {
    const [ownedNfts, stakingData, morphedMetas] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffGetStakingData(address).catch(() => ({ stakedIds: [] })),
      window.ffFetchMorphedFrogs?.(address) || Promise.resolve([])
    ]);

    if (myToken !== FF_WALLET_RENDER_TOKEN) return;

    const stakedIds = stakingData?.stakedIds || [];

    ownedGrid && (ownedGrid.innerHTML = '');
    stakedGrid && (stakedGrid.innerHTML = '');

    if (ownedStatus) ownedStatus.textContent = ownedNfts.length ? '' : 'No frogs found in this wallet.';
    if (stakedStatus) stakedStatus.textContent = stakedIds.length ? '' : 'No staked frogs found for this wallet.';

    // owned (unstaked)
    for (const nft of ownedNfts) {
      if (myToken !== FF_WALLET_RENDER_TOKEN) return;

      const tokenId = parseTokenId(nft.tokenId || nft.id?.tokenId);
      if (tokenId == null) continue;

      // skip those that are staked
      if (stakedIds.includes(tokenId)) continue;

      let metadata = normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      const actionHtml = isPublic ? '' : `
        <div class="frog-actions">
          <button class="sale_link_btn" onclick="ffStakeFrog(${tokenId})">Stake</button>
          <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
        </div>
      `;

      const card = window.createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight: '',
        footerHtml: '',
        actionHtml
      });

      ownedGrid?.appendChild(card);
      if (card.dataset.imgContainerId) {
        window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      window.ffSetOwnerLabel(card, address);
      window.ffAttachStakeMetaIfStaked(card, tokenId);
    }

    // staked
    for (const tokenId of stakedIds) {
      if (myToken !== FF_WALLET_RENDER_TOKEN) return;

      const metadata = await fetchFrogMetadata(tokenId);

      const actionHtml = isPublic ? '' : `
        <div class="frog-actions">
          <button class="sale_link_btn" onclick="ffUnstakeFrog(${tokenId})">Unstake</button>
          <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
        </div>
      `;

      const card = window.createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight: 'Staked',
        footerHtml: '',
        actionHtml
      });

      stakedGrid?.appendChild(card);
      if (card.dataset.imgContainerId) {
        window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      window.ffSetOwnerLabel(card, address);
      window.ffAttachStakeMetaIfStaked(card, tokenId);
    }

    // morphed frogs section if you have a grid for it
    if (Array.isArray(morphedMetas) && morphedMetas.length) {
      const morphGrid = document.getElementById('morphed-frogs-grid');
      const morphStatus = document.getElementById('morphed-frogs-status');
      if (morphGrid) {
        morphGrid.innerHTML = '';
        for (const meta of morphedMetas) {
          const card = window.createMorphedFrogCard({
            metadata: meta,
            ownerAddress: address
          });
          morphGrid.appendChild(card);

          const contId = card.dataset.imgContainerId;
          const baseId = parseTokenId(meta?.frogA ?? meta?.tokenA ?? null);
          window.ffBuildLayeredMorphedImage(meta, contId, baseId);
        }
        if (morphStatus) morphStatus.textContent = '';
      }
    }

  } catch (err) {
    console.warn('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus) ownedStatus.textContent = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  } finally {
    if (myToken === FF_WALLET_RENDER_TOKEN) {
      FF_WALLET_RENDER_INFLIGHT = false;
    }
  }
}
window.renderOwnedAndStakedFrogs = renderOwnedAndStakedFrogs;

// ------------------------
// On-chain actions (same signatures as your old file)
// ------------------------
async function ffStakeFrog(tokenId) {
  if (!FF_CONNECTED_ADDRESS || !window.controller) return alert('Connect wallet first.');
  try {
    await window.controller.methods.stake(tokenId).send({ from: FF_CONNECTED_ADDRESS });
    renderOwnedAndStakedFrogs(FF_CONNECTED_ADDRESS);
  } catch (err) {
    console.warn('ffStakeFrog failed:', err);
    alert('Stake failed.');
  }
}
async function ffUnstakeFrog(tokenId) {
  if (!FF_CONNECTED_ADDRESS || !window.controller) return alert('Connect wallet first.');
  try {
    await window.controller.methods.unstake(tokenId).send({ from: FF_CONNECTED_ADDRESS });
    renderOwnedAndStakedFrogs(FF_CONNECTED_ADDRESS);
  } catch (err) {
    console.warn('ffUnstakeFrog failed:', err);
    alert('Unstake failed.');
  }
}
async function ffTransferFrog(tokenId) {
  if (!FF_CONNECTED_ADDRESS || !window.collection) return alert('Connect wallet first.');
  const to = prompt('Transfer to address:');
  if (!to) return;

  try {
    await window.collection.methods.safeTransferFrom(
      FF_CONNECTED_ADDRESS,
      to,
      tokenId
    ).send({ from: FF_CONNECTED_ADDRESS });

    renderOwnedAndStakedFrogs(FF_CONNECTED_ADDRESS);
  } catch (err) {
    console.warn('ffTransferFrog failed:', err);
    alert('Transfer failed.');
  }
}

window.ffStakeFrog = ffStakeFrog;
window.ffUnstakeFrog = ffUnstakeFrog;
window.ffTransferFrog = ffTransferFrog;

// expose for other files
window.ffApplyConnectionVisibility = ffApplyConnectionVisibility;
window.ffPersistConnectedWallet = ffPersistConnectedWallet;
window.ffUpdateWalletBasicUI = ffUpdateWalletBasicUI;
window.ffLinkWalletAddress = ffLinkWalletAddress;
