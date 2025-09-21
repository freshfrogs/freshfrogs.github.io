// Grid: show 9 random static frogs at 128x128 (no click)
(function (CFG) {
  const grid = document.getElementById('grid');
  if (!grid) return;

  function pickIds(n) {
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * CFG.SUPPLY));
    return [...s];
  }

  function render() {
    grid.innerHTML = '';
    pickIds(9).forEach(id => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.innerHTML = `<img class="thumb128" src="${CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" decoding="async">`;
      grid.appendChild(tile);
    });
  }

  // expose (if you want to shuffle later)
  window.FF_renderGrid = render;

  render();
})(window.FF_CFG);
