// assets/js/frog-thumbs.js — DASHBOARD LAYERING (assertive)
(function(){
  'use strict';

  console.log('[frog-thumbs] loaded');

  // dashboard roots
  var ROOTS = ['#dashboardPanel','#ownedPanel','[data-panel="owned"]','.dashboard-owned','.owned-panel','.wallet-owned','.owned-grid','.owned-cards','.owned-list','.cards-owned','.my-frogs'];
  var SRC = (window.FF_CFG?.SOURCE_PATH || window.CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
  var FLAT   = (SRC?SRC:'') + '/frog';
  var META   = (SRC?SRC:'') + '/frog/json';
  var LAYERS = (SRC?SRC:'') + '/frog/build_files';

  function insideDash(n){ if(!n||n.nodeType!==1) return false; for (var i=0;i<ROOTS.length;i++) if (n.closest && n.closest(ROOTS[i])) return true; return false; }
  function qq(s,p){ return Array.from((p||document).querySelectorAll(s)); }
  function safe(s){ return encodeURIComponent(String(s)); }

  // builder
  var NO_ANIM_FOR=new Set(['Hat','Frog','Trait']), NO_LIFT_FOR=new Set(['Frog','Trait','SpecialFrog']);
  function makeLayerImg(attr,val,px){
    var allow=!NO_ANIM_FOR.has(attr);
    var base=LAYERS+'/'+safe(attr), png=base+'/'+safe(val)+'.png', gif=base+'/animations/'+safe(val)+'_animation.gif';
    var img=new Image(); img.decoding='async'; img.loading='lazy'; img.dataset.attr=attr;
    Object.assign(img.style,{position:'absolute',left:'0',top:'0',width:px+'px',height:px+'px',imageRendering:'pixelated',zIndex:'2',transition:'transform .28s cubic-bezier(.22,.61,.36,1)'});
    if(allow){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; } else { img.src=png; }
    if(!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter',()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave',()=>{ img.style.transform=''; img.style.filter=''; });
    }
    return img;
  }
  async function buildFrog128(container, id){
    const SIZE=128, flatUrl=`${FLAT}/${id}.png`;
    Object.assign(container.style,{width:SIZE+'px',height:SIZE+'px',minWidth:SIZE+'px',minHeight:SIZE+'px',position:'relative',overflow:'hidden',borderRadius:'8px',imageRendering:'pixelated',
      background:`url("${flatUrl}") no-repeat`,backgroundSize:'2000% 2000%',backgroundPosition:'100% -1200%'});
    while (container.firstChild) container.removeChild(container.firstChild);
    try{
      const meta = await (await fetch(`${META}/${id}.json`,{cache:'force-cache'})).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for(const r of attrs){
        const a=String(r.trait_type||r.traitType||'').trim(), v=String(r.value).trim();
        if(!a||!v) continue;
        container.appendChild(makeLayerImg(a,v,SIZE));
      }
    }catch{
      const img=new Image(); img.decoding='async'; img.loading='lazy'; Object.assign(img.style,{position:'absolute',inset:'0',width:SIZE+'px',height:SIZE+'px',imageRendering:'pixelated',zIndex:'2'});
      img.src=flatUrl; container.appendChild(img);
    }
    // darken card bg ~20%
    const card = container.closest('.card, .owned-card, .grid-item, .dashboard-card, .item, .tile, .module-card, .ff-card') || container.parentElement;
    if (card && !card.dataset.bgApplied) {
      card.style.backgroundImage = `linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2)), url("${flatUrl}")`;
      card.style.backgroundRepeat = 'no-repeat';
      card.style.backgroundSize = '2000% 2000%';
      card.style.backgroundPosition = '100% -1200%';
      card.style.backgroundBlendMode = 'multiply';
      card.dataset.bgApplied = '1';
    }
  }
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  function tokenIdFrom(node){
    if (!node || node.nodeType!==1) return null;
    // data-* on node/ancestors
    let p=node, hops=0;
    while(p && p.nodeType===1 && hops++<3){
      const d=p.dataset||{};
      const cand=d.tokenId||d.id||d.frogId||d.token||d.tokenid||d.frogid;
      if(cand) return String(cand).replace(/\D/g,'') || null;
      p=p.parentNode;
    }
    // <img src=".../1234.png">
    if (node.tagName==='IMG'){
      const m=(node.getAttribute('src')||'').match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }
    // background-image url(.../1234.png)
    const bg=getComputedStyle(node).backgroundImage;
    if (bg && bg!=='none'){
      const u=(bg.match(/url\(["']?([^"')]+)["']?\)/i)||[])[1]||'';
      const m=u.match(/\/(\d+)\.png(?:\?.*)?$/i);
      if (m) return m[1];
    }
    return null;
  }

  function upgradeNode(node){
    if (!insideDash(node)) return false;
    if (node.closest && node.closest('.frog-128-layered')) return true;

    // case A: <img>
    if (node.tagName==='IMG'){
      const id = tokenIdFrom(node); if (!id) return false;
      const wrap=document.createElement('div'); wrap.className='frog-128-layered';
      try{ node.parentNode.replaceChild(wrap,node); }catch{ node.parentNode.insertBefore(wrap,node); node.style.display='none'; }
      buildFrog128(wrap,id);
      console.log('[frog-thumbs] layered <img> token', id);
      return true;
    }

    // case B: tile with bg-image
    const id2 = tokenIdFrom(node);
    if (id2){
      // overlay a child container to render layers
      if (getComputedStyle(node).position==='static') node.style.position='relative';
      const wrap=document.createElement('div'); wrap.className='frog-128-layered';
      Object.assign(wrap.style,{position:'absolute',left:0,top:0,width:'128px',height:'128px'});
      node.appendChild(wrap);
      buildFrog128(wrap,id2);
      console.log('[frog-thumbs] layered tile token', id2);
      return true;
    }
    return false;
  }

  function scan(root){
    let hits=0;
    ROOTS.forEach(sel=>{
      qq(sel, root||document).forEach(scope=>{
        // imgs
        qq('img', scope).forEach(img=>{ if (upgradeNode(img)) hits++; });
        // tiles (divs with background-image)
        qq('.thumb, .tile, .card-thumb, .owned-thumb, .grid-item, .card', scope).forEach(div=>{
          const bg = getComputedStyle(div).backgroundImage;
          if (bg && bg!=='none') { if (upgradeNode(div)) hits++; }
        });
      });
    });
    if (hits) console.log('[frog-thumbs] upgraded nodes:', hits);
    return hits;
  }

  function observe(){
    const mo = new MutationObserver(muts=>{
      for (const m of muts){
        if (m.addedNodes) for (const n of m.addedNodes){ if (n.nodeType===1) scan(n); }
        if (m.type==='attributes' && (m.attributeName==='src' || m.attributeName==='style' || m.attributeName==='class' || m.attributeName?.startsWith('data-'))) scan(m.target);
      }
    });
    mo.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['src','style','class','data-token-id','data-id','data-token','data-frog-id']});
  }

  function kick(){ scan(document); observe(); setTimeout(()=>scan(document), 700); setTimeout(()=>scan(document), 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick);
  else kick();
})();
