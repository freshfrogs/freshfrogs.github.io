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

// 'sales' = recent sales, 'mints' = recent mints
let FF_ACTIVITY_MODE      = 'sales';
const FF_SHOW_STAKING_STATS_ON_SALES = true;
const ZERO_ADDRESS        = '0x0000000000000000000000000000000000000000';

// Recent activity paging
let FF_RECENT_LIMIT       = 100;

// View + paging state
let FF_CURRENT_VIEW       = 'activity';

let FF_RARITY_SORTED      = null;
let FF_RARITY_RENDERED    = 0;
const FF_RARITY_PAGE_SIZE = 24;

let FF_POND_TOKEN_IDS     = null;
let FF_POND_RENDERED      = 0;
const FF_POND_PAGE_SIZE   = 36;


// ===================================================
// Entry
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initial homepage = recent sales
  loadRecentActivity();
  ffInitWalletOnLoad();
  ffInitNav();
  ffInitHeroButtons();

  // Load more: Recent Activity
  const loadMoreActivityBtn = document.getElementById('load-more-activity');
  if (loadMoreActivityBtn) {
    loadMoreActivityBtn.addEventListener('click', () => {
      FF_RECENT_LIMIT += 6;
      loadRecentActivity();
    });
  }

  // Load more: Rarity
  const loadMoreRarityBtn = document.getElementById('load-more-rarity');
  if (loadMoreRarityBtn) {
    loadMoreRarityBtn.addEventListener('click', () => {
      loadRarityGrid();
    });
  }

  // Load more: Pond
  const loadMorePondBtn = document.getElementById('load-more-pond');
  if (loadMorePondBtn) {
    loadMorePondBtn.addEventListener('click', () => {
      loadPond();
    });
  }
});


// ===================================================
// Top nav + hero wiring
// ===================================================
function ffInitNav() {
  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (evt) => {
      evt.preventDefault();
      const view = link.dataset.view;
      if (!view) return;
      ffSwitchView(view);
    });
  });
}

function ffInitHeroButtons() {
  const viewCollectionBtn = document.getElementById('hero-view-collection-btn');
  if (viewCollectionBtn) {
    viewCollectionBtn.addEventListener('click', () => {
      ffSwitchView('collection');
    });
  }

  const heroConnectBtn = document.getElementById('hero-connect-wallet-btn');
  if (heroConnectBtn) {
    heroConnectBtn.addEventListener('click', () => {
      connectWallet();
    });
  }
}

function ffSwitchView(viewName) {
  FF_CURRENT_VIEW = viewName;

  // Update nav active state
  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  // Hide all dashboard panels
  const allPanels = [
    'recent-activity-panel',
    'rarity-panel',
    'pond-panel',
    'owned-panel',
    'staked-panel'
  ];
  allPanels.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (viewName === 'collection') {
    // Show recent mints using the same layout as sales
    const panel = document.getElementById('recent-activity-panel');
    if (panel) panel.style.display = '';
    FF_ACTIVITY_MODE = 'mints';
    FF_RECENT_LIMIT = Math.max(FF_RECENT_LIMIT, 30);
    loadRecentActivity();
  } else if (viewName === 'rarity') {
    const panel = document.getElementById('rarity-panel');
    if (panel) panel.style.display = '';
    loadRarityGrid();
  } else if (viewName === 'pond') {
    const panel = document.getElementById('pond-panel');
    if (panel) panel.style.display = '';
    loadPond();
  } else if (viewName === 'wallet') {
    const ownedPanel  = document.getElementById('owned-panel');
    const stakedPanel = document.getElementById('staked-panel');
    if (ownedPanel)  ownedPanel.style.display  = '';
    if (stakedPanel) stakedPanel.style.display = '';

    if (!ffCurrentAccount) {
      const ownedStatus  = document.getElementById('owned-frogs-status');
      const stakedStatus = document.getElementById('staked-frogs-status');
      if (ownedStatus)  ownedStatus.textContent  = 'Connect your wallet to view owned frogs.';
      if (stakedStatus) stakedStatus.textContent = 'Connect your wallet to view staked frogs.';
    }
  } else {
    // default back to recent sales
    const panel = document.getElementById('recent-activity-panel');
    if (panel) panel.style.display = '';
    FF_ACTIVITY_MODE = 'sales';
    loadRecentActivity();
  }
}


// ===================================================
// Recent activity loader (sales / mints)
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
        headerRight  = formatMintAge(item);   // e.g. "3d ago"
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress);

      const actionHtml = `
        <div class="recent_sale_links">
          <a
            class="sale_link_btn opensea"
            href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenSea
          </a>
          <a
            class="sale_link_btn etherscan"
            href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Etherscan
          </a>
        </div>
      `;

      // NOTE: staking block is added *later* if frog is staked
      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml
      });

      container.appendChild(card);

      // If frog is staked, attach the same stake-meta block as wallet staked frogs
      if (FF_SHOW_STAKING_STATS_ON_SALES) {
        ffAttachStakeMetaIfStaked(card, tokenId);
      }
    }
  } catch (err) {
    console.error('Unable to load recent activity', err);
    const status = FF_ACTIVITY_MODE === 'mints'
      ? 'Unable to load recent mints right now.'
      : 'Unable to load recent sales right now.';
    if (statusEl) statusEl.textContent = status;
  }
}


// Attach full stake-meta block to a card *only if* frog is staked
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  if (!card) return;
  if (typeof stakingValues !== 'function' || typeof stakerAddress !== 'function') {
    return;
  }

  ffEnsureController();

  // avoid duplicating the block
  if (card.querySelector(`#stake-level-${tokenId}`)) return;

  try {
    const addr = await stakerAddress(tokenId);
    if (!addr) return; // not staked

    const traitsBlock = card.querySelector('.recent_sale_traits');
    if (!traitsBlock) return;

    traitsBlock.insertAdjacentHTML('beforeend', ffStakeMetaHtml(tokenId));
    ffDecorateStakedFrogCard(tokenId);
  } catch (err) {
    console.warn('ffAttachStakeMetaIfStaked failed for token', tokenId, err);
  }
}



// ===================================================
// Token / rarity helpers
// ===================================================
function parseTokenId(raw) {
  if (raw == null) return null;

  // unwrap common object shapes
  if (typeof raw === 'object' && raw.tokenId != null) {
    raw = raw.tokenId;
  }

  let s = String(raw).trim();

  // Hex tokenId (e.g. "0x1234")
  if (/^0x[0-9a-fA-F]+$/.test(s)) {
    const n = parseInt(s, 16);
    return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
  }

  // Drop scientific notation / crazy big values
  if (/e\+/i.test(s)) {
    return null;
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

  let rankRaw;

  if (Array.isArray(map)) {
    const lookup = buildRarityLookup(map);
    rankRaw = lookup[tokenId];

    if (rankRaw === undefined) {
      rankRaw = map[tokenId] ?? map[tokenId - 1];
    }
  } else if (typeof map === 'object') {
    rankRaw =
      map[tokenId] ??
      map[String(tokenId)] ??
      map[`Frog #${tokenId}`];
  }

  if (rankRaw === undefined || rankRaw === null || rankRaw === '') return null;

  const n = Number(rankRaw);
  if (!Number.isFinite(n) || n <= 0) return null;

  return n;
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

// Build a sorted [ { tokenId, rank }, ... ] list from rarityrankings.js
function ffBuildSortedRarityList() {
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return [];

  const items = [];

  if (Array.isArray(map)) {
    map.forEach((entry, idx) => {
      if (!entry) return;
      const tokenIdRaw =
        entry.id ??
        entry.tokenId ??
        entry.frogId ??
        (entry.metadata && entry.metadata.id);
      const tokenId = parseTokenId(tokenIdRaw ?? (idx + 1));
      const rankRaw = entry.ranking ?? entry.rank ?? entry.Rank ?? entry.score;
      const rank = Number(rankRaw);
      if (tokenId != null && Number.isFinite(rank) && rank > 0) {
        items.push({ tokenId, rank });
      }
    });
  } else if (typeof map === 'object') {
    Object.keys(map).forEach((key) => {
      const tokenId = parseTokenId(key);
      const rank = Number(map[key]);
      if (tokenId != null && Number.isFinite(rank) && rank > 0) {
        items.push({ tokenId, rank });
      }
    });
  }

  items.sort((a, b) => a.rank - b.rank);
  return items;
}


// Rarity grid loader (uses same card + same staking layout)
async function loadRarityGrid() {
  const container = document.getElementById('rarity-grid');
  const statusEl  = document.getElementById('rarity-status');
  if (!container) return;

  if (!window.freshfrogs_rarity_rankings) {
    if (statusEl) statusEl.textContent = 'Rarity rankings not loaded.';
    return;
  }

  if (!FF_RARITY_SORTED) {
    FF_RARITY_SORTED   = ffBuildSortedRarityList();
    FF_RARITY_RENDERED = 0;
    container.innerHTML = '';
  }

  const list = FF_RARITY_SORTED || [];
  if (!list.length) {
    if (statusEl) statusEl.textContent = 'No rarity data found.';
    return;
  }

  if (statusEl) statusEl.textContent = '';

  const start = FF_RARITY_RENDERED;
  const end   = Math.min(list.length, start + FF_RARITY_PAGE_SIZE);

  if (start >= end) {
    if (statusEl) statusEl.textContent = 'All ranked Frogs are loaded.';
    const moreBtn = document.getElementById('load-more-rarity');
    if (moreBtn) {
      moreBtn.disabled  = true;
      moreBtn.textContent = 'All loaded';
    }
    return;
  }

  const slice = list.slice(start, end);
  for (const item of slice) {
    const tokenId = item.tokenId;
    const rank    = item.rank;

    const metadata = await fetchFrogMetadata(tokenId);

    const headerLeft  = `Rank #${rank}`;
    const headerRight = '';

    const card = createFrogCard({
      tokenId,
      metadata,
      headerLeft,
      headerRight
    });

    container.appendChild(card);

    // If that ranked frog is currently staked, show full staking block
    ffAttachStakeMetaIfStaked(card, tokenId);
  }

  FF_RARITY_RENDERED = end;

  const moreBtn = document.getElementById('load-more-rarity');
  if (moreBtn) {
    if (FF_RARITY_RENDERED >= list.length) {
      moreBtn.disabled  = true;
      moreBtn.textContent = 'All loaded';
    } else {
      moreBtn.disabled  = false;
      moreBtn.textContent = 'Load More';
    }
  }
}


// ===================================================
// Card rendering (shared for ALL frog lists)
// ===================================================
function createFrogCard({
  tokenId,
  metadata,
  headerLeft,
  headerRight,
  footerHtml,
  actionHtml
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
    <!-- TOP ROW: OWNER / CONTEXT -->
    <strong class="sale_card_title">${headerLeft || ''}</strong>
    <strong class="sale_card_price">${headerRight || ''}</strong>
    <div style="clear: both;"></div>

    <!-- IMAGE -->
    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="https://freshfrogs.github.io/frog/${tokenId}.png"
        class="recent_sale_img"
        alt="Frog #${tokenId}"
        loading="lazy"
      />
    </div>

    <!-- BOTTOM: NAME + RARITY + TRAITS + STAKING + ACTIONS -->
    <div class="recent_sale_traits">
      <strong class="sale_card_title">${frogName}</strong>
      <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
      ${footerHtml || ''}   <!-- stake-meta goes here if staked -->
      ${actionHtml || ''}   <!-- buttons like Stake / OS / Etherscan -->
    </div>
  `;

  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch((err) => {
      console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
    });
  }

  return card;
}


// Small helper to generate the standard stake-meta block HTML
function ffStakeMetaHtml(tokenId) {
  return `
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
}


// Layered frog image using /frog/json/<id>.json + build_trait()
async function ffBuildLayeredFrogImage(tokenId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const baseUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    container.style.backgroundImage    = `url("${baseUrl}")`;
    container.style.backgroundRepeat   = 'no-repeat';
    container.style.backgroundSize     = '1000%';
    container.style.backgroundPosition = 'bottom right';

    container.innerHTML = '';

    if (typeof SOURCE_PATH === 'undefined' || typeof build_trait !== 'function') {
      const img = document.createElement('img');
      img.src = baseUrl;
      img.alt = `Frog #${tokenId}`;
      img.className = 'recent_sale_img';
      img.loading = 'lazy';
      container.appendChild(img);
      return;
    }

    const metadataUrl = `${SOURCE_PATH}/frog/json/${tokenId}.json`;
    const metadata = await (await fetch(metadataUrl)).json();
    const attrs = Array.isArray(metadata.attributes) ? metadata.attributes : [];

    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (!attr || !attr.trait_type || !attr.value) continue;
      build_trait(attr.trait_type, attr.value, containerId);
    }
  } catch (err) {
    console.warn('ffBuildLayeredFrogImage error for token', tokenId, err);

    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    img.alt = `Frog #${tokenId}`;
    img.className = 'recent_sale_img';
    img.loading = 'lazy';
    container.appendChild(img);
  }
}


function getRarityTier(rank) {
  if (!rank) return null;
  if (rank <= 41)   return { label: 'Legendary', className: 'rarity_legendary' };
  if (rank <= 404)  return { label: 'Epic',      className: 'rarity_epic' };
  if (rank <= 1010) return { label: 'Rare',      className: 'rarity_rare' };
  return { label: 'Common', className: 'rarity_common' };
}

function ffEscapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTraitsHtml(metadata) {
  const attributes = Array.isArray(metadata && metadata.attributes)
    ? metadata.attributes
    : [];

  if (!attributes.length) {
    return '<p class="frog-attr-text">Metadata unavailable</p>';
  }

  const lines = attributes.map((attr) => {
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
  }).filter(Boolean);

  return lines.join('');
}


// ===================================================
// Activity fetchers (mints/sales)
// ===================================================
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


// ===================================================
// Formatting helpers
// ===================================================
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '--';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

function formatMintPrice(transfer) {
  if (!transfer) return '--';

  const raw = transfer.rawContract && transfer.rawContract.value;
  if (!raw) return '--';

  const valueNum = parseInt(raw, 16);
  if (!Number.isFinite(valueNum) || valueNum <= 0) return '--';

  const eth = valueNum / 1e18;
  const rounded =
    eth >= 1
      ? eth.toFixed(3).replace(/\.?0+$/, '')
      : eth.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ETH`;
}

function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '--';

  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '--';

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '--';

  if (diffSeconds < 86400) {
    return '<1d ago';
  }

  const diffDays = Math.floor(diffSeconds / 86400);
  return `${diffDays}d ago`;
}

function formatMintAge(transfer) {
  if (!transfer) return '--';

  const timestamp =
    (transfer.metadata && transfer.metadata.blockTimestamp) ||
    transfer.blockTimestamp;

  return ffFormatAgeFromTimestamp(timestamp);
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


// ===================================================
// Owned / Staked frogs (wallet view)
// ===================================================
async function ffFetchOwnedFrogs(address) {
  if (!FF_ALCHEMY_NFT_BASE) return [];

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getNFTsForOwner failed:', res.status);
    return [];
  }

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => {
    const addr = nft.contract && nft.contract.address;
    return addr && addr.toLowerCase() === target;
  });

  return frogs;
}

async function ffFetchStakedTokenIds(address) {
  const web3 = ffEnsureWeb3();
  if (!web3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staked frogs fetch disabled.');
    return [];
  }

  const contract = new web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

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


async function renderOwnedAndStakedFrogs(address) {
  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedGrid   = document.getElementById('staked-frogs-grid');
  const stakedStatus = document.getElementById('staked-frogs-status');

  const recentPanel = document.getElementById('recent-activity-panel');
  const ownedPanel  = document.getElementById('owned-panel');
  const stakedPanel = document.getElementById('staked-panel');

  if (recentPanel) recentPanel.style.display = 'none';
  if (ownedPanel)  ownedPanel.style.display  = '';
  if (stakedPanel) stakedPanel.style.display = '';

  try {
    const [ownedNfts, stakedIds] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch((err) => {
        console.warn('ffFetchStakedTokenIds failed:', err);
        return [];
      })
    ]);

    // Owned frogs
    if (ownedStatus) {
      ownedStatus.textContent = ownedNfts.length
        ? ''
        : 'No frogs found in this wallet.';
    }

    if (ownedGrid) {
      ownedGrid.innerHTML = '';
      for (const nft of ownedNfts) {
        const rawTokenId = nft.tokenId || (nft.id && nft.id.tokenId);
        const tokenId = parseTokenId(rawTokenId);
        if (tokenId == null) continue;

        let metadata = normalizeMetadata(
          nft.rawMetadata || nft.metadata || nft.tokenMetadata
        );
        if (!hasUsableMetadata(metadata)) {
          metadata = await fetchFrogMetadata(tokenId);
        }

        const actionHtml = `
          <div class="recent_sale_links">
            <button class="sale_link_btn" onclick="ffStakeFrog(${tokenId})">
              Stake
            </button>
            <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">
              Transfer
            </button>
          </div>
          <div class="recent_sale_links">
            <a
              class="sale_link_btn opensea"
              href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenSea
            </a>
            <a
              class="sale_link_btn etherscan"
              href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Etherscan
            </a>
          </div>
        `;

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: truncateAddress(address),
          headerRight: 'Owned',
          footerHtml: '',
          actionHtml
        });

        ownedGrid.appendChild(card);
      }
    }

    // Staked frogs
    if (stakedStatus) {
      stakedStatus.textContent = stakedIds.length
        ? ''
        : 'No staked frogs found for this wallet.';
    }

    if (stakedGrid) {
      stakedGrid.innerHTML = '';

      for (const tokenId of stakedIds) {
        const metadata = await fetchFrogMetadata(tokenId);

        const footerHtml = ffStakeMetaHtml(tokenId);

        const actionHtml = `
          <div class="recent_sale_links">
            <button class="sale_link_btn" onclick="ffUnstakeFrog(${tokenId})">
              Unstake
            </button>
          </div>
          <div class="recent_sale_links">
            <a
              class="sale_link_btn opensea"
              href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenSea
            </a>
            <a
              class="sale_link_btn etherscan"
              href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Etherscan
            </a>
          </div>
        `;

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: truncateAddress(address || ffCurrentAccount) || 'Pond',
          headerRight: 'Staked',
          footerHtml,
          actionHtml
        });

        stakedGrid.appendChild(card);

        ffDecorateStakedFrogCard(tokenId);
      }
    }
  } catch (err) {
    console.error('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus)  ownedStatus.textContent  = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  }
}


// ===================================================
// Pond (community staked frogs)
// NOTE: this still uses controller methods; next step we can
// swap this to "all NFTs owned by controller via Alchemy".
// ===================================================
function ffNormalizeStakedTokenList(raw) {
  const result = [];
  if (!raw) return result;

  const pushId = (candidate) => {
    const id = parseTokenId(candidate);
    if (id != null) result.push(id);
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (item && typeof item === 'object' && 'tokenId' in item) {
        pushId(item.tokenId);
      } else {
        pushId(item);
      }
    });
  } else {
    pushId(raw);
  }

  return Array.from(new Set(result));
}

async function ffFetchAllStakedTokenIds() {
  if (typeof getAllStakedTokens === 'function') {
    try {
      const raw = await getAllStakedTokens();
      return ffNormalizeStakedTokenList(raw);
    } catch (err) {
      console.warn('getAllStakedTokens() failed:', err);
    }
  }
  if (typeof getPondTokens === 'function') {
    try {
      const raw = await getPondTokens();
      return ffNormalizeStakedTokenList(raw);
    } catch (err) {
      console.warn('getPondTokens() failed:', err);
    }
  }

  const web3 = ffEnsureWeb3();
  if (!web3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; pond fetch disabled.');
    return [];
  }

  const contract = new web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const names = [
    'getAllStakedTokens',
    'getAllStaked',
    'getStakedTokensAll',
    'getStakedTokensGlobal'
  ];

  const stakedRaw = await ffTryContractCall(contract, names, []);
  if (!stakedRaw) return [];

  return ffNormalizeStakedTokenList(stakedRaw);
}

async function loadPond() {
  const container = document.getElementById('pond-grid');
  const statusEl  = document.getElementById('pond-status');
  if (!container) return;

  try {
    if (!FF_POND_TOKEN_IDS) {
      if (statusEl) statusEl.textContent = 'Loading staked Frogs...';
      container.innerHTML = '';
      FF_POND_RENDERED    = 0;
      FF_POND_TOKEN_IDS   = await ffFetchAllStakedTokenIds();
    }

    const ids = FF_POND_TOKEN_IDS || [];
    if (!ids.length) {
      if (statusEl) statusEl.textContent = 'No Frogs are currently staked in the Pond.';
      const moreBtn = document.getElementById('load-more-pond');
      if (moreBtn) moreBtn.disabled = true;
      return;
    }

    if (statusEl) statusEl.textContent = '';

    const start = FF_POND_RENDERED;
    const end   = Math.min(ids.length, start + FF_POND_PAGE_SIZE);

    if (start >= end) {
      if (statusEl) statusEl.textContent = 'All staked Frogs are loaded.';
      const moreBtn = document.getElementById('load-more-pond');
      if (moreBtn) {
        moreBtn.disabled   = true;
        moreBtn.textContent = 'All loaded';
      }
      return;
    }

    const slice = ids.slice(start, end);
    for (const tokenId of slice) {
      const metadata = await fetchFrogMetadata(tokenId);

      const footerHtml = ffStakeMetaHtml(tokenId);

      const actionHtml = `
        <div class="recent_sale_links">
          <a
            class="sale_link_btn opensea"
            href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenSea
          </a>
          <a
            class="sale_link_btn etherscan"
            href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Etherscan
          </a>
        </div>
      `;

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: 'Pond',
        headerRight: 'Staked',
        footerHtml,
        actionHtml
      });

      container.appendChild(card);

      ffDecorateStakedFrogCard(tokenId);
    }

    FF_POND_RENDERED = end;

    const moreBtn = document.getElementById('load-more-pond');
    if (moreBtn) {
      if (FF_POND_RENDERED >= ids.length) {
        moreBtn.disabled   = true;
        moreBtn.textContent = 'All loaded';
      } else {
        moreBtn.disabled   = false;
        moreBtn.textContent = 'Load More';
      }
    }
  } catch (err) {
    console.error('loadPond failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load the Pond right now.';
  }
}


// ===================================================
// Staking info renderer (used by ALL staked cards)
// ===================================================
async function ffDecorateStakedFrogCard(tokenId) {
  if (typeof stakingValues !== 'function') {
    console.warn('stakingValues() not available; skipping staking details');
    return;
  }

  ffEnsureController(); // make sure read-only controller is set up

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

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    if (barEl) {
      barEl.style.width = `${pct}%`;
    }
  } catch (err) {
    console.warn(`ffDecorateStakedFrogCard failed for token ${tokenId}`, err);
  }
}

// ===================================================
// Card actions: Stake / Unstake / Transfer
// ===================================================
async function ffStakeFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  try {
    if (typeof initiate_stake === 'function') {
      return await initiate_stake(tokenId);
    }

    if (!window.collection || !ffCurrentAccount) {
      alert('Staking not available: contract or wallet not initialised.');
      return;
    }

    await collection.methods.stake(tokenId).send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Stake failed', err);
    alert('Stake transaction failed. Check console for details.');
  }
}

async function ffUnstakeFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  try {
    if (typeof initiate_withdraw === 'function') {
      return await initiate_withdraw(tokenId);
    }

    if (!window.controller || !ffCurrentAccount) {
      alert('Unstake not available: contract or wallet not initialised.');
      return;
    }

    await controller.methods.unstake(tokenId).send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Unstake failed', err);
    alert('Unstake transaction failed. Check console for details.');
  }
}

async function ffTransferFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  if (!window.collection || !ffCurrentAccount) {
    alert('Transfer not available: contract or wallet not initialised.');
    return;
  }

  const to = window.prompt('Send this Frog to which address?');
  if (!to) return;

  try {
    await collection.methods
      .safeTransferFrom(ffCurrentAccount, to, tokenId)
      .send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Transfer failed', err);
    alert('Transfer transaction failed. Check console for details.');
  }
}

function ffToggleActionsMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;

  const isShown = menu.style.display === 'block';

  const allMenus = document.querySelectorAll('.actions-menu');
  allMenus.forEach((m) => {
    if (m.id !== id) m.style.display = 'none';
  });

  menu.style.display = isShown ? 'none' : 'block';
}

window.ffToggleActionsMenu = ffToggleActionsMenu;
window.ffStakeFrog        = ffStakeFrog;
window.ffUnstakeFrog      = ffUnstakeFrog;
window.ffTransferFrog     = ffTransferFrog;


// ===================================================
// Wallet connect + dashboard
// ===================================================
let ffWeb3 = null;
let ffCurrentAccount = null;

function ffSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function ffSetAvatar(id, url) {
  const el = document.getElementById(id);
  if (el && url) {
    el.src = url;
  }
}

function ffUpdateWalletBasicUI(address) {
  ffSetText('wallet-status-label', 'Connected');
  ffSetText('dashboard-wallet', `Wallet: ${truncateAddress(address)}`);

  const walletNavLink = document.getElementById('wallet-nav-link');
  if (walletNavLink) {
    walletNavLink.textContent = truncateAddress(address);
    walletNavLink.style.display = '';
  }
}

function ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile) {
  ffUpdateWalletBasicUI(address);

  if (typeof ownedCount === 'number') {
    ffSetText('stat-owned', ownedCount.toString());
  }

  if (stakingStats) {
    if (typeof stakingStats.staked === 'number') {
      ffSetText('stat-staked', stakingStats.staked.toString());
    }

    if (stakingStats.rewardsAvailable != null) {
      ffSetText('stat-rewards-available', stakingStats.rewardsAvailable.toString());
    }

    if (stakingStats.rewardsEarned != null) {
      ffSetText('stat-rewards-earned', stakingStats.rewardsEarned.toString());
    }
  }

  if (profile) {
    if (profile.username) {
      ffSetText('dashboard-username', profile.username);
    }
    if (profile.avatarUrl) {
      ffSetAvatar('dashboard-avatar', profile.avatarUrl);
    }
  }
}

async function ffFetchOwnedFrogCount(address) {
  if (!FF_ALCHEMY_NFT_BASE) {
    console.warn('Alchemy NFT base URL missing; owned frog count disabled.');
    return null;
  }

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getNFTsForOwner failed:', res.status);
    return null;
  }

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => {
    const addr = nft.contract && nft.contract.address;
    return addr && addr.toLowerCase() === target;
  });

  return frogs.length;
}

function ffEnsureWeb3() {
  if (ffWeb3) return ffWeb3;

  if (typeof Web3 === 'undefined') {
    console.warn('Web3.js is not loaded.');
    return null;
  }

  try {
    ffWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
    return ffWeb3;
  } catch (err) {
    console.warn('Failed to initialise Web3 HTTP provider', err);
    return null;
  }
}

// Create/ensure global controller for read-only calls
function ffEnsureController() {
  const web3 = ffEnsureWeb3();
  if (!web3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Cannot init controller: missing Web3 or CONTROLLER_ABI');
    return null;
  }
  if (!window.controller) {
    window.controller = new web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
  }
  return window.controller;
}

async function ffTryContractCall(contract, names, args = []) {
  if (!contract || !contract.methods) return null;
  for (const name of names) {
    if (contract.methods[name]) {
      try {
        return await contract.methods[name](...args).call();
      } catch (err) {
        console.warn(`Call to ${name} failed:`, err);
      }
    }
  }
  return null;
}

async function ffFetchStakingStats(address) {
  const web3 = ffEnsureWeb3();
  if (!web3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staking stats disabled.');
    return null;
  }

  const contract = new web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

  const rewardsAvailableRaw = await ffTryContractCall(contract, [
    'getRewardsAvailable',
    'rewardsAvailable',
    'pendingRewards'
  ], [address]);

  const rewardsEarnedRaw = await ffTryContractCall(contract, [
    'getTotalRewardsEarned',
    'rewardsEarned',
    'claimedRewards'
  ], [address]);

  const stats = {
    staked: null,
    rewardsAvailable: null,
    rewardsEarned: null
  };

  if (Array.isArray(stakedRaw)) {
    stats.staked = stakedRaw.length;
  } else if (stakedRaw != null && !isNaN(stakedRaw)) {
    stats.staked = Number(stakedRaw);
  }

  if (rewardsAvailableRaw != null) {
    stats.rewardsAvailable = rewardsAvailableRaw;
  }

  if (rewardsEarnedRaw != null) {
    stats.rewardsEarned = rewardsEarnedRaw;
  }

  return stats;
}

async function ffFetchOpenSeaProfile(address) {
  if (!FF_OPENSEA_API_KEY) {
    console.warn('OpenSea API key missing; profile fetch disabled.');
    return null;
  }

  const url = `https://api.opensea.io/api/v2/accounts/${address}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': FF_OPENSEA_API_KEY
    }
  });

  if (!res.ok) {
    console.warn('OpenSea profile request failed:', res.status);
    return null;
  }

  const data = await res.json();

  const username =
    data.username ||
    (data.account && data.account.username) ||
    (data.account && data.account.address) ||
    null;

  const avatarUrl =
    data.profile_image_url ||
    data.profileImageUrl ||
    (data.account && data.account.profile_image_url) ||
    (data.account && data.account.image_url) ||
    null;

  return { username, avatarUrl };
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

    ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile);

    await renderOwnedAndStakedFrogs(address);
    ffSwitchView('wallet');
  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet. Check your wallet and try again.');
  }
}

window.connectWallet = connectWallet;

function ffInitWalletOnLoad() {
  const btn = document.getElementById('connect-wallet-button');
  if (btn) {
    btn.addEventListener('click', connectWallet);
  }

  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');
}

function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();

  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0;
  let prev = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    const val = map[roman[i]] || 0;
    if (val < prev) {
      total -= val;
    } else {
      total += val;
      prev = val;
    }
  }

  return total || null;
}
