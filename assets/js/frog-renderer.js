// assets/js/frog-renderer.js
// Layer frogs using EXACT metadata order from frog/json/{id}.json,
// background color derived from original PNG, hover-on-attribute support,
// and optional animated overlays from *_animation.gif.
//
// Public hook:
//   FF.renderFrog(canvas, metaOrNull, { size:128, tokenId, hoverKey })
//
// Files:
//   meta:  frog/json/{id}.json
//   base:  frog/{id}.png
//   layer: frog/build_files/{Attribute}/{Value}.png
//   anim:  frog/build_files/{Attribute}/{Value}_animation.gif (not for Frog or Hat)

(function () {
  'use strict';

  const CFG  = window.FF_CFG || {};
  const ROOT = String(CFG.SOURCE_PATH || '').replace(/\/+$/,'');

  const DISALLOW_HOVER = new Set(['Trait','Frog','SpecialFrog']);
  const DISALLOW_ANIM  = new Set(['Frog','Hat']); // per your rule

  function metaURL(id){ return `${ROOT}/frog/json/${id}.json`; }
  function basePNG(id){ return `${ROOT}/frog/${id}.png`; }
  function layerPNG(key,val){ return `${ROOT}/frog/build_files/${key}/${val}.png`; }
  function layerGIF(key,val){ return `${ROOT}/frog/build_files/${key}/${val}_animation.gif`; }

  const JSON_CACHE = new Map(); // id -> Promise(json|null)
  const IMG_CACHE  = new Map(); // url -> Promise(HTMLImageElement|null)

  function fetchJSON(url){
    return fetch(url, { headers:{ accept:'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  }
  function loadMeta(id){
    if (!id) return Promise.resolve(null);
    if (!JSON_CACHE.has(id)) JSON_CACHE.set(id, fetchJSON(metaURL(id)));
    return JSON_CACHE.get(id);
  }
  function loadImage(url){
    if (!IMG_CACHE.has(url)){
      IMG_CACHE.set(url, new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      }));
    }
    return IMG_CACHE.get(url);
  }

  function attrsInOrder(meta){
    const arr = Array.isArray(meta?.attributes) ? meta.attributes : [];
    const out = [];
    for (let i=0;i<arr.length;i++){
      const a = arr[i] || {};
      const key = (a.key ?? a.trait_type ?? a.type ?? '').toString().trim();
      const val = (a.value ?? a.trait_value ?? '').toString().trim();
      if (!key || !val) continue;
      out.push({ key, value: val });
    }
    return out;
  }

  function prepareCanvas(canvas, size){
    const W = (size|0) || 128;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    canvas.width = W * dpr;
    canvas.height = W * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = W + 'px';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0,0,W,W);
    return { ctx, W };
  }

  function clearOverlays(canvas){
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const olds = wrap.querySelectorAll('.frog-anim');
    olds.forEach(n => n.remove());
    // ensure wrapper is positioned
    const cs = getComputedStyle(wrap);
    if (cs.position === 'static') wrap.style.position = 'relative';
  }

  function mountAnimOverlay(canvas, url){
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const img = document.createElement('img');
    img.className = 'frog-anim';
    img.src = url;
    img.width = canvas.clientWidth;
    img.height = canvas.clientHeight;
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width: canvas.style.width || '128px',
      height: canvas.style.height || '128px',
      imageRendering:'pixelated',
      pointerEvents:'none'
    });
    wrap.appendChild(img);
  }

  async function drawBackgroundFromBase(ctx, W, baseImg){
    if (!baseImg){ ctx.clearRect(0,0,W,W); return; }
    // Scale a 1×1 sample (bottom-right pixel) to the whole canvas → solid background color
    const sx = Math.max(0, (baseImg.naturalWidth||baseImg.width) - 1);
    const sy = Math.max(0, (baseImg.naturalHeight||baseImg.height) - 1);
    ctx.drawImage(baseImg, sx, sy, 1, 1, 0, 0, W, W);
  }

  async function drawLayers(ctx, W, attrs, opts){
    const hoverKey = String(opts?.hoverKey || '');
    for (const a of attrs){
      const url = layerPNG(a.key, a.value);
      const img = await loadImage(url);
      if (!img) continue;

      const isHover = hoverKey && a.key === hoverKey && !DISALLOW_HOVER.has(a.key);
      if (isHover){
        ctx.save();
        // gentle lift + scale
        ctx.translate(-2, -2);
        ctx.drawImage(img, 0, 0, W, W);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, W, W);
      }
    }
  }

  async function mountAnimations(canvas, attrs){
    for (const a of attrs){
      if (DISALLOW_ANIM.has(a.key)) continue;
      const url = layerGIF(a.key, a.value);
      const img = await loadImage(url);
      if (!img) continue; // no animation available
      // Use the URL we attempted; the <img> tag will animate on its own
      mountAnimOverlay(canvas, url);
    }
  }

  window.FF = window.FF || {};
  window.FF.renderFrog = async function renderFrog(canvas, metaOrNull, opts){
    const size = Number((opts && opts.size) || 128);
    const tokenId = Number(opts && opts.tokenId);

    // fetch meta if not provided
    let meta = metaOrNull;
    if (!meta && tokenId) meta = await loadMeta(tokenId);
    if (!meta) throw new Error('metadata not available');

    const attrs = attrsInOrder(meta);
    if (!attrs.length) throw new Error('no attributes');

    const { ctx, W } = prepareCanvas(canvas, size);
    clearOverlays(canvas);

    // background color from original PNG
    const base = await loadImage(basePNG(tokenId));
    await drawBackgroundFromBase(ctx, W, base);

    // static layers (with hover offset on the active key)
    await drawLayers(ctx, W, attrs, { hoverKey: opts?.hoverKey });

    // animated overlays (GIFs) — on top
    await mountAnimations(canvas, attrs);
  };

})();
