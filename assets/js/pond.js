// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const KEY = CFG.FROG_API_KEY;
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK ?? 0);

  // ---------- state ----------
  const ST = {
    rows: [],        // [{id, staker, since: Date|null}]
    page: 0,
    pageSize: 10
  };
  let RANKS = null;

  // ---------- tiny cache (localStorage) ----------
  const CACHE_KEY = 'FF_POND_CACHE_V1';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  function readCache(){
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function writeCache(obj){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch {}
  }
  function getCached(id){
    const c = readCache();
    const hit = c[id];
    if (!hit) return null;
    if ((Date.now() - (hit.t||0)) > CACHE_TTL_MS) return null;
    return hit;
  }
  function setCached(id, data){
    const c = readCache();
    c[id] = { ...data, t: Date.now() };
    writeCache(c);
  }

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

  // ---------- Reservoir: get the current staked set (IDs) ----------
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

  // ---------- On-chain enrichment (via window.ethereum) ----------
  function getProvider(){
    if (window.ethereum) return new ethers.providers.Web3Provider(window.ethereum);
    return null;
  }

  // Minimal ABIs
  const IFACE = new ethers.utils.Interface([
    'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
  ]);
  const CTRL_IFACE = new ethers.utils.Interface([
    'function stakerAddress(uint256) view returns (address)'
  ]);

  function topicsForTransferTo(controllerAddr, tokenIdHex){
    const sig = IFACE.getEventTopic('Transfer');
    const toTopic = ethers.utils.hexZeroPad(controllerAddr, 32);
    return [ sig, null, toTopic, tokenIdHex ];
  }

  // Limit concurrency
  function limit(fn, n){
    let active = 0, queue = [];
    const next = ()=> {
      if (!queue.length || active >= n) return;
      active++;
      const {args, resolve, reject} = queue.shift();
      Promise.resolve(fn(...args)).then(
        v => { active--; resolve(v); next(); },
        e => { active--; reject(e); next(); }
      );
    };
    return (...args)=> new Promise((resolve,reject)=>{
      queue.push({args, resolve, reject});
      next();
    });
  }

  async function enrichForId(provider, controller, id){
    // cache first
    const cached = getCached(id);
    if (cached) {
      return {
        id,
        staker: cached.staker || null,
        since: cached.since ? new Date(cached.since) : null
      };
    }

    const tokenIdHex = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);

    // 1) staker via controller view
    let staker = null;
    try {
      const ctrl = new ethers.Contract(CFG.CONTROLLER_ADDRESS, CTRL_IFACE, provider);
      staker = await ctrl.stakerAddress(id);
      if (staker && /^0x0{40}$/i.test(staker)) staker = null;
    } catch {}

    // 2) since via last Transfer(..., to=controller, tokenId=id)
    let since = null;
    try {
      const logs = await provider.getLogs({
        fromBlock: START_BLOCK || 0,
        toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: topicsForTransferTo(CFG.CONTROLLER_ADDRESS, tokenIdHex)
      });
      if (logs.length){
        const last = logs[logs.length - 1];
        const blk = await provider.getBlock(last.blockNumber);
        since = new Date(blk.timestamp * 1000);
      }
    } catch {}

    setCached(id, { staker, since: since ? since.toISOString() : null });
    return { id, staker, since };
  }

  async function enrichAll(ids){
    const provider = getProvider();
    if (!provider) {
      // No RPC — return rows without enrichment
      return ids.map(id => ({ id, staker: null, since: null }));
    }
    const run = limit((id)=>enrichForId(provider, CFG.CONTROLLER_ADDRESS, id), 6);
    return Promise.all(ids.map(id => run(id)));
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

      // 2) Enrich (staker + since) with caching + limited concurrency
      const rows = await enrichAll(ids);

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
