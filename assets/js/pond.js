// assets/js/pond.js  — Reservoir-only pond (no RPC/ethers needed)
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ----- state -----
  const ST = {
    ids: [],          // token ids currently owned by controller
    cache: new Map(), // id -> { id, staker, since: Date|null }
    page: 0,
    pageSize: 10,
    loadingPage: false
  };

  let RANKS = null;

  // ----- helpers -----
  async function loadRanks(){
    if (RANKS) return RANKS;
    try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
    catch { RANKS = {}; }
    return RANKS;
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
      nav.style.marginTop = '8px';
      nav.className = 'row';
      wrap.appendChild(nav);
    }
    return nav;
  }

  function buildPager(total){
    const pages = Math.max(1, Math.ceil(total / ST.pageSize));
    const nav = ensurePager();
    nav.innerHTML = '';
    if (pages <= 1) return;
    for (let i=0;i<pages;i++){
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

  function rowHTML(r){
    const rank = RANKS?.[String(r.id)] ?? null;
    return (
      FF.thumb64(`${CFG.SOURCE_PATH}/frog/${r.id}.png`, `Frog ${r.id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;">
          <b>Frog #${r.id}</b> ${pillRank(rank)}
        </div>
        <div class="muted">Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}</div>
      </div>
      <div class="price">Staked</div>`
    );
  }

  // ----- Reservoir calls -----
  const HEADERS = { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY };

  // 1) list tokens where owner == controller
  async function fetchControllerTokens(limitPerPage=200, maxPages=30){
    const out = [];
    let continuation = '';
    const base = 'https://api.reservoir.tools/tokens/v7';
    for (let i=0;i<maxPages;i++){
      const p = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: CFG.CONTROLLER_ADDRESS,
        limit: String(limitPerPage),
        includeTopBid: 'false',
        includeAttributes: 'false'
      });
      if (continuation) p.set('continuation', continuation);
      const r = await fetch(`${base}?${p.toString()}`, { headers: HEADERS });
      if (!r.ok) throw new Error('Reservoir '+r.status);
      const j = await r.json();
      const ids = (j?.tokens||[])
        .map(t => {
          const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
          return tokenId!=null ? Number(tokenId) : null;
        })
        .filter(Number.isFinite);
      out.push(...ids);
      continuation = j?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // 2) for a token id, get last inbound transfer to controller (staker + since)
  async function fetchLastInboundForId(id){
    // We’ll grab latest transfers for this token, then pick the most recent with toAddress == controller
    // Endpoint: /activities/v7?collection=<addr>&token=<addr>:<id>&types=transfer&limit=5&sortBy=eventTimestamp
    const base = 'https://api.reservoir.tools/activities/v7';
    const p = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      token: `${CFG.COLLECTION_ADDRESS}:${id}`,
      types: 'transfer',
      limit: '5',
      sortBy: 'eventTimestamp'
    });
    const r = await fetch(`${base}?${p.toString()}`, { headers: HEADERS });
    if (!r.ok) throw new Error('Reservoir activities '+r.status);
    const j = await r.json();
    const acts = j?.activities || [];
    // newest first is typical; ensure we take the most recent that sent to controller
    const rec = acts.find(a => String(a?.toAddress||a?.to||'').toLowerCase() === String(CFG.CONTROLLER_ADDRESS).toLowerCase());
    if (!rec) return { id, staker: null, since: null };
    const from = rec.fromAddress || rec.from || null;
    const ts   = rec.eventTimestamp || rec.timestamp || rec.createdAt || null;
    const since = ts ? new Date((typeof ts === 'number' ? (ts < 1e12 ? ts*1000 : ts) : Date.parse(ts))) : null;
    return { id, staker: from || null, since };
  }

  // batch helper with small concurrency
  async function pLimit(n, arr, fn){
    const out = []; let i=0; const running = new Set();
    async function run(k){
      const p = Promise.resolve(fn(arr[k])).then(v => { out[k]=v; running.delete(p); });
      running.add(p); await p;
    }
    while(i<arr.length){
      while(running.size < n && i < arr.length){ run(i++); }
      if (running.size) await Promise.race(running);
    }
    return out;
  }

  async function enrichCurrentPage(){
    const start = ST.page * ST.pageSize;
    const end   = Math.min(start + ST.pageSize, ST.ids.length);
    const pageIds = ST.ids.slice(start, end).filter(id=>!ST.cache.has(id));
    if (!pageIds.length) return;

    ST.loadingPage = true;
    try{
      const rows = await pLimit(5, pageIds, fetchLastInboundForId);
      rows.forEach(r => ST.cache.set(r.id, r));
      // swap placeholders
      ul.querySelectorAll('li.list-item').forEach(li=>{
        const id = Number(li.dataset.id);
        const row = ST.cache.get(id);
        if (row) li.innerHTML = rowHTML(row);
      });
    } finally {
      ST.loadingPage = false;
    }
  }

  // ----- render -----
  function renderPage(){
    ul.innerHTML = '';
    const total = ST.ids.length;

    if (!total){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    const start = ST.page * ST.pageSize;
    const end   = Math.min(start + ST.pageSize, total);
    const pageIds = ST.ids.slice(start, end);

    pageIds.forEach(id=>{
      const li = document.createElement('li'); li.className = 'list-item'; li.dataset.id = String(id);
      const cached = ST.cache.get(id);
      li.innerHTML = cached
        ? rowHTML(cached)
        : (FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
           `<div><b>Frog #${id}</b><div class="muted">Loading stake info…</div></div>`);
      ul.appendChild(li);
    });

    buildPager(total);
    if (!ST.loadingPage) enrichCurrentPage().catch(()=>{});
  }

  // ----- main -----
  async function loadPond(){
    try{
      await loadRanks();
      const ids = await fetchControllerTokens();
      ST.ids = Array.isArray(ids) ? ids : [];
      ST.page = 0;
      ST.cache.clear();
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
