// assets/js/frog-thumbs.js
// Layered thumbnails ONLY inside the Dashboard owned/staked panel.
// Uses buildFrog128 (shifted flat PNG as background + per-trait layers).
// Debug helpers: FF.forceFrogLayering(), FF.layerDebug = true

(function () {
  'use strict';

  // ---------- scope roots (dashboard/owned/staked) ----------
  var ROOTS = [
    '#ownedPanel', '#dashboardPanel', '[data-panel="owned"]',
    '.owned-panel', '.wallet-owned', '.cards-owned', '.owned-grid',
    '.owned-cards', '.owned-list', '.dashboard-owned', '.my-frogs'
  ];

  // ---------- paths ----------
  var CFG  = (window.FF_CFG || window.CFG || {});
  var SRC  = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  var LAYERS = (SRC ? SRC : '') + '/frog/build_files';
  var FLAT   = (SRC ? SRC : '') + '/frog';
  var META   = (SRC ? SRC : '') + '/frog/json';

  // ---------- debug ----------
  var DBG = { on:false, log:function(){ if (this.on) console.log.apply(console, ['[frog-thumbs]'].concat([].slice.call(arguments))); } };
  window.FF = Object.assign(window.FF || {}, {
    forceFrogLayering: function(){ scan(document); },
    set layerDebug(v){ DBG.on = !!v; }, get layerDebug(){ return DBG.on; }
  });

  // ---------- helpers ----------
  function qq(s, p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function safe(s){ return encodeURIComponent(String(s)); }
  function insideDash(node){
    if (!node || node.nodeType !== 1) return false;
    for (var i=0;i<ROOTS.length;i++){
      if (node.closest && node.closest(ROOTS[i])) return true;
    }
    return false;
  }

  // ---------- buildFrog128 (your attribute builder, with shifted background) ----------
  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayerImg(attr, value, px){
    var allowAnim = !NO_ANIM_FOR.has(attr);
    var base = LAYERS + '/' + safe(attr);
    var png  = base + '/' + safe(value) + '.png';
    var gif  = base + '/animations/' + safe(value) + '_animation.gif';

    var img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
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
        img.style.transform='translate(-8px,-12px)';
        img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', function(){
        img.style.transform='translate(0,0)';
        img.style.filter='none';
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
    container.style.backgroundRepeat   = 'no-repeat';
    container.style.backgroundSize     = '2000% 2000%';
    container.style.backgroundPosition = '100% -1200%';
    container.style.backgroundImage    = 'url("'+flatUrl+'")';

    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      var meta = await (await fetch(META + '/' + tokenId + '.json', {cache:'force-cache'})).json();
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      for (var i=0;i<attrs.length;i++){
        var r = attrs[i];
        var attr = String(r.trait_type || r.traitType || '').trim();
        var val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr, val, SIZE));
      }
    }catch(_){
      var img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style, { position:'absolute', inset:'0', width:SIZE+'px', height:SIZE+'px', imageRendering:'pixelated', zIndex:'2' });
      img.src = flatUrl;
      container.appendChild(img);
    }
  }

  // expose globally (harmless if already present)
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  // ---------- tokenId detection ----------
  function tokenIdFrom(node){
    if (!node || node.nodeType !== 1) return null;

    // data-* on the node or up to 3 ancestors
    var p = node, hops = 0;
    while (p && p.nodeType===1 && hops++ < 3){
      var ds = p.dataset || {};
      var cand = ds.tokenId || ds.id || ds.frogId || ds.token || ds.tokenid || ds.frogid;
      if (cand) return String(cand).replace(/\D/g,'') || null;
      p = p.parentNode;
    }

    // IMG src
    if (node.tagName === 'IMG'){
      var src = node.getAttribute('src') || '';
      var m = src.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i) || src.match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }

    // background-image on node or parent
    p = node; hops = 0;
    while (p && p.nodeType===1 && hops++ < 2){
      var bg = getComputedStyle(p).backgroundImage;
      if (bg && bg!=='none'){
        var u = (bg.match(/url\(["']?([^"')]+)["']?\)/i)||[])[1] || '';
        m = u.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i) || u.match(/\/(\d+)\.png(?:\?.*)?$/i);
        if (m) return m[1];
      }
      p = p.parentNode;
    }

    // nearby anchor /token/<id>
    var a = (node.closest && node.closest('a')) || (node.querySelector && node.querySelector('a'));
    if (a && a.href){
      var m2 = a.href.match(/\/token\/(\d+)(?:\b|\/|$)/i);
      if (m2) return m2[1];
    }

    // text like "#1234" in card
    var card = node.closest && node.closest('.card, .owned-card, .grid-item, .item, .tile');
    if (card && card.textContent){
      var m3 = card.textContent.match(/#\s*(\d{1,6})/);
      if (m3) return m3[1];
    }

    return null;
  }

  // ---------- upgrade mechanics ----------
  function alreadyLayered(node){
    return !!(node.closest && node.closest('.frog-128-layered'));
  }

  function replaceImgWithLayer(img, tokenId){
    var wrap = document.createElement('div');
    wrap.className = 'frog-128-layered';
    var parent = img.parentNode;
    if (!parent) return false;
    try { parent.replaceChild(wrap, img); }
    catch(_){ parent.insertBefore(wrap, img); img.style.display='none'; }
    buildFrog128(wrap, tokenId);
    DBG.log('replaced <img>', tokenId);
    return true;
  }

  function overlayLayerOn(tile, tokenId){
    if (alreadyLayered(tile)) return true;
    var wrap = document.createElement('div');
    wrap.className = 'frog-128-layered';
    Object.assign(wrap.style, { position:'absolute', left:'0', top:'0', width:'128px', height:'128px' });
    if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';
    tile.appendChild(wrap);
    buildFrog128(wrap, tokenId);
    DBG.log('overlay on tile', tokenId);
    return true;
  }

  function upgradeNode(node){
    if (!insideDash(node)) return false;

    // Direct IMG
    if (node.tagName === 'IMG'){
      var id = tokenIdFrom(node);
      if (!id) return false;
      if (alreadyLayered(node)) return true;
      return replaceImgWithLayer(node, id);
    }

    // Tile with background-image
    var bg = getComputedStyle(node).backgroundImage;
    if (bg && bg !== 'none'){
      var id2 = tokenIdFrom(node);
      if (!id2) return false;
      return overlayLayerOn(node, id2);
    }

    // Otherwise scan children for imgs
    var touched = false;
    qq('img', node).forEach(function(img){
      var id3 = tokenIdFrom(img);
      if (id3 && !alreadyLayered(img)) touched = replaceImgWithLayer(img, id3) || touched;
    });
    return touched;
  }

  function scan(root){
    var scope = root || document;
    var hits = 0;

    // scan each root
    ROOTS.forEach(function(sel){
      qq(sel, scope).forEach(function(r){
        // common image patterns in cards
        qq('img.thumb128, img[src*="/frog/"], img[data-token-id], img[data-id], .card-thumb, .owned-thumb, .thumb, .tile', r)
          .forEach(function(n){ if (upgradeNode(n)) hits++; });
      });
    });

    DBG.log('scan hits:', hits);
    return hits;
  }

  function observe(){
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(n){
            if (n.nodeType === 1) scan(n);
          });
        }
        if (m.type === 'attributes' && (m.attributeName === 'src' || m.attributeName === 'style' || m.attributeName === 'class' || m.attributeName === 'data-token-id' || m.attributeName === 'data-id')){
          scan(m.target);
        }
      }
    });
    // Observe the whole document so we don't miss late renders
    mo.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src','style','class','data-token-id','data-id'] });
  }

  function kick(){
    scan(document);
    observe();
    // a few retries to catch delayed renders
    var tries = 0, t = setInterval(function(){
      tries++;
      var added = scan(document);
      if (tries > 8 || !added) clearInterval(t);
    }, 500);
  }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
