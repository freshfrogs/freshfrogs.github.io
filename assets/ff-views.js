// ff-views.js
// Nav + view switching + Collection/Rarity/Pond/Morph loaders

const {
  // state + config
  FF_ACTIVITY_MODE,
  FF_RECENT_LIMIT,
  FF_RARITY_INDEX,
  FF_RARITY_BATCH,
  FF_RARITY_LOADING,
  FF_POND_PAGE_KEY,
  FF_SALE_PRICE_CACHE,

  // helpers
  parseTokenId,
  dedupeByTokenId,
  normalizeMetadata,
  hasUsableMetadata,
  fetchRecentSales,
  fetchRecentMints,
  fetchFrogMetadata,
  formatMintAge,
  formatSalePrice,

  // morph worker
  FF_MORPH_WORKER_URL,
  FF_MORPH_ADMIN_KEY
} = window.FF;

// ------------------------
// Entry wiring (called by old DOMContentLoaded)
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
      const targetPath  = normalizePath(link.pathname || link.getAttribute('href'));

      if (currentPath === targetPath) {
        e.preventDefault();
        ffShowView(view);
      }
    });
  });
}

// keep hero/header buttons simple – wallet.js wires connect handlers now
function ffWireHeroButtons() {}

// ------------------------
// Views
// ------------------------
function ffShowView(view) {
  // set nav active
  const links = document.querySelectorAll('.nav a[data-view]');
  links.forEach((link) => link.classList.toggle('active', link.dataset.view === view));

  const recentPanel = document.getElementById('recent-activity-panel');
  const rarityPanel = document.getElementById('rarity-panel');
  const pondPanel   = document.getElementById('pond-panel');
  const ownedPanel  = document.getElementById('owned-panel');
  const stakedPanel = document.getElementById('staked-panel');

  if (recentPanel) recentPanel.style.display = (view === 'collection') ? '' : 'none';
  if (rarityPanel) rarityPanel.style.display = (view === 'rarity')     ? '' : 'none';
  if (pondPanel)   pondPanel.style.display   = (view === 'pond')       ? '' : 'none';
  if (ownedPanel)  ownedPanel.style.display  = (view === 'wallet')     ? '' : 'none';
  if (stakedPanel) stakedPanel.style.display = (view === 'wallet')     ? '' : 'none';

  if (view === 'collection') {
    loadRecentActivity();
  } else if (view === 'rarity') {
    ffEnsureRarityLoaded();
  } else if (view === 'pond') {
    ffEnsureRecentMorphsAbovePond();
    ffEnsurePondLoaded();
    ffEnsureRecentMorphsLoaded();
  } else if (view === 'morph') {
    // morph page has its own JS; nothing to auto-load here
  } else if (view === 'wallet') {
    // wallet.js handles render when connected / public route
    if (typeof window.ffEnsureWalletRender === 'function') {
      window.ffEnsureWalletRender();
    }
  }
}

// ------------------------
// Collection panel (recent sales/mints)
// ------------------------
async function loadRecentActivity() {
  const container = document.getElementById('recent-sales');
  const statusEl  = document.getElementById('recent-sales-status');
  if (!container) return;

  if (statusEl) {
    statusEl.textContent =
      window.FF.FF_ACTIVITY_MODE === 'mints'
        ? 'Loading recent mints...'
        : 'Loading recent sales...';
  }

  try {
    const items =
      window.FF.FF_ACTIVITY_MODE === 'mints'
        ? await fetchRecentMints(window.FF.FF_RECENT_LIMIT)
        : await fetchRecentSales(window.FF.FF_RECENT_LIMIT);

    if (!items.length) {
      if (statusEl) {
        statusEl.textContent =
          window.FF.FF_ACTIVITY_MODE === 'mints'
            ? 'No recent mints found.'
            : 'No recent sales found.';
      }
      return;
    }

    if (statusEl) statusEl.textContent = '';
    container.innerHTML = '';

    for (const item of items) {
      const rawTokenId =
        window.FF.FF_ACTIVITY_MODE === 'mints'
          ? (item.erc721TokenId || item.tokenId || (item.nft && item.nft.identifier))
          : (item.tokenId || (item.nft && item.nft.identifier));

      const tokenId = parseTokenId(rawTokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata || item.rawMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      let ownerAddress = null;
      let headerRight  = '';

      if (window.FF.FF_ACTIVITY_MODE === 'mints') {
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

        if (headerRight) {
          FF_SALE_PRICE_CACHE.set(tokenId, headerRight);
        }
      }

      const card = window.createFrogCard({
        tokenId,
        metadata,
        headerLeft: ownerAddress ? window.formatOwnerLink(ownerAddress) : '',
        headerRight,
        footerHtml: '',
        actionHtml: '' // recent cards don't get stake/unstake buttons
      });

      container.appendChild(card);

      // build layers AFTER append (no duplicate work)
      if (card.dataset.imgContainerId) {
        window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      if (ownerAddress) window.ffSetOwnerLabel(card, ownerAddress);
      window.ffAttachStakeMetaIfStaked(card, tokenId);
    }
  } catch (err) {
    console.warn('loadRecentActivity failed:', err);
    if (statusEl) statusEl.textContent = 'Unable to load recent activity.';
  }
}

// ------------------------
// Rarity panel
// ------------------------
function ffEnsureRarityLoaded() {
  const grid = document.getElementById('rarity-grid');
  if (!grid) return;
  if (!grid.children.length) ffLoadMoreRarity();
}

async function ffLoadMoreRarity() {
  if (window.FF.FF_RARITY_LOADING) return;

  const grid   = document.getElementById('rarity-grid');
  const status = document.getElementById('rarity-status');
  if (!grid) return;

  const rankings = window.freshfrogs_rarity_rankings;
  if (!Array.isArray(rankings) || !rankings.length) {
    if (status) status.textContent = 'Rarity rankings data not loaded.';
    return;
  }

  window.FF.FF_RARITY_LOADING = true;

  try {
    const slice = rankings.slice(
      window.FF.FF_RARITY_INDEX,
      window.FF.FF_RARITY_INDEX + window.FF.FF_RARITY_BATCH
    );

    if (!slice.length) {
      if (status) status.textContent = 'All frogs loaded.';
      return;
    }

    for (const frog of slice) {
      const tokenId = parseTokenId(frog?.id ?? frog?.tokenId ?? frog);
      if (tokenId == null) continue;

      const metadata = await fetchFrogMetadata(tokenId);

      const card = window.createFrogCard({
        tokenId,
        metadata,
        headerLeft: `Rank #${frog.ranking ?? frog.rank ?? '—'}`,
        headerRight: '',
        footerHtml: '',
        actionHtml: ''
      });

      grid.appendChild(card);

      if (card.dataset.imgContainerId) {
        window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      window.ffAttachStakeMetaIfStaked(card, tokenId);
    }

    window.FF.FF_RARITY_INDEX += slice.length;
    if (status) status.textContent = 'Rarity rankings for Fresh Frogs.';
  } catch (err) {
    console.warn('ffLoadMoreRarity failed:', err);
    if (status) status.textContent = 'Unable to load rarity rankings.';
  } finally {
    window.FF.FF_RARITY_LOADING = false;
  }
}

// ------------------------
// Pond panel (controller-owned staked frogs)
// ------------------------
function ffEnsurePondLoaded() {
  const grid = document.getElementById('pond-grid');
  if (!grid) return;
  if (!grid.children.length) ffLoadMorePond();
}

async function ffLoadMorePond() {
  const grid   = document.getElementById('pond-grid');
  const status = document.getElementById('pond-status');
  if (!grid) return;

  if (status) status.textContent = 'Loading pond frogs...';

  try {
    // Alchemy: find frogs owned by controller (staked)
    const owner = window.FF.FF_CONTROLLER_ADDRESS;
    const pageKey = window.FF.FF_POND_PAGE_KEY;

    const qs = new URLSearchParams({
      owner,
      withMetadata: 'true',
      pageSize: '100'
    });
    if (pageKey) qs.set('pageKey', pageKey);

    const url = `${window.FF.FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?${qs.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Alchemy pond request failed');

    const data  = await res.json();
    const all   = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
    const frogs = dedupeByTokenId(all, (nft) => nft.tokenId || nft.id?.tokenId);

    if (!frogs.length && !pageKey) {
      if (status) status.textContent = 'No pond frogs found.';
      return;
    }

    for (const nft of frogs) {
      const tokenId = parseTokenId(nft.tokenId || nft.id?.tokenId);
      if (tokenId == null) continue;

      let metadata = normalizeMetadata(nft.rawMetadata || nft.metadata || nft.tokenMetadata);
      if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

      const card = window.createFrogCard({
        tokenId,
        metadata,
        headerLeft: '',
        headerRight: 'Staked',
        footerHtml: '',
        actionHtml: '' // pond cards no actions
      });

      grid.appendChild(card);

      if (card.dataset.imgContainerId) {
        window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
      }

      window.ffAttachStakeMetaIfStaked(card, tokenId);
      window.ffDecoratePondOwner?.(card, tokenId); // your existing helper
    }

    window.FF.FF_POND_PAGE_KEY = data.pageKey || null;
    if (status) status.textContent = 'All Frogs currently staked by the community.';
  } catch (err) {
    console.warn('ffLoadMorePond failed:', err);
    if (status) status.textContent = 'Unable to load pond frogs.';
  }
}

// ------------------------
// Recent morphs section (pond)
// ------------------------
async function ffFetchRecentMorphedFrogs(limit = 24) {
  if (!FF_MORPH_WORKER_URL) return [];

  let cursor = null;
  let all    = [];

  try {
    while (true) {
      const u = new URL(`${FF_MORPH_WORKER_URL}/allMorphs`);
      u.searchParams.set('limit', '100');
      if (cursor) u.searchParams.set('cursor', cursor);

      const res = await fetch(u.toString(), {
        cache: 'no-store',
        headers: { authorization: `Bearer ${FF_MORPH_ADMIN_KEY}` }
      });

      if (!res.ok) break;

      const data = await res.json();
      const page = Array.isArray(data?.morphs) ? data.morphs : [];
      all = all.concat(page);

      if (data.list_complete || !data.cursor) break;
      cursor = data.cursor;

      if (all.length >= limit) break;
    }

    all.sort((a, b) => {
      const ta = Number(a?.createdAt || a?.timestamp || 0);
      const tb = Number(b?.createdAt || b?.timestamp || 0);
      return tb - ta;
    });

    return all
      .slice(0, limit)
      .map(m => m?.morphedMeta || m?.metadata || m)
      .filter(meta => meta && typeof meta === 'object');

  } catch (err) {
    console.warn('ffFetchRecentMorphedFrogs failed:', err);
    return [];
  }
}

function ffEnsureRecentMorphsLoaded() {
  const grid = document.getElementById('recent-morphs-grid');
  if (!grid) return;
  if (grid.dataset.loading === '1') return;
  if (!grid.children.length) ffLoadRecentMorphs();
}

async function ffLoadRecentMorphs() {
  const grid   = document.getElementById('recent-morphs-grid');
  const status = document.getElementById('recent-morphs-status');
  if (!grid) return;

  grid.dataset.loading = '1';
  grid.innerHTML = '';

  try {
    let morphs = await ffFetchRecentMorphedFrogs(24);

    if (!Array.isArray(morphs) || !morphs.length) {
      if (status) status.textContent = 'No morphed frogs have been created yet.';
      return;
    }

    const seen = new Set();
    morphs = morphs.filter(meta => {
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

      const card = window.createMorphedFrogCard({
        metadata: meta,
        ownerAddress: meta?.createdBy
      });

      grid.appendChild(card);

      const contId = card.dataset.imgContainerId;
      const baseId = parseTokenId(meta?.frogA ?? meta?.tokenA ?? null);
      window.ffBuildLayeredMorphedImage(meta, contId, baseId);
    }

  } catch (err) {
    console.warn('ffLoadRecentMorphs failed:', err);
    if (status) status.textContent = 'Unable to load recent morphs right now.';
  } finally {
    grid.dataset.loading = '';
  }
}

function ffEnsureRecentMorphsAbovePond() {
  const grid     = document.getElementById('recent-morphs-grid');
  const pondGrid = document.getElementById('pond-grid');
  if (!grid || !pondGrid) return;

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

// ------------------------
// Expose globals expected by HTML / other files
// ------------------------
window.ffInitNav = ffInitNav;
window.ffWireHeroButtons = ffWireHeroButtons;
window.ffShowView = ffShowView;

window.loadRecentActivity = loadRecentActivity;
window.ffEnsureRarityLoaded = ffEnsureRarityLoaded;
window.ffLoadMoreRarity = ffLoadMoreRarity;

window.ffEnsurePondLoaded = ffEnsurePondLoaded;
window.ffLoadMorePond = ffLoadMorePond;

window.ffEnsureRecentMorphsLoaded = ffEnsureRecentMorphsLoaded;
window.ffLoadRecentMorphs = ffLoadRecentMorphs;
window.ffEnsureRecentMorphsAbovePond = ffEnsureRecentMorphsAbovePond;
window.ffFetchRecentMorphedFrogs = ffFetchRecentMorphedFrogs;
