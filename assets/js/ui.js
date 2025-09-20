// assets/js/ui.js
import {
  FF_CFG, shorten, thumb64, fetchJSON, isLocal,
  mapSales, fetchSales, loadABIFromScript, formatAgo
} from "./core.js";

/* =========================================================
   RARITY STORE
   ========================================================= */
let RARITY_LIST = null, RANK_LOOK = null, sortBy = "rank";

function setRarityList(arr){
  RARITY_LIST = arr;
  RANK_LOOK = Object.fromEntries(
    arr.map(x => [String(x.id), Number(x.ranking ?? x.rank ?? NaN)])
       .filter(([,v]) => !Number.isNaN(v))
  );
  window.FF_getRankById = (id) => RANK_LOOK ? (RANK_LOOK[String(id)] ?? null) : null;
}
function sortedRarity(){
  if (!RARITY_LIST?.length) return [];
  const a = [...RARITY_LIST];
  if (sortBy === "score") a.sort((x,y)=>Number(y.rarity??y.score??0)-Number(x.rarity??x.score??0));
  else a.sort((x,y)=>Number(x.ranking??x.rank??1e9)-Number(y.ranking??y.rank??1e9));
  return a;
}
export async function loadRarity(){
  if(!isLocal()){
    try{ const arr=await fetchJSON(FF_CFG.JSON_PATH); if(Array.isArray(arr)) setRarityList(arr); }catch{}
  }
  renderRarity();
}
export function setRaritySort(mode){ sortBy=mode; renderRarity(); }

/* =========================================================
   CHAIN FALLBACKS FOR TOKEN DETAILS (owner / birthday)
   ========================================================= */
async function ownerOfViaChain(id){
  try{
    if(!window.ethereum) return null;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer   = provider.getSigner();
    const { file, global } = FF_CFG.ABI.collection || {};
    const abi = await loadABIFromScript(file, global);
    const coll = new ethers.Contract(FF_CFG.COLLECTION_ADDRESS, abi, signer);
    const addr = await coll.ownerOf(id);
    return addr || null;
  }catch{ return null; }
}
async function fetchTokenDetails(id){
  try{
    const params = new URLSearchParams({ tokens: `${FF_CFG.COLLECTION_ADDRESS}:${id}` });
    const r = await fetch(`https://api.reservoir.tools/tokens/v7?${params.toString()}`, {
      headers: { accept: "*/*", "x-api-key": FF_CFG.FROG_API_KEY }
    });
    if(!r.ok) throw 0;
    const j = await r.json();
    const tok = j?.tokens?.[0]?.token;
    let owner = j?.tokens?.[0]?.owner || tok?.owner || null;
    const mintTs = tok?.mintTimestamp ? Date.parse(tok.mintTimestamp) : null;
    if(!owner) owner = await ownerOfViaChain(id);
    return { owner: owner || null, birthdayMs: Number.isFinite(mintTs) ? mintTs : null };
  }catch{
    const owner = await ownerOfViaChain(id);
    return { owner: owner || null, birthdayMs: null };
  }
}

/* =========================================================
   FROG INFO MODAL (layered, PNG as bg color, responsive)
   - No hardcoded layer order: we respect metadata order exactly,
     but we skip "Background" (modal bg comes from the still PNG).
   ========================================================= */

// Build a single image layer, prefer GIF if available
function buildLayer(trait_type, attribute, mountEl){
  const img=document.createElement("img");
  img.loading="lazy"; img.alt = `${trait_type}: ${attribute}`;
  Object.assign(img.style,{
    position:"absolute", inset:"0", width:"100%", height:"100%",
    objectFit:"contain", imageRendering:"pixelated"
  });
  const png=`${FF_CFG.SOURCE_PATH}/frog/build_files/${trait_type}/${attribute}.png`;
  img.src=png;

  // Prefer GIF animation if it exists (skip Background)
  if (trait_type !== "Background") {
    const gif=`${FF_CFG.SOURCE_PATH}/frog/build_files/${trait_type}/animations/${attribute}_animation.gif`;
    const probe=new Image();
    probe.onload=()=>{ img.src=gif; };
    probe.onerror=()=>{};
    probe.src=gif;
  }

  mountEl.appendChild(img);
}

// Use the exact metadata order, but skip "Background" (modal bg uses still PNG)
function orderedAttributes(meta){
  if(!Array.isArray(meta?.attributes)) return [];
  return meta.attributes.filter(a => a?.trait_type !== "Background");
}

async function openFrogInfo(id){
  const L=document.getElementById("lightbox"), S=document.getElementById("lightboxStage");
  if(!L||!S) return;

  const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
  const [meta, tokenInfo, stake] = await Promise.all([
    (async()=>{ try{ return await (await fetch(`${FF_CFG.SOURCE_PATH}/frog/json/${id}.json`,{cache:"no-store"})).json(); }catch{return null;} })(),
    fetchTokenDetails(id),
    (async()=>{ try{ return await (window.FF_getStakeInfo ? window.FF_getStakeInfo(id) : null); }catch{ return null; } })()
  ]);

  S.innerHTML = `
    <div class="modal-card modal-clean">
      <button class="btn btn-ghost modal-close" aria-label="Close">×</button>

      <div class="modal-render">
        <div id="modalComposite" class="modal-composite"></div>
        <div class="render-vignette"></div>
      </div>

      <div class="modal-info panelish">
        <div class="row tight">
          <h3 class="h3">Frog #${id}</h3>
          ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          ${ stake?.staked ? `<span class="pill" title="${stake?.sinceText||''}">Staked</span>` : `<span class="pill pill-ghost">Unstaked</span>` }
        </div>

        <div class="grid2 gap8">
          <div class="muted"><b>Owner:</b> ${tokenInfo.owner ? tokenInfo.owner.slice(0,6)+"…"+tokenInfo.owner.slice(-4) : "—"}</div>
          <div class="muted"><b>Birthday:</b> ${
            tokenInfo.birthdayMs ? (new Date(tokenInfo.birthdayMs)).toLocaleString() + ` (${formatAgo(Date.now()-tokenInfo.birthdayMs)} ago)` : "—"
          }</div>
          <div class="muted"><b>Staked since:</b> ${
            (stake?.staked && stake?.sinceMs) ? (new Date(stake.sinceMs)).toLocaleString() + ` (${formatAgo(Date.now()-stake.sinceMs)} ago)` :
            (stake?.staked ? (stake?.sinceText || "Yes") : "No")
          }</div>
        </div>

        <div class="traits-scroll">
          ${
            Array.isArray(meta?.attributes) && meta.attributes.length
              ? meta.attributes.map(a => `${a.trait_type}: <b>${a.value}</b>`).join("<br>")
              : "No attributes found."
          }
        </div>

        <div class="row gap8">
          <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://etherscan.io/nft/${FF_CFG.COLLECTION_ADDRESS}/${id}">Etherscan</a>
          <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://opensea.io/assets/ethereum/${FF_CFG.COLLECTION_ADDRESS}/${id}">OpenSea</a>
        </div>
      </div>
    </div>
  `;

  // 512×512 layered render with the still PNG as a CSS bg (zoomed bottom-right so only color shows)
  const mount = S.querySelector("#modalComposite");
  if (mount) {
    // Background layer (bottom-right corner, heavy zoom)
    const bg = document.createElement("div");
    bg.className = "modal-bg-img";
    bg.style.backgroundImage = `url("${FF_CFG.SOURCE_PATH}/frog/${id}.png")`;
    bg.style.setProperty('--modal-bg-zoom', '7000%');
    bg.style.backgroundPosition = "100% 100%";
    mount.appendChild(bg);

    // Lay down traits in metadata order
    const ordered = orderedAttributes(meta);
    if (ordered.length) {
      ordered.forEach(a => buildLayer(a.trait_type, a.value, mount));
    } else {
      // Fallback: single still image
      const img=document.createElement("img");
      img.src=`${FF_CFG.SOURCE_PATH}/frog/${id}.png`;
      Object.assign(img.style,{position:"absolute",inset:"0",width:"100%",height:"100%",objectFit:"contain",imageRendering:"pixelated"});
      mount.appendChild(img);
    }
  }

  // Close behaviors
  S.querySelector(".modal-close")?.addEventListener("click", ()=>{ L.style.display="none"; document.body.style.overflow=""; });
  L.style.display="grid"; document.body.style.overflow="hidden";
  const backdropClose=(ev)=>{ if(ev.target===L){ L.style.display="none"; document.body.style.overflow=""; L.removeEventListener("click",backdropClose);} };
  L.addEventListener("click", backdropClose);
}
window.FF_openFrogInfo = openFrogInfo;

/* =========================================================
   GRID (simple static images)
   ========================================================= */
export function renderGrid(){
  const g=document.getElementById("grid"); if(!g) return;
  g.innerHTML="";
  const pickIds=(n)=>{ const s=new Set(); while(s.size<n) s.add(1+Math.floor(Math.random()*FF_CFG.SUPPLY)); return [...s]; };
  for(const id of pickIds(9)){
    const tile=document.createElement("div"); tile.className="tile";
    const img=document.createElement("img");
    img.src = `${FF_CFG.SOURCE_PATH}/frog/${id}.png`;
    img.alt = `Frog #${id}`;
    img.loading="lazy"; img.decoding="async";
    img.style.imageRendering="pixelated";
    img.style.width="100%"; img.style.height="100%"; img.style.objectFit="cover";
    tile.appendChild(img);
    g.appendChild(tile);
  }
}

/* =========================================================
   SALES (Reservoir)
   ========================================================= */
let salesCache=[];
export function renderSales(list=salesCache){
  const ul=document.getElementById("featureList");
  if(!ul) return; ul.innerHTML="";
  const arr=(list&&list.length)?list:[{id:3250,time:"—",price:"—",buyer:"—"}];
  arr.forEach(x=>{
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
    const badge=(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;
    const li=document.createElement("li"); li.className="list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`,`Frog ${x.id}`)+
      `<div>
        <div class="row gap8"><b>Frog #${x.id}</b> ${badge}</div>
        <div class="muted">${x.time!=="—"?x.time+" ago":"—"} • Buyer ${x.buyer}</div>
      </div>
      <div class="price">${x.price}</div>`;
    li.style.cursor="pointer"; li.addEventListener("click",()=>openFrogInfo(x.id));
    ul.appendChild(li);
  });
}
export async function loadSalesLive(){
  try{
    if(!FF_CFG.FROG_API_KEY || FF_CFG.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE") throw new Error("Missing Reservoir API key");
    const f=await fetchSales({limit:50});
    const m=mapSales(f.sales||[]);
    if(m.length){ salesCache=m; renderSales(); return true; }
    return false;
  }catch(e){ console.warn("Sales fetch failed",e); return false; }
}

/* =========================================================
   MINTS (Reservoir — activity: types=mint)
   ========================================================= */
let mintsCache=[];
function mapMints(activities){
  // Reservoir activity/v6 (types=mint) — normalize to {id,time,buyer,price}
  // price may be missing for free mints; show "—"
  return (activities||[])
    .map(a=>{
      const tokenId = a?.token?.tokenId ?? a?.tokenId ?? a?.id;
      const id = tokenId!=null ? parseInt(String(tokenId),10) : null;
      const ts = a?.eventTimestamp ? Date.parse(a.eventTimestamp) :
                 a?.timestamp ? (Number(a.timestamp)*1000) : null;
      const taker = a?.toAddress || a?.to || a?.maker || a?.buyer || null;
      const priceEth = a?.price?.amount?.decimal != null
        ? `${Number(a.price.amount.decimal).toFixed(4)} ETH`
        : (a?.price?.amount?.native != null ? `${Number(a.price.amount.native).toFixed(4)} ETH` : "—");
      return id ? { id, time: ts ? formatAgo(Date.now()-ts) : "—", buyer: taker ? shorten(taker) : "—", price: priceEth } : null;
    })
    .filter(Boolean);
}
async function fetchMints({limit=50, continuation=""}={}){
  const qs = new URLSearchParams({
    collection: FF_CFG.COLLECTION_ADDRESS,
    types: "mint",
    limit: String(limit),
    sortBy: "eventTimestamp",
    sortDirection: "desc"
  });
  if(continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/collections/activity/v6?${qs.toString()}`;
  const res = await fetch(url, { headers: { accept: "*/*", "x-api-key": FF_CFG.FROG_API_KEY } });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export function renderMints(list=mintsCache){
  const ul=document.getElementById("featureList");
  if(!ul) return; ul.innerHTML="";
  const arr=(list&&list.length)?list:[{id:1,time:"—",price:"—",buyer:"—"}];
  arr.forEach(x=>{
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
    const badge=(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill pill-ghost">Rank N/A</span>`;
    const li=document.createElement("li"); li.className="list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`,`Frog ${x.id}`)+
      `<div>
        <div class="row gap8"><b>Frog #${x.id}</b> ${badge}</div>
        <div class="muted">${x.time!=="—"?x.time+" ago":"—"} • Minter ${x.buyer}</div>
      </div>
      <div class="price">${x.price}</div>`;
    li.style.cursor="pointer"; li.addEventListener("click",()=>openFrogInfo(x.id));
    ul.appendChild(li);
  });
}
export async function loadMintsLive(){
  try{
    if(!FF_CFG.FROG_API_KEY || FF_CFG.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE") throw new Error("Missing Reservoir API key");
    const data = await fetchMints({limit:50});
    const mapped = mapMints(data.activities||data.events||[]);
    if(mapped.length){ mintsCache=mapped; renderMints(); return true; }
    return false;
  }catch(e){ console.warn("Mints fetch failed",e); return false; }
}

/* =========================================================
   RARITY LIST UI
   ========================================================= */
export function renderRarity(){
  const ul=document.getElementById("featureList");
  if(!ul) return; ul.innerHTML="";
  const data=sortedRarity();
  if(!data.length){ ul.innerHTML='<li class="list-item"><div class="muted">No data yet</div></li>'; return; }
  data.forEach(it=>{
    const id=it.id, rank=it.ranking??it.rank??'?', score=(it.rarity??it.score??'').toString();
    const li=document.createElement("li"); li.className="list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${id}.png`,`Frog ${id}`)+
      `<div>
        <div><b>Frog #${id}</b></div>
        <div class="muted">${score?`Rarity Score: ${score}`:`Rarity Score: N/A`}</div>
      </div>
      <span class="pill">#${rank}</span>`;
    li.style.cursor="pointer"; li.addEventListener("click",()=>openFrogInfo(id));
    ul.appendChild(li);
  });
}

/* =========================================================
   POND (controller-held / currently staked)
   ========================================================= */
export let pondItems=[], pondContinuation='';
export async function loadPond(limit=50, nextStr){
  try{
    const cont = nextStr || pondContinuation || '';
    const qs = cont ? '&continuation='+encodeURIComponent(cont) : '';
    const url = `https://api.reservoir.tools/users/${FF_CFG.CONTROLLER_ADDRESS}/tokens/v8?collection=${FF_CFG.COLLECTION_ADDRESS}&limit=${limit}${qs}`;
    const res = await fetch(url, { method:'GET', headers:{ accept:'*/*','x-api-key': FF_CFG.FROG_API_KEY } });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const items = (data.tokens||[]).map(t=>{
      const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
      const id = tokenId!=null?parseInt(String(tokenId),10):null;
      const img = t?.token?.image ?? (`${FF_CFG.SOURCE_PATH}/frog/${tokenId}.png`);
      return id ? { id, image: img } : null;
    }).filter(Boolean);

    pondItems = pondItems.concat(items);
    window.pondItems = pondItems; // expose for staking fallback
    pondContinuation = data.continuation || '';

    if(currentFeatureView==='pond') renderPond();

    let btn = document.getElementById('featureMoreBtn');
    const anchor = document.getElementById('featureMoreAnchor') || document.getElementById('featuresHeader');
    if(!pondContinuation){ if(btn) btn.remove(); }
    else {
      if(!btn){
        btn=document.createElement('button'); btn.id='featureMoreBtn';
        btn.className='btn btn-outline btn-sm'; btn.textContent='Load more';
        anchor?.appendChild(btn);
      }
      btn.onclick = ()=> loadPond(limit, pondContinuation);
    }
  }catch(e){
    console.warn(e);
    const ul=document.getElementById("featureList");
    if(ul && !ul.children.length){
      ul.innerHTML='<li class="list-item"><div class="muted">Failed to fetch Pond.</div></li>';
    }
  }
}
export function renderPond(){
  const ul=document.getElementById("featureList");
  if(!ul) return; ul.innerHTML="";
  if(!pondItems.length){ ul.innerHTML='<li class="list-item"><div class="muted">No staked frogs found.</div></li>'; return; }

  pondItems.forEach(x=>{
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
    const ownerId = `pond-owner-${x.id}`;
    const sinceId = `pond-since-${x.id}`;
    const li=document.createElement("li"); li.className="list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`,`Frog ${x.id}`)+
      `<div>
        <div class="row gap8"><b>Frog #${x.id}</b> ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill pill-ghost">Rank N/A</span>`}</div>
        <div class="muted">Owner <span id="${ownerId}" class="addr">—</span></div>
        <div class="muted">Staked <span id="${sinceId}" class="muted">—</span></div>
      </div>`;
    li.style.cursor="pointer"; li.addEventListener("click",()=>openFrogInfo(x.id));
    ul.appendChild(li);

    (async ()=>{
      try{
        if(window.FF_getStakeInfo){
          const s = await window.FF_getStakeInfo(x.id);
          const o=document.getElementById(ownerId), t=document.getElementById(sinceId);
          if(o && s?.staker) o.textContent = s.staker.slice(0,6)+'…'+s.staker.slice(-4);
          if(t){
            if(s?.sinceMs) t.textContent = (new Date(s.sinceMs)).toLocaleString() + ` (${formatAgo(Date.now()-s.sinceMs)} ago)`;
            else if (s?.sinceText) t.textContent = s.sinceText;
          }
        }
      }catch{}
    })();
  });
}

/* =========================================================
   WALLET + OWNED LIST
   ========================================================= */
let currentUser=null;
function setWalletUI(a){
  const l=document.getElementById("walletLabel"), b=document.getElementById("connectBtn");
  if(a){ l.textContent='Connected: '+shorten(a); l.style.display=''; b.textContent='Disconnect'; }
  else { l.style.display='none'; b.textContent='Connect Wallet'; }
}
export function getUser(){ return currentUser; }
export function initWallet({onConnect,onDisconnect,onChanged}={}){
  async function connect(){
    if(location.protocol==='file:'){ alert('Open the site over http(s) to enable wallet.'); return; }
    const p=window.ethereum; if(!p){ alert("No Ethereum provider found. Install/enable MetaMask."); return; }
    try{
      const acc=await p.request({method:'eth_requestAccounts'});
      currentUser=acc?.[0]||null; setWalletUI(currentUser);
      if(currentUser && onConnect) onConnect(currentUser);
    }catch(e){ console.warn(e); }
  }
  function disconnect(){ currentUser=null; setWalletUI(null); onDisconnect?.(); }
  document.getElementById('connectBtn')?.addEventListener('click',()=> currentUser?disconnect():connect());
  if(window.ethereum){
    window.ethereum.on?.('accountsChanged',(a)=>{ currentUser=a?.[0]||null; setWalletUI(currentUser); onChanged?.(currentUser); });
  }
}

let heldTokens=[], heldContinuation='';
export function clearOwned(){ heldTokens=[]; heldContinuation=''; if(getTab()==='owned') renderOwned(); }
export function renderOwned(){
  const list=document.getElementById('chipWrap'); if(!list) return;
  if(getTab()!=='owned') return;
  list.innerHTML='';
  const user=getUser();
  if(!user){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to view owned tokens.</div></li>'; return; }
  if(!heldTokens.length){ list.innerHTML='<li class="list-item"><div class="muted">No tokens loaded yet. Click “Refresh Owned”.</div></li>'; return; }
  heldTokens.forEach(({id,image})=>{
    const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
    const li=document.createElement('li'); li.className='list-item';
    li.innerHTML =
      thumb64(image || (`${FF_CFG.SOURCE_PATH}/frog/${id}.png`), `Frog ${id}`) +
      `<div>
        <div class="row gap8">
          <b>Frog #${id}</b>
          ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill pill-ghost">Rank N/A</span>`}
        </div>
        <div class="muted">Owned by <span class="addr">${shorten(getUser()||"")}</span></div>
      </div>
      <div class="row" style="gap:6px;">
        <button class="btn btn-outline btn-sm" disabled title="Stake flow wired later">🔒 Stake</button>
      </div>`;
    li.style.cursor="pointer"; li.addEventListener("click",()=>openFrogInfo(id));
    list.appendChild(li);
  });
}
export async function fetchOwned(wallet, limit=50, nextStr){
  try{
    wallet = wallet || getUser();
    if(!wallet){ document.getElementById('stakeStatus').textContent='Connect a wallet to load owned tokens.'; return; }
    const cont = nextStr || heldContinuation || '';
    const qs = cont ? '&continuation='+encodeURIComponent(cont) : '';
    const url = `https://api.reservoir.tools/users/${wallet}/tokens/v8?collection=${FF_CFG.COLLECTION_ADDRESS}&limit=${limit}${qs}`;
    const res = await fetch(url, { method:'GET', headers:{ accept:'*/*','x-api-key': FF_CFG.FROG_API_KEY } });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const items = (data.tokens||[]).map(t=>{
      const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
      const id = tokenId!=null?parseInt(String(tokenId),10):null;
      const img = t?.token?.image ?? (`${FF_CFG.SOURCE_PATH}/frog/${tokenId}.png`);
      return id ? { id, image: img } : null;
    }).filter(Boolean);

    heldTokens = heldTokens.concat(items);
    heldContinuation = data.continuation || '';
    if(getTab()==='owned') renderOwned();
    const ss=document.getElementById('stakeStatus');
    if(ss) ss.textContent = `Owned: ${heldTokens.length}` + (heldContinuation ? ' • more available' : '');

    let btn = document.getElementById('heldMoreBtn');
    const anchor = document.getElementById('stakeControls');
    if(!heldContinuation){ if(btn) btn.remove(); }
    else {
      if(!btn){
        btn=document.createElement('button'); btn.id='heldMoreBtn';
        btn.className='btn btn-outline btn-sm'; btn.textContent='Load more Owned';
        anchor?.appendChild(btn);
      }
      btn.onclick = ()=> fetchOwned(wallet, limit, heldContinuation);
    }
  }catch(e){
    console.warn(e);
    document.getElementById('stakeStatus').textContent='Failed to fetch owned tokens.';
  }
}

/* =========================================================
   UNIFIED FEATURE TABS (Mints / Sales / Rarity / Pond)
   ========================================================= */
let currentFeatureView="mints"; // default order: Mints → Sales → Rarity → Pond

function applyFeatureControls(){
  const onMints  = currentFeatureView==='mints';
  const onSales  = currentFeatureView==='sales';
  const onRarity = currentFeatureView==='rarity';
  // Toggle any per-view controls (keep simple for now)
  const refreshBtn=document.getElementById("refreshBtn");
  const fetchLiveBtn=document.getElementById("fetchLiveBtn");
  const sortRankBtn=document.getElementById("sortRankBtn");
  const sortScoreBtn=document.getElementById("sortScoreBtn");
  if(refreshBtn)   refreshBtn.style.display   = (onMints||onSales) ? "" : "none";
  if(fetchLiveBtn) fetchLiveBtn.style.display = (onMints||onSales) ? "" : "none";
  if(sortRankBtn)  sortRankBtn.style.display  = onRarity ? "" : "none";
  if(sortScoreBtn) sortScoreBtn.style.display = onRarity ? "" : "none";
}

function setFeatureView(view){
  currentFeatureView=view;
  const wrap=document.getElementById('viewTabs');
  (wrap||document).querySelectorAll('.tab').forEach(btn=>{
    btn.setAttribute('aria-selected', btn.dataset.view===view ? 'true' : 'false');
  });

  if(view==='mints')   renderMints();
  else if(view==='sales')  renderSales();
  else if(view==='rarity') renderRarity();
  else renderPond();

  applyFeatureControls();
}

export function wireFeatureTabs(){
  const wrap=document.getElementById('viewTabs');
  if(wrap){
    wrap.innerHTML = ""; // rebuild in the required order
    const mk = (view,label)=>{
      const b=document.createElement('button');
      b.className='tab'; b.dataset.view=view; b.textContent=label;
      wrap.appendChild(b);
    };
    mk('mints','Recent Mints');
    mk('sales','Recent Sales');
    mk('rarity','Rarity');
    mk('pond','Pond');

    wrap.querySelectorAll('.tab').forEach(btn=>{
      btn.addEventListener('click',()=>setFeatureView(btn.dataset.view));
    });
  }
  setFeatureView("mints");
}

export function wireFeatureButtons(){
  document.getElementById("refreshBtn")?.addEventListener("click",()=>{
    if(currentFeatureView==='mints') renderMints();
    else if(currentFeatureView==='sales') renderSales();
  });
  document.getElementById("fetchLiveBtn")?.addEventListener("click",async()=>{
    if(currentFeatureView==='mints') { const ok=await loadMintsLive(); if(ok){ const b=document.getElementById("fetchLiveBtn"); if(b){ b.textContent="Live loaded"; b.disabled=true; b.classList.add("btn-ghost"); } } }
    else if(currentFeatureView==='sales'){ const ok=await loadSalesLive(); if(ok){ const b=document.getElementById("fetchLiveBtn"); if(b){ b.textContent="Live loaded"; b.disabled=true; b.classList.add("btn-ghost"); } } }
  });

  document.getElementById("sortRankBtn")?.addEventListener("click",()=>setRaritySort("rank"));
  document.getElementById("sortScoreBtn")?.addEventListener("click",()=>setRaritySort("score"));

  document.getElementById('selectAll')?.addEventListener('click',()=>{ const s=document.getElementById('stakeStatus'); if(s) s.textContent='Selected all visible tokens (demo).'; });
  document.getElementById('clearSel')?.addEventListener('click',()=>{ const s=document.getElementById('stakeStatus'); if(s) s.textContent='Cleared selection (demo).'; });
  document.getElementById('refreshOwned')?.addEventListener('click',()=>{
    const u=getUser(); if(!u){ const s=document.getElementById('stakeStatus'); if(s) s.textContent='Connect a wallet first.'; return; }
    clearOwned(); fetchOwned(u);
  });
}

/* =========================================================
   TAB GETTER BRIDGE (for staking.js to ask current tab)
   ========================================================= */
let _getTab = ()=>'owned';
export function setTabGetter(fn){ _getTab = fn; }
function getTab(){ return _getTab(); } // internal
