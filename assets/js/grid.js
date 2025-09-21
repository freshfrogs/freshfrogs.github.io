// assets/js/grid.js
(function(CFG){
  const root = document.getElementById('grid');
  const baseURL = (p) => (/^https?:\/\//i.test(CFG.SOURCE_PATH||'')) ? CFG.SOURCE_PATH.replace(/\/$/,'') + '/' + p.replace(/^\//,'') : p;

  function ids(n){
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * CFG.SUPPLY));
    return [...s];
  }

  function render(){
    if (!root) return;
    root.innerHTML = '';
    ids(9).forEach(id=>{
      const tile = document.createElement('div');
      tile.className = 'tile';
      const img = document.createElement('img');
      img.src = baseURL(`frog/${id}.png`);
      img.alt = `Frog #${id}`;
      img.width = 128; img.height = 128;
      img.loading = 'lazy'; img.decoding = 'async';
      img.style.imageRendering = 'pixelated';
      img.style.margin = 'auto';
      tile.appendChild(img);
      // no click handler — not interactive
      root.appendChild(tile);
    });
  }

  window.FF_renderGrid = render;
})(window.FF_CFG);
