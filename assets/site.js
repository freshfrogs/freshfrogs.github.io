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
const FF_SALES_SOURCE = 'opensea'; // <--- switch to "alchemy" anytime

// 🔧 OpenSea collection slug (ONLY for recent sales)
const FF_OPENSEA_COLLECTION_SLUG = 'fresh-frogs'; // update if needed

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
  ffShowView('collection'); // calls loadRecentActivity()

  ffInitWalletOnLoad();

  // 🔥 IMPORTANT FIX:
  // Initialize read-only contracts ASAP so recent sales/rarity/pond
  // can show staking + owner decorations without wallet connect.
  ffEnsureReadContracts()
    .then((ok) => {
      if (!ok) return;
      ffProcessPendingStakeMeta();
      ffRefreshStakeMetaForAllCards();
    })
    .catch(() => { /* ignore */ });

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
        : `Loading recent sales (${FF_SALES_SOURCE})...`;
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
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(
        item.metadata ||
        item.tokenMetadata ||
        (item.rawMetadata || (item.nft && item.nft.metadata))
      );
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress = null;
      let headerRight  = '';

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to || item.ownerAddress || null;
        headerRight  = formatMintAge(item);
      } else {
        // Prefer buyer/new owner; fallback to seller
        ownerAddress =
          item.buyerAddress ||
          (item.buyer && item.buyer.address) ||
          item.ownerAddress ||
          item.to ||
          item.sellerAddress ||
          (item.seller && item.seller.address) ||
          null;

        headerRight = formatSalePrice(item);

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

      ffAttachStakeMetaIfStaked(card, tokenId);
    }

    // If staking was queued before contracts were ready, flush now.
    ffProcessPendingStakeMeta();

  } catch (err) {
    console.error('Unable to load recent activity', err);
    const status = FF_ACTIVITY_MODE === 'mints'
      ? 'Unable to load recent mints right now.'
      : 'Unable to load recent sales right now.';
    if (statusEl) statusEl.textContent = status;
  }
}

// Attach staking block to any card
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  if (!FF_SHOW_STAKING_STATS_ON_CARDS) return;
  if (!card) return;

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
    if (!staker || staker === ZERO_ADDRESS) return;

    const values = await stakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    const propsBlock =
      card.querySelector('.recent_sale_properties') ||
      card.querySelector('.recent_sale_traits') ||
      card;

    const parent = propsBlock.parentElement || card;

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

    const firstAction = parent.querySelector('.recent_sale_links');
    if (firstAction) parent.insertBefore(wrapper, firstAction);
    else parent.appendChild(wrapper);

  } catch (err) {
    console.warn('ffAttachStakeMetaIfStaked failed for token', tokenId, err);
  }
}

function ffProcessPendingStakeMeta() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) return;

  const pending = FF_PENDING_STAKE_CARDS.splice(0, FF_PENDING_STAKE_CARDS.length);
  for (const { card, tokenId } of pending) {
    ffAttachStakeMetaIfStaked(card, tokenId);
  }
}

function ffRefreshStakeMetaForAllCards() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) return;

  const cards = document.querySelectorAll('.recent_sale_card');
  cards.forEach((card) => {
    const tokenId = parseTokenId(card.dataset.tokenId);
    if (tokenId != null) ffAttachStakeMetaIfStaked(card, tokenId);
  });
}

// ------------------------
// Token / rarity helpers
// ------------------------
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
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return null;

  let rankRaw;
  if (Array.isArray(map)) {
    const lookup = buildRarityLookup(map);
    rankRaw = lookup[tokenId];
  } else if (typeof map === 'object') {
    rankRaw = map[tokenId] ?? map[String(tokenId)] ?? map[`Frog #${tokenId}`];
  }

  if (rankRaw === undefined || rankRaw === null || rankRaw === '') return null;
  const n = Number(rankRaw);
  return Number.isFinite(n) && n > 0 ? n : null;
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
// Card rendering (shared)
// ------------------------
function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml }) {
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
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch(() => {});
  }

  return card;
}

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
  } catch {
    container.innerHTML = `<img src="https://freshfrogs.github.io/frog/${tokenId}.png" class="recent_sale_img" loading="lazy" />`;
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

  if (!attributes.length) return '<p class="frog-attr-text">Metadata unavailable</p>';

  return attributes.map((attr) => {
    if (!attr || !attr.trait_type) return '';
    const type  = String(attr.trait_type);
    const value = attr.value != null ? String(attr.value) : '';
    return `
      <p class="frog-attr-text"
         data-trait-type="${ffEscapeHtml(type)}"
         data-trait-value="${ffEscapeHtml(value)}">
        ${ffEscapeHtml(type)}: ${ffEscapeHtml(value)}
      </p>`;
  }).filter(Boolean).join('');
}

// ------------------------
// Activity fetchers / dedupe
// ------------------------
function dedupeByTokenId(items, idExtractor) {
  const seen = new Set();
  const out  = [];
  for (const item of items) {
    const tokenId = parseTokenId(idExtractor(item));
    if (tokenId == null || seen.has(tokenId)) continue;
    seen.add(tokenId);
    out.push(item);
  }
  return out;
}

async function fetchRecentSales(limit = 24) {
  if (FF_SALES_SOURCE === 'opensea' && FF_OPENSEA_API_KEY) {
    try {
      return await fetchRecentSalesFromOpenSea(limit);
    } catch (err) {
      console.warn('[FreshFrogs] OpenSea sales failed; falling back to Alchemy:', err);
      return await fetchRecentSalesFromAlchemy(limit);
    }
  }
  return await fetchRecentSalesFromAlchemy(limit);
}

async function fetchRecentSalesFromAlchemy(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'desc',
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alchemy sales failed: ${response.status}`);

  const payload = await response.json();
  let sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];

  sales.forEach((s) => {
    const fee = s.sellerFee || s.protocolFee || s.royaltyFee || s.price || null;
    if (fee && fee.amount) {
      s.price = {
        amount: fee.amount,
        decimals: typeof fee.decimals === 'number' ? fee.decimals : 18,
        symbol: fee.symbol || 'ETH'
      };
    }
  });

  return dedupeByTokenId(sales, (sale) => sale.tokenId).slice(0, limit);
}

async function fetchRecentSalesFromOpenSea(limit = 24) {
  const perPage = Math.min(limit, 50);
  const url = `https://api.opensea.io/api/v2/events/collection/${FF_OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=${perPage}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': FF_OPENSEA_API_KEY
    }
  });
  if (!res.ok) throw new Error(`OpenSea events failed: ${res.status}`);

  const data = await res.json();
  const rawEvents =
    Array.isArray(data.asset_events) ? data.asset_events :
    Array.isArray(data.events)       ? data.events :
    Array.isArray(data)             ? data :
    [];

  const mapped = rawEvents.map((evt) => {
    const payload = evt.payload || evt;
    const item    = payload.item || payload.asset || {};
    const nft     = payload.nft || evt.nft || {};

    // tokenId
    let tokenId =
      nft.identifier ||
      item.token_id ||
      payload.token_id ||
      null;

    if (!tokenId && item.nft_id) {
      const parts = String(item.nft_id).split('/');
      tokenId = parts[parts.length - 1];
    }

    // buyer / seller
    const buyerAddress =
      (payload.buyer && payload.buyer.address) ||
      (payload.taker && payload.taker.address) ||
      (payload.winner_account && payload.winner_account.address) ||
      (payload.to_account && payload.to_account.address) ||
      null;

    const sellerAddress =
      (payload.seller && payload.seller.address) ||
      (payload.maker && payload.maker.address) ||
      (payload.from_account && payload.from_account.address) ||
      null;

    // price
    const payment = payload.payment_token || payload.paymentToken || evt.payment_token || {};
    const amountRaw =
      payload.sale_price ||
      payload.total_price ||
      payload.price ||
      (payload.payment && payload.payment.quantity) ||
      null;

    let price = null;
    if (amountRaw != null) {
      const amtStr = String(amountRaw);
      if (amtStr.includes('.')) {
        // already ETH decimal
        price = { amountEth: Number(amtStr), symbol: payment.symbol || 'ETH' };
      } else {
        // assume wei-style
        price = {
          amount: amtStr,
          decimals: typeof payment.decimals === 'number' ? payment.decimals : 18,
          symbol: payment.symbol || 'ETH'
        };
      }
    }

    const metadata = item.metadata || nft.metadata || payload.metadata || {};
    const timestamp = payload.event_timestamp || evt.event_timestamp || payload.closing_date || null;

    return {
      ...evt,
      tokenId,
      buyerAddress,
      sellerAddress,
      ownerAddress: buyerAddress || null,
      price,
      metadata,
      timestamp
    };
  });

  return dedupeByTokenId(mapped, (s) => s.tokenId).slice(0, limit);
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

  if (!response.ok) throw new Error(`Alchemy mints failed: ${response.status}`);

  const payload = await response.json();
  let transfers = payload.result && Array.isArray(payload.result.transfers)
    ? payload.result.transfers
    : [];

  return dedupeByTokenId(transfers, (t) => t.erc721TokenId || t.tokenId).slice(0, limit);
}

async function fetchFrogMetadata(tokenId) {
  try {
    const url      = `https://freshfrogs.github.io/frog/json/${tokenId}.json`;
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Metadata failed: ${response.status}`);
    return normalizeMetadata(await response.json()) || {};
  } catch {
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

  let price = sale.price;

  if (!price) {
    const fee = sale.sellerFee || sale.protocolFee || sale.royaltyFee || sale.price || null;
    if (fee && fee.amount) {
      price = {
        amount: fee.amount,
        decimals: typeof fee.decimals === 'number' ? fee.decimals : 18,
        symbol: fee.symbol || 'ETH'
      };
    }
  }

  if (!price) return '--';

  // ETH-decimal case (OpenSea)
  if (price.amountEth != null) {
    const n = Number(price.amountEth);
    if (!isFinite(n)) return '--';
    const rounded = n >= 1 ? n.toFixed(3).replace(/\.?0+$/, '') : n.toFixed(4).replace(/\.?0+$/, '');
    return `${rounded} ${price.symbol || 'ETH'}`;
  }

  const decimals = typeof price.decimals === 'number' ? price.decimals : 18;
  let amountNum;
  try {
    amountNum = Number(price.amount) / Math.pow(10, decimals);
  } catch {
    return `${price.amount} ${price.symbol || ''}`.trim();
  }

  if (!isFinite(amountNum)) return '--';

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${price.symbol || 'ETH'}`;
}

function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '--';
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '--';

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '--';

  if (diffSeconds < 86400) return '<1d ago';
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function formatMintAge(transfer) {
  const timestamp =
    (transfer.metadata && transfer.metadata.blockTimestamp) ||
    transfer.blockTimestamp ||
    transfer.timestamp;
  return ffFormatAgeFromTimestamp(timestamp);
}

function normalizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try { return JSON.parse(metadata); } catch { return null; }
  }
  return typeof metadata === 'object' ? metadata : null;
}

function hasUsableMetadata(metadata) {
  const attrs = Array.isArray(metadata && metadata.attributes) ? metadata.attributes : [];
  return attrs.length > 0;
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
      const tokenId = parseTokenId(entry.id ?? entry.tokenId ?? entry.frogId);
      if (tokenId == null) continue;

      const rank = entry.ranking ?? entry.rank ?? entry.position ?? getRarityRank(tokenId);
      const metadata = await fetchFrogMetadata(tokenId);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight: rank ? `Rank #${rank}` : '',
        footerHtml: '',
        actionHtml: `
          <div class="recent_sale_links">
            <a class="sale_link_btn opensea"
               href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
               target="_blank" rel="noopener noreferrer">OpenSea</a>
            <a class="sale_link_btn etherscan"
               href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
               target="_blank" rel="noopener noreferrer">Etherscan</a>
          </div>`
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
  } catch {
    if (status) status.textContent = 'Unable to load rarity rankings.';
  }
}

async function ffDecorateRarityOwner(card, tokenId) {
  try {
    const ok = await ffEnsureReadContracts();
    if (!ok || !window.collection) return;

    let stakerAddr = null;
    if (typeof stakerAddress === 'function' && window.controller) {
      stakerAddr = await stakerAddress(tokenId);
      if (stakerAddr && stakerAddr === ZERO_ADDRESS) stakerAddr = null;
    }

    let ownerAddr = stakerAddr;
    if (!ownerAddr && window.collection.methods?.ownerOf) {
      ownerAddr = await window.collection.methods.ownerOf(tokenId).call();
    }
    if (!ownerAddr) return;

    const titles = card.querySelectorAll('.sale_card_title');
    if (titles[0]) titles[0].innerHTML = ffOwnerLinkHtml(ownerAddr);
  } catch {}
}

// ===================================================
// Pond panel
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
  if (!res.ok) throw new Error(`Alchemy pond failed: ${res.status}`);

  const data = await res.json();
  const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  return {
    frogs: all.filter((nft) => nft.contract?.address?.toLowerCase() === target),
    pageKey: data.pageKey || null
  };
}

function ffEnsurePondLoaded() {
  const grid = document.getElementById('pond-grid');
  if (!grid) return;
  if (!grid.children.length) {
    FF_POND_PAGE_KEY = null;
    ffLoadMorePond();
  }
}

async function ffDecoratePondOwner(card, tokenId) {
  try {
    const ok = await ffEnsureReadContracts();
    if (!ok || typeof stakerAddress !== 'function') return;

    const staker = await stakerAddress(tokenId);
    if (!staker || staker === ZERO_ADDRESS) return;

    const titles = card.querySelectorAll('.sale_card_title');
    if (titles[0]) titles[0].innerHTML = ffOwnerLinkHtml(staker);
  } catch {}
}

async function ffLoadMorePond() {
  const grid = document.getElementById('pond-grid');
  const status = document.getElementById('pond-status');
  if (!grid) return;

  try {
    const { frogs, pageKey } = await ffFetchPondFrogs(24, FF_POND_PAGE_KEY);

    for (const nft of frogs) {
      const tokenId = parseTokenId(nft.tokenId || nft.id?.tokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight: 'Staked',
        footerHtml: '',
        actionHtml: `
          <div class="recent_sale_links">
            <a class="sale_link_btn opensea"
               href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
               target="_blank" rel="noopener noreferrer">OpenSea</a>
            <a class="sale_link_btn etherscan"
               href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
               target="_blank" rel="noopener noreferrer">Etherscan</a>
          </div>`
      });

      grid.appendChild(card);
      ffAttachStakeMetaIfStaked(card, tokenId);
      ffDecoratePondOwner(card, tokenId);
    }

    FF_POND_PAGE_KEY = pageKey || null;
    if (status) status.textContent = 'All Frogs currently staked by the community.';
  } catch (err) {
    if (status) status.textContent = 'Unable to load pond frogs.';
    console.error(err);
  }
}

// ===================================================
// Owned / Staked frogs (wallet & 404)
// ===================================================
async function ffFetchOwnedFrogs(address) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();
  return all.filter((nft) => nft.contract?.address?.toLowerCase() === target);
}

async function ffTryContractCall(contract, names, args = []) {
  if (!contract?.methods) return null;
  for (const name of names) {
    if (contract.methods[name]) {
      try { return await contract.methods[name](...args).call(); }
      catch (err) { console.warn(`Call to ${name} failed:`, err); }
    }
  }
  return null;
}

async function ffFetchStakedTokenIds(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') return [];
  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const raw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

  if (!raw) return [];

  const ids = [];
  const pushId = (v) => {
    const id = parseTokenId(v);
    if (id != null) ids.push(id);
  };

  if (Array.isArray(raw)) {
    for (let v of raw) {
      if (v && typeof v === 'object' && 'tokenId' in v) v = v.tokenId;
      pushId(v);
    }
  } else {
    pushId(raw);
  }

  return Array.from(new Set(ids));
}

async function renderOwnedAndStakedFrogs(address) {
  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedGrid  = document.getElementById('staked-frogs-grid');
  const stakedStatus = document.getElementById('staked-frogs-status');
  const readOnlyViewer = ffIsWalletViewer();

  try {
    const [ownedNfts, stakedIds] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch(() => [])
    ]);

    if (ownedGrid) ownedGrid.innerHTML = '';
    if (stakedGrid) stakedGrid.innerHTML = '';

    if (ownedStatus) ownedStatus.textContent = ownedNfts.length ? '' : 'No frogs found in this wallet.';
    if (stakedStatus) stakedStatus.textContent = stakedIds.length ? '' : 'No staked frogs found for this wallet.';

    for (const nft of ownedNfts) {
      const tokenId = parseTokenId(nft.tokenId || nft.id?.tokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      const headerRight = ffGetCachedSalePrice(tokenId) || 'Owned';
      const headerLeft  = ffOwnerLinkHtml(address);

      const actionHtml = readOnlyViewer ? `
        <div class="recent_sale_links">
          <a class="sale_link_btn opensea"
             href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">OpenSea</a>
          <a class="sale_link_btn etherscan"
             href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">Etherscan</a>
        </div>`
        : `
        <div class="recent_sale_links">
          <button class="sale_link_btn" onclick="ffStakeFrog(${tokenId})">Stake</button>
          <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
        </div>
        <div class="recent_sale_links">
          <a class="sale_link_btn opensea"
             href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">OpenSea</a>
          <a class="sale_link_btn etherscan"
             href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">Etherscan</a>
        </div>`;

      ownedGrid?.appendChild(createFrogCard({
        tokenId, metadata, headerLeft, headerRight, footerHtml: '', actionHtml
      }));
    }

    for (const tokenId of stakedIds) {
      let metadata = await fetchFrogMetadata(tokenId);

      const headerRight = ffGetCachedSalePrice(tokenId) || 'Staked';
      const headerLeft  = ffOwnerLinkHtml(address);

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
        </div>`;

      const actionHtml = readOnlyViewer ? `
        <div class="recent_sale_links">
          <a class="sale_link_btn opensea"
             href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">OpenSea</a>
          <a class="sale_link_btn etherscan"
             href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">Etherscan</a>
        </div>`
        : `
        <div class="recent_sale_links">
          <button class="sale_link_btn" onclick="ffUnstakeFrog(${tokenId})">Unstake</button>
        </div>
        <div class="recent_sale_links">
          <a class="sale_link_btn opensea"
             href="https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">OpenSea</a>
          <a class="sale_link_btn etherscan"
             href="https://etherscan.io/nft/${FF_COLLECTION_ADDRESS}/${tokenId}"
             target="_blank" rel="noopener noreferrer">Etherscan</a>
        </div>`;

      stakedGrid?.appendChild(createFrogCard({
        tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml
      }));

      ffDecorateStakedFrogCard(tokenId);
    }
  } catch (err) {
    console.error(err);
    if (ownedStatus) ownedStatus.textContent = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  }
}

async function ffDecorateStakedFrogCard(tokenId) {
  const ok = await ffEnsureReadContracts();
  if (!ok || typeof stakingValues !== 'function') return;

  try {
    const values = await stakingValues(tokenId);
    if (!values || values.length < 5) return;

    const [stakedDays, stakedLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(stakedLevel) ?? stakedLevel;

    document.getElementById(`stake-level-${tokenId}`)?.textContent = `Staked Lvl. ${levelNum}`;
    document.getElementById(`stake-date-${tokenId}`)?.textContent  = `Staked: ${stakedDate}`;

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    const barEl = document.getElementById(`stake-progress-bar-${tokenId}`);
    if (barEl) barEl.style.width = `${pct}%`;
  } catch {}
}

// ---- Card actions ----
async function ffStakeFrog(tokenId) { /* unchanged from your version */ }
async function ffUnstakeFrog(tokenId) { /* unchanged from your version */ }
async function ffTransferFrog(tokenId) { /* unchanged from your version */ }

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
  if (el && url) el.src = url;
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

async function ffFetchOwnedFrogCount(address) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();
  return all.filter((nft) => nft.contract?.address?.toLowerCase() === target).length;
}

async function ffFetchStakingStats(address) { /* unchanged from your version */ }
async function ffFetchOpenSeaProfile(address) { /* unchanged from your version */ }

async function connectWallet() {
  if (!window.ethereum) {
    alert('No Ethereum wallet detected. Please install MetaMask.');
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) return;

    const address = accounts[0];
    ffCurrentAccount = address;
    if (!ffWeb3) ffWeb3 = new Web3(window.ethereum);
    window.web3 = ffWeb3;

    if (typeof COLLECTION_ABI !== 'undefined') {
      window.collection = new ffWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
    }
    if (typeof CONTROLLER_ABI !== 'undefined') {
      window.controller = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }

    ffUpdateWalletBasicUI(address);

    const [ownedCount, stakingStats, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch(() => null),
      ffFetchStakingStats(address).catch(() => null),
      ffFetchOpenSeaProfile(address).catch(() => null)
    ]);

    if (typeof ownedCount === 'number') ffSetText('stat-owned', ownedCount.toString());
    if (stakingStats?.staked != null) ffSetText('stat-staked', String(stakingStats.staked));
    if (stakingStats?.rewardsAvailable != null) ffSetText('stat-rewards-available', String(stakingStats.rewardsAvailable));
    if (stakingStats?.rewardsEarned != null) ffSetText('stat-rewards-earned', String(stakingStats.rewardsEarned));
    if (profile?.username) ffSetText('dashboard-username', profile.username);
    if (profile?.avatarUrl) ffSetAvatar('dashboard-avatar', profile.avatarUrl);

    renderOwnedAndStakedFrogs(address);

    ffProcessPendingStakeMeta();
    ffRefreshStakeMetaForAllCards();

    ffShowView('wallet');
  } catch (err) {
    console.error(err);
    alert('Failed to connect wallet.');
  }
}

window.connectWallet = connectWallet;

function ffInitWalletOnLoad() {
  const btn = document.getElementById('connect-wallet-button');
  if (btn) btn.addEventListener('click', connectWallet);

  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');
}

function ffEnsureReadContracts() {
  // If controller already exists and staking helpers are present, we're good
  if (window.controller && typeof stakingValues === 'function' && typeof stakerAddress === 'function') {
    return Promise.resolve(true);
  }

  return (async () => {
    try {
      if (!ffWeb3) {
        if (window.ethereum) ffWeb3 = new Web3(window.ethereum);
        else ffWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
        window.web3 = ffWeb3;
      }

      if (!window.collection && typeof COLLECTION_ABI !== 'undefined') {
        window.collection = new ffWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
      }
      if (!window.controller && typeof CONTROLLER_ABI !== 'undefined') {
        window.controller = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
      }

      return !!window.controller;
    } catch (err) {
      console.warn('ffEnsureReadContracts failed:', err);
      return false;
    }
  })();
}

function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();
  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0, prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const val = map[roman[i]] || 0;
    if (val < prev) total -= val;
    else { total += val; prev = val; }
  }
  return total || null;
}
