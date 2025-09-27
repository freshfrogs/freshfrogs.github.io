// assets/js/frog-thumbs.js
// Render dashboard cards (<article.frog-card>) as layered frogs + darkened card bg.
(function(){
  'use strict';

  console.log('[frog-thumbs] init');

  // Absolute asset paths (works on freshfrogs.github.io)
  var BASE  = (window.CFG && window.CFG.SOURCE_PATH) ? String(window.CFG.SOURCE_PATH).replace(/\/+$/,'') : '';
  var FLAT  = (BASE ? BASE : '') + '/frog';
  var META  = (BASE ? BASE : '') + '/frog/json';
  var LAYER = (BASE ? BASE : '') + '/frog/build_files';

  // Small helpers
  var $$ = (s, r) => Array.from((r||document).querySelectorAll(s));
  var safe = s => encodeURIComponent(String(s||''));
  var once = (el, k) => (el.dataset[k]==='1') ? true : (el.dataset[k]='1', false);

  // Build one layer image
  var NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  var NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
  function makeLayer(attr, val, size){
    var allow = !NO_ANIM_FOR.has(attr);
    var base  = LAYER + '/' + safe(attr);
    var png   = base + '/' + safe(val) + '.png';
    var gif   = base + '/animations/' + safe(val) + '_animation.gif';
    var img   = new Image();
    img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0',
      width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });
    if (allow){ img.src=gif; img.onerror=function(){ img.onerror=null; img.src=png; }; }
    else img.src=png;

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform=''; img.style.filter=''; });
    }
    return img;
  }

  async function buildLayered(container, tokenId, size){
    var flatUrl = FLAT + '/' + tokenId + '.png';
    Object.assign(container.style,{
      width:size+'px', height:size+'px', minWidth:size+'px', minHeight:size+'px',
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated',
      backgroundImage:'url("'+flatUrl+'")', backgroundRepeat:'no-repeat',
      backgroundSize:'2000% 2000%', backgroundPosition:'100% -1200%'
    });
    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      var meta = await (await fetch(META + '/' + tokenId + '.json', {cache:'force-cache'})).json();
      var attrs = Array.isArray(meta && meta.attributes) ? meta.attributes : [];
      attrs.forEach(function(row){
        var a = String(row.trait_type || row.traitType || '').trim();
        var v = String(row.value).trim();
        if (a && v) container.appendChild(makeLayer(a, v, size));
      });
    }catch{
      // Fallback to flat on top
      var img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{position:'absolute', inset:'0', width:size+'px', height:size+'px', imageRendering:'pixelated', zIndex:'2'});
      img.src = flatUrl; container.appendChild(img);
    }
  }

  function tokenIdFromCard(card){
    // 1) data-token-id (present in your markup)
    var ds = card.dataset || {};
    if (ds.tokenId) return String(ds.tokenId).replace(/\D/g,'') || null;

    // 2) fall back to <img.thumb src=".../1234.png">
    var img = card.querySelector('img.thumb');
    if (img){
      var m = (img.getAttribute('src')||'').match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }
    // 3) title text "Frog #1234"
    var t = (card.querySelector('.title') || card).textContent || '';
    var m2 = t.match(/#\s*(\d{1,6})\b/);
    return m2 ? m2[1] : null;
  }

  function thumbSize(card){
    var img = card.querySelector('img.thumb');
    if (img){
      var r = img.getBoundingClientRect();
      var s = Math.round(Math.max(r.width||0, r.height||0));
      if (s >= 96 && s <= 256) return s;
    }
    return 128;
  }

  function darkenCard(card, tokenId){
    if (!card || once(card,'bgApplied')) return;
    var flatUrl = FLAT + '/' + tokenId + '.png';
    card.style.backgroundImage    = 'linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.20)), url("'+flatUrl+'")';
    card.style.backgroundRepeat   = 'no-repeat';
    card.style.backgroundSize     = '2000% 2000%';
    card.style.backgroundPosition = '100% -1200%';
    card.style.backgroundBlendMode = 'multiply';
  }

  function layerCard(card){
    if (!card || once(card,'layered')) return false;

    var id = tokenIdFromCard(card);
    if (!id){ console.warn('[frog-thumbs] no token id in card', card); return false; }

    var size = thumbSize(card);
    var img  = card.querySelector('img.thumb');
    var host = img ? img.parentNode : card;

    var wrap = document.createElement('div');
    wrap.className = 'frog-layered-thumb';
    if (img){
      try { host.replaceChild(wrap, img); }
      catch(_) { host.insertBefore(wrap, img); img.style.display='none'; }
    }else{
      host.insertBefore(wrap, host.firstChild);
    }

    buildLayered(wrap, id, size);
    darkenCard(card, id);
    console.log('[frog-thumbs] layered #'+id);
    return true;
  }

  function scan(root){
    var hits = 0;
    ($$('article.frog-card', root||document) || []).forEach(function(card){
      if (layerCard(card)) hits++;
    });
    if (hits) console.log('[frog-thumbs] upgraded', hits, 'card(s)');
    return hits;
  }

  function observe(){
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        if (m.addedNodes) m.addedNodes.forEach(function(n){ if (n.nodeType===1) scan(n); });
      });
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  // run late + with retries to catch dynamic renders
  function kick(){
    scan(document);
    observe();
    var tries = 0, t = setInterval(function(){
      tries++;
      var added = scan(document);
      if (tries > 10 || added === 0) clearInterval(t);
    }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick);
  else kick();
})();
