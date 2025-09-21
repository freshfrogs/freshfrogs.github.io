// assets/js/pond.js
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

  // ---------- Reservoir fetches (CORS-friendly) ----------
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

  // 2) Collection activity (transfer events). Filter client-side to TO = controller.
  async function fetchTransfersToController({limit=1000, maxPages=10} = {}){
    if (!KEY) return new Map();

    const cAddr = CFG.CONTROLLER_ADDRESS.toLowerCase();
    const col   = CFG.COLLECTION_ADDRESS;

    // field getters (cover v7 shapes)
    const getList = (j)=> j?.activities || j?.events || j?.transfers || [];
    const getTokenId = (a)=> {
      const tid = a?.token?.tokenId ?? a?.tokenId ?? a?.event?.token?.tokenId ?? a?.event?.tokenId;
      return tid!=null ? Number(tid) : null;
    };
    const getFrom = (a)=> (a?.fromAddress || a?.from || a?.event?.fromAddress || a?.event?.from || '').toLowerCase();
    const getTo   = (a)=> (a?.toAddress   || a?.to   || a?.event?.toAddress   || a?.event?.to   || '').toLowerCase();
    const getTime = (a)=> a?.createdAt || a?.timestamp || a?.event?.createdAt || null;

    const out = [];
    let continuation = '';
    for (let i=0; i<maxPages; i++){
      const q = new URLSearchParams({
        types: 'transfer',
        limit: String(limit)
      });
      if (continuation) q.set('continuation', continuation);

      const url = `https://api.reservoir.tools/collections/${col}/activity/v7?` + q.toString();
      const res = await fetch(url, { headers:{ accept:'*/*', 'x-api-key': KEY } });
      if (!res.ok) throw new Error('Reservoir activity '+res.status);
      const json = await res.json();
      const list = getList(json);
      out.push(...list);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }

    // Build latest transfer-to-controller map (newest first in response)
    const latest = new Map(); // id -> { staker, since: Date }
    for (const a of out){
      if (getTo(a) !== cAddr) continue;
      const id = getTokenId(a);
      if (!Number.isFinite(id)) continue;
      if (latest.has(id)) continue;
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

      // 1) IDs in controller wallet (current staked set)
      const ids = await fetchControllerTokenIds();

      if (!ids.length){
        ST.rows = [];
        ST.page = 0;
        renderPage();
        return;
      }

      // 2) Latest transfer TO controller => staker + since (via collection activity)
      const latestMap = await fetchTransfersToController();

      // 3) Join & sort
      const rows = ids.map(id=>{
        const hit = latestMap.get(id);
        return { id, staker: hit?.staker || null, since: hit?.since || null };
      }).sort((a,b)=>{
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
