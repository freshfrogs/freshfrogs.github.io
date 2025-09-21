// assets/js/grid.js
(function(FF, CFG){
  const root = document.getElementById('grid');
  if(!root) return;

  const randId = () => 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));
  const px = n => `${n}px`;
  const esc = s => String(s).replace(/ /g, '%20');

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
        imageRendering:'pixelated', willChange:'transform'
      });
      im.onload = ()=> resolve(im);
      im.onerror = ()=> resolve(null);
      im.src = src;
    });
  }

  function allowAnimationFor(traitType){
    const t = String(traitType||'').toLowerCase();
    // No animations for Hat or Frog; SpecialFrog (and others) allowed
    return !(t === 'hat' || t === 'frog');
  }

  async function buildLayeredFrog(id){
    const size = 512;

    // Stage
    const stage = document.createElement('div');
    Object.assign(stage.style, {
      position:'relative', width:px(size), height:px(size),
      borderRadius:'10px', overflow:'hidden',
      border:'1px solid var(--ring)', backgroundColor:'var(--panel)',
      transformStyle:'preserve-3d'
    });

    // Background: zoomed original PNG for the color wash
    const bg = document.createElement('div');
    Object.assign(bg.style, {
      position:'absolute', inset:'0',
      backgroundImage:`url(${CFG.SOURCE_PATH}/frog/${id}.png)`,
      backgroundRepeat:'no-repeat',
      backgroundSize:'300% 300%',
      backgroundPosition:'left bottom',
      filter:'saturate(120%) brightness(105%)',
      willChange:'transform'
    });
    stage.appendChild(bg);

    // Fetch metadata
    const metaUrl = `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
    let meta = null;
    try { meta = await FF.fetchJSON(metaUrl); } catch {}

    if(!meta || !Array.isArray(meta.attributes)){
      const flat = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(flat){ flat.className='frog-layer'; flat.dataset.depth='0.5'; stage.appendChild(flat); }
      return stage;
    }

    // Layer traits in file/read order
    let depthIndex = 1; // 1..N used for parallax weighting
    for(const a of meta.attributes){
      const traitType = a?.trait_type ?? a?.traitType ?? a?.attribute ?? '';
      const value     = a?.value ?? a?.trait ?? '';
      if(!traitType || value==null) continue;

      const { static: staticSrc, anim: animSrc } = assetPaths(traitType, value);
      let layer = null;

      if(allowAnimationFor(traitType)) layer = await loadImg(animSrc);
      if(!layer) layer = await loadImg(staticSrc);

      if(layer){
        layer.className = 'frog-layer';
        // Normalize depth: shallow near background, stronger near the top
        // We clamp later to [0.15..1] scale
        layer.dataset.depth = String(depthIndex); 
        stage.appendChild(layer);
        depthIndex++;
      }
    }

    // Fallback to flat if none loaded (besides bg)
    if(stage.children.length <= 1){
      const fallback = await loadImg(`${CFG.SOURCE_PATH}/frog/${id}.png`);
      if(fallback){ fallback.className='frog-layer'; fallback.dataset.depth='0.5'; stage.appendChild(fallback); }
    }

    // --- Parallax wiring (interactive “hovering attributes”) ---
    // We compute a smoothed target (mx,my) in [-1..1] and shift each layer slightly.
    // Heavier depth = slightly larger movement for a fun layered effect.
    const layers = Array.from(stage.querySelectorAll('.frog-layer'));
    let tmx = 0, tmy = 0, mx = 0, my = 0, raf = 0, hovering = false;

    const maxShiftPx = 10; // overall range per deepest layer (subtle!)

    function lerp(a,b,k){ return a + (b-a)*k; }

    function animate(){
      mx = lerp(mx, tmx, 0.12);
      my = lerp(my, tmy, 0.12);

      // Move background slightly less than layers for depth
      bg.style.transform = `translate3d(${mx*4}px, ${my*4}px, 0)`;

      for(const el of layers){
        // Map dataset depth (1..N) to a scale [0.15..1]
        const idx = Math.max(1, Number(el.dataset.depth||1));
        const depthNorm = Math.min(1, Math.max(0.15, idx / (layers.length || 8)));
        const dx = mx * maxShiftPx * depthNorm;
        const dy = my * maxShiftPx * depthNorm;
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
      if(hovering || Math.hypot(mx - tmx, my - tmy) > 0.01){
        raf = requestAnimationFrame(animate);
      }else{
        raf = 0;
      }
    }

    function onMove(e){
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;  // 0..1
      const y = (e.clientY - r.top)  / r.height; // 0..1
      tmx = (x - 0.5) * 2; // -1..1
      tmy = (y - 0.5) * 2; // -1..1
      if(!raf){ raf = requestAnimationFrame(animate); }
    }
    function onEnter(){ hovering = true; if(!raf){ raf = requestAnimationFrame(animate); } }
    function onLeave(){
      hovering = false; tmx = 0; tmy = 0;
      if(!raf){ raf = requestAnimationFrame(animate); }
    }

    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointerleave', onLeave);

    return stage;
  }

  let isSpinning = false;

  async function render(nextId){
    if(isSpinning) return;
    isSpinning = true;

    root.innerHTML = '';

    const id = nextId ?? randId();

    // Focusable/clickable tile to shuffle
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

    tile.addEventListener('pointerdown', ()=> tile.style.opacity = '0.85');
    tile.addEventListener('pointerup',   ()=> tile.style.opacity = '1');
    tile.addEventListener('pointerleave',()=> tile.style.opacity = '1');

    const stage = await buildLayeredFrog(id);
    tile.appendChild(stage);
    root.appendChild(tile);

    const shuffle = async ()=>{
      if(isSpinning) return;
      tile.style.opacity = '0.6';
      await render(); // random again
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

  // Public hook to shuffle programmatically with a specific id if desired
  window.FF_renderGrid = (id)=> render(id);

  // Initial paint
  render();

})(window.FF, window.FF_CFG);
