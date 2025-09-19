// Data: Reservoir sales, rarity load, owned/staked (stubs)
(function(){
  const C = window.FF_CFG;
  const $ = (sel, el=document)=> el.querySelector(sel);
  const h = (html)=> { const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  // ---------- Recent Sales (Reservoir) ----------
  let sales = [], salesContinuation = "";

  async function fetchSales({limit=30, continuation=""}={}){
    const url = new URL("https://api.reservoir.tools/sales/v6");
    const params = {
      limit,
      collection: C.COLLECTION_ADDRESS,
      includeTokenMetadata: "true",
      sortBy: "eventTimestamp",
      sortDirection: "desc"
    };
    if(continuation) params.continuation = continuation;
    Object.entries(params).forEach(([k,v])=> url.searchParams.set(k,v));

    const headers = { "x-api-key": C.FROG_API_KEY };
    const res = await fetch(url, { headers });
    if(!res.ok) throw new Error("Reservoir error: "+res.status);
    return res.json();
  }

  function renderSales(){
    const host = $('#recentSales'); if(!host) return;
    host.innerHTML = "";
    if(!sales.length){ host.innerHTML = `<p class="muted">No sales loaded yet. Click “Fetch Live”.</p>`; return; }
    for(const s of sales){
      const img = s.token?.image || "";
      const name = s.token?.name || (s.token?.tokenId ? `#${s.token?.tokenId}` : "Token");
      const price = s.price?.amount?.decimal;
      const currency = s.price?.currency?.symbol || "ETH";
      const when = new Date(s.timestamp).toLocaleString();
      host.appendChild(h(`
        <div class="item">
          <img class="thumb" src="${img}" alt="${name}">
          <div>
            <div><strong>${name}</strong></div>
            <div class="muted">${price ?? "?"} ${currency} • ${when}</div>
          </div>
        </div>
      `));
    }
    const moreBtn = $('#salesMoreBtn');
    if(moreBtn){
      moreBtn.style.display = salesContinuation ? "inline-block" : "none";
      moreBtn.onclick = ()=> loadSales(true);
    }
  }

  async function loadSales(next=false){
    if(!C.FROG_API_KEY || C.FROG_API_KEY === "YOUR_RESERVOIR_API_KEY_HERE"){
      alert("Set your Reservoir API key first."); return;
    }
    try{
      const data = await fetchSales({ limit: 30, continuation: next ? salesContinuation : "" });
      const mapped = (data.sales||[]).map(s=> ({
        token: s.token,
        price: s.price,
        timestamp: s.eventTimestamp
      }));
      if(next) sales = sales.concat(mapped); else sales = mapped;
      salesContinuation = data.continuation || "";
      renderSales();
    }catch(e){
      console.warn(e);
      alert("Failed to fetch sales");
    }
  }
  $('#salesFetch')?.addEventListener('click', ()=> loadSales(false));

  // ---------- Rarity Rankings ----------
  async function loadRarityFromPath(){
    try{
      const res = await fetch(C.JSON_PATH, { cache: "no-store" });
      const json = await res.json();
      renderRarity(json);
    }catch(e){ alert("Failed to load JSON_PATH"); }
  }
  async function loadRarityFromFile(file){
    const text = await file.text();
    const json = JSON.parse(text);
    renderRarity(json);
  }
  function renderRarity(json){
    const host = $('#rarityList'); if(!host) return;
    host.innerHTML = "";
    const items = Array.isArray(json) ? json : (json.items || []);
    if(!items.length){ host.innerHTML = `<p class="muted">No items found in JSON.</p>`; return; }
    for(const r of items.slice(0,1000)){ // cap for perf
      const img = r.image || r.img || "";
      const id = r.id ?? r.tokenId ?? r.token_id ?? "?";
      const rank = r.rank ?? r.rarity_rank ?? r.rarityRank ?? "";
      host.appendChild(h(`
        <div class="item">
          <img class="thumb" src="${img}" alt="Token ${id}">
          <div>
            <div><strong>#${id}</strong> ${rank!==""?`<span class="muted">• Rank ${rank}</span>`:""}</div>
            ${r.name?`<div class="muted">${r.name}</div>`:""}
          </div>
        </div>
      `));
    }
  }
  $('#rarityLoad')?.addEventListener('click', loadRarityFromPath);
  $('#rarityFile')?.addEventListener('change', (e)=>{
    const file = e.target.files?.[0]; if(file) loadRarityFromFile(file);
  });

  // ---------- Owned/Staked (stubs to keep file count low) ----------
  // You can wire these to on-chain calls later.
  window.FF_fetchOwned = async function(addr){
    const host = $('#ownedList'); if(!host) return;
    host.innerHTML = "";
    // Placeholder: demonstrate layout with 6 items
    for(let i=0;i<6;i++){
      host.appendChild(h(`<div class="item"><img class="thumb" src="assets/img/frog${(i%9)+1}.png"><div><strong>Owned #${i+1}</strong><div class="muted">${addr}</div></div></div>`));
    }
  };
  window.FF_loadStaked = async function(){
    const host = $('#stakedList'); if(!host) return;
    host.innerHTML = "";
    // Placeholder: demonstrate layout with 4 items
    for(let i=0;i<4;i++){
      host.appendChild(h(`<div class="item"><img class="thumb" src="assets/img/frog${(i%9)+1}.png"><div><strong>Staked #${i+1}</strong><div class="muted">Controller: ${C.CONTROLLER_ADDRESS.slice(0,6)}…${C.CONTROLLER_ADDRESS.slice(-4)}</div></div></div>`));
    }
  };
})();