<<<<<<< HEAD
// assets/js/frog-thumbs.js — Stable: layered thumbs ON, cards transparent, no extras
=======
// assets/js/frog-thumbs.js — Layered thumbs ON, card background transparent
>>>>>>> parent of 41113a01a (Working backup)
(function(){
  'use strict';
  const BASE=(window.CFG?.SOURCE_PATH||'').replace(/\/+$/,'');
  const FLAT=(BASE?BASE:'')+'/frog';
  const META=(BASE?BASE:'')+'/frog/json';
  const LAYR=(BASE?BASE:'')+'/frog/build_files';
  const NO_ANIM=new Set(['Hat','Frog','Trait']);
  const NO_LIFT=new Set(['Frog','Trait','SpecialFrog']);
  const COLOR_BG_SIZE='10000% 10000%';
  const COLOR_BG_POS='0% 0%';
  const safe=s=>encodeURIComponent(String(s||''));
  const qsa=(s,r)=>Array.from((r||document).querySelectorAll(s));

<<<<<<< HEAD
  function makeLayer(attr,val,size){
    const img=new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{position:'absolute',left:0,top:0,width:size+'px',height:size+'px',imageRendering:'pixelated',zIndex:2,transition:'transform .28s cubic-bezier(.22,.61,.36,1)'});
    const base=`${LAYR}/${safe(attr)}`, png=`${base}/${safe(val)}.png`, gif=`${base}/animations/${safe(val)}_animation.gif`;
    if(!NO_ANIM.has(attr)){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; } else { img.src=png; }
    if(!NO_LIFT.has(attr)){
      img.addEventListener('mouseenter',()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave',()=>{ img.style.transform=''; img.style.filter=''; });
=======
  const BASE = (window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  const FLAT = (BASE ? BASE : '') + '/frog';
  const META = (BASE ? BASE : '') + '/frog/json';
  const LAYR = (BASE ? BASE : '') + '/frog/build_files';

  const NO_ANIM = new Set(['Hat','Frog','Trait']);
  const NO_LIFT = new Set(['Frog','Trait','SpecialFrog']);

  // Show only the flat PNG's solid color behind the layers
  const COLOR_ONLY_BG_SIZE = '10000% 10000%';
  const COLOR_ONLY_BG_POS  = '0% 0%';

  const qsa = (s,r)=>Array.from((r||document).querySelectorAll(s));
  const safe = s => encodeURIComponent(String(s||''));

  function ensureCardTransparent(card){
    // Always keep cards transparent (undo any previous styles/classes)
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

  function makeLayer(attr, val, size){
    const img = new Image(); img.decoding='async'; img.loading='lazy';
    Object.assign(img.style,{
      position:'absolute', left:0, top:0, width:size+'px', height:size+'px',
      imageRendering:'pixelated', zIndex:2, transition:'transform .28s cubic-bezier(.22,.61,.36,1)'
    });
    const base = `${LAYR}/${safe(attr)}`;
    const png  = `${base}/${safe(val)}.png`;
    const gif  = `${base}/animations/${safe(val)}_animation.gif`;
    if (!NO_ANIM.has(attr)){ img.src = gif; img.onerror = ()=>{ img.onerror=null; img.src=png; }; }
    else { img.src = png; }
    if (!NO_LIFT.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform=''; img.style.filter=''; });
>>>>>>> parent of 41113a01a (Working backup)
    }
    return img;
  }

<<<<<<< HEAD
  async function build(container,id,size){
    const flat=`${FLAT}/${id}.png`;
=======
  async function buildThumb(container, tokenId, size){
    const flat = `${FLAT}/${tokenId}.png`;

    // backdrop = color-only from the flat image
>>>>>>> parent of 41113a01a (Working backup)
    Object.assign(container.style,{
      width:size+'px',height:size+'px',minWidth:size+'px',minHeight:size+'px',
      position:'relative',overflow:'hidden',borderRadius:'8px',imageRendering:'pixelated',
      backgroundImage:`url("${flat}")`,backgroundRepeat:'no-repeat',
      backgroundSize:COLOR_BG_SIZE,backgroundPosition:COLOR_BG_POS
    });
<<<<<<< HEAD
    while(container.firstChild) container.removeChild(container.firstChild);
    try{
      const r=await fetch(`${META}/${id}.json`,{cache:'force-cache'}); if(!r.ok) throw 0;
      const meta=await r.json(); const attrs=Array.isArray(meta?.attributes)?meta.attributes:[];
      for(const a of attrs){ const k=String(a.trait_type||a.traitType||'').trim(); const v=String(a.value||'').trim(); if(k&&v) container.appendChild(makeLayer(k,v,size)); }
    }catch{
      const top=new Image(); top.decoding='async'; top.loading='lazy';
      Object.assign(top.style,{position:'absolute',inset:0,width:size+'px',height:size+'px',imageRendering:'pixelated',zIndex:2});
      top.src=flat; container.appendChild(top);
=======

    // clear and layer attributes
    while (container.firstChild) container.removeChild(container.firstChild);

    try{
      const res  = await fetch(`${META}/${tokenId}.json`, {cache:'force-cache'});
      if (!res.ok) throw new Error('meta '+res.status);
      const meta = await res.json();
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const row of attrs){
        const attr = String(row.trait_type || row.traitType || '').trim();
        const val  = String(row.value).trim();
        if (attr && val) container.appendChild(makeLayer(attr, val, size));
      }
      // success
    }catch(e){
      // fallback to the flat so users see *something*
      const img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{position:'absolute', inset:0, width:size+'px', height:size+'px', imageRendering:'pixelated', zIndex:2});
      img.src = flat; container.appendChild(img);
      console.warn('[frog-thumbs] meta/layers failed for #'+tokenId, e);
>>>>>>> parent of 41113a01a (Working backup)
    }
  }

  function tokenIdFrom(card){
    if(card.dataset?.tokenId) return String(card.dataset.tokenId).replace(/\D/g,'');
    const s=card.querySelector('img.thumb')?.getAttribute('src')||'';
    const m=s.match(/\/(\d+)\.png(?:\?.*)?$/i); if(m) return m[1];
    const t=(card.querySelector('.title')?.textContent||''); const m2=t.match(/#\s*(\d{1,6})\b/);
    return m2?m2[1]:null;
  }

  function ensureCardTransparent(card){
    if(!card) return;
    card.classList.remove('ff-card-bg');
    card.style.setProperty('background','transparent');
    ['--ff-card-bg-url','--ff-card-bg-size','--ff-card-bg-pos','--ff-card-bg-darken',
     'background-image','background-repeat','background-size','background-position','background-blend-mode'
    ].forEach(p=>card.style.removeProperty(p));
  }

  function upgrade(card){
    ensureCardTransparent(card);
<<<<<<< HEAD
    if(card.dataset.layered==='1') return false;
    const id=tokenIdFrom(card); if(!id) return false;
    const img=card.querySelector('img.thumb'); const host=img?img.parentNode:card;
    let size=128;
    const wrap=document.createElement('div');
    wrap.className=(img&&img.className?img.className+' ':'')+'frog-layered-thumb';
    if(img){
      const cs=getComputedStyle(img);
      const w=parseFloat(cs.width)||img.width||128;
      const h=parseFloat(cs.height)||img.height||128;
      size=Math.max(96,Math.round(Math.max(w,h)));
      wrap.style.display=cs.display||'inline-block'; wrap.style.margin=cs.margin||'';
      wrap.style.width=w+'px'; wrap.style.height=h+'px';
      try{ host.replaceChild(wrap,img); }catch{ host.insertBefore(wrap,img); img.style.display='none'; }
    }else{
      wrap.style.width=wrap.style.height=size+'px'; wrap.style.display='inline-block';
      host.insertBefore(wrap,host.firstChild);
    }
    build(wrap,id,size);
    card.dataset.layered='1';
=======
    if (!card || card.dataset.layered === '1') return false;

    const id = tokenIdFromCard(card);
    if (!id){ console.warn('[frog-thumbs] no token id in card', card); return false; }

    const img  = card.querySelector('img.thumb');
    const host = img ? img.parentNode : card;

    // keep layout by copying size/margins/display from the original <img.thumb>
    let size = 128;
    const wrap = document.createElement('div');
    wrap.className = (img && img.className ? img.className + ' ' : '') + 'frog-layered-thumb';

    if (img){
      const cs = getComputedStyle(img);
      const w = parseFloat(cs.width)  || img.width  || 128;
      const h = parseFloat(cs.height) || img.height || 128;
      size = Math.max(96, Math.round(Math.max(w, h)));
      wrap.style.display = cs.display || 'inline-block';
      wrap.style.margin  = cs.margin  || '';
      wrap.style.width   = w + 'px';
      wrap.style.height  = h + 'px';
      try { host.replaceChild(wrap, img); } catch { host.insertBefore(wrap, img); img.style.display='none'; }
    } else {
      wrap.style.width = wrap.style.height = size + 'px';
      wrap.style.display = 'inline-block';
      host.insertBefore(wrap, host.firstChild);
    }

    // build layered thumb
    buildThumb(wrap, id, size);
    card.dataset.layered = '1';
    console.log('[frog-thumbs] layered #'+id);
>>>>>>> parent of 41113a01a (Working backup)
    return true;
  }

  function run(root){
    let hits=0; qsa('article.frog-card',root||document).forEach(c=>{ if(upgrade(c)) hits++; else ensureCardTransparent(c); });
    if(hits) console.log('[frog-thumbs] upgraded',hits,'card(s)');
  }

  function start(){
    run(document);
    let i=0,t=setInterval(()=>{ run(document); if(++i>=8) clearInterval(t); },400);
    const mo=new MutationObserver(m=>{ for(const x of m) for(const n of x.addedNodes||[]) if(n.nodeType===1) run(n); });
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='complete') start(); else window.addEventListener('load', start);
})();
