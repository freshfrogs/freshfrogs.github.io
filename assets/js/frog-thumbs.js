// assets/js/frog-thumbs.js
// Layer-by-layer 128px frog thumbnails (trait images stacked), with shifted flat PNG background.
// Works two ways:
//  1) Overrides flatThumb128(container, id) if your code calls it.
//  2) Upgrades already-rendered dashboard images by scanning & swapping them in place.
// No changes needed elsewhere.

(function(){
  'use strict';

  // ---------- CONFIG ----------
  const SRC = (window.FF_CFG?.SOURCE_PATH || window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const LAYERS_BASE = (SRC ? `${SRC}` : '') + `/frog/build_files`;
  const FLAT_BASE   = (SRC ? `${SRC}` : '') + `/frog`;
  const META_BASE   = (SRC ? `${SRC}` : '') + `/frog/json`;
  const SIZE = 128;

  // ---------- HELPERS ----------
  const safe = s => encodeURIComponent(String(s));
  const q = (s,p)=> (p||document).querySelector(s);
  const qq = (s,p)=> Array.from((p||document).querySelectorAll(s));

  function makeContainer(){
    const d = document.createElement('div');
    Object.assign(d.style, {
      width:`${SIZE}px`, height:`${SIZE}px`, minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated'
    });
    d.className = 'frog-128-layered';
    return d;
  }

  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayerImg(attr, value){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `${LAYERS_BASE}/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;

    const img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
    img.dataset.attr = attr;
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width:`${SIZE}px`, height:`${SIZE}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){
      img.src = gif;
      img.onerror = ()=>{ img.onerror = null; img.src = png; };
    } else {
      img.src = png;
    }

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{
        img.style.transform='translate(-8px,-12px)';
        img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', ()=>{
        img.style.transform='translate(0,0)';
        img.style.filter='none';
      });
    }
    return img;
  }

  async function fetchJSON(url){
    const r = await fetch(url, {cache:'force-cache'});
    if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
    return r.json();
  }

  function setShiftedBackground(el, tokenId){
    const flatUrl = `${FLAT_BASE}/${tokenId}.png`;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundSize   = '2000% 2000%';
    el.style.backgroundPosition = '100% -1200%';
    el.style.backgroundImage  = `url("${flatUrl}")`;
  }

  async function buildFrog128(container, tokenId){
    // clear existing children
    while (container.firstChild) container.removeChild(container.firstChild);

    // shifted flat background as the canvas
    setShiftedBackground(container, tokenId);

    // build from metadata
    try{
      const metaUrl = `${META_BASE}/${tokenId}.json`;
      const meta = await fetchJSON(metaUrl);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr, val));
      }
    }catch(err){
      // fallback: flat image over the bg so user still sees a frog
      const img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style, {
        position:'absolute', inset:'0',
        width:`${SIZE}px`, height:`${SIZE}px`,
        imageRendering:'pixelated', zIndex:'2'
      });
      img.src = `${FLAT_BASE}/${tokenId}.png`;
      container.appendChild(img);
    }
  }

  // ---------- AUTO-HOOK: replace global flatThumb128 if used anywhere ----------
  const oldFlat = window.flatThumb128;
  window.buildFrog128 = window.buildFrog128 || buildFrog128;
  window.flatThumb128 = function(container, id){
    try{
      // If caller passed a plain container, make sure it has sizing
      if (!container.classList.contains('frog-128-layered')){
        Object.assign(container.style, {
          width:`${SIZE}px`, height:`${SIZE}px`,
          minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
          position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated'
        });
      }
      return buildFrog128(container, id);
    }catch(e){
      if (typeof oldFlat === 'function') return oldFlat(container, id);
    }
  };

  // ---------- UPGRADE-IN-PLACE: scan existing dashboard images and swap ----------
  // Heuristics to get tokenId:
  //  - data-token-id, data-id
  //  - src ending with /frog/<id>.png
  function extractTokenIdFromEl(img){
    let id = img?.dataset?.tokenId || img?.dataset?.id;
    if (id) return String(id).replace(/\D/g,'');
    const src = img?.getAttribute?.('src') || '';
    const m = src.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    // try title/alt
    const alt = (img.getAttribute('alt')||'').match(/\d+/);
    if (alt) return alt[0];
    return null;
    }

  function upgradeOneImage(img){
    const tokenId = extractTokenIdFromEl(img);
    if (!tokenId) return false;

    // Avoid double work
    if (img.closest('.frog-128-layered')) return true;

    // Make a layered container and replace the <img>
    const wrapper = makeContainer();
    // keep parent layout width/height
    const parent = img.parentNode;
    if (!parent) return false;

    // If parent is a fixed-size thumb cell, use it; else wrap just the image.
    try{
      parent.replaceChild(wrapper, img);
    }catch(_){
      // fallback: insert before and hide original
      parent.insertBefore(wrapper, img);
      img.style.display = 'none';
    }

    // Build layered frog
    buildFrog128(wrapper, tokenId);
    return true;
  }

  function scanAndUpgrade(root){
    const scope = root || document;
    // Likely thumb markers on your site:
    // - img.thumb128
    // - any img with /frog/<id>.png
    const imgs = qq('img.thumb128, img[src*="/frog/"]', scope);
    imgs.forEach(upgradeOneImage);
  }

  // ---------- Observe dynamic dashboard rendering ----------
  const observeTargets = [
    '#ownedPanel', '#dashboardPanel', '.owned-panel', '.wallet-owned', '.cards-owned', '.cards-grid'
  ];
  function startObserver(){
    const container = q(observeTargets.join(', '));
    if (!container) return;
    const mo = new MutationObserver((muts)=>{
      for (const m of muts){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(n=>{
            if (n.nodeType===1) scanAndUpgrade(n);
          });
        }
      }
    });
    mo.observe(container, {childList:true, subtree:true});
  }

  // ---------- Kick ----------
  function kick(){
    // Pass 1: upgrade anything already on the page
    scanAndUpgrade(document);
    // Start watching for future inserts
    startObserver();
  }

  // Also listen to app-specific events if they exist
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
