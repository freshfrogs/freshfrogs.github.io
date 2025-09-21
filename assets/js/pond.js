/* global window, document, ethers */
(function (FF, CFG) {
  if (!window.FF) window.FF = {};
  const API = 'https://api.reservoir.tools';
  const HEAD = { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };

  // ---------- Config ----------
  const PAGE_SIZE = 10;
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 0); // 15209637 recommended

  // ---------- State ----------
  const S = {
    ids: [],                 // cached token IDs known so far
    continuation: '',        // reservoir pagination cursor
    page: 0,                 // zero-based page
    totalPagesKnown: 0,      // grows as we learn more IDs
    // memo caches
    stakerById: new Map(),   // tokenId -> address
    sinceById: new Map(),    // tokenId -> Date
  };

  // sessionStorage hydration (optional, makes back/forward snappy)
  try {
    const cache = JSON.parse(sessionStorage.getItem('FF_POND_CACHE') || '{}');
    if (Array.isArray(cache.ids)) S.ids = cache.ids;
    if (typeof cache.continuation === 'string') S.continuation = cache.continuation;
  } catch {}

  function persistCache() {
    try {
      sessionStorage.setItem('FF_POND_CACHE', JSON.stringify({
        ids: S.ids, continuation: S.continuation
      }));
    } catch {}
  }

  // ---------- Small helpers ----------
  const short = (a)=> a ? (String(a).slice(0,6)+'…'+String(a).slice(-4)) : '—';
  const ago = (dt)=>{
    if (!dt) return '—';
    const ms = Date.now() - dt.getTime();
    const s = Math.floor(ms/1000); if (s < 60) return s+'s';
    const m = Math.floor(s/60);    if (m < 60) return m+'m';
    const h = Math.floor(m/60);    if (h < 24) return h+'h';
    const d = Math.floor(h/24);    return d+'d';
  };

  // simple concurrency limiter
  async function withLimit(list, limit, fn){
    const out = []; let i = 0; const pool = new Set();
    while (i < list.length || pool.size){
      while (i < list.length && pool.size < limit){
        const idx = i++; const p = Promise.resolve(fn(list[idx])).then(v=>{ out[idx]=v; pool.delete(p); });
        pool.add(p);
      }
      if (pool.size) await Promise.race(pool);
    }
    return out;
  }

  // ---------- Reservoir: just IDs by owner (controller) ----------
  async function fetchIdsChunk(limit=200, continuation=''){
    const q = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      owner: CFG.CONTROLLER_ADDRESS,
      limit: String(limit),
      includeTopBid: 'false'
    });
    if (continuation) q.set('continuation', continuation);
    const r = await fetch(`${API}/tokens/v7?${q.toString()}`, { headers: HEAD });
    if (!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    const ids = (j.tokens||[])
      .map(t => Number(t?.token?.tokenId))
      .filter(Number.isFinite);
    return { ids, continuation: j.continuation || '' };
  }

  // ensure we have IDs to cover page p
  async function ensureIdsForPage(p){
    const need = (p+1) * PAGE_SIZE;
    while (S.ids.length < need) {
      if (!S.continuation && S.ids.length) break; // no more to fetch
      const { ids, continuation } = await fetchIdsChunk(200, S.continuation);
      S.ids.push(...ids);
      S.continuation = continuation;
      persistCache();
      if (!continuation) break;
    }
    S.totalPagesKnown = Math.max(S.totalPagesKnown, Math.ceil(S.ids.length / PAGE_SIZE));
  }

  // ---------- Ethers (lazy) ----------
  let provider, controller;
  async function ensureEthers(){
    if (provider && controller) return true;
    if (!window.ethereum) return false;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const abi = [
      {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],
       "name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],
       "stateMutability":"view","type":"function"}
    ];
    controller = new ethers.Contract(CFG.CONTROLLER_ADDRESS, abi, provider);
    return true;
  }

  // staker owner (memoized)
  async function getStaker(tokenId){
    if (S.stakerById.has(tokenId)) return S.stakerById.get(tokenId);
    if (!await ensureEthers()) return null;
    try{
      const a = await controller.stakerAddress(ethers.BigNumber.from(String(tokenId)));
      const v = (a && a !== ethers.constants.AddressZero) ? a : null;
      S.stakerById.set(tokenId, v);
      return v;
    }catch{ S.stakerById.set(tokenId, null); return null; }
  }

  // last time token was transferred to controller (memoized)
  async function getStakedSince(tokenId){
    if (S.sinceById.has(tokenId)) return S.sinceById.get(tokenId);
    if (!await ensureEthers()) return null;
    try{
      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);

      const logs = await provider.getLogs({
        fromBlock: START_BLOCK,
        toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (!logs.length){ S.sinceById.set(tokenId, null); return null; }
      const last = logs[logs.length - 1];
      const blk = await provider.getBlock(last.blockNumber);
      const dt = new Date(blk.timestamp * 1000);
      S.sinceById.set(tokenId, dt);
      return dt;
    }catch{ S.sinceById.set(tokenId, null); return null; }
  }

  // ---------- Rendering ----------
  const listEl = document.getElementById('pondList');
  const wrapEl = document.getElementById('pondListWrap');

  function skeletonRow(){
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="thumb64" style="background:var(--panel-2)"></div>
      <div>
        <div style="height:14px;width:160px;background:var(--panel-2);border-radius:6px;margin-bottom:6px"></div>
        <div style="height:12px;width:220px;background:var(--panel-2);border-radius:6px"></div>
      </div>
      <div style="height:14px;width:80px;background:var(--panel-2);border-radius:6px"></div>`;
    return li;
  }

  function renderPager(){
    // build numbered pager for pages we currently know about
    let pager = document.getElementById('pondPager');
    if (!pager){
      pager = document.createElement('div');
      pager.id = 'pondPager';
      pager.className = 'row';
      pager.style.justifyContent = 'center';
      pager.style.marginTop = '10px';
      wrapEl.appendChild(pager);
    }
    pager.innerHTML = '';

    // If we still have continuation, show one extra "…" page that will fetch more on click
    const knownPages = S.totalPagesKnown;
    const extra = S.continuation ? 1 : 0;

    for (let i=0;i<knownPages+extra;i++){
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = (i < knownPages) ? (i+1) : '…';
      if (i === S.page) btn.className = 'btn btn-solid btn-sm';
      btn.addEventListener('click', async ()=>{
        if (i < knownPages){
          await showPage(i);
        } else {
          // fetch more ids then redraw pager
          await ensureIdsForPage(knownPages);
          renderPager();
        }
      });
      pager.appendChild(btn);
    }
  }

  function renderEmpty(){
    listEl.innerHTML = '<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>';
    renderPager();
  }

  async function renderRows(ids){
    // skeletons first
    listEl.innerHTML = '';
    for (let i=0;i<ids.length;i++) listEl.appendChild(skeletonRow());

    // fetch details with concurrency 6
    const rows = await withLimit(ids, 6, async (id) => {
      const [staker, since] = await Promise.all([ getStaker(id), getStakedSince(id) ]);
      const rank = (window.FF_getRankById ? window.FF_getRankById(id) : null);
      return { id, staker, since, rank };
    });

    // paint
    listEl.innerHTML = '';
    rows.forEach(({id, staker, since, rank})=>{
      const li = document.createElement('li'); li.className='list-item';
      const badge = (rank || rank===0)
        ? `<span class="pill">Rank <b>#${rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;">
             <b>Frog #${id}</b> ${badge}
           </div>
           <div class="muted">${since ? `${ago(since)} ago` : '—'} • Owner <span class="addr">${staker?short(staker):'—'}</span></div>
         </div>
         <div class="price"></div>`;
      listEl.appendChild(li);
    });
  }

  async function showPage(p){
    S.page = p;
    // make sure we have IDs for this page
    await ensureIdsForPage(p);
    if (!S.ids.length) { renderEmpty(); return; }
    const start = p * PAGE_SIZE, end = start + PAGE_SIZE;
    const slice = S.ids.slice(start, end);
    if (!slice.length){ renderEmpty(); return; }
    await renderRows(slice);
    renderPager();
  }

  // ---------- Public init ----------
  async function initPond(){
    const statusNode = document.getElementById('pondList');
    if (!statusNode) return;
    // First page
    try{
      await showPage(0);
    }catch(e){
      console.warn('Pond init failed', e);
      renderEmpty();
    }
  }

  // expose
  window.FF_initPond = initPond;

  // auto-init on DOM ready (in case main.js doesn’t call it)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPond, { once:true });
  } else {
    initPond();
  }
})(window.FF || (window.FF = {}), window.FF_CFG);
