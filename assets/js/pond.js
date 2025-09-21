// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  const API = 'https://api.reservoir.tools';
  const KEY = CFG.FROG_API_KEY;

  // ------- pager state -------
  const PAGE_SIZE = 20;
  const ST = {
    pages: [],              // Array<Array<Row>>
    pageIndex: 0,
    continuations: [''],    // one per page-start; index i holds continuation used to fetch page i
    exhausted: false,
    blockTsCache: new Map(), // blockNumber -> Date
  };

  // ------- ranks -------
  let RANKS = null;
  async function loadRanks(){
    if (RANKS) return RANKS;
    try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
    catch { RANKS = {}; }
    return RANKS;
  }

  // ------- provider / contracts (read-only) -------
  let provider, ctrlContract;
  function ensureProvider(){
    if (provider) return provider;
    try{
      if (window.ethereum){
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      }else{
        // public RPC (no key required)
        provider = new ethers.providers.JsonRpcProvider('https://cloudflare-eth.com');
      }
    }catch(e){ console.warn(e); }
    return provider;
  }
  function ensureController(){
    if (ctrlContract) return ctrlContract;
    const prov = ensureProvider();
    if (!prov) return null;
    const abi = [
      // minimal view we need
      {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
    ];
    ctrlContract = new ethers.Contract(CFG.CONTROLLER_ADDRESS, abi, prov);
    return ctrlContract;
  }

  // ------- UI helpers -------
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

    // numbered buttons for the pages we've fetched
    for (let i=0; i<ST.pages.length; i++){
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = String(i+1);
      if (i === ST.pageIndex) b.classList.add('btn-solid');
      b.addEventListener('click', ()=>{ ST.pageIndex = i; renderPage(); });
      nav.appendChild(b);
    }

    // fetch more if not exhausted
    if (!ST.exhausted){
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-outline btn-sm';
      nextBtn.textContent = 'Next »';
      nextBtn.addEventListener('click', async ()=>{
        nextBtn.disabled = true;
        const ok = await buildPage(ST.pages.length); // build page N (0-based)
        nextBtn.disabled = false;
        if (ok){ ST.pageIndex = ST.pages.length - 1; renderPage(); }
      });
      nav.appendChild(nextBtn);
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

  // ------- Reservoir tokens (controller-owned) -------
  async function fetchControllerTokensPage(limit, continuation){
    const base = `${API}/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8`;
    const params = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      limit: String(limit)
    });
    if (continuation) params.set('continuation', continuation);

    const res = await fetch(`${base}?${params.toString()}`, {
      headers: { accept: '*/*', 'x-api-key': KEY }
    });
    if (!res.ok) throw new Error(`Reservoir tokens ${res.status}`);

    const json = await res.json();
    const ids = (json.tokens || [])
      .map(t => {
        const tid = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        const n = Number(tid);
        return Number.isFinite(n) ? n : null;
      })
      .filter(n => n !== null);

    return { ids, continuation: json.continuation || '' };
  }

  // ------- staker + since enrichment (per visible token only) -------
  async function getStakerFor(id){
    // prefer user-provided helper if present
    if (typeof window.stakerAddress === 'function'){
      try {
        const a = await window.stakerAddress(id);
        if (a && typeof a === 'string' && a !== '0x0000000000000000000000000000000000000000') return a;
      }catch{}
    }
    const ctrl = ensureController();
    if (!ctrl) return null;
    try{
      const addr = await ctrl.stakerAddress(ethers.BigNumber.from(String(id)));
      if (addr && addr !== '0x0000000000000000000000000000000000000000') return addr;
      return null;
    }catch{ return null; }
  }

  const IFACE = new ethers.utils.Interface([
    'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
  ]);
  const TRANSFER_TOPIC = IFACE.getEventTopic('Transfer');

  async function getLastStakeDate(id){
    // prefer user's helper if available
    if (typeof window.timeStaked === 'function'){
      try{
        const d = await window.timeStaked(id);
        if (d && !Number.isNaN(Date.parse(d))) return new Date(d);
      }catch{}
    }

    const prov = ensureProvider();
    if (!prov) return null;

    const fromBlock = (CFG.COLLECTION_START_BLOCK ?? 0);
    const toTopic   = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
    const idTopic   = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);

    try{
      const logs = await prov.getLogs({
        fromBlock, toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: [ TRANSFER_TOPIC, null, toTopic, idTopic ]
      });
      if (!logs.length) return null;
      const last = logs[logs.length - 1];

      // cache block timestamps
      const bn = last.blockNumber;
      if (ST.blockTsCache.has(bn)) return ST.blockTsCache.get(bn);

      const blk = await prov.getBlock(bn);
      const when = new Date(blk.timestamp * 1000);
      ST.blockTsCache.set(bn, when);
      return when;
    }catch(e){
      console.warn('getLastStakeDate failed for', id, e);
      return null;
    }
  }

  async function enrichRows(ids){
    const out = [];
    for (const id of ids){
      const [staker, since] = await Promise.all([
        getStakerFor(id),
        getLastStakeDate(id)
      ]);
      out.push({ id, staker, since });
    }
    // newest first by since
    out.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return tb - ta;
    });
    return out;
  }

  // Build page N (0-based); uses ST.continuations[N] input and stores N+1
  async function buildPage(n){
    try{
      const startCont = ST.continuations[n] ?? '';
      const { ids, continuation } = await fetchControllerTokensPage(PAGE_SIZE, startCont);

      // if nothing, mark exhausted and push empty page to keep numbering consistent
      if (!ids.length){
        ST.exhausted = true;
        ST.pages[n] = [];
        return false;
      }

      const rows = await enrichRows(ids);
      ST.pages[n] = rows;
      ST.continuations[n+1] = continuation || '';
      if (!continuation) ST.exhausted = true;
      return true;
    }catch(e){
      console.warn('buildPage failed', e);
      ST.pages[n] = [];
      return false;
    }
  }

  async function init(){
    try{
      await loadRanks();
      // first page
      const ok = await buildPage(0);
      if (!ok && ST.pages[0]?.length === 0){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }
      ST.pageIndex = 0;
      renderPage();
    }catch(e){
      console.warn('Pond init failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }
  }

  // autorun + expose reload
  init();
  window.FF_reloadPond = async function(){
    ST.pages = [];
    ST.pageIndex = 0;
    ST.continuations = [''];
    ST.exhausted = false;
    ST.blockTsCache.clear();
    await init();
  };

})(window.FF, window.FF_CFG);
