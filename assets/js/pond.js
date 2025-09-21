// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // --- Reservoir endpoints (correct paths) ---
  const API_ACTIVITY = 'https://api.reservoir.tools/users/activity/v6';
  const API_OWNERS   = 'https://api.reservoir.tools/owners/v2';

  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE  = 20; // activity limit

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    rows: [],                // [{id, staker, since: Date|null}]
    totalCount: 0,
    page: 0,
    nextContinuation: null,  // null => we haven’t fetched yet
    blockedIds: new Set(),   // tokenIds that later left the controller
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

  // ---------- get exact count so we can render ALL pager buttons up-front ----------
  async function fetchStakedCountFast(){
    // Correct path: /owners/v2?collection=...
    let continuation = '';
    for (let i=0; i<50; i++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit: '200' });
      if (continuation) qs.set('continuation', continuation);

      const res = await fetch(`${API_OWNERS}?${qs.toString()}`, { headers: apiHeaders() });
      if (!res.ok) throw new Error(`owners ${res.status}`);

      const j = await res.json();
      const owners = j?.owners || [];
      // Reservoir responses sometimes use either `address` or `owner`
      const hit = owners.find(o =>
        ((o.address||'').toLowerCase() === CONTROLLER) ||
        ((o.owner||'').toLowerCase()   === CONTROLLER)
      );
      if (hit){
        const count = Number(hit?.ownership?.tokenCount ?? hit?.tokenCount ?? hit?.count ?? 0);
        return Number.isFinite(count) ? count : 0;
      }

      continuation = j?.continuation || '';
      if (!continuation) break;
    }
    return 0;
  }

  async function getStakedCount(){
    try { return await fetchStakedCountFast(); }
    catch { return 0; }
  }

  // ---------- activity crawl (derive staker + since) ----------
  function pushCandidate(a){
    const tok = a?.token?.tokenId;
    if (!tok) return;
    const id = Number(tok);
    if (!Number.isFinite(id)) return;

    const to   = (a?.toAddress   || '').toLowerCase();
    const from = (a?.fromAddress || '').toLowerCase();

    // If it left the controller later, it’s not staked anymore
    if (from === CONTROLLER){
      ST.blockedIds.add(id);
      const idx = ST.rows.findIndex(r => r.id === id);
      if (idx >= 0) ST.rows.splice(idx, 1);
      return;
    }

    // If it entered the controller (and hasn’t left), consider it staked
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

    for (const a of acts) pushCandidate(a);
    sortRows();

    ST.nextContinuation = j?.continuation || null;
    return acts.length;
  }

  async function ensureHaveRowsForPage(pageIndex){
    const need = Math.min(ST.totalCount, (pageIndex + 1) * PAGE_SIZE);
    let guard = 0;

    // Keep fetching activity pages until we have enough rows or there’s nothing more
    while (ST.rows.length < need && guard < 200){
      guard++;
      const got = await fetchActivityPage();
      if (!got) break; // no more history
    }
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      // ranks (optional)
      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      // reset
      ST.rows = [];
      ST.page = 0;
      ST.nextContinuation = null;
      ST.blockedIds = new Set();

      // Get exact count (so we can build ALL pager buttons now)
      ST.totalCount = await getStakedCount();
      renderPager();

      if (!ST.totalCount){
        renderPage(); // prints “No frogs…”
        return;
      }

      // Prefill page 1
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
