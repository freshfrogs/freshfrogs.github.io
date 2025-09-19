(function(FF,C){
  const opt={method:'GET',headers:{accept:'*/*','x-api-key':C.FROG_API_KEY}};
  let data=[];

  function addr(s){const c=s?.toAddress||s?.to?.address||s?.to;if(!c)return'—';const h=String(c);return /^0x[a-fA-F0-9]{40}$/.test(h)?(h.slice(0,6)+'…'+h.slice(-4)):(h.length>16?h.slice(0,6)+'…'+h.slice(-2):h)}
  function ts(s){let r=s?.timestamp??s?.createdAt;if(r==null)return null;if(typeof r==='number'){const ms=r<1e12?r*1000:r;return new Date(ms)}const t=Date.parse(r);return Number.isNaN(t)?null:new Date(t)}
  function map(res){return(res||[]).map(s=>{const tid=s?.token?.tokenId??s?.tokenId;const id=tid!=null?parseInt(String(tid),10):null;const b=addr(s);const d=ts(s);const p=s?.price?.amount?.decimal??s?.price?.gross?.decimal??null;if(!id)return null;return{id,time:d?FF.formatAgo(Date.now()-d.getTime()):'—',price:p!=null?p.toFixed(3)+' ETH':'—',buyer:b}}).filter(Boolean)}
  async function fetchSales({limit=50,continuation=""}={}){const base="https://api.reservoir.tools/sales/v6";const q=new URLSearchParams({collection:C.COLLECTION_ADDRESS,limit:String(limit),sortBy:"time",sortDirection:"desc"});if(continuation)q.set("continuation",continuation);const r=await fetch(base+'?'+q.toString(),opt);if(!r.ok)throw new Error(r.status);return r.json()}
  function renderAll(list=data){const ul=document.getElementById('recentSales');if(!ul)return;ul.innerHTML='';const arr=(list&&list.length)?list:[{id:3250,time:"3m",price:"0.080 ETH",buyer:"0x9a…D1"}];arr.slice(0,100).forEach(x=>{const rank=(window.FF_getRankById?window.FF_getRankById(x.id):null);const badge=(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;const li=document.createElement('li');li.className='list-item';li.innerHTML=FF.thumb64(`${C.SOURCE_PATH}/frog/${x.id}.png`,`Frog ${x.id}`)+`<div><div style="display:flex;align-items:center;gap:8px;"><b>Frog #${x.id}</b> ${badge}</div><div class="muted">${x.time!=="—"?x.time+" ago":"—"} • Buyer ${x.buyer}</div></div><div class="price">${x.price}</div>`;ul.appendChild(li)});}
  async function live(){try{if(!C.FROG_API_KEY||C.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE")throw new Error("Missing Reservoir API key");const f=await fetchSales({limit:50});const m=map(f.sales||[]);if(m.length){data=m;renderAll();return true}return false}catch(e){console.warn('Sales fetch failed',e);return false}}
  document.getElementById('refreshBtn')?.addEventListener('click',()=>renderAll());
  document.getElementById('fetchLiveBtn')?.addEventListener('click',live);
  window.FF_renderSales=()=>renderAll();
  window.FF_loadSalesLive=live;
})(window.FF,window.FF_CFG);