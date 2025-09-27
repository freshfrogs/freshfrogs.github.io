// assets/js/frog-thumbs.js — dashboard frogs layered + "color-only" backgrounds
(function(){
  'use strict';

  const BASE = (window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const FLAT = (BASE ? BASE : '') + '/frog';
  const META = (BASE ? BASE : '') + '/frog/json';
  const LAYR = (BASE ? BASE : '') + '/frog/build_files';
  const safe = s => encodeURIComponent(String(s||''));
  const NO_ANIM = new Set(['Hat','Frog','Trait']);
  const NO_LIFT = new Set(['Frog','Trait','SpecialFrog']);

  // >>> New: zoom/pin so ONLY the flat background color is visible
  const COLOR_ONLY_BG_SIZE = '10000% 10000%';   // very large zoom
  const COLOR_ONLY_BG_POS  = '0% 0%';           // pin to a solid corner (top-left)

  function makeLayer(a,v,size){
    const img=new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute',left:0,top:0,width:size+'px',height:size+'px',
      imageRendering:'pixelated',zIndex:2,transition:'transform .28s cubic-bezier(.22,.61,.36,1)'
    });
    const base=`${LAYR}/${safe(a)}`, png=`${base}/${safe(v)}.png`, gif=`${base}/animations/${safe(v)}_animation.gif`;
    if (!NO_ANIM.has(a)){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; } else { img.src=png; }
    if (!NO_LIFT.has(a)){
      img.addEventListener('mouseenter',()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave',()=>{ img.style.transform=''; img.style.filter=''; });
    }
    return img;
  }

  async function build(container, id, size){
    const flat=`${FLAT}/${id}.png`;
    // >>> Changed: force color-only background for the thumb container
    Object.assign(container.style,{
      width:size+'px',height:size+'px',minWidth:size+'px',minHeight:size+'px',
      position:'relative',overflow:'hidden',borderRadius:'8px',imageRendering:'pixelated',
      backgroundImage:`url("${flat}")`,
      backgroundRepeat:'no-repeat',
      backgroundSize:COLOR_ONLY_BG_SIZE,
      backgroundPosition:COLOR_ONLY_BG_POS
    });
    while (container.firstChild) container.removeChild(container.firstChild);
    try{
      const meta = await (await fetch(`${META}/${id}.json`,{cache:'force-cache'})).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for (const r of attrs){
        const a=String(r.trait_type||r.traitType||'').trim(), v=String(r.value).trim();
        if (a && v) container.appendChild(makeLayer(a,v,size));
      }
    }catch{
      const top=new Image(); top.decoding='async'; top.loading='lazy';
      Object.assign(top.style,{position:'absolute',inset:0,width:size+'px',height:size+'px',imageRendering:'pixelated',zIndex:2});
      top.src=flat; container.appendChild(top);
    }
  }

  function darken(card, id){
    const flat=`${FLAT}/${id}.png`;
    // >>> Changed: card uses the SAME color-only recipe, plus ~20% darken
    card.style.backgroundImage = `linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.20)), url("${flat}")`;
    card.style.backgroundRepeat = 'no-repeat';
    card.style.backgroundSize = COLOR_ONLY_BG_SIZE;
    card.style.backgroundPosition = COLOR_ONLY_BG_POS;
    card.style.backgroundBlendMode = 'multiply';
  }

  function tokenId(card){
    if (card.dataset?.tokenId) return String(card.dataset.tokenId).replace(/\D/g,'');
    const m = card.querySelector('img.thumb')?.src?.match(/\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    const m2 = (card.querySelector('.title')?.textContent||'').match(/#\s*(\d{1,6})\b/);
    return m2 ? m2[1] : null;
  }

  function upgrade(card){
    if (!card || card.dataset.layered==='1') return false;
    const id = tokenId(card); if (!id) return false;

    // Preserve original .thumb layout so no extra spacing
    const img = card.querySelector('img.thumb');
    const host = img ? img.parentNode : card;
    const size = img ? Math.max(128, Math.round(Math.max(img.width||0, img.height||0))) : 128;

    const wrap = document.createElement('div');
    // >>> Keep the original .thumb class to inherit existing layout styles
    wrap.className = (img && img.className ? img.className + ' ' : '') + 'frog-layered-thumb';

    // Copy basic box metrics from the old <img> so the layout stays identical
    if (img){
      const cs = getComputedStyle(img);
      wrap.style.display = cs.display || 'inline-block';
      wrap.style.margin  = cs.margin  || '';
      wrap.style.width   = (parseFloat(cs.width)||img.width||size) + 'px';
      wrap.style.height  = (parseFloat(cs.height)||img.height||size) + 'px';
    } else {
      wrap.style.width = wrap.style.height = size + 'px';
      wrap.style.display = 'inline-block';
    }

    if (img){ try{ host.replaceChild(wrap,img); }catch{ host.insertBefore(wrap,img); img.style.display='none'; } }
    else { host.insertBefore(wrap, host.firstChild); }

    build(wrap, id, size);
    darken(card, id);
    card.dataset.layered='1';
    return true;
  }

  function run(root){
    let hits=0;
    document.querySelectorAll('article.frog-card').forEach(card=>{ if (upgrade(card)) hits++; });
    if (hits) console.log('[frog-thumbs] upgraded', hits, 'card(s)');
  }

  function kick(){
    run(document);
    // retries for late renders
    let i=0, t=setInterval(()=>{ run(document); if (++i>=6) clearInterval(t); }, 500);
    // observe dynamic inserts
    const mo = new MutationObserver(muts=>{
      for (const m of muts) for (const n of m.addedNodes||[]) if (n.nodeType===1) run(n);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='complete') kick();
  else window.addEventListener('load', kick);
})();
