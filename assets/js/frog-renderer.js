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

  function metaURL(id){ return `${ROOT}/frog/json/${id}.json`; }
  function basePNG(id){ return `${ROOT}/frog/${id}.png`; }
  function layerPNG(k,v){ return `${ROOT}/frog/build_files/${k}/${v}.png`; }
  function layerGIF(k,v){ return `${ROOT}/frog/build_files/${k}/${v}_animation.gif`; }

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
      backgroundPosition: '100% 100%', // bottom-right
      backgroundSize: '10000% 10000%'  // zoom to 1px corner color
    });
    return host;
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

  function addAnim(host, url){
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    Object.assign(img.style, {
      position:'absolute', left:0, top:0, width:'100%', height:'100%',
      imageRendering:'pixelated', pointerEvents:'none'
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
    host.style.backgroundImage = tokenId ? `url("${basePNG(tokenId)}")` : 'none';

    // Metadata
    let meta = metaOrNull;
    if (!meta && tokenId) meta = await loadMeta(tokenId);
    if (!meta) throw new Error('metadata not available');
    const attrs = attrsInOrder(meta);
    if (!attrs.length) throw new Error('no attributes');

    // Static layers in EXACT metadata order
    for (const a of attrs){
      const lift = !!hoverKey && a.key === hoverKey && !DISALLOW_HOVER.has(a.key);
      addLayer(host, layerPNG(a.key, a.value), lift);
    }

    // Animated overlays (skip Frog/Hat)
    for (const a of attrs){
      if (DISALLOW_ANIM.has(a.key)) continue;
      addAnim(host, layerGIF(a.key, a.value));
    }
  };

  // Minimal CSS once
  (function injectCSS(){
    if (document.getElementById('ff-frog-dom-css')) return;
    const css = `.frog-stack img{ image-rendering: pixelated; }`;
    const s=document.createElement('style'); s.id='ff-frog-dom-css'; s.textContent=css; document.head.appendChild(s);
  })();

})();
