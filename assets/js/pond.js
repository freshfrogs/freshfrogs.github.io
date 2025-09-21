(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const KEY = CFG.FROG_API_KEY;

  // ---------- state ----------
  const ST = {
    rows: [],        // [{id, staker, since: Date|null}]
    page: 0,
    pageSize: 10
  };
  let RANKS = null;

  // ---------- helpers ----------
  async function loadRanks() {
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

  // ---------- Reservoir fetches (no RPC) ----------
  // 1) IDs currently owned by controller
  async function fetchControllerTokenIds(limitPerPage = 200, maxPages = 30){
    if (!KEY) return [];
    const out = [];
    let continuation = '';
    const base = `https://api.reservoir.tools/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8`;

    for (let i=0; i<maxPages; i++){
      const p = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        limit: String(limitPerPage),
        includeTopBid: 'false'
      });
      if (continuation) p.set('continuation', continuation);

      const res = await fetch(`${base}?${p.toString()}`, {
        headers: { accept:'*/*', 'x-api-key': KEY }
      });
      if (!res.ok) throw new Error('Reservoir tokens '+res.status);
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

  // 2) Latest transfers *to* controller (derive staker + since) — try multiple endpoints defensively
  async function fetchTransfersToController({limit=1000, maxPages=10} = {}){
    if (!KEY) return new Map();

    const cAddr = CFG.CONTROLLER_ADDRESS;
    const col   = CFG.COLLECTION_ADDRESS;

    // Robust field getters (Reservoir versions differ slightly)
    const getList = (j)=> j?.activities || j?.events || j?.transfers || [];
    const getTokenId = (a)=> {
      const tid = a?.token?.tokenId ?? a?.tokenId ?? a?.event?.token?.tokenId ?? a?.event?.tokenId;
      return tid!=null ? Number(tid) : null;
    };
    const getFrom = (a)=> a?.fromAddress || a?.from || a?.event?.fromAddress || a?.event?.from || null;
    const getTo   = (a)=> a?.toAddress   || a?.to   || a?.event?.toAddress   || a?.event?.to   || null;
    const getTime = (a)=> a?.createdAt   || a?.timestamp || a?.event?.createdAt || null;

    async function pull(endpoint){
      const out = [];
      let continuation = '';
      for (let i=0; i<maxPages; i++){
        const url = continuation ? `${endpoint}&continuation=${encodeURIComponent(continuation)}` : endpoint;
        const res = await fetch(url, { headers:{ accept:'*/*', 'x-api-key': KEY } });
        if (!res.ok) throw new Error('Reservoir activities '+res.status);
        const json = await res.json();
        const list = getList(json);
        out.push(...list);
        continuation = json?.continuation || '';
        if (!continuation) break;
      }
      return out;
    }

    // Try: global activities with filters
    const q1 = new URLSearchParams({
      types: 'transfer',
      collection: col,
      to: cAddr,
      limit: String(limit)
    });
    const EP1 = `https://api.reservoir.tools/activities/v7?${q1.toString()}`;

    // Fallback: activities scoped to user (controller)
    const q2 = new URLSearchParams({
      types: 'transfer',
      collection: col,
      limit: String(limit)
    });
    const EP2 = `https://api.reservoir.tools/users/${cAddr}/activities/v7?${q2.toString()}`;

    // Fallback: collection activity (filter client-side)
    const q3 = new URLSearchParams({
      types: 'transfer',
      limit: String(limit)
    });
    const EP3 = `https://api.reservoir.tools/collections/${col}/activity/v7?${q3.toString()}`;

    let acts = [];
    try { acts = await pull(EP1); }
    catch { try { acts = await pull(EP2); } catch { acts = await pull(EP3); } }

    // Build "latest transfer to controller" map
    const latest = new Map(); // id -> { staker, since: Date }
    for (const a of acts){
      const to = (getTo(a)||'').toLowerCase();
      if (to !== cAddr.toLowerCase()) continue; // only TO controller
      const id = getTokenId(a);
      if (!Number.isFinite(id)) continue;
      if (latest.has(id)) continue; // lists arrive newest-first
      const from = getFrom(a) || null;
      const when = getTime(a);
      latest.set(id, { staker: from, since: when ? new Date(when) : null });
    }
    return latest;
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      await loadRanks();

      // 1) IDs actually owned by the controller (current staked set)
      const ids = await fetchControllerTokenIds();

      // If nothing, render empty
      if (!ids.length){
        ST.rows = [];
        ST.page = 0;
        renderPage();
        return;
      }

      // 2) Latest transfer TO controller => staker + since (no RPC)
      const latestMap = await fetchTransfersToController();

      // 3) Join
      const rows = ids.map(id=>{
        const hit = latestMap.get(id);
        return {
          id,
          staker: hit?.staker || null,
          since: hit?.since || null
        };
      });

      // newest staked first
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
