// assets/js/mutate.js
// Mutate Lab page: show one random frog (attributes). Buttons:
// - Refresh: new random frog
// - Mutate: pick another random frog and build a composite by layering attribute images
// Uses your config:
//   SOURCE_PATH: "https://freshfrogs.github.io" (absolute base)
//   TOTAL_SUPPLY: 4040

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, ''); // e.g. "https://freshfrogs.github.io"

  // DOM references
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

  // ---- Paths
  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

  // ---- Attribute list (like existing cards)
  function renderAttrs(attrs){
    attrsEl.innerHTML = '';
    if (!Array.isArray(attrs)) return;
    const max = 8;
    let n = 0;
    for (const a of attrs){
      if (!a) continue;
      const key = a.trait_type || a.key || '';
      const val = a.value || a.trait_value || '';
      if (!key) continue;
      const li = document.createElement('li');
      li.innerHTML = `<b>${key}:</b> ${String(val)}`;
      attrsEl.appendChild(li);
      if (++n >= max) break;
    }
  }

  // ---- Layering helper (used by mutate)
  function build_trait(part, value, locationId){
    const root = document.getElementById(locationId) || layersRoot;
    if (!root) return;

    const cleanVal  = String(value || '').replace(/^\/+/, '');
    const cleanPart = String(part || '').replace(/^\/+/, '');
    const path = `${SOURCE_PATH}/frog/${cleanPart}/${cleanVal}.png`;

    const img = document.createElement('img');
    img.alt = `${part}:${value}`;
    img.src = path;
    root.appendChild(img);
  }

  // ---- Show a normal frog by ID
  async function showFrog(id){
    currentId = id;
    layersRoot.innerHTML = ''; // clear any previous composite layers

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

  // ---- Mutate (your metamorph_build logic, adapted)
  async function metamorph_build(token_a, token_b, locationId) {
    const loc = locationId || 'mutateLayers';
    document.getElementById(loc).innerHTML = '';

    let metadata_a = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let metadata_b = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let metadata_c = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    // Fetch A
    const a_raw = await (await fetch(`${SOURCE_PATH}/frog/json/${token_a}.json`)).json();
    for (let i=0; i<a_raw.attributes.length; i++){
      const attribute = a_raw.attributes[i];
      metadata_a[attribute.trait_type] = attribute.value;
    }

    // Fetch B
    const b_raw = await (await fetch(`${SOURCE_PATH}/frog/json/${token_b}.json`)).json();
    for (let j=0; j<b_raw.attributes.length; j++){
      const attribute = b_raw.attributes[j];
      metadata_b[attribute.trait_type] = attribute.value;
    }

    // SpecialFrog rules (as provided)
    if (metadata_a['SpecialFrog'] !== '' || metadata_b['SpecialFrog'] !== '') {
      if (metadata_a['SpecialFrog'] !== '' && metadata_b['SpecialFrog'] !== '') {
        metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/SpecialFrog/'+metadata_b['SpecialFrog'];
        metadata_b['Trait'] = '';
      } else if (metadata_b['Frog'] !== '') {
        metadata_b['Trait'] = 'SpecialFrog/'+metadata_a['SpecialFrog']+'/'+metadata_b['Trait'];
        metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/'+metadata_b['Frog'];
        metadata_b['Frog'] = '';
      } else if (metadata_a['Frog'] !== '') {
        metadata_b['Trait'] = 'SpecialFrog/'+metadata_b['SpecialFrog']+'/'+metadata_a['Trait'];
        metadata_a['SpecialFrog'] = metadata_b['SpecialFrog'];
        metadata_b['SpecialFrog'] = metadata_b['SpecialFrog']+'/'+metadata_a['Frog'];
        metadata_a['Frog'] = '';
      }
    }

    // Compose C
    if (metadata_a['Frog'] !== '') { metadata_c['Frog'] = metadata_b['Frog']; }
    else if (metadata_a['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = '/bottom/'+metadata_a['SpecialFrog']; }

    if (metadata_b['Frog'] !== '') { metadata_c['Subset'] = metadata_a['Frog']; }
    else if (metadata_b['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = metadata_b['SpecialFrog']; }

    if (metadata_b['Trait'] !== '') { metadata_c['Trait'] = metadata_b['Trait']; }
    else if (metadata_a['Trait'] !== '') { metadata_c['Trait'] = metadata_a['Trait']; }

    if (metadata_a['Accessory'] !== '') { metadata_c['Accessory'] = metadata_a['Accessory']; }
    else if (metadata_b['Accessory'] !== '') { metadata_c['Accessory'] = metadata_b['Accessory']; }

    if (metadata_a['Eyes'] !== '') { metadata_c['Eyes'] = metadata_a['Eyes']; }
    else if (metadata_b['Eyes'] !== '') { metadata_c['Eyes'] = metadata_b['Eyes']; }

    if (metadata_a['Hat'] !== '') { metadata_c['Hat'] = metadata_a['Hat']; }
    else if (metadata_b['Hat'] !== '') { metadata_c['Hat'] = metadata_b['Hat']; }

    if (metadata_a['Mouth'] !== '') { metadata_c['Mouth'] = metadata_a['Mouth']; }
    else if (metadata_b['Mouth'] !== '') { metadata_c['Mouth'] = metadata_b['Mouth']; }

    // Build layers (and return composed attributes)
    const resultAttrs = [];
    if (metadata_c['Frog'] !== '') {
      resultAttrs.push({trait_type:'Frog', value:metadata_c['Frog']});
      build_trait('Frog', metadata_c['Frog'], loc);
    } else if (metadata_c['SpecialFrog'] !== '') {
      resultAttrs.push({trait_type:'SpecialFrog', value:metadata_c['SpecialFrog']});
      build_trait('SpecialFrog', metadata_c['SpecialFrog'], loc);
    }

    if (metadata_c['Subset']    !== '') { resultAttrs.push({trait_type:'Subset',    value:metadata_c['Subset']});    build_trait('Frog/subset', metadata_c['Subset'],    loc); }
    if (metadata_c['Trait']     !== '') { resultAttrs.push({trait_type:'Trait',     value:metadata_c['Trait']});     build_trait('Trait',       metadata_c['Trait'],     loc); }
    if (metadata_c['Accessory'] !== '') { resultAttrs.push({trait_type:'Accessory', value:metadata_c['Accessory']}); build_trait('Accessory',   metadata_c['Accessory'], loc); }
    if (metadata_c['Eyes']      !== '') { resultAttrs.push({trait_type:'Eyes',      value:metadata_c['Eyes']});      build_trait('Eyes',        metadata_c['Eyes'],      loc); }
    if (metadata_c['Hat']       !== '') { resultAttrs.push({trait_type:'Hat',       value:metadata_c['Hat']});       build_trait('Hat',         metadata_c['Hat'],       loc); }
    if (metadata_c['Mouth']     !== '') { resultAttrs.push({trait_type:'Mouth',     value:metadata_c['Mouth']});     build_trait('Mouth',       metadata_c['Mouth'],     loc); }

    const outEl = document.getElementById('morph-json');
    if (outEl) outEl.textContent = JSON.stringify(resultAttrs, null, 2);
    return resultAttrs;
  }

  // ---- Buttons
  async function handleRefresh(){
    btnRefresh.disabled = true;
    try{
      const id = randId();
      await showFrog(id);
    }finally{
      btnRefresh.disabled = false;
    }
  }

  async function handleMutate(){
    if (!currentId) return;
    btnMutate.disabled = true;
    try{
      const b = randId(currentId);
      // Keep base (A) visible; overlay composite (C) via layers:
      const resultAttrs = await metamorph_build(currentId, b, 'mutateLayers');
      titleEl.textContent = `Frog #${currentId} × #${b}`;
      metaEl.textContent = 'Mutated preview (composite layers)';
      renderAttrs(resultAttrs);
    }catch(e){
      console.warn('[mutate] failed', e);
    }finally{
      btnMutate.disabled = false;
    }
  }

  // ---- Optional wallet chip (same style as other pages)
  async function initWalletChip(){
    const btn = btnWallet;
    if (!btn) return;
    try{
      const arr = await (window.ethereum?.request?.({method:'eth_accounts'}) || []);
      const a = arr?.[0] || null;
      btn.style.display = 'inline-flex';
      if (a){
        btn.classList.add('btn-connected');
        btn.textContent = a;
        btn.style.pointerEvents = 'none';
      }else{
        btn.textContent = 'Connect Wallet';
        btn.addEventListener('click', async ()=>{
          try{
            const got = await window.ethereum.request({ method:'eth_requestAccounts' });
            const addr = got?.[0] || null;
            if (addr){
              btn.classList.add('btn-connected');
              btn.textContent = addr;
              btn.style.pointerEvents = 'none';
            }
          }catch{}
        });
      }
    }catch{}
  }

  // ---- Boot
  async function init(){
    if (FF?.initTopbar) try { FF.initTopbar(); } catch {}
    await initWalletChip();
    await handleRefresh();
    btnRefresh?.addEventListener('click', handleRefresh);
    btnMutate?.addEventListener('click', handleMutate);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
