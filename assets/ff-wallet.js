(() => {
  // ff-wallet.js (scoped)
  const FF = window.FF;
  if (!FF) {
    console.error("FF core not loaded before ff-wallet.js");
    return;
  }

  // Use FF.* directly (no invalid get/set destructuring)
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
    ffSetText('dashboard-wallet', address ? `Wallet: ${FF.truncateAddress(address)}` : 'Wallet: —');
  }

  function ffLinkWalletAddress(address) {
    const walletLink = document.getElementById('wallet-nav-link');
    if (!walletLink) return;
    walletLink.style.display = 'inline-block';
    walletLink.href = `/${address}`;
    walletLink.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = `/${address}`;
    });
  }

  function ffPersistConnectedWallet(address) {
    try {
      if (address) localStorage.setItem(FF_WALLET_STORAGE_KEY, address);
      else localStorage.removeItem(FF_WALLET_STORAGE_KEY);
    } catch {}
  }

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

  async function ffFetchOwnedFrogs(address) {
    const url = `${FF.FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
    const target = FF.FF_COLLECTION_ADDRESS.toLowerCase();

    const frogs = [];
    const seen  = new Set();
    for (const nft of all) {
      if (nft?.contract?.address?.toLowerCase() !== target) continue;
      const id = FF.parseTokenId(nft.tokenId || nft.id?.tokenId);
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

  function ffIsViewingOwnWallet(address) {
    if (!address || !FF.FF_CONNECTED_ADDRESS) return false;
    return address.toLowerCase() === FF.FF_CONNECTED_ADDRESS.toLowerCase();
  }

  async function connectWallet() {
    if (!window.ethereum) return alert('No Ethereum wallet detected.');

    try {
      const wasPublicWalletRoute = window.FF_PUBLIC_WALLET_VIEW && !!window.FF_PUBLIC_WALLET_ADDRESS;

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts?.length) return;

      const address = accounts[0];
      FF.ffCurrentAccount = address;
      FF.FF_CONNECTED_ADDRESS = address;

      try { sessionStorage.setItem('FF_SESSION_CONNECTED', '1'); } catch {}

      window.FF_PUBLIC_WALLET_VIEW = false;
      window.FF_PUBLIC_WALLET_ADDRESS = null;

      if (!FF.ffWeb3) FF.ffWeb3 = new Web3(window.ethereum);
      window.web3 = FF.ffWeb3;
      window.user_address = address;

      ffLinkWalletAddress(address);
      ffPersistConnectedWallet(address);

      if (typeof COLLECTION_ABI !== 'undefined') {
        window.collection = new FF.ffWeb3.eth.Contract(COLLECTION_ABI, FF.FF_COLLECTION_ADDRESS);
      }
      if (typeof CONTROLLER_ABI !== 'undefined') {
        window.controller = new FF.ffWeb3.eth.Contract(CONTROLLER_ABI, FF.FF_CONTROLLER_ADDRESS);
      }

      const [ownedCount, stakingData, profile] = await Promise.all([
        ffFetchOwnedFrogCount(address).catch(() => null),
        FF.ffGetStakingData(address).catch(() => null),
        FF.ffFetchOpenSeaAccount(address).catch(() => null)
      ]);

      ffUpdateWalletBasicUI(address);
      if (ownedCount != null) ffSetText('stat-owned', String(ownedCount));
      if (stakingData) {
        ffSetText('stat-staked', String(stakingData.stakedIds?.length || 0));
        stakingData.rewardsAvailable != null && ffSetText('stat-rewards-available', String(stakingData.rewardsAvailable));
        stakingData.rewardsEarned != null && ffSetText('stat-rewards-earned', String(stakingData.rewardsEarned));
      }
      if (profile) {
        profile.username && ffSetText('dashboard-username', profile.username);
        profile.avatarUrl && ffSetAvatar('dashboard-avatar', profile.avatarUrl);
      }

      ffApplyConnectionVisibility(true);

      const activeView = document.querySelector('.nav a.active[data-view]')?.dataset.view;
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

  function ffInitWalletOnLoad() {
    ['connect-wallet-button','hero-connect-wallet-btn','header-connect-wallet-btn']
      .forEach(id => document.getElementById(id)?.addEventListener('click', connectWallet));

    ffSetText('wallet-status-label', 'Disconnected');
    ffSetText('dashboard-wallet', 'Wallet: —');
    ffSetText('dashboard-username', 'Not connected');
    document.getElementById('wallet-nav-link')?.style && (document.getElementById('wallet-nav-link').style.display='none');
    ffApplyConnectionVisibility(false);

    if (window.FF_PUBLIC_WALLET_VIEW && FF.ffCurrentAccount) {
      ffUpdateWalletBasicUI(FF.ffCurrentAccount);
      renderOwnedAndStakedFrogs(FF.ffCurrentAccount);
    }

    ffRestoreWalletSession();
  }
  window.ffInitWalletOnLoad = ffInitWalletOnLoad;

  async function ffRestoreWalletSession() {
    if (!window.ethereum) return false;

    let flag=null;
    try { flag=sessionStorage.getItem('FF_SESSION_CONNECTED'); } catch {}
    if (flag!=='1') return false;

    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (!accounts?.length) {
        try { sessionStorage.removeItem('FF_SESSION_CONNECTED'); } catch {}
        return false;
      }

      const address = accounts[0];
      FF.ffCurrentAccount = address;
      FF.FF_CONNECTED_ADDRESS = address;
      window.user_address = address;

      if (!FF.ffWeb3) FF.ffWeb3 = new Web3(window.ethereum);

      if (window.FF_PUBLIC_WALLET_VIEW &&
          window.FF_PUBLIC_WALLET_ADDRESS &&
          window.FF_PUBLIC_WALLET_ADDRESS.toLowerCase() === address.toLowerCase()) {
        window.FF_PUBLIC_WALLET_VIEW = false;
        window.FF_PUBLIC_WALLET_ADDRESS = null;
      }

      ffLinkWalletAddress(address);
      ffUpdateWalletBasicUI(address);
      ffApplyConnectionVisibility(true);

      if (document.querySelector('.nav a.active[data-view]')?.dataset.view === 'wallet') {
        FF.FF_LAST_WALLET_RENDERED_FOR = null;
        FF.FF_WALLET_RENDER_INFLIGHT = false;
        renderOwnedAndStakedFrogs(address);
      }

      return true;
    } catch (err) {
      console.warn('ffRestoreWalletSession failed:', err);
      return false;
    }
  }

  window.ffEnsureWalletRender = function () {
    if (!FF.ffCurrentAccount) return;
    const ownedGrid  = document.getElementById('owned-frogs-grid');
    const stakedGrid = document.getElementById('staked-frogs-grid');
    const empty =
      (!ownedGrid || !ownedGrid.children.length) &&
      (!stakedGrid || !stakedGrid.children.length);

    if (!FF.FF_WALLET_RENDER_INFLIGHT &&
        (FF.FF_LAST_WALLET_RENDERED_FOR !== FF.ffCurrentAccount || empty)) {
      renderOwnedAndStakedFrogs(FF.ffCurrentAccount);
    }
  };

  async function renderOwnedAndStakedFrogs(address) {
    const myToken = ++FF.FF_WALLET_RENDER_TOKEN;
    FF.FF_WALLET_RENDER_INFLIGHT = true;
    FF.FF_LAST_WALLET_RENDERED_FOR = address;

    const ownedGrid   = document.getElementById('owned-frogs-grid');
    const stakedGrid  = document.getElementById('staked-frogs-grid');
    const ownedStatus = document.getElementById('owned-frogs-status');
    const stakedStatus= document.getElementById('staked-frogs-status');

    const viewingOwnWallet = ffIsViewingOwnWallet(address);
    const isPublic = window.FF_PUBLIC_WALLET_VIEW && !viewingOwnWallet;

    try {
      const [ownedNfts, stakingData, morphedMetas] = await Promise.all([
        ffFetchOwnedFrogs(address),
        FF.ffGetStakingData(address).catch(() => ({ stakedIds: [] })),
        window.ffFetchMorphedFrogs?.(address) || Promise.resolve([])
      ]);

      if (myToken !== FF.FF_WALLET_RENDER_TOKEN) return;

      const stakedIds = stakingData?.stakedIds || [];

      ownedGrid && (ownedGrid.innerHTML = '');
      stakedGrid && (stakedGrid.innerHTML = '');

      ownedStatus && (ownedStatus.textContent = ownedNfts.length ? '' : 'No frogs found in this wallet.');
      stakedStatus && (stakedStatus.textContent = stakedIds.length ? '' : 'No staked frogs found for this wallet.');

      for (const nft of ownedNfts) {
        if (myToken !== FF.FF_WALLET_RENDER_TOKEN) return;

        const tokenId = FF.parseTokenId(nft.tokenId || nft.id?.tokenId);
        if (tokenId == null) continue;
        if (stakedIds.includes(tokenId)) continue;

        let metadata = FF.normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
        if (!FF.hasUsableMetadata(metadata)) metadata = await FF.fetchFrogMetadata(tokenId);

        const actionHtml = isPublic ? '' : `
          <div class="frog-actions">
            <button class="sale_link_btn" onclick="ffStakeFrog(${tokenId})">Stake</button>
            <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
          </div>
        `;

        const card = window.createFrogCard({ tokenId, metadata, actionHtml });
        ownedGrid?.appendChild(card);
        card.dataset.imgContainerId && window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
        window.ffSetOwnerLabel(card, address);
        window.ffAttachStakeMetaIfStaked(card, tokenId);
      }

      for (const tokenId of stakedIds) {
        if (myToken !== FF.FF_WALLET_RENDER_TOKEN) return;

        const metadata = await FF.fetchFrogMetadata(tokenId);

        const actionHtml = isPublic ? '' : `
          <div class="frog-actions">
            <button class="sale_link_btn" onclick="ffUnstakeFrog(${tokenId})">Unstake</button>
            <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
          </div>
        `;

        const card = window.createFrogCard({ tokenId, metadata, headerRight:'Staked', actionHtml });
        stakedGrid?.appendChild(card);
        card.dataset.imgContainerId && window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
        window.ffSetOwnerLabel(card, address);
        window.ffAttachStakeMetaIfStaked(card, tokenId);
      }

      if (Array.isArray(morphedMetas) && morphedMetas.length) {
        const morphGrid = document.getElementById('morphed-frogs-grid');
        const morphStatus = document.getElementById('morphed-frogs-status');
        if (morphGrid) {
          morphGrid.innerHTML = '';
          for (const meta of morphedMetas) {
            const card = window.createMorphedFrogCard({ metadata: meta, ownerAddress: address });
            morphGrid.appendChild(card);
            const contId = card.dataset.imgContainerId;
            const baseId = FF.parseTokenId(meta?.frogA ?? meta?.tokenA ?? null);
            window.ffBuildLayeredMorphedImage(meta, contId, baseId);
          }
          morphStatus && (morphStatus.textContent = '');
        }
      }
    } catch (err) {
      console.warn('renderOwnedAndStakedFrogs failed:', err);
      ownedStatus && (ownedStatus.textContent = 'Unable to load owned frogs.');
      stakedStatus && (stakedStatus.textContent = 'Unable to load staked frogs.');
    } finally {
      if (myToken === FF.FF_WALLET_RENDER_TOKEN) {
        FF.FF_WALLET_RENDER_INFLIGHT = false;
      }
    }
  }
  window.renderOwnedAndStakedFrogs = renderOwnedAndStakedFrogs;

  async function ffStakeFrog(tokenId) {
    if (!FF.FF_CONNECTED_ADDRESS || !window.controller) return alert('Connect wallet first.');
    try {
      await window.controller.methods.stake(tokenId).send({ from: FF.FF_CONNECTED_ADDRESS });
      renderOwnedAndStakedFrogs(FF.FF_CONNECTED_ADDRESS);
    } catch (err) {
      console.warn('ffStakeFrog failed:', err);
      alert('Stake failed.');
    }
  }
  async function ffUnstakeFrog(tokenId) {
    if (!FF.FF_CONNECTED_ADDRESS || !window.controller) return alert('Connect wallet first.');
    try {
      await window.controller.methods.unstake(tokenId).send({ from: FF.FF_CONNECTED_ADDRESS });
      renderOwnedAndStakedFrogs(FF.FF_CONNECTED_ADDRESS);
    } catch (err) {
      console.warn('ffUnstakeFrog failed:', err);
      alert('Unstake failed.');
    }
  }
  async function ffTransferFrog(tokenId) {
    if (!FF.FF_CONNECTED_ADDRESS || !window.collection) return alert('Connect wallet first.');
    const to = prompt('Transfer to address:');
    if (!to) return;
    try {
      await window.collection.methods.safeTransferFrom(FF.FF_CONNECTED_ADDRESS, to, tokenId)
        .send({ from: FF.FF_CONNECTED_ADDRESS });
      renderOwnedAndStakedFrogs(FF.FF_CONNECTED_ADDRESS);
    } catch (err) {
      console.warn('ffTransferFrog failed:', err);
      alert('Transfer failed.');
    }
  }

  window.ffStakeFrog = ffStakeFrog;
  window.ffUnstakeFrog = ffUnstakeFrog;
  window.ffTransferFrog = ffTransferFrog;
  window.ffApplyConnectionVisibility = ffApplyConnectionVisibility;
  window.ffPersistConnectedWallet = ffPersistConnectedWallet;
  window.ffUpdateWalletBasicUI = ffUpdateWalletBasicUI;
  window.ffLinkWalletAddress = ffLinkWalletAddress;
})();
