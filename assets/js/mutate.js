// assets/js/mutate.js
// Mutate page that mirrors collection.html frog card exactly.
// - 128x128 pixelated layers
// - Background uses original frog PNG scaled so only the background color is visible
// - Top-right wallet chip matches dashboard style
// - Buttons: Refresh (random new A), Mutate (A x B => layered composite)

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, ''); // e.g. https://freshfrogs.github.io

  const $ = (s, r=document)=> r.querySelector(s);
  const thumbWrap   = $('#mutateThumbWrap');
  const baseImg     = $('#mutateBase');
  const layersRoot  = $('#mutateLayers');
  const titleEl     = $('#mutateTitle');
  const metaEl      = $('#mutateMeta');
  const attrsEl     = $('#mutateAttrs');
  const btnRefresh  = $('#btnRefresh');
  const btnMutate   = $('#btnMutate');
  const addrChip    = $('#mutateWalletAddr');

  let currentId = null;

  // Paths identical to collection
  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

  // identical attr list style
  function renderAttrs(attrs){
    attrsEl.innerHTML = '';
    if (!Array.isArray(attrs)) return;
    const max = 8; let n = 0;
    for (const a of attrs){
      const key = a?.trait_type || a?.key; if (!key) continue;
      const val = a?.value || a?.trait_value || '';
      const li = document.createElement('li');
      li.innerHTML = `<b>${key}:</b> ${String(val)}`;
      attrsEl.appendChild(li);
      if (++n >= max) break;
    }
  }

  // background = original PNG scaled so frog goes out of frame (just the solid bg remains)
  function setBackColorFromPNG(id){
    if (!thumbWrap) return;
    const url = imgFor(id);
    thumbWrap.style.backgroundImage = `url("${url}")`;
    // huge size pushes the frog outside the 128×128 viewport so you effectively see only its solid background color
    thumbWrap.style.backgroundSize = '1200%';
    thumbWrap.style.backgroundPosition = 'center';
    thumbWrap.style.backgroundRepeat = 'no-repeat';
  }

  // Your exact build_trait logic but targeting /frog/build_files
  function build_trait(trait_type, attribute, location){
    const root = document.getElementById(location) || layersRoot;
    if (!root) return;

    const img = document.createElement('img');
    img.className = (trait_type === 'Trait' || trait_type === 'Frog' || trait_type === 'SpecialFrog') ? 'trait_overlay' : 'attribute_overlay';
    img.src = `${SOURCE_PATH}/frog/build_files/${trait_type}/${attribute}.png`;
    img.alt = `${trait_type}:${attribute}`;
    // Guarantee 128×128 + pixelated
    img.style.width = '128px'; img.style.height = '128px';
    img.style.imageRendering = 'pixelated';
    root.appendChild(img);
  }

  async function showFrog(id){
    currentId = id;
    layersRoot.innerHTML = '';
    baseImg.style.visibility = 'visible';

    // set 128×128 base and background “color” from the same PNG
    baseImg.src = imgFor(id);
    baseImg.alt = `Frog #${id}`;
    baseImg.style.width = '128px';
    baseImg.style.height = '128px';
    baseImg.style.imageRendering = 'pixelated';

    setBackColorFromPNG(id);

    try{
      const r = await fetch(jsonFor(id));
      const j = r.ok ? await r.json() : null;
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent = 'Random preview';
      renderAttrs(j?.attributes || []);
    }catch{
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent = 'Preview • —';
      attrsEl.innerHTML = '';
    }
  }

  function randId(except){
    if (!TOTAL || TOTAL < 1) return 1;
    let id = Math.floor(Math.random() * TOTAL) + 1;
    if (except && TOTAL > 1){
      while (id === except) id = Math.floor(Math.random() * TOTAL) + 1;
    }
    return id;
  }

  // Morph logic (A × B -> C) + build layered composite at 128×128
  async function metamorph_build(token_a, token_b, locationId) {
    const loc = locationId || 'mutateLayers';
    const layers = document.getElementById(loc) || layersRoot;
    layers.innerHTML = '';

    let A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    const ja = await (await fetch(jsonFor(token_a))).json();
    for (const at of ja.attributes){ A[at.trait_type] = at.value; }

    const jb = await (await fetch(jsonFor(token_b))).json();
    for (const at of jb.attributes){ B[at.trait_type] = at.value; }

    // SpecialFrog handling
    if (A.SpecialFrog || B.SpecialFrog){
      if (A.SpecialFrog && B.SpecialFrog){
        B.SpecialFrog = A.SpecialFrog + '/SpecialFrog/' + B.SpecialFrog;
        B.Trait = '';
      } else if (B.Frog){
        B.Trait = 'SpecialFrog/' + A.SpecialFrog + '/' + B.Trait;
        B.SpecialFrog = A.SpecialFrog + '/' + B.Frog;
        B.Frog = '';
      } else if (A.Frog){
        B.Trait = 'SpecialFrog/' + B.SpecialFrog + '/' + A.Trait;
        A.SpecialFrog = B.SpecialFrog;
        B.SpecialFrog = B.SpecialFrog + '/' + A.Frog;
        A.Frog = '';
      }
    }

    if (A.Frog) C.Frog = B.Frog; else if (A.SpecialFrog) C.SpecialFrog = '/bottom/' + A.SpecialFrog;
    if (B.Frog) C.Subset = A.Frog; else if (B.SpecialFrog) C.SpecialFrog = B.SpecialFrog;

    C.Trait      = B.Trait      || A.Trait      || '';
    C.Accessory  = A.Accessory  || B.Accessory  || '';
    C.Eyes       = A.Eyes       || B.Eyes       || '';
    C.Hat        = A.Hat        || B.Hat        || '';
    C.Mouth      = A.Mouth      || B.Mouth      || '';

    // hide base; show only layers for the composite
    baseImg.style.visibility = 'hidden';

    const result = [];
    // Order: base → subset → trait → accessory → eyes → hat → mouth
    if (C.Frog){
      result.push({trait_type:'Frog', value:C.Frog});
      build_trait('Frog', C.Frog, loc);
    } else if (C.SpecialFrog){
      result.push({trait_type:'SpecialFrog', value:C.SpecialFrog});
      build_trait('SpecialFrog', C.SpecialFrog, loc);
    }
    if (C.Subset)    { result.push({trait_type:'Subset',    value:C.Subset});    build_trait('Frog/subset', C.Subset,    loc); }
    if (C.Trait)     { result.push({trait_type:'Trait',     value:C.Trait});     build_trait('Trait',       C.Trait,     loc); }
    if (C.Accessory) { result.push({trait_type:'Accessory', value:C.Accessory}); build_trait('Accessory',   C.Accessory, loc); }
    if (C.Eyes)      { result.push({trait_type:'Eyes',      value:C.Eyes});      build_trait('Eyes',        C.Eyes,      loc); }
    if (C.Hat)       { result.push({trait_type:'Hat',       value:C.Hat});       build_trait('Hat',         C.Hat,       loc); }
    if (C.Mouth)     { result.push({trait_type:'Mouth',     value:C.Mouth});     build_trait('Mouth',       C.Mouth,     loc); }

    return result;
  }

  async function onRefresh(){
    btnRefresh.disabled = true;
    try{
      const id = randId();
      await showFrog(id);
    } finally { btnRefresh.disabled = false; }
  }

  async function onMutate(){
    if (!currentId) return;
    btnMutate.disabled = true;
    try{
      const b = randId(currentId);
      const composed = await metamorph_build(currentId, b, 'mutateLayers');
      titleEl.textContent = `Frog #${currentId} × #${b}`;
      metaEl.textContent = 'Mutated preview';
      renderAttrs(composed);
      // keep the background “color” of A (looks good), or switch to B’s background:
      // setBackColorFromPNG(b);
    } finally { btnMutate.disabled = false; }
  }

  // Minimal wallet chip to match dashboard style
  async function initWalletChip(){
    const el = addrChip; if (!el) return;
    try{
      const arr = await (window.ethereum?.request?.({method:'eth_accounts'}) || []);
      const a = arr?.[0] || null;
      if (a){
        el.style.display = 'inline-flex';
        el.textContent = a; // full address, same as your dashboard behavior
      }
    }catch{}
  }

  async function init(){
    if (FF?.initTopbar) try { FF.initTopbar(); } catch {}
    await initWalletChip();
    await onRefresh();
    btnRefresh?.addEventListener('click', onRefresh);
    btnMutate?.addEventListener('click', onMutate);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
