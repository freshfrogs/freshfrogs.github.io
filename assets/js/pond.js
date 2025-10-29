// assets/js/pond.js
(function (FF, CFG) {
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const CONTROLLER   = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION   = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  const PAGE_SIZE    = 20;
  const PREFETCH_PAGES = 3;

  function ensureAlchemy(){
    if (!window.FF_ALCH || !window.FF_ALCH.apiKey){
      throw new Error('Missing FF_ALCH helper or ALCHEMY_API_KEY');
    }
    return window.FF_ALCH;
  }

  const shorten = (s)=> (FF && FF.shorten) ? FF.shorten(s) :
    (s ? (s.slice(0,6)+'…'+s.slice(-4)) : '—');

  // ---------- state ----------
  const ST = {
    pages: [],
    page: 0,
    nextPageKey: null,
    stats: { total: null, updatedAt: null }
  };

  const STAKE_INFO = new Map();
  let RANKS = null;

  // ---------- helpers ----------
  function parseTimestamp(ts){
    if (!ts) return null;
    if (typeof ts === 'number') return new Date(ts < 1e12 ? ts*1000 : ts);
    if (typeof ts === 'string'){
      const parsed = Date.parse(ts);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    return null;
  }

  const fmtAgo = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '—';
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function ensurePager(){
    let nav = document.getElementById('pondPager');
    if (!nav){
      nav = document.createElement('div');
      nav.id = 'pondPager';
      Object.assign(nav.style, {
        marginTop: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center'
      });
      nav.className = 'row';
      wrap.appendChild(nav);
    }
    return nav;
  }

  const storeIdxFromDisplay  = (dispIdx)=> (ST.pages.length - 1 - dispIdx);
  const displayIdxFromStore  = (storeIdx)=> (ST.pages.length - 1 - storeIdx);

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    for (let disp=0; disp<ST.pages.length; disp++){
      const sIdx = storeIdxFromDisplay(disp);
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(disp + 1);
      if (sIdx === ST.page){
        btn.classList.add('btn-solid');
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', ()=>{
        if (ST.page !== sIdx){
          ST.page = sIdx;
          renderPage();
        }
      });
      nav.appendChild(btn);
    }

    if (ST.nextPageKey){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-ghost btn-sm';
      moreBtn.setAttribute('aria-label', 'Load more pages');
      moreBtn.title = 'Load more';
      moreBtn.textContent = '…';
      moreBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          ST.page = ST.pages.length - 1;
          renderPage();
          renderStatsBar?.();
        }
      });
      nav.appendChild(moreBtn);
    }
  }

  function mk(tag, props={}, style={}) {
    const el = document.createElement('tag' in document ? tag : 'div');
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }

  function flatThumb128(leftEl, id){
    const img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
    img.className = 'thumb128';
    img.width = 128; img.height = 128;
    img.src = `${(CFG.SOURCE_PATH || '')}/frog/${id}.png`;
    leftEl.appendChild(img);
  }

  async function getStakeInfo(tokenId){
    if (STAKE_INFO.has(tokenId)) return STAKE_INFO.get(tokenId);
    const out = { since: null, staker: null };
    try{
      const ALCH = ensureAlchemy();
      const { transfers } = await ALCH.getTokenTransfers(tokenId, { maxCount: 6, order: 'desc' });
      const inbound = transfers.find(t => t.to === CONTROLLER);
      if (inbound){
        out.since = parseTimestamp(inbound.blockTimestamp);
        out.staker = inbound.from || null;
      }
    }catch(err){
      console.warn('[pond] stake info failed', err);
    }
    STAKE_INFO.set(tokenId, out);
    return out;
  }

  async function fetchStakedTokensPage(pageKey){
    const ALCH = ensureAlchemy();
    const { tokens, pageKey: nextKey, totalCount } = await ALCH.getOwnerTokens(CONTROLLER, {
      pageKey: pageKey || undefined,
      pageSize: PAGE_SIZE,
      withMetadata: false
    });
    if (Number.isFinite(totalCount)){
      ST.stats.total = totalCount;
      ST.stats.updatedAt = Date.now();
    }
    const rows = [];
    for (const tok of tokens){
      const info = await getStakeInfo(tok.id);
      rows.push({ id: tok.id, staker: info.staker, since: info.since });
    }
    return { rows, continuation: nextKey || null };
  }

  async function fetchNextPage(){
    try{
      const { rows, continuation } = await fetchStakedTokensPage(ST.nextPageKey || null);
      ST.pages.push({ rows, contIn: ST.nextPageKey || null, contOut: continuation || null });
      ST.nextPageKey = continuation || null;
      return true;
    }catch(err){
      console.warn('Pond: page fetch failed', err);
      return false;
    }
  }

  async function prefetchInitialPages(n=PREFETCH_PAGES){
    for (let i=0; i<n; i++){
      const ok = await fetchNextPage();
      if (!ok) break;
      if (!ST.nextPageKey) break;
    }
  }

  function renderPage(){
    ul.innerHTML = '';

    if (!ST.pages.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    const dispIdx  = displayIdxFromStore(ST.page);
    const storeIdx = storeIdxFromDisplay(dispIdx);
    const page     = ST.pages[storeIdx];
    const rows     = page?.rows || [];

    if (!rows.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs on this page.</div>`;
      ul.appendChild(li);
    } else {
      rows.forEach(r=>{
        const rank = RANKS?.[String(r.id)] ?? null;

        const li = mk('li', { className:'list-item', tabIndex:0, role:'button' });
        li.setAttribute('data-open-modal','');
        li.setAttribute('data-token-id', String(r.id));
        li.setAttribute('data-owner', r.staker || '');
        li.setAttribute('data-staked', 'true');
        if (r.since instanceof Date) li.setAttribute('data-since', String(r.since.getTime()));

        const left = mk('div', {}, {
          width:'128px', height:'128px', minWidth:'128px', minHeight:'128px'
        });
        li.appendChild(left);
        flatThumb128(left, r.id);

        const mid = mk('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
             <b>Frog #${r.id}</b> ${pillRank(rank)}
           </div>
           <div class="muted">Staked ${fmtAgo(r.since)} • Owned by ${r.staker ? shorten(r.staker) : '—'}</div>`;
        li.appendChild(mid);

        ul.appendChild(li);
      });
    }

    renderPager();
  }

  function setBasicStatLinks(){
    const ctlA = document.getElementById('statController');
    const colA = document.getElementById('statCollection');
    if (ctlA && CONTROLLER){
      ctlA.href = `https://etherscan.io/address/${CFG.CONTROLLER_ADDRESS}`;
      ctlA.textContent = shorten(CONTROLLER);
    }
    if (colA && COLLECTION){
      colA.href = `https://etherscan.io/address/${CFG.COLLECTION_ADDRESS}`;
      colA.textContent = shorten(COLLECTION);
    }
  }

  async function fetchTotalStaked(){
    const ALCH = ensureAlchemy();
    const { totalCount } = await ALCH.getOwnerTokens(CONTROLLER, { pageSize: 1, withMetadata: false });
    return Number.isFinite(Number(totalCount)) ? Number(totalCount) : null;
  }

  function renderStatsBar(){
    const totalEl   = document.getElementById('statTotal');
    const updatedEl = document.getElementById('statUpdated');
    if (totalEl){
      const n = ST.stats.total;
      totalEl.textContent = (n==null) ? '—' : `${n.toLocaleString()} frogs`;
    }
    if (updatedEl){
      updatedEl.textContent = ST.stats.updatedAt
        ? new Date(ST.stats.updatedAt).toLocaleString()
        : '—';
    }
  }

  async function refreshStats(){
    setBasicStatLinks();
    try{
      const total = await fetchTotalStaked();
      ST.stats.total = total;
      ST.stats.updatedAt = Date.now();
    }catch(e){
      console.warn('Pond stats failed', e);
      ST.stats.total = null;
      ST.stats.updatedAt = null;
    }
    renderStatsBar();
  }

  async function loadPond(){
    try{
      ensureAlchemy();
    }catch(err){
      ul.innerHTML = `<li class="list-item"><div class="muted">${err.message}</div></li>`;
      ensurePager().innerHTML = '';
      return;
    }

    try {
      RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
    } catch {
      RANKS = {};
    }

    ST.pages = [];
    ST.page = 0;
    ST.nextPageKey = null;

    await refreshStats();
    await prefetchInitialPages();

    if (!ST.pages.length){
      ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
      ensurePager().innerHTML = '';
      return;
    }

    ST.page = ST.pages.length - 1;
    renderPage();
  }

  loadPond();
  window.FF_reloadPond = loadPond;

  const refreshBtn = document.getElementById('refreshPond');
  if (refreshBtn){
    refreshBtn.addEventListener('click', async ()=>{
      refreshBtn.disabled = true;
      try { await loadPond(); } finally { refreshBtn.disabled = false; }
    });
  }
})(window.FF, window.FF_CFG);
