(() => {
  // ff-views.js (scoped)
  const FF = window.FF;
  if (!FF) {
    console.error("FF core not loaded before ff-views.js");
    return;
  }

  const {
    parseTokenId,
    dedupeByTokenId,
    normalizeMetadata,
    hasUsableMetadata,
    fetchRecentSales,
    fetchRecentMints,
    fetchFrogMetadata,
    formatMintAge,
    formatSalePrice,
    FF_MORPH_WORKER_URL,
    FF_MORPH_ADMIN_KEY,
    FF_SALE_PRICE_CACHE
  } = FF;

  function ffInitNav() {
    const links = document.querySelectorAll('.nav a[data-view]');
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const view = link.dataset.view;
        const norm = (p) => (p || '/').replace(/\/+$/, '') || '/';
        if (norm(location.pathname) === norm(link.pathname || link.getAttribute('href'))) {
          e.preventDefault();
          ffShowView(view);
        }
      });
    });
  }
  function ffWireHeroButtons() {}

  function ffShowView(view) {
    document.querySelectorAll('.nav a[data-view]')
      .forEach(a => a.classList.toggle('active', a.dataset.view === view));

    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };

    show('recent-activity-panel', view === 'collection');
    show('rarity-panel',         view === 'rarity');
    show('pond-panel',           view === 'pond');
    show('owned-panel',          view === 'wallet');
    show('staked-panel',         view === 'wallet');

    if (view === 'collection') loadRecentActivity();
    if (view === 'rarity')     ffEnsureRarityLoaded();
    if (view === 'pond') {
      ffEnsureRecentMorphsAbovePond();
      ffEnsurePondLoaded();
      ffEnsureRecentMorphsLoaded();
    }
    if (view === 'wallet') {
      window.ffEnsureWalletRender?.();
    }
  }

  async function loadRecentActivity() {
    const container = document.getElementById('recent-sales');
    const statusEl  = document.getElementById('recent-sales-status');
    if (!container) return;

    statusEl && (statusEl.textContent =
      FF.FF_ACTIVITY_MODE === 'mints' ? 'Loading recent mints...' : 'Loading recent sales...');

    try {
      const items = FF.FF_ACTIVITY_MODE === 'mints'
        ? await fetchRecentMints(FF.FF_RECENT_LIMIT)
        : await fetchRecentSales(FF.FF_RECENT_LIMIT);

      if (!items.length) {
        statusEl && (statusEl.textContent =
          FF.FF_ACTIVITY_MODE === 'mints' ? 'No recent mints found.' : 'No recent sales found.');
        return;
      }

      statusEl && (statusEl.textContent = '');
      container.innerHTML = '';

      for (const item of items) {
        const rawId = FF.FF_ACTIVITY_MODE === 'mints'
          ? (item.erc721TokenId || item.tokenId || item.nft?.identifier)
          : (item.tokenId || item.nft?.identifier);

        const tokenId = parseTokenId(rawId);
        if (tokenId == null) continue;

        let metadata = normalizeMetadata(item.metadata || item.tokenMetadata || item.rawMetadata);
        if (!hasUsableMetadata(metadata)) metadata = await fetchFrogMetadata(tokenId);

        let ownerAddress = null;
        let headerRight  = '';

        if (FF.FF_ACTIVITY_MODE === 'mints') {
          ownerAddress = item.to || item.receiver || item.buyerAddress || item.ownerAddress || null;
          headerRight  = formatMintAge(item);
        } else {
          ownerAddress =
            item.buyerAddress || item.to || item.ownerAddress ||
            item.sellerAddress || item.from || null;

          headerRight = item.priceText || formatSalePrice(item);
          if (headerRight) FF_SALE_PRICE_CACHE.set(tokenId, headerRight);
        }

        const card = window.createFrogCard({
          tokenId,
          metadata,
          headerLeft: ownerAddress ? window.formatOwnerLink(ownerAddress) : '',
          headerRight
        });

        container.appendChild(card);

        card.dataset.imgContainerId && window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
        ownerAddress && window.ffSetOwnerLabel(card, ownerAddress);
        window.ffAttachStakeMetaIfStaked(card, tokenId);
      }
    } catch (err) {
      console.warn('loadRecentActivity failed:', err);
      statusEl && (statusEl.textContent = 'Unable to load recent activity.');
    }
  }

  function ffEnsureRarityLoaded() {
    const grid = document.getElementById('rarity-grid');
    if (grid && !grid.children.length) ffLoadMoreRarity();
  }

  async function ffLoadMoreRarity() {
    if (FF.FF_RARITY_LOADING) return;

    const grid   = document.getElementById('rarity-grid');
    const status = document.getElementById('rarity-status');
    if (!grid) return;

    const rankings = window.freshfrogs_rarity_rankings;
    if (!Array.isArray(rankings) || !rankings.length) {
      status && (status.textContent = 'Rarity rankings data not loaded.');
      return;
    }

    FF.FF_RARITY_LOADING = true;
    try {
      const slice = rankings.slice(FF.FF_RARITY_INDEX, FF.FF_RARITY_INDEX + FF.FF_RARITY_BATCH);
      if (!slice.length) {
        status && (status.textContent = 'All frogs loaded.');
        return;
      }

      for (const frog of slice) {
        const tokenId = parseTokenId(frog?.id ?? frog?.tokenId ?? frog);
        if (tokenId == null) continue;

        const metadata = await fetchFrogMetadata(tokenId);

        const card = window.createFrogCard({
          tokenId,
          metadata,
          headerLeft: `Rank #${frog.ranking ?? frog.rank ?? '—'}`
        });

        grid.appendChild(card);
        card.dataset.imgContainerId && window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
        window.ffAttachStakeMetaIfStaked(card, tokenId);
      }

      FF.FF_RARITY_INDEX += slice.length;
      status && (status.textContent = 'Rarity rankings for Fresh Frogs.');
    } catch (err) {
      console.warn('ffLoadMoreRarity failed:', err);
      status && (status.textContent = 'Unable to load rarity rankings.');
    } finally {
      FF.FF_RARITY_LOADING = false;
    }
  }

  function ffEnsurePondLoaded() {
    const grid = document.getElementById('pond-grid');
    if (grid && !grid.children.length) ffLoadMorePond();
  }

  async function ffLoadMorePond() {
    const grid   = document.getElementById('pond-grid');
    const status = document.getElementById('pond-status');
    if (!grid) return;

    status && (status.textContent = 'Loading pond frogs...');

    try {
      const owner = FF.FF_CONTROLLER_ADDRESS;
      const pageKey = FF.FF_POND_PAGE_KEY;

      const qs = new URLSearchParams({ owner, withMetadata:'true', pageSize:'100' });
      pageKey && qs.set('pageKey', pageKey);

      const url = `${FF.FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Alchemy pond request failed');

      const data  = await res.json();
      const all   = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
      const frogs = dedupeByTokenId(all, (nft) => nft.tokenId || nft.id?.tokenId);

      if (!frogs.length && !pageKey) {
        status && (status.textContent = 'No pond frogs found.');
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
          headerRight: 'Staked'
        });

        grid.appendChild(card);
        card.dataset.imgContainerId && window.ffBuildLayeredFrogImage(tokenId, card.dataset.imgContainerId);
        window.ffAttachStakeMetaIfStaked(card, tokenId);
        window.ffDecoratePondOwner?.(card, tokenId);
      }

      FF.FF_POND_PAGE_KEY = data.pageKey || null;
      status && (status.textContent = 'All Frogs currently staked by the community.');
    } catch (err) {
      console.warn('ffLoadMorePond failed:', err);
      status && (status.textContent = 'Unable to load pond frogs.');
    }
  }

  async function ffFetchRecentMorphedFrogs(limit=24) {
    if (!FF_MORPH_WORKER_URL) return [];
    let cursor=null, all=[];
    try {
      while (true) {
        const u = new URL(`${FF_MORPH_WORKER_URL}/allMorphs`);
        u.searchParams.set('limit','100');
        cursor && u.searchParams.set('cursor',cursor);

        const res = await fetch(u.toString(), {
          cache:'no-store',
          headers:{ authorization:`Bearer ${FF_MORPH_ADMIN_KEY}` }
        });
        if (!res.ok) break;

        const data = await res.json();
        const page = Array.isArray(data?.morphs) ? data.morphs : [];
        all = all.concat(page);

        if (data.list_complete || !data.cursor) break;
        cursor = data.cursor;
        if (all.length >= limit) break;
      }

      all.sort((a,b)=>Number(b?.createdAt||b?.timestamp||0)-Number(a?.createdAt||a?.timestamp||0));
      return all.slice(0,limit)
        .map(m=>m?.morphedMeta||m?.metadata||m)
        .filter(meta=>meta && typeof meta==='object');
    } catch (e) {
      console.warn('ffFetchRecentMorphedFrogs failed:', e);
      return [];
    }
  }

  function ffEnsureRecentMorphsLoaded() {
    const grid = document.getElementById('recent-morphs-grid');
    if (!grid || grid.dataset.loading==='1' || grid.children.length) return;
    ffLoadRecentMorphs();
  }

  async function ffLoadRecentMorphs() {
    const grid   = document.getElementById('recent-morphs-grid');
    const status = document.getElementById('recent-morphs-status');
    if (!grid) return;

    grid.dataset.loading='1';
    grid.innerHTML='';

    try {
      let morphs = await ffFetchRecentMorphedFrogs(24);
      if (!morphs.length) {
        status && (status.textContent='No morphed frogs have been created yet.');
        return;
      }

      const seen=new Set();
      morphs=morphs.filter(meta=>{
        const id = meta.morphId||meta.id||meta.signature||
          `${meta.createdBy||''}-${meta.frogA??meta.tokenA}-${meta.frogB??meta.tokenB}-${meta.createdAt||meta.timestamp||''}`;
        if (seen.has(id)) return false; seen.add(id); return true;
      });

      status && (status.textContent='Latest morphed frogs from the community.');

      for (const meta of morphs) {
        if (!meta.attributes && Array.isArray(meta.traits)) meta.attributes=meta.traits;

        const card = window.createMorphedFrogCard({ metadata:meta, ownerAddress:meta.createdBy });
        grid.appendChild(card);

        const contId = card.dataset.imgContainerId;
        const baseId = parseTokenId(meta.frogA ?? meta.tokenA ?? null);
        window.ffBuildLayeredMorphedImage(meta, contId, baseId);
      }
    } catch (e) {
      console.warn('ffLoadRecentMorphs failed:', e);
      status && (status.textContent='Unable to load recent morphs right now.');
    } finally {
      grid.dataset.loading='';
    }
  }

  function ffEnsureRecentMorphsAbovePond() {
    const grid=document.getElementById('recent-morphs-grid');
    const pondGrid=document.getElementById('pond-grid');
    if (!grid||!pondGrid) return;
    const morphsPanel=document.getElementById('recent-morphs-panel')||grid.closest('.panel')||grid.parentElement;
    const pondPanel=pondGrid.closest('.panel')||pondGrid.parentElement;
    if (morphsPanel && pondPanel && pondPanel.parentNode)
      pondPanel.parentNode.insertBefore(morphsPanel, pondPanel);
  }

  // exports
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
})();
