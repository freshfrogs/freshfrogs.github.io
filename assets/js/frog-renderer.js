// assets/js/frog-renderer.js
// Builds a frog by layering attribute sprites in the EXACT order
// they appear in frog/json/{id}.json.
//
// Sprite path per layer:
//   frog/build_files/{Attribute}/{Value}.png
//
// Public hook used by your dashboard (owned-panel.js):
//   FF.renderFrog(canvas, metaOrNull, { size:128, tokenId })

(function () {
  'use strict';

  const CFG  = window.FF_CFG || {};
  const ROOT = String(CFG.SOURCE_PATH || '').replace(/\/+$/,''); // optional prefix

  function metaURL(id){ return `${ROOT}/frog/json/${id}.json`; }
  function layerURL(attrKey, attrVal){ return `${ROOT}/frog/build_files/${attrKey}/${attrVal}.png`; }

  // Caches
  const JSON_CACHE = new Map(); // id -> Promise(json|null)
  const IMG_CACHE  = new Map(); // url -> Promise(HTMLImageElement|null)

  function getJSON(url){
    return fetch(url, { headers:{ accept:'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  }

  function loadMeta(id){
    if (!id) return Promise.resolve(null);
    if (!JSON_CACHE.has(id)){
      JSON_CACHE.set(id, getJSON(metaURL(id)));
    }
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

  // Preserve attribute order as written in metadata
  function readAttrsInOrder(meta){
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
    ctx.imageSmoothingEnabled = false; // keep pixel art crisp
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0,0,W,W);
    return { ctx, W };
  }

  async function drawLayers(ctx, W, attrs){
    for (const a of attrs){
      const url = layerURL(a.key, a.value); // exact names from metadata
      const img = await loadImage(url);
      if (!img) continue; // missing layer → skip
      ctx.drawImage(img, 0, 0, W, W);
    }
  }

  // Public hook
  window.FF = window.FF || {};
  window.FF.renderFrog = async function renderFrog(canvas, metaOrNull, opts){
    const size = Number((opts && opts.size) || 128);
    const tokenId = Number(opts && opts.tokenId);

    // 1) Ensure metadata
    let meta = metaOrNull;
    if (!meta && tokenId) meta = await loadMeta(tokenId);
    if (!meta) throw new Error('metadata not available');

    // 2) Read attributes in original order
    const attrs = readAttrsInOrder(meta);
    if (!attrs.length) throw new Error('no attributes to render');

    // 3) Draw composite
    const { ctx, W } = prepareCanvas(canvas, size);
    await drawLayers(ctx, W, attrs);
  };

})();
