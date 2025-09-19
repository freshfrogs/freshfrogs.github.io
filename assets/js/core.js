// ===== CONFIG =====
export const FF_CFG = {
  SOURCE_PATH: "https://freshfrogs.github.io",
  SUPPLY: 4040,
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",
  JSON_PATH: "assets/freshfrogs_rarity_rankings.json",
  FROG_API_KEY: (window.frog_api || "3105c552-60b6-5252-bca7-291c724a54bf"),
  AUTO_INIT: false,
  ABI: {
    controller: "assets/abi/controller_abi.json",
    collection: "assets/abi/collection_abi.json"
  }
};

// ===== UTILS =====
export const shorten = a => a ? (a.slice(0,6) + "…" + a.slice(-4)) : "";
export const thumb64 = (src, alt) => `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
export const formatAgo = (ms)=>{
  const s=Math.floor(ms/1e3); if(s<60) return s+"s";
  const m=Math.floor(s/60);   if(m<60) return m+"m";
  const h=Math.floor(m/60);   if(h<24) return h+"h";
  const d=Math.floor(h/24);   return d+"d";
};
export const fetchJSON = async (p)=>{ const r=await fetch(p,{cache:"no-store"}); if(!r.ok) throw new Error(r.status); return r.json(); };
export const isLocal = ()=> location.protocol === "file:";

// ===== THEME =====
export function initTheme(){
  const K="ff_theme",root=document.documentElement;
  function set(t){
    root.setAttribute("data-theme",t);
    document.querySelectorAll(".theme-dock .swatch").forEach(s=>s.setAttribute("aria-current",s.dataset.theme===t?"true":"false"));
    localStorage.setItem(K,t);
  }
  set(localStorage.getItem(K)||root.getAttribute("data-theme")||"noir");
  document.querySelectorAll(".theme-dock .swatch").forEach(s=>s.addEventListener("click",()=>set(s.dataset.theme)));
}

// ===== Reservoir Sales API =====
const salesHeaders = ()=> ({ accept:"*/*", "x-api-key": FF_CFG.FROG_API_KEY });
const addr = (s)=>{
  const c=s?.toAddress||s?.to?.address||s?.to;
  if(!c) return "—";
  const h=String(c);
  return /^0x[a-fA-F0-9]{40}$/.test(h)?(h.slice(0,6)+"…"+h.slice(-4)):(h.length>16?h.slice(0,6)+"…"+h.slice(-2):h);
};
const ts = (s)=>{
  let r=s?.timestamp??s?.createdAt;
  if(r==null) return null;
  if(typeof r==='number'){ const ms=r<1e12?r*1000:r; return new Date(ms); }
  const t=Date.parse(r); return Number.isNaN(t)?null:new Date(t);
};
export function mapSales(res){
  return (res||[]).map(s=>{
    const tid=s?.token?.tokenId??s?.tokenId; const id=tid!=null?parseInt(String(tid),10):null;
    const b=addr(s); const d=ts(s);
    const p=s?.price?.amount?.decimal??s?.price?.gross?.decimal??null;
    if(!id) return null;
    return { id, time: d?formatAgo(Date.now()-d.getTime()):"—", price: p!=null? p.toFixed(3)+" ETH":"—", buyer: b };
  }).filter(Boolean);
}
export async function fetchSales({limit=50,continuation=""}={}){
  const base="https://api.reservoir.tools/sales/v6";
  const q=new URLSearchParams({collection:FF_CFG.COLLECTION_ADDRESS,limit:String(limit),sortBy:"time",sortDirection:"desc"});
  if(continuation) q.set("continuation",continuation);
  const r=await fetch(base+"?"+q.toString(),{method:"GET",headers:salesHeaders()});
  if(!r.ok) throw new Error(r.status);
  return r.json();
}

// ===== ABI loader (with fallback) =====
export async function loadABI(path, fallback){
  try{
    if(!path) throw 0;
    const res=await fetch(path,{cache:"no-store"});
    if(!res.ok) throw 0;
    const json=await res.json();
    if(Array.isArray(json)) return json;
    if(json && Array.isArray(json.abi)) return json.abi;
    throw 0;
  }catch{
    return fallback;
  }
}
