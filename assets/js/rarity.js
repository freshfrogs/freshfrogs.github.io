(function(FF, CFG){
  let RARITY_LIST=null, RANK_LOOKUP=null;
  let page=0, sortBy='rank';

  function setRarity(list){
    RARITY_LIST = list;
    RANK_LOOKUP = Object.fromEntries(
      list
        .map(it => [String(it.id), Number(it.ranking ?? it.rank ?? NaN)])
        .filter(([,v]) => !Number.isNaN(v))
    );
  }

  async function loadFromFetch(){
    try{
      const arr = await FF.fetchJSON(CFG.JSON_PATH);
      if(!Array.isArray(arr)) throw new Error('not array');
      setRarity(arr);
      return true;
    }catch{ return false; }
  }

  function getSorted(){
    if(!RARITY_LIST?.length) return [];
    const a=[...RARITY_LIST];
    if(sortBy==='score'){
      a.sort((x,y)=>Number(y.rarity??y.score??0)-Number(x.rarity??x.score??0));
    } else {
      a.sort((x,y)=>Number(x.ranking??x.rank??1e9)-Number(y.ranking??y.rank??1e9));
    }
    return a;
  }

  // ---- shared row template (exported) ----
  function FF_renderRarityRow(item){
    const id=item.id;
    const rank=item.ranking??item.rank??'?';
    const score=(item.rarity??item.score??'').toString();
    const badge = `<span class="pill">#${rank}</span>`;
    return (
      FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
      `<div>
         <div><b>Frog #${id}</b></div>
         <div class="muted">${score?`Rarity Score: ${score}`:`Rarity Score: N/A`}</div>
       </div>${badge}`
    );
  }

  // ---- original ID-based renderer with paging preserved ----
  function renderPage(i=0){
    page=i;
    const ul=document.getElementById('rarityList'); if(!ul) return; ul.innerHTML='';
    const data=getSorted();
    if(!data.length){
      ul.innerHTML='<li class="list-item"><div class="muted">No data yet</div></li>';
      FF.togglePagerBtns('rarity',0,0);
      return;
    }
    const start=page*CFG.PAGE_SIZE, end=start+CFG.PAGE_SIZE;
    data.slice(start,end).forEach(item=>{
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF_renderRarityRow(item);
      ul.appendChild(li);
    });
    FF.togglePagerBtns('rarity', page, data.length);
  }

  // sort & pager (unchanged)
  document.getElementById('sortRankBtn')?.addEventListener('click',()=>{ sortBy='rank'; renderPage(0); });
  document.getElementById('sortScoreBtn')?.addEventListener('click',()=>{ sortBy='score'; renderPage(0); });
  document.getElementById('rarityMore')?.addEventListener('click',()=>{ const pages=Math.ceil(getSorted().length/CFG.PAGE_SIZE); if(page<pages-1) page++; renderPage(page); });
  document.getElementById('rarityLess')?.addEventListener('click',()=>{ if(page>0) page--; renderPage(page); });

  // local file picker (for file:// testing)
  function showLocalPicker(){ const el=document.getElementById('localLoad'); if (el) el.style.display='block'; }
  function wireLocalPicker(){
    const pick=document.getElementById('rarityFile'), btn=document.getElementById('useLocalBtn');
    btn?.addEventListener('click', ()=>{
      const f=pick?.files?.[0];
      if(!f){ alert("Choose assets/freshfrogs_rarity_rankings.json"); return; }
      const rd=new FileReader();
      rd.onload=()=>{
        try{
          const arr=JSON.parse(rd.result);
          if(!Array.isArray(arr)) throw 0;
          setRarity(arr);
          renderPage(0);
          window.FF_getRankById = (id)=> RANK_LOOKUP ? (RANK_LOOKUP[String(id)] ?? null) : null;
          const el=document.getElementById('localLoad'); if (el) el.style.display='none';
        }catch{ alert("Invalid rarity JSON"); }
      };
      rd.readAsText(f);
    });
  }

  // ---- NEW: return the sorted rarity data (no paging) ----
  async function FF_getRarityData(){
    if (!RARITY_LIST){
      // mirror FF_loadRarity’s behavior: try fetch unless file://
      if (location.protocol !== 'file:'){ await loadFromFetch().catch(()=>{}); }
    }
    // return a *copy* of the sorted list in the current sort mode
    return getSorted().slice();
  }

  // ---- NEW: render into any container (for the unified tab) ----
  async function FF_renderRarityList(containerEl){
    if (!containerEl) return;
    const data = await FF_getRarityData();
    containerEl.innerHTML = '';
    const arr = data.length ? data : [];
    if (!arr.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No data yet';
      containerEl.appendChild(empty);
      return;
    }
    arr.forEach(item=>{
      const row = document.createElement('div');
      row.className = 'list-item'; // same styling hook as your UL-based list items
      row.innerHTML = FF_renderRarityRow(item);
      containerEl.appendChild(row);
    });
  }

  // expose (original + new)
  window.FF_loadRarity = async ()=>{
    let ok = false;
    if(location.protocol !== 'file:'){ ok = await loadFromFetch(); }
    if(!ok){ showLocalPicker(); wireLocalPicker(); }
    window.FF_getRankById = (id)=> RANK_LOOKUP ? (RANK_LOOKUP[String(id)] ?? null) : null;
    renderPage(0);
  };

  window.FF_getRarityData = FF_getRarityData;
  window.FF_renderRarityRow = FF_renderRarityRow;
  window.FF_renderRarityList = FF_renderRarityList;
})(window.FF, window.FF_CFG);
