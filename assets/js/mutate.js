// assets/js/mutate.js
// Draws the mutated frog into the SAME <img.thumb> so spacing/shadows match.
// Background = original still PNG scaled and pushed far bottom-right.

(function (FF, CFG) {
  'use strict';

  const SIZE = 128;
  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const ROOT  = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANKS_URL = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';

  // Tune if you want the bg pushed more
  const BG_SCALE_FACTOR = 36;   // ≈3600%
  const BG_SHIFT_FACTOR = 26;   // ≈2600%

  const $ = (s, r=document)=> r.querySelector(s);
  const thumb = $('#mutateThumb');
  const title = $('#mutateTitle');
  const rank  = $('#mutateRank');
  const meta  = $('#mutateMeta');
  const attrs = $('#mutateAttrs');
  const btnR  = $('#btnRefresh');
  const btnM  = $('#btnMutate');

  const imgFor  = id => `${ROOT}/frog/${id}.png`;
  const jsonFor = id => `${ROOT}/frog/json/${id}.json`;

  let currentId, RANKS=null;

  async function ensureRanks(){
    if (RANKS) return RANKS;
    try{
      const r = await fetch(RANKS_URL); const j = await r.json();
      RANKS = Array.isArray(j) ? j.reduce((m,row)=> (m[String(row.id)]=row.ranking, m), {}) : (j||{});
    }catch{ RANKS = {}; }
    return RANKS;
  }

  function renderAttrs(list){
    attrs.innerHTML = '';
    if (!Array.isArray(list)) return;
    list.forEach(a=>{
      const k=a?.trait_type||a?.key; if(!k) return;
      const v=a?.value||a?.trait_value||'';
      const li=document.createElement('li');
      li.innerHTML = `<b>${k}:</b> ${String(v)}`;
      attrs.appendChild(li);
    });
  }

  function loadImage(src){
    return new Promise(res=>{
      const im=new Image(); im.crossOrigin='anonymous'; im.decoding='async';
      im.onload=()=>res(im); im.onerror=()=>res(im); im.src=src;
    });
  }

  function drawShiftedBackground(ctx, baseImg){
    const scale = BG_SCALE_FACTOR;
    const dw = SIZE*scale, dh = SIZE*scale;
    const dx = -dw + BG_SHIFT_FACTOR*SIZE;
    const dy = -dh + BG_SHIFT_FACTOR*SIZE;
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

  function randId(except){
    let id = Math.floor(Math.random()*TOTAL)+1;
    if(except && TOTAL>1){ while(id===except) id = Math.floor(Math.random()*TOTAL)+1; }
    return id;
  }

  async function showFrog(id){
    currentId=id;
    thumb.width=SIZE; thumb.height=SIZE; thumb.src = imgFor(id); thumb.alt=String(id);

    try{
      const [rMeta, ranks] = await Promise.all([fetch(jsonFor(id)), ensureRanks()]);
      const metaJson = rMeta.ok ? await rMeta.json() : null;
      const rk = ranks[String(id)];

      title.innerHTML = `Frog #${id} <span class="pill" id="mutateRank"${rk==null?' style="display:none"':''}>${rk!=null?`Rank #${rk}`:''}</span>`;
      meta.textContent = 'Not staked • Owned by You';
      renderAttrs(metaJson?.attributes || []);
    }catch{
      title.textContent = `Frog #${id}`;
      meta.textContent  = 'Preview • —';
      attrs.innerHTML   = '';
      rank && (rank.style.display='none');
    }
  }

  async function mutateNow(){
    const a = currentId; if(!a) return;
    const b = randId(a);

    // load metadata for A & B
    const ja = await (await fetch(jsonFor(a))).json();
    const jb = await (await fetch(jsonFor(b))).json();

    const A={Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    const B={Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    ja.attributes.forEach(x=> A[x.trait_type]=x.value);
    jb.attributes.forEach(x=> B[x.trait_type]=x.value);

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

    // draw into the SAME <img.thumb> (so card looks identical)
    const dataUrl = await composeToDataURL(a, C);
    thumb.src = dataUrl;

    // update bullets + title text
    const out=[];
    if (C.Frog) out.push({trait_type:'Frog', value:C.Frog}); else if (C.SpecialFrog) out.push({trait_type:'SpecialFrog', value:C.SpecialFrog});
    if (C.Subset)    out.push({trait_type:'Subset',    value:C.Subset});
    if (C.Trait)     out.push({trait_type:'Trait',     value:C.Trait});
    if (C.Accessory) out.push({trait_type:'Accessory', value:C.Accessory});
    if (C.Eyes)      out.push({trait_type:'Eyes',      value:C.Eyes});
    if (C.Hat)       out.push({trait_type:'Hat',       value:C.Hat});
    if (C.Mouth)     out.push({trait_type:'Mouth',     value:C.Mouth});
    renderAttrs(out);

    title.innerHTML = `Frog #${a} × #${b} <span class="pill" style="display:none"></span>`;
    meta.textContent = 'Mutated preview';
  }

  async function init(){
    await showFrog(randId());
    btnR.addEventListener('click', ()=> showFrog(randId()));
    btnM.addEventListener('click', ()=> mutateNow());
  }
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded', init) : init();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
