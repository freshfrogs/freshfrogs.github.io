// assets/js/frog-thumbs.js — scoped to the Dashboard (owned/staked) only.
// Renders trait-by-trait layers with shifted flat background, but ONLY inside the
// dashboard roots listed below. No global overrides, no touching collection pages.

(function(){
  'use strict';

  // -------- scope: ONLY these roots --------
  const DASH_ROOTS = [
    '#ownedPanel', '#dashboardPanel', '.owned-panel', '.wallet-owned',
    '.cards-owned', '.owned-grid', '.owned-cards'
  ];

  // -------- paths --------
  const SRC = (window.FF_CFG?.SOURCE_PATH || window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const LAYERS_BASE = (SRC ? `${SRC}` : '') + `/frog/build_files`;
  const FLAT_BASE   = (SRC ? `${SRC}` : '') + `/frog`;
  const META_BASE   = (SRC ? `${SRC}` : '') + `/frog/json`;
  const SIZE = 128;

  const q  = (s,p)=> (p||document).querySelector(s);
  const qq = (s,p)=> Array.from((p||document).querySelectorAll(s));
  const safe = s => encodeURIComponent(String(s));

  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayer(attr, value){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `${LAYERS_BASE}/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;

    const img = new Image();
    img.decoding='async'; img.loading='lazy'; img.dataset.attr=attr;
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0', width:`${SIZE}px`, height:`${SIZE}px`,
      imageRendering:'pixelated', zIndex:'2', transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });
    if (allowAnim){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; }
    else img.src=png;

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='translate(0,0)'; img.style.filter='none'; });
    }
    return img;
  }

  async function getJSON(u){ const r=await fetch(u,{cache:'force-cache'}); if(!r.ok) throw new Error(u+':'+r.status); return r.json(); }

  function makeContainer(){
    const d = document.createElement('div');
    d.className='frog-128-layered';
    Object.assign(d.style,{ width:`${SIZE}px`, height:`${SIZE}px`, minWidth:`${SIZE}px`, minHeight:`${SIZE}px`,
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated' });
    return d;
  }

  function setBg(el, id){
    const flat = `${FLAT_BASE}/${id}.png`;
    el.style.background = `url("${flat}") no-repeat`;
    el.style.backgroundSize='2000% 2000%';
    el.style.backgroundPosition='100% -1200%';
  }

  async function buildLayered(container, id){
    while (container.firstChild) container.removeChild(container.firstChild);
    setBg(container, id);
    try{
      const meta = await getJSON(`${META_BASE}/${id}.json`);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const r of attrs){
        const a = String(r.trait_type || r.traitType || '').trim();
        const v = String(r.value).trim();
        if (!a || !v) continue;
        container.appendChild(makeLayer(a,v));
      }
    }catch{
      const img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{ position:'absolute', inset:'0', width:`${SIZE}px`, height:`${SIZE}px`, imageRendering:'pixelated', zIndex:'2' });
      img.src = `${FLAT_BASE}/${id}.png`;
      container.appendChild(img);
    }
  }

  // strictly inside dashboard roots
  function insideDash(node){
    if (!node) return false;
    for (const sel of DASH_ROOTS){ if (node.closest && node.closest(sel)) return true; }
    return false;
  }

  // detect token id
  function tokenIdFrom(node){
    if (!node) return null;
    const ds = node.dataset || {};
    const cand = ds.tokenId || ds.id || ds.frogId || ds.token || null;
    if (cand) return String(cand).replace(/\D/g,'') || null;

    if (node.tagName === 'IMG'){
      const src = node.getAttribute('src')||'';
      let m = src.match(/\/frog\/(\d+)\.png/i); if (m) return m[1];
      m = src.match(/\/(\d+)\.png/i); if (m) return m[1];
    }
    return null;
  }

  function upgradeImg(img){
    if (!insideDash(img)) return false;
    const id = tokenIdFrom(img); if (!id) return false;
    if (img.closest('.frog-128-layered')) return true;

    const wrap = makeContainer();
    const parent = img.parentNode; if (!parent) return false;
    try{ parent.replaceChild(wrap, img); } catch{ parent.insertBefore(wrap, img); img.style.display='none'; }
    buildLayered(wrap, id);
    return true;
  }

  function scan(root){
    const scope = root || document;
    let hits = 0;
    DASH_ROOTS.forEach(sel=>{
      qq(`${sel} img`, scope).forEach(img=>{ if (upgradeImg(img)) hits++; });
    });
    return hits;
  }

  function observe(){
    const roots = qq(DASH_ROOTS.join(', '));
    if (!roots.length) return;
    const target = roots[0];
    const mo = new MutationObserver(muts=>{
      for (const m of muts){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(n=>{
            if (n.nodeType===1) scan(n);
          });
        }
      }
    });
    mo.observe(target, {childList:true, subtree:true});
  }

  function kick(){
    scan(document);
    observe();
  }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
