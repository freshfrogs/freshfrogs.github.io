// assets/js/grid.js
(function(C){
  const g=document.getElementById('grid'),
        L=document.getElementById('lightbox'),
        S=document.getElementById('lightboxStage');

  function ids(n){
    const s=new Set();
    while(s.size<n) s.add(1+Math.floor(Math.random()*C.SUPPLY));
    return [...s];
  }

  function render(){
    if(!g) return;
    g.innerHTML='';
    ids(9).forEach(id=>{
      const t=document.createElement('div');
      t.className='tile';
      t.innerHTML = `<img src="${C.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" width="128" height="128" loading="lazy" decoding="async" style="image-rendering:pixelated;">`;
      t.addEventListener('click',()=>{
        // Use the layered modal you now have
        window.FF?.openFrogModal?.({ id });
      });
      g.appendChild(t);
    });
  }

  // Dismiss any old lightbox (modal handles its own now)
  L?.addEventListener?.('click',()=> L.style.display='none');

  window.FF_renderGrid = render;
})(window.FF_CFG);
