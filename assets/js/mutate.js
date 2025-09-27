// assets/js/mutate.js
// Render EXACT frog-card markup by drawing the mutated frog to a 128x128 canvas
// and setting the result as the <img.thumb> src. Background uses the ORIGINAL
// base PNG scaled & shifted far right/down (so only the solid bg color shows).

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANKS_URL   = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';

  // Background placement (mirrors your CSS idea: 3600% @ 2600%/2600%)
  const BG_SCALE_FACTOR = 36;    // 3600% / 100
  const BG_SHIFT_FACTOR = 26;    // 2600% / 100
  const SIZE = 128;

  const $ = (s, r=document)=> r.querySelector(s);
  const thumbImg   = $('#mutateThumb');
  const titleEl    = $('#mutateTitle');
  const rankEl     = $('#mutateRank');
  const metaEl     = $('#mutateMeta');
  const attrsEl    = $('#mutateAttrs');
  const btnRefresh = $('#btnRefresh');
  const btnMutate  = $('#btnMutate');

  let currentId = null, RANKS = null;

  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

  async function ensureRanks(){
    if (RANKS) return RANKS;
    try{
      const r = await fetch(RANKS_URL);
      const j = await r.json();
      RANKS = Array.isArray(j) ? j.reduce((m,row)=> (m[String(row.id)]=row.ranking, m), {}) : (j||{});
    }catch{ RANKS = {}; }
    return RANKS;
  }

  function renderAttrs(attrs){
    attrsEl.innerHTML = '';
    if (!Array.isArray(attrs)) return;
    for (const a of attrs){
      const key = a?.trait_type || a?.key; if (!key) continue;
      const val = a?.value || a?.trait_value || '';
      const li = document.createElement('li');
      li.innerHTML = `<b>${key}:</b> ${String(val)}`;
      attrsEl.appendChild(li);
    }
  }

  // Draw background as original still, scaled & pushed to the right/bottom
  function drawShiftedBackground(ctx, baseImg){
    // Scale huge, then translate left/up so the visible area is the far bottom-right
    const scale = BG_SCALE_FACTOR;
    const drawW = SIZE * scale;
    const drawH = SIZE * scale;

    // Shift by a factor of the canvas size
    const shiftPixX = (BG_SHIFT_FACTOR * SIZE) / 1;  // e.g., 26 * 128 = 3328px
    const shiftPixY = (BG_SHIFT_FACTOR * SIZE) / 1;

    // Start far negative so the "bottom-right color" fills the canvas
    const dx = -drawW + shiftPixX;
    const dy = -drawH + shiftPixY;

    // Fill transparent first in case the image has alpha
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseImg, dx, dy, drawW, drawH);
  }

  function loadImage(src){
    return new Promise((resolve)=> {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = ()=> resolve(img);
      img.onerror = ()=> resolve(img); // still resolve; we can fail gracefully
      img.src = src;
    });
  }

  // Layer helper → /frog/build_files/<family>/<attribute>.png
  async function drawTrait(ctx, trait, attribute){
    if (!attribute) return;
    const url = `${SOURCE_PATH}/frog/build_files/${trait}/${attribute}.png`;
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
  }

  async function buildCompositeIntoDataURL(baseId, composite){
    // baseId: which frog's background image we use
    // composite: object with selected attributes to layer

    const baseImg = await loadImage(imgFor(baseId));
    const cnv = document.createElement('canvas');
    cnv.width = SIZE; cnv.height = SIZE;
    const ctx = cnv.getContext('2d', { willReadFrequently:true });
    ctx.imageSmoothingEnabled = false;

    // Background from original still
    drawShiftedBackground(ctx, baseImg);

    // Layer order (matches your builder)
    if (composite.Frog)             await drawTrait(ctx, 'Frog',        composite.Frog);
    else if (composite.SpecialFrog) await drawTrait(ctx, 'SpecialFrog', composite.SpecialFrog);

    if (composite.Subset)           await drawTrait(ctx, 'Frog/subset', composite.Subset);
    if (composite.Trait)            await drawTrait(ctx, 'Trait',       composite.Trait);
    if (composite.Accessory)        await drawTrait(ctx, 'Accessory',   composite.Accessory);
    if (composite.Eyes)             await drawTrait(ctx, 'Eyes',        composite.Eyes);
    if (composite.Hat)              await drawTrait(ctx, 'Hat',         composite.Hat);
    if (composite.Mouth)            await drawTrait(ctx, 'Mouth',       composite.Mouth);

    return cnv.toDataURL('image/png');
  }

  async function showFrog(id){
    currentId = id;

    // Show original PNG directly (exact dashboard look)
    thumbImg.width = SIZE; thumbImg.height = SIZE;
    thumbImg.src = imgFor(id);
    thumbImg.alt = String(id);

    try{
      const [rM, ranks] = await Promise.all([ fetch(jsonFor(id)), ensureRanks() ]);
      const meta = rM.ok ? await rM.json() : null;
      const rk = ranks[String(id)];
      titleEl.innerHTML = `Frog #${id} <span class="pill" id="mutateRank"${rk==null?' style="display:none"':''}>${rk!=null?`Rank #${rk}`:''}</span>`;
      metaEl.textContent = 'Not staked • Owned by You';
      renderAttrs(meta?.attributes || []);
    }catch{
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent  = 'Preview • —';
      attrsEl.innerHTML   = '';
      if (rankEl) rankEl.style.display = 'none';
    }
  }

  function randId(except){
    if (!TOTAL || TOTAL<1) return 1;
    let id = Math.floor(Math.random()*TOTAL)+1;
    if (except && TOTAL>1){ while(id===except) id = Math.floor(Math.random()*TOTAL)+1; }
    return id;
  }

  async function mutateBuild(aId, bId){
    // Load A & B metadata
    const ja = await (await fetch(jsonFor(aId))).json();
    const jb = await (await fetch(jsonFor(bId))).json();

    // Flatten to maps
    const A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    const B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    for (const at of ja.attributes) A[at.trait_type] = at.value;
    for (const at of jb.attributes) B[at.trait_type] = at.value;

    const C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    // Your special rules
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

    // Draw composite into the exact <img.thumb>
    const dataUrl = await buildCompositeIntoDataURL(aId, C);
    thumbImg.src = dataUrl;

    // Update bullets with C
    const out=[];
    if (C.Frog) out.push({trait_type:'Frog', value:C.Frog}); else if (C.SpecialFrog) out.push({trait_type:'SpecialFrog', value:C.SpecialFrog});
    if (C.Subset)    out.push({trait_type:'Subset',    value:C.Subset});
    if (C.Trait)     out.push({trait_type:'Trait',     value:C.Trait});
    if (C.Accessory) out.push({trait_type:'Accessory', value:C.Accessory});
    if (C.Eyes)      out.push({trait_type:'Eyes',      value:C.Eyes});
    if (C.Hat)       out.push({trait_type:'Hat',       value:C.Hat});
    if (C.Mouth)     out.push({trait_type:'Mouth',     value:C.Mouth});
    renderAttrs(out);
  }

  async function onRefresh(){
    btnRefresh.disabled = true;
    try{ await showFrog(randId()); } finally{ btnRefresh.disabled=false; }
  }

  async function onMutate(){
    if (!currentId) return;
    btnMutate.disabled = true;
    try{
      const b = randId(currentId);
      await mutateBuild(currentId, b);
      // Title mirrors your structure exactly
      titleEl.innerHTML = `Frog #${currentId} × #${b} <span class="pill" style="display:none"></span>`;
      metaEl.textContent = 'Mutated preview';
    } finally{ btnMutate.disabled = false; }
  }

  async function init(){
    await onRefresh();
    btnRefresh?.addEventListener('click', onRefresh);
    btnMutate?.addEventListener('click', onMutate);
  }
  (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', init) : init();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
