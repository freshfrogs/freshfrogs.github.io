// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // -------- state --------
  const ST = {
    rows: [],      // [{ id, staker, since: Date|null }]
    page: 0,
    pageSize: 10
  };
  let RANKS = null;

  // -------- helpers --------
  async function loadRanks(){
    if (RANKS) return RANKS;
    try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
    catch { RANKS = {}; }
    return RANKS;
  }

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

  function buildPager(){
    const total = ST.rows.length;
    const pages = Math.max(1, Math.ceil(total / ST.pageSize));
    const nav = ensurePager();
    nav.innerHTML = '';
    if (pages <= 1) return;

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

  function renderPage(){
    ul.innerHTML = '';
    const total = ST.rows.length;

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
    const pageRows = ST.rows.slice(start, end);

    pageRows.forEach(r=>{
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

    buildPager();
  }

  // -------- Reservoir fetchers --------
  function headers(){
    return {
      accept: '*/*',
      'x-api-key': CFG.FROG_API_KEY || 'demo-api-key'
    };
  }

  // Current staked IDs = tokens owned by controller
  async function fetchControllerTokenIds(limitPerPage = 200, maxPages = 40){
    const addr = CFG.CONTROLLER_ADDRESS;
    const col  = CFG.COLLECTION_ADDRESS;
    const base = `https://api.reservoir.tools/users/${addr}/tokens/v8`;
    const ids = [];
    let cont = '';
    for (let i=0; i<maxPages; i++){
      const qs = new URLSearchParams({
        collection: col,
        limit: String(limitPerPage),
        includeTopBid: 'false'
      });
      if (cont) qs.set('continuation', cont);
      const url = `${base}?${qs.toString()}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error(`Reservoir tokens ${res.status}`);
      const json = await res.json();
      const arr = (json?.tokens || [])
        .map(t => {
          const idStr = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
          const n = idStr!=null ? Number(idStr) : NaN;
          return Number.isFinite(n) ? n : null;
        })
        .filter(n => n!=null);
      ids.push(...arr);
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return ids;
  }

  // Build a map tokenId → { staker, since } from activity
  async function fetchInboundTransfersMap(desiredCount, perPage=1000, maxPages=50){
    const addr = CFG.CONTROLLER_ADDRESS;
    const col  = CFG.COLLECTION_ADDRESS;
    const base = `https://api.reservoir.tools/users/activity/v6?users=${addr}&collection=${col}&types=transfer&limit=${perPage}&sortBy=eventTimestamp`;
    const map  = new Map();
    let cont = '';
    for (let i=0; i<maxPages; i++){
      const url = cont ? `${base}&continuation=${encodeURIComponent(cont)}` : base;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error(`Reservoir activity ${res.status}`);
      const json = await res.json();
      const acts = json?.activities || [];

      // activities are newest → oldest; first time we see a tokenId
      // with toAddress==controller is the most recent STAKE event
      for (const a of acts){
        if (!a || a.type!=='transfer') continue;
        if (!a.toAddress || a.toAddress.toLowerCase() !== addr.toLowerCase()) continue;
        const idStr = a?.token?.tokenId ?? a?.tokenId;
        const id = idStr!=null ? Number(idStr) : NaN;
        if (!Number.isFinite(id)) continue;
        if (!map.has(id)){
          const staker = a.fromAddress || null;
          const since  = a.timestamp ? new Date(a.timestamp*1000)
                                     : (a.createdAt ? new Date(a.createdAt) : null);
          map.set(id, { staker, since });
        }
      }

      // stop early once we have enough
      if (map.size >= desiredCount) break;

      cont = json?.continuation || '';
      if (!cont) break;
    }
    return map;
  }

  // Optional: fill gaps via your on-chain helpers if present (no-op if not defined)
  async function optionalEnrichGaps(rows){
    const hasStaker = typeof window.stakerAddress === 'function';
    const hasTime   = typeof window.timeStaked === 'function';
    if (!hasStaker && !hasTime) return rows;

    // limit concurrency to avoid provider rate limits
    const queue = rows.filter(r => !r.staker || !r.since);
    const CHUNK = 6;
    for (let i=0; i<queue.length; i+=CHUNK){
      const slice = queue.slice(i, i+CHUNK);
      await Promise.all(slice.map(async r=>{
        try{
          if (!r.staker && hasStaker){
            const s = await window.stakerAddress(r.id);
            if (s) r.staker = s;
          }
          if (!r.since && hasTime){
            const d = await window.timeStaked(r.id);
            if (d && !Number.isNaN(new Date(d).getTime())) r.since = new Date(d);
          }
        }catch(_e){}
      }));
    }
    return rows;
  }

  // -------- main --------
  async function loadPond(){
    try{
      await loadRanks();

      // 1) which frogs are staked now?
      const ids = await fetchControllerTokenIds();
      if (!ids.length){
        ST.rows = [];
        ST.page = 0;
        renderPage();
        return;
      }

      // 2) pull most-recent inbound transfer per token via activity API
      const inboundMap = await fetchInboundTransfersMap(ids.length);

      // 3) build rows; fill from activity, optionally patch gaps via your helpers
      let rows = ids.map(id=>{
        const info = inboundMap.get(id);
        return { id, staker: info?.staker ?? null, since: info?.since ?? null };
      });

      rows = await optionalEnrichGaps(rows);

      // 4) newest staked first
      rows.sort((a,b)=>{
        const ta = a.since ? a.since.getTime() : 0;
        const tb = b.since ? b.since.getTime() : 0;
        return tb - ta;
      });

      ST.rows = rows;
      ST.page = 0;
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
