// 3×3, static, not clickable. 128×128 PNGs from SOURCE_PATH.
(function (CFG) {
  const root = document.getElementById('grid');

  function uniqueIds(n, max) {
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * max));
    return [...s];
  }

  function render() {
    if (!root) return;
    root.innerHTML = '';
    const ids = uniqueIds(9, CFG.SUPPLY);

    ids.forEach(id => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      // Use the 128px class to lock size
      tile.innerHTML =
        `<img class="thumb128" src="${CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" decoding="async" width="128" height="128">`;
      root.appendChild(tile);
    });
  }

  window.FF_renderGrid = render;
})(window.FF_CFG);
