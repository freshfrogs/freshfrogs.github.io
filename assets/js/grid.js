// Simple 3×3 grid of static PNGs (128×128), no click handlers.
(function (CFG) {
  const root = document.getElementById('grid');
  if (!root) return;

  // Ensure the layout is exactly 3×3 @ 128px cells
  function ensureLayout() {
    root.style.display = 'grid';
    root.style.gridTemplateColumns = 'repeat(3, 128px)';
    root.style.gridAutoRows = '128px';
    root.style.gap = '0';
    root.style.placeItems = 'center';
  }

  function randIds(n) {
    const max = Math.max(1, Number(CFG.SUPPLY || 4040));
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * max));
    return [...s];
  }

  function render() {
    ensureLayout();
    root.innerHTML = '';
    const ids = randIds(9);
    ids.forEach(id => {
      const wrap = document.createElement('div');
      wrap.className = 'tile';
      wrap.style.width = '128px';
      wrap.style.height = '128px';
      wrap.style.overflow = 'hidden';

      const img = document.createElement('img');
      img.src = `${CFG.SOURCE_PATH}/frog/${id}.png`;
      img.alt = `Frog #${id}`;
      img.width = 128;
      img.height = 128;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.imageRendering = 'pixelated';
      img.style.objectFit = 'contain';
      img.onerror = () => { wrap.style.display = 'none'; };

      wrap.appendChild(img);
      root.appendChild(wrap);
    });
  }

  window.FF_renderGrid = render;
})(window.FF_CFG);
