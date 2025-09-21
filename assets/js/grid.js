// assets/js/grid.js
(function(CFG){
  const root = document.getElementById('grid');

  function ids(n){
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * CFG.SUPPLY));
    return [...s];
  }

  // ---------- helpers ----------
  const baseURL = (p) => (/^https?:\/\//i.test(CFG.SOURCE_PATH||''))
    ? CFG.SOURCE_PATH.replace(/\/$/,'') + '/' + p.replace(/^\//,'')
    : p;

  async function fetchJSON(url){
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }

  function probe(src){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload  = () => resolve(src);
      img.onerror = () => resolve(null);
      img.decoding = 'async';
      img.loading  = 'eager';
      img.src = src;
    });
  }
  async function firstExisting(list){
    for (const src of list){
      const ok = await probe(src);
      if (ok) return ok;
    }
    return null;
  }

  // ./frog/build_files/[ATTRIBUTE]/animations/[VALUE]_animation.gif
  function candidatesFor(attr, value){
    const cap = s => s ? (s.charAt(0).toUpperCase()+s.slice(1)) : s;
    const A = String(attr||'').replace(/\s+/g,'');
    const V = String(value||'').replace(/\s+/g,'');
    const cases = [[A,V],[cap(A),cap(V)],[A.toLowerCase(),V.toLowerCase()]];
    const pngs=[], gifs=[];
    for (const [aa,vv] of cases){
      pngs.push(baseURL(`frog/build_files/${aa}/${vv}.png`));
      gifs.push(baseURL(`frog/build_files/${aa}/animations/${vv}_animation.gif`));
    }
    return { pngs, gifs };
  }

  // ---------- layered stage (128×128, not clickable) ----------
  async function buildStage128(id){
    const stage = document.createElement('div');

    // Use the original frog PNG as a background; zoom & pin so only bg color shows
    const bgImg = baseURL(`frog/${id}.png`);
    Object.assign(stage.style, {
      position:'relative',
      width:'128px', height:'128px',
      borderRadius:'8px', overflow:'hidden',
      imageRendering:'pixelated',
      backgroundImage: `url("${bgImg}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '1400%',     // heavy zoom to push artwork off-frame
      backgroundPosition: '0% 0%'  // top-left (adjust if your color is in another corner)
    });

    // fetch metadata (attributes in order)
    let meta=null;
    try { meta = await fetchJSON(baseURL(`frog/json/${id}.json`)); } catch {}

    const attrs = (meta?.attributes || meta?.traits || []);
    for (const a of attrs){
      const key = a?.trait_type ?? a?.key ?? a?.traitType ?? '';
      const val = a?.value ?? a?.val ?? '';
      if (!key || !val) continue;

      const { pngs, gifs } = candidatesFor(key, val);

      // Prefer animation; if gif exists, skip PNG
      const gifSrc = await firstExisting(gifs);
      if (gifSrc){
        const anim = document.createElement('img');
        Object.assign(anim.style, {
          position:'absolute', inset:'0',
          width:'100%', height:'100%',
          objectFit:'contain', imageRendering:'pixelated',
          pointerEvents:'none'
        });
        anim.alt = `${key}: ${val} (animation)`;
        anim.src = gifSrc;
        stage.appendChild(anim);
        continue;
      }

      // Fallback to PNG
      const pngSrc = await firstExisting(pngs);
      if (pngSrc){
        const img = document.createElement('img');
        Object.assign(img.style, {
          position:'absolute', inset:'0',
          width:'100%', height:'100%',
          objectFit:'contain', imageRendering:'pixelated'
        });
        img.alt = `${key}: ${val}`;
        img.src = pngSrc;
        stage.appendChild(img);
      }
    }

    return stage;
  }

  async function render(){
    if (!root) return;
    root.innerHTML = '';

    // 3×3 grid worth of IDs
    const batch = ids(9);

    for (const id of batch){
      const tile = document.createElement('div');
      tile.className = 'tile'; // CSS grid handles 3x3 layout
      try{
        const stage = await buildStage128(id);
        tile.appendChild(stage);
      }catch{
        // fallback: plain PNG
        const img = document.createElement('img');
        img.src = baseURL(`frog/${id}.png`);
        img.alt = `Frog #${id}`;
        img.width = 128; img.height = 128;
        img.loading = 'lazy'; img.decoding = 'async';
        img.style.imageRendering = 'pixelated';
        tile.appendChild(img);
      }
      // No click handler — grid tiles are intentionally not interactive
      root.appendChild(tile);
    }
  }

  window.FF_renderGrid = render;
})(window.FF_CFG);
