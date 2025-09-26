// assets/js/frog-thumbs-dashboard.js
// Attribute-layered thumbnails ONLY inside the Dashboard owned/staked panel.
// Adapts to the container's size; replaces <img> or bg-image tiles in-place.
// Debug: FF.layerDebug = true; FF.forceFrogLayering();

(function(){
  'use strict';

  // ---------- scope: ONLY these roots ----------
  var ROOTS = [
    '#ownedPanel', '#dashboardPanel', '.owned-panel', '.wallet-owned',
    '.cards-owned', '.owned-grid', '.owned-cards', '.dashboard-owned'
  ];

  // ---------- paths ----------
  var CFG  = (window.FF_CFG || window.CFG || {});
  var SRC  = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');      // optional base ('' by default)
  var LAYERS = (SRC?SRC:'') + '/frog/build_files';
  var FLAT   = (SRC?SRC:'') + '/frog';
  var META   = (SRC?SRC:'') + '/frog/json';

  // ---------- debug ----------
  var DBG = { on:false, log: function(){ if (this.on) console.log.apply(console, ['[frog-layer]'].concat([].slice.call(arguments))); } };
  Object.defineProperty(window, 'FF', { value: Object.assign(window.FF||{}, {
    forceFrogLayering: function(){ scan(document); },
    set layerDebug(v){ DBG.on = !!v; }, get layerDebug(){ return DBG.on; }
  }), configurable:true });

  // ---------- utils ----------
  var qq = function(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); };
  var safe = function(s){ return encodeURIComponent(String(s)); };

  function insideDash(node){
    if (!node || node.nodeType!==1) return false;
    for (var i=0;i<ROOTS.length;i++){
      if (node.closest && node.closest(ROOTS[i])) return true;
    }
    return false;
  }

  // find tokenId from many hints
  function tokenIdFrom(node){
    if (!node || node.nodeType!==1) return null;

    // 1) data-* on the node or ancestors
    var p = node;
    for (var i=0; i<4 && p && p.nodeType===1; i++, p=p.parentNode){
      var ds = p.dataset || {};
      var cand = ds.tokenId || ds.id || ds.frogId || ds.token || ds.tokenid || ds.frogid;
      if (cand) return String(cand).replace(/\D/g,'') || null;
    }

    // 2) <img src="/frog/1234.png"> or any ".../1234.png"
    if (node.tagName === 'IMG'){
      var src = node.getAttribute('src') || '';
      var m = src.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i) || src.match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }

    // 3) background-image url(...) on this or ancestor thumb element
    p = node;
    for (i=0; i<3 && p && p.nodeType===1; i++, p=p.parentNode){
      var bg = getComputedStyle(p).backgroundImage;
      if (bg && bg!=='none'){
        var u = (bg.match(/url\(["']?([^"')]+)["']?\)/i)||[])[1] || '';
        m = u.match(/\/frog\/(\d+)\.png(?:\?.*)?$/i) || u.match(/\/(\d+)\.png(?:\?.*)?$/i);
        if (m) return m[1];
      }
    }

    // 4) anchor href nearby: .../token/1234
    var a = (node.closest('a') || node.querySelector && node.querySelector('a'));
    if (a && a.href){
      m = a.href.match(/\/token\/(\d+)(?:\b|\/|$)/i);
      if (m) return m[1];
    }

    // 5) text like "#1234" in the card
    var card = node.closest('.card, .owned-card, .grid-item, .item, .tile') || node;
    if (card && card.textContent){
      m = card.textContent.match(/#\s*(\d{1,6})/);
      if (m) return m[1];
    }

    return null;
  }

  // get target size from the existing thumbnail/container (fallbacks to 128)
  function getTargetSize(node){
    var r = (node.getBoundingClientRect && node.getBoundingClientRect()) || {width:0, height:0};
    var w = Math.max( Math.round(r.width || 0), 0 );
    var h = Math.max( Math.round(r.height|| 0), 0 );
    var px = Math.max(96, Math.min( Math.max(w,h)||128, 256 )); // clamp between 96–256
    return px;
  }

  function makeWrap(px){
    var d = document.createElement('div');
    d.className = 'frog-layered';
    Object.assign(d.style, {
      width: px+'px', height: px+'px', minWidth: px+'px', minHeight: px+'px',
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated'
    });
    return d;
  }

  function setBg(el, id){
    var url = FLAT + '/' + id + '.png';
    el.style.backgroundRepeat   = 'no-repeat';
    el.style.backgroundSize     = '2000% 2000%';
    el.style.backgroundPosition = '100% -1200%';
    el.style.backgroundImage    = 'url("'+url+'")';
  }

  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
  function makeLayer(attr, val, px){
    var allowAnim = !NO_ANIM_FOR.has(attr);
    var base = LAYERS + '/' + safe(attr);
    var png  = base + '/' + safe(val) + '.png';
    var gif  = base + '/animations/' + safe(val) + '_animation.gif';

    var img = new Image();
    img.decoding='async'; img.loading='lazy'; img.dataset.attr = attr;
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width: px+'px', height: px+'px',
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){ img.src = gif; img.onerror = function(){ img.onerror=null; img.src = png; }; }
    else img.src = png;

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', function(){
        img.style.transform='translate(-8px,-12px)';
        img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', function(){
        img.style.transform='translate(0,0)'; img.style.filter='none';
      });
    }
    return img;
  }

  function fetchJSON(u){ return fetch(u, {cache:'force-cache'}).then(function(r){ if(!r.ok) throw new Error(u+':'+r.status); return r.json(); }); }

  async function buildLayered(container, id, px){
    // wipe
    while (container.firstChild) container.removeChild(container.firstChild);
    // ensure sizing
    Object.assign(container.style, { width:px+'px', height:px+'px', minWidth:px+'px', minHeight:px+'px' });
    // shifted flat bg
    setBg(container, id);

    try{
      var meta = await fetchJSON(META + '/' + id + '.json');
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      for (var i=0;i<attrs.length;i++){
        var a = String(attrs[i].trait_type || attrs[i].traitType || '').trim();
        var v = String(attrs[i].value).trim();
        if (!a || !v) continue;
        container.appendChild(makeLayer(a, v, px));
      }
    }catch(_){
      // fallback = flat image on top
      var img = new Image();
      img.decoding='async'; img.loading='lazy';
      Object.assign(img.style, { position:'absolute', inset:'0', width:px+'px', height:px+'px', imageRendering:'pixelated', zIndex:'2' });
      img.src = FLAT + '/' + id + '.png';
      container.appendChild(img);
    }
  }

  // replace an <img> or overlay a tile that uses background-image
  function upgradeNode(node){
    if (!insideDash(node)) return false;
    if (node.closest && node.closest('.frog-layered')) return true;

    var id = tokenIdFrom(node);
    if (!id){ DBG.log('no id for node', node); return false; }

    var px = getTargetSize(node);

    // IMG case: replace the <img>
    if (node.tagName === 'IMG'){
      var wrap = makeWrap(px), parent = node.parentNode;
      if (!parent) return false;
      try { parent.replaceChild(wrap, node); }
      catch(_){ parent.insertBefore(wrap, node); node.style.display='none'; }
      buildLayered(wrap, id, px);
      DBG.log('replaced <img> with layered', id, px);
      return true;
    }

    // bg-image tile: overlay inside it
    var stylePos = getComputedStyle(node).position;
    if (stylePos === 'static') node.style.position = 'relative';
    var overlay = makeWrap(px);
    Object.assign(overlay.style, { position:'absolute', left:'0', top:'0', width:'100%', height:'100%' });
    node.appendChild(overlay);
    buildLayered(overlay, id, px);
    DBG.log('overlay layered on tile', id, px);
    return true;
  }

  function scan(root){
    var hits = 0;
    ROOTS.forEach(function(sel){
      qq(sel, root||document).forEach(function(scope){
        // common thumb nodes: imgs and tiles
        qq('img, .thumb, .thumb-wrap, .tile, .card-thumb, .owned-thumb', scope).forEach(function(n){
          hits += upgradeNode(n) ? 1 : 0;
        });
      });
    });
    DBG.log('scan hits:', hits);
    return hits;
  }

  function observe(){
    var roots = qq(ROOTS.join(', '));
    if (!roots.length) return;
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(n){
            if (n.nodeType===1) scan(n);
          });
        }
        if (m.type==='attributes' && (m.attributeName==='src' || m.attributeName==='style' || m.attributeName==='class' || m.attributeName==='data-token-id' || m.attributeName==='data-id')) {
          scan(m.target);
        }
      }
    });
    roots.forEach(function(r){ mo.observe(r, {childList:true, subtree:true, attributes:true, attributeFilter:['src','style','class','data-token-id','data-id']}); });
  }

  function kick(){
    scan(document);
    observe();
    // a few retries to catch late renders
    var tries = 0, t = setInterval(function(){
      tries++;
      var added = scan(document);
      if (tries > 6 || !added) clearInterval(t);
    }, 500);
  }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:owned:updated', kick);
  document.addEventListener('ff:dashboard:render', kick);
})();
