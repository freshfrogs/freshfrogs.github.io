// assets/js/grid.js
(function(C){
  const grid = document.getElementById('grid');

  function pickUnique(n, max){
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * max));
    return [...s];
  }

  function render(){
    if (!grid) return;
    grid.innerHTML = '';

    // ensure it's a 3x3; images themselves are 128x128
    const ids = pickUnique(9, C.SUPPLY);

    ids.forEach(id=>{
      const wrap = document.createElement('div');
      wrap.className = 'tile';
      // No click handler (you asked for non-clickable)
      wrap.innerHTML = `<img class="thumb128" src="${C.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" width="128" height="128">`;
      grid.appendChild(wrap);
    });
  }

  // expose
  window.FF_renderGrid = render;
})(window.FF_CFG);
