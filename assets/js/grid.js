// assets/js/grid.js
(function (FF, CFG) {
  // find or create the stage
  let stage = document.getElementById('frogStage');
  const grid = document.getElementById('grid');
  if (!stage && grid) {
    grid.innerHTML = '';
    stage = document.createElement('div');
    stage.id = 'frogStage';
    stage.className = 'frog-stage';
    // ensure a wrapper exists for centering if your HTML uses .hero-frog
    const w = document.getElementById('heroFrog') || grid;
    w.appendChild(stage);
  }
  if (!stage) return;

  // --- config/helpers ---
  const SUPPLY = Number(CFG.SUPPLY || 4040);
  const randId = () => 1 + Math.floor(Math.random() * SUPPLY);

  const basePNG = (id) => `${CFG.SOURCE_PATH}/frog/${id}.png`;
  const metaURL = (id) => `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
  const buildPNG = (attr, value) =>
    `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/${encodeURIComponent(value)}.png`;
  const buildGIF = (attr, value) =>
    `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/animations/${encodeURIComponent(value)}_animation.gif`;

  const NO_ANIM = new Set(['frog','trait','hat']); // case-insensitive

  function fetchJSON(url){
    return fetch(url, {cache:'no-store'}).then(r=>{
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    });
  }
  function preload(src){
    return new Promise(res=>{
      const img = new Image();
      img.onload = () => res(src);
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  // choose the best asset for an attribute (prefer GIF unless disallowed)
  async function pickAsset(attr, value){
    const key = String(attr||'').trim();
    const lower = key.toLowerCase();
    if (!key || !value) return null;

    // if animations are NOT allowed for this attribute -> use PNG
    if (NO_ANIM.has(lower)) {
      return await preload(buildPNG(key, value));
    }

    // try GIF first, then PNG
    const gif = await preload(buildGIF(key, value));
    if (gif) return gif;
    return await preload(buildPNG(key, value));
  }

  // --- render one frog ---
  async function renderFrog(id){
    // background from original PNG (enlarged+offset via CSS)
    stage.style.setProperty('--bg-img', `url("${basePNG(id)}")`);

    // clear all trait layers
    stage.replaceChildren();

    // load metadata
    let attributes = [];
    try {
      const meta = await fetchJSON(metaURL(id));
      if (Array.isArray(meta?.attributes)) attributes = meta.attributes;
    } catch (_) { /* ignore */ }

    // build in order given by JSON
    for (const a of attributes){
      const attr = String(a?.trait_type || '').trim();
      const val  = String(a?.value || '').trim();
      if (!attr || !val) continue;

      const src = await pickAsset(attr, val);
      if (!src) continue;

      const layer = document.createElement('img');
      layer.className = 'frog-layer';
      layer.alt = `${attr} ${val}`;
      layer.src = src;
      stage.appendChild(layer);
    }

    // parallax only on layers (not the background)
    const layers = Array.from(stage.querySelectorAll('.frog-layer'));
    function onMove(e){
      const r = stage.getBoundingClientRect();
      const rx = (e.clientX - r.left)/r.width  - 0.5; // -0.5..0.5
      const ry = (e.clientY - r.top) /r.height - 0.5;
      layers.forEach((el, i)=>{
        const f = 2 + i*0.6; // front moves slightly more
        el.style.transform = `translate(${rx*f}px, ${ry*-f}px)`;
      });
    }
    function reset(){ layers.forEach(el=> el.style.transform = 'translate(0,0)'); }
    stage.onmousemove = onMove;
    stage.onmouseleave = reset;
  }

  // shuffle on click
  async function shuffle(){ await renderFrog(randId()); }

  // init
  renderFrog(randId());
  stage.addEventListener('click', shuffle);
})(window.FF, window.FF_CFG);
