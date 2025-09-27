// assets/js/frog-thumbs.js — Layered thumbs ON, card background transparent
(function(){
  'use strict';

  // NEW: be tolerant of either FF_CFG or CFG
  const CFGLIKE = (window.FF_CFG || window.CFG || {});
  const BASE = (CFLIKE.SOURCE_PATH || '').replace(/\/+$/,'');
  const FLAT = (BASE ? BASE : '') + '/frog';
  const META = (BASE ? BASE : '') + '/frog/json';
  const LAYR = (BASE ? BASE : '') + '/frog/build_files';

  const NO_ANIM = new Set(['Hat','Frog','Trait']);
  const NO_LIFT = new Set(['Frog','Trait','SpecialFrog']);

  // Show only the flat PNG's solid color behind the layers
  const COLOR_ONLY_BG_SIZE = '10000% 10000%';
  const COLOR_ONLY_BG_POS  = '0% 0%';

  function ensureCardTransparent(card){
    // remove any prior background (keep your site styles/classes)
    card?.classList.remove('ff-card-bg');
    card?.style.removeProperty('--ff-card-bg-url');
    card?.style.removeProperty('--ff-card-bg-size');
    card?.style.removeProperty('--ff-card-bg-pos');
    card?.style.removeProperty('--ff-card-bg-darken');
    card?.style.setProperty('background', 'transparent');
    card?.style.removeProperty('background-image');
    card?.style.removeProperty('background-repeat');
    card?.style.removeProperty('background-size');
    card?.style.removeProperty('background-position');
    card?.style.removeProperty('background-blend-mode');
  }

  function safe(s){ return String(s||'').replace(/[^\w\- ]+/g,'').replace(/\s+/g,'_'); }

  function makeLayer(attr, val, size){
    const img = new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute', inset:0, width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:2, transition:'transform .12s ease'
    });
    const base = `${LAYR}/${safe(attr)}`;
    const png  = `${base}/${safe(val)}.png`;
    const gif  = `${base}/animations/${safe(val)}_animation.gif`;
    // Prefer animation if present
    img.src = gif;
    img.onerror = ()=>{ img.onerror=null; img.src=png; };
    if (!NO_LIFT.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translateY(-3px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform=''; img.style.filter=''; });
    }
    return img;
  }

  async function buildThumb(container, tokenId, size){
    const flat = `${FLAT}/${tokenId}.png`;
    Object.assign(container.style,{
      width:size+'px', height:size+'px', minWidth:size+'px', minHeight:size+'px',
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated',
      backgroundImage: `url("${flat}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize:   COLOR_ONLY_BG_SIZE,
      backgroundPosition: COLOR_ONLY_BG_POS
    });
    while (container.firstChild) container.removeChild(container.firstChild);

    // Load JSON and layer attributes
    const metaUrl = `${META}/${tokenId}.json`;
    try{
      const r = await fetch(metaUrl);
      const j = r.ok ? await r.json() : null;
      const attrs = Array.isArray(j?.attributes) ? j.attributes : [];
      const size = Math.max(64, Math.min(256, container.clientWidth || 128));
      for (const row of attrs){
        const attr = String(row.trait_type || row.key || '').trim();
        const val  = String(row.value || row.trait_value || '').trim();
        if (attr && val) container.appendChild(makeLayer(attr, val, size));
      }
    }catch(e){
      const img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{position:'absolute', inset:0, width:'100%', height:'100%', imageRendering:'pixelated', zIndex:2});
      img.src = flat; container.appendChild(img);
      console.warn('[frog-thumbs] meta/layers failed for #'+tokenId, e);
    }
  }

  function tokenIdFromCard(card){
    if (card.dataset?.tokenId) return String(card.dataset.tokenId).replace(/\D/g,'');
    const src = card.querySelector('img.thumb')?.getAttribute('src') || '';
    const m   = src.match(/\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    const t = (card.querySelector('.title')?.textContent||'');
    const m2= t.match(/#\s*(\d{1,6})\b/);
    return m2 ? m2[1] : null;
  }

  function upgradeCard(card){
    ensureCardTransparent(card);
    if (!card || card.dataset.layered === '1') return false;
    const id = tokenIdFromCard(card);
    if (!id){ console.warn('[frog-thumbs] no token id in card', card); return false; }
    const img  = card.querySelector('img.thumb');
    const host = img ? img.parentNode : card;

    // keep layout
    let size = 128;
    const wrap = document.createElement('div');
    wrap.className = (img && img.className ? img.className + ' ' : '') + 'frog-layered-thumb';

    if (img){
      const cs = getComputedStyle(img);
      size = Math.max(64, parseInt(cs.width) || parseInt(img.getAttribute('width')) || 128);
      wrap.style.cssText = cs.cssText || '';
      img.replaceWith(wrap);
    } else { host.prepend(wrap); }

    buildThumb(wrap, id, size);
    card.dataset.layered = '1';
    return true;
  }

  function scan(root){
    const cards = root.querySelectorAll('.frog-card');
    for (const c of cards) upgradeCard(c);
  }

  function start(){
    scan(document);
    let i = 0, t = setInterval(()=>{ scan(document); if (++i >= 8) clearInterval(t); }, 400);
    const mo = new MutationObserver(muts=>{
      for (const m of muts) for (const n of m.addedNodes||[]) if (n.nodeType===1) scan(n);
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
