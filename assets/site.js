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
let FF_ACTIVITY_MODE        = 'sales'; // 'mints' or 'sales' for the bottom grid
const FF_SHOW_STAKING_STATS_ON_SALES = true; // show staking info everywhere we can

// 50 at a time for all grids with Load More
let FF_RECENT_LIMIT     = 50; // sales / mints
let FF_RARITY_LIMIT     = 50; // rarity view
let FF_COLLECTION_LIMIT = 50; // collection view
let FF_WALLET_LIMIT     = 50; // wallet view
let FF_POND_LIMIT       = 50; // pond view

// current top-level view: 'sales' | 'collection' | 'rarity' | 'wallet' | 'pond'
let ffCurrentView = 'sales';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let ffWeb3 = null;
let ffCurrentAccount = null;

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffInitReadOnlyWeb3AndContracts();
  ffInitWalletOnLoad();   // disconnected UI, wire connect button
  ffInitNavViews();       // hook up Collection / Rarity / Wallet / Pond tabs
  ffInitHeroActions();    // hero "View Collection" + hero "Connect Wallet"

  // Default view: recent sales (Recent Activity)
  ffSetView('sales');

  const loadMoreActivityBtn = document.getElementById('load-more-activity');
  if (loadMoreActivityBtn) {
    loadMoreActivityBtn.addEventListener('click', () => {
      FF_RECENT_LIMIT += 50;
      loadRecentActivity();
    });
  }

  const loadMoreRarityBtn = document.getElementById('load-more-rarity');
  if (loadMoreRarityBtn) {
    loadMoreRarityBtn.addEventListener('click', () => {
      FF_RARITY_LIMIT += 50;
      ffLoadRarityGrid();
    });
  }

  const loadMoreCollectionBtn = document.getElementById('load-more-collection');
  if (loadMoreCollectionBtn) {
    loadMoreCollectionBtn.addEventListener('click', () => {
      FF_COLLECTION_LIMIT += 50;
      ffLoadCollectionGrid();
    });
  }

  const loadMoreWalletBtn = document.getElementById('load-more-wallet');
  if (loadMoreWalletBtn) {
    loadMoreWalletBtn.addEventListener('click', () => {
      FF_WALLET_LIMIT += 50;
      ffLoadWalletFrogs();
    });
  }

  const loadMorePondBtn = document.getElementById('load-more-pond');
  if (loadMorePondBtn) {
    loadMorePondBtn.addEventListener('click', () => {
      FF_POND_LIMIT += 50;
      ffLoadPondGrid();
    });
  }

  // Load recent sales on first load
  loadRecentActivity();
});

// ===================================================
// Small utilities
// ===================================================
function ffEscapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ffTruncateAddress(addr, chars = 4) {
  if (!addr || typeof addr !== 'string') return '';
  if (addr.length <= 2 * chars + 2) return addr;
  return `${addr.slice(0, 2 + chars)}...${addr.slice(-chars)}`;
}

function ffSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function ffSetHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function parseTokenId(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const s = String(value).trim();
  if (!s) return null;

  if (s.startsWith('0x') || s.startsWith('0X')) {
    const n = parseInt(s, 16);
    return Number.isFinite(n) ? n : null;
  }

  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof metadata === 'object') return metadata;
  return null;
}

function hasUsableMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
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

function buildTraitsHtml(metadata) {
  const attributes = Array.isArray(metadata && metadata.attributes)
    ? metadata.attributes
    : [];

  if (!attributes.length) {
    return '<p class="frog-attr-text">Metadata unavailable</p>';
  }

  const lines = attributes
    .map((attr) => {
      if (!attr || !attr.trait_type) return '';
      const type  = String(attr.trait_type);
      const value = attr.value != null ? String(attr.value) : '';

      return `
      <p
        class="frog-attr-text"
        data-trait-type="${ffEscapeHtml(type)}"
        data-trait-value="${ffEscapeHtml(value)}"
      >
        ${ffEscapeHtml(type)}: ${ffEscapeHtml(value)}
      </p>
    `;
    })
    .filter(Boolean);

  return lines.join('');
}

// ------------------------
// Activity fetchers (mints/sales)
// ------------------------
async function fetchRecentSales(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'asc',
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy NFT sales request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.nftSales) ? payload.nftSales : [];
}

async function fetchRecentMints(limit = 24) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromAddress: ZERO_ADDRESS,
        contractAddresses: [FF_COLLECTION_ADDRESS],
        category: ['erc721'],
        order: 'desc',
        maxCount: '0x' + limit.toString(16),
        withMetadata: true
      }
    ]
  };

  const response = await fetch(FF_ALCHEMY_CORE_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Alchemy transfers (mints) request failed: ${response.status}`);
  }

  const payload = await response.json();
  const transfers =
    payload.result && Array.isArray(payload.result.transfers)
      ? payload.result.transfers
      : [];
  return transfers;
}

// ------------------------
// Formatting helpers
// ------------------------
function truncateAddress(addr) {
  if (!addr) return '';
  return ffTruncateAddress(addr, 4);
}

function formatSalePrice(sale) {
  if (!sale) return '--';

  const fee =
    sale.sellerFee || sale.protocolFee || sale.royaltyFee || sale.price;

  if (!fee || !fee.amount) {
    return '--';
  }

  const decimals = typeof fee.decimals === 'number' ? fee.decimals : 18;

  let amountNum;
  try {
    amountNum = Number(fee.amount) / Math.pow(10, decimals);
  } catch {
    return `${fee.amount} ${fee.symbol || ''}`.trim();
  }

  if (!isFinite(amountNum)) {
    return `${fee.amount} ${fee.symbol || ''}`.trim();
  }

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${fee.symbol || 'ETH'}`;
}

function formatMintAge(mint) {
  if (!mint || !mint.metadata) return '';
  if (!mint.metadata.blockTimestamp) return '';

  const ts = Date.parse(mint.metadata.blockTimestamp);
  if (!Number.isFinite(ts)) return '';

  const diffMs  = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);

  if (diffD > 0) return `${diffD}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return `${diffSec}s ago`;
}

// ------------------------
// Rarity helpers
// ------------------------
function ffGetRarityRankingEntries() {
  const map = window.freshfrogs_rarity_rankings;
  if (!map) {
    if (!ffGetRarityRankingEntries._warned) {
      console.warn('[FreshFrogs] freshfrogs_rarity_rankings not found; rarity view disabled.');
      ffGetRarityRankingEntries._warned = true;
    }
    return [];
  }

  if (ffGetRarityRankingEntries._cache) {
    return ffGetRarityRankingEntries._cache;
  }

  const items = [];

  if (Array.isArray(map)) {
    map.forEach((entry, index) => {
      if (!entry) return;

      // Case 1: array of objects like { id, ranking }
      if (typeof entry === 'object') {
        const id   = Number(entry.id);
        const rank = Number(entry.ranking ?? entry.rank ?? index + 1);
        if (Number.isFinite(id) && Number.isFinite(rank)) {
          items.push({ tokenId: id, rank });
        }
        return;
      }

      // Case 2: array of tokenIds sorted by rarity (best -> worst)
      const tokenId = parseInt(String(entry).replace(/[^\d]/g, ''), 10);
      const rank    = index + 1;
      if (Number.isFinite(tokenId)) {
        items.push({ tokenId, rank });
      }
    });
  } else if (typeof map === 'object') {
    for (const [key, value] of Object.entries(map)) {
      const tokenId = parseInt(String(key).replace(/[^\d]/g, ''), 10);
      const rank    = Number(value);
      if (Number.isFinite(tokenId) && Number.isFinite(rank)) {
        items.push({ tokenId, rank });
      }
    }
  }

  items.sort((a, b) => a.rank - b.rank);
  ffGetRarityRankingEntries._cache = items;
  return items;
}

function getRarityRank(tokenId) {
  const n = Number(tokenId);
  if (!Number.isFinite(n) || n <= 0) return null;

  const entries = ffGetRarityRankingEntries();
  if (!entries || !entries.length) return null;

  if (!getRarityRank._lookup) {
    const map = {};
    for (const item of entries) {
      if (!item || item.tokenId == null || item.rank == null) continue;
      const id = Number(item.tokenId);
      const r  = Number(item.rank);
      if (!Number.isFinite(id) || !Number.isFinite(r) || r <= 0) continue;
      if (!map[id]) {
        map[id] = r;
      }
    }
    getRarityRank._lookup = map;
  }

  const rank = getRarityRank._lookup[n];
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

function getRarityTier(rank) {
  if (!rank || typeof rank !== 'number') return null;

  if (rank === 1) return { label: 'MYTHIC', className: 'rarity_mythic' };
  if (rank <= 10) return { label: 'LEGENDARY', className: 'rarity_legendary' };
  if (rank <= 100) return { label: 'EPIC', className: 'rarity_epic' };
  if (rank <= 500) return { label: 'RARE', className: 'rarity_rare' };
  if (rank <= 1500) return { label: 'UNCOMMON', className: 'rarity_uncommon' };
  return { label: 'COMMON', className: 'rarity_common' };
}

// ===================================================
// Card builder – all frog cards go through here
// ===================================================
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

    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="https://freshfrogs.github.io/frog/${tokenId}.png"
        class="recent_sale_img"
        alt="Frog #${tokenId}"
        loading="lazy"
      />
    </div>

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

  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch((err) => {
      console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
    });
  }

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
        a.className = `btn secondary ${action.className || ''}`.trim();
        actionsContainer.appendChild(a);
      } else if (action.type === 'button' && typeof action.onClick === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = action.label;
        btn.className = `btn secondary ${action.className || ''}`.trim();
        btn.addEventListener('click', () => action.onClick({ tokenId, card }));
        actionsContainer.appendChild(btn);
      }
    });
  }

  return card;
}

// ===================================================
// Recent Activity (bottom panel)
// ===================================================
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
    let items;

    if (FF_ACTIVITY_MODE === 'mints') {
      items = await fetchRecentMints(FF_RECENT_LIMIT);
    } else {
      items = await fetchRecentSales(FF_RECENT_LIMIT);
    }

    if (!items.length) {
      if (statusEl) {
        statusEl.textContent =
          FF_ACTIVITY_MODE === 'mints'
            ? 'No recent mints found.'
            : 'No recent sales found.';
      }
      return;
    }

    if (statusEl) statusEl.textContent = '';

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
        headerRight  = formatMintAge(item);
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml: '',
        actions: [
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
        ]
      });

      container.appendChild(card);

      ffAnnotateSaleWithStaking(card, tokenId).catch((err) => {
        console.warn('ffAnnotateSaleWithStaking failed for token', tokenId, err);
      });
    }
  } catch (err) {
    console.error('Unable to load recent activity', err);
    if (statusEl) {
      statusEl.textContent =
        'Unable to load recent activity right now. Please try again later.';
    }
  }
}

async function ffAnnotateSaleWithStaking(card, tokenId) {
  if (!FF_SHOW_STAKING_STATS_ON_SALES) return;
  if (typeof stakingValues !== 'function') return;

  try {
    const values = await stakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const propsBlock =
      card.querySelector('.recent_sale_properties') ||
      card.querySelector('.recent_sale_traits') ||
      card;

    const infoHtml = `
      <div class="staking-summary-inline">
        <p class="frog-attr-text"><strong>Staked Level:</strong> ${ffEscapeHtml(levelNum)}</p>
        <p class="frog-attr-text"><strong>Staked For:</strong> ${ffEscapeHtml(stakedDays)} days</p>
        <p class="frog-attr-text"><strong>Days to Next Level:</strong> ${ffEscapeHtml(daysToNext)}</p>
        <p class="frog-attr-text"><strong>FLYZ Earned:</strong> ${ffEscapeHtml(flyzEarned)}</p>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = infoHtml;
    propsBlock.appendChild(wrapper.firstElementChild);
  } catch (err) {
    console.warn('ffAnnotateSaleWithStaking error', err);
  }
}

// ===================================================
// Rarity rankings view
// ===================================================
async function ffLoadRarityGrid() {
  const container = document.getElementById('rarity-grid');
  const statusEl  = document.getElementById('rarity-status');

  if (!container) return;

  if (statusEl) statusEl.textContent = 'Loading rarity rankings...';

  try {
    const entries = ffGetRarityRankingEntries();
    if (!entries.length) {
      if (statusEl) statusEl.textContent = 'No rarity data found.';
      container.innerHTML = '';
      return;
    }

    const slice = entries.slice(0, FF_RARITY_LIMIT);

    container.innerHTML = '';

    for (const item of slice) {
      const tokenId = item.tokenId;
      const rank    = item.rank;

      const metadata = await fetchFrogMetadata(tokenId);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: `Rank #${rank}`,
        headerRight: '',
        footerHtml: '',
        actionHtml: '',
        actions: [
          {
            type: 'link',
            label: 'View on OpenSea',
            href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'opensea'
          }
        ]
      });

      container.appendChild(card);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadRarityGrid error', err);
    if (statusEl) {
      statusEl.textContent =
        'Unable to load rarity rankings right now. Please try again later.';
    }
  }
}

// ===================================================
// Collection view (Recent mints)
// ===================================================
async function ffLoadCollectionGrid() {
  const container = document.getElementById('collection-grid');
  const statusEl  = document.getElementById('collection-status');

  if (!container) return;

  if (statusEl) statusEl.textContent = 'Loading recent mints...';

  try {
    const mints = await fetchRecentMints(FF_COLLECTION_LIMIT);
    if (!mints.length) {
      if (statusEl) statusEl.textContent = 'No recent mints to display right now.';
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';

    for (const mint of mints) {
      const tokenId = parseTokenId(mint.erc721TokenId || mint.tokenId);
      if (!tokenId) continue;

      let metadata = normalizeMetadata(mint.metadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      const ownerAddress = mint.to;
      const headerLeft   = truncateAddress(ownerAddress);
      const headerRight  = formatMintAge(mint);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml: '',
        actions: [
          {
            type: 'link',
            label: 'OpenSea',
            href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'opensea'
          }
        ]
      });

      container.appendChild(card);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadCollectionGrid error', err);
    if (statusEl) {
      statusEl.textContent =
        'Unable to load collection activity right now. Please try again later.';
    }
  }
}

// ===================================================
// Wallet + OpenSea profile
// ===================================================
function ffInitWalletOnLoad() {
  const btn = document.getElementById('connect-wallet-button');
  if (btn) {
    btn.textContent = 'Connect Wallet';
    btn.addEventListener('click', connectWallet);
  }

  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');

  const walletNavLink = document.getElementById('wallet-nav-link');
  if (walletNavLink) {
    walletNavLink.style.display = 'none';
  }
}

// read-only Web3 + contracts so staking/pond can work without wallet connect
function ffInitReadOnlyWeb3AndContracts() {
  try {
    if (typeof Web3 === 'undefined') return;

    if (!ffWeb3) {
      let provider = null;

      if (typeof window !== 'undefined' && window.ethereum) {
        provider = window.ethereum;
      } else if (typeof FF_ALCHEMY_CORE_BASE !== 'undefined') {
        provider = new Web3.providers.HttpProvider(FF_ALCHEMY_CORE_BASE);
      }

      if (!provider) {
        return;
      }

      const roWeb3 = new Web3(provider);
      ffWeb3 = roWeb3;

      if (!window.web3) {
        window.web3 = roWeb3;
      }
    }

    if (typeof COLLECTION_ABI !== 'undefined' && !window.collection && ffWeb3) {
      window.collection = new ffWeb3.eth.Contract(
        COLLECTION_ABI,
        FF_COLLECTION_ADDRESS
      );
    }
    if (typeof CONTROLLER_ABI !== 'undefined' && !window.controller && ffWeb3) {
      window.controller = new ffWeb3.eth.Contract(
        CONTROLLER_ABI,
        FF_CONTROLLER_ADDRESS
      );
    }
  } catch (err) {
    console.warn('ffInitReadOnlyWeb3AndContracts failed:', err);
  }
}

function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();

  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0;
  let prev  = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    const value = map[roman[i]] || 0;
    if (value < prev) {
      total -= value;
    } else {
      total += value;
    }
    prev = value;
  }

  return total || null;
}

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

    window.web3 = ffWeb3;
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

    if (ownedCount != null) {
      ffSetText('wallet-owned-count', String(ownedCount));
    }

    if (stakingStats) {
      ffSetText('wallet-staked-count', String(stakingStats.stakedCount ?? '0'));
      ffSetText('wallet-rewards-earned', String(stakingStats.rewardsEarned ?? '0'));
      ffSetText('wallet-rewards-available', String(stakingStats.rewardsAvailable ?? '0'));
    }

    if (profile) {
      if (profile.username) {
        ffSetText('dashboard-username', profile.username);
      }
      if (profile.avatarUrl) {
        const imgEl = document.getElementById('dashboard-avatar');
        if (imgEl) imgEl.src = profile.avatarUrl;
      }
    }

    const walletNavLink = document.getElementById('wallet-nav-link');
    if (walletNavLink) {
      walletNavLink.style.display = '';
      walletNavLink.textContent = ffTruncateAddress(address, 4);
    }

    if (ffCurrentView === 'wallet') {
      ffLoadWalletFrogs();
    }
  } catch (err) {
    console.error('connectWallet failed', err);
  }
}

function ffUpdateWalletBasicUI(address) {
  ffSetText('wallet-status-label', 'Connected');
  ffSetText('dashboard-wallet', `Wallet: ${ffTruncateAddress(address, 4)}`);
}

async function ffFetchOpenSeaProfile(address) {
  if (!address) return null;

  try {
    const url = `https://api.opensea.io/api/v1/user/${address}`;
    const headers = { Accept: 'application/json' };
    if (FF_OPENSEA_API_KEY) {
      headers['X-API-KEY'] = FF_OPENSEA_API_KEY;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn('OpenSea profile request failed', response.status);
      return null;
    }

    const json = await response.json();
    if (!json || !json.account) return null;

    return {
      username: json.account.user?.username || '',
      avatarUrl: json.account.profile_img_url || ''
    };
  } catch (err) {
    console.warn('ffFetchOpenSeaProfile error', err);
    return null;
  }
}

// ------------------------
// Wallet-owned & staked frogs
// ------------------------
async function ffFetchOwnedFrogCount(address) {
  if (!FF_ALCHEMY_NFT_BASE || !address) return null;

  const params = new URLSearchParams({
    owner: address,
    contractAddresses: [FF_COLLECTION_ADDRESS].join(',')
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTs?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy getNFTs failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.totalCount != null ? data.totalCount : data.ownedNfts?.length) || 0;
}

async function ffFetchStakingStats(address) {
  if (!address || typeof stakingValues !== 'function') return null;

  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') return null;

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
  const tokens = await contract.methods.getStakedTokens(address).call();
  if (!Array.isArray(tokens)) return null;

  let stakedCount = 0;
  let rewardsEarnedRaw = 0;
  let rewardsAvailableRaw = 0;

  for (const entry of tokens) {
    const tokenId = parseTokenId(entry.tokenId || entry.tokenId_);
    if (!tokenId) continue;
    stakedCount++;

    try {
      const values = await stakingValues(tokenId);
      if (!Array.isArray(values) || values.length < 5) continue;
      const flyzEarned = Number(values[3] ?? 0);
      rewardsEarnedRaw    += flyzEarned;
      rewardsAvailableRaw += flyzEarned;
    } catch (err) {
      console.warn('stakingValues failed for token', tokenId, err);
    }
  }

  return {
    stakedCount,
    rewardsEarned: rewardsEarnedRaw,
    rewardsAvailable: rewardsAvailableRaw
  };
}

async function ffFetchOwnedFrogs(address) {
  if (!FF_ALCHEMY_NFT_BASE || !address) return [];

  const params = new URLSearchParams({
    owner: address,
    contractAddresses: [FF_COLLECTION_ADDRESS].join(','),
    withMetadata: 'true',
    pageSize: '100'
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTs?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy getNFTs failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
}

async function ffFetchStakedTokensForUser(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') return [];

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
  const tokens   = await contract.methods.getStakedTokens(address).call();
  return Array.isArray(tokens) ? tokens : [];
}

async function ffLoadWalletFrogs() {
  const ownedContainer  = document.getElementById('owned-frogs-grid');
  const stakedContainer = document.getElementById('staked-frogs-grid');
  const ownedStatusEl   = document.getElementById('owned-frogs-status');
  const stakedStatusEl  = document.getElementById('staked-frogs-status');

  if (!ffCurrentAccount) {
    if (ownedStatusEl)  ownedStatusEl.textContent  = 'Connect your wallet to see owned frogs.';
    if (stakedStatusEl) stakedStatusEl.textContent = 'Connect your wallet to see staked frogs.';
    return;
  }

  if (ownedStatusEl)  ownedStatusEl.textContent  = 'Loading owned frogs...';
  if (stakedStatusEl) stakedStatusEl.textContent = 'Loading staked frogs...';

  try {
    const [ownedNfts, stakedTokens] = await Promise.all([
      ffFetchOwnedFrogs(ffCurrentAccount),
      ffFetchStakedTokensForUser(ffCurrentAccount)
    ]);

    if (ownedContainer) {
      ownedContainer.innerHTML = '';
      const ownedSlice = ownedNfts.slice(0, FF_WALLET_LIMIT);

      if (!ownedSlice.length && ownedStatusEl) {
        ownedStatusEl.textContent = 'No frogs owned by this wallet.';
      } else if (ownedStatusEl) {
        ownedStatusEl.textContent = '';
      }

      for (const nft of ownedSlice) {
        const tokenId = parseTokenId(nft.tokenId);
        if (!tokenId) continue;

        let metadata = normalizeMetadata(
          nft.rawMetadata || nft.metadata || nft.tokenMetadata
        );
        if (!hasUsableMetadata(metadata)) {
          metadata = await fetchFrogMetadata(tokenId);
        }

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: 'Owned by you',
          headerRight: '',
          footerHtml: '',
          actionHtml: '',
          actions: [
            {
              type: 'link',
              label: 'OpenSea',
              href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
              className: 'opensea'
            }
          ]
        });

        ownedContainer.appendChild(card);
      }
    }

    if (stakedContainer) {
      stakedContainer.innerHTML = '';
      const stakedSlice = stakedTokens.slice(0, FF_WALLET_LIMIT);

      if (!stakedSlice.length && stakedStatusEl) {
        stakedStatusEl.textContent = 'No frogs are currently staked from this wallet.';
      } else if (stakedStatusEl) {
        stakedStatusEl.textContent = '';
      }

      for (const entry of stakedSlice) {
        const tokenId = parseTokenId(entry.tokenId || entry.tokenId_);
        if (!tokenId) continue;

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

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: 'Staked by you',
          headerRight: '',
          footerHtml,
          actionHtml: '',
          actions: [
            {
              type: 'link',
              label: 'View on OpenSea',
              href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
              className: 'opensea'
            }
          ]
        });

        stakedContainer.appendChild(card);

        ffDecorateStakedFrogCard(tokenId);
      }
    }
  } catch (err) {
    console.error('ffLoadWalletFrogs error', err);
    if (ownedStatusEl)  ownedStatusEl.textContent  = 'Failed to load owned frogs.';
    if (stakedStatusEl) stakedStatusEl.textContent = 'Failed to load staked frogs.';
  }
}

async function ffDecorateStakedFrogCard(tokenId) {
  if (typeof stakingValues !== 'function') {
    console.warn('stakingValues() not available; skipping staking details');
    return;
  }

  try {
    const values = await stakingValues(tokenId);
    if (!values || values.length < 5) return;

    const [stakedDays, stakedLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(stakedLevel) ?? stakedLevel;

    const lvlEl   = document.getElementById(`stake-level-${tokenId}`);
    const dateEl  = document.getElementById(`stake-date-${tokenId}`);
    const nextEl  = document.getElementById(`stake-next-${tokenId}`);
    const barEl   = document.getElementById(`stake-progress-bar-${tokenId}`);

    if (lvlEl)  lvlEl.textContent  = `Staked Lvl. ${levelNum}`;
    if (dateEl) dateEl.textContent = `Staked: ${stakedDate}`;
    if (nextEl) nextEl.textContent = `Next level in ~${daysToNext} days`;

    const MAX_DAYS   = 41.7;
    const remaining  = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct        = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    if (barEl) {
      barEl.style.width = `${pct}%`;
    }
  } catch (err) {
    console.warn(`ffDecorateStakedFrogCard failed for token ${tokenId}`, err);
  }
}

// ===================================================
// Pond (all staked frogs)
// ===================================================
async function ffFetchAllStakedTokenIds() {
  // We don't actually need the user's wallet connected to read staking state.
  // Instead, we re-use the legacy stakerAddress(tokenId) helper from
  // ethereum-dapp.js and scan through the full collection.
  if (typeof stakerAddress !== 'function') {
    console.warn('stakerAddress() not available; Pond view disabled.');
    return [];
  }

  const maxTokenId = 4040; // size of the Fresh Frogs collection
  const result = [];

  for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
    try {
      const addr = await stakerAddress(tokenId);
      if (addr) {
        result.push(tokenId);
      }
    } catch (err) {
      console.warn('stakerAddress() failed for token', tokenId, err);
    }
  }

  return result;
}

async function ffLoadPondGrid() {
  const container = document.getElementById('pond-grid');
  const statusEl  = document.getElementById('pond-status');

  if (!container) return;

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

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: 'Staked in the Pond',
        headerRight: '',
        footerHtml,
        actionHtml: '',
        actions: [
          {
            type: 'link',
            label: 'OpenSea',
            href: `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
            className: 'opensea'
          }
        ]
      });

      container.appendChild(card);
      ffDecorateStakedFrogCard(tokenId);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadPondGrid failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load Pond data right now.';
  }
}

// ===================================================
// Nav + view switching
// ===================================================
function ffInitNavViews() {
  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const view = link.getAttribute('data-view');
      if (!view) return;
      ffSetView(view);
    });
  });
}

function ffSetView(view) {
  ffCurrentView = view;

  const activityPanel = document.getElementById('recent-activity-panel');
  const ownedPanel    = document.getElementById('owned-panel');
  const stakedPanel   = document.getElementById('staked-panel');
  const rarityPanel   = document.getElementById('rarity-panel');
  const pondPanel     = document.getElementById('pond-panel');

  if (activityPanel) {
    activityPanel.style.display =
      view === 'sales' || view === 'collection' ? '' : 'none';
  }
  if (ownedPanel)  ownedPanel.style.display  = view === 'wallet' ? '' : 'none';
  if (stakedPanel) stakedPanel.style.display = view === 'wallet' ? '' : 'none';
  if (rarityPanel) rarityPanel.style.display = view === 'rarity' ? '' : 'none';
  if (pondPanel)   pondPanel.style.display   = view === 'pond' ? '' : 'none';

  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    const v = link.getAttribute('data-view');
    if (v === view) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (view === 'sales') {
    FF_ACTIVITY_MODE = 'sales';
    loadRecentActivity();
  } else if (view === 'collection') {
    FF_ACTIVITY_MODE = 'mints';
    ffLoadCollectionGrid();
  } else if (view === 'rarity') {
    ffLoadRarityGrid();
  } else if (view === 'wallet') {
    ffLoadWalletFrogs();
  } else if (view === 'pond') {
    ffLoadPondGrid();
  }
}

// ===================================================
// Hero section buttons
// ===================================================
function ffInitHeroActions() {
  const viewCollectionBtn = document.getElementById('hero-view-collection-btn');
  if (viewCollectionBtn) {
    viewCollectionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      ffSetView('collection');
      const el = document.getElementById('collection-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const heroConnectBtn = document.getElementById('hero-connect-wallet-btn');
  if (heroConnectBtn) {
    heroConnectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      connectWallet();
    });
  }
}

// ===================================================
// Layered frog image helper
// ===================================================
async function ffBuildLayeredFrogImage(tokenId, containerId) {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const img = document.createElement('img');
    img.src = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    img.alt = `Frog #${tokenId}`;
    img.loading = 'lazy';
    img.className = 'recent_sale_img';

    container.appendChild(img);
  } catch (err) {
    console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
  }
}
