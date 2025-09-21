// assets/js/utils.js
window.FF = window.FF || {};

(function(FF, CFG){
  /* ---------- basics ---------- */
  FF.shorten = (a) => a ? (String(a).slice(0,6) + '…' + String(a).slice(-4)) : '';
  FF.thumb64 = (src, alt) => `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1e3); if(s<60) return s+'s';
    const m=Math.floor(s/60);   if(m<60) return m+'m';
    const h=Math.floor(m/60);   if(h<24) return h+'h';
    const d=Math.floor(h/24);   return d+'d';
  };
  FF.fetchJSON = async (url)=>{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(String(r.status)); return r.json(); };

  /* ---------- shared helpers exposed ---------- */
  const baseURL = (p) => (/^https?:\/\//i.test(CFG.SOURCE_PATH||''))
    ? CFG.SOURCE_PATH.replace(/\/$/,'') + '/' + p.replace(/^\//,'')
    : p;
  FF.baseURL = baseURL;

  /* ---------- chain setup ---------- */
  const READ_RPC = 'https://cloudflare-eth.com';
  const readProvider = new ethers.providers.JsonRpcProvider(READ_RPC);

  const COLL = CFG.COLLECTION_ADDRESS;
  const CTRL = CFG.CONTROLLER_ADDRESS;
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 15209637);

  const ERC721_MIN_ABI = [
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];
  const collection = new ethers.Contract(COLL, ERC721_MIN_ABI, readProvider);

  const CONTROLLER_ABI = [
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"tokenIdToStaker","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"ownerOfStaked","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakedOwnerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ];
  let controller = null;
  const getController = ()=> controller || (controller = new ethers.Contract(CTRL, CONTROLLER_ABI, readProvider));

  const isAddr = (x)=> /^0x[a-fA-F0-9]{40}$/.test(String(x||''));
  const toCks  = (a)=> ethers.utils.getAddress(a);

  async function ownerOf(id){ try{ return toCks(await collection.ownerOf(id)); }catch{ return null; } }
  FF.ownerOf = ownerOf;

  async function resolveStaker(id){
    try{
      const ctrl=getController();
      for(const fn of ['stakerAddress','stakerOf','stakers','tokenIdToStaker','ownerOfStaked','stakedOwnerOf']){
        try{
          if (typeof ctrl[fn]==='function'){
            const a = await ctrl[fn](ethers.BigNumber.from(String(id)));
            if(isAddr(a)) return toCks(a);
          }
        }catch{}
      }
    }catch{}
    // fallback by logs to controller
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
  FF.resolveStaker = resolveStaker;

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
  FF.stakedSinceDate = stakedSinceDate;

  /* ---------- rarity cache (preload & helper exported) ---------- */
  const RARITY = new Map(); let rarityLoaded=false;
  async function ensureRarity(){
    if(rarityLoaded) return;
    const arr = await FF.fetchJSON(CFG.JSON_PATH).catch(()=>[]);
    for(const it of (arr||[])){
      const id = Number(it.id); if(!Number.isFinite(id)) continue;
      const rank = Number(it.ranking ?? it.rank);
      RARITY.set(id, { rank: Number.isFinite(rank)?rank:null });
    }
    rarityLoaded=true;
  }
  FF.ensureRarity = ensureRarity;
  FF.getRankById = async (id)=>{ await ensureRarity(); return (RARITY.get(Number(id))||{}).rank ?? null; };
  FF.getRankSync = (id)=> (RARITY.get(Number(id))||{}).rank ?? null;

  /* ---------- metadata + layered image helpers (for modal only) ---------- */
  async function fetchMeta(id){ return FF.fetchJSON(baseURL(`frog/json/${id}.json`)); }
  function probe(src){ return new Promise((res)=>{ const i=new Image(); i.onload=()=>res(src); i.onerror=()=>res(null); i.decoding='async'; i.loading='eager'; i.src=src; }); }
  async function firstExisting(list){ for(const s of list){ const ok=await probe(s); if(ok) return ok; } return null; }
  const cap = s => s ? (s.charAt(0).toUpperCase()+s.slice(1)) : s;
  function candidatesFor(attr, value){
    const A=String(attr||'').replace(/\s+/g,''), V=String(value||'').replace(/\s+/g,'');
    const cases=[[A,V],[cap(A),cap(V)],[A.toLowerCase(),V.toLowerCase()]];
    const pngs=[],gifs=[]; for(const [aa,vv] of cases){ pngs.push(baseURL(`frog/build_files/${aa}/${vv}.png`)); gifs.push(baseURL(`frog/build_files/${aa}/animations/${vv}_animation.gif`)); }
    return {pngs,gifs};
  }
  async function buildLayeredStage(id, meta, SIZE=256){
    const stage=document.createElement('div');
    const bgImg = baseURL(`frog/${id}.png`);
    Object.assign(stage.style,{
      position:'relative', width:SIZE+'px', height:SIZE+'px',
      borderRadius:'12px', overflow:'hidden', imageRendering:'pixelated',
      backgroundImage:`url("${bgImg}")`, backgroundRepeat:'no-repeat',
      backgroundSize:'1400%', backgroundPosition:'0% 0%'
    });
    const attrs=(meta?.attributes||meta?.traits||[]);
    for(const a of attrs){
      const key=a?.trait_type??a?.key??a?.traitType??'', val=a?.value??a?.val??''; if(!key||!val) continue;
      const {pngs,gifs}=candidatesFor(key,val);
      const gif=await firstExisting(gifs);
      if(gif){ const im=document.createElement('img'); Object.assign(im.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated',pointerEvents:'none'}); im.alt=`${key}: ${val}`; im.src=gif; stage.appendChild(im); continue; }
      const png=await firstExisting(pngs);
      if(png){ const im=document.createElement('img'); Object.assign(im.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated'}); im.alt=`${key}: ${val}`; im.src=png; stage.appendChild(im); }
    }
    return stage;
  }

  /* ---------- Compact “card” modal (image left, details right; rank + status on same line) ---------- */
  FF.openFrogModal = async function(info){
    const id = Number(info?.id); if(!Number.isFinite(id)) return;

    // Preload rarity to avoid N/A badges elsewhere
    await ensureRarity();

    // Gather card data
    const [own, staker, since, meta] = await Promise.all([
      ownerOf(id), resolveStaker(id), stakedSinceDate(id), fetchMeta(id).catch(()=>null)
    ]);
    const isStaked = !!own && own.toLowerCase() === CTRL.toLowerCase();
    const rank = info?.rank ?? FF.getRankSync(id);

    // Stage
    let stage = null;
    try{ if(meta) stage = await buildLayeredStage(id, meta, 256); }catch{}
    if(!stage){ const img=document.createElement('img'); Object.assign(img.style,{width:'256px',height:'256px',objectFit:'contain',imageRendering:'pixelated',borderRadius:'12px'}); img.alt=`Frog #${id}`; img.src=baseURL(`frog/${id}.png`); stage=img; }

    // Lines
    const statusPill = isStaked
      ? `<span class="pill pill-green">Staked${since?` • ${FF.formatAgo(Date.now()-since.getTime())} ago`:''}</span>`
      : `<span class="pill">Not staked</span>`;
    const ownerLine = isStaked
      ? `Staker <span class="addr">${staker?FF.shorten(staker):'—'}</span> • Held by Controller`
      : `Owner <span class="addr">${own?FF.shorten(own):'—'}</span>`;
    const rankPill = (rank||rank===0) ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

    const traits = (meta?.attributes||meta?.traits||[]).map(a=>{
      const key=a?.trait_type??a?.key??a?.traitType??'Trait', val=a?.value??a?.val??''; return {key,val};
    });

    // Modal
    const el=document.createElement('div'); el.className='modal-overlay';
    el.innerHTML = `
      <div class="modal-card modal-card--compact">
        <button class="modal-close" aria-label="Close">×</button>

        <div class="modal-grid">
          <div id="frogStageSlot" class="modal-left"></div>

          <div class="modal-right">
            <div class="title-row">
              <h3>Frog #${id}</h3>
              ${rankPill}
              ${statusPill}
            </div>

            <div class="owner-row muted">${ownerLine}</div>

            <div class="btn-row">
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}">OpenSea</a>
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}">Etherscan</a>
            </div>
          </div>

          <div class="traits-panel">
            <div class="muted"><b>Traits</b> • ${traits.length}</div>
            <div class="traits-chips">
              ${traits.map(t=>`<span class="chip"><span class="muted">${t.key}</span> <b>${t.val}</b></span>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    el.querySelector('#frogStageSlot')?.appendChild(stage);

    const close=()=>{ el.remove(); document.removeEventListener('keydown', esc); };
    const esc=(e)=>{ if(e.key==='Escape') close(); };
    el.addEventListener('click', (e)=>{ if(e.target===el) close(); });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', esc);
    document.body.appendChild(el);
  };

})(window.FF, window.FF_CFG);
