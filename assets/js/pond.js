// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config / guards ----------
  const API = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE = 20; // reservoir max per call

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    // paged results built strictly from activity (20 newest per page)
    pages: [],                 // [{ rows: [{id, staker, since}], contIn: string|null, contOut: string|null }]
    page: 0,
    // tokens that we've already determined are NOT in controller,
    // because we saw a *newer* outbound event for them.
    blockedIds: new Set(),
    // continuation pointer for the next not-yet-fetched activity page
    nextContinuation: ''
  };

  let RANKS = null;

  // ---------- small UI helpers ----------
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

    // numbered buttons for pages we have
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

    // Add "Next" number (pre-create) if there is more to fetch
    if (ST.nextContinuation){
      const nextIdx = ST.pages.length + 1;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(nextIdx);
      btn.title = 'Load more';
      btn.addEventListener('click', async ()=>{
        // fetch next page then go to it
        const ok = await fetchNextPage();
        if (ok){
          ST.page = ST.pages.length - 1;
          renderPage();
        }
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

  // ---------- activity fetch & selection logic ----------
  // We walk activities newest -> older. For each token:
  //  - If the newest-seen event is outbound (from controller), the token is NOT currently staked => block it.
  //  - If the newest-seen event is inbound (to controller) and token not blocked, we take it with {staker, since}.
  // We carry `blockedIds` across pages so older pages won’t re-add withdrawn tokens.
  function selectCurrentlyStakedFromActivities(activities){
    // keep in-page dedupe so we don’t double-handle the same token in one batch
    const seenThisPage = new Set();
    const out = [];

    for (const a of activities){
      const tok = a?.token?.tokenId;
      if (!tok) continue;
      const id = Number(tok);
      if (!Number.isFinite(id)) continue;
      if (seenThisPage.has(id)) continue; // already decided on this page
      seenThisPage.add(id);

      const to  = (a?.toAddress   || '').toLowerCase();
      const from= (a?.fromAddress || '').toLowerCase();

      // outbound from controller? then block it globally
      if (from === CONTROLLER){
        ST.blockedIds.add(id);
        continue;
      }

      // inbound to controller? if not blocked, accept as currently staked
      if (to === CONTROLLER){
        if (!ST.blockedIds.has(id)){
          const since = a?.createdAt ? new Date(a.createdAt)
                      : (a?.timestamp ? new Date(a.timestamp*1000) : null);
          out.push({ id, staker: a?.fromAddress || null, since });
        }
      }
    }

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
    // Try to get a page that yields at least 1 “currently staked” row.
    // If a page yields 0 (because all 20 were outbound), we keep pulling until we either
    //  - get at least 1 inbound row, or
    //  - run out of continuation.
    let cont = ST.nextContinuation || '';
    for (let safety=0; safety<50; safety++){
      const { activities, continuation } = await fetchActivitiesPage(cont);
      cont = continuation;

      const rows = selectCurrentlyStakedFromActivities(activities);
      // Sort newest first (activities already newest first, but be explicit by time)
      rows.sort((a,b)=>{
        const ta = a.since ? a.since.getTime() : 0;
        const tb = b.since ? b.since.getTime() : 0;
        return tb - ta;
      });

      // record page even if empty (so pager can still advance)
      ST.pages.push({ rows, contIn: ST.nextContinuation || null, contOut: cont || null });
      ST.nextContinuation = cont;

      if (rows.length > 0 || !cont) return true; // page ready
    }
    return false;
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
      try {
        RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
      } catch { RANKS = {}; }

      // reset state
      ST.pages = [];
      ST.page = 0;
      ST.blockedIds = new Set();
      ST.nextContinuation = '';

      // first page
      const ok = await fetchNextPage();
      if (!ok){
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
