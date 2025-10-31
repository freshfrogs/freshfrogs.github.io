(function(FF, CFG){
  let LIST = null;      // full rarity items
  let LOOK = null;      // id -> rank
  let sortBy = 'rank';  // 'rank' | 'score'

  function setData(arr){
    LIST = Array.isArray(arr) ? arr : [];
    LOOK = Object.fromEntries(
      LIST.map(x => [ String(x.id), Number(x.ranking ?? x.rank ?? NaN) ])
          .filter(([,v]) => !Number.isNaN(v))
    );
  }

  async function loadOnce(){
    if(LIST) return true;
    try{
      const arr = await FF.fetchJSON(CFG.JSON_PATH);
      if(!Array.isArray(arr)) throw new Error('bad rarity json');
      setData(arr);
      return true;
    }catch(e){
      console.warn('Rarity load failed', e);
      LIST = []; LOOK = {};
      return false;
    }
  }

  function sorted(){
    if(!LIST?.length) return [];
    const a = [...LIST];
    if(sortBy==='score'){
      a.sort((x,y)=> Number(y.rarity??y.score??0) - Number(x.rarity??x.score??0));
    }else{
      a.sort((x,y)=> Number(x.ranking??x.rank??1e9) - Number(y.ranking??y.rank??1e9));
    }
    return a;
  }

  function render(){
    const ul = document.getElementById('rarityList');
    if(!ul) return;
    ul.innerHTML = '';
    const data = sorted();
    if(!data.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No rarity data yet.</div></li>';
      return;
    }
    data.forEach(it=>{
      const id = Number(it.id);
      const rank = it.ranking ?? it.rank ?? '?';
      const li = document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
           <div><b>Frog #${id}</b></div>
           <div class="muted">Rarity Rank</div>
         </div>
         <span class="pill">#${rank}</span>`;
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
      ul.appendChild(li);
    });
  }

  // Sorting buttons
  document.getElementById('sortRankBtn')?.addEventListener('click', ()=>{ sortBy='rank'; render(); });
  document.getElementById('sortScoreBtn')?.addEventListener('click',()=>{ sortBy='score'; render(); });

  // Public helpers used by other modules
  window.FF.ensureRarity = async ()=> { await loadOnce(); };
  window.FF.getRankById = (id)=> LOOK ? (LOOK[String(id)] ?? null) : null;

  // Public: render list now
  window.FF_renderRarityList = async ()=>{
    await loadOnce();
    render();
  };
})(window.FF, window.FF_CFG);
