// assets/site.js

// ------------------------
// Config
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // optional
const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE  = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;
let   FF_ACTIVITY_MODE      = 'sales'; // 'mints' or 'sales' for the bottom grid
const FF_SHOW_STAKING_STATS_ON_SALES = true; // show staking info everywhere we can

// 50 at a time for all grids with Load More
let FF_RECENT_LIMIT = 50; // sales / mints
let FF_RARITY_LIMIT = 100;
let FF_POND_LIMIT   = 200;

// Global-ish state for wallet & views
let ffCurrentView    = 'sales';       // 'sales' | 'collection' | 'rarity' | 'wallet' | 'pond'
let ffCurrentAccount = null;          // connected wallet
let ffWeb3           = null;          // Web3 instance used for legacy helpers

// Cache rarity lookup map
let ffRarityLookup   = null;

// ------------------------
// Bootstrapping
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffInitWalletOnLoad();   // disconnected UI, wire connect button
  ffInitNavViews();       // hook up Collection / Rarity / Wallet / Pond tabs
  ffInitHeroActions();    // hero "View Collection" + hero "Connect wallet" buttons

  // Default view is "sales" (Recent Sales at bottom)
  ffSetView('sales');
});

// Basic helper to set innerText safely
function ffSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ------------------------
// Hero actions
// ------------------------
function ffInitHeroActions() {
  const heroCollectionBtn = document.getElementById('hero-view-collection-btn');
  if (heroCollectionBtn) {
    heroCollectionBtn.addEventListener('click', () => {
      ffSetView('collection'); // Recent mints
    });
  }

  const heroConnectBtn = document.getElementById('hero-connect-wallet-btn');
  if (heroConnectBtn) {
    heroConnectBtn.addEventListener('click', () => {
      connectWallet();
    });
  }
}

// ------------------------
// View switching (tabs)
// ------------------------
function ffInitNavViews() {
  const tabs = document.querySelectorAll('.nav a[data-view]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (ev) => {
      ev.preventDefault();
      const view = tab.dataset.view;
      if (view) {
        ffSetView(view);
      }
    });
  });
}

function ffSetView(view) {
  ffCurrentView = view;

  // Highlight active tab
  const tabs = document.querySelectorAll('.nav a[data-view]');
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  const activityPanel = document.getElementById('recent-activity-panel');
  const ownedPanel    = document.getElementById('owned-panel');
  const stakedPanel   = document.getElementById('staked-panel');
  const rarityPanel   = document.getElementById('rarity-panel');
  const pondPanel     = document.getElementById('pond-panel');

  if (activityPanel) {
    // sales (default) and collection (mints) both use the activity grid
    activityPanel.style.display =
      view === 'sales' || view === 'collection' ? '' : 'none';
  }
  if (ownedPanel)  ownedPanel.style.display  = view === 'wallet' ? '' : 'none';
  if (stakedPanel) stakedPanel.style.display = view === 'wallet' ? '' : 'none';
  if (rarityPanel) rarityPanel.style.display = view === 'rarity' ? '' : 'none';
  if (pondPanel)   pondPanel.style.display   = view === 'pond' ? '' : 'none';

  // Kick off loaders based on view
  if (view === 'sales') {
    FF_ACTIVITY_MODE = 'sales';
    loadRecentActivity();
  } else if (view === 'collection') {
    FF_ACTIVITY_MODE = 'mints';
    loadRecentActivity();
  } else if (view === 'rarity') {
    ffLoadRarityGrid();
  } else if (view === 'wallet') {
    if (ffCurrentAccount) {
      // Owned + staked frogs stacked vertically
      renderOwnedAndStakedFrogs(ffCurrentAccount);
    } else {
      const ownedStatus  = document.getElementById('owned-frogs-status');
      const stakedStatus = document.getElementById('staked-frogs-status');
      if (ownedStatus)  ownedStatus.textContent  = 'Connect your wallet to view owned frogs.';
      if (stakedStatus) stakedStatus.textContent = 'Connect your wallet to view staked frogs.';
    }
  } else if (view === 'pond') {
    ffLoadPondGrid();
  }
}

// ------------------------
// Wallet connect / disconnect
// ------------------------
async function connectWallet() {
  if (!window.ethereum) {
    alert('No Ethereum wallet detected. Please install MetaMask or a compatible wallet.');
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || !accounts.length) return;

    const address = accounts[0];
    ffCurrentAccount = address;

    if (!ffWeb3) {
      ffWeb3 = new Web3(window.ethereum);
    }

    // Expose Web3 + contracts for legacy staking helpers (ethereum-dapp.js)
    window.web3         = ffWeb3;
    window.user_address = address;

    try {
      if (typeof COLLECTION_ABI !== 'undefined') {
        window.collection = new ffWeb3.eth.Contract(
          COLLECTION_ABI,
          FF_COLLECTION_ADDRESS
        );
      }
      if (typeof CONTROLLER_ABI !== 'undefined') {
        window.controller = new ffWeb3.eth.Contract(
          CONTROLLER_ABI,
          FF_CONTROLLER_ADDRESS
        );
      }
    } catch (err) {
      console.warn('Failed to init legacy contracts', err);
    }

    ffUpdateWalletBasicUI(address);

    const [ownedCount, stakingStats, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch((err) => {
        console.warn('Owned frogs count fetch failed:', err);
        return null;
      }),
      ffFetchStakingStats(address).catch((err) => {
        console.warn('Staking stats fetch failed:', err);
        return null;
      }),
      ffFetchOpenSeaProfile(address).catch((err) => {
        console.warn('OpenSea profile fetch failed:', err);
        return null;
      })
    ]);

    ffApplyDashboardUpdates({
      address,
      ownedCount,
      stakingStats,
      profile
    });

    // If user is already on wallet view, refresh frogs
    if (ffCurrentView === 'wallet') {
      renderOwnedAndStakedFrogs(address);
    }
  } catch (err) {
    console.error('connectWallet failed:', err);
    alert('Failed to connect wallet. See console for details.');
  }
}

function ffUpdateWalletBasicUI(address) {
  const short = truncateAddress(address) || 'Wallet';
  ffSetText('wallet-status-label', `Connected`);
  ffSetText('dashboard-wallet', `Wallet: ${short}`);

  const headerBtn = document.getElementById('connect-wallet-button');
  if (headerBtn) {
    headerBtn.textContent = short;
  }

  const walletNavLink = document.getElementById('wallet-nav-link');
  if (walletNavLink) {
    walletNavLink.style.display = 'inline-block';
    walletNavLink.textContent   = short;
  }
}

// Apply everything to the wallet dashboard
function ffApplyDashboardUpdates({ address, ownedCount, stakingStats, profile }) {
  if (address) {
    ffSetText('dashboard-wallet', `Wallet: ${truncateAddress(address)}`);
  }

  if (ownedCount != null) {
    ffSetText('dashboard-owned-count', `${ownedCount} frogs owned`);
  }

  if (stakingStats && Array.isArray(stakingStats)) {
    const [stakedCount, totalEarned, available] = stakingStats;
    ffSetText('dashboard-staked-count', `${stakedCount} frogs staked`);
    ffSetText('dashboard-total-earned', `${totalEarned} FLYZ earned`);
    ffSetText('dashboard-available', `${available} FLYZ available`);
  }

  if (profile) {
    if (profile.username) {
      ffSetText('dashboard-username', profile.username);
    }
    if (profile.avatarUrl) {
      ffSetAvatar(profile.avatarUrl);
    }
  }
}

function ffSetAvatar(url) {
  const img = document.getElementById('dashboard-avatar');
  if (img) {
    img.src = url;
  }
}

function ffInitWalletOnLoad() {
  const headerBtn = document.getElementById('connect-wallet-button');
  if (headerBtn) {
    headerBtn.addEventListener('click', connectWallet);
  }

  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');

  const walletNavLink = document.getElementById('wallet-nav-link');
  if (walletNavLink) {
    walletNavLink.style.display = 'none';
  }
}

// Convert roman numerals from stakingValues() into normal numbers
function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();

  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let result = 0;
  let prevValue = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    const value = map[roman[i]] || 0;
    if (value < prevValue) {
      result -= value;
    } else {
      result += value;
      prevValue = value;
    }
  }
  return result || null;
}

// ------------------------
// Recent Activity (sales / mints)
// ------------------------
async function loadRecentActivity() {
  const container = document.getElementById('recent-sales');
  const statusEl  = document.getElementById('recent-sales-status');

  if (!container) {
    console.warn('loadRecentActivity: #recent-sales not found');
    return;
  }

  if (statusEl) {
    statusEl.textContent =
      FF_ACTIVITY_MODE === 'mints'
        ? 'Loading recent mints...'
        : 'Loading recent sales...';
  }

  try {
    const items =
      FF_ACTIVITY_MODE === 'mints'
        ? await fetchRecentMints(FF_RECENT_LIMIT)
        : await fetchRecentSales(FF_RECENT_LIMIT);

    if (!items.length) {
      if (statusEl) {
        statusEl.textContent =
          FF_ACTIVITY_MODE === 'mints'
            ? 'No recent mints found.'
            : 'No recent sales found.';
      }
      container.innerHTML = '';
      return;
    }

    // Re-render everything fresh each time so "Load more" just shows more rows
    container.innerHTML = '';

    for (const item of items) {
      const rawTokenId =
        FF_ACTIVITY_MODE === 'mints'
          ? (item.erc721TokenId || item.tokenId)
          : item.tokenId;

      if (!rawTokenId) {
        console.warn('Skipping item with missing tokenId', item);
        continue;
      }

      const tokenId = parseTokenId(rawTokenId);
      if (!tokenId) {
        console.warn('Skipping item with unparseable tokenId', rawTokenId, item);
        continue;
      }

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to;
        headerRight  = formatMintAge(item);   // e.g. "3d ago"
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress);

      const actionArray = [
        {
          type: 'link',
          label: 'OpenSea',
          href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'opensea'
        },
        {
          type: 'link',
          label: 'Etherscan',
          href: `https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'etherscan'
        }
      ];

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml: '',
        actions: actionArray
      });

      container.appendChild(card);

      // Optional staking stats on recent-sales cards
      ffAnnotateSaleWithStaking(card, tokenId);
    }
  } catch (err) {
    console.error('Unable to load recent activity', err);
    const status = FF_ACTIVITY_MODE === 'mints'
      ? 'Unable to load recent mints right now.'
      : 'Unable to load recent sales right now.';
    if (statusEl) statusEl.textContent = status;
  }
}

// Optional: annotate a recent-sale card with staking stats
async function ffAnnotateSaleWithStaking(card, tokenId) {
  // If toggle is off, do nothing
  if (!FF_SHOW_STAKING_STATS_ON_SALES) { return; }

  // Need legacy helpers loaded from ethereum-dapp.js
  if (typeof stakingValues !== 'function') {
    console.warn('stakingValues() not available; skipping staking stats for sales.');
    return;
  }

  // Requires controller contract from ethereum-dapp.js; if it's not initialized
  // yet, skip staking annotation rather than throwing an error.
  if (typeof window === 'undefined' || !window.controller) {
    console.warn('Controller contract not initialized; skipping staking stats for sales.');
    return;
  }

  try {
    const values = await stakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned, stakedDate] = values;

    // Convert roman to normal number if needed
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const propsBlock =
      card.querySelector('.recent_sale_properties') ||
      card.querySelector('.recent_sale_traits') ||
      card;

    const wrapper = document.createElement('div');
    wrapper.className = 'staking-sale-stats';
    wrapper.innerHTML = `
      <div><strong>Staked Lvl. ${levelNum}</strong> • ${Math.round(flyzEarned)} FLYZ earned</div>
      <div>Staked ${stakedDays}d ago • Since ${stakedDate}</div>
    `;

    propsBlock.appendChild(wrapper);
  } catch (err) {
    console.warn('ffAnnotateSaleWithStaking failed for token', tokenId, err);
  }
}

// ------------------------
// Token / rarity helpers
// ------------------------
function parseTokenId(raw) {
  if (raw == null) return null;

  // unwrap common object shapes
  if (typeof raw === 'object' && raw.tokenId != null) {
    raw = raw.tokenId;
  }

  let s = String(raw).trim();
  if (s.startsWith('0x')) {
    // hex string from on-chain id
    const n = parseInt(s, 16);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;

  return n;
}

function getRarityRank(tokenId) {
  if (typeof window === 'undefined') return null;

  const map = window.freshfrogs_rarity_rankings;
  if (!map) {
    if (!getRarityRank._warned) {
      console.warn('[FreshFrogs] freshfrogs_rarity_rankings not found on window');
      getRarityRank._warned = true;
    }
    return null;
  }

  const key = String(tokenId);
  return map[key] || null;
}

function buildRarityLookup() {
  if (ffRarityLookup) return ffRarityLookup;

  if (typeof window === 'undefined') return null;
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return null;

  const entries = [];
  for (const [tokenId, rank] of Object.entries(map)) {
    entries.push({ tokenId: parseInt(tokenId, 10), rank: rank });
  }

  entries.sort((a, b) => a.rank - b.rank);
  ffRarityLookup = entries;
  return entries;
}

// ------------------------
// Rarity grid (Rarity tab)
// ------------------------
async function ffLoadRarityGrid() {
  const container = document.getElementById('rarity-grid');
  const statusEl  = document.getElementById('rarity-status');

  if (!container) return;

  if (statusEl) statusEl.textContent = 'Loading rarity rankings...';

  try {
    const entries = buildRarityLookup();
    if (!entries || !entries.length) {
      if (statusEl) statusEl.textContent = 'Rarity rankings not available.';
      container.innerHTML = '';
      return;
    }

    const slice = entries.slice(0, FF_RARITY_LIMIT);
    container.innerHTML = '';

    for (const entry of slice) {
      const tokenId  = entry.tokenId;
      const metadata = await fetchFrogMetadata(tokenId);

      const footerHtml = `
        <div class="rarity-meta">
          <span class="rarity-rank">Rank #${entry.rank}</span>
        </div>
      `;

      const actions = [
        {
          type: 'link',
          label: 'OpenSea',
          href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'opensea'
        },
        {
          type: 'link',
          label: 'Etherscan',
          href: `https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'etherscan'
        }
      ];

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: `#${tokenId}`,
        headerRight: `Rank #${entry.rank}`,
        footerHtml,
        actionHtml: '',
        actions
      });

      container.appendChild(card);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadRarityGrid failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load rarity rankings right now.';
  }
}

// ------------------------
// Pond (all staked frogs, community view)
// ------------------------
async function ffFetchAllStakedTokenIds() {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; Pond fetch disabled.');
    return [];
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  // Flexible helper to try multiple method names
  const stakedRaw = await ffTryContractCall(contract, [
    'getAllStakedTokens',
    'getAllStakedTokenIds',
    'allStakedTokens',
    'getStakedTokens'
  ], []);

  if (!stakedRaw) return [];

  const result = [];

  if (Array.isArray(stakedRaw)) {
    for (const v of stakedRaw) {
      let candidate = v;
      if (candidate && typeof candidate === 'object' && 'tokenId' in candidate) {
        candidate = candidate.tokenId;
      }
      const id = parseTokenId(candidate);
      if (id != null) result.push(id);
    }
  }

  return result;
}

async function ffLoadPondGrid() {
  const container = document.getElementById('pond-grid');
  const statusEl  = document.getElementById('pond-status');

  if (!container) return;

  if (!ffWeb3) {
    if (statusEl) {
      statusEl.textContent = 'Connect your wallet to query the Pond.';
    }
    return;
  }

  if (statusEl) statusEl.textContent = 'Loading staked frogs (Pond)...';

  try {
    const ids = await ffFetchAllStakedTokenIds();
    if (!ids.length) {
      if (statusEl) statusEl.textContent = 'No frogs are currently staked in the Pond.';
      container.innerHTML = '';
      return;
    }

    const slice = ids.slice(0, FF_POND_LIMIT);

    container.innerHTML = '';

    for (const tokenId of slice) {
      const metadata = await fetchFrogMetadata(tokenId);

      const footerHtml = `
        <div class="stake-meta">
          <div class="stake-meta-row">
            <span id="stake-level-${tokenId}" class="stake-level-label">Staked Lvl. —</span>
          </div>
          <div class="stake-meta-row stake-meta-subrow">
            <span id="stake-date-${tokenId}">Staked: —</span>
            <span id="stake-next-${tokenId}"></span>
          </div>
          <div class="stake-progress">
            <div id="stake-progress-bar-${tokenId}" class="stake-progress-bar"></div>
          </div>
        </div>
      `;

      const actions = [
        {
          type: 'link',
          label: 'OpenSea',
          href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'opensea'
        },
        {
          type: 'link',
          label: 'Etherscan',
          href: `https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}`,
          className: 'etherscan'
        }
      ];

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: 'Pond',
        headerRight: 'Staked',
        footerHtml,
        actionHtml: '',
        actions
      });

      container.appendChild(card);

      // Fill staking details for this tokenId (using legacy helpers)
      ffDecorateStakedFrogCard(tokenId);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadPondGrid failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load Pond data right now.';
  }
}

// ---- OpenSea profile: username + avatar ----
async function ffFetchOpenSeaProfile(address) {
  if (!FF_OPENSEA_API_KEY) {
    console.warn('OpenSea API key missing; profile fetch disabled.');
    return null;
  }

  try {
    const url = `https://api.opensea.io/api/v2/accounts/${address}`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': FF_OPENSEA_API_KEY
      }
    });

    if (!res.ok) {
      console.warn('OpenSea profile fetch failed:', res.status);
      return null;
    }

    const data = await res.json();
    const user = data.account || data;
    if (!user) return null;

    return {
      username: user.username || '',
      avatarUrl: user.profile_img_url || user.profileImageUrl || ''
    };
  } catch (err) {
    console.warn('ffFetchOpenSeaProfile error:', err);
    return null;
  }
}

// ===================================================
// Owned / Staked frogs rendering (wallet view)
// ===================================================

// Get all owned frogs (NFTs of this collection in the wallet)
async function ffFetchOwnedFrogs(address) {
  if (!FF_ALCHEMY_NFT_BASE) return [];

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getNFTsForOwner failed:', res.status);
    return [];
  }

  const data = await res.json();
  const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  return all.filter((nft) => {
    const addr =
      (nft.contract && nft.contract.address) ||
      (nft.contractAddress) ||
      (nft.address);
    return addr && addr.toLowerCase() === target;
  });
}

// Get tokenIds that are currently staked by this user
// This mirrors the legacy getStakedTokensOf / getStakedTokens() helper (from ethereum-dapp.js)
async function ffFetchStakedTokenIds(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staked frogs fetch disabled.');
    return [];
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

  if (!stakedRaw) return [];

  const result = [];

  // Array of ids or structs
  if (Array.isArray(stakedRaw)) {
    for (const v of stakedRaw) {
      let candidate = v;

      // If contract returns struct { tokenId, ... }
      if (candidate && typeof candidate === 'object' && 'tokenId' in candidate) {
        candidate = candidate.tokenId;
      }

      const id = parseTokenId(candidate);
      if (id != null) result.push(id);
    }
  }

  return result;
}

// Render owned + staked frogs into their grids
async function renderOwnedAndStakedFrogs(address) {
  const ownedGrid    = document.getElementById('owned-frogs-grid');
  const ownedStatus  = document.getElementById('owned-frogs-status');
  const stakedGrid   = document.getElementById('staked-frogs-grid');
  const stakedStatus = document.getElementById('staked-frogs-status');

  if (ownedGrid)  ownedGrid.innerHTML  = '';
  if (stakedGrid) stakedGrid.innerHTML = '';

  try {
    const [ownedNfts, stakedIds] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch((err) => {
        console.warn('ffFetchStakedTokenIds failed:', err);
        return [];
      })
    ]);

    // ---- Owned frogs ----
    if (ownedStatus) {
      ownedStatus.textContent = ownedNfts.length
        ? ''
        : 'No frogs found in this wallet.';
    }

    if (ownedGrid && ownedNfts.length) {
      for (const nft of ownedNfts) {
        const rawTokenId = nft.tokenId || (nft.id && nft.id.tokenId);
        const tokenId    = parseTokenId(rawTokenId);
        if (tokenId == null) continue;

        let metadata = normalizeMetadata(
          nft.rawMetadata || nft.metadata || nft.tokenMetadata
        );
        if (!hasUsableMetadata(metadata)) {
          metadata = await fetchFrogMetadata(tokenId);
        }

        const actions = [
          {
            type: 'button',
            label: 'Stake',
            onClick: (id) => ffStakeFrog(id)
          },
          {
            type: 'button',
            label: 'Transfer',
            onClick: (id) => ffTransferFrog(id)
          },
          {
            type: 'link',
            label: 'OpenSea',
            href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'opensea'
          },
          {
            type: 'link',
            label: 'Etherscan',
            href: `https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'etherscan'
          }
        ];

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: truncateAddress(address),
          headerRight: 'Owned',
          footerHtml: '',
          actionHtml: '',
          actions
        });

        ownedGrid.appendChild(card);
      }
    }

    // ---- Staked frogs ----
    if (stakedStatus) {
      stakedStatus.textContent = stakedIds.length
        ? ''
        : 'No staked frogs found for this wallet.';
    }

    if (stakedGrid && stakedIds.length) {
      for (const tokenId of stakedIds) {
        let metadata = await fetchFrogMetadata(tokenId);

        const footerHtml = `
          <div class="stake-meta">
            <div class="stake-meta-row">
              <span id="stake-level-${tokenId}" class="stake-level-label">Staked Lvl. —</span>
            </div>
            <div class="stake-meta-row stake-meta-subrow">
              <span id="stake-date-${tokenId}">Staked: —</span>
              <span id="stake-next-${tokenId}"></span>
            </div>
            <div class="stake-progress">
              <div id="stake-progress-bar-${tokenId}" class="stake-progress-bar"></div>
            </div>
          </div>
        `;

        const actions = [
          {
            type: 'button',
            label: 'Unstake',
            onClick: (id) => ffUnstakeFrog(id)
          },
          {
            type: 'link',
            label: 'OpenSea',
            href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'opensea'
          },
          {
            type: 'link',
            label: 'Etherscan',
            href: `https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'etherscan'
          }
        ];

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: truncateAddress(address || ffCurrentAccount) || 'Pond',
          headerRight: 'Staked',
          footerHtml,
          actionHtml: '',
          actions
        });

        stakedGrid.appendChild(card);

        // Fill staking info (Lvl., rewards, progress)
        ffDecorateStakedFrogCard(tokenId);
      }
    }
  } catch (err) {
    console.error('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus)  ownedStatus.textContent  = 'Error loading owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Error loading staked frogs.';
  }
}

// Thin wrappers to legacy staking functions in ethereum-dapp.js
async function ffStakeFrog(tokenId) {
  try {
    if (typeof stake === 'function') {
      await stake(tokenId);
      alert('Stake transaction submitted.');
    } else {
      alert('Stake function not available.');
    }
  } catch (err) {
    console.error('ffStakeFrog failed:', err);
    alert('Stake failed. See console for details.');
  }
}

async function ffUnstakeFrog(tokenId) {
  try {
    if (typeof unstake === 'function') {
      await unstake(tokenId);
      alert('Unstake transaction submitted.');
    } else {
      alert('Unstake function not available.');
    }
  } catch (err) {
    console.error('ffUnstakeFrog failed:', err);
    alert('Unstake failed. See console for details.');
  }
}

async function ffTransferFrog(tokenId) {
  const to = prompt('Enter recipient address:');
  if (!to) return;

  try {
    if (typeof transfer === 'function') {
      await transfer(tokenId, to);
      alert('Transfer transaction submitted.');
    } else {
      alert('Transfer function not available.');
    }
  } catch (err) {
    console.error('ffTransferFrog failed:', err);
    alert('Transfer failed. See console for details.');
  }
}

// Decorate staking UI elements for a given tokenId
async function ffDecorateStakedFrogCard(tokenId) {
  try {
    if (typeof stakingValues !== 'function') return;
    if (typeof window === 'undefined' || !window.controller) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned] = await stakingValues(tokenId);
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const lvlEl   = document.getElementById(`stake-level-${tokenId}`);
    const dateEl  = document.getElementById(`stake-date-${tokenId}`);
    const nextEl  = document.getElementById(`stake-next-${tokenId}`);
    const barEl   = document.getElementById(`stake-progress-bar-${tokenId}`);

    if (lvlEl) lvlEl.textContent = `Staked Lvl. ${levelNum}`;
    if (dateEl) dateEl.textContent = `Staked: ${stakedDays}d ago`;
    if (nextEl) nextEl.textContent = `Next level in ~${daysToNext}d`;

    if (barEl) {
      const totalRequired = (ffRomanToArabic(rawLevel) ?? 1) * 1000;
      const progress      = Math.max(0, Math.min(1, (stakedDays * 24) / totalRequired));
      barEl.style.width   = `${Math.round(progress * 100)}%`;
    }
  } catch (err) {
    console.warn('ffDecorateStakedFrogCard failed:', err);
  }
}

// ------------------------
// Card rendering (shared for all grids)
// ------------------------
function ffEscapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTraitsHtml(metadata) {
  if (!metadata || !Array.isArray(metadata.attributes)) return '';

  const rows = metadata.attributes.map((attr) => {
    const trait = ffEscapeHtml(attr.trait_type || '');
    const value = ffEscapeHtml(attr.value || '');
    return `<div class="sale_trait"><span>${trait}</span><span>${value}</span></div>`;
  });

  return rows.join('');
}

function createFrogCard({
  tokenId,
  metadata,
  headerLeft,
  headerRight,
  footerHtml,
  actionHtml,
  actions
}) {
  const frogName   = `Frog #${tokenId}`;
  const rarityRank = getRarityRank(tokenId);
  const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;

  const rarityText  = rarityTier ? rarityTier.label : 'RARITY UNKNOWN';
  const rarityClass = rarityTier
    ? `rarity_badge ${rarityTier.className}`
    : 'rarity_badge rarity_unknown';

  const traitsHtml = buildTraitsHtml(metadata);

  // Unique container id for layering into this card
  const imgContainerId = `frog-img-${tokenId}-${Math.random().toString(16).slice(2)}`;

  const card = document.createElement('div');
  card.className = 'recent_sale_card';
  card.dataset.tokenId = tokenId;
  card.dataset.imgContainerId = imgContainerId;

  card.innerHTML = `
    <div class="recent_sale_header">
      <strong class="sale_card_title">${ffEscapeHtml(headerLeft || '')}</strong>
      <strong class="sale_card_price">${ffEscapeHtml(headerRight || '')}</strong>
      <div style="clear: both;"></div>
    </div>

    <!-- Frog image / layered attributes container -->
    <div id="${imgContainerId}" class="frog_img_cont">
      <!-- base image is set from JS; this <img> is a safety fallback -->
      <img
        src="https://freshfrogs.github.io/frog/${tokenId}.png"
        class="recent_sale_img"
        alt="Frog #${tokenId}"
        loading="lazy"
      />
    </div>

    <!-- Traits / text area -->
    <div class="recent_sale_traits">
      <strong class="sale_card_title">${ffEscapeHtml(frogName)}</strong>
      <strong class="sale_card_price ${rarityClass}">${ffEscapeHtml(rarityText)}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
      ${footerHtml || ''}
      ${actionHtml || ''}
      <div class="recent_sale_links"></div>
    </div>
  `;

  // Build layered frog image (background + trait layers) if helper is available
  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId, metadata).catch((err) => {
      console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
    });
  }

  // Build action buttons/links in a single consistent place at bottom
  if (Array.isArray(actions) && actions.length) {
    const actionsContainer = card.querySelector('.recent_sale_links');
    actionsContainer.innerHTML = '';

    actions.forEach((action) => {
      if (!action || !action.label) return;

      if (action.type === 'link' && action.href) {
        const a = document.createElement('a');
        a.href = action.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = action.label;
        if (action.className) {
          a.className = action.className;
        }
        actionsContainer.appendChild(a);
      } else if (action.type === 'button') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = action.label;
        btn.className = 'btn secondary';

        if (typeof action.onClick === 'function') {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            action.onClick(tokenId, card);
          });
        }
        actionsContainer.appendChild(btn);
      }
    });
  }

  return card;
}

// Build layered frog image into a given container.
//
// NOTE:
// - We always prefer the metadata that was already fetched by the caller,
//   so we don't need a second metadata request for the same frog.
// - If metadata is missing for some reason, we fall back to fetching from
//   /frog/json/{id}.json so rendering still works.
async function ffBuildLayeredFrogImage(tokenId, containerId, metadata) {
  try {
    const container =
      typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;

    if (!container) return;

    let meta = metadata || null;
    if (!meta || !meta.attributes) {
      // Fallback: fetch canonical metadata from the static JSON
      meta = await fetchFrogMetadata(tokenId);
    }

    // For now we simply ensure the base PNG is rendered.
    // This is also the place to plug in true layered rendering later
    // using meta.attributes to decide which trait layers to stack.
    let img = container.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      container.appendChild(img);
    }

    img.src = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    img.alt = `Frog #${tokenId}`;
    img.className = img.className || 'recent_sale_img';
    img.loading = 'lazy';
  } catch (err) {
    console.warn('ffBuildLayeredFrogImage error for token', tokenId, err);
  }
}

function getRarityTier(rank) {
  if (!rank) return null;
  
  if (rank === 1) {
    return { label: 'Legendary', className: 'rarity_legendary' };
  } else if (rank <= 25) {
    return { label: 'Mythic', className: 'rarity_mythic' };
  } else if (rank <= 250) {
    return { label: 'Epic', className: 'rarity_epic' };
  } else if (rank <= 1000) {
    return { label: 'Rare', className: 'rarity_rare' };
  } else if (rank <= 2500) {
    return { label: 'Uncommon', className: 'rarity_uncommon' };
  } else {
    return { label: 'Common', className: 'rarity_common' };
  }
}

// ------------------------
// Metadata helpers
// ------------------------
function normalizeMetadata(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const copy = { ...raw };

  if (!Array.isArray(copy.attributes) && Array.isArray(copy.traits)) {
    copy.attributes = copy.traits;
  }
  return copy;
}

function hasUsableMetadata(metadata) {
  if (!metadata) return false;
  const attributes = Array.isArray(metadata.attributes)
    ? metadata.attributes
    : [];
  return attributes.length > 0;
}

async function fetchFrogMetadata(tokenId) {
  try {
    const url      = `https://freshfrogs.github.io/frog/json/${tokenId}.json`;
    const response = await fetch(url, { cache: 'force-cache' });

    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const json = await response.json();
    return normalizeMetadata(json) || {};
  } catch (err) {
    console.error(`Failed to fetch metadata for token ${tokenId}`, err);
    return {};
  }
}

// ------------------------
// Formatting helpers
// ------------------------
function truncateAddress(address) {
  if (!address) return '-';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSalePrice(sale) {
  if (!sale || !sale.price) return '';
  const value = sale.price;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `${value} ETH`;
  return '';
}

function formatMintPrice(mint) {
  if (!mint || !mint.price) return '';
  const value = mint.price;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `${value} ETH`;
  return '';
}

function formatMintAge(mint) {
  if (!mint || !mint.blockTimestamp) return '';
  const ts = new Date(mint.blockTimestamp * 1000);
  const now = Date.now();
  const diffMs = now - ts.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

// ------------------------
// Alchemy recent sales / mints
// ------------------------
async function fetchRecentSales(limit) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getSales?contractAddress=${FF_COLLECTION_ADDRESS}&limit=${limit || 50}&order=desc`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getSales failed:', res.status);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data.sales) ? data.sales : [];
}

async function fetchRecentMints(limit) {
  const url = `${FF_ALCHEMY_CORE_BASE}/getAssetTransfers?category=external,erc20,erc721,erc1155&toAddress=${FF_COLLECTION_ADDRESS}&maxCount=${limit || 50}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getAssetTransfers failed:', res.status);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data.transfers) ? data.transfers : [];
}

// ------------------------
// Simple contract-call helper
// ------------------------
async function ffTryContractCall(contract, methodNames, args) {
  if (!contract || !contract.methods) return null;

  for (const name of methodNames) {
    if (contract.methods[name]) {
      try {
        return await contract.methods[name](...(args || [])).call();
      } catch (err) {
        console.warn(`Call to ${name} failed, trying next fallback`, err);
      }
    }
  }

  return null;
}

// ------------------------
// Dashboard stats via controller (optional)
// ------------------------
async function ffFetchOwnedFrogCount(address) {
  try {
    if (!FF_ALCHEMY_NFT_BASE) return null;

    const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=false&contractAddresses[]=${FF_COLLECTION_ADDRESS}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
    return all.length;
  } catch (err) {
    console.warn('ffFetchOwnedFrogCount failed:', err);
    return null;
  }
}

async function ffFetchStakingStats(address) {
  try {
    if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') return null;

    const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    const [stakedRaw, availableRaw, totalRaw] = await Promise.all([
      ffTryContractCall(contract, ['getStakedTokensOf', 'stakedTokensOf'], [address]),
      ffTryContractCall(contract, ['availableRewards'], [address]),
      ffTryContractCall(contract, ['totalRewardsEarnedOf', 'getTotalRewardsOf'], [address])
    ]);

    const stakedCount = Array.isArray(stakedRaw) ? stakedRaw.length : 0;
    // Assume values are wei-like; convert to 3 decimal FLYZ for display
    const div = 1e18;
    const available = availableRaw ? (Number(availableRaw) / div).toFixed(3) : '0.000';
    const total     = totalRaw ? (Number(totalRaw) / div).toFixed(3) : '0.000';

    return [stakedCount, total, available];
  } catch (err) {
    console.warn('ffFetchStakingStats failed:', err);
    return null;
  }
}

// ------------------------
// Small UI helpers for actions menu
// ------------------------
function ffToggleActionsMenu(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}
