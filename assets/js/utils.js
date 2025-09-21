// assets/js/utils.js
window.FF = window.FF || {};

(function(FF, CFG){
  // ---------- Basics ----------
  FF.shorten = (a) => a ? (String(a).slice(0,6) + '…' + String(a).slice(-4)) : '';

  // Lists (sales/rarity/owned/staked) stay at 64x64
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

  // ---------- Providers / constants ----------
  const READ_RPC = 'https://cloudflare-eth.com';
  const readProvider = new ethers.providers.JsonRpcProvider(READ_RPC);

  const CTRL = CFG.CONTROLLER_ADDRESS;
  const COLL = CFG.COLLECTION_ADDRESS;
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 15209637);
  const KEY = CFG.FROG_API_KEY;

  const ERC721_MIN_ABI = [
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];
  const collection = new ethers.Contract(COLL, ERC721_MIN_ABI, readProvider);

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
  const toCks  = (a)=> ethers.utils.getAddress(a);

  // ---------- Rarity cache ----------
  const RARITY = new Map(); let rarityLoaded=false;
  async function ensureRarity(){
    if(rarityLoaded) return;
    const arr = await FF.fetchJSON(CFG.JSON_PATH).catch(()=>[]);
    for(const it of (arr||[])){
      const id = Number(it.id); if(!Number.isFinite(id)) continue;
      const rank = Number(it.ranking ?? it.rank);
      const score = (it.rarity ?? it.score ?? null);
      RARITY.set(id, { rank: Number.isFinite(rank)?rank:null, score: score!=null?String(score):null });
    }
    rarityLoaded=true;
  }
  async function getRarity(id){ await ensureRarity(); return RARITY.get(Number(id)) || {rank:null,score:null}; }

  // ---------- Chain helpers ----------
  async function ownerOf(id){ try{ return toCks(await collection.ownerOf(id)); }catch{ return null; } }

  async function resolveStaker(id){
    // controller views first
    try{
      const ctrl = getController();
      const tries = ['stakerAddress','stakerOf','stakers','tokenIdToStaker','ownerOfStaked','stakedOwnerOf'];
      for(const fn of tries){
        try{
          if(typeof ctrl[fn]==='function'){
            const a = await ctrl[fn](ethers.BigNumber.from(String(id)));
            if(isAddr(a)) return toCks(a);
          }
        }catch{}
      }
    }catch{}
    // fallback by logs (last Transfer -> controller)
    try{
      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CTRL, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(id)).toHexString(), 32);
      const logs = await readProvider.getLogs({
        fromBlock: START_BLOCK, toBlock: 'latest',
        address: COLL, topics: [topicTransfer, null, toTopic, idTopic]
      });
      if(!logs.length) return null;
      return toCks('0x'+logs[logs.length-1].topics[1].slice(26));
    }catch{ return null; }
  }

  async function stakedSinceDate(id){
    try{
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
      if(!logs.length) return null;
      const last = logs[logs.length-1];
      const blk = await readProvider.getBlock(last.blockNumber);
      return new Date(blk.timestamp*1000);
    }catch{ return null; }
  }

  // ---------- Metadata + layered image helpers ----------
  const title = s => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : s;
  const baseURL = (p) => {
    // Prefer absolute if SOURCE_PATH is set (GitHub Pages)
    if (/^https?:\/\//i.test(CFG.SOURCE_PATH||'')) return CFG.SOURCE_PATH.replace(/\/$/,'') + '/' + p.replace(/^\//,'');
    return p; // relative
  };

  async function fetchMeta(id){
    const url = baseURL(`frog/json/${id}.json`);
    return FF.fetchJSON(url);
  }

  // probe image existence (resolves src or null)
  function probe(src){
    return new Promise((resolve)=>{
      const img=new Image();
      img.onload=()=>resolve(src);
      img.onerror=()=>resolve(null);
      img.decoding='async'; img.loading='eager';
      img.src=src;
    });
  }
  async function firstExisting(cands){
    for(const src of cands){
      const ok = await probe(src);
      if(ok) return ok;
    }
    return null;
  }

  // ✅ Use only this animation path, plus resilient PNG casing variants
  function candidatesFor(attr, value){
    const A = String(attr||'').replace(/\s+/g,'');
    const V = String(value||'').replace(/\s+/g,'');
    const cases = [
      [A, V],
      [A.charAt(0).toUpperCase()+A.slice(1), V.charAt(0).toUpperCase()+V.slice(1)],
      [A.toLowerCase(), V.toLowerCase()],
    ];

    const pngs = [];
    const gifs = [];
    for (const [aa,vv] of cases){
      // Base layer PNG
      pngs.push(baseURL(`frog/build_files/${aa}/${vv}.png`));
      // ✅ Only this animation path is considered
      gifs.push(baseURL(`frog/build_files/${aa}/animations/${vv}_animation.gif`));
    }
    return { pngs, gifs };
  }

  // Build a layered stage (returns a DOM node)
  async function buildLayeredStage(id, meta){
    const stage = document.createElement('div');

    // Background uses the original PNG, enlarged & offset so only background color shows.
    // You can tweak bgSize/bgPos values to fine-tune.
    const bgImg = baseURL(`frog/${id}.png`);
    const bgSize = '600%';           // enlarge a lot so frog art is off-frame
    const bgPos  = '-40% 70%';       // shift left (-x) and down (+y)

    Object.assign(stage.style, {
      position:'relative',
      width:'256px', height:'256px',
      borderRadius:'8px', overflow:'hidden',
      imageRendering:'pixelated',
      backgroundImage: `url("${bgImg}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: bgSize,
      backgroundPosition: bgPos,
      backgroundColor: '#000' // fallback if image fails
    });

    const attrs = (meta?.attributes || meta?.traits || []);
    // Expected form: [{ trait_type: "Mouth", value: "Mask" }, ...]
    for (const a of attrs){
      const key = a?.trait_type ?? a?.key ?? a?.traitType ?? '';
      const val = a?.value ?? a?.val ?? '';
      if(!key || !val) continue;

      const { pngs, gifs } = candidatesFor(key, val);

      // 1) Try animation first; if present, use ONLY animation (skip PNG)
      const gifSrc = await firstExisting(gifs);
      if (gifSrc){
        const anim = document.createElement('img');
        Object.assign(anim.style, {
          position:'absolute', inset:'0',
          width:'100%', height:'100%',
          objectFit:'contain', imageRendering:'pixelated',
          pointerEvents:'none'
        });
        anim.alt = `${key}: ${val} (animation)`; anim.src = gifSrc;
        stage.appendChild(anim);
        continue; // 🔸 skip PNG for this attribute
      }

      // 2) Otherwise, fall back to PNG
      const pngSrc = await firstExisting(pngs);
      if (pngSrc){
        const img = document.createElement('img');
        Object.assign(img.style, {
          position:'absolute', inset:'0',
          width:'100%', height:'100%',
          objectFit:'contain', imageRendering:'pixelated'
        });
        img.alt = `${key}: ${val}`; img.src = pngSrc;
        stage.appendChild(img);
      }
    }

    return stage;
  }

  // ---------- Modal (layered; image on top, info below) ----------
  FF.openFrogModal = async function(info){
    const id = Number(info?.id);
    if(!Number.isFinite(id)) return;

    // Parallel fetch of chain + rarity + metadata
    const [rarity, own, staker, since, meta] = await Promise.all([
      getRarity(id),
      ownerOf(id),
      resolveStaker(id),
      stakedSinceDate(id),
      fetchMeta(id).catch(()=>null)
    ]);

    const isStaked = !!own && own.toLowerCase() === CTRL.toLowerCase();
    const rank    = (info.rank ?? rarity.rank);
    const score   = (info.score ?? rarity.score);

    // traits list (from metadata)
    const traits = (meta?.attributes || meta?.traits || []).map(a=>{
      const key = a?.trait_type ?? a?.key ?? a?.traitType ?? 'Trait';
      const val = a?.value ?? a?.val ?? '';
      return { key, val };
    });

    // build the layered stage (falls back to simple image if meta missing)
    let stageNode = null;
    try{
      if(meta) stageNode = await buildLayeredStage(id, meta);
    }catch{}
    if(!stageNode){
      const img = document.createElement('img');
      Object.assign(img.style, {
        width:'256px', height:'256px', objectFit:'contain', imageRendering:'pixelated',
        background:'#000', borderRadius:'8px'
      });
      img.alt = `Frog #${id}`;
      img.src = baseURL(`frog/${id}.png`);
      stageNode = img;
    }

    // Traits list HTML
    const traitsHTML = traits.length
      ? `<div class="muted" style="margin-top:4px"><b>Traits</b></div>
         <ul style="margin:6px 0 0; padding:0; list-style:none; display:grid; gap:6px">
           ${traits.map(t=>`<li class="pill" style="display:flex;justify-content:space-between;gap:8px">
              <span>${t.key}</span><b>${t.val}</b>
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

    // Modal shell (🆕 image on top, info below)
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" aria-label="Close">×</button>
        <div class="stack" style="gap:12px;">
          <div id="frogStageSlot"></div>
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

    // insert the layered stage
    el.querySelector('#frogStageSlot')?.appendChild(stageNode);

    function close(){ el.remove(); document.removeEventListener('keydown', esc); }
    function esc(e){ if(e.key==='Escape') close(); }
    el.addEventListener('click', (e)=>{ if(e.target===el) close(); });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', esc);
    document.body.appendChild(el);
  };

})(window.FF, window.FF_CFG);
