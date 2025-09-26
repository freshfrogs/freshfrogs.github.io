// assets/js/frog-thumbs.js
// Layer-by-layer 128px frog thumbnails (attribute images stacked), with shifted flat PNG background.
// Auto-hooks into your dashboard by overriding flatThumb128(container, id).

(function(){
  'use strict';

  // ---------- CONFIG ----------
  // If you keep assets in a subfolder, set SOURCE_PATH via window.FF_CFG or window.CFG, else ''.
  const SRC = (window.FF_CFG?.SOURCE_PATH || window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  // Where trait layer PNG/GIFs live, e.g. /frog/build_files/<Trait>/<Value>.png
  const LAYERS_BASE = (SRC ? `${SRC}` : '') + `/frog/build_files`;
  // Where flat frogs live, e.g. /frog/<id>.png
  const FLAT_BASE   = (SRC ? `${SRC}` : '') + `/frog`;
  // Where JSON lives, e.g. /frog/json/<id>.json
  const META_BASE   = (SRC ? `${SRC}` : '') + `/frog/json`;

  // ---------- HELPERS ----------
  function safe(s){ return encodeURIComponent(String(s)); }
  function el(tag, attrs, parent){
    const e = document.createElement(tag);
    if (attrs) for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    if (parent) parent.appendChild(e);
    return e;
  }

  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayerImg(attr, value, px){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `${LAYERS_BASE}/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;

    const img = new Image();
    img.decoding='async';
    img.loading='lazy';
    img.dataset.attr = attr;
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0',
      width:`${px}px`, height:`${px}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){
      img.src = gif;
      img.onerror = ()=>{ img.onerror=null; img.src=png; };
    }else{
      img.src = png;
    }

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{
        img.style.transform='translate(-8px,-12px)';
        img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', ()=>{
        img.style.transform='translate(0,0)'; img.style.filter='none';
      });
    }
    return img;
  }

  async function fetchJSON(url){
    const r = await fetch(url, {cache:'force-cache'});
    if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
    return r.json();
  }

  // ---------- MAIN RENDER ----------
  async function buildFrog128(container, tokenId){
    const SIZE = 128;

    // Container chrome
    Object.assign(container.style,{
      width:`${SIZE}px`, height:`${SIZE}px`,
      minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
      position:'relative', overflow:'hidden', borderRadius:'8px',
      imageRendering:'pixelated'
    });

    // Shifted background from the flat PNG
    const flatUrl = `${FLAT_BASE}/${tokenId}.png`;
    container.style.backgroundRepeat='no-repeat';
    container.style.backgroundSize='2000% 2000%';
    container.style.backgroundPosition='100% -1200%';
    container.style.backgroundImage=`url("${flatUrl}")`;

    // Clear any previous children
    while (container.firstChild) container.removeChild(container.firstChild);

    // Build from metadata attributes
    try{
      const metaUrl = `${META_BASE}/${tokenId}.json`;
      const meta = await fetchJSON(metaUrl);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr, val, SIZE));
      }
    }catch(err){
      // If anything fails, fall back to flat image as a child <img>
      const img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{
        position:'absolute', inset:'0',
        width:`${SIZE}px`, height:`${SIZE}px`,
        imageRendering:'pixelated', zIndex:'2'
      });
      img.src = flatUrl;
      container.appendChild(img);
    }
  }

  // ---------- AUTO-HOOK (no code changes elsewhere) ----------
  // If your existing dashboard calls flatThumb128(container, id), intercept & replace:
  const oldFlat = window.flatThumb128;
  window.buildFrog128 = window.buildFrog128 || buildFrog128;
  window.flatThumb128 = function(container, id){
    // prefer layered build; if it ever errors, fall back to original
    try{
      buildFrog128(container, id);
    }catch(e){
      if (typeof oldFlat === 'function') return oldFlat(container, id);
    }
  };

})();
