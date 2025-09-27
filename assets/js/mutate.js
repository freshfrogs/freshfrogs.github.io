// assets/js/mutate.js
// Match collection frog-card exactly, build 128×128 pixelated layers,
// and push the background PNG out of frame so only the bg color shows.

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');

  const $ = (s, r=document)=> r.querySelector(s);

  const thumbImg   = $('#mutateThumb');       // <img class="thumb">
  const thumbBuild = $('#mutateThumbBuild');  // <div class="thumb thumb-build">
  const layersRoot = $('#mutateLayers');

  const titleEl    = $('#mutateTitle');
  const metaEl     = $('#mutateMeta');
  const attrsEl    = $('#mutateAttrs');

  const btnRefresh = $('#btnRefresh');
  const btnMutate  = $('#btnMutate');
  const addrChip   = $('#mutateWalletAddr');

  let currentId = null;

  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

  function renderAttrs(attrs){
    attrsEl.innerHTML = '';
    if (!Array.isArray(attrs)) return;
    const max = 8; let n=0;
    for (const a of attrs){
      const key = a?.trait_type || a?.key; if (!key) continue;
      const val = a?.value || a?.trait_value || '';
      const li = document.createElement('li');
      li.innerHTML = `<b>${key}:</b> ${String(val)}`;
      attrsEl.appendChild(li);
      if (++n >= max) break;
    }
  }

  function setBackOnlyFrom(id){
    // Use PNG as background but blow it up so only its bg color shows.
    thumbBuild.style.backgroundImage = `url("${imgFor(id)}")`;
    thumbBuild.style.backgroundSize = '2600%'; // push frog out of 128x128
    thumbBuild.style.backgroundPosition = 'center';
    thumbBuild.style.backgroundRepeat = 'no-repeat';
  }

  // Your build_trait, targeting /frog/build_files
  function build_trait(trait_type, attribute, locationId){
    const root = document.getElementById(locationId) || layersRoot;
    if (!root) return;
    const img = document.createElement('img');
    img.src = `${SOURCE_PATH}/frog/build_files/${trait_type}/${attribute}.png`;
    img.alt = `${trait_type}:${attribute}`;
    img.style.width = '128px'; img.style.height = '128px';
    img.style.imageRendering = 'pixelated';
    root.appendChild(img);
  }

  async function showFrog(id){
    currentId = id;

    // Show normal <img.thumb>, hide build
    thumbImg.style.display   = 'block';
    thumbBuild.style.display = 'none';
    layersRoot.innerHTML = '';

    // 128×128 pixelated image
    thumbImg.src = imgFor(id);
    thumbImg.alt = String(id);
    thumbImg.style.width = '128px';
    thumbImg.style.height = '128px';
    thumbImg.style.imageRendering = 'pixelated';

    try{
      const r = await fetch(jsonFor(id));
      const j = r.ok ? await r.json() : null;
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent  = 'Random preview';
      renderAttrs(j?.attributes || []);
    }catch{
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent  = 'Preview • —';
      attrsEl.innerHTML   = '';
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

  // A × B => C, draw layered composite into thumbBuild (128×128)
  async function mutateBuild(aId, bId){
    layersRoot.innerHTML = '';
    setBackOnlyFrom(aId); // keep A's background tint; swap to setBackOnlyFrom(bId) if you prefer B

    // Show build thumb, hide base img
    thumbImg.style.display   = 'none';
    thumbBuild.style.display = 'block';

    let A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    const ja = await (await fetch(jsonFor(aId))).json();
    for (const at of ja.attributes){ A[at.trait_type] = at.value; }

    const jb = await (await fetch(jsonFor(bId))).json();
    for (const at of jb.attributes){ B[at.trait_type] = at.value; }

    // SpecialFrog logic
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

    // Build order: base → subset → trait → accessory → eyes → hat → mouth
    if (C.Frog)       build_trait('Frog',       C.Frog,       'mutateLayers');
    else if (C.SpecialFrog) build_trait('SpecialFrog', C.SpecialFrog, 'mutateLayers');

    if (C.Subset)     build_trait('Frog/subset', C.Subset,    'mutateLayers');
    if (C.Trait)      build_trait('Trait',       C.Trait,     'mutateLayers');
    if (C.Accessory)  build_trait('Accessory',   C.Accessory, 'mutateLayers');
    if (C.Eyes)       build_trait('Eyes',        C.Eyes,      'mutateLayers');
    if (C.Hat)        build_trait('Hat',         C.Hat,       'mutateLayers');
    if (C.Mouth)      build_trait('Mouth',       C.Mouth,     'mutateLayers');

    // Fill attributes list with the composite result
    const out = [];
    if (C.Frog) out.push({trait_type:'Frog', value:C.Frog}); else if (C.SpecialFrog) out.push({trait_type:'SpecialFrog', value:C.SpecialFrog});
    if (C.Subset)     out.push({trait_type:'Subset',    value:C.Subset});
    if (C.Trait)      out.push({trait_type:'Trait',     value:C.Trait});
    if (C.Accessory)  out.push({trait_type:'Accessory', value:C.Accessory});
    if (C.Eyes)       out.push({trait_type:'Eyes',      value:C.Eyes});
    if (C.Hat)        out.push({trait_type:'Hat',       value:C.Hat});
    if (C.Mouth)      out.push({trait_type:'Mouth',     value:C.Mouth});

    renderAttrs(out);
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
      await mutateBuild(currentId, b);
      titleEl.textContent = `Frog #${currentId} × #${b}`;
      metaEl.textContent  = 'Mutated preview';
    } finally { btnMutate.disabled = false; }
  }

  async function initWalletChip(){
    const el = addrChip; if (!el) return;
    try{
      const arr = await (window.ethereum?.request?.({method:'eth_accounts'}) || []);
      const a = arr?.[0] || null;
      if (a){
        el.style.display = 'inline-flex';
        el.textContent = a;  // full address like your dashboard
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
