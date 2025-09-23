// assets/js/pond.js
(function (FF, CFG) {
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const API          = 'https://api.reservoir.tools/users/activity/v6';
  const OWNERS_API   = 'https://api.reservoir.tools/owners/v2';
  const TOKENS_API   = 'https://api.reservoir.tools/users'; // /{addr}/tokens/v8
  const CONTROLLER   = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION   = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE    = 20;
  const PREFETCH_PAGES = 3;

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  const shorten = (s)=> (FF && FF.shorten) ? FF.shorten(s) :
    (s ? (s.slice(0,6)+'…'+s.slice(-4)) : '—');

  // ---------- resilient fetch ----------
  async function reservoirFetch(url, opts={}, retries=3, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);

        if (res.status === 429 && i < retries){
          const ra = Number(res.headers.get('retry-after')) || (1 << i);
          await new Promise(r=>setTimeout(r, ra * 1000));
          continue;
        }
        if (!res.ok){
          if (i < retries){
            await new Promise(r=>setTimeout(r, (300 + Math.random()*300) * (i+1)));
            continue;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      }catch(err){
        clearTimeout(t);
        if (i === retries) throw err;
        await new Promise(r=>setTimeout(r, (350 + Math.random()*300) * (i+1)));
      }
    }
  }

  // ---------- state ----------
  const ST = {
    pages: [],                 // [{ rows: [{id, staker, since}], contIn, contOut }]
    page: 0,
    nextContinuation: '',
    blockedIds: new Set(),
    acceptedIds: new Set(),
    stats: { total: null, updatedAt: null }
  };

  let RANKS = null;

  // ---------- UI helpers ----------
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

  // internal<->display index conversions
  const storeIdxFromDisplay  = (dispIdx)=> (ST.pages.length - 1 - dispIdx);
  const displayIdxFromStore  = (storeIdx)=> (ST.pages.length - 1 - storeIdx);

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    // numbered buttons (oldest -> newest)
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

    // trailing ellipsis
    if (ST.nextContinuation){
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

  // ---------- tiny helpers ----------
  function mk(tag, props={}, style={}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }

  // 64×64 still image for list (fast)
  function flatThumb64(leftEl, id){
    const img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
    img.className = 'thumb64';
    img.width = 64; img.height = 64;
    img.src = `${(CFG.SOURCE_PATH || '')}/frog/${id}.png`;
    leftEl.appendChild(img);
  }

  // ---------- activity selection ----------
  function selectCurrentlyStakedFromActivities(activities){
    const seenThisPage = new Set();
    const out = [];

    for (const a of activities){
      const tok = a?.token?.tokenId;
      if (!tok) continue;
      const id = Number(tok);
      if (!Number.isFinite(id)) continue;
      if (seenThisPage.has(id)) continue;
      seenThisPage.add(id);

      const to   = (a?.toAddress   || '').toLowerCase();
      const from = (a?.fromAddress || '').toLowerCase();

      if (from === CONTROLLER){ ST.blockedIds.add(id); continue; } // outbound ⇒ not staked

      if (to === CONTROLLER && !ST.blockedIds.has(id) && !ST.acceptedIds.has(id)){
        const since = a?.createdAt ? new Date(a.createdAt)
                    : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        out.push({ id, staker: a?.fromAddress || null, since });
        ST.acceptedIds.add(id);
      }
    }

    out.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return ta - tb;
    });
    return out;
  }

  async function fetchActivitiesPage(continuation){
    const qs = new URLSearchParams({
      users: CONTROLLER,
      collection: COLLECTION,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);

    const url = `${API}?${qs.toString()}`;
    const json = await reservoirFetch(url, { headers: apiHeaders() });
    return { activities: json?.activities || [], continuation: json?.continuation || '' };
  }

  async function fetchNextPage(){
    const cont = ST.nextContinuation || '';
    try{
      const { activities, continuation } = await fetchActivitiesPage(cont);
      const rows = selectCurrentlyStakedFromActivities(activities);
      ST.pages.push({ rows, contIn: ST.nextContinuation || null, contOut: continuation || null });
      ST.nextContinuation = continuation || '';
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
      if (!ST.nextContinuation) break;
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
        // Make the whole row open the modal
        li.setAttribute('data-open-modal','');
        li.setAttribute('data-token-id', String(r.id));
        li.setAttribute('data-owner', r.staker || '');
        li.setAttribute('data-staked', 'true');
        if (r.since instanceof Date) li.setAttribute('data-since', String(r.since.getTime()));
// Left: 64×64 still image
        const left = mk('div', {}, {
          width:'64px', height:'64px', minWidth:'64px', minHeight:'64px'
        });
        li.appendChild(left);
        flatThumb64(left, r.id);

        // Middle: text block
        const mid = mk('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
             <b>Frog #${r.id}</b> ${pillRank(rank)}
           </div>
           <div class="muted">Staked ${fmtAgo(r.since)} • Owned by ${r.staker ? shorten(r.staker) : '—'}</div>`;
        li.appendChild(mid);

        // No right column (keeps row compact)
        ul.appendChild(li);
      });
    }

    renderPager();
  }

  // ---------- Pond stats ----------
  function setBasicStatLinks(){
    const ctlA = document.getElementById('statController');
    const colA = document.getElementById('statCollection');
    if (ctlA){
      ctlA.href = `https://etherscan.io/address/${CFG.CONTROLLER_ADDRESS}`;
      ctlA.textContent = shorten(CONTROLLER);
    }
    if (colA){
      colA.href = `https://etherscan.io/address/${CFG.COLLECTION_ADDRESS}`;
      colA.textContent = shorten((CFG.COLLECTION_ADDRESS||'').toLowerCase());
    }
  }

  async function fetchTotalStakedViaOwners(){
    let cont = '';
    for (let guard=0; guard<30; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION });
      if (cont) qs.set('continuation', cont);
      const url = `${OWNERS_API}?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      const owners = json?.owners || [];
      const hit = owners.find(o => (o?.address || '').toLowerCase() === CONTROLLER);
      if (hit){
        const n = Number(hit?.ownership?.tokenCount ?? 0);
        return Number.isFinite(n) ? n : 0;
      }
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return null;
  }

  async function fetchTotalStakedViaTokens(){
    let cont = '';
    let total = 0;
    for (let guard=0; guard<40; guard++){
      const qs = new URLSearchParams({
        collection: COLLECTION,
        limit: '200',
        includeTopBid: 'false'
      });
      if (cont) qs.set('continuation', cont);
      const url = `${TOKENS_API}/${CONTROLLER}/tokens/v8?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      const arr = json?.tokens || [];
      total += arr.length;
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return total;
  }

  async function fetchTotalStaked(){
    const a = await fetchTotalStakedViaOwners();
    if (a !== null) return a;
    return await fetchTotalStakedViaTokens();
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

  // ---------- main ----------
  async function loadPond(){
    try{
      if (!CFG.FROG_API_KEY) {
        ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key. Set <code>FROG_API_KEY</code> in config.js.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      // reset
      ST.pages = [];
      ST.page = 0;
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      // stats + list
      await refreshStats();
      await prefetchInitialPages();

      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // Show the OLDEST first
      ST.page = ST.pages.length - 1;
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
        ensurePager().innerHTML = '';
      }
    }
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
