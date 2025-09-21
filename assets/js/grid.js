(function(CFG){
  const gridEl = document.getElementById('grid');
  const lightbox = document.getElementById('lightbox');
  const stage = document.getElementById('lightboxStage');

  function randomIds(n){
    const s=new Set();
    while(s.size<n) s.add(1+Math.floor(Math.random()*CFG.SUPPLY));
    return [...s];
  }

  function renderSimpleGrid(){
    gridEl.innerHTML='';
    randomIds(9).forEach(id=>{
      const tile=document.createElement('div');
      tile.className='tile';
      tile.innerHTML=`<img src="${CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" decoding="async">`;
      tile.addEventListener('click', ()=>{
        stage.innerHTML='';
        const big=document.createElement('img');
        big.src=`${CFG.SOURCE_PATH}/frog/${id}.png`;
        big.alt=`Frog #${id}`;
        big.style.width='100%'; big.style.height='100%';
        big.style.objectFit='contain'; big.style.imageRendering='pixelated';
        stage.appendChild(big);
        lightbox.style.display='grid';
      });
      gridEl.appendChild(tile);
    });
  }

  lightbox.addEventListener('click',()=> lightbox.style.display='none');

  window.FF_renderGrid = renderSimpleGrid;
})(window.FF_CFG);
