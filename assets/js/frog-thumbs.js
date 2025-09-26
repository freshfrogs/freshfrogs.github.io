// assets/js/frog-thumbs.js — v3 "no-excuses" layered frogs for dashboard cards.
// Works with <img>, CSS background-image, or arbitrary markup. Detects tokenId via many heuristics.
// Adds FF.forceFrogLayering() for manual re-run.

(function(){
  'use strict';

  // ---------- CONFIG ----------
  const SRC = (window.FF_CFG?.SOURCE_PATH || window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const LAYERS_BASE = (SRC ? `${SRC}` : '') + `/frog/build_files`;
  const FLAT_BASE   = (SRC ? `${SRC}` : '') + `/frog`;
  const META_BASE   = (SRC ? `${SRC}` : '') + `/frog/json`;
  const SIZE = 128;

  // Common dashboard roots (try all)
  const DASH_ROOTS = [
    '#ownedPanel', '#dashboardPanel', '.owned-panel', '.wallet-owned',
    '.cards-owned', '.cards-grid', '.pond-owned', '.module-owned'
  ];

  // ---------- UTIL ----------
  const q  = (s,p)=> (p||document).querySelector(s);
  const qq = (s,p)=> Array.from((p||document).querySelectorAll(s));
  const safe = s => encodeURIComponent(String(s));

  function mkContainer(){
    const d = document.createElement('div');
    d.className = 'frog-128-layered';
    Object.assign(d.style, {
      width:`${SIZE}px`, height:`${SIZE}px`,
      minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
      position:'relative', overflow:'hidden', borderRadius:'8px',
      imageRendering:'pixelated', zIndex:'0'
    });
    return d;
  }

  function setShiftedBackground(el, tokenId){
    const flatUrl = `${FLAT_BASE}/${tokenId}.png`;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundSize   = '2000% 2000%';
    el.style.backgroundPosition = '100% -1200%';
    el.style.backgroundImage  = `url("${flatUrl}")`;
  }

  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayerImg(attr, value){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `${LAYERS_BASE}/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;

    const img = new Image();
    img.decoding='async'; img.loading='lazy';
    img.dataset.attr = attr;
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0',
      width:`${SIZE}px`, height:`${SIZE}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){
      img.src = gif;
      img.onerror = ()=>{ img.onerror=null; img.src = png; };
    } else {
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

  async function buildFrog128(container, tokenId){
    // clear children (if any)
    while (container.firstChild) container.removeChild(container.firstChild);

    // shifted background
    setShiftedBackground(container, tokenId);

    // layers
    try{
      const meta = await fetchJSON(`${META_BASE}/${tokenId}.json`);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr, val));
      }
    }catch(err){
      // fallback to flat visible image if metadata missing
      const img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{
        position:'absolute', inset:'0',
        width:`${SIZE}px`, height:`${SIZE}px`,
        imageRendering:'pixelated', zIndex:'2'
      });
      img.src = `${FLAT_BASE}/${tokenId}.png`;
      container.appendChild(img);
    }
  }

  // ---------- TOKEN ID HEURISTICS ----------
  function extractIdFromURL(url){
    if (!url) return null;
    // matches .../frog/1234.png  OR any .../1234.png
    let m = url.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    m = url.match(/\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    return null;
  }
  function extractIdNearby(el){
    // look for a #1234 in the same card/container
    const txt = (el.closest('.card, .owned-card, .item, .grid-item') || el).textContent || '';
    const m = txt.match(/#\s*(\d{1,6})/);
    return m ? m[1] : null;
  }
  function extractTokenId(node){
    if (!node || node.nodeType !== 1) return null;
    // data attributes on either the image or card
    const ds = node.dataset || {};
    const dIds = [ds.tokenId, ds.id, ds.token, ds.tokenid, ds.frogId, ds.frogid].filter(Boolean);
    if (dIds.length) return String(dIds[0]).replace(/\D/g,'') || null;

    // <img src="..."> case
    if (node.tagName === 'IMG'){
      const src = node.getAttribute('src') || '';
      const id = extractIdFromURL(src);
      if (id) return id;
    }

    // background-image case
    const bg = getComputedStyle(node).backgroundImage;
    if (bg && bg !== 'none'){
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
      if (m){
        const id = extractIdFromURL(m[1]); if (id) return id;
      }
    }

    // try nearby text like #1234
    return extractIdNearby(node);
  }

  // ---------- UPGRADE MECHANICS ----------
  function alreadyLayered(el){
    return el.classList.contains('frog-128-layered') || el.closest?.('.frog-128-layered');
  }

  function replaceImgWithLayer(img, tokenId){
    const wrapper = mkContainer();
    const parent = img.parentNode;
    if (!parent) return false;

    // try replace; fall back to insert & hide
    try{
      parent.replaceChild(wrapper, img);
    }catch(_){
      parent.insertBefore(wrapper, img);
      img.style.display = 'none';
    }
    buildFrog128(wrapper, tokenId);
    return true;
  }

  function overlayLayerOn(el, tokenId){
    // For elements that use background-image (e.g., card tile)
    if (alreadyLayered(el)) return true;
    el.style.position = el.style.position || 'relative';

    const wrapper = mkContainer();
    // fit wrapper to the element’s content box
    Object.assign(wrapper.style, {
      position:'absolute', left:'0', top:'0', width:'100%', height:'100%', zIndex:'2', borderRadius: getComputedStyle(el).borderRadius || '8px'
    });

    el.appendChild(wrapper);
    buildFrog128(wrapper, tokenId);
    return true;
  }

  function upgradeNode(node){
    if (!node || node.nodeType!==1) return false;

    // IMG case
    if (node.tagName === 'IMG'){
      const id = extractTokenId(node);
      if (!id) return false;
      if (alreadyLayered(node)) return true;
      return replaceImgWithLayer(node, id);
    }

    // Any element with a background-image
    const bg = getComputedStyle(node).backgroundImage;
    if (bg && bg !== 'none'){
      const id = extractTokenId(node);
      if (!id) return false;
      return overlayLayerOn(node, id);
    }

    // Otherwise scan children for imgs that match
    let touched = false;
    qq('img', node).forEach(img=>{
      const id = extractTokenId(img);
      if (id && !alreadyLayered(img)){ touched = replaceImgWithLayer(img, id) || touched; }
    });
    return touched;
  }

  function scanAndUpgrade(root){
    const scope = root || document;
    let hits = 0;

    // 1) obvious candidates in known roots
    DASH_ROOTS.forEach(sel=>{
      qq(sel, scope).forEach(rootEl=>{
        // try direct node (bg-image tiles)
        if (upgradeNode(rootEl)) hits++;
        // then scan its descendants
        qq('img, .card, .owned-card, .grid-item, .tile', rootEl).forEach(n=>{
          if (upgradeNode(n)) hits++;
        });
      });
    });

    // 2) global fallback: any likely thumb
    qq('img.thumb128, img[src*=".png"]', scope).forEach(img=>{
      if (upgradeNode(img)) hits++;
    });

    return hits;
  }

  // ---------- OVERRIDE LEGACY API (if used anywhere) ----------
  const oldFlat = window.flatThumb128;
  window.buildFrog128 = window.buildFrog128 || function(container, tokenId){
    // make sure container has the chrome
    if (!container.classList.contains('frog-128-layered')){
      Object.assign(container.style, {
        width:`${SIZE}px`, height:`${SIZE}px`,
        minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
        position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated'
      });
      container.classList.add('frog-128-layered');
    }
    return buildFrog128(container, tokenId);
  };
  window.flatThumb128 = function(container, id){
    try{ return window.buildFrog128(container, id); }
    catch(e){ if (typeof oldFlat==='function') return oldFlat(container, id); }
  };

  // ---------- OBSERVE + RETRY ----------
  function observeDash(){
    const roots = qq(DASH_ROOTS.join(', '));
    const target = roots[0] || document.body;
    const mo = new MutationObserver(muts=>{
      for (const m of muts){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(n=>{
            if (n.nodeType===1) scanAndUpgrade(n);
          });
        }
        if (m.type==='attributes' && (m.attributeName==='style' || m.attributeName==='src' || m.attributeName==='class')){
          scanAndUpgrade(m.target);
        }
      }
    });
    mo.observe(target, {childList:true, subtree:true, attributes:true, attributeFilter:['style','src','class','data-token-id','data-id']});
  }

  function kick(){
    // first pass
    scanAndUpgrade(document);
    observeDash();
    // quick retries for slower UIs
    let tries = 0;
    const tick = setInterval(()=>{
      tries++;
      const added = scanAndUpgrade(document);
      if (tries>8 || added===0) clearInterval(tick);
    }, 600);
  }

  // expose a manual trigger for debugging
  window.FF = Object.assign(window.FF||{}, {
    forceFrogLayering: ()=>scanAndUpgrade(document)
  });

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
