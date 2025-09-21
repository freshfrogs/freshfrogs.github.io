(function(FF, CFG){
  const options = { method:'GET', headers:{ accept:'*/*', 'x-api-key': CFG.FROG_API_KEY } };
  let recentSalesData = [];

  function normAddr(sale){
    const cand = sale?.toAddress || sale?.to?.address || sale?.to;
    if(!cand) return null;
    const hex=String(cand);
    return /^0x[a-fA-F0-9]{40}$/.test(hex) ? hex : (hex.length>16?hex.slice(0,6)+'…'+hex.slice(-2):hex);
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
      return {
        id,
        time: dt?FF.formatAgo(Date.now()-dt.getTime()):null,
        price: priceEth!=null?priceEth.toFixed(3)+' ETH':null,
        buyer
      };
    }).filter(Boolean);
  }
  async function fetchSales({limit=200, continuation=""}={}){
    const base="https://api.reservoir.tools/sales/v6";
    const params=new URLSearchParams({
      collection:CFG.COLLECTION_ADDRESS,
      limit:String(limit),
      sortBy:"time",
      sortDirection:"desc"
    });
    if(continuation) params.set("continuation", continuation);
    const res=await fetch(base+'?'+params.toString(), options);
    if(!res.ok) throw new Error(res.status);
    return res.json();
  }

  function renderAll(list=recentSalesData){
    const wrap=document.getElementById('tab-sales'); if(!wrap) return;
    let ul=wrap.querySelector('#recentSales');
    if(!ul){ ul=document.createElement('ul'); ul.id='recentSales'; ul.className='card-list'; wrap.appendChild(ul); }
    ul.innerHTML='';
    const arr=(list&&list.length)?list:[];
    if(!arr.length){
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML='<div class="muted">No sales yet.</div>'; ul.appendChild(li); return;
    }
    arr.forEach(s=>{
      const rank = (window.FF_getRankById ? window.FF_getRankById(s.id) : null);
      const badge = (rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;
      const li=document.createElement('li'); li.className='list-item'; li.dataset.frogId=String(s.id);
      li.innerHTML = FF.thumb64(`${CFG.SOURCE_PATH}/frog/${s.id}.png`, `Frog ${s.id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;"><b>Frog #${s.id}</b> ${badge}</div>
          <div class="muted">${s.time?`${s.time} ago`:'—'}${s.buyer?` • Buyer ${FF.shorten(s.buyer)}`:''}</div>
        </div><div class="price">${s.price??''}</div>`;
      ul.appendChild(li);

      // modal on click
      li.addEventListener('click', ()=>{
        FF.openFrogModal({
          id:s.id,
          rank,
          image:`${CFG.SOURCE_PATH}/frog/${s.id}.png`,
          buyer:s.buyer,
          time:s.time,
          price:s.price
        });
      });
    });
  }

  async function loadLive(){
    try{
      if(!CFG.FROG_API_KEY || CFG.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE") throw new Error("Missing Reservoir API key");
      const first = await fetchSales({limit:200});
      const mapped = mapSales(first.sales||[]);
      if(mapped.length){ recentSalesData = mapped; renderAll(); return true; }
      renderAll([]); return false;
    }catch(e){ console.warn('Sales fetch failed', e); renderAll([]); return false; }
  }

  // expose
  window.FF_renderSales = ()=> renderAll();
  window.FF_loadSalesLive = loadLive;
})(window.FF, window.FF_CFG);
