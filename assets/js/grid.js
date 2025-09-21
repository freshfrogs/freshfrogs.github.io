/* global window, document */
(function (FF, CFG) {
  // Which attributes should NOT lift on hover
  const HOVER_EXCLUDE = new Set(['Frog', 'Trait', 'SpecialFrog']);
  // Which attributes should NOT use animated GIFs (use PNG instead)
  const ANIM_EXCLUDE = new Set(['Frog', 'Trait', 'Hat']);

  const SIZE = 256;

  function sanitize(v) {
    // file names are case sensitive on GitHub pages
    return String(v).replace(/\s+/g, '').replace(/[^\w()-]/g, '');
  }

  function makeImg(src, cls) {
    const img = new Image();
    img.className = cls || '';
    img.decoding = 'async';
    img.loading = 'eager';
    img.style.width = img.style.height = SIZE + 'px';
    img.style.imageRendering = 'pixelated';
    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';
    return Object.assign(img, { src });
  }

  function layerFor(attr, value) {
    const attrName = String(attr);
    const val = sanitize(value);

    const base = `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attrName)}/`;
    const png = `${base}${val}.png`;
    const gif = `${base}animations/${val}_animation.gif`;

    // If animations are excluded for this attribute, just return PNG layer
    if (ANIM_EXCLUDE.has(attrName)) {
      return makeImg(png, 'frog-layer');
    }

    // Try GIF first; if it 404s, fall back to PNG
    const img = makeImg(gif, 'frog-layer');
    img.onerror = () => { img.onerror = null; img.src = png; };
    return img;
  }

  async function fetchMeta(id) {
    const url = `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('meta ' + r.status);
    return r.json();
  }

  function heroContainer() {
    const g = document.getElementById('grid');
    if (!g) return null;
    g.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'hero-frog';
    wrap.style.width = SIZE + 'px';
    wrap.style.height = SIZE + 'px';
    g.appendChild(wrap);
    return wrap;
  }

  function applyHoverLift(img, attrName) {
    if (HOVER_EXCLUDE.has(attrName)) return;
    img.classList.add('liftable');
    img.addEventListener('mouseenter', () => {
      img.style.transform = 'translateY(-10px)';
      img.style.filter = 'drop-shadow(0 8px 0 rgba(0,0,0,.35))';
    });
    img.addEventListener('mouseleave', () => {
      img.style.transform = 'translateY(0)';
      img.style.filter = 'none';
    });
  }

  async function renderOne(id) {
    const host = heroContainer();
    if (!host) return;
    // Background crop: original PNG, oversized + offset so only bg area shows
    host.style.backgroundImage = `url(${CFG.SOURCE_PATH}/frog/${id}.png)`;
    host.style.backgroundRepeat = 'no-repeat';
    host.style.backgroundSize = '240% 240%';         // enlarge
    host.style.backgroundPosition = '-35% 65%';      // push down-left (bg only)

    try {
      const meta = await fetchMeta(id);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];

      // Layer in the order they appear in metadata
      for (const item of attrs) {
        const attr = String(item?.trait_type ?? item?.trait ?? '');
        const val  = item?.value ?? '';
        if (!attr || val == null) continue;

        const layer = layerFor(attr, val);
        applyHoverLift(layer, attr);
        host.appendChild(layer);
      }
    } catch (e) {
      // Fallback to plain PNG if metadata failed
      const img = makeImg(`${CFG.SOURCE_PATH}/frog/${id}.png`, 'frog-layer');
      host.appendChild(img);
      console.warn('Frog meta load failed', e);
    }
  }

  function randomId() {
    return 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));
  }

  // Shuffle on click
  function enableShuffle(host) {
    host.addEventListener('click', () => {
      renderOne(randomId());
    });
  }

  // Public API
  async function initGrid() {
    const g = document.getElementById('grid');
    if (!g) return;
    const host = heroContainer();
    if (!host) return;
    enableShuffle(host);
    await renderOne(randomId());
  }

  window.FF_renderGrid = initGrid;
})(window.FF || (window.FF = {}), window.FF_CFG || {});
