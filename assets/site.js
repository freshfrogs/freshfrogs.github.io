// assets/site.js
// FreshFrogs main logic (recent activity, rarity, pond, wallet, staking meta, etc.)

// ------------------------
// Config
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';

const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // optional (used for recent sales + usernames)

// Recent sales source toggle:
//  - 'opensea'  => try OpenSea first, fallback to Alchemy on error
//  - 'alchemy'  => use Alchemy only
const FF_RECENT_SALES_SOURCE = 'opensea';

// OpenSea collection slug
const FF_OPENSEA_COLLECTION_SLUG = 'fresh-frogs';

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE  = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Morph storage Worker (Cloudflare Worker KV)
const FF_MORPH_WORKER_URL = 'https://freshfrogs-morphs.danielssouthworth.workers.dev';

// Activity mode (sales vs mints) for "Collection" panel
let FF_ACTIVITY_MODE = 'sales'; // 'sales' or 'mints'
let FF_RECENT_LIMIT  = 6;

// Toggle to show staking stats on non-wallet cards ff_admin_9f3k2j
const FF_SHOW_STAKING_STATS_ON_CARDS = true;
const FF_MORPH_ADMIN_KEY = "ff_admin_9f3k2j";

let FF_WALLET_RENDER_TOKEN = 0;

// Rarity paging
let FF_RARITY_INDEX = 0;
const FF_RARITY_BATCH = 24;

// Pond paging
let FF_POND_PAGE_KEY = null;
let FF_RARITY_LOADING = false;

// ------------------------
// Global wallet state
// ------------------------
const FF_WALLET_STORAGE_KEY = 'ffLastConnectedWallet';
let ffWeb3 = null;
let ffCurrentAccount = null;
let FF_CONNECTED_ADDRESS = null;

// Prevent double-renders in wallet view (fixes duplicate cards)
let FF_WALLET_RENDER_INFLIGHT = false;
let FF_LAST_WALLET_RENDERED_FOR = null;

// Queue of cards that need staking decoration once contracts/helpers are ready
const FF_PENDING_STAKE_CARDS = [];

// Global read-contracts init promise so we don't spam init
let FF_READ_READY_PROMISE = null;

// Cache of last sale prices from recent sales fetch
const FF_SALE_PRICE_CACHE = new Map(); // tokenId -> "0.23 ETH"
const FF_RECENT_SALES_CACHE = new Map(); // tokenId -> { priceText, timestamp, buyer, seller }

// OpenSea username cache
const FF_OS_USERNAME_CACHE = new Map();       // addressLower -> username|null
const FF_OS_USERNAME_INFLIGHT = new Map();    // addressLower -> Promise<string|null>

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffInitNav();
  ffWireHeroButtons();
  ffApplyConnectionVisibility(!!FF_CONNECTED_ADDRESS);

  // Detect public wallet view (404 /address) automatically
  ffDetectPublicWalletFromPath();

  // Kick off read-only contract init ASAP so staking meta works immediately
  ffInitReadContractsOnLoad();

  // Default view derived from current path
  const initialView = ffDetermineInitialViewFromPath();
  ffShowView(initialView);

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
// Public wallet view auto-detect (for /0xabc... paths)
// ------------------------
function ffDetectPublicWalletFromPath() {
  try {
    const raw = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const first = raw.split('/')[0];
    if (/^0x[a-fA-F0-9]{40}$/.test(first)) {
      window.FF_PUBLIC_WALLET_VIEW = true;
      window.FF_PUBLIC_WALLET_ADDRESS = first;
      ffCurrentAccount = first;
    }
  } catch {}
}

function ffDetermineInitialViewFromPath() {
  const path = (window.location.pathname || '/').replace(/\/+$/, '/') || '/';

  if (window.FF_PUBLIC_WALLET_VIEW) return 'wallet';
  if (/^\/rarity(\/|$)/i.test(path)) return 'rarity';
  if (/^\/pond(\/|$)/i.test(path)) return 'pond';
  if (/^\/morph(\/|$)/i.test(path)) return 'morph';

  return 'collection';
}

// ------------------------
// Read-only init on load to fix staking timing
// ------------------------
function ffInitReadContractsOnLoad() {
  if (!FF_READ_READY_PROMISE) {
    FF_READ_READY_PROMISE = ffEnsureReadContracts()
      .then((ok) => {
        if (ok) {
          ffProcessPendingStakeMeta();
          ffRefreshStakeMetaForAllCards();
        }
        return ok;
      })
      .catch((err) => {
        console.warn('ffInitReadContractsOnLoad failed', err);
        return false;
      });
  }
  return FF_READ_READY_PROMISE;
}

// ------------------------
// View / Nav switching
// ------------------------
function ffInitNav() {
  const links = document.querySelectorAll('.nav a[data-view]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const view = link.dataset.view;
      const normalizePath = (path) => {
        if (!path) return '/';
        return path.replace(/\/+$/, '') || '/';
      };

      const currentPath = normalizePath(window.location.pathname || '/');
      const targetPath = normalizePath(link.pathname || link.getAttribute('href'));

      // If the link points to the current page (including folder index pages),
      // keep SPA behavior to swap views without reloading.
      if (currentPath === targetPath) {
        e.preventDefault();
        ffShowView(view);
      }
    });
  });
}

function ffWireHeroButtons() {
  const heroConnectBtn = document.getElementById('hero-connect-wallet-btn');
  const headerConnectBtn = document.getElementById('header-connect-wallet-btn');

  heroConnectBtn?.addEventListener('click', connectWallet);

  headerConnectBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    connectWallet();
  });

  // View Collection removed — nothing to wire.
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
    // Homepage: 6 recent sales, 6 recent stakes, 6 recent morphs
    loadRecentActivity(); // uses FF_RECENT_LIMIT for sales
    ffLoadRecentStakes(); // new stakes section
    ffLoadRecentMorphs(6, 'recent-home-morphs-grid', 'recent-home-morphs-status'); // homepage morphs
  } else if (view === 'rarity') {
    ffEnsureRarityLoaded();
  } else if (view === 'pond') {
    // Pond shows staked frogs + the big recent morphs panel
    ffEnsureRecentMorphsAbovePond();
    ffEnsurePondLoaded();
    ffEnsureRecentMorphsLoaded();
  } else if (view === 'wallet' && ffCurrentAccount) {
    const ownedGrid = document.getElementById('owned-frogs-grid');
    const stakedGrid = document.getElementById('staked-frogs-grid');
    const gridsEmpty =
      (!ownedGrid || !ownedGrid.children.length) &&
      (!stakedGrid || !stakedGrid.children.length);

    if (!FF_WALLET_RENDER_INFLIGHT &&
        (FF_LAST_WALLET_RENDERED_FOR !== ffCurrentAccount || gridsEmpty)) {
      renderOwnedAndStakedFrogs(ffCurrentAccount);
    }
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
          ? (item.erc721TokenId || item.tokenId || (item.nft && item.nft.identifier))
          : (item.tokenId || (item.nft && item.nft.identifier));

      if (!rawTokenId) continue;

      const tokenId = parseTokenId(rawTokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata || item.rawMetadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress = null;
      let headerRight = '';

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to || item.receiver || item.buyerAddress || item.ownerAddress || null;
        headerRight  = formatMintAge(item);
      } else {
        ownerAddress =
          item.buyerAddress ||
          item.to ||
          item.ownerAddress ||
          item.sellerAddress ||
          item.from ||
          null;

        headerRight = item.priceText || formatSalePrice(item);

        if (headerRight && headerRight !== '') {
          FF_SALE_PRICE_CACHE.set(tokenId, headerRight);
          FF_RECENT_SALES_CACHE.set(tokenId, {
            priceText: headerRight,
            timestamp: item.blockTimestamp || item.eventTimestamp || item.created_date || null,
            buyer: item.buyerAddress || null,
            seller: item.sellerAddress || null
          });
        }
      }

      // ✅ No OpenSea / Etherscan buttons anymore
      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight,
        footerHtml: '',
        actionHtml: '' // removed
      });

      container.appendChild(card);

      if (ownerAddress) ffSetOwnerLabel(card, ownerAddress);

      if (card.dataset.imgContainerId) {
        ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

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

async function ffLoadRecentStakes() {
  const container = document.getElementById('recent-stakes');
  const statusEl  = document.getElementById('recent-stakes-status');
  if (!container) return;

  if (statusEl) statusEl.textContent = 'Loading recent stakes...';

  try {
    const items = await fetchRecentStakes(6); // show 6 on homepage

    if (!items.length) {
      if (statusEl) statusEl.textContent = 'No recent stakes found.';
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';
    if (statusEl) statusEl.textContent = '';

    for (const item of items) {
      const rawTokenId =
        item.erc721TokenId ||
        item.tokenId ||
        (item.nft && item.nft.identifier);

      if (!rawTokenId) continue;
      const tokenId = parseTokenId(rawTokenId);
      if (tokenId == null) continue;

      let metadata =
        normalizeMetadata(item.metadata || item.tokenMetadata || item.rawMetadata) ||
        normalizeMetadata(item.nft && (item.nft.metadata || item.nft.rawMetadata));

      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      // Staker = address sending the frog into the controller
      const staker = item.from || item.fromAddress || item.ownerAddress || null;
      const ageText = formatMintAge(item); // reuses age formatter based on blockTimestamp
      const headerRight = ageText ? `Staked · ${ageText}` : 'Staked';

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight,
        footerHtml: '',
        actionHtml: '' // no buttons in this mini list
      });

      container.appendChild(card);

      if (staker) ffSetOwnerLabel(card, staker);

      if (card.dataset.imgContainerId) {
        ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      // Attach staking meta so the bar/level shows up if it’s staked
      ffAttachStakeMetaIfStaked(card, tokenId);
    }
  } catch (err) {
    console.error('ffLoadRecentStakes failed', err);
    if (statusEl) statusEl.textContent = 'Unable to load recent stakes right now.';
  }
}


// Attach staking block to any card (recent, pond, rarity, etc.)
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  if (!FF_SHOW_STAKING_STATS_ON_CARDS) return;
  if (!card) return;

  ffInitReadContractsOnLoad();

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

    // Insert staking block after traits block
    parent.appendChild(wrapper);
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

  document.querySelectorAll('.recent_sale_card').forEach((card) => {
    const tokenId = parseTokenId(card.dataset.tokenId);
    if (tokenId != null) ffAttachStakeMetaIfStaked(card, tokenId);
  });
}

// ------------------------
// Owner label + OpenSea username everywhere
// ------------------------
function ffSetOwnerLabel(card, address) {
  if (!card || !address) return;

  const titleEls = card.querySelectorAll('.sale_card_title');
  const ownerEl = titleEls[0];
  if (!ownerEl) return;

  ownerEl.innerHTML = formatOwnerLink(address, truncateAddress(address));

  ffResolveOpenSeaUsername(address).then((username) => {
    if (!username) return;
    ownerEl.innerHTML = formatOwnerLink(address, username);
  });
}

async function ffResolveOpenSeaUsername(address) {
  if (!address) return null;
  const key = String(address).toLowerCase();

  if (FF_OS_USERNAME_CACHE.has(key)) return FF_OS_USERNAME_CACHE.get(key);
  if (FF_OS_USERNAME_INFLIGHT.has(key)) return FF_OS_USERNAME_INFLIGHT.get(key);

  const p = (async () => {
    try {
      if (!FF_OPENSEA_API_KEY) {
        FF_OS_USERNAME_CACHE.set(key, null);
        return null;
      }

      const url = `https://api.opensea.io/api/v2/accounts/${address}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-API-KEY': FF_OPENSEA_API_KEY }
      });

      if (!res.ok) {
        FF_OS_USERNAME_CACHE.set(key, null);
        return null;
      }

      const data = await res.json();
      const username = data.username || data?.account?.username || null;
      const finalName = username && String(username).trim() ? String(username).trim() : null;

      FF_OS_USERNAME_CACHE.set(key, finalName);
      return finalName;
    } catch {
      FF_OS_USERNAME_CACHE.set(key, null);
      return null;
    } finally {
      FF_OS_USERNAME_INFLIGHT.delete(key);
    }
  })();

  FF_OS_USERNAME_INFLIGHT.set(key, p);
  return p;
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
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
}

function getRarityRank(tokenId) {
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return null;

  let rankRaw;
  if (Array.isArray(map)) {
    rankRaw = buildRarityLookup(map)[tokenId];
  } else if (typeof map === 'object') {
    rankRaw = map[tokenId] ?? map[String(tokenId)] ?? map[`Frog #${tokenId}`];
  }

  const n = Number(rankRaw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildRarityLookup(rankings) {
  if (!Array.isArray(rankings)) return {};
  if (buildRarityLookup._cache?.source === rankings) return buildRarityLookup._cache.lookup;

  const lookup = rankings.reduce((acc, frog) => {
    const frogId = Number(frog?.id);
    const rankingValue = frog?.ranking ?? frog?.rank;
    if (Number.isFinite(frogId) && rankingValue !== undefined) acc[frogId] = rankingValue;
    return acc;
  }, {});

  buildRarityLookup._cache = { source: rankings, lookup };
  return lookup;
}

// ------------------------
// Card rendering (shared for all grids)
// ------------------------
function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml }) {
  const frogName   = `Frog #${tokenId}`;
  const osLink     = `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`;

  const rarityRank = getRarityRank(tokenId);
  const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;

  const rarityText  = rarityTier ? rarityTier.label : 'RARITY UNKNOWN';
  const rarityClass = rarityTier ? `rarity_badge ${rarityTier.className}` : 'rarity_badge rarity_unknown';
  const traitsHtml = buildTraitsHtml(metadata);
  const imgContainerId = `frog-img-${tokenId}-${Math.random().toString(16).slice(2)}`;

  const card = document.createElement('div');
  card.className = 'recent_sale_card';
  card.dataset.tokenId = tokenId;
  card.dataset.imgContainerId = imgContainerId;

  // ✅ Frog name is now the OpenSea link
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
      <strong class="sale_card_title">
        <a class="frog-name-link" href="${osLink}" target="_blank" rel="noopener noreferrer">${frogName}</a>
      </strong>
      <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
      ${footerHtml || ''}
      ${actionHtml || ''}
    </div>

    <!-- ✅ buttons back at the true bottom of the card -->
    ${ffActionButtonsHTML(tokenId)}
  `;

  if (typeof ffBuildLayeredFrogImage === 'function') {
    ffBuildLayeredFrogImage(tokenId, imgContainerId).catch(() => {});
  }

  return card;
}

function createMorphedFrogCard({ metadata, ownerAddress }) {
const frogA = parseTokenId(metadata?.frogA ?? metadata?.tokenA ?? null);
const frogB = parseTokenId(metadata?.frogB ?? metadata?.tokenB ?? null);

const name =
  (frogA != null && frogB != null)
    ? `Frog #${frogA} / #${frogB}`
    : (metadata?.name || "Morphed Frog");


  // normalize traits if needed
  if (!metadata.attributes && Array.isArray(metadata.traits)) {
    metadata.attributes = metadata.traits;
  }

  const traitsHtml = buildTraitsHtml(metadata);
  const imgContainerId = `morph-img-${Math.random().toString(16).slice(2)}`;

  // Parent A background base
  const baseTokenId = parseTokenId(metadata?.frogA ?? metadata?.tokenA ?? null);

  const card = document.createElement("div");
  card.className = "recent_sale_card morphed_frog_card";
  card.dataset.imgContainerId = imgContainerId;
  if (baseTokenId != null) card.dataset.morphBaseTokenId = baseTokenId;

  // Fallback image so it's never blank even if layering is late
  const fallbackImg =
    metadata?.image ||
    metadata?.image_url ||
    "https://freshfrogs.github.io/assets/blackWhite.png";

  card.innerHTML = `
    <strong class="sale_card_title">--</strong>
    <strong class="sale_card_price">Morphed</strong>
    <div style="clear: both;"></div>

    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="${fallbackImg}"
        class="recent_sale_img"
        alt="${ffEscapeHtml(name)}"
        loading="lazy"
      />
    </div>

    <div class="recent_sale_traits">
      <strong class="sale_card_title">
        <span class="frog-name-link">${ffEscapeHtml(name)}</span>
      </strong>
      <strong class="sale_card_price rarity_badge rarity_unknown">MORPH TEST</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
    </div>
  `;

  if (ownerAddress) ffSetOwnerLabel(card, ownerAddress);

  // IMPORTANT: don't build here yet (card not in DOM)
  // We'll build after append in the wallet render.

  return card;
}

async function ffBuildLayeredMorphedImage(metadata, containerId, baseTokenId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const attrs = Array.isArray(metadata?.attributes) ? metadata.attributes : [];

    const baseId = parseTokenId(baseTokenId ?? metadata?.frogA ?? metadata?.tokenA ?? null);
    const baseUrl = baseId != null
      ? `https://freshfrogs.github.io/frog/${baseId}.png`
      : null;

    // clear whatever fallback <img> is there
    container.innerHTML = '';

    // Parent A background (same trick as normal frogs)
    if (baseUrl) {
      container.style.backgroundImage    = `url("${baseUrl}")`;
      container.style.backgroundRepeat   = 'no-repeat';
      container.style.backgroundSize     = '1000%';
      container.style.backgroundPosition = 'bottom right';
      container.style.backgroundColor    = 'transparent';
    }

    // if build_trait is ready, layer it up
    if (typeof build_trait === 'function' && attrs.length) {
      for (const attr of attrs) {
        if (!attr?.trait_type || !attr?.value) continue;
        build_trait(attr.trait_type, attr.value, containerId);
      }
      return;
    }

    // fallback if build_trait missing
    const fallbackImg =
      metadata?.image ||
      metadata?.image_url ||
      (baseUrl || "https://freshfrogs.github.io/assets/blackWhite.png");

    const img = document.createElement('img');
    img.src = fallbackImg;
    img.alt = metadata?.name || "Morphed Frog";
    img.className = 'recent_sale_img';
    img.loading = 'lazy';
    container.appendChild(img);

  } catch (err) {
    console.warn('ffBuildLayeredMorphedImage failed:', err);
  }
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

    for (const attr of attrs) {
      if (!attr?.trait_type || !attr?.value) continue;
      build_trait(attr.trait_type, attr.value, containerId);
    }
  } catch {
    container.innerHTML = `<img src="https://freshfrogs.github.io/frog/${tokenId}.png" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />`;
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTraitsHtml(metadata) {
  const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
  if (!attributes.length) return '<p class="frog-attr-text">Metadata unavailable</p>';

  return attributes.map((attr) => {
    if (!attr?.trait_type) return '';
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

function ffPickAddress(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string' && /^0x[a-fA-F0-9]{40}$/.test(c)) return c;
    if (typeof c === 'object') {
      const addr =
        c.address ||
        c.walletAddress ||
        c.wallet_address ||
        c.user?.address ||
        c.account?.address;
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;
    }
  }
  return null;
}

// ----------------------------------------------------
// OpenSea + EtherScan buttons (same as before)
// ----------------------------------------------------
function ffActionButtonsHTML(tokenId) {
  const osUrl = `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`;
  const esUrl = `https://etherscan.io/token/${FF_COLLECTION_ADDRESS}?a=${tokenId}`;

  const cls = "frog_action_btn"; // <-- EXACT class your Stake/Transfer buttons use

  return `
    <div class="frog-actions">
      <button class="${cls}" type="button"
        onclick="window.open('${osUrl}', '_blank', 'noopener,noreferrer')">
        OpenSea
      </button>
      <button class="${cls}" type="button" style="background: antiquewhite; color: #333;"
        onclick="window.open('${esUrl}', '_blank', 'noopener,noreferrer')">
        EtherScan
      </button>
    </div>
  `;
}


// (optional safety alias in case any old code referenced this)
const ffBuildActionButtonsHTML = ffActionButtonsHTML;


async function fetchRecentSalesOpenSea(limit = 24) {
  const url =
    `https://api.opensea.io/api/v2/events/collection/${FF_OPENSEA_COLLECTION_SLUG}` +
    `?event_type=sale&limit=${limit}`;

  const headers = { 'Accept': 'application/json' };
  if (FF_OPENSEA_API_KEY) headers['X-API-KEY'] = FF_OPENSEA_API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenSea events request failed: ${res.status}`);

  const data = await res.json();
  const events =
    data.asset_events ||
    data.events ||
    data.collection_events ||
    [];

  const simplified = [];

  for (const e of events) {
    const nft = e.nft || e.asset || {};
    const tokenId = parseTokenId(nft.identifier || nft.token_id || e.tokenId);
    if (tokenId == null) continue;

    const buyerAddress = ffPickAddress(
      e.buyer, e.taker, e.to_account, e.toAccount, e.to, e.buyer_address, e.winner_account
    );

    const sellerAddress = ffPickAddress(
      e.seller, e.maker, e.from_account, e.fromAccount, e.from, e.seller_address, e.loser_account
    );

    const paymentToken = e.payment_token || e.payment?.payment_token || {};
    const decimals = paymentToken.decimals != null ? Number(paymentToken.decimals) : 18;
    const symbol = paymentToken.symbol || 'ETH';

    let priceText = '';
    const quantityRaw =
      e.payment?.quantity ||
      e.sale_price?.amount ||
      e.total_price ||
      e.totalPrice ||
      null;

    try {
      if (quantityRaw != null) {
        const q = Number(quantityRaw);
        const amountNum = q / Math.pow(10, decimals);
        if (isFinite(amountNum)) {
          const rounded =
            amountNum >= 1
              ? amountNum.toFixed(3).replace(/\.?0+$/, '')
              : amountNum.toFixed(4).replace(/\.?0+$/, '');
          priceText = `${rounded}Ξ ${symbol}`;
        }
      }
    } catch {}

    simplified.push({
      tokenId,
      buyerAddress,
      sellerAddress,
      priceText,
      eventTimestamp: e.event_timestamp || e.created_date || null,
      metadata: nft.metadata || nft.raw_metadata || null
    });
  }

  return dedupeByTokenId(simplified, (x) => x.tokenId);
}

async function fetchRecentSalesAlchemy(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'desc',
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alchemy NFT sales request failed: ${response.status}`);

  const payload = await response.json();
  let sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];
  sales = dedupeByTokenId(sales, (sale) => sale.tokenId);

  return sales.map((sale) => ({
    ...sale,
    tokenId: parseTokenId(sale.tokenId),
    priceText: formatSalePrice(sale)
  })).filter((x) => x.tokenId != null);
}

async function fetchRecentSales(limit = 24) {
  if (FF_RECENT_SALES_SOURCE === 'opensea') {
    try { return await fetchRecentSalesOpenSea(limit); }
    catch (err) {
      console.warn('[RecentSales] OpenSea failed, falling back to Alchemy:', err);
      return await fetchRecentSalesAlchemy(limit);
    }
  }
  return await fetchRecentSalesAlchemy(limit);
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

  if (!response.ok) throw new Error(`Alchemy transfers request failed: ${response.status}`);

  const payload = await response.json();
  let transfers = payload.result?.transfers || [];
  return dedupeByTokenId(transfers, (t) => t.erc721TokenId || t.tokenId);
}

async function fetchRecentStakes(limit = 24) {
  // Transfers of frogs into the controller address = stakes
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        toAddress: FF_CONTROLLER_ADDRESS,
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
    throw new Error(`Alchemy stake transfers request failed: ${response.status}`);
  }

  const payload = await response.json();
  let transfers = payload.result?.transfers || [];

  // Dedupe by tokenId (newest first)
  return dedupeByTokenId(transfers, (t) => t.erc721TokenId || t.tokenId);
}


async function fetchFrogMetadata(tokenId) {
  try {
    const url = `https://freshfrogs.github.io/frog/json/${tokenId}.json`;
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
    return normalizeMetadata(await response.json()) || {};
  } catch (err) {
    console.error(`Failed metadata for token ${tokenId}`, err);
    return {};
  }
}

// ------------------------
// Formatting helpers
// ------------------------
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatOwnerLink(address, text) {
  const safeAddr = ffEscapeHtml(address);
  const label = ffEscapeHtml(text || truncateAddress(address));
  const osProfile = `https://opensea.io/${safeAddr}`;
  return `<a class="frog-owner-link" href="${osProfile}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}


function formatSalePrice(sale) {
  const fee = sale?.sellerFee || sale?.protocolFee || sale?.royaltyFee || sale?.price || sale?.payment;
  if (!fee?.amount) return sale?.priceText || '';

  const decimals = typeof fee.decimals === 'number' ? fee.decimals : 18;

  let amountNum;
  try { amountNum = Number(fee.amount) / Math.pow(10, decimals); }
  catch { return `${fee.amount} ${fee.symbol || ''}`.trim(); }

  if (!isFinite(amountNum)) return `${fee.amount} ${fee.symbol || ''}`.trim();

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${fee.symbol || 'ETH'}`;
}

function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '';
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '';

  if (diffSeconds < 86400) return '<1d ago';
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function formatMintAge(transfer) {
  const timestamp = transfer?.metadata?.blockTimestamp || transfer?.blockTimestamp || transfer?.eventTimestamp;
  return ffFormatAgeFromTimestamp(timestamp);
}

function normalizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try { const parsed = JSON.parse(metadata); return typeof parsed === 'object' ? parsed : null; }
    catch { return null; }
  }
  return typeof metadata === 'object' ? metadata : null;
}

function hasUsableMetadata(metadata) {
  const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
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
  } else {
    ffRefreshStakeMetaForAllCards();
  }
}

async function ffDecorateRarityOwner(card, tokenId) {
  try {
    const ok = await ffEnsureReadContracts();
    if (!ok) return;

    let owner = null;
    if (typeof stakerAddress === 'function') {
      const staker = await stakerAddress(tokenId);
      if (staker && staker !== ZERO_ADDRESS) owner = staker;
    }
    if (!owner && window.collection?.methods?.ownerOf) {
      owner = await window.collection.methods.ownerOf(tokenId).call();
    }
    if (owner) ffSetOwnerLabel(card, owner);
  } catch (err) {
    console.warn('ffDecorateRarityOwner failed for token', tokenId, err);
  }
}

async function ffLoadMoreRarity() {
  if (FF_RARITY_LOADING) return;   // ✅ prevent duplicate batch appends
  FF_RARITY_LOADING = true;

  try {
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
        actionHtml: ''
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
    const status = document.getElementById('rarity-status');
    if (status) status.textContent = 'Unable to load rarity rankings.';
  } finally {
    FF_RARITY_LOADING = false;  // ✅ always release lock
  }
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
  if (!res.ok) throw new Error(`Alchemy pond request failed: ${res.status}`);

  const data = await res.json();
  const all  = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => nft?.contract?.address?.toLowerCase() === target);
  console.log(frogs)
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

async function ffDecoratePondOwner(card, tokenId) {
  try {
    const ok = await ffEnsureReadContracts();
    if (!ok || typeof stakerAddress !== 'function') return;

    const staker = await stakerAddress(tokenId);
    if (staker && staker !== ZERO_ADDRESS) ffSetOwnerLabel(card, staker);
  } catch (err) {
    console.warn('ffDecoratePondOwner failed', tokenId, err);
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
        actionHtml: '' // removed
      });

      grid.appendChild(card);

      if (card.dataset.imgContainerId) {
        ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      ffAttachStakeMetaIfStaked(card, tokenId);
      ffDecoratePondOwner(card, tokenId);
    }

    FF_POND_PAGE_KEY = pageKey || null;
    if (status) status.textContent = 'All Frogs currently staked by the community.';
  } catch (err) {
    console.error('ffLoadMorePond failed', err);
    if (status) status.textContent = 'Unable to load pond frogs.';
  }
}

// ------------------------
// Recent morphs (pond page) — SINGLE SOURCE OF TRUTH
// ------------------------
async function ffFetchRecentMorphedFrogs(limit = 24) {
  if (!FF_MORPH_WORKER_URL) return [];

  let cursor = null;
  let all = [];

  try {
    while (true) {
      const u = new URL(`${FF_MORPH_WORKER_URL}/allMorphs`);
      u.searchParams.set("limit", "100");
      if (cursor) u.searchParams.set("cursor", cursor);

      const res = await fetch(u.toString(), {
        cache: "no-store",
        headers: {
          // NOTE: you said you're keeping this in client.
          // Put your real key into FF_MORPH_ADMIN_KEY.
          authorization: `Bearer ${FF_MORPH_ADMIN_KEY}`
        }
      });

      if (!res.ok) break;

      const data = await res.json();
      const page = Array.isArray(data?.morphs) ? data.morphs : [];
      all = all.concat(page);

      if (data.list_complete || !data.cursor) break;
      cursor = data.cursor;

      // stop early once we have enough for "recent"
      if (all.length >= limit) break;
    }

    // newest-first if timestamps exist
    all.sort((a, b) => {
      const ta = Number(a?.createdAt || a?.timestamp || 0);
      const tb = Number(b?.createdAt || b?.timestamp || 0);
      return tb - ta;
    });

    // normalize to metadata objects your renderer expects
    return all
      .slice(0, limit)
      .map(m => m?.morphedMeta || m?.metadata || m)
      .filter(meta => meta && typeof meta === "object");

  } catch (err) {
    console.warn("ffFetchRecentMorphedFrogs failed:", err);
    return [];
  }
}

function ffEnsureRecentMorphsLoaded() {
  const grid = document.getElementById('recent-morphs-grid');
  if (!grid) return;

  // prevent double-start while async load is running
  if (grid.dataset.loading === "1") return;

  if (!grid.children.length) {
    // Pond page: larger batch
    ffLoadRecentMorphs(24, 'recent-morphs-grid', 'recent-morphs-status');
  } else {
    const status = document.getElementById('recent-morphs-status');
    if (status) status.textContent = 'Latest morphed frogs from the community.';
  }
}

// Generic loader so we can reuse on homepage (gridId/statusId/limit)
async function ffLoadRecentMorphs(
  limit   = 24,
  gridId  = 'recent-morphs-grid',
  statusId = 'recent-morphs-status'
) {
  const grid = document.getElementById(gridId);
  const status = document.getElementById(statusId);
  if (!grid) return;

  // in-flight lock + reset
  grid.dataset.loading = "1";
  grid.innerHTML = "";

  try {
    let morphs = await ffFetchRecentMorphedFrogs(limit);

    if (!Array.isArray(morphs) || !morphs.length) {
      if (status) status.textContent = 'No morphed frogs have been created yet.';
      return;
    }

    // DEDUPE morphs by a best-guess unique key
    const seen = new Set();
    morphs = morphs.filter((meta) => {
      const id =
        meta.morphId ||
        meta.id ||
        meta.signature ||
        `${meta.createdBy || ''}-${meta.frogA ?? meta.tokenA}-${meta.frogB ?? meta.tokenB}-${meta.createdAt || meta.timestamp || ''}`;

      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (status) status.textContent = 'Latest morphed frogs from the community.';

    for (const meta of morphs) {
      if (!meta.attributes && Array.isArray(meta.traits)) {
        meta.attributes = meta.traits;
      }

      const card = createMorphedFrogCard({
        metadata: meta,
        ownerAddress: meta?.createdBy
      });
      grid.appendChild(card);

      const contId = card.dataset.imgContainerId;
      const baseId = parseTokenId(meta?.frogA ?? meta?.tokenA ?? null);
      ffBuildLayeredMorphedImage(meta, contId, baseId);
    }
  } catch (err) {
    console.warn('ffLoadRecentMorphs failed:', err);
    if (status) status.textContent = 'Unable to load recent morphs right now.';
  } finally {
    grid.dataset.loading = "";
  }
}


function ffEnsureRecentMorphsAbovePond() {
  const grid = document.getElementById('recent-morphs-grid');
  const pondGrid = document.getElementById('pond-grid');
  if (!grid || !pondGrid) return;

  // find the panel/section containing recent morphs
  const morphsPanel =
    document.getElementById('recent-morphs-panel') ||
    document.getElementById('recent-morphs-section') ||
    grid.closest('.panel') ||
    grid.parentElement;

  const pondPanel = pondGrid.closest('.panel') || pondGrid.parentElement;

  if (morphsPanel && pondPanel && pondPanel.parentNode) {
    pondPanel.parentNode.insertBefore(morphsPanel, pondPanel);
  }
}

// ===================================================
// Owned / Staked frogs (wallet view)
// ===================================================
async function ffFetchOwnedFrogs(address) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const seen = new Set();
  const frogs = [];
  for (const nft of all) {
    if (nft?.contract?.address?.toLowerCase() !== target) continue;
    const id = parseTokenId(nft.tokenId || nft.id?.tokenId);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    frogs.push(nft);
  }
  return frogs;
}

// ------------------------
// Morphed frogs (off-chain saved metadata)
// ------------------------
async function ffFetchMorphedFrogs(address) {
  if (!FF_MORPH_WORKER_URL || !address) return [];

  try {
    const url = `${FF_MORPH_WORKER_URL}/morphs?address=${address}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    const morphs = Array.isArray(data?.morphs) ? data.morphs : [];

    // each record should have morphedMeta
    return morphs
      .map((m) => m?.morphedMeta)
      .filter((meta) => meta && typeof meta === "object");
  } catch (err) {
    console.warn("ffFetchMorphedFrogs failed:", err);
    return [];
  }
}



async function ffFetchStakedTokenIds(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') return [];

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf','getStakedTokens','getUserStakedTokens','stakedTokensOf'
  ], [address]);

  if (!stakedRaw) return [];

  const result = [];
  const seen = new Set();
  const addId = (v) => {
    const id = parseTokenId(v?.tokenId ?? v);
    if (id != null && !seen.has(id)) { seen.add(id); result.push(id); }
  };

  if (Array.isArray(stakedRaw)) stakedRaw.forEach(addId);
  else addId(stakedRaw);

  return result;
}

async function renderOwnedAndStakedFrogs(address) {
  const myToken = ++FF_WALLET_RENDER_TOKEN;   // newest render wins
  FF_WALLET_RENDER_INFLIGHT = true;
  FF_LAST_WALLET_RENDERED_FOR = address;

  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const stakedGrid  = document.getElementById('staked-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedStatus= document.getElementById('staked-frogs-status');

  const viewingOwnWallet = ffIsViewingOwnWallet(address);
  const isPublic = window.FF_PUBLIC_WALLET_VIEW && !viewingOwnWallet;

  try {
    const [ownedNfts, stakedIds, morphedMetas] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch(() => []),
      ffFetchMorphedFrogs(address)
    ]);

    // If a newer render started, bail out
    if (myToken !== FF_WALLET_RENDER_TOKEN) return;

    if (ownedGrid) ownedGrid.innerHTML = '';
    if (stakedGrid) stakedGrid.innerHTML = '';

    if (ownedStatus) ownedStatus.textContent = ownedNfts.length ? '' : 'No frogs found in this wallet.';
    if (stakedStatus) stakedStatus.textContent = stakedIds.length ? '' : 'No staked frogs found for this wallet.';

    for (const nft of ownedNfts) {
      if (myToken !== FF_WALLET_RENDER_TOKEN) return;

      const tokenId = parseTokenId(nft.tokenId || nft.id?.tokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      const salePrice = FF_SALE_PRICE_CACHE.get(tokenId) || '';

      const actionHtml = isPublic ? '' : `
        <div class="frog-actions">
          <button class="sale_link_btn" onclick="ffStakeFrog(${tokenId})">Stake</button>
          <button class="sale_link_btn" onclick="ffTransferFrog(${tokenId})">Transfer</button>
        </div>
      `;

      const card = createFrogCard({
        tokenId, metadata,
        headerLeft: '',
        headerRight: salePrice,
        footerHtml: '',
        actionHtml
      });

      ownedGrid?.appendChild(card);
      ffSetOwnerLabel(card, address);
      ffAttachStakeMetaIfStaked(card, tokenId);
    }

    for (const tokenId of stakedIds) {
      if (myToken !== FF_WALLET_RENDER_TOKEN) return;

      const metadata = await fetchFrogMetadata(tokenId);
      const salePrice = FF_SALE_PRICE_CACHE.get(tokenId) || '';

      const actionHtml = isPublic ? '' : `
        <div class="recent_sale_links">
          <button class="sale_link_btn" onclick="ffUnstakeFrog(${tokenId})">Unstake</button>
        </div>
      `;

      const card = createFrogCard({
        tokenId, metadata,
        headerLeft: '',
        headerRight: salePrice,
        footerHtml: '',
        actionHtml
      });

      stakedGrid?.appendChild(card);
      ffSetOwnerLabel(card, address);
      ffDecorateStakedFrogCard(tokenId);
    }

  } catch (err) {
    console.error('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus)  ownedStatus.textContent  = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  } finally {
    if (myToken === FF_WALLET_RENDER_TOKEN) {
      FF_WALLET_RENDER_INFLIGHT = false;
    }
  }
}

// Use stakingValues() to decorate wallet-staked cards
async function ffDecorateStakedFrogCard(tokenId) {
  const ok = await ffEnsureReadContracts();
  if (!ok || typeof stakingValues !== 'function') return;

  try {
    const values = await stakingValues(tokenId);
    if (!values || values.length < 5) return;

    const [stakedDays, stakedLevel, daysToNext, flyzEarned, stakedDate] = values;
    const levelNum = ffRomanToArabic(stakedLevel) ?? stakedLevel;

    const lvlEl  = document.getElementById(`stake-level-${tokenId}`);
    const dateEl = document.getElementById(`stake-date-${tokenId}`);
    const barEl  = document.getElementById(`stake-progress-bar-${tokenId}`);

    if (lvlEl)  lvlEl.textContent  = `Staked Lvl. ${levelNum}`;
    if (dateEl) dateEl.textContent = `Staked: ${stakedDate}`;

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));
    if (barEl) barEl.style.width = `${pct}%`;
  } catch (err) {
    console.warn(`ffDecorateStakedFrogCard failed for token ${tokenId}`, err);
  }
}

// ---- Card actions: Stake / Unstake / Transfer ----
async function ffStakeFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  try {
    if (typeof initiate_stake === 'function') return await initiate_stake(tokenId);
    if (!window.collection || !ffCurrentAccount) return alert('Staking not available.');

    await collection.methods.stake(tokenId).send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Stake failed', err);
    alert('Stake transaction failed.');
  }
}

async function ffUnstakeFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  try {
    if (typeof initiate_withdraw === 'function') return await initiate_withdraw(tokenId);
    if (!window.controller || !ffCurrentAccount) return alert('Unstake not available.');

    await controller.methods.unstake(tokenId).send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Unstake failed', err);
    alert('Unstake transaction failed.');
  }
}

async function ffTransferFrog(tokenId) {
  tokenId = parseTokenId(tokenId);
  if (tokenId == null) return;

  if (!window.collection || !ffCurrentAccount) return alert('Transfer not available.');

  const to = window.prompt('Send this Frog to which address?');
  if (!to) return;

  try {
    await collection.methods.safeTransferFrom(ffCurrentAccount, to, tokenId).send({ from: ffCurrentAccount });
  } catch (err) {
    console.error('Transfer failed', err);
    alert('Transfer transaction failed.');
  }
}

window.ffStakeFrog    = ffStakeFrog;
window.ffUnstakeFrog  = ffUnstakeFrog;
window.ffTransferFrog = ffTransferFrog;

// ===================================================
// Wallet connect + dashboard
// ===================================================
function ffSetText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function ffSetAvatar(id, url) { const el = document.getElementById(id); if (el && url) el.src = url; }

function ffUpdateWalletBasicUI(address) {
  const isPublicViewOnly = window.FF_PUBLIC_WALLET_VIEW && !ffIsViewingOwnWallet(address);

  ffSetText('wallet-status-label', isPublicViewOnly ? 'Viewing' : 'Connected');
  ffSetText('dashboard-wallet', `Wallet: ${truncateAddress(address)}`);

  if (isPublicViewOnly) return;

  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) {
    walletNav.style.display = '';
    walletNav.textContent = truncateAddress(address);
  }
}

function ffAddressesEqual(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function ffIsViewingOwnWallet(address) {
  return ffAddressesEqual(address, FF_CONNECTED_ADDRESS);
}

function ffLinkWalletAddress(address) {
  const walletLink = document.getElementById('wallet-nav-link');
  if (!walletLink) return;

  walletLink.style.display = 'inline-block';
  walletLink.href = `/${address}`;

  // override SPA click to navigate to address URL
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
    if (typeof stakingStats.staked === 'number') ffSetText('stat-staked', stakingStats.staked.toString());
    if (stakingStats.rewardsAvailable != null) ffSetText('stat-rewards-available', stakingStats.rewardsAvailable.toString());
    if (stakingStats.rewardsEarned != null) ffSetText('stat-rewards-earned', stakingStats.rewardsEarned.toString());
  }

  if (profile) {
    if (profile.username) ffSetText('dashboard-username', profile.username);
    if (profile.avatarUrl) ffSetAvatar('dashboard-avatar', profile.avatarUrl);
  }
}

async function ffFetchOwnedFrogCount(address) {
  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();
  return all.filter((nft) => nft?.contract?.address?.toLowerCase() === target).length;
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

async function ffEnsureReadContracts() {
  if (window.controller && typeof stakingValues === 'function' && typeof stakerAddress === 'function') return true;

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
}

async function ffFetchStakingStats(address) {
  const ok = await ffEnsureReadContracts();
  if (!ok) return null;

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf','getStakedTokens','getUserStakedTokens','stakedTokensOf'
  ], [address]);

  const rewardsAvailableRaw = await ffTryContractCall(contract, [
    'getRewardsAvailable','availableRewards','rewardsAvailable','pendingRewards'
  ], [address]);

  const rewardsEarnedRaw = await ffTryContractCall(contract, [
    'getTotalRewardsEarned','rewardsEarned','claimedRewards'
  ], [address]);

  return {
    staked: Array.isArray(stakedRaw) ? stakedRaw.length : (stakedRaw != null ? Number(stakedRaw) : null),
    rewardsAvailable: rewardsAvailableRaw ?? null,
    rewardsEarned: rewardsEarnedRaw ?? null
  };
}

async function ffFetchOpenSeaProfile(address) {
  if (!FF_OPENSEA_API_KEY) return null;

  const url = `https://api.opensea.io/api/v2/accounts/${address}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'X-API-KEY': FF_OPENSEA_API_KEY }
  });

  if (!res.ok) return null;
  const data = await res.json();

  return {
    username: data.username || data?.account?.username || null,
    avatarUrl: data.profile_image_url || data.profileImageUrl || data?.account?.profile_image_url || null
  };
}

async function connectWallet() {
  if (!window.ethereum) return alert('No Ethereum wallet detected.');

  try {
    const wasPublicWalletRoute = window.FF_PUBLIC_WALLET_VIEW && !!window.FF_PUBLIC_WALLET_ADDRESS;
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.length) return;

    const address = accounts[0];
    ffCurrentAccount = address;
    FF_CONNECTED_ADDRESS = address;

    // ✅ remember that the user connected this session (for silent restore on new pages)
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

    const [ownedCount, stakingStats, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch(() => null),
      ffFetchStakingStats(address).catch(() => null),
      ffFetchOpenSeaProfile(address).catch(() => null)
    ]);

    ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile);
    ffInitReadContractsOnLoad();

    // ✅ update nav visibility (morph hidden until connected, connect btn hidden after)
    ffApplyConnectionVisibility(true);

    const activeNav = document.querySelector('.nav a.active[data-view]');
    const activeView = activeNav?.dataset.view;
    const onWalletView = activeView === 'wallet' || wasPublicWalletRoute;

    if (onWalletView && typeof renderOwnedAndStakedFrogs === 'function') {
      ffShowView('wallet');
      renderOwnedAndStakedFrogs(address);
    }

  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet.');
  }
}

window.connectWallet = connectWallet;

function ffInitWalletOnLoad() {
  // wire any connect buttons that exist on the page
  const btnIds = [
    'connect-wallet-button',
    'hero-connect-wallet-btn',
    'header-connect-wallet-btn'
  ];
  btnIds.forEach((id) => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', connectWallet);
  });

  // default UI = disconnected
  ffSetText('wallet-status-label', 'Disconnected');
  ffSetText('dashboard-wallet', 'Wallet: —');
  ffSetText('dashboard-username', 'Not connected');

  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) walletNav.style.display = 'none';

  ffApplyConnectionVisibility(false);

  // If this is a public wallet route (/0x...), render read-only
  if (window.FF_PUBLIC_WALLET_VIEW && ffCurrentAccount) {
    ffUpdateWalletBasicUI(ffCurrentAccount);
    if (typeof renderOwnedAndStakedFrogs === 'function') {
      renderOwnedAndStakedFrogs(ffCurrentAccount);
    }
  }

  // ✅ silently restore if they already connected earlier THIS session
  ffRestoreWalletSession();
}

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

    // ✅ if we landed on /0x... and it’s OURS, disable public view
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

    // ✅ force wallet cards to re-render with actions if we’re on wallet view
    const activeNav = document.querySelector('.nav a.active[data-view]');
    const activeView = activeNav?.dataset.view || ffDetermineInitialViewFromPath();

    if (activeView === 'wallet' && typeof renderOwnedAndStakedFrogs === 'function') {
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

function ffApplyConnectionVisibility(isConnected) {
  // Morph nav link hidden until connected
  const morphNav =
    document.querySelector('.nav a[data-view="morph"]') ||
    document.querySelector('.nav a[href^="/morph"]');
  if (morphNav) morphNav.style.display = isConnected ? '' : 'none';

  // Wallet address link shown only when connected
  const walletNav = document.getElementById('wallet-nav-link');
  if (walletNav) walletNav.style.display = isConnected ? '' : 'none';

  // Connect button shown only when NOT connected
  const connectBtn =
    document.getElementById('header-connect-wallet-btn') ||
    document.getElementById('nav-connect-wallet-btn') ||
    document.getElementById('hero-connect-wallet-btn');
  if (connectBtn) connectBtn.style.display = isConnected ? 'none' : '';
}


function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();
  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0, prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const val = map[roman[i]] || 0;
    total += val < prev ? -val : val;
    prev = Math.max(prev, val);
  }
  return total || null;
}


/* =========================================================
  FreshFrogs Total Spent (OpenSea-only) — SAFE + RESUMABLE

  Computes (all-time, step-by-step):
    - OpenSea-only sale "total paid" (sum of Seaport consideration currency items)
    - Mint tx value (tx.value) for mints (from ERC721/1155 transfers from ZERO via Alchemy)
    - Gas (optional, default ON): gasUsed * effectiveGasPrice from tx receipts

  IMPORTANT SAFETY GUARANTEES:
    - Hard caps per run: max pages, max receipts, max time
    - No console spam: one summary line per run
    - Resumable via localStorage
    - Abort flag

  Console usage:
    await ffTotalSpentReset() // optional
    await ffTotalSpentStep()  // run one safe chunk
    await ffTotalSpentStep({ includeGas:false }) // faster value-only chunk
    ffTotalSpentAbort()       // stop the next loop checkpoint
    ffTotalSpentStatus()      // show current totals

========================================================= */
(function () {
  // ---- Config / constants
  const LS_KEY = "FF_TOTAL_SPENT_STATE_V2";
  const ZERO = "0x0000000000000000000000000000000000000000";
  const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";

  // Used to filter "OpenSea-only" Seaport fills by fee recipient.
  // If OpenSea changes this in the future, we can update here.
  const OPENSEA_FEE_RECIPIENT = "0x0000a26b00c1f0df003000390027140000faa719";

  // Rolling dedupe size stored in localStorage (prevents rare duplicate txs across pages).
  const SEEN_MAX = 5000;

  // ---- Helpers
  const _lower = (s) => (s ? String(s).toLowerCase() : "");
  const _now = () => Date.now();
  const _sleep0 = () => new Promise((r) => setTimeout(r, 0));

  function _safeBigInt(x) {
    try {
      if (x === null || x === undefined) return 0n;
      if (typeof x === "bigint") return x;
      if (typeof x === "number") return BigInt(Math.trunc(x));
      return BigInt(String(x));
    } catch {
      return 0n;
    }
  }

  function _formatETH(wei, maxDp = 6) {
    const neg = wei < 0n;
    let x = neg ? -wei : wei;
    const base = 10n ** 18n;
    const whole = x / base;
    let frac = (x % base).toString().padStart(18, "0").slice(0, maxDp);
    frac = frac.replace(/0+$/, "");
    const out = frac ? `${whole}.${frac}` : `${whole}`;
    return neg ? `-${out}` : out;
  }

  function _shortErr(e) {
    const msg = (e && (e.message || String(e))) ? (e.message || String(e)) : "Unknown error";
    return msg.length > 300 ? msg.slice(0, 300) + "…" : msg;
  }

  function _loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 2) return null;
      return s;
    } catch {
      return null;
    }
  }

  function _saveState(s) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }

  function _defaultState() {
    return {
      v: 2,
      updatedAt: _now(),

      sales: {
        next: null,
        done: false,
        seen: [], // rolling tx hashes
        valueByTokenWei: {}, // tokenKey -> string(wei)
        gasWei: "0",
        txCount: 0
      },

      mints: {
        pageKey: null,
        done: false,
        seen: [], // rolling tx hashes
        valueWei: "0",
        gasWei: "0",
        txCount: 0
      }
    };
  }

  function _getGlobals(opts) {
    const slug = opts.slug || (typeof FF_OPENSEA_COLLECTION_SLUG !== "undefined" ? FF_OPENSEA_COLLECTION_SLUG : null);
    const osKey = opts.osApiKey || (typeof FF_OPENSEA_API_KEY !== "undefined" ? FF_OPENSEA_API_KEY : null);
    const contract = opts.contract || (typeof FF_COLLECTION_ADDRESS !== "undefined" ? FF_COLLECTION_ADDRESS : null);
    const rpcUrl = opts.rpcUrl || (typeof FF_ALCHEMY_CORE_BASE !== "undefined" ? FF_ALCHEMY_CORE_BASE : null);
    return { slug, osKey, contract, rpcUrl };
  }

  function _seenToSet(arr) {
    return new Set(Array.isArray(arr) ? arr : []);
  }

  function _pushSeen(arr, hash) {
    arr.push(hash);
    if (arr.length > SEEN_MAX) arr.splice(0, arr.length - SEEN_MAX);
  }

  async function _fetchJson(url, headers) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    return res.json();
  }

  async function _osEventsPage({ slug, osKey, eventType, limit, next }) {
    const u = new URL(`${OPENSEA_API_BASE}/events/collection/${encodeURIComponent(slug)}`);
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("event_type", eventType);
    if (next) u.searchParams.set("next", next);

    return _fetchJson(u.toString(), {
      "Accept": "application/json",
      "X-API-KEY": osKey
    });
  }

  function _extractEvents(resp) {
    if (!resp) return [];
    if (Array.isArray(resp.asset_events)) return resp.asset_events;
    if (Array.isArray(resp.events)) return resp.events;
    if (Array.isArray(resp.data)) return resp.data;
    return [];
  }

  function _extractNext(resp) {
    return resp?.next || resp?.next_cursor || resp?.nextCursor || null;
  }

  function _txHashFromEvt(evt) {
    return (
      evt?.transaction?.hash ||
      evt?.payload?.transaction?.hash ||
      evt?.transaction_hash ||
      evt?.tx_hash ||
      evt?.txHash ||
      null
    );
  }

  function _protocolParams(evt) {
    return (
      evt?.protocol_data?.parameters ||
      evt?.payload?.protocol_data?.parameters ||
      evt?.payload?.payload?.protocol_data?.parameters ||
      null
    );
  }

  // Returns:
  //  - isOpenSeaFill: boolean (checks for OpenSea fee recipient inside consideration)
  //  - currencyTotals: Map(tokenKey -> weiBigInt) where tokenKey is "ETH", "WETH", or token address
  function _sumSeaportCurrencyConsideration(params) {
    const cons = params?.consideration;
    if (!Array.isArray(cons)) return { isOpenSeaFill: false, currencyTotals: new Map() };

    let isOpenSeaFill = false;
    const currencyTotals = new Map();

    for (const item of cons) {
      const recipient = _lower(item?.recipient);
      if (recipient === OPENSEA_FEE_RECIPIENT) isOpenSeaFill = true;

      // Seaport currency itemType usually: 0 (ETH), 1 (ERC20)
      const itemType = item?.itemType;
      const isCurrency = itemType === 0 || itemType === 1 || itemType === "0" || itemType === "1";
      if (!isCurrency) continue;

      const tokenAddr = _lower(item?.token || "");
      const isEth = !tokenAddr || tokenAddr === ZERO;
      const tokenKey = isEth ? "ETH" : tokenAddr;

      const amount = item?.endAmount ?? item?.startAmount ?? item?.amount ?? "0";
      const wei = _safeBigInt(amount);
      if (wei <= 0n) continue;

      currencyTotals.set(tokenKey, (currencyTotals.get(tokenKey) || 0n) + wei);
    }

    // Normalize WETH label (optional, still treated as ETH-like)
    const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    if (currencyTotals.has(WETH)) {
      const v = currencyTotals.get(WETH);
      currencyTotals.delete(WETH);
      currencyTotals.set("WETH", (currencyTotals.get("WETH") || 0n) + v);
    }

    return { isOpenSeaFill, currencyTotals };
  }

  async function _rpc(rpcUrl, method, params) {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e9),
      method,
      params
    });

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new Error(`RPC HTTP ${res.status}`);
    if (json.error) throw new Error(json.error.message || "RPC error");
    return json.result;
  }

  async function _getGasWei(rpcUrl, txHash) {
    const rcpt = await _rpc(rpcUrl, "eth_getTransactionReceipt", [txHash]);
    const gasUsed = _safeBigInt(rcpt?.gasUsed || "0x0");
    const effGasPrice = _safeBigInt(rcpt?.effectiveGasPrice || rcpt?.gasPrice || "0x0");
    return gasUsed * effGasPrice;
  }

  async function _getTxValueWei(rpcUrl, txHash) {
    const tx = await _rpc(rpcUrl, "eth_getTransactionByHash", [txHash]);
    return _safeBigInt(tx?.value || "0x0");
  }

  // Lists mint transfers (from ZERO) using Alchemy enhanced RPC method.
  async function _alchemyMintTxHashesPage(rpcUrl, contract, pageKey) {
    const params = {
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress: ZERO,
      contractAddresses: [contract],
      category: ["erc721", "erc1155"],
      withMetadata: false,
      maxCount: "0x3e8"
    };
    if (pageKey) params.pageKey = pageKey;

    const res = await _rpc(rpcUrl, "alchemy_getAssetTransfers", [params]);
    const transfers = res?.transfers || [];
    const hashes = [];
    for (const t of transfers) {
      const h = t?.hash || t?.txHash || t?.transactionHash;
      if (h) hashes.push(h);
    }
    return { hashes, nextPageKey: res?.pageKey || null, count: transfers.length };
  }

  function _statusSummary(s) {
    const salesGas = _safeBigInt(s.sales.gasWei);
    const mintGas = _safeBigInt(s.mints.gasWei);
    const mintVal = _safeBigInt(s.mints.valueWei);

    // ETH-like value: ETH + WETH only (no conversion for other ERC20)
    const salesEth = _safeBigInt(s.sales.valueByTokenWei.ETH || "0") + _safeBigInt(s.sales.valueByTokenWei.WETH || "0");
    const totalEthLike = salesEth + mintVal + salesGas + mintGas;

    const nonEthTokens = Object.keys(s.sales.valueByTokenWei || {}).filter(k => k !== "ETH" && k !== "WETH");
    const note = nonEthTokens.length
      ? `Sales include non-ETH tokens (${nonEthTokens.slice(0, 3).join(", ")}${nonEthTokens.length > 3 ? "…" : ""}); ETH-like total excludes those.`
      : "";

    return {
      salesTx: s.sales.txCount,
      mintTx: s.mints.txCount,
      salesValueEth: _formatETH(salesEth),
      mintValueEth: _formatETH(mintVal),
      salesGasEth: _formatETH(salesGas),
      mintGasEth: _formatETH(mintGas),
      totalEthLike: _formatETH(totalEthLike),
      doneSales: s.sales.done,
      doneMints: s.mints.done,
      note
    };
  }

  // ---- Public API (window.*)

  window.ffTotalSpentAbort = function () {
    window.__FF_TOTAL_SPENT_ABORT = true;
  };

  window.ffTotalSpentReset = async function () {
    localStorage.removeItem(LS_KEY);
    window.__FF_TOTAL_SPENT_ABORT = false;
    return { ok: true };
  };

  window.ffTotalSpentStatus = function () {
    const s = _loadState() || _defaultState();
    return { state: s, summary: _statusSummary(s) };
  };

  // Runs ONE safe chunk. Call repeatedly until doneSales && doneMints.
  window.ffTotalSpentStep = async function ffTotalSpentStep(opts = {}) {
    const {
      // Hard caps (SAFETY)
      maxMs = 8000,               // absolute time budget per run
      maxSalePages = 1,           // OpenSea pages per run
      maxSaleReceipts = 10,       // receipt fetches per run (gas)
      maxMintPages = 1,           // mint listing pages per run (Alchemy)
      maxMintReceipts = 10,       // tx/receipt fetches per run (mint value/gas)

      // Toggles
      includeSales = true,
      includeMints = true,
      includeGas = true,

      // OpenSea sale event type (default item_sold)
      saleEventType = "item_sold",

      // Optional: override global configs
      slug,
      osApiKey,
      contract,
      rpcUrl
    } = opts;

    // Reset abort flag at start of each run
    window.__FF_TOTAL_SPENT_ABORT = false;

    const g = _getGlobals({ slug, osApiKey, contract, rpcUrl });
    if (!g.slug) throw new Error("Missing OpenSea slug");
    if (!g.osKey) throw new Error("Missing OpenSea API key");
    if (!g.contract) throw new Error("Missing contract address");
    if (includeGas || includeMints) {
      if (!g.rpcUrl) throw new Error("Missing rpcUrl (needed for mints and/or gas).");
    }

    let s = _loadState() || _defaultState();
    const started = _now();

    // Local dedupe sets (rolling + run-local)
    const salesSeen = _seenToSet(s.sales.seen);
    const mintsSeen = _seenToSet(s.mints.seen);

    let salePagesDone = 0;
    let saleReceiptsDone = 0;
    let mintPagesDone = 0;
    let mintReceiptsDone = 0;

    try {
      // ----------------- SALES (OpenSea-only)
      if (includeSales && !s.sales.done) {
        while (
          salePagesDone < maxSalePages &&
          (_now() - started) < maxMs &&
          !window.__FF_TOTAL_SPENT_ABORT
        ) {
          const resp = await _osEventsPage({
            slug: g.slug,
            osKey: g.osKey,
            eventType: saleEventType,
            limit: 50,
            next: s.sales.next
          });

          const events = _extractEvents(resp);
          const next = _extractNext(resp);

          // run-local dedupe to avoid bundle duplicates within the same page
          const pageTx = new Set();

          for (const evt of events) {
            if ((_now() - started) >= maxMs) break;
            if (window.__FF_TOTAL_SPENT_ABORT) break;

            const txHash = _txHashFromEvt(evt);
            if (!txHash) continue;
            if (pageTx.has(txHash)) continue;

            // rolling dedupe across runs/pages
            if (salesSeen.has(txHash)) continue;

            const params = _protocolParams(evt);
            const { isOpenSeaFill, currencyTotals } = _sumSeaportCurrencyConsideration(params);
            if (!isOpenSeaFill) continue; // OpenSea-only filter

            // count + sum value
            for (const [tokenKey, wei] of currencyTotals.entries()) {
              const cur = _safeBigInt(s.sales.valueByTokenWei[tokenKey] || "0");
              s.sales.valueByTokenWei[tokenKey] = (cur + wei).toString();
            }

            s.sales.txCount += 1;

            // Optional gas (capped!)
            if (includeGas && saleReceiptsDone < maxSaleReceipts) {
              const gasWei = await _getGasWei(g.rpcUrl, txHash);
              s.sales.gasWei = (_safeBigInt(s.sales.gasWei) + gasWei).toString();
              saleReceiptsDone += 1;
            }

            // mark seen
            pageTx.add(txHash);
            salesSeen.add(txHash);
            _pushSeen(s.sales.seen, txHash);

            // yield to UI occasionally
            if (s.sales.txCount % 5 === 0) await _sleep0();
          }

          s.sales.next = next;
          salePagesDone += 1;

          // If no more pages, mark done
          if (!next || events.length === 0) s.sales.done = true;

          s.updatedAt = _now();
          _saveState(s);

          // If we hit receipt cap, stop sales early (don’t keep scanning without gas)
          if (includeGas && saleReceiptsDone >= maxSaleReceipts) break;
        }
      }

      // ----------------- MINTS (on-chain via Alchemy enhanced RPC)
      if (includeMints && !s.mints.done && (_now() - started) < maxMs && !window.__FF_TOTAL_SPENT_ABORT) {
        while (
          mintPagesDone < maxMintPages &&
          (_now() - started) < maxMs &&
          !window.__FF_TOTAL_SPENT_ABORT
        ) {
          const { hashes, nextPageKey, count } = await _alchemyMintTxHashesPage(g.rpcUrl, g.contract, s.mints.pageKey);

          // If no more data, mark done
          if ((!hashes.length && !nextPageKey) || count === 0) {
            s.mints.done = true;
            break;
          }

          // Dedup tx hashes within this page
          const uniq = [];
          const pageSet = new Set();
          for (const h of hashes) {
            if (pageSet.has(h)) continue;
            pageSet.add(h);
            uniq.push(h);
          }

          for (const txHash of uniq) {
            if ((_now() - started) >= maxMs) break;
            if (window.__FF_TOTAL_SPENT_ABORT) break;
            if (mintsSeen.has(txHash)) continue;

            // Mint "value" = tx.value (ETH paid to mint contract)
            // Gas optional (capped)
            const valueWei = await _getTxValueWei(g.rpcUrl, txHash);
            s.mints.valueWei = (_safeBigInt(s.mints.valueWei) + valueWei).toString();

            if (includeGas && mintReceiptsDone < maxMintReceipts) {
              const gasWei = await _getGasWei(g.rpcUrl, txHash);
              s.mints.gasWei = (_safeBigInt(s.mints.gasWei) + gasWei).toString();
              mintReceiptsDone += 1;
            }

            s.mints.txCount += 1;

            // mark seen
            mintsSeen.add(txHash);
            _pushSeen(s.mints.seen, txHash);

            if (s.mints.txCount % 5 === 0) await _sleep0();

            // If we hit receipt cap, stop mint processing early
            if (includeGas && mintReceiptsDone >= maxMintReceipts) break;
          }

          s.mints.pageKey = nextPageKey;
          mintPagesDone += 1;

          if (!nextPageKey) s.mints.done = true;

          s.updatedAt = _now();
          _saveState(s);

          if (includeGas && mintReceiptsDone >= maxMintReceipts) break;
        }
      }

      const summary = _statusSummary(s);

      // ONE single console line per run (max)
      console.info(
        `[FF TotalSpent] SalesTx=${summary.salesTx} MintTx=${summary.mintTx} ` +
        `Sales(ETH+WETH)=${summary.salesValueEth} MintValue=${summary.mintValueEth} ` +
        `Gas(Sales+Mint)=${_formatETH(_safeBigInt(s.sales.gasWei) + _safeBigInt(s.mints.gasWei))} ` +
        `TOTAL(ETH-like)=${summary.totalEthLike} ` +
        `DoneSales=${summary.doneSales} DoneMints=${summary.doneMints}` +
        (summary.note ? ` | NOTE: ${summary.note}` : "")
      );

      return {
        ok: true,
        ran: {
          salePagesDone,
          saleReceiptsDone,
          mintPagesDone,
          mintReceiptsDone,
          ms: _now() - started
        },
        summary,
        state: s
      };
    } catch (e) {
      // Short error only (never dump giant payloads)
      const msg = _shortErr(e);
      console.error(`[FF TotalSpent] ERROR: ${msg}`);
      return { ok: false, error: msg, state: s };
    } finally {
      // Persist state even on error
      s.updatedAt = _now();
      _saveState(s);
    }
  };
})();
