// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const API = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE = 20;            // endpoint max
  const PREFETCH_MAX_PAGES = 50;   // safety cap for the pager crawl

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    // built “content” pages (processed with staked selection)
    pages: [],                 // [{ rows: [{id, staker, since}] }]
    page: 0,
    blockedIds: new Set(),     // ids definitely NOT staked (newer outbound seen)
    nextContinuation: '',      // pointer for next fetchNextPage
    // pager crawl results: an ordered list of continuation tokens for page i
    // page 0 uses '', page 1 uses cont[1], etc.
    allContinuations: [],      // ['' , 'cont1', 'cont2', ...]
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

  async function ensurePageLoaded(targetIndex){
    // fetch pages sequentially until targetIndex is available
    while (ST.pages.length <= targetIndex && ST.nextContinuation){
      const ok = await fetchNextPage();
      if (!ok) break;
    }
  }

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    const totalPages =
      (ST.allContinuations && ST.allContinuations.length)
        ? ST.allContinuations.length
        : Math.max(1, ST.pages.length + (ST.nextContinuation ? 1 : 0));

    for (let i=0; i<totalPages; i++){
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(i+1);

      // visually emphasize loaded vs not-yet-loaded
      if (i < ST.pages.length) btn.classList.add('btn-solid');
      if (i === ST.page) btn.classList.add('btn-solid');

      btn.addEventListener('click', async ()=>{
        // must process sequentially to maintain correct blockedIds logic
        await ensurePageLoaded(i);
        ST.page = Math.min(i, ST.pages.length - 1);
        renderPage();
      });
      nav.appendChild(btn);
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

    const page = ST.pages[ST.page];
    const rows = page?.rows || [];

    if (!rows.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs on this page.</div>`;
      ul.appendChild(li);
    } else {
      rows.forEach(r=>{
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

  // ---------- activity helpers ----------
  function selectCurrentlyStakedFromActivities(activities){
    // newest -> older
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

      // outbound from controller? not staked anymore
      if (from === CONTROLLER){
        ST.blockedIds.add(id);
        continue;
      }
      // inbound to controller? staked unless already blocked by newer outbound
      if (to === CONTROLLER && !ST.blockedIds.has(id)){
        const since = a?.createdAt ? new Date(a.createdAt)
                    : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        out.push({ id, staker: a?.fromAddress || null, since });
      }
    }

    // newest first by time
    out.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return tb - ta;
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

    const res = await fetch(`${API}?${qs.toString()}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`Reservoir activity ${res.status}`);
    const json = await res.json();
    return { activities: json?.activities || [], continuation: json?.continuation || '' };
  }

  async function fetchNextPage(){
    // pull one activity page and build a content page from it
    const { activities, continuation } = await fetchActivitiesPage(ST.nextContinuation || '');
    const rows = selectCurrentlyStakedFromActivities(activities);

    ST.pages.push({ rows });
    ST.nextContinuation = continuation || '';

    return true;
  }

  // Crawl just to learn how many pages we have (store the continuation chain).
  async function prefetchPagerContinuations(){
    const conts = ['']; // page 0 uses ''
    let cont = '';
    for (let i=0; i<PREFETCH_MAX_PAGES; i++){
      const { continuation } = await fetchActivitiesPage(cont);
      if (!continuation){
        break;
      }
      cont = continuation;
      conts.push(cont);
    }
    ST.allContinuations = conts; // e.g., ['', cont1, cont2, ...]
    // Set nextContinuation to the first not-yet-fetched page (page 0 is '' and not yet fetched here)
    ST.nextContinuation = '';
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

      // reset state
      ST.pages = [];
      ST.page = 0;
      ST.blockedIds = new Set();
      ST.nextContinuation = '';
      ST.allContinuations = [];

      // crawl pager first so we can show all page numbers immediately
      await prefetchPagerContinuations();

      // fetch the first page content
      await fetchNextPage();

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
