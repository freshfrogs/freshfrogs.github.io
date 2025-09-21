// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- state ----------
  const ST = {
    rows: [],           // [{ id, staker, since: Date|null }]
    page: 0,
    pageSize: 10
  };

  let RANKS = null;

  // ---------- helpers ----------
  async function loadRanks(){
    if (RANKS) return RANKS;
    try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
    catch { RANKS = {}; }
    return RANKS;
  }

  function headers(){
    if (!CFG.FROG_API_KEY) {
      throw new Error('Missing CFG.FROG_API_KEY in config.js');
    }
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
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

  function buildPager(){
    const total = ST.rows.length;
    const pages = Math.max(1, Math.ceil(total / ST.pageSize));
    const nav = ensurePager();
    nav.innerHTML = '';

    if (pages <= 1) { return; }

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

  // ---------- Reservoir fetchers ----------
  // 1) IDs currently held by controller (fast way to know "what's staked now")
  async function fetchControllerTokenIds(limitPerPage = 200, maxPages = 30){
    const out = [];
    let continuation = '';
    const base = `https://api.reservoir.tools/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8`;

    for (let i=0; i<maxPages; i++){
      const p = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        limit: String(limitPerPage)
      });
      if (continuation) p.set('continuation', continuation);

      const res = await fetch(`${base}?${p.toString()}`, { headers: headers() });
      if (!res.ok) throw new Error(`Reservoir tokens ${res.status}`);
      const json = await res.json();

      const arr = (json?.tokens || [])
        .map(t => {
          const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
          return tokenId!=null ? Number(tokenId) : null;
        })
        .filter(Number.isFinite);

      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // 2) Activity pages (limit **20** per page, with continuation) to find last transfer INTO controller
  async function fetchStakeActivitiesToController({neededIdsSet, maxPages = 250} = {}){
    // Map tokenId -> { staker, since: Date }
    const map = new Map();
    if (!neededIdsSet || neededIdsSet.size === 0) return map;

    let continuation = '';
    const base = `https://api.reservoir.tools/users/activity/v6`;
    const limit = 20; // <= MAX for this endpoint

    // We iterate newest->older until we've found an inbound event for each needed token, or we exhaust pages.
    for (let i=0; i<maxPages; i++){
      const qs = new URLSearchParams({
        users: CFG.CONTROLLER_ADDRESS,
        collection: CFG.COLLECTION_ADDRESS,
        types: 'transfer',
        limit: String(limit)
      });
      if (continuation) qs.set('continuation', continuation);

      const res = await fetch(`${base}?${qs.toString()}`, { headers: headers() });
      if (!res.ok) throw new Error(`Reservoir activity ${res.status}`);
      const json = await res.json();

      const activities = json?.activities || [];
      // Activities are typically returned newest first
      for (const a of activities){
        const to = (a?.toAddress || '').toLowerCase();
        if (to !== CFG.CONTROLLER_ADDRESS.toLowerCase()) continue; // only inbound transfers to controller
        const idStr = a?.token?.tokenId;
        if (!idStr) continue;
        const id = Number(idStr);
        if (!Number.isFinite(id)) continue;
        if (!neededIdsSet.has(id)) continue; // only care about tokens currently held
        if (map.has(id)) continue; // we already captured the newest inbound

        const from = a?.fromAddress || null;
        const since = a?.createdAt ? new Date(a.createdAt) :
                      (a?.timestamp ? new Date(a.timestamp*1000) : null);

        map.set(id, { staker: from, since });
        // Fast exit if we've got everything
        if (map.size === neededIdsSet.size) break;
      }

      continuation = json?.continuation || '';
      if (!continuation || map.size === neededIdsSet.size) break;
    }

    return map;
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      if (!CFG.FROG_API_KEY) {
        ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key. Set <code>FROG_API_KEY</code> in config.js</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      await loadRanks();

      // Step 1: which token IDs are in the controller right now?
      const ids = await fetchControllerTokenIds(); // (200 per page; OK for this endpoint)
      const needed = new Set(ids);

      // Step 2: pull activity in pages of 20 to find newest inbound per token
      const actMap = await fetchStakeActivitiesToController({ neededIdsSet: needed, maxPages: 250 });

      // Build rows
      const rows = ids.map(id => {
        const meta = actMap.get(id) || { staker: null, since: null };
        return { id, ...meta };
      });

      // Newest staked first
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
