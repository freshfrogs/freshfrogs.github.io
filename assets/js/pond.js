// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // -------- config / provider --------
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK ?? 15209637);
  const CONTROLLER  = String(CFG.CONTROLLER_ADDRESS).toLowerCase();
  const COLLECTION  = CFG.COLLECTION_ADDRESS;

  function getProvider(){
    if (CFG.RPC_URL) {
      try { return new ethers.providers.StaticJsonRpcProvider(CFG.RPC_URL); } catch {}
    }
    if (window.ethereum) return new ethers.providers.Web3Provider(window.ethereum);
    return null;
  }

  // -------- state --------
  const ST = {
    ids: [],          // from Reservoir (fast list of tokenIds)
    rows: null,       // direct enriched rows (used by fallback) [{id, staker, since}]
    cache: new Map(), // id -> { id, staker, since }
    page: 0,
    pageSize: 10,
    loadingPage: false
  };

  let RANKS = null;

  // -------- helpers --------
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

  function buildPager(total){
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

  function rowHTML(r){
    const rank = RANKS?.[String(r.id)] ?? null;
    return (
      FF.thumb64(`${CFG.SOURCE_PATH}/frog/${r.id}.png`, `Frog ${r.id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;">
          <b>Frog #${r.id}</b> ${pillRank(rank)}
        </div>
        <div class="muted">
          Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}
        </div>
      </div>
      <div class="price">Staked</div>`
    );
  }

  // -------- Reservoir: list token IDs owned by controller --------
  async function fetchControllerTokens(limitPerPage = 200, maxPages = 30){
    const key = CFG.FROG_API_KEY;
    if (!key) return [];
    const out = [];
    let continuation = '';
    const base = 'https://api.reservoir.tools/tokens/v7';

    for (let i=0; i<maxPages; i++){
      const p = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: CFG.CONTROLLER_ADDRESS,
        limit: String(limitPerPage),
        includeTopBid: 'false',
        includeAttributes: 'false'
      });
      if (continuation) p.set('continuation', continuation);
      const res = await fetch(`${base}?${p.toString()}`, {
        headers: { accept:'*/*', 'x-api-key': key }
      });
      if (!res.ok) throw new Error('Reservoir '+res.status);
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

  // -------- on-chain utilities (fallback + enrichment) --------
  function iface(){
    return new ethers.utils.Interface([
      'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
    ]);
  }

  // Fallback: derive full set (and staker/since) directly from logs
  async function deriveCurrentStakedSet(){
    const provider = getProvider();
    if (!provider) return [];

    const ifc = iface();
    const topicTransfer = ifc.getEventTopic('Transfer');
    const controllerTopic = ethers.utils.hexZeroPad(CONTROLLER, 32);

    // 1) all transfers TO controller
    const logsIn = await provider.getLogs({
      fromBlock: START_BLOCK,
      toBlock: 'latest',
      address: COLLECTION,
      topics: [ topicTransfer, null, controllerTopic, null ]
    });

    // 2) all transfers FROM controller (unstake)
    const logsOut = await provider.getLogs({
      fromBlock: START_BLOCK,
      toBlock: 'latest',
      address: COLLECTION,
      topics: [ topicTransfer, controllerTopic, null, null ]
    });

    const all = logsIn.concat(logsOut).sort((a,b)=>{
      if (a.blockNumber!==b.blockNumber) return a.blockNumber-b.blockNumber;
      return a.logIndex-b.logIndex;
    });

    const live = new Map(); // id -> { id, staker, since }
    for (const log of all){
      let parsed; try { parsed = ifc.parseLog(log); } catch { continue; }
      const from = String(parsed.args.from || '').toLowerCase();
      const to   = String(parsed.args.to   || '').toLowerCase();
      const id   = Number(parsed.args.tokenId);
      if (!Number.isFinite(id)) continue;

      if (to === CONTROLLER){
        const blk = await provider.getBlock(log.blockNumber);
        live.set(id, { id, staker: parsed.args.from, since: new Date(blk.timestamp*1000) });
      } else if (from === CONTROLLER){
        live.delete(id);
      }
    }
    return [...live.values()].sort((a,b)=>{
      const ta=a.since?+a.since:0, tb=b.since?+b.since:0;
      return tb-ta;
    });
  }

  // Enrich the current page only (one getLogs with OR over tokenIds, then batched getBlock)
  async function enrichCurrentPage(){
    const provider = getProvider();
    if (!provider) return;
    if (!ST.ids.length) return;
    const start = ST.page * ST.pageSize;
    const end   = Math.min(start + ST.pageSize, ST.ids.length);
    const pageIds = ST.ids.slice(start, end).filter(id=>!ST.cache.has(id));
    if (!pageIds.length) return;

    ST.loadingPage = true;
    try{
      const ifc = iface();
      const topicTransfer = ifc.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CONTROLLER, 32);
      const idTopics = pageIds.map(id=>{
        const hexId = ethers.BigNumber.from(String(id)).toHexString();
        return ethers.utils.hexZeroPad(hexId, 32);
      });

      const logs = await provider.getLogs({
        fromBlock: START_BLOCK,
        toBlock:   'latest',
        address:   COLLECTION,
        topics:    [ topicTransfer, null, toTopic, idTopics ]
      });

      const lastById = new Map();
      for (const log of logs){
        let parsed; try { parsed = ifc.parseLog(log); } catch { continue; }
        const id = Number(parsed.args.tokenId);
        if (!Number.isFinite(id)) continue;
        const prev = lastById.get(id);
        if (!prev || log.blockNumber > prev.blockNumber || (log.blockNumber===prev.blockNumber && log.logIndex>prev.logIndex)){
          lastById.set(id, log);
        }
      }

      const needed = pageIds.filter(id => !ST.cache.has(id));
      const blockNums = [...new Set(needed.map(id => lastById.get(id)?.blockNumber).filter(Boolean))];
      const blockMap = new Map();
      await Promise.all(blockNums.map(async bn=>{
        try { blockMap.set(bn, await provider.getBlock(bn)); } catch {}
      }));

      needed.forEach(id=>{
        const log = lastById.get(id);
        if (!log){ ST.cache.set(id, { id, staker:null, since:null }); return; }
        let parsed; try { parsed = ifc.parseLog(log); } catch { parsed = null; }
        const staker = parsed?.args?.from ?? null;
        const blk = blockMap.get(log.blockNumber);
        const since = blk ? new Date(blk.timestamp*1000) : null;
        ST.cache.set(id, { id, staker, since });
      });

      // update visible rows
      ul.querySelectorAll('li.list-item').forEach(li=>{
        const id = Number(li.dataset.id);
        const row = ST.cache.get(id);
        if (row){ li.innerHTML = rowHTML(row); }
      });
    } finally {
      ST.loadingPage = false;
    }
  }

  // -------- rendering --------
  function renderFromRows(){ // fallback path uses ST.rows directly
    ul.innerHTML = '';
    const total = ST.rows?.length || 0;
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
      const li = document.createElement('li'); li.className = 'list-item';
      li.innerHTML = rowHTML(r);
      ul.appendChild(li);
    });
    buildPager(total);
  }

  function renderPage(){ // reservoir path uses ST.ids + cache
    if (ST.rows) { renderFromRows(); return; }
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

  // -------- main --------
  async function loadPond(){
    try{
      await loadRanks();

      // 1) try Reservoir first (fast)
      let ids = [];
      try { ids = await fetchControllerTokens(); } catch(e){ console.warn('Reservoir error', e); }
      if (Array.isArray(ids) && ids.length){
        ST.ids = ids;
        ST.rows = null;
        ST.page = 0;
        renderPage();     // immediate placeholders
        return;
      }

      // 2) fallback to on-chain derivation (slower, but reliable)
      const rows = await deriveCurrentStakedSet();
      ST.rows = rows;
      ST.ids = [];
      ST.page = 0;
      renderFromRows();
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
