// assets/site.js

// ------------------------
// Config
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';

const FF_ALCHEMY_API_KEY   = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_ALCHEMY_NFT_BASE  = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Activity mode + paging
let FF_ACTIVITY_MODE   = 'sales'; // 'sales' or 'mints'
let FF_RECENT_LIMIT    = 100;
let FF_CURRENT_VIEW    = 'activity';

// Rarity paging
let FF_RARITY_SORTED   = null;
let FF_RARITY_RENDERED = 0;
const FF_RARITY_PAGE_SIZE = 24;

// Pond paging
let FF_POND_TOKEN_IDS  = null;
let FF_POND_RENDERED   = 0;
const FF_POND_PAGE_SIZE = 36;

// Caches
const FF_OWNER_CACHE = new Map();  // tokenId -> address | null
const FF_SALE_CACHE  = new Map();  // tokenId -> price string | null

// Read-only Web3 for staking lookups (Alchemy HTTP, no wallet needed)
let ffReadWeb3       = null;
let ffReadCollection = null;
let ffReadController = null;

function ffEnsureReadContracts() {
  if (typeof Web3 === 'undefined') {
    console.warn('[FF] Web3.js not loaded; staking lookups disabled.');
    return false;
  }

  if (!ffReadWeb3) {
    try {
      ffReadWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
    } catch (err) {
      console.warn('[FF] Failed to init read-only Web3:', err);
      return false;
    }
  }

  if (!ffReadCollection) {
    if (typeof COLLECTION_ABI === 'undefined') {
      console.warn('[FF] COLLECTION_ABI missing; staking lookups disabled.');
      return false;
    }
    ffReadCollection = new ffReadWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
  }

  if (!ffReadController) {
    if (typeof CONTROLLER_ABI === 'undefined') {
      console.warn('[FF] CONTROLLER_ABI missing; staking lookups disabled.');
      return false;
    }
    ffReadController = new ffReadWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
  }

  return true;
}

// Override old stakingValues() with a read-only, Alchemy-based version.
// Returns:
//   [ stakedDays, stakedLevelRoman, daysToNextLevel, flyzEarned, formattedDate ]
// OR [] if the frog is not currently staked.
async function stakingValues(tokenId) {
  // Normalize tokenId
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) {
    return [];
  }

  // Ensure read-only contracts are ready
  if (!ffEnsureReadContracts()) {
    return [];
  }

  const web3       = ffReadWeb3;
  const collection = ffReadCollection;
  const controller = ffReadController;

  try {
    // 1) Check if frog is actually staked
    const staker = await controller.methods.stakerAddress(tokenId).call();
    if (!staker || staker === ZERO_ADDRESS) {
      // Not staked -> no staking info
      return [];
    }

    // 2) Find the most recent Transfer TO the controller for this token
    const tokenIdStr = String(tokenId);

    const events = await collection.getPastEvents('Transfer', {
      filter: {
        to: FF_CONTROLLER_ADDRESS,
        tokenId: tokenIdStr
      },
      fromBlock: 0,
      toBlock: 'latest'
    });

    if (!events || !events.length) {
      // Shouldn't happen if it's staked, but bail safely
      return [];
    }

    const lastEvt = events[events.length - 1];
    const block   = await web3.eth.getBlock(lastEvt.blockNumber);

    if (!block || !block.timestamp) {
      return [];
    }

    // 3) Compute stake duration + level, exactly like the old ethereum-dapp logic
    const stakedTimestampMs = Number(block.timestamp) * 1000;
    const stakedDate        = new Date(stakedTimestampMs);

    const durationMs   = Date.now() - stakedTimestampMs;
    const stakedHours  = Math.floor(durationMs / 1000 / 60 / 60);
    if (!Number.isFinite(stakedHours) || stakedHours < 0) {
      return [];
    }

    // Level increases every 1000 hours, starting at level 1
    const stakedLevelInt = Math.floor(stakedHours / 1000) + 1;

    const stakedTimeDays = Math.floor(stakedHours / 24); // total days staked
    const stakedNextDays = Math.round(((stakedLevelInt * 1000) - stakedHours) / 24);
    const stakedEarned   = (stakedHours / 1000).toFixed(3); // FLYZ earned

    // Format date as mm/dd/yy
    const mm = String(stakedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(stakedDate.getDate()).padStart(2, '0');
    const yy = String(stakedDate.getFullYear()).slice(-2);
    const formattedDate = `${mm}/${dd}/${yy}`;

    // Use the same roman numeral function as the old dapp, if present
    let stakedLevelRoman = String(stakedLevelInt);
    if (typeof romanize === 'function') {
      try {
        stakedLevelRoman = romanize(stakedLevelInt);
      } catch (e) {
        // fall back to plain number if romanize fails
        stakedLevelRoman = String(stakedLevelInt);
      }
    }

    // [ Time Staked (days), Staked Level (roman), Next Level (days),
    //   Flyz Earned, Date Staked ]
    return [
      stakedTimeDays,
      stakedLevelRoman,
      stakedNextDays,
      Number(stakedEarned),
      formattedDate
    ];
  } catch (err) {
    console.warn('[FF] stakingValues() failed for token', tokenId, err);
    return [];
  }
}

// ===================================================
// Entry
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initial load = recent sales
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
// Nav + hero wiring
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

  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  const panels = [
    'recent-activity-panel',
    'rarity-panel',
    'pond-panel',
    'owned-panel',
    'staked-panel'
  ];
  panels.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (viewName === 'collection') {
    const panel = document.getElementById('recent-activity-panel');
    if (panel) panel.style.display = '';
    FF_ACTIVITY_MODE = 'mints';
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
    const panel = document.getElementById('recent-activity-panel');
    if (panel) panel.style.display = '';
    FF_ACTIVITY_MODE = 'sales';
    loadRecentActivity();
  }
}


// ===================================================
// Recent activity (sales / mints)
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

      if (!rawTokenId) continue;

      const tokenId = parseTokenId(rawTokenId);
      if (!tokenId) continue;

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let headerLeft;
      let headerRight = '';

      if (FF_ACTIVITY_MODE === 'mints') {
        headerLeft = truncateAddress(item.to);
        // leaving headerRight blank here; we’ll try to fill sale price later
      } else {
        const ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerLeft  = truncateAddress(ownerAddress);
        headerRight = formatSalePrice(item);
      }

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
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml
      });

      container.appendChild(card);

      // Attach staking stats ONLY if actually staked
      ffAttachStakeMetaIfStaked(card, tokenId);

      // For mints or missing price, try to fill last sale price
      if (!headerRight || headerRight === '--') {
        ffEnsureCardHasSalePrice(card, tokenId);
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


// ===================================================
// Owner + last sale helpers (for rarity / pond / mints)
// ===================================================
async function ffFetchLastSalePrice(tokenId) {
  if (FF_SALE_CACHE.has(tokenId)) {
    return FF_SALE_CACHE.get(tokenId);
  }

  try {
    const params = new URLSearchParams({
      contractAddress: FF_COLLECTION_ADDRESS,
      tokenId: String(tokenId),
      order: 'desc',
      limit: '1'
    });
    const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('getNFTSales (per-token) failed:', res.status);
      FF_SALE_CACHE.set(tokenId, null);
      return null;
    }
    const data  = await res.json();
    const sales = Array.isArray(data.nftSales) ? data.nftSales : [];
    if (!sales.length) {
      FF_SALE_CACHE.set(tokenId, null);
      return null;
    }
    const priceStr = formatSalePrice(sales[0]);
    FF_SALE_CACHE.set(tokenId, priceStr);
    return priceStr;
  } catch (err) {
    console.warn('ffFetchLastSalePrice error for token', tokenId, err);
    FF_SALE_CACHE.set(tokenId, null);
    return null;
  }
}

async function ffEnsureCardHasSalePrice(card, tokenId) {
  if (!card) return;
  const priceEl = card.querySelector('.sale_card_price.header-price');
  if (!priceEl) return;

  const current = priceEl.textContent.trim();
  if (current && current !== '--') return;

  const price = await ffFetchLastSalePrice(tokenId);
  if (price) {
    priceEl.textContent = price;
  }
}


// ===================================================
// Token / rarity helpers
// ===================================================
function parseTokenId(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw.tokenId != null) raw = raw.tokenId;

  let s = String(raw).trim();

  if (/^0x[0-9a-fA-F]+$/.test(s)) {
    const n = parseInt(s, 16);
    return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
  }

  if (/e\+/i.test(s)) return null;

  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return n;
}

function getRarityRank(tokenId) {
  if (typeof window === 'undefined') return null;
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return null;

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


// ===================================================
// Rarity grid
// ===================================================
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
      moreBtn.disabled   = true;
      moreBtn.textContent = 'All loaded';
    }
    return;
  }

  const slice = list.slice(start, end);
  for (const item of slice) {
    const tokenId = item.tokenId;
    const rank    = item.rank;

    const metadata = await fetchFrogMetadata(tokenId);

    // NOTE: per your request, we do NOT show owner on rarity cards for now.
    const headerLeft  = '';
    const headerRight = '';

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
      headerLeft,
      headerRight,
      footerHtml: '',
      actionHtml
    });

    // Insert rank as first trait line
    const props = card.querySelector('.recent_sale_properties');
    if (props) {
      const rankP = document.createElement('p');
      rankP.className = 'frog-attr-text';
      rankP.textContent = `Rank: #${rank}`;
      props.insertBefore(rankP, props.firstChild);
    }

    container.appendChild(card);

    // Attach staking stats only if frog is staked
    ffAttachStakeMetaIfStaked(card, tokenId);

    // Top-right = last sale price if available
    ffEnsureCardHasSalePrice(card, tokenId);
  }

  FF_RARITY_RENDERED = end;

  const moreBtn = document.getElementById('load-more-rarity');
  if (moreBtn) {
    if (FF_RARITY_RENDERED >= list.length) {
      moreBtn.disabled   = true;
      moreBtn.textContent = 'All loaded';
    } else {
      moreBtn.disabled   = false;
      moreBtn.textContent = 'Load More';
    }
  }
}


// ===================================================
// Shared frog card renderer
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
    <strong class="sale_card_title header-owner">${headerLeft || ''}</strong>
    <strong class="sale_card_price header-price">${headerRight || ''}</strong>
    <div style="clear: both;"></div>

    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="https://freshfrogs.github.io/frog/${tokenId}.png"
        class="recent_sale_img"
        alt="Frog #${tokenId}"
        loading="lazy"
      />
    </div>

    <div class="recent_sale_traits">
      <strong class="sale_card_title frog-name">${frogName}</strong>
      <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>

      <div class="stake-meta-slot">
        ${footerHtml || ''}
      </div>

      <div class="action-links-slot">
        ${actionHtml || ''}
      </div>
    </div>
  `;

  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch((err) => {
      console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
    });
  }

  return card;
}

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

// Layered image (using github metadata + build_trait)
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

    for (const attr of attrs) {
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
// Activity fetchers
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
  const ownedGrid    = document.getElementById('owned-frogs-grid');
  const ownedStatus  = document.getElementById('owned-frogs-status');
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

    // Owned frogs (no staking stats here)
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
          headerRight: '',
          footerHtml: '',
          actionHtml
        });

        ownedGrid.appendChild(card);
        ffEnsureCardHasSalePrice(card, tokenId);
      }
    }

    // Staked frogs (wallet)
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
          headerLeft: truncateAddress(address || ffCurrentAccount) || '--',
          headerRight: '',
          footerHtml,
          actionHtml
        });

        stakedGrid.appendChild(card);
        ffDecorateStakedFrogCard(tokenId);
        ffEnsureCardHasSalePrice(card, tokenId);
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
// ===================================================
async function ffFetchPondTokenIdsViaAlchemy() {
  if (!FF_ALCHEMY_NFT_BASE) return [];

  const owner  = FF_CONTROLLER_ADDRESS;
  const target = FF_COLLECTION_ADDRESS.toLowerCase();
  const tokenIds = [];
  let pageKey = null;

  try {
    do {
      const params = new URLSearchParams({
        owner,
        withMetadata: 'false',
        pageSize: '100'
      });
      if (pageKey) params.set('pageKey', pageKey);

      const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('Alchemy getNFTsForOwner (pond) failed:', res.status);
        break;
      }

      const data = await res.json();
      const nfts = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];

      for (const nft of nfts) {
        const addr = nft.contract && nft.contract.address;
        if (!addr || addr.toLowerCase() !== target) continue;

        const rawTokenId = nft.tokenId || (nft.id && nft.id.tokenId);
        const tid = parseTokenId(rawTokenId);
        if (tid != null && !tokenIds.includes(tid)) {
          tokenIds.push(tid);
        }
      }

      pageKey = data.pageKey;
    } while (pageKey && tokenIds.length < 4040);
  } catch (err) {
    console.warn('ffFetchPondTokenIdsViaAlchemy error:', err);
  }

  return tokenIds.sort((a, b) => a - b);
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
      FF_POND_TOKEN_IDS   = await ffFetchPondTokenIdsViaAlchemy();
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

      let ownerLabel = truncateAddress(FF_CONTROLLER_ADDRESS);
      if (typeof stakerAddress === 'function') {
        try {
          const addr = await stakerAddress(tokenId);
          if (addr && addr !== ZERO_ADDRESS) {
            ownerLabel = truncateAddress(addr);
          }
        } catch (err) {
          console.warn('stakerAddress() failed for pond token', tokenId, err);
        }
      }

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
        headerLeft: ownerLabel,
        headerRight: '',
        footerHtml,
        actionHtml
      });

      container.appendChild(card);

      // Fill staking stats + last sale price
      ffDecorateStakedFrogCard(tokenId);
      ffEnsureCardHasSalePrice(card, tokenId);
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
// Staking decorations (for cards that ARE staked)
// ===================================================
async function ffDecorateStakedFrogCard(tokenId) {
  if (typeof stakingValues !== 'function') {
    console.warn('stakingValues() not available; skipping staking details');
    return;
  }
  if (!ffEnsureController()) return;

  try {
    const values = await stakingValues(tokenId);
    if (!values || values.length < 5) return;

    const [stakedDays, stakedLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(stakedLevel) ?? stakedLevel;

    const lvlEl  = document.getElementById(`stake-level-${tokenId}`);
    const dateEl = document.getElementById(`stake-date-${tokenId}`);
    const nextEl = document.getElementById(`stake-next-${tokenId}`);
    const barEl  = document.getElementById(`stake-progress-bar-${tokenId}`);

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
// Stake / Unstake / Transfer actions
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
    alert('Stake transaction failed. Check your wallet and try again.');
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
    alert('Unstake transaction failed. Check your wallet and try again.');
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
    alert('Transfer transaction failed. Check your wallet and try again.');
  }
}

window.ffStakeFrog    = ffStakeFrog;
window.ffUnstakeFrog  = ffUnstakeFrog;
window.ffTransferFrog = ffTransferFrog;


// ===================================================
// Wallet connect + helpers
// ===================================================
function ffSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function ffSetAvatar(id, url) {
  const el = document.getElementById(id);
  if (el && url) el.src = url;
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

async function ffFetchOwnedFrogCount(address) {
  if (!FF_ALCHEMY_NFT_BASE) return null;

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
    console.warn('Web3.js not loaded.');
    return null;
  }
  try {
    ffWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
    return ffWeb3;
  } catch (err) {
    console.warn('Failed to init Web3 HTTP provider', err);
    return null;
  }
}

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
    'availableRewards',
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

  if (rewardsAvailableRaw != null) stats.rewardsAvailable = rewardsAvailableRaw;
  if (rewardsEarnedRaw != null)   stats.rewardsEarned   = rewardsEarnedRaw;

  return stats;
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

    const [ownedCount, stakingStats] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch(() => null),
      ffFetchStakingStats(address).catch(() => null)
    ]);

    if (typeof ownedCount === 'number') {
      ffSetText('stat-owned', String(ownedCount));
    }
    if (stakingStats) {
      if (typeof stakingStats.staked === 'number') {
        ffSetText('stat-staked', String(stakingStats.staked));
      }
      if (stakingStats.rewardsAvailable != null) {
        ffSetText('stat-rewards-available', String(stakingStats.rewardsAvailable));
      }
      if (stakingStats.rewardsEarned != null) {
        ffSetText('stat-rewards-earned', String(stakingStats.rewardsEarned));
      }
    }

    await renderOwnedAndStakedFrogs(address);
    ffSwitchView('wallet');
  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet. Check your wallet and try again.');
  }
}

window.connectWallet = connectWallet;

function ffInitWalletOnLoad() {
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

// ===================================================
//  STAKING STATS FIX (drop-in patch)
//  - Kills old ffAttachStakeMetaIfStaked that used ffWeb3
//  - Uses read-only Web3 via Alchemy
//  - Applies correct staking stats to all frog cards
// ===================================================

// 1) Override the old helper so it no longer touches ffWeb3 / ffEnsureWeb3.
//    loadRecentActivity will call THIS version instead of the old one.
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  // We now attach staking metadata via the observer below.
  // Keep this as a no-op so it never throws.
  return;
}

async function ffEnsureReadContracts() {
  if (ffReadWeb3 && ffReadCollection && ffReadController) {
    return {
      web3: ffReadWeb3,
      collection: ffReadCollection,
      controller: ffReadController
    };
  }

  if (typeof Web3 === 'undefined') {
    console.warn('[FreshFrogs] Web3.js not found; staking stats disabled.');
    return {};
  }

  // Read-only provider – no wallet needed
  ffReadWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);

  if (typeof COLLECTION_ABI === 'undefined' || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('[FreshFrogs] ABIs missing; staking stats disabled.');
    return { web3: ffReadWeb3 };
  }

  ffReadCollection = new ffReadWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
  ffReadController = new ffReadWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  return {
    web3: ffReadWeb3,
    collection: ffReadCollection,
    controller: ffReadController
  };
}

// 3) New staking values helper (replaces the old ethereum-dapp.js math)
async function ffGetStakingValues(tokenId) {
  const { web3, collection, controller } = await ffEnsureReadContracts();
  if (!web3 || !collection || !controller) return null;

  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return null;

  // Check if it is actually staked
  let staker;
  try {
    staker = await controller.methods.stakerAddress(tokenId).call();
  } catch (err) {
    console.warn('[FreshFrogs] stakerAddress call failed for token', tokenId, err);
    return null;
  }

  if (!staker || staker === ZERO_ADDRESS) {
    return null; // not staked
  }

  // Find the most recent Transfer TO the controller for this token
  let events;
  try {
    events = await collection.getPastEvents('Transfer', {
      filter: { to: FF_CONTROLLER_ADDRESS, tokenId: String(tokenId) },
      fromBlock: 0,
      toBlock: 'latest'
    });
  } catch (err) {
    console.warn('[FreshFrogs] getPastEvents(Transfer) failed for token', tokenId, err);
    return null;
  }

  if (!events || !events.length) {
    return null;
  }

  const lastEvt = events[events.length - 1];
  const block = await web3.eth.getBlock(lastEvt.blockNumber);
  if (!block || !block.timestamp) return null;

  const stakedDate = new Date(Number(block.timestamp) * 1000);

  // ---- Match the old ethereum-dapp staking math ----
  const now = Date.now();
  const stakedHours = Math.floor((now - stakedDate.getTime()) / (1000 * 60 * 60)); // hours

  const levelInt       = Math.floor(stakedHours / 1000) + 1;        // 1000h per level, starting at 1
  const stakedTimeDays = Math.floor(stakedHours / 24);              // total days staked
  const stakedNext     = Math.round(((levelInt * 1000) - stakedHours) / 24); // days to next level
  const stakedEarned   = (stakedHours / 1000).toFixed(3);           // FLYZ earned

  const mm = String(stakedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(stakedDate.getDate()).padStart(2, '0');
  const yy = String(stakedDate.getFullYear()).slice(-2);
  const formattedDate = `${mm}/${dd}/${yy}`;

  return {
    stakedTimeDays,
    levelInt,
    stakedNext,
    stakedEarned,
    formattedDate
  };
}

// 4) Insert staking block into a card so it matches the wallet "staked frogs" style
function ffInsertStakeMetaIntoCard(card, info) {
  // Remove any previous staking block from this card
  card.querySelectorAll('.stake-meta, .staking-sale-stats').forEach((el) => el.remove());

  if (!info) {
    // Not staked; nothing extra to show
    return;
  }

  const { stakedTimeDays, levelInt, stakedNext, stakedEarned, formattedDate } = info;

  const propsBlock =
    card.querySelector('.recent_sale_properties') ||
    card.querySelector('.recent_sale_traits') ||
    card;

  const wrapper = document.createElement('div');
  wrapper.className = 'stake-meta';

  // Same basic layout as wallet staked frogs: level, dates, progress bar
  const MAX_DAYS   = 41.7;
  const remaining  = Math.max(0, Math.min(MAX_DAYS, Number(stakedNext)));
  const pct        = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

  wrapper.innerHTML = `
    <div class="stake-meta-row">
      <span class="stake-level-label">Staked Lvl. ${levelInt}</span>
    </div>
    <div class="stake-meta-row stake-meta-subrow">
      <span>Staked: ${formattedDate} (${stakedTimeDays}d)</span>
      <span>Next level in ~${stakedNext} days</span>
    </div>
    <div class="stake-progress">
      <div class="stake-progress-bar" style="width:${pct}%;"></div>
    </div>
  `;

  propsBlock.appendChild(wrapper);
}

// 5) Patch staking info on any frog cards that appear, using a MutationObserver
async function ffPatchCardStaking(card) {
  if (!card || !(card instanceof HTMLElement)) return;
  if (card.dataset.stakePatched === '1') return;

  const tokenId = parseTokenId(card.dataset.tokenId);
  if (tokenId == null) return;

  try {
    const info = await ffGetStakingValues(tokenId);
    ffInsertStakeMetaIntoCard(card, info);
    card.dataset.stakePatched = '1';
  } catch (err) {
    console.warn('[FreshFrogs] ffPatchCardStaking failed for token', tokenId, err);
  }
}

function ffSetupStakingObserver() {
  if (typeof MutationObserver === 'undefined') return;

  const targets = [
    document.getElementById('recent-sales'),
    document.getElementById('rarity-grid'),
    document.getElementById('pond-grid'),
    document.getElementById('owned-frogs-grid'),
    document.getElementById('staked-frogs-grid')
  ].filter(Boolean);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes &&
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains('recent_sale_card')) {
            ffPatchCardStaking(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('.recent_sale_card').forEach(ffPatchCardStaking);
          }
        });
    }
  });

  // Observe each grid and also patch any cards that are already there
  targets.forEach((t) => {
    observer.observe(t, { childList: true, subtree: true });
    t.querySelectorAll('.recent_sale_card').forEach(ffPatchCardStaking);
  });
}

// Run the observer once the DOM is ready
document.addEventListener('DOMContentLoaded', ffSetupStakingObserver);

// Also expose the new staking helper globally so legacy code can use it if needed
window.stakingValues = async function (tokenId) {
  const info = await ffGetStakingValues(tokenId);
  if (!info) return [0, 0, 0, 0, ''];
  // Match old return signature: [timeDays, level(roman/int), nextDays, flyz, dateStr]
  // We return numeric level here; your card code already converts to display text.
  return [
    info.stakedTimeDays,
    info.levelInt,
    info.stakedNext,
    info.stakedEarned,
    info.formattedDate
  ];
};
