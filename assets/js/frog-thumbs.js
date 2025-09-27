// assets/js/frog-thumbs.js — layered thumbs + "color-only" backgrounds (thumb + card)
(function(){
  'use strict';

  // ---- paths ----
  const BASE = (window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const FLAT = (BASE ? BASE : '') + '/frog';
  const META = (BASE ? BASE : '') + '/frog/json';
  const LAYR = (BASE ? BASE : '') + '/frog/build_files';

  // ---- background recipe: use the flat image, but zoom & pin so only the color shows
  // These values hide the frog reliably on the flat PNGs.
  const BG_SIZE   = '8000% 8000%';
  const BG_POS    = '0% 0%';            // pin top-left color patch
  const BG_POS_ALT= '100% 100%';        // fallback if you prefer bottom-right

  const safe = s => encodeURIComponent(String(s||''));
  const NO_ANIM = new Set(['Hat','Frog','Trait']);
  const NO_LIFT = new Set(['Frog','Trait','SpecialFrog']);

  function makeLayer(attr, val, size){
    const img = new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute', left:0, top:0, width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:2, transition:'transform .28s cubic-bezier(.22,.61,.36,1)'
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

    // Thumb background = original flat, but zoomed/pinned so you only see the color
    Object.assign(container.style,{
      width:size+'px', height:size+'px', minWidth:size+'px', minHeight:size+'px',
      position:'relative', overflow:'hidden', borderRadius:'8px', imageRendering:'pixelated',
      backgroundImage: `url("${flat}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize:   BG_SIZE,
      backgroundPosition: BG_POS
    });

    // clear & build layers
    while (container.firstChild) container.removeChild(container.firstChild);
    try{
      const meta  = await (await fetch(`${META}/${id}.json`, {cache:'force-cache'})).json();
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const r of attrs){
        const a = String(r.trait_type || r.traitType || '').trim();
        const v = String(r.value).trim();
        if (a && v) container.appendChild(makeLayer(a, v, size));
      }
    }catch{
      const top = new Image(); top.decoding='async'; top.loading='lazy';
      Object.assign(top.style,{position:'absolute', inset:0, width:size+'px', height:size+'px', imageRendering:'pixelated', zIndex:2});
      top.src = flat; container.appendChild(top);
    }
  }

  function applyCardBackground(card, id){
    if (!card || card.dataset.bgApplied==='1') return;
    const flat = `${FLAT}/${id}.png`;
    // Card background = same “color-only” image, but 20% darker
    card.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.20)), url("${flat}")`;
    card.style.backgroundRepeat   = 'no-repeat';
    card.style.backgroundSize     = BG_SIZE;
    card.style.backgroundPosition = BG_POS;
    card.style.backgroundBlendMode= 'multiply';
    card.dataset.bgApplied = '1';
  }

  function tokenIdFromCard(card){
    if (card.dataset?.tokenId) return String(card.dataset.tokenId).replace(/\D/g,'');
    const m  = card.querySelector('img.thumb')?.src?.match(/\/(\d+)\.png(?:\?.*)?$/i);
    if (m) return m[1];
    const m2 = (card.querySelector('.title')?.textContent||'').match(/#\s*(\d{1,6})\b/);
    return m2 ? m2[1] : null;
  }

  function upgrade(card){
    if (!card || card.dataset.layered==='1') return false;

    const id = tokenIdFromCard(card);
    if (!id) return false;

    // Preserve original .thumb layout to avoid any spacing/shift
    const img = card.querySelector('img.thumb');
    let size = 128, display='inline-block', margin='', className='thumb';
    if (img){
      const cs = getComputedStyle(img);
      const w  = parseFloat(cs.width)||img.width||128;
      const h  = parseFloat(cs.height)||img.height||128;
      size     = Math.max(96, Math.round(Math.max(w, h)));
      display  = cs.display || 'inline-block';
      margin   = cs.margin  || '';
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
    applyCardBackground(card, id);

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
    // retries for late inserts
    let i=0, t=setInterval(()=>{ run(document); if (++i>=8) clearInterval(t); }, 400);
    // observe dynamic cards
    const mo = new MutationObserver(muts=>{
      for (const m of muts) for (const n of m.addedNodes||[]) if (n.nodeType===1) run(n);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='complete') start();
  else window.addEventListener('load', start);

})();
