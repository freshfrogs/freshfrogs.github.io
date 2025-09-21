// assets/js/grid.js
(function(FF, CFG){
  const root = document.getElementById('grid');
  if(!root) return;

  // ---- helpers ----
  const randId = () => 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));
  const px = n => `${n}px`;

  function esc(part){ return String(part).replace(/ /g, '%20'); }

  function assetPaths(traitType, value){
    const base = `${CFG.SOURCE_PATH}/frog/build_files/${esc(traitType)}`;
    return {
      static: `${base}/${esc(value)}.png`,
      anim:   `${base}/animations/${esc(value)}_animation.gif`
    };
  }

  function loadImg(src){
    return new Promise(resolve=>{
      const im = new Image();
      im.loading = 'eager';
      im.decoding = 'sync';
      Object.assign(im.style, {
        position:'absolute', left:'0', top:'0', width:'100%', height:'100%',
        imageRendering:'pixelated'
      });
      im.onload = ()=> resolve(im);
      im.onerror = ()=> resolve(null);
      im.src = src;
    });
  }

  function allowAnimationFor(traitType){
    const t = String(traitType||'').toLowerCase();
    // Exclude Hat and Frog animations; SpecialFrog (and others) allowed
    return !(t === 'hat' || t === 'frog');
  }

  async function buildLayeredFrog(id){
    const size = 512;

    // Stage container
    const stage = document.createElement('div');
    Object.assign(stage.style, {
      position:'relative', width:px(size), height:px(size),
      borderRadius:'10px', overflow:'hidden',
      border:'1px solid var(--ring)', backgroundColor:'var(--panel)'
    });

    // Background: zoomed original PNG for color wash
    const bg = document.createElement('div');
    Object.assign(bg.style, {
      position:'absolute', inset:'0',
      backgroundImage:`url(${CFG.SOURCE_PATH}/frog/${id}.png)`,
      backgroundRepeat:'no-repeat',
      backgroundSize:'300% 300%',
      backgroundPosition:'left bottom',
      filter:'saturate(120%) brightness(105%)'
    });
    stage.appendChild(bg);

    // Metadata
    const metaUrl = `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
    let meta;
    try{ meta = await FF.fetchJSON(metaUrl); }catch{ meta = null; }

    if(!meta || !Array.isArray(meta.attributes)){
      const flat = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(flat) stage.appendChild(flat);
      return stage;
    }

    // Layer traits in file order
    for(const a of meta.attributes){
      const traitType = a?.trait_type ?? a?.traitType ?? a?.attribute ?? '';
      const value     = a?.value ?? a?.trait ?? '';
      if(!traitType || value==null) continue;

      const { static: staticSrc, anim: animSrc } = assetPaths(traitType, value);
      let layer = null;

      if(allowAnimationFor(traitType)) layer = await loadImg(animSrc);
      if(!layer) layer = await loadImg(staticSrc);

      if(layer) stage.appendChild(layer);
    }

    // Ensure something shows if all layers failed
    if(stage.children.length <= 1){
      const fallback = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(fallback) stage.appendChild(fallback);
    }

    return stage;
  }

  let isSpinning = false;
  let currentId = null;

  async function render(nextId){
    if(isSpinning) return;
    isSpinning = true;

    root.innerHTML = '';

    const id = nextId ?? randId();
    currentId = id;

    // Tile (focusable/clickable)
    const tile = document.createElement('div');
    tile.className = 'tile';
    Object.assign(tile.style, {
      width:'min(512px, 100%)',
      aspectRatio:'1 / 1',
      margin:'0 auto',
      cursor:'pointer',
      transition:'opacity .15s ease'
    });
    tile.setAttribute('role','button');
    tile.setAttribute('tabindex','0');
    tile.setAttribute('aria-label','Shuffle frog');

    // subtle hover feedback
    tile.addEventListener('pointerdown', ()=> tile.style.opacity = '0.85');
    tile.addEventListener('pointerup',   ()=> tile.style.opacity = '1');
    tile.addEventListener('pointerleave',()=> tile.style.opacity = '1');

    // Build and mount
    const stage = await buildLayeredFrog(id);
    tile.appendChild(stage);
    root.appendChild(tile);

    // Shuffle on click / Enter / Space
    const shuffle = async ()=>{
      if(isSpinning) return;
      tile.style.opacity = '0.6';
      await render(); // new random
      setTimeout(()=>{ tile.style.opacity = '1'; }, 80);
    };
    tile.addEventListener('click', shuffle);
    tile.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        shuffle();
      }
    });

    isSpinning = false;
  }

  // Public API (if you want to shuffle programmatically)
  window.FF_renderGrid = (id)=> render(id);

  // Initial paint
  render();

})(window.FF, window.FF_CFG);
