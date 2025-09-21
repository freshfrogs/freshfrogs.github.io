// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ----------------- config
  const PAGE_SIZE = 10;
  const RES_LIMIT = 200;     // Reservoir page size
  const MAX_RES_PAGES = 50;  // safety cap
  const ENRICH_CONCURRENCY = 6;

  // ----------------- state
  const ST = {
    ids: [],               // all controller-held token IDs
    page: 0,               // current page (0-based)
    ranks: null,           // { "123": 456, ... }
    inflight: new Map(),   // id -> promise
    fetchingIds: false,
    allIdsLoaded: false
  };

  // ----------------- helpers
  const hasKey = ()=> !!CFG.FROG_API_KEY && CFG.FROG_API_KEY !== 'YOUR_RESERVOIR_API_KEY_HERE';

  function fmtAgo(date){
    if (!date) return '—';
    const ms = Date.now() - date.getTime();
    const s = Math.floor(ms/1000); if (s < 60) return s+'s ago';
    const m = Math.floor(s/60);    if (m < 60) return m+'m ago';
    const h = Math.floor(m/60);    if (h < 24) return h+'h ago';
    const d = Math.floor(h/24);    return d+'d ago';
  }

  function pillRank(rank){
    return (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
  }

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

  function buildPager(){
    const total = ST.ids.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const nav = ensurePager();
    nav.innerHTML = '';

    if (pages <= 1) return;

    for (let i = 0; i < pages; i++){
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
    }
  }

  // ----------------- ranks
  async function loadRanks(){
    if (ST.ranks) return ST.ranks;
    try {
      ST.ranks = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
    } catch {
      ST.ranks = {};
    }
    return ST.ranks;
  }

  // ----------------- reservoir (IDs only)
  async function fetchControllerTokenIds({limit=RES_LIMIT, continuation=''} = {}){
    const key = CFG.FROG_API_KEY;
    const base = `https://api.reservoir.tools/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8`;
    const qs = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      limit: String(limit)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${base}?${qs.toString()}`, {
      headers: { accept:'*/*', 'x-api-key': key }
    });
    if (!res.ok) throw new Error('Reservoir tokens '+res.status);
    const json = await res.json();

    const ids = (json?.tokens || [])
      .map(t => {
        const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        return tokenId != null ? Number(tokenId) : null;
      })
      .filter(Number.isFinite);

    return { ids, continuation: json?.continuation || '' };
  }

  // ----------------- enrichment via YOUR contract helpers
  // expects global: stakerAddress(id) -> address|false, timeStaked(id) -> Date|0.00
  async function enrichOne(id){
    if (ST.inflight.has(id)) return ST.inflight.get(id);

    const p = (async ()=>{
      let staker = null, since = null;
      try {
        const s = await stakerAddress(id);
        staker = s || null;
      } catch {}

      try {
        const ts = await timeStaked(id);
        if (ts && typeof ts === 'object' && typeof ts.getTime === 'function'){
          since = ts;
        } else {
          since = null;
        }
      } catch {}

      return { id, staker, since };
    })();

    ST.inflight.set(id, p);
    return p;
  }

  // concurrency limiter for visible page
  async function enrichPage(ids){
    const results = new Array(ids.length);
    let i = 0;

    async function worker(){
      while (i < ids.length){
        const idx = i++;
        results[idx] = await enrichOne(ids[idx]).catch(()=>({id:ids[idx],staker:null,since:null}));
      }
    }
    const workers = Array.from({length: Math.min(ENRICH_CONCURRENCY, ids.length)}, worker);
    await Promise.all(workers);
    return results;
  }

  // ----------------- render
  async function renderPage(){
    ul.innerHTML = '';

    if (!ST.ids.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    await loadRanks();

    const start = ST.page * PAGE_SIZE;
    const end   = Math.min(start + PAGE_SIZE, ST.ids.length);
    const slice = ST.ids.slice(start, end);

    // Placeholders first (fast paint)
    for (const id of slice){
      const rank = ST.ranks?.[String(id)] ?? null;
      const li = document.createElement('li'); li.className='list-item'; li.id = `pond-row-${id}`;
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b> ${pillRank(rank)}
          </div>
          <div class="muted">Loading staker…</div>
        </div>
        <div class="price">Staked</div>`;
      ul.appendChild(li);
    }

    // Enrich this page via your contract helpers
    const rows = await enrichPage(slice);
    rows.forEach(row=>{
      const rank = ST.ranks?.[String(row.id)] ?? null;
      const li = document.getElementById(`pond-row-${row.id}`);
      if (!li) return;
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${row.id}.png`, `Frog ${row.id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${row.id}</b> ${pillRank(rank)}
          </div>
          <div class="muted">Staked ${fmtAgo(row.since)} • Staker ${row.staker ? FF.shorten(String(row.staker)) : '—'}</div>
        </div>
        <div class="price">Staked</div>`;
    });

    buildPager();
  }

  // progressively fetch IDs from reservoir; render page 1 ASAP
  async function loadIds(){
    if (!hasKey()){
      ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key.</div></li>`;
      ensurePager().innerHTML = '';
      return;
    }
    if (ST.fetchingIds) return;
    ST.fetchingIds = true;

    try{
      let continuation = '';
      let pass = 0;

      do{
        const { ids, continuation: next } = await fetchControllerTokenIds({ continuation });
        if (ids.length){
          const wasEmpty = (ST.ids.length === 0);
          ST.ids.push(...ids);
          if (wasEmpty){
            ST.page = 0;
            renderPage();           // paint ASAP with first chunk
          } else {
            buildPager();           // update page numbers as total grows
          }
        }
        continuation = next;
        pass++;
      } while (continuation && pass < MAX_RES_PAGES);

      ST.allIdsLoaded = true;

      if (!ST.ids.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // make sure we render the current page (in case the very first chunk was empty)
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }finally{
      ST.fetchingIds = false;
    }
  }

  // autorun & expose
  loadIds();
  window.FF_reloadPond = loadIds;
})(window.FF, window.FF_CFG);
