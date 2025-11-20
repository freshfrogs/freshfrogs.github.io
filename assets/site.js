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
let FF_ACTIVITY_MODE      = 'sales'; // 'mints' or 'sales' for the bottom grid
const FF_SHOW_STAKING_STATS_ON_SALES = true; // show staking info everywhere we can

// 50 at a time for all grids with Load More
let FF_RECENT_LIMIT   = 50; // recent activity (sales/mints)
let FF_RARITY_LIMIT   = 50; // rarity rankings
let FF_COLLECTION_LIMIT = 50; // collection "recent mints"
let FF_WALLET_LIMIT   = 50; // owned/staked frogs in wallet view
let FF_POND_LIMIT     = 50; // pond (all staked frogs)

// current top-level view: 'sales' | 'collection' | 'rarity' | 'wallet' | 'pond'
let ffCurrentView = 'sales';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffInitWalletOnLoad();   // connect button, basic wallet ui
  ffInitNavTabs();        // Collection / Rarity / Wallet / Pond tabs
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

// Parse tokenId which might be hex string like "0x1f4"
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

// Normalize possible metadata formats into a plain object
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

// Does metadata have a usable attributes array?
function hasUsableMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
  const attributes = Array.isArray(metadata.attributes)
    ? metadata.attributes
    : [];
  return attributes.length > 0;
}

// Fetch frog metadata from /frog/json/{id}.json (canonical source)
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

// Build trait list HTML from metadata.attributes
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

// Best-effort mint price – not used in header right now but kept if you want it later
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
function getRarityRank(tokenId) {
  const n = Number(tokenId);
  if (!Number.isFinite(n) || n <= 0) return null;

  const entries = ffGetRarityRankingEntries();
  if (!entries || !entries.length) return null;

  // Build a cached lookup map once
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

function buildRarityLookup(rankings) {
  if (!Array.isArray(rankings)) return {};

  if (buildRarityLookup._cache && buildRarityLookup._cache.source === rankings) {
    return buildRarityLookup._cache.lookup;
  }

  const lookup = rankings.reduce((acc, frog) => {
    if (frog && typeof frog.id !== 'undefined') {
      const frogId = Number(frog.id);
      const rankingValue = frog.ranking ?? frog.rank;
      if (Number.isFinite(frogId) && rankingValue !== undefined) {
        acc[frogId] = rankingValue;
      }
    }
    return acc;
  }, {});

  buildRarityLookup._cache = { source: rankings, lookup };
  return lookup;
}

// Tier labels – tweak ranges to match your actual rarity sheet if needed
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
// Card builder – ALL frog cards go through this
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
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch((err) => {
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

    // Rebuild the grid from scratch each time so "Load more" just shows more rows
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

      // Optionally annotate with staking info (if stakingValues() exists and wallet connected)
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

// Annotate a recent-sale card with staking info using legacy staking helpers
async function ffAnnotateSaleWithStaking(card, tokenId) {
  // If toggle is off, do nothing
  if (!FF_SHOW_STAKING_STATS_ON_SALES) { return; }

  // Need legacy helpers loaded from ethereum-dapp.js
  
  // Require controller/web3 to be initialised (wallet may not be connected yet)
  if (typeof window === 'undefined' || !window.controller) {
    // Avoid noisy errors when the page first loads before wallet connect
    return;
  }

if (typeof stakingValues !== 'function') {
    console.warn('stakingValues() not available; skipping staking stats for sales.');
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

    const infoHtml = `
      <p class="frog-attr-text">
        <strong>Staked Level:</strong> ${ffEscapeHtml(levelNum)}
      </p>
      <p class="frog-attr-text">
        <strong>Staked For:</strong> ${ffEscapeHtml(stakedDays)} days
      </p>
      <p class="frog-attr-text">
        <strong>Days to Next Level:</strong> ${ffEscapeHtml(daysToNext)}
      </p>
      <p class="frog-attr-text">
        <strong>FLYZ Earned:</strong> ${ffEscapeHtml(flyzEarned)}
      </p>
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'staking-summary-inline';
    wrapper.innerHTML = infoHtml;

    propsBlock.appendChild(wrapper);
  } catch (err) {
    console.error('ffAnnotateSaleWithStaking error', err);
  }
}

// ===================================================
// Rarity rankings view
// ===================================================
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

      const headerLeft  = `Rank #${rank}`;
      const headerRight = '';

      const footerHtml = '';

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
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

      const footerHtml = '';

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
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
// Wallet connect + OpenSea profile
// ===================================================
let ffWeb3 = null;
let ffCurrentAccount = null;

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

// Convert roman numerals from stakingValues() into normal numbers
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

// Connect wallet and initialize Web3 + legacy contracts
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
      if (profile.imageUrl) {
        const imgEl = document.getElementById('dashboard-avatar');
        if (imgEl) imgEl.src = profile.imageUrl;
      }
    }

    // Update wallet nav item
    const walletNavLink = document.getElementById('wallet-nav-link');
    if (walletNavLink) {
      walletNavLink.style.display = '';
      walletNavLink.textContent = ffTruncateAddress(address, 4);
    }

    // Re-render wallet frogs if wallet tab is active
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

// Fetch basic OpenSea profile (no API key required for simple calls, but we add header if present)
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
      imageUrl: json.account.profile_img_url || ''
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

// Summarize staking stats using legacy helpers (ethereum-dapp.js)
async function ffFetchStakingStats(address) {
  if (!address || typeof stakingValues !== 'function') return null;

  // We approximate by scanning staked tokens for the user via getStakedTokens(_user)
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
      const flyzEarned     = Number(values[3] ?? 0);
      const stakedDate     = Number(values[4] ?? 0);
      rewardsEarnedRaw    += flyzEarned;
      rewardsAvailableRaw += flyzEarned; //  placeholder – refine if you have more precise field
    } catch (err) {
      console.warn('stakingValues failed for token', tokenId, err);
    }
  }

  const stats = {
    stakedCount,
    rewardsEarned: rewardsEarnedRaw,
    rewardsAvailable: rewardsAvailableRaw
  };

  return stats;
}

// Fetch owned NFTs and staked NFTs and render them using unified card builder
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

    // Owned frogs
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

        const headerLeft  = `Owned by you`;
        const headerRight = '';

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

        ownedContainer.appendChild(card);
      }
    }

    // Staked frogs in this wallet
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
              type: 'button',
              label: 'View on OpenSea',
              onClick: () => {
                window.open(
                  `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`,
                  '_blank'
                );
              },
              className: 'opensea'
            }
          ]
        });

        stakedContainer.appendChild(card);

        // Kick off the staking detail update using legacy helpers, if available
        ffUpdateStakingDetailForToken(tokenId).catch((err) => {
          console.warn('ffUpdateStakingDetailForToken failed', err);
        });
      }
    }
  } catch (err) {
    console.error('ffLoadWalletFrogs error', err);
    if (ownedStatusEl)  ownedStatusEl.textContent  = 'Failed to load owned frogs.';
    if (stakedStatusEl) stakedStatusEl.textContent = 'Failed to load staked frogs.';
  }
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

// Update a staked card's level/progress using legacy staking helpers
async function ffUpdateStakingDetailForToken(tokenId) {
  if (typeof stakingValues !== 'function') return;

  try {
    const values = await stakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned, stakedDate] = values;

    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const levelEl   = document.getElementById(`stake-level-${tokenId}`);
    const dateEl    = document.getElementById(`stake-date-${tokenId}`);
    const nextEl    = document.getElementById(`stake-next-${tokenId}`);
    const progressEl = document.getElementById(`stake-progress-bar-${tokenId}`);

    if (levelEl) levelEl.textContent = `Staked Lvl. ${levelNum}`;
    if (dateEl)  dateEl.textContent  = `Staked: ${stakedDate}`;
    if (nextEl)  nextEl.textContent  = `Next lvl in: ${daysToNext} days`;

    if (progressEl) {
      let pct = 0;
      const days = Number(stakedDays);
      const max  = Number(stakedDays + daysToNext || 1);
      if (Number.isFinite(days) && Number.isFinite(max) && max > 0) {
        pct = Math.min(100, Math.max(0, (days / max) * 100));
      }
      progressEl.style.width = `${pct}%`;
    }
  } catch (err) {
    console.warn('ffUpdateStakingDetailForToken error', err);
  }
}

// ===================================================
// Pond (all staked frogs) view
// ===================================================
async function ffFetchAllStakedTokenIds() {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; pond view disabled until wallet connects.');
    return [];
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  // Try a couple of possible function names with no args
  const stakedRaw = await ffTryContractCall(contract, [
    'getAllStakedTokens',
    'getStakedTokens',
    'getAllStaked',
    'getAllStakedFrogs'
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
  } else {
    const id = parseTokenId(stakedRaw);
    if (id != null) result.push(id);
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

      ffUpdateStakingDetailForToken(tokenId).catch((err) => {
        console.warn('ffUpdateStakingDetailForToken failed', err);
      });
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadPondGrid error', err);
    if (statusEl) {
      statusEl.textContent =
        'Unable to load Pond right now. Please try again later.';
    }
  }
}

// Generic helper to try multiple contract method names safely
async function ffTryContractCall(contract, methodNames, args) {
  for (const name of methodNames) {
    const fn = contract.methods[name];
    if (typeof fn !== 'function') continue;

    try {
      return await fn(...args).call();
    } catch (err) {
      console.warn(`Contract call ${name} failed`, err);
    }
  }
  return null;
}

// ===================================================
// Nav + view switching
// ===================================================
function ffInitNavTabs() {
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

  const panels = {
    sales: document.getElementById('recent-activity-panel'),
    rarity: document.getElementById('rarity-panel'),
    collection: document.getElementById('collection-panel'),
    wallet: document.getElementById('wallet-panel'),
    pond: document.getElementById('pond-panel')
  };

  for (const key of Object.keys(panels)) {
    if (!panels[key]) continue;
    panels[key].style.display = key === view ? '' : 'none';
  }

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

// Hero section buttons
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

    // For now we just ensure a single base PNG image is shown.
    // All frogs across views use this helper so the cards stay consistent.
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
