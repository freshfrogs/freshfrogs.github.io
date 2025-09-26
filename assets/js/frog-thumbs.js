// assets/js/frog-thumbs.js
// Dashboard ONLY: build frogs layer-by-layer + set card background (20% darker).

(function () {
  'use strict';

  // ----- scope (dashboard / owned / staked) -----
  var ROOTS = [
    '#dashboardPanel', '#ownedPanel', '[data-panel="owned"]',
    '.dashboard-owned', '.owned-panel', '.wallet-owned',
    '.owned-grid', '.owned-cards', '.owned-list', '.cards-owned', '.my-frogs'
  ];

  // ----- asset paths -----
  var CFG = (window.FF_CFG || window.CFG || {});
  var SRC = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');     // optional base
  var LAYERS = (SRC?SRC:'') + '/frog/build_files';
  var FLAT   = (SRC?SRC:'') + '/frog';
  var META   = (SRC?SRC:'') + '/frog/json';

  // ----- helpers -----
  function qq(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function insideDash(node){
    if (!node || node.nodeType !== 1) return false;
    for (var i=0;i<ROOTS.length;i++){
      if (node.closest && node.closest(ROOTS[i])) return true;
    }
    return false;
  }
  function safe(s){ return encodeURIComponent(String(s)); }

  // ---------- builder (your buildFrog128 with shifted flat bg) ----------
  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayerImg(attr, value, px){
    var allowAnim = !NO_ANIM_FOR.has(attr);
    var base = LAYERS + '/' + safe(attr);
    var png  = base + '/' + safe(value) + '.png';
    var gif  = base + '/animations/' + safe(value) + '_animation.gif';

    var img = new Image();
    img.decoding='async';
    img.loading='lazy';
    img.dataset.attr = attr;
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width:px+'px', height:px+'px',
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){
      img.src = gif;
      img.onerror = function(){ img.onerror=null; img.src = png; };
    } else {
      img.src = png;
    }

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', function(){
        img.style.transform = 'translate(-8px,-12px)';
        img.style.filter = 'drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', function(){
        img.style.transform = 'translate(0,0)';
        img.style.filter = 'none';
      });
    }
    return img;
  }

  async function buildFrog128(container, tokenId){
    var SIZE = 128;

    Object.assign(container.style, {
      width:SIZE+'px', height:SIZE+'px',
      minWidth:SIZE+'px', minHeight:SIZE+'px',
      position:'relative', overflow:'hidden',
      borderRadius:'8px', imageRendering:'pixelated'
    });

    var flatUrl = FLAT + '/' + tokenId + '.png';
    // shifted background (same look used elsewhere)
    container.style.backgroundRepeat   = 'no-repeat';
    container.style.backgroundSize     = '2000% 2000%';
    container.style.backgroundPosition = '100% -1200%';
    container.style.backgroundImage    = 'url("'+flatUrl+'")';

    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      var meta = await (await fetch(META + '/' + tokenId + '.json', {cache:'force-cache'})).json();
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      for (var i=0;i<attrs.length;i++){
        var a = String(attrs[i].trait_type || attrs[i].traitType || '').trim();
        var v = String(attrs[i].value).trim();
        if (!a || !v) continue;
        container.appendChild(makeLayerImg(a, v, SIZE));
      }
    }catch(_){
      // graceful fallback: show the flat image
      var img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style, { position:'absolute', inset:'0', width:SIZE+'px', height:SIZE+'px', imageRendering:'pixelated', zIndex:'2' });
      img.src = flatUrl;
      container.appendChild(img);
    }
  }
  // expose (harmless if already defined)
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  // ---------- token id detection ----------
  function tokenIdFrom(img){
    if (!img) return null;
    var ds = img.dataset || {};
    var d = ds.tokenId || ds.id || ds.frogId || ds.token || null;
    if (d) return String(d).replace(/\D/g,'') || null;

    var src = img.getAttribute('src') || '';
    var m = src.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i) || src.match(/\/(\d+)\.png(?:\?.*)?$/i);
    return m ? m[1] : null;
  }

  // ---------- apply darker card background using same shifted flat image ----------
  function setCardBackground(cardEl, tokenId){
    if (!cardEl || cardEl.dataset.bgApplied === '1') return;
    var url = FLAT + '/' + tokenId + '.png';

    // same “zoomed/offset” look + 20% darker overlay
    cardEl.style.backgroundRepeat   = 'no-repeat';
    cardEl.style.backgroundSize     = '2000% 2000%';
    cardEl.style.backgroundPosition = '100% -1200%';
    cardEl.style.backgroundImage    = 'linear-gradient(rgba(0,0,0,0.20), rgba(0,0,0,0.20)), url("'+url+'")';
    cardEl.style.backgroundBlendMode = 'multiply'; // deepens the darken a touch
    // keep card’s existing border radius/shadow from your theme
    cardEl.dataset.bgApplied = '1';
  }

  // ---------- upgrade a single image inside the dashboard ----------
  function upgradeImg(img){
    if (!insideDash(img)) return false;
    if (img.closest('.frog-128-layered')) return true;

    var id = tokenIdFrom(img);
    if (!id) return false;

    // 1) swap the thumbnail for the layered builder
    var wrap = document.createElement('div');
    wrap.className = 'frog-128-layered';
    var parent = img.parentNode; if (!parent) return false;
    try { parent.replaceChild(wrap, img); } catch(_){ parent.insertBefore(wrap, img); img.style.display='none'; }
    buildFrog128(wrap, id);

    // 2) set the *card* background to same shifted flat image, 20% darker
    var card = (wrap.closest('.card') || wrap.closest('.owned-card') || wrap.closest('.grid-item') || wrap.closest('.dashboard-card') || wrap.closest('.item') || wrap.closest('.tile') || wrap.closest('.module-card') || wrap.closest('.ff-card') || wrap.parentElement);
    setCardBackground(card, id);

    return true;
  }

  function scan(root){
    var hits = 0;
    ROOTS.forEach(function(sel){
      qq(sel + ' img').forEach(function(img){
        if (upgradeImg(img)) hits++;
      });
    });
    return hits;
  }

  function observe(){
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          for (var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            if (n.nodeType === 1) scan(n);
          }
        }
      }
    });
    // Observe the whole doc to catch late-rendered dashboard cards
    mo.observe(document.body, {childList:true, subtree:true});
  }

  function kick(){ scan(document); observe(); }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
