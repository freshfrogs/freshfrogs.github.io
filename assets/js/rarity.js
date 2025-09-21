(function(FF, CFG){
  let RARITY_LIST=null, RANK_LOOKUP=null;
  let sortBy='rank';

  function setRarity(list){
    RARITY_LIST = list;
    RANK_LOOKUP = Object.fromEntries(list.map(it=>[String(it.id), Number(it.ranking ?? it.rank ?? NaN)]).filter(([,v])=>!Number.isNaN(v)));
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
    if(sortBy==='score') a.sort((x,y)=>Number(y.rarity??y.score??0)-Number(x.rarity??x.score??0));
    else a.sort((x,y)=>Number(x.ranking??x.rank??1e9)-Number(y.ranking??y.rank??1e9));
    return a;
  }

  function renderAll(){
    const wrap=document.getElementById('tab-rarity'); if(!wrap) return;
    let ul=wrap.querySelector('#rarityList');
    if(!ul){ ul=document.createElement('ul'); ul.id='rarityList'; ul.className='card-list'; wrap.appendChild(ul); }
    ul.innerHTML='';
    const data=getSorted();
    if(!data.length){ ul.innerHTML='<li class="list-item"><div class="muted">No data yet</div></li>'; return; }

    data.forEach(item=>{
      const id=item.id, rank=item.ranking??item.rank??'?', score=(item.rarity??item.score??'').toString();
      const li=document.createElement('li'); li.className='list-item'; li.dataset.frogId=String(id);
      li.innerHTML = FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div><b>Frog #${id}</b></div>
          <div class="muted">${score?`Rarity Score: ${score}`:`Rarity Score: N/A`}</div>
        </div><span class="pill">#${rank}</span>`;
      ul.appendChild(li);

      // modal on click
      li.addEventListener('click', ()=>{
        FF.openFrogModal({
          id,
          rank: (typeof rank==='number'?rank:null),
          score: score || null,
          image: `${CFG.SOURCE_PATH}/frog/${id}.png`
        });
      });
    });
  }

  document.getElementById('sortRankBtn')?.addEventListener('click',()=>{ sortBy='rank'; renderAll(); });
  document.getElementById('sortScoreBtn')?.addEventListener('click',()=>{ sortBy='score'; renderAll(); });

  // expose
  window.FF_loadRarity = async ()=>{
    let ok = false;
    if(location.protocol !== 'file:'){ ok = await loadFromFetch(); }
    if(!ok){ document.getElementById('localLoad').style.display='block';
      const pick=document.getElementById('rarityFile'), btn=document.getElementById('useLocalBtn');
      btn?.addEventListener('click', ()=>{
        const f=pick?.files?.[0]; if(!f){ alert("Choose assets/freshfrogs_rarity_rankings.json"); return; }
        const rd=new FileReader();
        rd.onload=()=>{ try{ const arr=JSON.parse(rd.result); if(!Array.isArray(arr)) throw 0; setRarity(arr); renderAll(); document.getElementById('localLoad').style.display='none'; }catch{ alert("Invalid rarity JSON"); } };
        rd.readAsText(f);
      });
    }
    window.FF_getRankById = (id)=> RANK_LOOKUP ? (RANK_LOOKUP[String(id)] ?? null) : null;
    renderAll();
  };
})(window.FF, window.FF_CFG);
