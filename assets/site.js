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


// Ensure read-only Web3 + contracts exist so staking helpers (stakingValues, stakerAddress)
// can be used even before the user connects their wallet.
function ffEnsureReadOnlyContracts() {
  try {
    if (typeof Web3 === 'undefined') return;
    if (typeof CONTROLLER_ABI === 'undefined' || typeof COLLECTION_ABI === 'undefined') return;

    // Reuse existing web3 instance if ethereum-dapp.js already set it up
    if (!window.web3) {
      let provider = null;
      if (window.ethereum) {
        provider = window.ethereum;
      } else {
        try {
          provider = new Web3.providers.HttpProvider(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
        } catch (e) {
          console.warn('Unable to create HttpProvider for read-only Web3', e);
        }
      }
      if (!provider) return;
      window.web3 = new Web3(provider);
    }

    // Mirror into ffWeb3 if not set yet
    if (!ffWeb3 && window.web3) {
      ffWeb3 = window.web3;
    }

    // Ensure collection/controller contracts exist (read-only)
    if (window.web3 && !window.collection && typeof COLLECTION_ABI !== 'undefined') {
      window.collection = new window.web3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
    }
    if (window.web3 && !window.controller && typeof CONTROLLER_ABI !== 'undefined') {
      window.controller = new window.web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }
  } catch (err) {
    console.warn('ffEnsureReadOnlyContracts failed:', err);
  }
}

// 50 at a time for all grids with Load More
let FF_RECENT_LIMIT = 50; // sales / mints
let FF_RARITY_LIMIT = 50; // rarity rankings
let FF_POND_LIMIT   = 50; // pond (all staked frogs)

// current top-level view: 'sales' | 'collection' | 'rarity' | 'wallet' | 'pond'
let ffCurrentView = 'sales';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  ffEnsureReadOnlyContracts(); // make sure read-only contracts are ready for staking stats
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

  const loadMorePondBtn = document.getElementById('load-more-pond');
  if (loadMorePondBtn) {
    loadMorePondBtn.addEventListener('click', () => {
      FF_POND_LIMIT += 50;
      ffLoadPondGrid();
    });
  }
});

// ------------------------
// View switching (nav + hero buttons)
// ------------------------
function ffInitNavViews() {
  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      const view = link.getAttribute('data-view');
      if (!view) return;
      ffSetView(view);
    });
  });
}

function ffInitHeroActions() {
  const viewCollectionBtn = document.getElementById('hero-view-collection-btn');
  if (viewCollectionBtn) {
    viewCollectionBtn.addEventListener('click', () => ffSetView('collection'));
  }

  const heroConnectBtn = document.getElementById('hero-connect-wallet-btn');
  if (heroConnectBtn) {
    heroConnectBtn.addEventListener('click', connectWallet);
  }
}

// Set which view is currently active
function ffSetView(view) {
  ffCurrentView = view;

  // Panels
  const recentPanel  = document.getElementById('recent-activity-panel');
  const rarityPanel  = document.getElementById('rarity-panel');
  const pondPanel    = document.getElementById('pond-panel');
  const ownedPanel   = document.getElementById('owned-panel');
  const stakedPanel  = document.getElementById('staked-panel');

  if (recentPanel) recentPanel.style.display = (view === 'sales' || view === 'collection') ? '' : 'none';
  if (rarityPanel) rarityPanel.style.display = (view === 'rarity') ? '' : 'none';
  if (pondPanel)   pondPanel.style.display   = (view === 'pond') ? '' : 'none';
  if (ownedPanel)  ownedPanel.style.display  = (view === 'wallet') ? '' : 'none';
  if (stakedPanel) stakedPanel.style.display = (view === 'wallet') ? '' : 'none';

  // Header nav active state
  const navLinks = document.querySelectorAll('.nav a[data-view]');
  navLinks.forEach((link) => {
    const v = link.getAttribute('data-view');
    if (v === view) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Hero button text update (optional)
  const heroViewCollectionBtn = document.getElementById('hero-view-collection-btn');
  if (heroViewCollectionBtn) {
    if (view === 'collection') {
      heroViewCollectionBtn.textContent = 'View Sales';
    } else {
      heroViewCollectionBtn.textContent = 'View Collection';
    }
  }

  // Trigger appropriate data loads
  if (view === 'sales') {
    FF_ACTIVITY_MODE = 'sales';
    loadRecentActivity();
  } else if (view === 'collection') {
    FF_ACTIVITY_MODE = 'mints'; // treat "Collection" as recent mints for now
    loadRecentActivity();
  } else if (view === 'rarity') {
    ffLoadRarityGrid();
  } else if (view === 'wallet') {
    if (ffCurrentAccount) {
      renderOwnedAndStakedFrogs(ffCurrentAccount);
    } else {
      const ownedStatus  = document.getElementById('owned-frogs-status');
      const stakedStatus = document.getElementById('staked-frogs-status');
      if (ownedStatus)  ownedStatus.textContent  = 'Connect your wallet to see Owned Frogs.';
      if (stakedStatus) stakedStatus.textContent = 'Connect your wallet to see Staked Frogs.';
    }
  } else if (view === 'pond') {
    ffLoadPondGrid();
  }
}

// ------------------------
// Recent activity loader (bottom grid)
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
          item.buyerAddress ||
          item.to ||
          item.ownerAddress ||
          item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress);

      const footerHtml = '';

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
        headerLeft,
        headerRight,
        footerHtml,
        actionHtml: '',
        actions
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

// Optional: annotate a recent-sale card (or any card) with staking stats
async function ffAnnotateSaleWithStaking(card, tokenId) {
  // If toggle is off, do nothing
  if (!FF_SHOW_STAKING_STATS_ON_SALES) { return; }

  // Need legacy helpers loaded from ethereum-dapp.js
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

// ------------------------
// Card rendering (shared for all grids)
// ------------------------
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

  // Older layout markup (top owner/price, then image, then traits)
  card.innerHTML = `
    <strong class="sale_card_title">${ffEscapeHtml(headerLeft || '')}</strong>
    <strong class="sale_card_price">${ffEscapeHtml(headerRight || '')}</strong>
    <div style="clear: both;"></div>

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
    if (actionsContainer) {
      actionsContainer.innerHTML = '';

      actions.forEach((action) => {
        if (!action || !action.label) return;

        if (action.type === 'link' && action.href) {
          const a = document.createElement('a');
          a.className = 'sale_link_btn';
          if (action.className) a.className += ' ' + action.className;
          a.textContent = action.label;
          a.href = action.href;
          a.target = action.target || '_blank';
          a.rel = action.rel || 'noopener noreferrer';
          actionsContainer.appendChild(a);
        } else if (action.type === 'button') {
          const btn = document.createElement('button');
          btn.className = 'sale_link_btn';
          if (action.className) btn.className += ' ' + action.className;
          btn.textContent = action.label;
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
  }

  return card;
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

function ffWireTraitHover(card) {
  if (!card) return;

  const textNodes = card.querySelectorAll('.frog-attr-text');
  const overlayNodes = card.querySelectorAll('.trait_overlay, .attribute_overlay');

  if (!textNodes.length || !overlayNodes.length) return;

  function key(type, value) {
    return `${String(type || '').toLowerCase()}::${String(value || '').toLowerCase()}`;
  }

  // Map each (type, value) -> overlay elements
  const overlaysByKey = new Map();
  overlayNodes.forEach((img) => {
    const t = img.dataset.traitType;
    const v = img.dataset.traitValue;
    if (!t || v == null) return;
    const k = key(t, v);
    if (!overlaysByKey.has(k)) overlaysByKey.set(k, []);
    overlaysByKey.get(k).push(img);
  });

  function setHighlight(k, on) {
    const overlays = overlaysByKey.get(k) || [];
    const texts = Array.from(textNodes).filter((p) => {
      const t = p.dataset.traitType;
      const v = p.dataset.traitValue;
      return key(t, v) === k;
    });

    overlays.forEach((el) => el.classList.toggle('is-highlighted', on));
    texts.forEach((el) => el.classList.toggle('is-highlighted', on));
  }

  // Hovering text highlights matching layers
  textNodes.forEach((p) => {
    const k = key(p.dataset.traitType, p.dataset.traitValue);
    if (!k) return;
    p.addEventListener('mouseenter', () => setHighlight(k, true));
    p.addEventListener('mouseleave', () => setHighlight(k, false));
  });

  // Hovering a layer highlights matching text
  overlayNodes.forEach((img) => {
    const k = key(img.dataset.traitType, img.dataset.traitValue);
    if (!k) return;
    img.addEventListener('mouseenter', () => setHighlight(k, true));
    img.addEventListener('mouseleave', () => setHighlight(k, false));
  });
}

// Build layered frog image using /frog/json/<id>.json + build_trait()
// Always uses GitHub metadata so trait order is exactly as stored there.
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

    // Fall back to simple base image if SOURCE_PATH or build_trait not available
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
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }
    const metadata = await response.json();
    const attrs = Array.isArray(metadata.attributes) ? metadata.attributes : [];

    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (!attr || !attr.trait_type || !attr.value) continue;
      build_trait(attr.trait_type, attr.value, containerId);
    }

    // Wire hover highlighting once layers are in place
    const card = container.closest('.recent_sale_card');
    if (card && typeof ffWireTraitHover === 'function') {
      ffWireTraitHover(card);
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

// Generic age formatter used for mints
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

// Mint age helper
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
// Owned / Staked frogs rendering (wallet tab)
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

  return result;
}

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
        const tokenId = parseTokenId(rawTokenId);
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
    if (ownedStatus)  ownedStatus.textContent  = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  }
}

// Use stakingValues() + stakerAddress() from ethereum-dapp.js
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
window.ffStakeFrog    = ffStakeFrog;
window.ffUnstakeFrog  = ffUnstakeFrog;
window.ffTransferFrog = ffTransferFrog;

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

// ---- ALCHEMY: owned frog count (quick stat) ----
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

// ---- STAKING: staked frogs + rewards ----
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

// ---- OpenSea profile: username + avatar ----
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

// Convert roman numerals from stakingValues() into normal numbers
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
// Rarity view
// ===================================================
function ffGetRarityRankingEntries() {
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return [];

  if (Array.isArray(map)) {
    return map
      .map((frog) => {
        if (!frog || typeof frog.id === 'undefined') return null;
        const frogId = Number(frog.id);
        if (!Number.isFinite(frogId)) return null;
        const rank = frog.ranking ?? frog.rank;
        if (rank == null) return null;
        return { tokenId: frogId, rank: Number(rank) };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank);
  }

  if (typeof map === 'object') {
    const entries = Object.keys(map).map((key) => {
      const rank = Number(map[key]);
      if (!Number.isFinite(rank)) return null;

      const idMatch = key.match(/(\d+)/);
      if (!idMatch) return null;
      const tokenId = Number(idMatch[1]);
      if (!Number.isFinite(tokenId)) return null;

      return { tokenId, rank };
    }).filter(Boolean);

    return entries.sort((a, b) => a.rank - b.rank);
  }

  return [];
}

async function ffLoadRarityGrid() {
  const container = document.getElementById('rarity-grid');
  const statusEl  = document.getElementById('rarity-status');

  if (!container) return;

  if (statusEl) statusEl.textContent = 'Loading rarity rankings...';

  const entries = ffGetRarityRankingEntries();
  if (!entries.length) {
    if (statusEl) statusEl.textContent = 'Rarity ranking data not available.';
    return;
  }

  const slice = entries.slice(0, FF_RARITY_LIMIT);

  container.innerHTML = '';

  for (const entry of slice) {
    const tokenId  = entry.tokenId;
    const metadata = await fetchFrogMetadata(tokenId);

    const footerHtml = `
      <div class="staking-sale-note">
        Overall rarity rank #${entry.rank}
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
      headerLeft: `Rank #${entry.rank}`,
      headerRight: '',
      footerHtml,
      actionHtml: '',
      actions
    });

    container.appendChild(card);

    // Add staking info if available
    ffAnnotateSaleWithStaking(card, tokenId);
  }

  if (statusEl) statusEl.textContent = '';
}

// ===================================================
// Pond (all staked frogs by community)
// ===================================================
async function ffFetchAllStakedTokenIds() {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; pond view disabled until wallet connects.');
    return [];
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

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

      // Fill staking details for this tokenId
      ffDecorateStakedFrogCard(tokenId);
    }

    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('ffLoadPondGrid failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load Pond data right now.';
  }
}
