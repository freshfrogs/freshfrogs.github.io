// assets/js/mutate.js
// Mutate page: 256px crisp preview, centered layout, buttons under image,
// info to the right, partner frog must have rank >= 2000.

(function (FF, CFG) {
  'use strict';

  const SIZE = 256;
  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const ROOT  = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANK_LOOKUP_URL = 'assets/freshfrogs_rank_lookup.json';

  // Background treatment: draw the original still, zoomed and pushed right
  const BG_SCALE = 36;   // 3600%
  const BG_SHIFT = 26;   // 2600%

  const $ = (s, r=document)=> r.querySelector(s);

  // DOM (matches mutate.html you've been using)
  const wrap  = $('#mutateCenter') || document.body; // just to ensure page exists
  const card  = $('#mutateCard')   || $('.frog-card.mutate') || document.body;
  // left side
  const thumb = $('#mutateThumb')  || (function(){
    // create one if missing; expect markup like:
    // <article class="frog-card mutate" id="mutateCard">
    //   <div class="mut-left"><img id="mutateThumb">...</div><div class="mut-right">...</div>
    const left = $('.mut-left') || (function(){
      const d=document.createElement('div'); d.className='mut-left';
      card.prepend(d); return d;
    })();
    const img=document.createElement('img'); img.id='mutateThumb'; img.className='thumb';
    left.prepend(img);
    return img;
  })();
  const btnRefresh = $('#btnRefresh');
  const btnMutate  = $('#btnMutate');
  // right side
  const title = $('#mutateTitle') || $('#mutTitle') || (function(){
    const d=$('.mut-right') || (function(){ const x=document.createElement('div'); x.className='mut-right'; card.appendChild(x); return x; })();
    const h=document.createElement('h4'); h.id='mutateTitle'; h.className='title'; d.appendChild(h); return h;
  })();
  const meta  = $('#mutateMeta') || $('#mutMeta') || (function(){ const h=document.createElement('div'); h.id='mutateMeta'; h.className='meta'; title.parentNode.appendChild(h); return h; })();
  const attrs = $('#mutateAttrs') || $('#mutAttrs') || (function(){ const u=document.createElement('ul'); u.id='mutateAttrs'; u.className='attr-bullets'; meta.parentNode.appendChild(u); return u; })();

  const imgFor  = id => `${ROOT}/frog/${id}.png`;
  const jsonFor = id => `${ROOT}/frog/json/${id}.json`;

  // ------- Ranks (lookup: { "1": 1234, ... }) -------
  let RANKS=null;
  async function ensureRanks(){
    if (RANKS) return RANKS;
    try{ const r=await fetch(`${ROOT}/${RANK_LOOKUP_URL}`); RANKS=await r.json(); }
    catch{ RANKS={}; }
    return RANKS;
  }

  // partner with rank >= minRank (less rare)
  async function pickPartnerId(minRank=2000){
    const ranks = await ensureRanks();
    const ok = Object.entries(ranks)
      .filter(([_,rk]) => Number(rk) >= minRank)
      .map(([id]) => Number(id))
      .filter(n => Number.isFinite(n) && n>=1 && n<=TOTAL);
    if (!ok.length){ // fallback: random
      return 1 + Math.floor(Math.random()*TOTAL);
    }
    return ok[Math.floor(Math.random()*ok.length)];
  }

  // ------- Helpers -------
  function loadImage(src){
    return new Promise(res=>{
      const im=new Image(); im.crossOrigin='anonymous'; im.decoding='async';
      im.onload=()=>res(im); im.onerror=()=>res(im); im.src=src;
    });
  }

  function drawShiftedBackground(ctx, baseImg){
    // zoom base still and push to right/down so we only see flat color
    const dw = SIZE*BG_SCALE, dh = SIZE*BG_SCALE;
    const dx = -dw + BG_SHIFT*SIZE;
    const dy = -dh + BG_SHIFT*SIZE;
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseImg, dx, dy, dw, dh);
  }

  async function drawTrait(ctx, trait, attr){
    if(!attr) return;
    const im = await loadImage(`${ROOT}/frog/build_files/${trait}/${attr}.png`);
    ctx.drawImage(im, 0, 0, SIZE, SIZE);
  }

  async function composeToDataURL(baseId, C){
    const base = await loadImage(imgFor(baseId));
    const cnv=document.createElement('canvas'); cnv.width=SIZE; cnv.height=SIZE;
    const ctx = cnv.getContext('2d', { willReadFrequently:true });
    ctx.imageSmoothingEnabled=false;

    drawShiftedBackground(ctx, base);
    if (C.Frog) await drawTrait(ctx,'Frog',C.Frog); else if (C.SpecialFrog) await drawTrait(ctx,'SpecialFrog',C.SpecialFrog);
    if (C.Subset) await drawTrait(ctx,'Frog/subset',C.Subset);
    if (C.Trait) await drawTrait(ctx,'Trait',C.Trait);
    if (C.Accessory) await drawTrait(ctx,'Accessory',C.Accessory);
    if (C.Eyes) await drawTrait(ctx,'Eyes',C.Eyes);
    if (C.Hat) await drawTrait(ctx,'Hat',C.Hat);
    if (C.Mouth) await drawTrait(ctx,'Mouth',C.Mouth);

    return cnv.toDataURL('image/png');
  }

  function setAttrs(list){
    attrs.innerHTML='';
    (list||[]).forEach(a=>{
      const k=a?.trait_type||a?.key; if(!k) return;
      const v=a?.value||a?.trait_value||'';
      const li=document.createElement('li'); li.innerHTML=`<b>${k}:</b> ${String(v)}`;
      attrs.appendChild(li);
    });
  }

  // ------- Mutation logic (your rules, condensed to match previous flow) -------
  function buildMetadataC(A,B){
    const C={Frog:"",SpecialFrog:"",Subset:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};

    if (A.SpecialFrog || B.SpecialFrog){
      if (A.SpecialFrog && B.SpecialFrog){
        B.SpecialFrog = A.SpecialFrog + '/SpecialFrog/' + B.SpecialFrog; B.Trait='';
      } else if (B.Frog){
        B.Trait = 'SpecialFrog/' + A.SpecialFrog + '/' + B.Trait;
        B.SpecialFrog = A.SpecialFrog + '/' + B.Frog; B.Frog='';
      } else if (A.Frog){
        B.Trait = 'SpecialFrog/' + B.SpecialFrog + '/' + A.Trait;
        A.SpecialFrog = B.SpecialFrog; B.SpecialFrog = B.SpecialFrog + '/' + A.Frog; A.Frog='';
      }
    }
    if (A.Frog) C.Frog = B.Frog; else if (A.SpecialFrog) C.SpecialFrog = '/bottom/' + A.SpecialFrog;
    if (B.Frog) C.Subset = A.Frog; else if (B.SpecialFrog) C.SpecialFrog = B.SpecialFrog;

    C.Trait      = B.Trait      || A.Trait      || '';
    C.Accessory  = A.Accessory  || B.Accessory  || '';
    C.Eyes       = A.Eyes       || B.Eyes       || '';
    C.Hat        = A.Hat        || B.Hat        || '';
    C.Mouth      = A.Mouth      || B.Mouth      || '';
    return C;
  }

  async function randomBaseId(){ return 1 + Math.floor(Math.random()*TOTAL); }

  async function showBase(id){
    const r = await fetch(jsonFor(id)); const j = r.ok ? await r.json() : null;
    thumb.width=SIZE; thumb.height=SIZE; thumb.src = imgFor(id); thumb.alt=String(id);
    title.textContent = `Frog #${id}`;
    meta.textContent  = 'Not staked • Owned by You';
    setAttrs(j?.attributes || []);
    return j;
  }

  async function mutate(){
    const aId = Number(thumb.alt) || await randomBaseId();
    const bId = await pickPartnerId(2000);

    const ja = await (await fetch(jsonFor(aId))).json();
    const jb = await (await fetch(jsonFor(bId))).json();

    const A={Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    const B={Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    ja.attributes.forEach(x=> A[x.trait_type]=x.value);
    jb.attributes.forEach(x=> B[x.trait_type]=x.value);

    const C = buildMetadataC(A,B);
    const dataUrl = await composeToDataURL(aId, C);
    thumb.src = dataUrl;

    // attributes list for preview
    const out=[];
    if (C.Frog) out.push({trait_type:'Frog', value:C.Frog}); else if (C.SpecialFrog) out.push({trait_type:'SpecialFrog', value:C.SpecialFrog});
    if (C.Subset)    out.push({trait_type:'Subset',    value:C.Subset});
    if (C.Trait)     out.push({trait_type:'Trait',     value:C.Trait});
    if (C.Accessory) out.push({trait_type:'Accessory', value:C.Accessory});
    if (C.Eyes)      out.push({trait_type:'Eyes',      value:C.Eyes});
    if (C.Hat)       out.push({trait_type:'Hat',       value:C.Hat});
    if (C.Mouth)     out.push({trait_type:'Mouth',     value:C.Mouth});
    setAttrs(out);

    title.textContent = `Frog #${aId} × #${bId}`;
    meta.textContent  = 'Mutated preview';
  }

  async function refresh(){
    const id = await randomBaseId();
    await showBase(id);
  }

  async function init(){
    await refresh();
    btnRefresh && btnRefresh.addEventListener('click', refresh);
    btnMutate  && btnMutate.addEventListener('click', mutate);
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
