// assets/js/grid.js
(function(FF, CFG){
  const root = document.getElementById('grid');
  if(!root) return;

  // ---- helpers ----
  const randId = () => 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));
  const px = n => `${n}px`;

  function esc(part){
    // Simple encode for path segments (spaces etc.)
    return String(part).replace(/ /g, '%20');
  }

  // Build paths for a trait's static/animation assets
  function assetPaths(traitType, value){
    const base = `${CFG.SOURCE_PATH}/frog/build_files/${esc(traitType)}`;
    return {
      static: `${base}/${esc(value)}.png`,
      anim:   `${base}/animations/${esc(value)}_animation.gif`
    };
  }

  // Load an <img> and resolve when it’s ready (success => element; failure => null)
  function loadImg(src){
    return new Promise(resolve=>{
      const im = new Image();
      im.loading = 'eager';
      im.decoding = 'sync';
      im.style.position = 'absolute';
      im.style.left = '0';
      im.style.top = '0';
      im.style.width = '100%';
      im.style.height = '100%';
      im.style.imageRendering = 'pixelated';
      im.onload = ()=> resolve(im);
      im.onerror = ()=> resolve(null);
      im.src = src;
    });
  }

  // Decide if we should try the animation for a given trait
  function allowAnimationFor(traitType){
    const t = String(traitType||'').toLowerCase();
    // Exclude Hat and Frog animations; everything else OK (SpecialFrog allowed)
    return !(t === 'hat' || t === 'frog');
  }

  // Build one layered frog at 512x512 from metadata
  async function buildLayeredFrog(id){
    const size = 512;

    // Stage (relative) with a background div that uses the original PNG enlarged/offset
    const stage = document.createElement('div');
    stage.style.position = 'relative';
    stage.style.width = px(size);
    stage.style.height = px(size);
    stage.style.borderRadius = '10px';
    stage.style.overflow = 'hidden';
    stage.style.border = '1px solid var(--ring)';
    stage.style.backgroundColor = 'var(--panel)';

    // Background: use the original frog PNG, zoomed & shifted so only color wash shows
    const bg = document.createElement('div');
    bg.style.position = 'absolute';
    bg.style.inset = '0';
    bg.style.backgroundImage = `url(${CFG.SOURCE_PATH}/frog/${id}.png)`;
    bg.style.backgroundRepeat = 'no-repeat';
    bg.style.backgroundSize = '300% 300%';    // enlarge
    bg.style.backgroundPosition = 'left bottom'; // shove down-left
    bg.style.filter = 'saturate(120%) brightness(105%)';
    stage.appendChild(bg);

    // Fetch metadata
    const metaUrl = `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
    let meta;
    try{
      meta = await FF.fetchJSON(metaUrl);
    }catch{
      // Fallback: just drop the flat PNG if meta isn’t reachable
      const flat = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(flat) stage.appendChild(flat);
      return stage;
    }

    // Read attributes in file order and layer them
    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];

    // We’ll maintain a list of promises for each layer (animation preferred when allowed)
    for(const a of attrs){
      const traitType = a?.trait_type ?? a?.traitType ?? a?.attribute ?? '';
      const value     = a?.value ?? a?.trait ?? '';

      if(!traitType || value==null) continue;

      const { static: staticSrc, anim: animSrc } = assetPaths(traitType, value);

      let layer = null;

      // Try animation first (if allowed), otherwise static; on failure, skip silently
      if(allowAnimationFor(traitType)){
        layer = await loadImg(animSrc);
      }
      if(!layer){
        layer = await loadImg(staticSrc);
      }

      if(layer){
        // Ensure GIF animations don’t get blurred by browser scaling
        layer.style.imageRendering = 'pixelated';
        stage.appendChild(layer);
      }
    }

    // Always ensure at least the flat PNG appears if nothing else loaded
    if(stage.children.length <= 1){ // only bg is present
      const fallback = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(fallback) stage.appendChild(fallback);
    }

    return stage;
  }

  // Render single frog (non-clickable)
  async function render(){
    root.innerHTML = '';
    const id = randId(); // pick a random frog each load
    const tile = document.createElement('div');
    tile.className = 'tile';
    // lock the tile to 512x512 while preserving responsive max
    tile.style.width = 'min(512px, 100%)';
    tile.style.aspectRatio = '1 / 1';
    tile.style.margin = '0 auto';

    const stage = await buildLayeredFrog(id);
    tile.appendChild(stage);
    root.appendChild(tile);
  }

  // Public hook (if you ever want to re-roll the hero)
  window.FF_renderGrid = render;

  // initial paint
  render();

})(window.FF, window.FF_CFG);
