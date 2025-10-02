// assets/js/frog-renderer.js
// DOM-based frog layering (replaces canvas renderer) with the SAME public hook:
//   FF.renderFrog(canvasEl, metaOrNull, { size:128, tokenId, hoverKey })
//
// Sources:
//   meta:  frog/json/{id}.json
//   base:  frog/{id}.png   (used as zoomed bg to pick bottom-right color)
//   layer: frog/build_files/{Attribute}/{Value}.png
//   anim:  frog/build_files/{Attribute}/{Value}_animation.gif (not for Frog/Hat)

(function () {
  'use strict';

  const CFG  = window.FF_CFG || {};
  const ROOT = String(CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  const DISALLOW_HOVER = new Set(['Trait','Frog','SpecialFrog']);
  const DISALLOW_ANIM  = new Set(['Frog','Hat']);
  const ENABLE_ANIMATIONS = false;

  function metaURL(id){ return `${ROOT}/frog/json/${id}.json`; }
  function basePNG(id){ return `${ROOT}/frog/${id}.png`; }
  function layerPNG(k,v){ return `${ROOT}/frog/build_files/${k}/${v}.png`; }
  function layerGIF(k,v){ return `${ROOT}/frog/build_files/${k}/animations/${v}_animation.gif`; }

  const JSON_CACHE = new Map(); // id -> Promise(json|null)

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

  // Ensure a fixed-size stacking host next to/over the provided canvas element
  function ensureHost(canvasEl, size){
    const W = (size|0) || 128;
    const parent = canvasEl && canvasEl.parentElement ? canvasEl.parentElement : document.body;

    // hide the passed canvas (we render via DOM layers instead)
    if (canvasEl && canvasEl.style) canvasEl.style.display = 'none';

    let host = parent.querySelector(':scope > .frog-stack');
    if (!host){
      host = document.createElement('div');
      host.className = 'frog-stack';
      parent.appendChild(host);
    }
    host.innerHTML = '';
    Object.assign(host.style, {
      position:'relative',
      width: W + 'px',
      height: W + 'px',
      borderRadius: '10px',
      overflow: 'hidden',
      imageRendering: 'pixelated',
      backgroundRepeat: 'no-repeat',
      // Zoom way into the bottom-right of the original PNG so only the
      // backdrop color is visible behind the layered attributes.
      backgroundPosition: '140% 140%',
      backgroundSize: '800% 800%'
    });
    return host;
  }

  const BACKDROP_COLOR_CACHE = new Map();
  function applyBackdrop(host, tokenId){
    if (!host) return;
    if (!tokenId){
      host.style.backgroundImage = 'none';
      host.style.backgroundColor = 'transparent';
      return;
    }

    const url = basePNG(tokenId);
    host.style.backgroundImage = `url("${url}")`;

    if (BACKDROP_COLOR_CACHE.has(tokenId)){
      host.style.backgroundColor = BACKDROP_COLOR_CACHE.get(tokenId);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      try {
        const w = img.naturalWidth || img.width || 1;
        const h = img.naturalHeight || img.height || 1;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no ctx');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(Math.max(0, w - 1), Math.max(0, h - 1), 1, 1).data;
        const color = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
        BACKDROP_COLOR_CACHE.set(tokenId, color);
        host.style.backgroundColor = color;
      } catch(_){
        BACKDROP_COLOR_CACHE.set(tokenId, 'transparent');
      }
    };
    img.onerror = function(){ BACKDROP_COLOR_CACHE.set(tokenId, 'transparent'); };
    img.src = url;
  }

  const ANIM_CACHE = new Map();
  function hasAnimation(k,v){
    const key = `${k}::${v}`;
    if (ANIM_CACHE.has(key)) {
      const cached = ANIM_CACHE.get(key);
      if (typeof cached === 'boolean') return Promise.resolve(cached);
      return cached;
    }
    const url = layerGIF(k,v);
    const probe = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    }).then(result => {
      ANIM_CACHE.set(key, result);
      return result;
    });
    ANIM_CACHE.set(key, probe);
    return probe;
  }

  function addLayer(host, url, lift){
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    Object.assign(img.style, {
      position:'absolute', left:0, top:0, width:'100%', height:'100%',
      imageRendering:'pixelated', pointerEvents:'none',
      transform: lift ? 'translate(-2px,-2px)' : 'none',
      filter: lift ? 'drop-shadow(0 0 2px rgba(255,255,255,.15))' : 'none'
    });
    img.className = 'frog-layer';
    img.onerror = () => img.remove();
    host.appendChild(img);
  }

  function addAnim(host, url, lift){
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    Object.assign(img.style, {
      position:'absolute', left:0, top:0, width:'100%', height:'100%',
      imageRendering:'pixelated', pointerEvents:'none',
      transform: lift ? 'translate(-2px,-2px)' : 'none',
      filter: lift ? 'drop-shadow(0 0 2px rgba(255,255,255,.15))' : 'none'
    });
    img.className = 'frog-anim';
    img.onerror = () => img.remove();
    host.appendChild(img);
  }

  // PUBLIC: same signature as before (canvasEl is still accepted)
  window.FF = window.FF || {};
  window.FF.renderFrog = async function renderFrog(canvasEl, metaOrNull, opts){
    const size = Number(opts?.size || 128);
    const tokenId = Number(opts?.tokenId);
    const hoverKey = String(opts?.hoverKey || '');

    const host = ensureHost(canvasEl, size);

    // Background from the original PNG (zoom bottom-right pixel)
    applyBackdrop(host, tokenId);

    // Metadata
    let meta = metaOrNull;
    if (!meta && tokenId) meta = await loadMeta(tokenId);
    if (!meta) throw new Error('metadata not available');
    const attrs = attrsInOrder(meta);
    if (!attrs.length) throw new Error('no attributes');

    const animFlags = ENABLE_ANIMATIONS
      ? await Promise.all(attrs.map(a => {
          if (!a || DISALLOW_ANIM.has(a.key)) return Promise.resolve(false);
          return hasAnimation(a.key, a.value).catch(() => false);
        }))
      : attrs.map(() => false);

    // Render each layer exactly in metadata order, swapping to animations when available
    for (let i=0;i<attrs.length;i++){
      const a = attrs[i];
      if (!a) continue;
      const lift = !!hoverKey && a.key === hoverKey && !DISALLOW_HOVER.has(a.key);
      if (ENABLE_ANIMATIONS && animFlags[i] && !DISALLOW_ANIM.has(a.key)){
        addAnim(host, layerGIF(a.key, a.value), lift);
      } else {
        addLayer(host, layerPNG(a.key, a.value), lift);
      }
    }
  };

  // Minimal CSS once
  (function injectCSS(){
    if (document.getElementById('ff-frog-dom-css')) return;
    const css = `.frog-stack img{ image-rendering: pixelated; }`;
    const s=document.createElement('style'); s.id='ff-frog-dom-css'; s.textContent=css; document.head.appendChild(s);
  })();

})();
