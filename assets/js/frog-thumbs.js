// assets/js/frog-thumbs.js
// Force attribute-built thumbnails ONLY in the Dashboard (owned/staked).
// Uses buildFrog128 (shifted flat PNG background + per-trait layers).
// Leaves all other pages/images untouched.

(function(){
  'use strict';

  // ----- ONLY apply inside these dashboard roots -----
  var ROOTS = [
    '#ownedPanel', '#dashboardPanel', '[data-panel="owned"]',
    '.owned-panel', '.wallet-owned', '.cards-owned',
    '.owned-grid', '.owned-cards', '.owned-list', '.dashboard-owned', '.my-frogs'
  ];

  // ----- asset paths -----
  var CFG = (window.FF_CFG || window.CFG || {});
  var SRC = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  var LAYERS = (SRC?SRC:'') + '/frog/build_files';
  var FLAT   = (SRC?SRC:'') + '/frog';
  var META   = (SRC?SRC:'') + '/frog/json';

  function insideDash(node){
    if (!node || node.nodeType!==1) return false;
    for (var i=0;i<ROOTS.length;i++){ if (node.closest && node.closest(ROOTS[i])) return true; }
    return false;
  }
  function qq(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function safe(s){ return encodeURIComponent(String(s)); }

  // ---- builder (exactly your buildFrog128 with the shifted bg) ----
  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
  function makeLayerImg(attr, value, px){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `${LAYERS}/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;
    const img = new Image();
    img.decoding='async'; img.loading='lazy'; img.dataset.attr=attr;
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0',
      width:`${px}px`, height:`${px}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });
    if (allowAnim){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; }
    else img.src=png;

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='translate(0,0)'; img.style.filter='none'; });
    }
    return img;
  }

  async function buildFrog128(container, tokenId){
    const SIZE=128;
    Object.assign(container.style,{
      width:`${SIZE}px`,height:`${SIZE}px`,minWidth:`${SIZE}px`,minHeight:`${SIZE}px`,
      position:'relative',overflow:'hidden',borderRadius:'8px',imageRendering:'pixelated'
    });

    const flatUrl = `${FLAT}/${tokenId}.png`;
    container.style.backgroundRepeat='no-repeat';
    container.style.backgroundSize='2000% 2000%';
    container.style.backgroundPosition='100% -1200%';
    container.style.backgroundImage=`url("${flatUrl}")`;

    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      const meta = await (await fetch(`${META}/${tokenId}.json`, {cache:'force-cache'})).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr,val,SIZE));
      }
    }catch{
      const img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{position:'absolute',inset:'0',width:`${SIZE}px`,height:`${SIZE}px`,imageRendering:'pixelated',zIndex:'2'});
      img.src=flatUrl; container.appendChild(img);
    }
  }
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  // ---- detect tokenId & replace only inside dashboard ----
  function tokenIdFrom(img){
    if (!img) return null;
    const ds = img.dataset || {};
    const d = ds.tokenId || ds.id || ds.frogId || ds.token || null;
    if (d) return String(d).replace(/\D/g,'') || null;
    const src = img.getAttribute('src') || '';
    let m = src.match(/\/frog\/(\d+)\.png/i); if (m) return m[1];
    m = src.match(/\/(\d+)\.png/i); if (m) return m[1];
    return null;
  }

  function upgradeImg(img){
    if (!insideDash(img)) return false;
    const id = tokenIdFrom(img); if (!id) return false;
    if (img.closest('.frog-128-layered')) return true;
    const wrap = document.createElement('div');
    wrap.className='frog-128-layered';
    const p = img.parentNode; if (!p) return false;
    try{ p.replaceChild(wrap, img); }catch(_){ p.insertBefore(wrap, img); img.style.display='none'; }
    buildFrog128(wrap, id);
    return true;
  }

  function scan(root){
    let hits = 0;
    ROOTS.forEach(function(sel){
      qq(sel + ' img', root||document).forEach(function(img){
        hits += upgradeImg(img) ? 1 : 0;
      });
    });
    return hits;
  }

  function observe(){
    // Observe the whole document to catch late inserts from your dashboard code
    const mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        const m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          for (var j=0;j<m.addedNodes.length;j++){
            const n = m.addedNodes[j]; if (n.nodeType===1) scan(n);
          }
        }
      }
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  function kick(){ scan(document); observe(); }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
