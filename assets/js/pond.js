// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // -------- config
  const PAGE_SIZE = 10;
  const TOKENS_PER_RES_PAGE = 200;   // reservoir tokens page size
  const MAX_TOKEN_PAGES = 50;        // safety cap

  // -------- state
  const ST = {
    ids: [],            // all controller-held token IDs
    page: 0,            // current page index (0-based)
    ranks: null,        // lookup { [id]: rankNumber }
    fetchingIds: false,
    allIdsLoaded: false,
    inflightEnrich: new Map(), // id -> promise
  };

  // -------- helpers
  const hasKey = ()=> !!CFG.FROG_API_KEY && CFG.FROG_API_KEY !== 'YOUR_RESERVOIR_API_KEY_HERE';

  function fmtAgo(date){
    if (!date) return '—';
    const ms = Date.now() - date.getTime();
    const s = Math.floor(ms/1000); if (s<60) return s+'s ago';
    const m = Math.floor(s/60);    if (m<60) return m+'m ago';
    const h = Math.floor(m/60);    if (h<24) return h+'h ago';
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

    if (pages <= 1) return; // nothing to show

    for (let i=0; i<pages; i++){
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

  // -------- ranks
  async function loadRanks(){
    if (ST.ranks) return ST.ranks;
    try {
      ST.ranks = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
    } catch {
      ST.ranks = {};
    }
    return ST.ranks;
  }

  // -------- reservoir fetches
  async function fetchControllerTokenIds({limit=TOKENS_PER_RES_PAGE, continuation=''} = {}){
    const key = CFG.FROG_API_KEY;
    const base = 'https://api.reservoir.tools/tokens/v7';
    const qs = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      owner: CFG.CONTROLLER_ADDRESS,
      limit: String(limit),
      includeTopBid: 'false'
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
        return tokenId!=null ? Number(tokenId) : null;
      })
      .filter(Number.isFinite);
    return { ids, continuation: json?.continuation || '' };
  }

  // get last inbound transfer to controller for a single token
  async function fetchStakeActivityForId(id){
    const key = CFG.FROG_API_KEY;
    const base = 'https://api.reservoir.tools/activities/v7';
    const tokenParam = `${CFG.COLLECTION_ADDRESS}:${id}`;
    const qs = new URLSearchParams({
      types: 'transfer',
      token: tokenParam,
      limit: '20',              // grab a few, filter for "to=controller"
      sortBy: 'eventTimestamp',
      sortDirection: 'desc'
    });
    const res = await fetch(`${base}?${qs.toString()}`, {
      headers: { accept:'*/*', 'x-api-key': key }
    });
    if (!res.ok) throw new Error('Reservoir activities '+res.status);
    const json = await res.json();
    const acts = json?.activities || [];
    // find most recent transfer where "to" is controller
    let found = null;
    for (const a of acts){
      const toAddr = a?.toAddress || a?.to?.address || a?.to;
      if (toAddr && String(toAddr).toLowerCase() === String(CFG.CONTROLLER_ADDRESS).toLowerCase()){
        const from = a?.fromAddress || a?.from?.address || a?.from || null;
        const tsRaw = a?.eventTimestamp || a?.timestamp || a?.createdAt || null;
        let when = null;
        if (tsRaw){
          const t = Date.parse(tsRaw);
          when = Number.isNaN(t) ? null : new Date(t);
        }
        found = { staker: from, since: when };
        break;
      }
    }
    return found || { staker: null, since: null };
  }

  function enrich(id){
    if (ST.inflightEnrich.has(id)) return ST.inflightEnrich.get(id);
    const p = fetchStakeActivityForId(id).catch(()=>({staker:null,since:null}));
    ST.inflightEnrich.set(id, p);
    return p;
  }

  // -------- render
  async function renderPage(){
    ul.innerHTML = '';

    // Nothing yet?
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
    const subset = ST.ids.slice(start, end);

    // Show placeholders first for faster paint
    for (const id of subset){
      const li = document.createElement('li'); li.className='list-item'; li.id = `pond-row-${id}`;
      const rank = ST.ranks?.[String(id)] ?? null;
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

    // Enrich visible rows with staker + since (Reservoir activities)
    subset.forEach(async (id)=>{
      const row = await enrich(id);
      const li = document.getElementById(`pond-row-${id}`);
      if (!li) return;
      const rank = ST.ranks?.[String(id)] ?? null;
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b> ${pillRank(rank)}
          </div>
          <div class="muted">Staked ${fmtAgo(row.since)} • Staker ${row.staker ? FF.shorten(String(row.staker)) : '—'}</div>
        </div>
        <div class="price">Staked</div>`;
    });

    buildPager();
  }

  // progressively fetch all controller-held IDs (render as we go)
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
      let pageCount = 0;

      do{
        const { ids, continuation: next } = await fetchControllerTokenIds({ continuation });
        if (ids.length){
          // append & render only if this is the first chunk
          const wasEmpty = (ST.ids.length === 0);
          ST.ids.push(...ids);
          if (wasEmpty){
            ST.page = 0;
            renderPage();
          } else {
            // if current page wasn't filled before, re-render to include new items
            buildPager();
          }
        }
        continuation = next;
        pageCount++;
      } while (continuation && pageCount < MAX_TOKEN_PAGES);

      ST.allIdsLoaded = true;

      // if nothing came back at all
      if (!ST.ids.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // Make sure current page is rendered (in case we started with empty)
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }finally{
      ST.fetchingIds = false;
    }
  }

  // autorun and expose
  loadIds();
  window.FF_reloadPond = loadIds;
})(window.FF, window.FF_CFG);
