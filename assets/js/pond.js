// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // state
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

    // small guard if only one page
    if (pages <= 1) { return; }

    // numbered buttons
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

  // ---------- Reservoir: tokens owned by controller ----------
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
        includeTopBid: 'false'
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

  // ---------- on-chain utilities ----------
  function getProvider(){
    if (window.ethereum) return new ethers.providers.Web3Provider(window.ethereum);
    return null;
  }
  function iface(){
    return new ethers.utils.Interface([
      'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
    ]);
  }
  function topicsFor({from=null,to=null,tokenId=null}){
    const ifc = iface();
    const base = [ ifc.getEventTopic('Transfer') ];
    const f = from ? ethers.utils.hexZeroPad(from, 32) : null;
    const t = to   ? ethers.utils.hexZeroPad(to,   32) : null;
    const id = tokenId!=null
      ? ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32)
      : null;
    return [ base[0], f, t, id ];
  }

  async function deriveCurrentStakedSet(){
    const provider = getProvider();
    if (!provider) return [];

    const fromBlock = (CFG.COLLECTION_START_BLOCK ?? 0);
    const controller = CFG.CONTROLLER_ADDRESS;
    const ifc = iface();

    const logsIn = await provider.getLogs({
      fromBlock, toBlock:'latest', address: CFG.COLLECTION_ADDRESS,
      topics: topicsFor({from:null, to:controller, tokenId:null})
    });
    const logsOut = await provider.getLogs({
      fromBlock, toBlock:'latest', address: CFG.COLLECTION_ADDRESS,
      topics: topicsFor({from:controller, to:null, tokenId:null})
    });

    const all = logsIn.concat(logsOut).sort((a,b)=>{
      if (a.blockNumber!==b.blockNumber) return a.blockNumber-b.blockNumber;
      return a.logIndex-b.logIndex;
    });

    const live = new Map(); // id -> {id, staker, since}
    for (const log of all){
      let parsed;
      try { parsed = ifc.parseLog(log); } catch { continue; }
      const from = parsed.args.from;
      const to   = parsed.args.to;
      const id   = Number(parsed.args.tokenId);
      if (!Number.isFinite(id)) continue;

      if (to?.toLowerCase() === controller.toLowerCase()){
        const blk = await provider.getBlock(log.blockNumber);
        live.set(id, { id, staker: from, since: new Date(blk.timestamp*1000) });
      } else if (from?.toLowerCase() === controller.toLowerCase()){
        live.delete(id);
      }
    }
    return [...live.values()];
  }

  async function enrichStakeInfoForIds(ids){
    const provider = getProvider();
    if (!provider || !ids.length) return [];

    const ifc = iface();
    const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
    const fromBlock = (CFG.COLLECTION_START_BLOCK ?? 0);

    const rows = [];
    for (const id of ids){
      try{
        const idTopic = ethers.utils.hexZeroPad(
          ethers.BigNumber.from(String(id)).toHexString(), 32
        );
        const logs = await provider.getLogs({
          fromBlock, toBlock:'latest', address: CFG.COLLECTION_ADDRESS,
          topics: [ ifc.getEventTopic('Transfer'), null, toTopic, idTopic ]
        });
        if (!logs.length) { rows.push({id, staker:null, since:null}); continue; }
        const last = logs[logs.length-1];
        const parsed = ifc.parseLog(last);
        const staker = parsed.args.from;
        const blk = await provider.getBlock(last.blockNumber);
        rows.push({ id, staker, since: new Date(blk.timestamp*1000) });
      }catch{
        rows.push({ id, staker:null, since:null });
      }
    }
    return rows;
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      await loadRanks();

      let ids = [];
      try { ids = await fetchControllerTokens(); } catch(e){ console.warn('Reservoir error', e); }

      let rows;
      if (ids && ids.length){
        rows = await enrichStakeInfoForIds(ids);
      } else {
        rows = await deriveCurrentStakedSet();
      }

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
