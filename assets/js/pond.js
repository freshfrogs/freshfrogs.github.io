// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const API = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE  = 20; // reservoir max per call

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    pages: [],                 // [{ rows: [{id, staker, since}], contIn: string|null, contOut: string|null }]
    page: 0,
    nextContinuation: '',      // continuation string for next fetch
    blockedIds: new Set(),     // tokens that later left controller
    acceptedIds: new Set()     // tokens we've already accepted (dedupe across pages)
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

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    // numbered page buttons for pages we have fetched
    ST.pages.forEach((_, i)=>{
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(i+1);
      if (i === ST.page) btn.classList.add('btn-solid');
      btn.addEventListener('click', ()=>{
        if (ST.page !== i){
          ST.page = i;
          renderPage();
        }
      });
      nav.appendChild(btn);
    });

    // "Load More" if continuation available
    if (ST.nextContinuation){
      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-ghost btn-sm';
      loadBtn.textContent = 'Load More';
      loadBtn.title = 'Fetch more staked frogs';
      loadBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          // jump to the newly added page
          ST.page = ST.pages.length - 1;
          renderPage();
        }
      });
      nav.appendChild(loadBtn);
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

      // Outbound from controller ⇒ not staked
      if (from === CONTROLLER){
        ST.blockedIds.add(id);
        continue;
      }

      // Inbound to controller ⇒ accept if not blocked and not already accepted
      if (to === CONTROLLER){
        if (!ST.blockedIds.has(id) && !ST.acceptedIds.has(id)){
          const since = a?.createdAt ? new Date(a.createdAt)
                      : (a?.timestamp ? new Date(a.timestamp*1000) : null);
          out.push({ id, staker: a?.fromAddress || null, since });
          ST.acceptedIds.add(id);
        }
      }
    }

    // newest first
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
    let cont = ST.nextContinuation || '';
    // try up to a few pages until we either get some rows or run out
    for (let safety=0; safety<20; safety++){
      const { activities, continuation } = await fetchActivitiesPage(cont);
      cont = continuation;

      const rows = selectCurrentlyStakedFromActivities(activities);
      ST.pages.push({ rows, contIn: ST.nextContinuation || null, contOut: cont || null });
      ST.nextContinuation = cont;

      // even if rows are empty, we consider the page fetched (to keep chronology);
      // but we return true once we fetched at least one page
      return true;
    }
    return false;
  }

  async function prefetchInitialPages(n=3){
    for (let i=0; i<n; i++){
      const ok = await fetchNextPage();
      if (!ok || !ST.nextContinuation) break;
    }
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      if (!CFG.FROG_API_KEY) {
        ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key. Set <code>FROG_API_KEY</code> in config.js.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // load ranks (optional)
      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      // reset state
      ST.pages = [];
      ST.page = 0;
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      // prefetch first 3 pages so pager shows: [1] [2] [3] [Load More]
      await prefetchInitialPages(3);

      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }
  }

  // autorun & expose
  loadPond();
  window.FF_reloadPond = loadPond;

})(window.FF, window.FF_CFG);
