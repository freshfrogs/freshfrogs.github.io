// assets/js/main.js
(function(){
  // Theme toggles, etc., are assumed to be elsewhere if you already have them

  // Render hero grid (3x3 of 128px images, NOT clickable)
  (function(CFG){
    const g = document.getElementById('grid');
    if(!g) return;
    function ids(n){
      const s=new Set();
      while(s.size<n) s.add(1+Math.floor(Math.random()*CFG.SUPPLY));
      return [...s];
    }
    function render(){
      g.innerHTML='';
      ids(9).forEach(id=>{
        const t=document.createElement('div'); t.className='tile';
        t.innerHTML = `<img src="${CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" width="128" height="128" loading="lazy" decoding="async" style="image-rendering:pixelated">`;
        g.appendChild(t);
      });
    }
    window.FF_renderGrid = render;
  })(window.FF_CFG||{SUPPLY:4040,SOURCE_PATH:''});

  // Wire sales + rarity if those modules expose renderers
  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      // Rarity first so badges work
      await window.FF.ensureRarity?.();
    }catch{}

    // Sales
    try{
      await window.FF_loadSalesLive?.();
      window.FF_renderSales?.();
    }catch(e){ console.warn('Sales init failed', e); }

    // Rarity list
    try{
      await window.FF_loadRarity?.();
    }catch(e){ console.warn('Rarity init failed', e); }

    // Pond
    try{
      const pondEl = document.getElementById('pondList') || document.getElementById('tab-pond');
      if (pondEl) await window.FF_renderPond?.(pondEl);
    }catch(e){ console.warn('Pond init failed', e); }

    // Grid
    try{ window.FF_renderGrid?.(); }catch{}
  });
})();
