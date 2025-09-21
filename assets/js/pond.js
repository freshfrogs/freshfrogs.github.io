// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const API = 'https://api.reservoir.tools';
  const KEY = CFG.FROG_API_KEY;

  // --- UI state ---
  const PAGE_SIZE = 20; // 20 frogs per page
  const ST = {
    pages: [],         // Array< Array<{id, staker, since: Date}> >
    pageIndex: 0,      // current visible page
    // activity scanning state
    continuation: '',  // Reservoir continuation for next activity slice
    done: false,       // true when no more activity to scan
    // dedupe/logic
    seenOut: new Set(),   // tokenIds that have a newer "from controller" (unstaked)
    seenLive: new Set(),  // tokenIds already captured as live on some page
  };

  // Ranks
  let RANKS = null;
  async function loadRanks(){
    if (RANKS) return RANKS;
    try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
    catch { RANKS = {}; }
    return RANKS;
  }

  // --- formatting helpers ---
  const fmtAgo = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '—';
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function ensurePager(){
    let nav = document.getElementById('pondPager');
    if (!nav){
      nav = document.createElement('div');
      nav.id = 'pondPager';
      nav.className = 'row';
      nav.style.marginTop = '8px';
      wrap.appendChild(nav);
    }
    return nav;
  }

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';
    const totalPages = ST.pages.length || 1;

    for (let i=0; i<totalPages; i++){
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = String(i+1);
      if (i === ST.pageIndex) b.classList.add('btn-solid');
      b.addEventListener('click', ()=> {
        ST.pageIndex = i;
        renderPage();
      });
      nav.appendChild(b);
    }

    // Add "Next" if we haven't exhausted activity
    if (!ST.done){
      const next = document.createElement('button');
      next.className = 'btn btn-outline btn-sm';
      next.textContent = 'Next »';
      next.addEventListener('click', async ()=>{
        const ok = await buildNextPage(); // fetch/scan to produce page n+1
        if (ok){ ST.pageIndex = ST.pages.length - 1; renderPage(); }
      });
      nav.appendChild(next);
    }
  }

  function renderPage(){
    ul.innerHTML = '';
    const page = ST.pages[ST.pageIndex] || [];

    if (!page.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    page.forEach(r=>{
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

    renderPager();
  }

  // --- Reservoir activity fetch (paged) ---
  function parseTime(a){
    // handle multiple possible fields
    const raw = a?.eventTimestamp || a?.timestamp || a?.createdAt;
    const t = Date.parse(raw);
    return Number.isNaN(t) ? null : new Date(t);
  }
  function getTokenId(a){
    const tid = a?.token?.tokenId ?? a?.tokenId;
    const n = Number(tid);
    return Number.isFinite(n) ? n : null;
  }
  function isToController(a){
    const to = (a?.toAddress || a?.to)?.toLowerCase?.();
    return to === CFG.CONTROLLER_ADDRESS.toLowerCase();
  }
  function isFromController(a){
    const from = (a?.fromAddress || a?.from)?.toLowerCase?.();
    return from === CFG.CONTROLLER_ADDRESS.toLowerCase();
  }

  async function fetchActivitySlice(limit=200){
    const params = new URLSearchParams({
      users: CFG.CONTROLLER_ADDRESS,
      collection: CFG.COLLECTION_ADDRESS,
      types: 'transfer',
      sortDirection: 'desc',
      limit: String(limit)
    });
    if (ST.continuation) params.set('continuation', ST.continuation);

    const url = `${API}/users/activity/v6?${params.toString()}`;
    const res = await fetch(url, { headers: { accept:'*/*', 'x-api-key': KEY } });
    if (!res.ok) throw new Error(`Reservoir activity ${res.status}`);
    const json = await res.json();
    ST.continuation = json.continuation || '';
    if (!ST.continuation) ST.done = true;
    return (json.activities || []);
  }

  // Build the next page (20 unique live-staked frogs) by scanning activity
  async function buildNextPage(){
    const pageRows = [];

    while (pageRows.length < PAGE_SIZE){
      // Pull more activity if we ran out of buffered items
      if (!ST._buf || ST._buf.length === 0){
        if (ST.done) break; // nothing more to scan
        try {
          ST._buf = await fetchActivitySlice(200); // one request feeds multiple pages
        } catch (e){
          console.warn('Activity fetch failed', e);
          ST.done = true;
          break;
        }
        if (!ST._buf.length){ ST.done = true; break; }
      }

      // Consume buffered activities (newest → older)
      const a = ST._buf.shift();
      const id = getTokenId(a);
      if (!id) continue;

      // If the controller sent it out later than any "to", it's not staked
      if (isFromController(a)){
        ST.seenOut.add(id);
        // also remove if we accidentally added it earlier (rare ordering case)
        // (pageRows) and (seenLive) are pruned implicitly by logic below
        continue;
      }

      // Consider only transfers into controller
      if (!isToController(a)) continue;

      // If we've seen a newer "from controller" for this token, skip (no longer staked)
      if (ST.seenOut.has(id)) continue;

      // Already captured on a previous page?
      if (ST.seenLive.has(id)) continue;

      const since = parseTime(a);
      const staker = (a?.fromAddress || a?.from) || null;

      ST.seenLive.add(id);
      pageRows.push({ id, staker, since });
    }

    if (!pageRows.length) return false;

    ST.pages.push(pageRows);
    return true;
  }

  async function init(){
    try{
      await loadRanks();

      // Build the first page immediately
      const ok = await buildNextPage();
      if (!ok){
        // Show empty state
        ST.pages = [[]];
      }
      ST.pageIndex = 0;
      renderPage();
    }catch(e){
      console.warn('Pond init failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }
  }

  // autorun + expose manual reload (resets state)
  init();
  window.FF_reloadPond = async function(){
    ST.pages = [];
    ST.pageIndex = 0;
    ST.seenOut.clear();
    ST.seenLive.clear();
    ST.continuation = '';
    ST.done = false;
    ST._buf = [];
    await init();
  };

})(window.FF, window.FF_CFG);
