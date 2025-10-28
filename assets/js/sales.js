(function(FF, CFG){
  const options = { method:'GET', headers:{ accept:'*/*', 'x-api-key': CFG.FROG_API_KEY } };
  let recentSalesData = [];
  let recentPage = 0;

  function normAddr(sale){
    const cand = sale?.toAddress || sale?.to?.address || sale?.to;
    if(!cand) return '—';
    const hex=String(cand);
    return /^0x[a-fA-F0-9]{40}$/.test(hex) ? (hex.slice(0,6)+'…'+hex.slice(-4)) : (hex.length>16?hex.slice(0,6)+'…'+hex.slice(-2):hex);
  }
  function normTs(sale){
    let raw = sale?.timestamp ?? sale?.createdAt;
    if(raw==null) return null;
    if(typeof raw==='number'){ const ms=raw<1e12?raw*1000:raw; return new Date(ms); }
    const t=Date.parse(raw); return Number.isNaN(t)?null:new Date(t);
  }
  function mapSales(res){
    return (res||[]).map(s=>{
      const tokenId = s?.token?.tokenId ?? s?.tokenId;
      const id = tokenId!=null?parseInt(String(tokenId),10):null;
      const buyer = normAddr(s);
      const dt = normTs(s);
      const priceEth = s?.price?.amount?.decimal ?? s?.price?.gross?.decimal ?? null;
      if(!id) return null;
      return { id, time: dt?FF.formatAgo(Date.now()-dt.getTime()):'—', price: priceEth!=null?priceEth.toFixed(3)+' ETH':'—', buyer };
    }).filter(Boolean);
  }
  async function fetchSales({limit=50, continuation=""}={}){
    const base="https://api.reservoir.tools/sales/v6";
    const params=new URLSearchParams({collection:CFG.COLLECTION_ADDRESS,limit:String(limit),sortBy:"time",sortDirection:"desc"});
    if(continuation) params.set("continuation", continuation);
    const res=await fetch(base+'?'+params.toString(), options);
    if(!res.ok) throw new Error(res.status);
    return res.json();
  }

  function renderPage(page=0, list=recentSalesData){
    const ul=document.getElementById('recentSales'); if(!ul) return;
    ul.innerHTML='';
    const start=page*CFG.PAGE_SIZE, end=start+CFG.PAGE_SIZE;
    const arr=(list&&list.length)?list:[{id:3250,time:"3m",price:"0.080 ETH",buyer:"0x9a…D1"}];
    arr.slice(start,end).forEach(s=>{
      const rank = (window.FF_getRankById ? window.FF_getRankById(s.id) : null);
      const badge = (rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(`${CFG.SOURCE_PATH}/frog/${s.id}.png`, `Frog ${s.id}`) +
        `<div><div style="display:flex;align-items:center;gap:8px;"><b>Frog #${s.id}</b> ${badge}</div><div class="muted">${s.time!=="—"?s.time+" ago":"—"} • Buyer ${s.buyer}</div></div><div class="price">${s.price}</div>`;
      ul.appendChild(li);
    });
    FF.togglePagerBtns('recent', page, arr.length);
  }

  async function loadLive(){
    try{
      if(!CFG.FROG_API_KEY || CFG.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE") throw new Error("Missing Reservoir API key");
      const first = await fetchSales({limit:50});
      const mapped = mapSales(first.sales||[]);
      if(mapped.length){ recentSalesData = mapped; recentPage=0; renderPage(0); return true; }
      return false;
    }catch(e){ console.warn('Sales fetch failed', e); return false; }
  }

  // wire buttons
  document.getElementById('recentMore')?.addEventListener('click',()=>{ const pages=Math.ceil((recentSalesData.length||1)/CFG.PAGE_SIZE); if(recentPage<pages-1) recentPage++; renderPage(recentPage); });
  document.getElementById('recentLess')?.addEventListener('click',()=>{ if(recentPage>0) recentPage--; renderPage(recentPage); });
  document.getElementById('refreshBtn')?.addEventListener('click', ()=> renderPage(recentPage) );
  document.getElementById('fetchLiveBtn')?.addEventListener('click', loadLive);

  // expose
  window.FF_renderSales = ()=> renderPage(0);
  window.FF_loadSalesLive = loadLive;
})(window.FF, window.FF_CFG);
