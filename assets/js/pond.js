// assets/js/pond.js
(function(FF, CFG){
  const ul = document.getElementById('pondList');
  if (!ul) return;

  let RANKS = null;

  async function loadRanks() {
    if (RANKS) return RANKS;
    try {
      const data = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
      // File is { "3090":1, "2917":2, ... } mapping tokenId -> rank
      RANKS = data || {};
    } catch {
      RANKS = {};
    }
    return RANKS;
  }

  // -------- Reservoir: all tokens owned by controller (staked set) --------
  async function fetchControllerTokens(limitPerPage = 200, maxPages = 30){
    const out = [];
    const key = CFG.FROG_API_KEY;
    if (!key) return out;

    let continuation = '';
    const base = 'https://api.reservoir.tools/tokens/v7';

    for (let i=0; i<maxPages; i++){
      const params = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: CFG.CONTROLLER_ADDRESS,
        limit: String(limitPerPage),
        includeTopBid: 'false'
      });
      if (continuation) params.set('continuation', continuation);

      const res = await fetch(`${base}?${params.toString()}`, {
        headers: { accept:'*/*', 'x-api-key': key }
      });
      if (!res.ok) break;

      const json = await res.json();
      const arr = (json?.tokens || []).map(t => {
        const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        const img = t?.token?.image ?? null;
        return tokenId != null ? { id: Number(tokenId), image: img } : null;
      }).filter(Boolean);

      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // -------- On-chain: last Transfer(to=controller, tokenId) -> staker + time --------
  async function getStakeInfoBatch(ids){
    if (!window.ethereum || !ids.length) return [];
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const iface = new ethers.utils.Interface([
      'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
    ]);
    const topicTransfer = iface.getEventTopic('Transfer');
    const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);

    const fromBlock = (CFG.COLLECTION_START_BLOCK ?? 0);

    // Fetch logs per token (serially to avoid provider throttling)
    const rows = [];
    for (const id of ids){
      try{
        const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);
        const logs = await provider.getLogs({
          fromBlock,
          toBlock: 'latest',
          address: CFG.COLLECTION_ADDRESS,
          topics: [topicTransfer, null, toTopic, idTopic]
        });
        if (!logs.length) {
          rows.push({ id, staker: null, since: null });
          continue;
        }
        const last = logs[logs.length-1];
        const parsed = iface.parseLog(last);
        const staker = parsed.args.from;
        const blk = await provider.getBlock(last.blockNumber);
        const since = new Date(blk.timestamp * 1000);
        rows.push({ id, staker, since });
      }catch{
        rows.push({ id, staker: null, since: null });
      }
    }
    return rows;
  }

  function lineTime(date){
    if (!date) return '—';
    return FF.formatAgo(Date.now() - date.getTime()) + ' ago';
  }

  function render(items){
    ul.innerHTML = '';
    if (!items.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      return;
    }

    for (const it of items){
      const rank = (RANKS && RANKS[String(it.id)]) || null;
      const pill = (rank || rank === 0)
        ? `<span class="pill">Rank <b>#${rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${it.id}.png`, `Frog ${it.id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${it.id}</b> ${pill}
          </div>
          <div class="muted">Staked ${lineTime(it.since)} • Staker ${it.staker ? FF.shorten(it.staker) : '—'}</div>
        </div>
        <div class="price">Staked</div>`;
      ul.appendChild(li);
    }
  }

  async function loadPond(){
    try{
      // 1) ranks first (non-blocking for UI correctness but we await so pills are correct)
      await loadRanks();

      // 2) reservoir list of tokens held by controller
      const base = await fetchControllerTokens();

      // 3) on-chain stake info (staker + since)
      const info = await getStakeInfoBatch(base.map(x=>x.id));

      // 4) merge and render
      const map = new Map(info.map(r => [r.id, r]));
      const merged = base.map(x => Object.assign({ image: x.image }, map.get(x.id) || { id:x.id, staker:null, since:null }));
      render(merged);
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
    }
  }

  // auto-run on load
  loadPond();
  // expose manual hook if you want to refresh later
  window.FF_reloadPond = loadPond;

})(window.FF, window.FF_CFG);
