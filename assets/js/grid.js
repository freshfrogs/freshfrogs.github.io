// assets/js/grid.js
(function (FF, CFG) {
  // DOM
  const stage = document.getElementById('frogStage');
  if (!stage) return;

  // Helpers
  function randId() {
    return 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));
  }
  function metaURL(id) { return `${CFG.SOURCE_PATH}/frog/json/${id}.json`; }
  function basePNG(id) { return `${CFG.SOURCE_PATH}/frog/${id}.png`; }
  function buildPNG(attr, value) {
    // Example: ./frog/build_files/Frog/redEyedTreeFrog.png
    return `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/${encodeURIComponent(value)}.png`;
  }
  function buildGIF(attr, value) {
    // Example: ./frog/build_files/Mouth/animations/mask_animation.gif
    return `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/animations/${encodeURIComponent(value)}_animation.gif`;
  }

  // Simple cache to avoid re-downloading
  const imgCache = new Map();
  function preload(src) {
    return new Promise((resolve, reject) => {
      if (!src) return resolve(null);
      if (imgCache.has(src)) return resolve(imgCache.get(src));
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { imgCache.set(src, src); resolve(src); };
      img.onerror = () => resolve(null); // treat as absent
      img.src = src;
    });
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Build one frog, layering by metadata order.
  // Rules:
  //  - If an animation exists for a trait, prefer it.
  //  - EXCEPT: skip Frog animations and Hat animations entirely.
  //  - Still draw static PNG if animation was skipped (unless we’re skipping hats completely).
  //  - "SpecialFrog" is allowed.
  async function renderFrog(id) {
    // Clear previous content
    stage.replaceChildren();

    // Set background from the original PNG (enlarged & shifted via CSS ::before)
    stage.style.setProperty('--bg-url', `url("${basePNG(id)}")`);
    // Use a CSS var through inline style for the ::before background:
    stage.style.setProperty('background-image', 'none');
    stage.style.setProperty('--frog-bg', `url("${basePNG(id)}")`);
    // Patch ::before background with style attribute (works by writing directly)
    stage.style.setProperty('--bg', basePNG(id));
    // Since CSS can't read custom props in ::before background-image on all browsers,
    // we directly set it via style attribute on the pseudo with a helper class toggle:
    stage.classList.remove('apply-bg');
    // Force reflow then apply
    void stage.offsetHeight;
    stage.classList.add('apply-bg');
    // (CSS selector uses .frog-stage.apply-bg::before to read style.backgroundImage)
    stage.style.setProperty('backgroundImage', `url("${basePNG(id)}")`);

    // Metadata
    let meta;
    try { meta = await fetchJSON(metaURL(id)); } catch { meta = null; }
    const attributes = Array.isArray(meta?.attributes) ? meta.attributes : [];

    // Build hover chips
    const chips = document.createElement('div');
    chips.className = 'frog-attrs';
    attributes.forEach(a => {
      const chip = document.createElement('span');
      chip.className = 'frog-attr';
      chip.textContent = (a?.trait_type && a?.value)
        ? `${a.trait_type} ${a.value}`
        : (a?.value || '');
      chips.appendChild(chip);
    });
    stage.appendChild(chips);

    // Layer images (prefer GIF where allowed)
    for (const a of attributes) {
      const attr = String(a?.trait_type || '').trim();
      const value = String(a?.value || '').trim();
      if (!attr || !value) continue;

      // Skip hats entirely (per your request)
      if (/^hat$/i.test(attr)) continue;

      // Prepare sources
      let src = null;

      // Prefer animation if exists, but skip for Frog
      if (!/^frog$/i.test(attr)) {
        const gif = await preload(buildGIF(attr, value));
        if (gif) src = gif;
      }

      // If we didn't use an animation, use the PNG
      if (!src) {
        const png = await preload(buildPNG(attr, value));
        if (png) src = png;
      }

      if (!src) continue;

      const layer = document.createElement('img');
      layer.className = 'frog-layer';
      layer.alt = `${attr} ${value}`;
      layer.src = src;
      stage.appendChild(layer);
    }

    // Light parallax for attribute chips following the mouse
    function onMove(e) {
      const rect = stage.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 .. 0.5
      const ry = (e.clientY - rect.top) / rect.height - 0.5;
      chips.style.transform = `translate(${rx * 12}px, ${ry * -12}px)`;
    }
    stage.onmousemove = onMove;
    stage.onmouseleave = () => { chips.style.transform = 'translate(0,0)'; };
  }

  // Shuffle on click
  async function shuffle() {
    const id = randId();
    await renderFrog(id);
  }

  // Init
  renderFrog(randId());
  stage.addEventListener('click', shuffle);

})(window.FF, window.FF_CFG);
