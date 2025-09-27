// assets/js/frog-thumbs.js
// Dashboard: render each <article.frog-card> as a layered frog + darkened card bg.

(function () {
  'use strict';

  // --- config/paths (adjustable via window.CFG.SOURCE_PATH if you have one) ---
  var SRC   = (window.CFG && window.CFG.SOURCE_PATH ? String(window.CFG.SOURCE_PATH).replace(/\/+$/,'') : '');
  var FLAT  = (SRC ? SRC : '') + '/frog';
  var META  = (SRC ? SRC : '') + '/frog/json';
  var LAYER = (SRC ? SRC : '') + '/frog/build_files';

  // --- utilities ---
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function safe(s){ return encodeURIComponent(String(s)); }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // --- tiny layered builder (fresh, self-contained) ---
  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayer(attr, value, size){
    var allowAnim = !NO_ANIM_FOR.has(attr);
    var base = LAYER + '/' + safe(attr);
    var png  = base + '/' + safe(value) + '.png';
    var gif  = base + '/animations/' + safe(value) + '_animation.gif';

    var img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){ img.src = gif; img.onerror = function(){ img.onerror = null; img.src = png; }; }
    else { img.src = png; }

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

  async function buildLayered(container, tokenId, size){
    var flatUrl = FLAT + '/' + tokenId + '.png';

    // shifted flat BG (like the Pond)
    Object.assign(container.style, {
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated',
      width:size+'px', height:size+'px', minWidth:size+'px', minHeight:size+'px',
      backgroundImage: 'url("'+flatUrl+'")',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '2000% 2000%',
      backgroundPosition: '100% -1200%'
    });

    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      var meta = await (await fetch(META + '/' + tokenId + '.json', {cache:'force-cache'})).json();
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      attrs.forEach(function(row){
        var attr = String(row.trait_type || row.traitType || '').trim();
        var val  = String(row.value).trim();
        if (attr && val) container.appendChild(makeLayer(attr, val, size));
      });
    }catch{
      // fallback: flat image on top
      var img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style, { position:'absolute', inset:'0', width:size+'px', height:size+'px', imageRendering:'pixelated', zIndex:'2' });
      img.src = flatUrl; container.appendChild(img);
    }
  }

  function darkenCardBackground(card, tokenId){
    if (!card || card.dataset.bgApplied === '1') return;
    var flatUrl = FLAT + '/' + tokenId + '.png';
    card.style.backgroundImage    = 'linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.20)), url("'+flatUrl+'")';
    card.style.backgroundRepeat   = 'no-repeat';
    card.style.backgroundSize     = '2000% 2000%';
    card.style.backgroundPosition = '100% -1200%';
    card.style.backgroundBlendMode = 'multiply';
    card.dataset.bgApplied = '1';
  }

  function tokenIdFromCard(card){
    // explicit data attr (present in your markup)
    var ds = card && card.dataset || {};
    if (ds.tokenId) return String(ds.tokenId).replace(/\D/g,'') || null;

    // fallback: from the <img class="thumb" src=".../1234.png">
    var img = card.querySelector('img.thumb');
    if (img){
      var m = (img.getAttribute('src')||'').match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }

    // fallback: from title text "Frog #1234"
    var t = (card.querySelector('.title') || card).textContent || '';
    var m2 = t.match(/#\s*(\d{1,6})/);
    return m2 ? m2[1] : null;
  }

  function thumbSizeFromCard(card){
    // try to respect current thumbnail size; default 128
    var img = card.querySelector('img.thumb');
    if (img){
      var r = img.getBoundingClientRect();
      if (r.width && r.height) return clamp(Math.round(Math.max(r.width, r.height)), 96, 160);
    }
    return 128;
  }

  function upgradeCard(card){
    if (!card || card.dataset.layered === '1') return false;

    var tokenId = tokenIdFromCard(card);
    if (!tokenId) return false;

    var size = thumbSizeFromCard(card);

    // Replace the <img.thumb> with layered container
    var img = card.querySelector('img.thumb');
    var host = img ? img.parentNode : card;
    var wrap = document.createElement('div');
    wrap.className = 'frog-layered-thumb';
    if (img){
      try { host.replaceChild(wrap, img); }
      catch(_) { host.insertBefore(wrap, img); img.style.display='none'; }
    } else {
      host.insertBefore(wrap, host.firstChild);
    }

    buildLayered(wrap, tokenId, size);
    darkenCardBackground(card, tokenId);
    card.dataset.layered = '1';
    return true;
  }

  function scan(root){
    var hits = 0;
    qsa('article.frog-card', root||document).forEach(function(card){
      if (upgradeCard(card)) hits++;
    });
    return hits;
  }

  // Mutation observer to catch dynamic inserts
  function observe(){
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(n){ if (n.nodeType===1) scan(n); });
        }
      });
    });
    mo.observe(document.body, { childList:true, subtree:true });
  }

  // kick once ready
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ scan(document); observe(); });
  } else {
    scan(document); observe();
  }
})();
