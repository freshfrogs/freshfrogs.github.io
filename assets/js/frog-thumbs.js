// assets/js/frog-thumbs.js — dashboard frogs layered + correct stretched card background, no extra spacing
(function(){
  'use strict';

  const BASE = (window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const FLAT = (BASE ? BASE : '') + '/frog';
  const META = (BASE ? BASE : '') + '/frog/json';
  const LAYR = (BASE ? BASE : '') + '/frog/build_files';

  const safe = s => encodeURIComponent(String(s||''));
  const NO_ANIM = new Set(['Hat','Frog','Trait']);
  const NO_LIFT = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayer(attr, val, size){
    const img = new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute', left:0, top:0,
      width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:2,
      transition:'transform .28s cubic-bezier(.22,.61,.36,1)'
    });
    const base = `${LAYR}/${safe(attr)}`;
    const png  = `${base}/${safe(val)}.png`;
    const gif  = `${base}/animations/${safe(val)}_animation.gif`;
    if (!NO_ANIM.has(attr)){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; }
    else { img.src=png; }
    if (!NO_LIFT.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform=''; img.style.filter=''; });
    }
    return img;
  }

  async function build(container, id, size){
    const flat = `${FLAT}/${id}.png`;
    Object.assign(container.style,{
      width:size+'px', height:size+'px',
      minWidth:size+'px', minHeight:size+'px',
      position:'relative', overflow:'hidden',
      borderRadius:'8px', imageRendering:'pixelated',
      background:`url("${flat}") no-repeat`,
      backgroundSize:'2000% 2000%',
      backgroundPosition:'100% -1200%'
    });
    while (container.firstChild) container.removeChild(container.firstChild);
    try{
      const meta = await (await fetch(`${META}/${id}.json`,{cache:'force-cache'})).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for (const r of attrs){
        const a = String(r.trait_type||r.traitType||'').trim();
        const v = String(r.value).trim();
        if (a && v) container.appendChild(makeLayer(a,v,size));
      }
    }catch{
      const top=new Image(); top.decoding='async'; top.loading='lazy';
      Object.assign(top.style,{position:'absolute',inset:0,width:size+'px',height:size+'px',imageRendering:'pixelated',zIndex:2});
      top.src = flat; container.appendChild(top);
    }
  }

  function darkenCardBackground(card, id){
    // use the stretched/shifted flat frog as the card background + ~20% darken
    const flat = `${FLAT}/${id}.png`;
    card.style.backgroundImage    = `linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.20)), url("${flat}")`;
    card.style.backgroundRepeat   = 'no-repeat';
    card.style.backgroundSize     = '2000% 2000%';
    card.style.backgroundPosition = '100% -1200%';
    card.style.backgroundBlendMode = 'multiply';
  }

  function tokenIdFromCard(card){
    if (card.dataset?.tokenId) return String(card.dataset.tokenId).replace(/\D/g,'');
    const m  = card.querySelector('img.thumb')?.src?.match(/\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    const m2 = (card.querySelector('.title')?.textContent||'').match(/#\s*(\d{1,6})\b/);
    return m2 ? m[1] : null;
  }

  function upgrade(card){
    if (!card || card.dataset.layered==='1') return false;

    const id = tokenIdFromCard(card);
    if (!id) return false;

    // keep layout: preserve the original <img.thumb>'s computed size, display, and margins
    const img = card.querySelector('img.thumb');
    let size = 128, display='inline-block', margin='', className='thumb';
    if (img){
      const cs = getComputedStyle(img);
      const w = parseFloat(cs.width)||img.width||128;
      const h = parseFloat(cs.height)||img.height||128;
      size = Math.max(96, Math.round(Math.max(w,h)));
      display = cs.display || 'inline-block';
      margin  = cs.margin || '';
      className = (img.className ? img.className + ' ' : '') + 'frog-layered-thumb';
    } else {
      className = 'thumb frog-layered-thumb';
    }

    const host = img ? img.parentNode : card;
    const wrap = document.createElement('div');
    wrap.className = className;
    Object.assign(wrap.style, { width:size+'px', height:size+'px', display, margin });

    if (img){
      try { host.replaceChild(wrap, img); }
      catch { host.insertBefore(wrap, img); img.style.display='none'; }
    } else {
      host.insertBefore(wrap, host.firstChild);
    }

    build(wrap, id, size);
    darkenCardBackground(card, id);

    card.dataset.layered='1';
    return true;
  }

  function run(root){
    let hits=0;
    (root||document).querySelectorAll('article.frog-card').forEach(c=>{ if (upgrade(c)) hits++; });
    if (hits) console.log('[frog-thumbs] upgraded', hits, 'card(s)');
  }

  function start(){
    run(document);
    // retry a few times for late inserts
    let i=0, t=setInterval(()=>{ run(document); if (++i>=8) clearInterval(t); }, 400);
    // observe new cards
    const mo = new MutationObserver(muts=>{
      for (const m of muts) for (const n of m.addedNodes||[]) if (n.nodeType===1) run(n);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='complete') start();
  else window.addEventListener('load', start);
})();
