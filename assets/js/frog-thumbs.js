// assets/js/frog-thumbs.js — Attribute-layered frogs ONLY inside dashboard owned/staked cards.
// Leaves all other frog images site-wide untouched.

(function(){
  'use strict';

  // ----- scope roots (ONLY these get layered) -----
  var ROOTS = ['#ownedPanel','#dashboardPanel','.owned-panel','.wallet-owned','.cards-owned','.owned-grid','.owned-cards'];

  // ----- paths -----
  var CFG = (window.FF_CFG || window.CFG || {});
  var SRC = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  var LAYERS = (SRC?SRC:'') + '/frog/build_files';
  var FLAT   = (SRC?SRC:'') + '/frog';
  var META   = (SRC?SRC:'') + '/frog/json';
  var SIZE = 128;

  function q(s,p){ return (p||document).querySelector(s); }
  function qq(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function safe(s){ return encodeURIComponent(String(s)); }
  function insideDash(node){
    if (!node || node.nodeType!==1) return false;
    for (var i=0;i<ROOTS.length;i++){ if (node.closest && node.closest(ROOTS[i])) return true; }
    return false;
  }

  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeWrap(){
    var d = document.createElement('div');
    d.className = 'frog-128-layered';
    Object.assign(d.style, {
      width:SIZE+'px', height:SIZE+'px', minWidth:SIZE+'px', minHeight:SIZE+'px',
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated'
    });
    return d;
  }
  function setBg(el, id){
    var url = FLAT + '/' + id + '.png';
    el.style.background = 'url("'+url+'") no-repeat';
    el.style.backgroundSize = '2000% 2000%';
    el.style.backgroundPosition = '100% -1200%';
  }
  function makeLayer(attr, val){
    var allowAnim = !NO_ANIM_FOR.has(attr);
    var base = LAYERS + '/' + safe(attr);
    var png  = base + '/' + safe(val) + '.png';
    var gif  = base + '/animations/' + safe(val) + '_animation.gif';
    var img = new Image();
    img.decoding='async'; img.loading='lazy'; img.dataset.attr=attr;
    Object.assign(img.style,{ position:'absolute', left:'0', top:'0', width:SIZE+'px', height:SIZE+'px',
      imageRendering:'pixelated', zIndex:'2', transition:'transform 280ms cubic-bezier(.22,.61,.36,1)' });
    if (allowAnim){ img.src=gif; img.onerror=function(){ img.onerror=null; img.src=png; }; }
    else img.src=png;
    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', function(){ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', function(){ img.style.transform='translate(0,0)'; img.style.filter='none'; });
    }
    return img;
  }
  function fetchJSON(u){ return fetch(u,{cache:'force-cache'}).then(function(r){ if(!r.ok) throw new Error(u+':'+r.status); return r.json(); }); }

  function tokenIdFrom(img){
    if (!img) return null;
    var ds = img.dataset || {};
    var d = ds.tokenId || ds.id || ds.frogId || ds.token || null;
    if (d) return String(d).replace(/\D/g,'') || null;
    var src = img.getAttribute('src') || '';
    var m = src.match(/\/frog\/(\d+)\.png/i); if (m) return m[1];
    m = src.match(/\/(\d+)\.png/i); if (m) return m[1];
    return null;
  }

  function build(container, id){
    while (container.firstChild) container.removeChild(container.firstChild);
    setBg(container, id);
    fetchJSON(META + '/' + id + '.json').then(function(meta){
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      for (var i=0;i<attrs.length;i++){
        var a = String(attrs[i].trait_type || attrs[i].traitType || '').trim();
        var v = String(attrs[i].value).trim();
        if (!a || !v) continue;
        container.appendChild(makeLayer(a, v));
      }
    }).catch(function(){
      var img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{ position:'absolute', inset:'0', width:SIZE+'px', height:SIZE+'px', imageRendering:'pixelated', zIndex:'2' });
      img.src = FLAT + '/' + id + '.png'; container.appendChild(img);
    });
  }

  function upgradeImg(img){
    if (!insideDash(img)) return false;
    var id = tokenIdFrom(img); if (!id) return false;
    if (img.closest('.frog-128-layered')) return true;
    var wrap = makeWrap(), p = img.parentNode; if (!p) return false;
    try{ p.replaceChild(wrap, img); }catch(_){ p.insertBefore(wrap, img); img.style.display='none'; }
    build(wrap, id);
    return true;
  }

  function scan(root){
    var scope = root || document;
    var hits = 0;
    for (var i=0;i<ROOTS.length;i++){
      var sel = ROOTS[i] + ' img';
      var imgs = qq(sel, scope);
      for (var k=0;k<imgs.length;k++){ if (upgradeImg(imgs[k])) hits++; }
    }
    return hits;
  }

  function observe(){
    var roots = qq(ROOTS.join(', '));
    if (!roots.length) return;
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          for (var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j]; if (n.nodeType===1) scan(n);
          }
        }
      }
    });
    for (var r=0;r<roots.length;r++){ mo.observe(roots[r], {childList:true, subtree:true}); }
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
