// assets/js/mutate.js
// Mirrors the frog card look/feel from collection.html,
// shows 1 random frog with attributes, and supports Refresh + Mutate (layered composite).

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, ''); // e.g. "https://freshfrogs.github.io"

  const $ = (s, r=document)=> r.querySelector(s);
  const baseImg     = $('#mutateBase');
  const layersRoot  = $('#mutateLayers');
  const titleEl     = $('#mutateTitle');
  const metaEl      = $('#mutateMeta');
  const attrsEl     = $('#mutateAttrs');
  const btnRefresh  = $('#btnRefresh');
  const btnMutate   = $('#btnMutate');
  const btnWallet   = $('#mutateWalletBtn');

  let currentId = null;

  // paths identical to the collection page
  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

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

  // layering helper used during mutation
  function build_trait(part, value, locationId){
    const root = document.getElementById(locationId) || layersRoot;
    if (!root) return;

    const cleanVal  = String(value || '').replace(/^\/+/, '');
    const cleanPart = String(part || '').replace(/^\/+/, '');
    const url = `${SOURCE_PATH}/frog/${cleanPart}/${cleanVal}.png`;

    const img = document.createElement('img');
    img.alt = `${part}:${value}`;
    img.src = url;
    root.appendChild(img);
  }

  async function showFrog(id){
    currentId = id;
    layersRoot.innerHTML = ''; // clear composite layers

    baseImg.src = imgFor(id);
    baseImg.alt = `Frog #${id}`;

    try{
      const r = await fetch(jsonFor(id));
      const j = r.ok ? await r.json() : null;
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent = 'Preview • Unstaked';
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

  // Your metamorph logic, adapted to draw layers into #mutateLayers
  async function metamorph_build(token_a, token_b, locationId) {
    const loc = locationId || 'mutateLayers';
    document.getElementById(loc).innerHTML = '';

    let A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    // fetch A
    const ja = await (await fetch(`${SOURCE_PATH}/frog/json/${token_a}.json`)).json();
    for (const at of ja.attributes){ A[at.trait_type] = at.value; }
    // fetch B
    const jb = await (await fetch(`${SOURCE_PATH}/frog/json/${token_b}.json`)).json();
    for (const at of jb.attributes){ B[at.trait_type] = at.value; }

    // SpecialFrog rules
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

    // draw layers & return composed attributes (used to fill the attributes list)
    const result = [];
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

  // buttons
  async function onRefresh(){
    btnRefresh.disabled = true;
    try{
      await showFrog(randId());
    } finally { btnRefresh.disabled = false; }
  }

  async function onMutate(){
    if (!currentId) return;
    btnMutate.disabled = true;
    try{
      const b = randId(currentId);
      const composed = await metamorph_build(currentId, b, 'mutateLayers');
      titleEl.textContent = `Frog #${currentId} × #${b}`;
      metaEl.textContent = 'Mutated preview (composite layers)';
      renderAttrs(composed);
    } finally { btnMutate.disabled = false; }
  }

  // optional wallet chip (kept muted on this page)
  async function initWalletChip(){
    const btn = btnWallet; if (!btn) return;
    try{
      const arr = await (window.ethereum?.request?.({method:'eth_accounts'}) || []);
      const a = arr?.[0] || null;
      if (a){
        btn.style.display = 'inline-flex';
        btn.classList.add('btn-connected');
        btn.textContent = a;
        btn.style.pointerEvents = 'none';
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
