// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const API_ACTIVITY = 'https://api.reservoir.tools/users/activity/v6';
  const API_OWNERS   = 'https://api.reservoir.tools/collections/owners/v2';
  const API_TOKENS   = (addr)=> `https://api.reservoir.tools/users/${addr}/tokens/v8`;

  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE  = 20; // Reservoir activity max

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    // aggregated, de-duped, *currently staked* rows newest->older
    rows: [],                 // [{id, staker, since:Date}]
    totalCount: 0,            // how many frogs controller currently holds
    page: 0,
    nextContinuation: '',     // for activity crawl
    blockedIds: new Set(),    // tokenIds that have an outbound (newer) => not staked
  };

  let RANKS = null;

  // ---------- UI helpers ----------
  const fmtAgo = (d)=> d ? (FF.formatAgo(Date.now() - d.getTime()) + ' ago') : '—';
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function ensurePager(){
    let nav = document.getElementById('pondPager');
    if (!nav){
      nav = document.createElement('div');
      nav.id = 'pondPager';
      nav.style.marginTop = '8px';
      nav.className = 'row';
      wrap.appendChild(nav);
    }
    return nav;
  }

  function totalPages(){
    return Math.max(1, Math.ceil((ST.totalCount || 0) / PAGE_SIZE));
  }

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    const pages = totalPages();
    for (let i=0; i<pages; i++){
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(i+1);
      if (i === ST.page) btn.classList.add('btn-solid');
      btn.addEventListener('click', async ()=>{
        await ensureHaveRowsForPage(i);
        ST.page = i;
        renderPage();
      });
      nav.appendChild(btn);
    }
  }

  function renderPage(){
    ul.innerHTML = '';

    if (!ST.totalCount){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    const start = ST.page * PAGE_SIZE;
    const end   = Math.min(start + PAGE_SIZE, ST.rows.length);
    const slice = ST.rows.slice(start, end);

    if (!slice.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">Loading…</div>`;
      ul.appendChild(li);
    } else {
      slice.forEach(r=>{
        const rank = RANKS?.[String(r.id)] ?? null;
        const li = document.createElement('li'); li.className = 'list-item';
        li.innerHTML =
          FF.thumb64(`${CFG.SOURCE_PATH}/frog/${r.id}.png`, `Frog ${r.id}`) +
          `<div>
            <div style="display:flex;align-items:center;gap:8px;">
              <b>Frog #${r.id}</b> ${pillRank(rank)}
            </div>
            <div class="muted">Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}</div>
          </div>
          <div class="price">Staked</div>`;
        ul.appendChild(li);
      });
    }

    renderPager();
  }

  // ---------- counting helpers (for full pager upfront) ----------
  async function fetchStakedCountFast(){
    // Try owners endpoint (fast, single call)
    const qs = new URLSearchParams({ collection: COLLECTION, owner: CONTROLLER });
    const res = await fetch(`${API_OWNERS}?${qs.toString()}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`owners ${res.status}`);
    const j = await res.json();
    // Defensive parsing: look for tokenCount in owners list
    const owners = j?.owners || j?.data || [];
    const row = owners.find(o => (o.owner || o.address || '').toLowerCase() === CONTROLLER);
    const count = Number(row?.tokenCount ?? row?.count ?? 0);
    if (!Number.isFinite(count)) throw new Error('owners count parse');
    return count;
  }

  async function fetchStakedCountFallback(){
    // Walk tokens (200 per page) just to count quickly (light payload, once)
    let continuation = '';
    let count = 0;
    for (let i=0; i<50; i++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit: '200' });
      if (continuation) qs.set('continuation', continuation);
      const res = await fetch(`${API_TOKENS(CONTROLLER)}?${qs.toString()}`, { headers: apiHeaders() });
      if (!res.ok) throw new Error(`tokens ${res.status}`);
      const j = await res.json();
      const tokens = j?.tokens || [];
      count += tokens.length;
      continuation = j?.continuation || '';
      if (!continuation) break;
    }
    return count;
  }

  async function getStakedCount(){
    try { return await fetchStakedCountFast(); }
    catch { return await fetchStakedCountFallback(); }
  }

  // ---------- activity crawl (build rows lazily) ----------
  function pushCandidate(a){
    const tok = a?.token?.tokenId;
    if (!tok) return;
    const id = Number(tok);
    if (!Number.isFinite(id)) return;

    const to   = (a?.toAddress   || '').toLowerCase();
    const from = (a?.fromAddress || '').toLowerCase();

    // Outbound from controller => block this id
    if (from === CONTROLLER){
      ST.blockedIds.add(id);
      // also remove if it was previously added
      const idx = ST.rows.findIndex(r => r.id === id);
      if (idx >= 0) ST.rows.splice(idx, 1);
      return;
    }

    // Inbound to controller => add if not blocked and not already listed
    if (to === CONTROLLER && !ST.blockedIds.has(id)){
      if (!ST.rows.some(r => r.id === id)){
        const since = a?.createdAt ? new Date(a.createdAt)
                    : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        ST.rows.push({ id, staker: a?.fromAddress || null, since });
      }
    }
  }

  function sortRows(){
    ST.rows.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return tb - ta;
    });
  }

  async function fetchActivityPage(){
    const qs = new URLSearchParams({
      users: CONTROLLER,
      collection: COLLECTION,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (ST.nextContinuation) qs.set('continuation', ST.nextContinuation);

    const res = await fetch(`${API_ACTIVITY}?${qs.toString()}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`activity ${res.status}`);
    const j = await res.json();
    const acts = j?.activities || [];
    // process newest -> older as returned
    for (const a of acts) pushCandidate(a);
    sortRows();
    ST.nextContinuation = j?.continuation || '';
    return acts.length;
  }

  async function ensureHaveRowsForPage(pageIndex){
    const need = Math.min(ST.totalCount, (pageIndex + 1) * PAGE_SIZE);
    // fetch activity pages until we have enough currently-staked rows to cover requested page
    let guard = 0;
    while (ST.rows.length < need && ST.nextContinuation && guard < 200){
      guard++;
      await fetchActivityPage();
    }
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      // load ranks (optional)
      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      // reset
      ST.rows = [];
      ST.page = 0;
      ST.nextContinuation = '';
      ST.blockedIds = new Set();

      // get count so we can render all pager buttons up-front
      ST.totalCount = await getStakedCount();
      renderPager();

      if (!ST.totalCount){
        renderPage(); // prints "No frogs…"
        return;
      }

      // fill first page worth of rows and render
      await ensureHaveRowsForPage(0);
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }
  }

  loadPond();
  window.FF_reloadPond = loadPond;
})(window.FF, window.FF_CFG);
