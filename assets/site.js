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

// 🔧 Recent sales source: "alchemy" or "opensea"
const FF_SALES_SOURCE = 'opensea'; // <--- change to "alchemy" if you want to switch back

// 🔧 OpenSea collection slug (used ONLY when FF_SALES_SOURCE === "opensea")
const FF_OPENSEA_COLLECTION_SLUG = 'fresh-frogs'; // update if your slug is different

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Activity mode (sales vs mints) for "Collection" panel
let FF_ACTIVITY_MODE = 'sales'; // 'sales' or 'mints'
let FF_RECENT_LIMIT  = 24;

// Toggle to show staking stats on non-wallet cards
const FF_SHOW_STAKING_STATS_ON_CARDS = true;

// Rarity paging
let FF_RARITY_INDEX = 0;
const FF_RARITY_BATCH = 24;

// Pond paging
let FF_POND_PAGE_KEY = null;

// ------------------------
// Global wallet state
// ------------------------
let ffWeb3 = null;
let ffCurrentAccount = null;

// Queue of cards that need staking decoration once contracts/helpers are ready
const FF_PENDING_STAKE_CARDS = [];

// Cache of last sale prices: tokenId -> "0.123 ETH"
const FF_SALE_PRICE_CACHE = Object.create(null);

// ------------------------
// Small helpers
// ------------------------
function ffCacheSalePrice(tokenId, priceText) {
  if (tokenId == null) return;
  if (!priceText || priceText === '--') return;
  FF_SALE_PRICE_CACHE[tokenId] = priceText;
}

function ffGetCachedSalePrice(tokenId) {
  if (tokenId == null) return null;
  return FF_SALE_PRICE_CACHE[tokenId] || null;
}

// Detect if we’re on the 404 wallet-viewer (path like /0xabc... mapped to 404.html)
function ffIsWalletViewer() {
  try {
    const raw = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!raw) return false;
    const first = raw.split('/')[0];
    return /^0x[a-fA-F0-9]{40}$/.test(first);
  } catch {
    return false;
  }
}

// Build HTML for an owner link at top-left of the card
function ffOwnerLinkHtml(address) {
  if (!address) return '';
  const short = truncateAddress(address);
  const href  = `https://freshfrogs.github.io/${address}`;
  return `<a class="ff-owner-link" href="${href}" target="_self">${ffEscapeHtml(short)}</a>`;
}

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffInitNav();
  ffWireHeroButtons();

  // Default view: Collection (recent sales)
  ffShowView('collection'); // this calls loadRecentActivity()

  ffInitWalletOnLoad();

  const loadMoreBtn =
    document.getElementById('load-more-activity') ||
    document.getElementById('load-more-sales');

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      const prevY = window.scrollY;
      FF_RECENT_LIMIT += 6;
      await loadRecentActivity();
      window.scrollTo(0, prevY);
    });
  }

  const loadMoreRarity = document.getElementById('load-more-rarity');
  if (loadMoreRarity) {
    loadMoreRarity.addEventListener('click', () => {
      ffLoadMoreRarity();
    });
  }

  const loadMorePond = document.getElementById('load-more-pond');
  if (loadMorePond) {
    loadMorePond.addEventListener('click', () => {
      ffLoadMorePond();
    });
  }
});

// ------------------------
// View / Nav switching
// ------------------------
function ffInitNav() {
  const links = document.querySelectorAll('.nav a[data-view]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      ffShowView(view);
    });
  });
}

function ffWireHeroButtons() {
  const viewCollectionBtn = document.getElementById('hero-view-collection-btn');
  const heroConnectBtn    = document.getElementById('hero-connect-wallet-btn');

  if (viewCollectionBtn) {
    viewCollectionBtn.addEventListener('click', () => {
      ffShowView('collection');
    });
  }
  if (heroConnectBtn) {
    heroConnectBtn.addEventListener('click', connectWallet);
  }
}

function ffShowView(view) {
  const links = document.querySelectorAll('.nav a[data-view]');
  links.forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  const recentPanel  = document.getElementById('recent-activity-panel');
  const rarityPanel  = document.getElementById('rarity-panel');
  const pondPanel    = document.getElementById('pond-panel');
  const ownedPanel   = document.getElementById('owned-panel');
  const stakedPanel  = document.getElementById('staked-panel');

  if (recentPanel)  recentPanel.style.display  = (view === 'collection') ? '' : 'none';
  if (rarityPanel)  rarityPanel.style.display  = (view === 'rarity') ? '' : 'none';
  if (pondPanel)    pondPanel.style.display    = (view === 'pond') ? '' : 'none';
  if (ownedPanel)   ownedPanel.style.display   = (view === 'wallet') ? '' : 'none';
  if (stakedPanel)  stakedPanel.style.display  = (view === 'wallet') ? '' : 'none';

  if (view === 'collection') {
    loadRecentActivity();
  } else if (view === 'rarity') {
    ffEnsureRarityLoaded();
  } else if (view === 'pond') {
    ffEnsurePondLoaded();
  } else if (view === 'wallet' && ffCurrentAccount) {
    renderOwnedAndStakedFrogs(ffCurrentAccount);
  }
}

// ------------------------
// Recent activity loader (Collection panel)
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

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata || (item.rawMetadata || (item.nft && item.nft.metadata)));
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to || item.ownerAddress;
        headerRight  = formatMintAge(item);
      } else {
        ownerAddress =
          item.buyerAddress ||
          (item.buyer && item.buyer.address) ||
          item.to ||
          item.ownerAddress ||
          item.sellerAddress ||
          (item.seller && item.seller.address) ||
          null;

        headerRight = formatSalePrice(item);

        // Cache last sale price per token for wallet / 404 usage
        if (headerRight && headerRight !== '--') {
          ffCacheSalePrice(tokenId, headerRight);
        }
      }

      const headerLeft = ownerAddress ? ffOwnerLinkHtml(ownerAddress) : '';

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

      // Staking stats on recent sales / mints if frog is staked
      ffAttachStakeMetaIfStaked(card, tokenId);
    }
  } catch (err) {
    console.error('Unable to load recent activity', err);
    const status = FF_ACTIVITY_MODE === 'mints'
      ? 'Unable to load recent mints right now.'
      : 'Unable to load recent sales right now.';
    if (statusEl) statusEl.textContent = status;
  }
}

// Attach staking block to any card (recent, pond, rarity, etc.)
// Uses ethereum-dapp.js helpers: stakerAddress() + stakingValues()
// If staking infra isn't ready yet, we queue the card and decorate later.
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  if (!FF_SHOW_STAKING_STATS_ON_CARDS) return;
  if (!card) return;

  // If staking helpers or controller aren't ready yet, queue for later
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) {
    FF_PENDING_STAKE_CARDS.push({ card, tokenId });
    return;
  }

  try {
    const staker = await stakerAddress(tokenId);
    // Not staked or explicitly zero-address → no staking block
    if (!staker || staker === ZERO_ADDRESS) return;

    const values = await stakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned, stakedDate] = values;

    // Convert roman numerals if needed (e.g., "XII" -> 12)
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    // Find the traits block, then attach staking *after* it, not inside
    const propsBlock =
      card.querySelector('.recent_sale_properties') ||
      card.querySelector('.recent_sale_traits') ||
      card;

    const parent = propsBlock.parentElement || card;

    // Remove any previous staking block so we don't double-render
    parent.querySelectorAll('.stake-meta, .staking-sale-stats').forEach((el) => el.remove());

    const wrapper = document.createElement('div');
    wrapper.className = 'stake-meta';
    wrapper.innerHTML = `
      <div class="stake-meta-row">
        <span class="stake-level-label">Staked Lvl. ${levelNum}</span>
      </div>
      <div class="stake-meta-row stake-meta-subrow">
        <span>Staked: ${stakedDate} (${stakedDays}d)</span>
      </div>
      <div class="stake-progress">
        <div class="stake-progress-bar" style="width:${pct}%;"></div>
      </div>
    `;

    // Insert staking block right after the traits, but before any action buttons
    const firstAction = parent.querySelector('.recent_sale_links');
    if (firstAction) {
      parent.insertBefore(wrapper, firstAction);
    } else {
      parent.appendChild(wrapper);
    }
  } catch (err) {
    console.warn('ffAttachStakeMetaIfStaked failed for token', tokenId, err);
  }
}

// Process any cards that were queued before staking helpers were ready
function ffProcessPendingStakeMeta() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) {
    return;
  }

  const pending = FF_PENDING_STAKE_CARDS.splice(0, FF_PENDING_STAKE_CARDS.length);
  for (const { card, tokenId } of pending) {
    ffAttachStakeMetaIfStaked(card, tokenId);
  }
}

// Make sure *all* existing frog cards get staking info once things are ready
function ffRefreshStakeMetaForAllCards() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) {
    return;
  }

  const cards = document.querySelectorAll('.recent_sale_card');
  cards.forEach((card) => {
    const raw = card.dataset.tokenId;
    const tokenId = parseTokenId(raw);
    if (tokenId != null) {
      ffAttachStakeMetaIfStaked(card, tokenId);
    }
  });
}

// Refresh staking info on all already-rendered frog cards
async function ffRefreshAllStakeMeta() {
  if (!FF_SHOW_STAKING_STATS_ON_CARDS) return;

  const cards = document.querySelectorAll('.recent_sale_card');
  for (const card of cards) {
    const rawId = card.dataset.tokenId;
    const tokenId = parseTokenId(rawId);
    if (tokenId == null) continue;

    ffAttachStakeMetaIfStaked(card, tokenId);
  }
}

// ------------------------
// Token / rarity helpers
// ------------------------
function parseTokenId(raw) {
  if (raw == null) return null;

  if (typeof raw === 'object' && raw.tokenId != null) {
    raw = raw.tokenId;
  }

  let s = String(raw).trim();

  if (/^0x[0-9a-fA-F]+$/.test(s)) {
    const n = parseInt(s, 16);
    return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
  }

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
    rankRaw = lookup[tokenId]; // no weird fallback
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

// ------------------------
// Card rendering (shared for all grids)
// ------------------------
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
    <strong class="sale_card_title">${headerLeft || ''}</strong>
    <strong class="sale_card_price">${headerRight || ''}</strong>
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
      <strong class="sale_card_title">${frogName}</strong>
      <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
      ${footerHtml || ''}
      ${actionHtml || ''}
    </div>
  `;

  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch((err) => {
      console.warn('ffBuildLayeredFrogImage failed for token', tokenId, err);
    });
  }

  return card;
}

// Build layered frog image (uses metadata from /frog/json and build_trait from ethereum-dapp.js)
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

// ------------------------
// Activity fetchers / dedupe
// ------------------------
function dedupeByTokenId(items, idExtractor) {
  const seen = new Set();
  const out  = [];

  for (const item of items) {
    const rawId   = idExtractor(item);
    const tokenId = parseTokenId(rawId);
    if (tokenId == null) continue;
    if (seen.has(tokenId)) continue;
    seen.add(tokenId);
    out.push(item);
  }

  return out;
}

// Top-level: choose source based on config
async function fetchRecentSales(limit = 24) {
  if (FF_SALES_SOURCE === 'opensea' && FF_OPENSEA_API_KEY) {
    try {
      return await fetchRecentSalesFromOpenSea(limit);
    } catch (err) {
      console.warn('[FreshFrogs] OpenSea recent sales failed; falling back to Alchemy:', err);
      return await fetchRecentSalesFromAlchemy(limit);
    }
  }
  return await fetchRecentSalesFromAlchemy(limit);
}

// Alchemy-based recent sales (original behavior, now with normalized price)
async function fetchRecentSalesFromAlchemy(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'desc', // newest first
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy NFT sales request failed: ${response.status}`);
  }

  const payload = await response.json();
  let sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];

  // Normalize price into sale.price for easier formatting
  sales.forEach((s) => {
    const fee =
      s.sellerFee ||
      s.protocolFee ||
      s.royaltyFee ||
      s.price ||
      null;

    if (fee && fee.amount) {
      s.price = {
        amount: fee.amount,
        decimals: typeof fee.decimals === 'number' ? fee.decimals : 18,
        symbol: fee.symbol || 'ETH'
      };
    }
  });

  // Remove duplicates by tokenId
  sales = dedupeByTokenId(sales, (sale) => sale.tokenId);

  return sales;
}

// OpenSea-based recent sales (normalized to look similar to Alchemy + price field)
async function fetchRecentSalesFromOpenSea(limit = 24) {
  const perPage = Math.min(limit, 50);
  const url = `https://api.opensea.io/api/v2/events/collection/${FF_OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=${perPage}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': FF_OPENSEA_API_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`OpenSea events request failed: ${res.status}`);
  }

  const data = await res.json();

  // OpenSea v2 returns an array under "asset_events" or "events"
  const rawEvents =
    Array.isArray(data.asset_events) ? data.asset_events :
    Array.isArray(data.events)       ? data.events :
    Array.isArray(data)             ? data :
    [];

  const mapped = rawEvents.map((evt) => {
    const payload = evt.payload || evt; // Stream-style vs REST-style
    const item    = payload.item || payload.asset || {};
    const nft     = payload.nft || evt.nft || {};

    // Determine tokenId
    let tokenId = null;
    if (item.nft_id) {
      const parts = String(item.nft_id).split('/');
      tokenId = parts[parts.length - 1];
    } else if (nft.identifier) {
      tokenId = nft.identifier;
    } else if (item.token_id) {
      tokenId = item.token_id;
    } else if (payload.token_id) {
      tokenId = payload.token_id;
    }

    // Determine buyer / seller
    const buyerAddress =
      (payload.taker && payload.taker.address) ||
      (payload.winner_account && payload.winner_account.address) ||
      (payload.to_account && payload.to_account.address) ||
      null;

    const sellerAddress =
      (payload.maker && payload.maker.address) ||
      (payload.seller && payload.seller.address) ||
      (payload.from_account && payload.from_account.address) ||
      null;

    const payment = payload.payment_token || evt.payment_token || {};
    const amountRaw =
      payload.sale_price ||
      payload.total_price ||
      evt.sale_price ||
      evt.total_price ||
      null;

    const price = amountRaw
      ? {
          amount: amountRaw,
          decimals: typeof payment.decimals === 'number' ? payment.decimals : 18,
          symbol: payment.symbol || 'ETH'
        }
      : null;

    const metadata =
      item.metadata ||
      nft.metadata ||
      payload.metadata ||
      {};

    const timestamp =
      payload.event_timestamp ||
      evt.event_timestamp ||
      payload.closing_date ||
      null;

    return {
      ...evt,
      tokenId,
      buyerAddress,
      sellerAddress,
      ownerAddress: buyerAddress || null,
      paymentToken: payment,
      price,
      metadata,
      timestamp
    };
  });

  // Deduplicate by tokenId, newest first (events are already newest -> oldest)
  const deduped = dedupeByTokenId(mapped, (s) => s.tokenId);
  return deduped.slice(0, limit);
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
  let transfers =
    payload.result && Array.isArray(payload.result.transfers)
      ? payload.result.transfers
      : [];

  // Remove duplicates by tokenId
  transfers = dedupeByTokenId(
    transfers,
    (t) => t.erc721TokenId || t.tokenId
  );

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

// ------------------------
// Formatting helpers
// ------------------------
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '--';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSalePrice(sale) {
  if (!sale) return '--';

  // Prefer normalized sale.price
  let price = sale.price;

  // Fallback to Alchemy fee-style object
  if (!price) {
    const fee =
      sale.sellerFee ||
      sale.protocolFee ||
      sale.royaltyFee ||
      sale.price ||
      null;

    if (fee && fee.amount) {
      price = {
        amount: fee.amount,
        decimals: typeof fee.decimals === 'number' ? fee.decimals : 18,
        symbol: fee.symbol || 'ETH'
      };
    }
  }

  // Fallback for raw OpenSea-style sale_price / total_price + payment_token
  if (!price && (sale.sale_price || sale.total_price) && sale.payment_token) {
    price = {
      amount: sale.sale_price || sale.total_price,
      decimals: typeof sale.payment_token.decimals === 'number' ? sale.payment_token.decimals : 18,
      symbol: sale.payment_token.symbol || 'ETH'
    };
  }

  if (!price || !price.amount) {
    return '--';
  }

  const decimals = typeof price.decimals === 'number' ? price.decimals : 18;
  let amountNum;

  try {
    amountNum = Number(price.amount) / Math.pow(10, decimals);
  } catch {
    return `${price.amount} ${price.symbol || ''}`.trim();
  }

  if (!isFinite(amountNum)) {
    return `${price.amount} ${price.symbol || ''}`.trim();
  }

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${price.symbol || 'ETH'}`;
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
    transfer.blockTimestamp ||
    transfer.timestamp;

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
// Rarity panel
// ===================================================
function ffEnsureRarityLoaded() {
  const grid = document.getElementById('rarity-grid');
  if (!grid) return;
  if (!grid.children.length) {
    FF_RARITY_INDEX = 0;
    ffLoadMoreRarity();
  }
}

async function ffLoadMoreRarity() {
  const grid   = document.getElementById('rarity-grid');
  const status = document.getElementById('rarity-status');
  if (!grid) return;

  const rankings = window.freshfrogs_rarity_rankings;
  if (!Array.isArray(rankings) || !rankings.length) {
    if (status) status.textContent = 'Rarity rankings data not loaded.';
    return;
  }

  const slice = rankings.slice(FF_RARITY_INDEX, FF_RARITY_INDEX + FF_RARITY_BATCH);
  if (!slice.length) {
    if (status) status.textContent = 'All frogs loaded.';
    return;
  }

  try {
    for (const entry of slice) {
      const rawId = entry.id ?? entry.tokenId ?? entry.frogId;
      const tokenId = parseTokenId(rawId);
      if (tokenId == null) continue;

      const rank = entry.ranking ?? entry.rank ?? entry.position ?? getRarityRank(tokenId);

      const metadata = await fetchFrogMetadata(tokenId);

      const headerLeft  = ''; // owner lookup skipped here; we decorate separately if desired
      const headerRight = rank ? `Rank #${rank}` : '';

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight,
        footerHtml: '',
        actionHtml: `
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
        `
      });

      grid.appendChild(card);

      ffAttachStakeMetaIfStaked(card, tokenId);
      ffDecorateRarityOwner(card, tokenId);
    }

    FF_RARITY_INDEX += slice.length;

    if (status) {
      status.textContent = FF_RARITY_INDEX >= rankings.length
        ? 'All frogs loaded.'
        : 'Top ranked Frogs across the collection (lower rank = rarer).';
    }
  } catch (err) {
    console.error('ffLoadMoreRarity failed', err);
    if (status) status.textContent = 'Unable to load rarity rankings.';
  }
}

// Decorate rarity card owner (staker if staked, else ownerOf)
async function ffDecorateRarityOwner(card, tokenId) {
  try {
    const ok = await ffEnsureReadContracts();
    if (!ok || !window.collection) return;

    let stakerAddr = null;
    if (typeof stakerAddress === 'function' && window.controller) {
      stakerAddr = await stakerAddress(tokenId);
      if (stakerAddr && stakerAddr === ZERO_ADDRESS) {
        stakerAddr = null;
      }
    }

    let ownerAddr = stakerAddr;
    if (!ownerAddr && window.collection && window.collection.methods && window.collection.methods.ownerOf) {
      ownerAddr = await window.collection.methods.ownerOf(tokenId).call();
    }

    if (!ownerAddr) return;

    const titles = card.querySelectorAll('.sale_card_title');
    const headerEl = titles[0];
    if (headerEl) {
      headerEl.innerHTML = ffOwnerLinkHtml(ownerAddr);
    }
  } catch (err) {
    console.warn('ffDecorateRarityOwner failed for token', tokenId, err);
  }
}

// ===================================================
// Pond panel (frogs owned by controller = staked by community)
// ===================================================
async function ffFetchPondFrogs(limit = 24, pageKey = null) {
  const params = new URLSearchParams({
    owner: FF_CONTROLLER_ADDRESS,
    withMetadata: 'true',
    pageSize: String(limit)
  });
  if (pageKey) params.set('pageKey', pageKey);

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Alchemy getNFTsForOwner (pond) failed: ${res.status}`);
  }
  const data = await res.json();
  const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => {
    const addr = nft.contract && nft.contract.address;
    return addr && addr.toLowerCase() === target;
  });

  return { frogs, pageKey: data.pageKey || null };
}

function ffEnsurePondLoaded() {
  const grid = document.getElementById('pond-grid');
  const status = document.getElementById('pond-status');
  if (!grid) return;

  if (!grid.children.length) {
    FF_POND_PAGE_KEY = null;
    ffLoadMorePond();
  } else if (status) {
    status.textContent = 'All Frogs currently staked by the community.';
  }
}

// Set owner label (top-left) on a pond card using stakerAddress(tokenId)
async function ffDecoratePondOwner(card, tokenId) {
  try {
    if (typeof ffEnsureReadContracts === 'function') {
      const ok = await ffEnsureReadContracts();
      if (!ok) return;
    } else {
      if (!ffWeb3 || !window.controller) return;
    }

    if (typeof stakerAddress !== 'function') {
      console.warn('stakerAddress() helper not available; cannot show pond owner.');
      return;
    }

    const staker = await stakerAddress(tokenId);
    if (!staker || staker === ZERO_ADDRESS) return;

    const titles = card.querySelectorAll('.sale_card_title');
    const ownerEl = titles[0];
    if (ownerEl) {
      ownerEl.innerHTML = ffOwnerLinkHtml(staker);
    }
  } catch (err) {
    console.warn('ffDecoratePondOwner failed for token', tokenId, err);
  }
}

async function ffLoadMorePond() {
  const grid = document.getElementById('pond-grid');
  const status = document.getElementById('pond-status');
  if (!grid) return;

  try {
    const { frogs, pageKey } = await ffFetchPondFrogs(24, FF_POND_PAGE_KEY);

    if (!frogs.length && !grid.children.length) {
      if (status) status.textContent = 'No frogs are currently staked in the pond.';
      return;
    }

    for (const nft of frogs) {
      const rawTokenId = nft.tokenId || (nft.id && nft.id.tokenId);
      const tokenId = parseTokenId(rawTokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(
        nft.rawMetadata || nft.metadata || nft.tokenMetadata
      );
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',           // will be set to owner later
        headerRight: 'Staked',
        footerHtml: '',
        actionHtml: `
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
        `
      });

      grid.appendChild(card);

      if (card.dataset.imgContainerId) {
        ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      if (typeof ffAttachStakeMetaIfStaked === 'function') {
        ffAttachStakeMetaIfStaked(card, tokenId);
      }

      ffDecoratePondOwner(card, tokenId);
    }

    FF_POND_PAGE_KEY = pageKey || null;

    if (status) {
      status.textContent = 'All Frogs currently staked by the community.';
    }
  } catch (err) {
    console.error('ffLoadMorePond failed', err);
    if (status) status.textContent = 'Unable to load pond frogs.';
  }
}


// ===================================================
// Owned / Staked frogs (wallet view and 404 viewer)
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

  // Dedupe
  return Array.from(new Set(result));
}

async function renderOwnedAndStakedFrogs(address) {
  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedGrid   = document.getElementById('staked-frogs-grid');
  const stakedStatus = document.getElementById('staked-frogs-status');

  const readOnlyViewer = ffIsWalletViewer();

  try {
    const [ownedNfts, stakedIdsRaw] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch((err) => {
        console.warn('ffFetchStakedTokenIds failed:', err);
        return [];
      })
    ]);

    const stakedIds = Array.from(new Set(stakedIdsRaw || []));

    // Owned
    if (ownedStatus) {
      ownedStatus.textContent = ownedNfts.length
        ? ''
        : 'No frogs found in this wallet.';
    }
    if (ownedGrid) ownedGrid.innerHTML = '';

    if (ownedGrid && ownedNfts.length) {
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

        // Use cached sale price if available; fall back to "Owned"
        const recentPrice = ffGetCachedSalePrice(tokenId);
        const headerRight = recentPrice || 'Owned';

        // On 404 wallet viewer we still show address top-left, but no stake/transfer buttons
        const headerLeft = ffOwnerLinkHtml(address);

        const actionHtml = readOnlyViewer
          ? `
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
          `
          : `
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
          headerLeft,
          headerRight,
          footerHtml: '',
          actionHtml
        });

        ownedGrid.appendChild(card);
      }
    }

    // Staked
    if (stakedStatus) {
      stakedStatus.textContent = stakedIds.length
        ? ''
        : 'No staked frogs found for this wallet.';
    }
    if (stakedGrid) stakedGrid.innerHTML = '';

    if (stakedGrid && stakedIds.length) {
      for (const tokenId of stakedIds) {
        let metadata = await fetchFrogMetadata(tokenId);

        // Use cached sale price if available; fall back to "Staked"
        const recentPrice = ffGetCachedSalePrice(tokenId);
        const headerRight = recentPrice || 'Staked';
        const headerLeft  = ffOwnerLinkHtml(address || ffCurrentAccount || '');

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

        const actionHtml = readOnlyViewer
          ? `
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
          `
          : `
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
          headerLeft,
          headerRight,
          footerHtml,
          actionHtml
        });

        stakedGrid.appendChild(card);

        // fill in staking values for wallet-staked cards
        ffDecorateStakedFrogCard(tokenId);
      }
    }
  } catch (err) {
    console.error('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus)  ownedStatus.textContent  = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  }
}

// Use stakingValues() from ethereum-dapp.js to decorate wallet-staked cards
async function ffDecorateStakedFrogCard(tokenId) {
  const ok = await ffEnsureReadContracts();
  if (!ok || typeof stakingValues !== 'function') {
    console.warn('stakingValues/controller not ready; skipping staking details for token', tokenId);
    return;
  }

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
    if (nextEl) nextEl.textContent = ``;

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



// ---- Card actions: Stake / Unstake / Transfer ----
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

window.ffStakeFrog    = ffStakeFrog;
window.ffUnstakeFrog  = ffUnstakeFrog;
window.ffTransferFrog = ffTransferFrog;

// ===================================================
// Wallet connect + dashboard
// ===================================================
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

  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) {
    walletNav.style.display = '';
    walletNav.textContent = truncateAddress(address);
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

// Ensure ffWeb3 + contracts exist for read-only staking calls
async function ffEnsureReadContracts() {
  if (window.controller && typeof stakingValues === 'function' && typeof stakerAddress === 'function') {
    return true;
  }

  try {
    if (!ffWeb3) {
      if (window.ethereum) {
        ffWeb3 = new Web3(window.ethereum);
      } else if (typeof Web3 !== 'undefined') {
        ffWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
      }
      if (!ffWeb3) {
        console.warn('ffEnsureReadContracts: no provider available for read-only calls.');
        return false;
      }
      window.web3 = ffWeb3;
    }

    if (!window.collection && typeof COLLECTION_ABI !== 'undefined') {
      window.collection = new ffWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
    }
    if (!window.controller && typeof CONTROLLER_ABI !== 'undefined') {
      window.controller = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }

    if (!window.controller) {
      console.warn('ffEnsureReadContracts: controller contract not initialised.');
      return false;
    }

    return true;
  } catch (err) {
    console.warn('ffEnsureReadContracts failed:', err);
    return false;
  }
}

async function ffFetchStakingStats(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staking stats disabled.');
    return null;
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

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

    renderOwnedAndStakedFrogs(address);

    // Now that controller + staking helpers are ready, decorate all existing cards
    ffProcessPendingStakeMeta();
    ffRefreshStakeMetaForAllCards();

    ffShowView('wallet');

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
