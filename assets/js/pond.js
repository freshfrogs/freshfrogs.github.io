// assets/js/pond.js
(function(FF, CFG){
  const ul = document.getElementById('pondList');
  if (!ul) return;

  let RANKS = null;

  // ---------- helpers ----------
  async function loadRanks() {
    if (RANKS) return RANKS;
    try {
      // tokenId -> rank (string keys are fine)
      RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
    } catch {
      RANKS = {};
    }
    return RANKS;
  }
  const fmtAgo = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '—';
  const pillRank = (rank)=> (rank||rank===0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function render(rows){
    ul.innerHTML = '';
    if (!rows.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      return;
    }
    rows.forEach(r=>{
      const rank = RANKS?.[String(r.id)] ?? null;
      const li = document.createElement('li'); li.className='list-item';
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
  }

  // ---------- 1) Reservoir: tokens owned by controller ----------
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
    // Use MetaMask if present; read-only access doesn’t require user approval
    if (window.ethereum) return new ethers.providers.Web3Provider(window.ethereum);
    // If no wallet, we can’t safely query chain without an RPC key; return null
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

  // scan logs to compute the *current* set of tokens held by controller
  async function deriveCurrentStakedSet(){
    const provider = getProvider();
    if (!provider) return [];

    const fromBlock = (CFG.COLLECTION_START_BLOCK ?? 0);
    const controller = CFG.CONTROLLER_ADDRESS;
    const ifc = iface();

    // 1) All transfers IN to controller (to = controller)
    const logsIn = await provider.getLogs({
      fromBlock, toBlock:'latest', address: CFG.COLLECTION_ADDRESS,
      topics: topicsFor({from:null, to:controller, tokenId:null})
    });
    // 2) All transfers OUT from controller (from = controller)
    const logsOut = await provider.getLogs({
      fromBlock, toBlock:'latest', address: CFG.COLLECTION_ADDRESS,
      topics: topicsFor({from:controller, to:null, tokenId:null})
    });

    // Merge & sort by (blockNumber, logIndex)
    const all = logsIn.concat(logsOut).sort((a,b)=>{
      if (a.blockNumber!==b.blockNumber) return a.blockNumber-b.blockNumber;
      return a.logIndex-b.logIndex;
    });

    // Walk logs to build live set + remember last staker+time on IN edges
    const live = new Map(); // id -> {id, staker, since}
    for (const log of all){
      let parsed;
      try { parsed = ifc.parseLog(log); } catch { continue; }
      const from = parsed.args.from;
      const to   = parsed.args.to;
      const id   = Number(parsed.args.tokenId);
      if (!Number.isFinite(id)) continue;

      if (to?.toLowerCase() === controller.toLowerCase()){
        // now held by controller
        const blk = await provider.getBlock(log.blockNumber);
        live.set(id, { id, staker: from, since: new Date(blk.timestamp*1000) });
      } else if (from?.toLowerCase() === controller.toLowerCase()){
        // left controller custody
        live.delete(id);
      }
    }

    return [...live.values()];
  }

  // If we only have the list of ids (e.g. from Reservoir), fetch staker+since for each
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

      // 1) Try Reservoir first
      let ids = [];
      try { ids = await fetchControllerTokens(); } catch(e){ console.warn('Reservoir error', e); }

      let rows;
      if (ids && ids.length){
        // Enrich with staker+since via on-chain lookups
        rows = await enrichStakeInfoForIds(ids);
      } else {
        // 2) Fallback to pure on-chain derivation (no Reservoir)
        rows = await deriveCurrentStakedSet();
      }

      // Sort newest staked first (most recent since at top)
      rows.sort((a,b)=>{
        const ta = a.since ? a.since.getTime() : 0;
        const tb = b.since ? b.since.getTime() : 0;
        return tb - ta;
      });

      render(rows);
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
    }
  }

  // auto-run
  loadPond();
  window.FF_reloadPond = loadPond;
})(window.FF, window.FF_CFG);
