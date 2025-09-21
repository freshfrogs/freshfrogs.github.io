// assets/js/grid.js
(function (FF, CFG) {
  // Ensure a stage exists
  let stage = document.getElementById('frogStage');
  const grid = document.getElementById('grid');
  if (!stage && grid) {
    grid.innerHTML = '';
    // optional wrapper for centering if you added .hero-frog
    const wrap = document.getElementById('heroFrog') || grid;
    stage = document.createElement('div');
    stage.id = 'frogStage';
    stage.className = 'frog-stage';
    wrap.appendChild(stage);
  }
  if (!stage) return;

  // ---------- helpers ----------
  const SUPPLY = Number(CFG.SUPPLY || 4040);
  const randId = () => 1 + Math.floor(Math.random() * SUPPLY);

  const basePNG = (id) => `${CFG.SOURCE_PATH}/frog/${id}.png`;
  const metaURL = (id) => `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
  const buildPNG = (attr, value) =>
    `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/${encodeURIComponent(value)}.png`;
  const buildGIF = (attr, value) =>
    `${CFG.SOURCE_PATH}/frog/build_files/${encodeURIComponent(attr)}/animations/${encodeURIComponent(value)}_animation.gif`;

  // Animations ARE allowed except for Frog/Trait/Hat (you set this rule earlier)
  const NO_ANIM = new Set(['frog','trait','hat']); // case-insensitive
  // Lift effect is disabled ONLY for Trait
  const NO_LIFT = new Set(['trait']); // case-insensitive

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

  async function pickAsset(attr, value){
    const key = String(attr||'').trim();
    const lower = key.toLowerCase();
    if (!key || !value) return null;

    if (NO_ANIM.has(lower)) {
      return await preload(buildPNG(key, value));
    }
    // prefer animation if present; fallback to PNG
    const gif = await preload(buildGIF(key, value));
    if (gif) return gif;
    return await preload(buildPNG(key, value));
  }

  // ---------- render one frog ----------
  async function renderFrog(id){
    // Set background to the original PNG; CSS hides the sprite itself
    stage.style.setProperty('--bg-img', `url("${basePNG(id)}")`);
    stage.replaceChildren();

    // Load metadata
    let attrs = [];
    try {
      const meta = await fetchJSON(metaURL(id));
      if (Array.isArray(meta?.attributes)) attrs = meta.attributes;
    } catch (_) {}

    // Build in the order given
    for (const a of attrs){
      const attr = String(a?.trait_type || '').trim();
      const val  = String(a?.value || '').trim();
      if (!attr || !val) continue;

      const src = await pickAsset(attr, val);
      if (!src) continue;

      const layer = document.createElement('img');
      layer.className = 'frog-layer';
      layer.alt = `${attr} ${val}`;
      layer.src = src;
      layer.dataset.attr = attr; // remember original case
      stage.appendChild(layer);
    }

    // LIFT EFFECT (no parallax):
    // When the pointer is in the upper region of the canvas,
    // lift only the interactive layers (not 'Trait').
    const layers = Array.from(stage.querySelectorAll('.frog-layer'));
    function updateLift(e){
      const rect = stage.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;   // 0..1
      const ry = (e.clientY - rect.top)  / rect.height;  // 0..1

      const inUpper = ry < 0.45; // hats/glasses area
      layers.forEach(el=>{
        const attr = String(el.dataset.attr||'').toLowerCase();
        if (!inUpper || NO_LIFT.has(attr)) {
          el.classList.remove('is-lifted');
        } else {
          // Subtle: more lift if closer to the very top
          const amt = Math.max(0, (0.45 - ry) / 0.45); // 0..1
          el.style.setProperty('--liftAmt', amt.toFixed(3));
          el.classList.add('is-lifted');
        }
      });
    }
    function resetLift(){
      layers.forEach(el=>{
        el.classList.remove('is-lifted');
        el.style.removeProperty('--liftAmt');
      });
    }
    stage.onmousemove = updateLift;
    stage.onmouseleave = resetLift;
  }

  // Shuffle on click
  async function shuffle(){ await renderFrog(randId()); }

  // Init first frog and wire click-to-shuffle
  renderFrog(randId());
  stage.addEventListener('click', shuffle);
})(window.FF, window.FF_CFG);
