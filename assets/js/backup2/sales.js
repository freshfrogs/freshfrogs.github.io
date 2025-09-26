(function(FF, CFG){
  const HDR = { accept:'*/*','x-api-key': CFG.FROG_API_KEY };
  let SALES = []; // {id, time, price, buyer}

  function shortenAddr(x){
    const h = String(x||''); return /^0x[a-fA-F0-9]{40}$/.test(h) ? (h.slice(0,6)+'…'+h.slice(-4)) : (h||'—');
  }
  function parseTs(sale){
    let raw = sale?.timestamp ?? sale?.createdAt;
    if(raw==null) return null;
    if(typeof raw==='number'){ const ms=raw<1e12?raw*1000:raw; return new Date(ms); }
    const t=Date.parse(raw); return Number.isNaN(t)?null:new Date(t);
  }
  function mapSales(arr){
    return (arr||[]).map(s=>{
      const tokenId = s?.token?.tokenId ?? s?.tokenId;
      const id = tokenId!=null ? parseInt(String(tokenId),10) : null;
      if(!id) return null;
      const dt = parseTs(s);
      const priceEth = s?.price?.amount?.decimal ?? s?.price?.gross?.decimal ?? null;
      const buyer = s?.toAddress || s?.to?.address || s?.to || '—';
      return {
        id,
        time: dt ? FF.formatAgo(Date.now() - dt.getTime()) : '—',
        price: priceEth!=null ? `${Number(priceEth).toFixed(3)} ETH` : '—',
        buyer: shortenAddr(buyer)
      };
    }).filter(Boolean);
  }

  async function fetchLive(limit=60){
    const base="https://api.reservoir.tools/sales/v6";
    const q=new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      limit: String(limit),
      sortBy: "time",
      sortDirection: "desc"
    });
    const res = await fetch(`${base}?${q}`, { method:'GET', headers: HDR });
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    SALES = mapSales(json?.sales || []);
    return SALES.length;
  }

  function render(list = SALES){
    const ul = document.getElementById('recentSales');
    if(!ul) return;
    ul.innerHTML = '';
    if(!list.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No recent sales yet.</div></li>';
      return;
    }
    list.forEach(s=>{
      const rank = FF.getRankById ? FF.getRankById(s.id) : null;
      const badge = (rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;
      const li = document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${s.id}.png`, `Frog ${s.id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
             <b>Frog #${s.id}</b> ${badge}
           </div>
           <div class="muted">${s.time!=="—"?s.time+" ago":"—"} • Buyer ${s.buyer}</div>
         </div>
         <div class="price">${s.price}</div>`;
      // open modal on click
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id: s.id }));
      ul.appendChild(li);
    });
  }

  // Public
  async function loadAndRender(){
    try{
      await FF.ensureRarity?.(); // so ranks aren’t N/A
      if(CFG.FROG_API_KEY){ await fetchLive(); }
      render();
      return true;
    }catch(e){ console.warn('Sales load failed', e); render([]); return false; }
  }

  // Wire refresh button if present
  document.getElementById('fetchLiveBtn')?.addEventListener('click', loadAndRender);

  // Expose
  window.FF_loadSalesLive = loadAndRender;
  window.FF_renderSales    = render;
})(window.FF, window.FF_CFG);
