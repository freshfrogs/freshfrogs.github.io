// assets/js/utils.js
window.FF = window.FF || {};

(function(FF, CFG){
  // ---------------- Basics ----------------
  FF.shorten = (a) => a ? (String(a).slice(0,6) + '…' + String(a).slice(-4)) : '';

  // Back to 64x64 everywhere:
  FF.thumb64 = (src, alt) =>
    `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;

  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1e3); if(s<60) return s+'s';
    const m=Math.floor(s/60);   if(m<60) return m+'m';
    const h=Math.floor(m/60);   if(h<24) return h+'h';
    const d=Math.floor(h/24);   return d+'d';
  };

  FF.fetchJSON = async (url)=>{
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    return res.json();
  };

  // ---------------- Caches & Providers ----------------
  const CACHE = {
    rarityMap: null,     // id -> { rank, score }
    traitsById: new Map(), // id -> [{trait_type, value}, ...]
  };

  const READ_RPC = 'https://cloudflare-eth.com';
  const readProvider = new ethers.providers.JsonRpcProvider(READ_RPC);

  const Z = '0x0000000000000000000000000000000000000000';
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 15209637);
  const CTRL = CFG.CONTROLLER_ADDRESS;
  const COLL = CFG.COLLECTION_ADDRESS;
  const KEY = CFG.FROG_API_KEY;

  // Minimal interfaces
  const ERC721_MIN_ABI = [
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];
  const collection = new ethers.Contract(COLL, ERC721_MIN_ABI, readProvider);

  // Optionally try controller read calls if they exist (no signer required for view)
  let controller = null;
  const CONTROLLER_ABI = [
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"tokenIdToStaker","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"ownerOfStaked","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakedOwnerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ];
  function getController(){
    if(!controller) controller = new ethers.Contract(CTRL, CONTROLLER_ABI, readProvider);
    return controller;
  }
  const isAddr = (x)=> /^0x[a-fA-F0-9]{40}$/.test(String(x||''));
  const toCks = (a)=> ethers.utils.getAddress(a);

  // ---------------- Rarity loader (cached) ----------------
  async function ensureRarity(){
    if (CACHE.rarityMap) return;
    const arr = await FF.fetchJSON(CFG.JSON_PATH);
    const map = new Map();
    for (const it of (arr||[])){
      const id = Number(it.id); if(!Number.isFinite(id)) continue;
      const rank = Number(it.ranking ?? it.rank);
      const score = (it.rarity ?? it.score ?? null);
      map.set(id, {
        rank: Number.isFinite(rank) ? rank : null,
        score: score != null ? String(score) : null
      });
    }
    CACHE.rarityMap = map;
  }
  async function getRarity(id){
    await ensureRarity();
    return CACHE.rarityMap.get(Number(id)) || { rank:null, score:null };
  }

  // ---------------- Traits loader (cached, via Reservoir) ----------------
  async function getTraits(id){
    const n = Number(id);
    if (CACHE.traitsById.has(n)) return CACHE.traitsById.get(n);
    if (!KEY) { CACHE.traitsById.set(n, []); return []; }
    const url = `https://api.reservoir.tools/tokens/v7?ids=${COLL}:${n}&includeAttributes=true`;
    try{
      const res = await fetch(url, { headers: { accept:'*/*','x-api-key': KEY } });
      if(!res.ok) throw 0;
      const js = await res.json();
      const attrs = js?.tokens?.[0]?.token?.attributes || [];
      const traits = attrs.map(a=>({ trait_type: a?.key ?? a?.traitType ?? 'Trait', value: a?.value ?? a?.val ?? '' }));
      CACHE.traitsById.set(n, traits);
      return traits;
    }catch{
      CACHE.traitsById.set(n, []); return [];
    }
  }

  // ---------------- Staking helpers (chain-truth) ----------------
  async function ownerOf(id){
    try{ return toCks(await collection.ownerOf(id)); }catch{ return null; }
  }

  // Who staked it (true owner while staked): try controller views, else logs
  async function resolveStaker(id){
    try{
      const ctrl = getController();
      const tries = ['stakerAddress','stakerOf','stakers','tokenIdToStaker','ownerOfStaked','stakedOwnerOf'];
      for (const fn of tries){
        try{
          if (typeof ctrl[fn] === 'function'){
            const a = await ctrl[fn](ethers.BigNumber.from(String(id)));
            if (isAddr(a) && a !== Z) return toCks(a);
          }
        }catch{}
      }
    }catch{}
    // Fallback by logs: last Transfer(* -> controller)
    try{
      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CTRL, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);
      const logs = await readProvider.getLogs({
        fromBlock: START_BLOCK, toBlock: 'latest',
        address: COLL, topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (!logs.length) return null;
      const fromAddr = toCks('0x'+logs[logs.length-1].topics[1].slice(26));
      return fromAddr;
    }catch{ return null; }
  }

  async function stakedSinceDate(id){
    try{
      // verify currently staked (ownerOf == controller)
      const own = await ownerOf(id);
      if(!own || own.toLowerCase() !== CTRL.toLowerCase()) return null;

      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CTRL, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);
      const logs = await readProvider.getLogs({
        fromBlock: START_BLOCK, toBlock: 'latest',
        address: COLL, topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (!logs.length) return null;
      const last = logs[logs.length - 1];
      const blk = await readProvider.getBlock(last.blockNumber);
      return new Date(blk.timestamp * 1000);
    }catch{ return null; }
  }

  // ---------------- Modal (self-enriching) ----------------
  // You may call with: FF.openFrogModal({ id, rank?, price?, buyer?, image? })
  FF.openFrogModal = async function(info){
    const id = Number(info?.id);
    if(!Number.isFinite(id)) return;

    // parallel data fetch
    const [rarity, own, staker, since, traits] = await Promise.all([
      getRarity(id),
      ownerOf(id),
      resolveStaker(id),
      stakedSinceDate(id),
      getTraits(id)
    ]).catch(()=>[ {rank:null,score:null}, null, null, null, [] ]);

    const isStaked = !!own && own.toLowerCase() === CTRL.toLowerCase();
    const rank    = (info.rank ?? rarity.rank);
    const score   = (info.score ?? rarity.score);
    const image   = info.image || `${CFG?.SOURCE_PATH || ''}/frog/${id}.png`;

    // build traits list HTML
    const traitsHTML = traits && traits.length
      ? `<div class="muted" style="margin-top:4px"><b>Traits</b></div>
         <ul style="margin:6px 0 0; padding:0; list-style:none; display:grid; gap:6px">
           ${traits.map(t=>`<li class="pill" style="display:flex;justify-content:space-between;gap:8px">
              <span>${t.trait_type}</span><b>${t.value}</b>
            </li>`).join('')}
         </ul>`
      : '';

    const rankPill = (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

    const rarityLine = (score ? `<div class="muted">Rarity Score: ${score}</div>` : '');

    const statusLine = isStaked
      ? `<div class="muted">Status <b>Staked</b>${since ? ` • since ${FF.formatAgo(Date.now()-since.getTime())} ago` : ''}</div>`
      : `<div class="muted">Status <b>Not staked</b></div>`;

    const ownerLine = isStaked
      ? `<div class="muted">Staker <span class="addr">${staker?FF.shorten(staker):'—'}</span> • Held by Controller</div>`
      : `<div class="muted">Owner <span class="addr">${own?FF.shorten(own):'—'}</span></div>`;

    const saleLine = (info.price || info.buyer || info.time)
      ? `<div class="muted">${info.price?`Price ${info.price}`:''}${info.buyer?` • Buyer ${FF.shorten(info.buyer)}`:''}${info.time?` • ${info.time} ago`:''}</div>`
      : '';

    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" aria-label="Close">×</button>
        <div class="row" style="align-items:flex-start; gap:16px;">
          <img src="${image}" alt="Frog #${id}" class="thumb64" width="64" height="64" />
          <div class="stack" style="gap:6px;">
            <div><b>Frog #${id}</b> ${rankPill}</div>
            ${rarityLine}
            ${statusLine}
            ${ownerLine}
            ${saleLine}
            <div class="row" style="gap:8px;margin-top:6px;">
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}">OpenSea</a>
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}">Etherscan</a>
            </div>
            ${traitsHTML}
          </div>
        </div>
      </div>`;

    function close(){ el.remove(); document.removeEventListener('keydown', esc); }
    function esc(e){ if(e.key==='Escape') close(); }
    el.addEventListener('click', (e)=>{ if(e.target===el) close(); });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', esc);
    document.body.appendChild(el);
  };

})(window.FF, window.FF_CFG);
