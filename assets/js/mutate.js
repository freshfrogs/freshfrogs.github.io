// assets/js/mutate.js
// One centered frog card matching the collection card exactly.
// Mutate builds 128x128 pixelated layers and sets the background color by sampling
// the original PNG (so only the solid bg color is visible).

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANKS_URL = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';

  const $ = (s, r=document)=> r.querySelector(s);

  // DOM
  const card       = $('#mutateCard');
  const thumbImg   = $('#mutateThumb');       // <img class="thumb">
  const thumbBuild = $('#mutateThumbBuild');  // <div class="thumb thumb-build">
  const layersRoot = $('#mutateLayers');

  const titleEl    = $('#mutateTitle');
  const rankPill   = $('#mutateRankPill');
  const metaEl     = $('#mutateMeta');
  const attrsEl    = $('#mutateAttrs');

  const btnRefresh = $('#btnRefresh');
  const btnMutate  = $('#btnMutate');

  let currentId = null;
  let RANKS = null;

  const imgFor  = (id)=> `${SOURCE_PATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${SOURCE_PATH}/frog/json/${id}.json`;

  async function ensureRanks(){
    if (RANKS) return RANKS;
    try{
      const r = await fetch(RANKS_URL);
      const j = await r.json();
      // normalize to {id: ranking}
      RANKS = Array.isArray(j) ? j.reduce((m,row)=> (m[String(row.id)] = row.ranking, m), {}) : (j||{});
    }catch{ RANKS = {}; }
    return RANKS;
  }

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

  // Sample a pixel from the PNG to get the solid bg color
  async function sampleBgColor(id){
    const url = imgFor(id);
    const img = new Image();
    img.src = url; // same-origin, no CORS issues
    await new Promise((res, rej)=>{
      img.onload = res; img.onerror = rej;
    });
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    // draw very small; sample a top-left-ish pixel to avoid frog content
    ctx.drawImage(img, 0, 0, 2, 2);
    const d = ctx.getImageData(1, 1, 1, 1).data; // [r,g,b,a]
    return `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]/255})`;
  }

  // build_trait → /frog/build_files/<family>/<attribute>.png
  function build_trait(trait_type, attribute, locationId){
    const root = document.getElementById(locationId) || layersRoot;
    if (!root) return;
    const img = document.createElement('img');
    img.src = `${SOURCE_PATH}/frog/build_files/${trait_type}/${attribute}.png`;
    img.alt = `${trait_type}:${attribute}`;
    img.style.width = '128px';
    img.style.height = '128px';
    img.style.imageRendering = 'pixelated';
    root.appendChild(img);
  }

  async function showFrog(id){
    currentId = id;
    card?.setAttribute('data-token-id', String(id));

    // Restore normal card: show <img.thumb>, hide build
    thumbImg.style.display   = 'block';
    thumbBuild.style.display = 'none';
    layersRoot.innerHTML = '';

    // 128×128, crisp
    thumbImg.src = imgFor(id);
    thumbImg.alt = String(id);
    thumbImg.style.width = '128px';
    thumbImg.style.height = '128px';
    thumbImg.style.imageRendering = 'pixelated';

    // Title + meta + attributes like the collection card
    try{
      const [metaRes, ranks] = await Promise.all([ fetch(jsonFor(id)), ensureRanks() ]);
      const meta = (metaRes.ok) ? await metaRes.json() : null;

      titleEl.firstChild && (titleEl.firstChild.nodeType === 3)
        ? (titleEl.firstChild.nodeValue = `Frog #${id} `)
        : (titleEl.innerHTML = `Frog #${id} <span class="pill" id="mutateRankPill"></span>`);

      const rank = ranks && ranks[String(id)];
      if (rank != null){
        rankPill.textContent = `Rank #${rank}`;
        rankPill.hidden = false;
      } else {
        rankPill.hidden = true;
      }

      metaEl.textContent = 'Not staked • Owned by You';
      renderAttrs(meta?.attributes || []);
    }catch{
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent  = 'Preview • —';
      attrsEl.innerHTML   = '';
      if (rankPill) rankPill.hidden = true;
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

  // A × B => C, draw composite into thumbBuild and color its background from the PNG
  async function mutateBuild(aId, bId){
    layersRoot.innerHTML = '';

    // Use A’s PNG to derive the background color (solid), apply to build thumb
    const bg = await sampleBgColor(aId); // or sampleBgColor(bId) to use B
    thumbBuild.style.backgroundColor = bg;

    // Swap visibility to match exact card layout
    thumbImg.style.display   = 'none';
    thumbBuild.style.display = 'block';

    let A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    let C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    const ja = await (await fetch(jsonFor(aId))).json();
    for (const at of ja.attributes){ A[at.trait_type] = at.value; }

    const jb = await (await fetch(jsonFor(bId))).json();
    for (const at of jb.attributes){ B[at.trait_type] = at.value; }

    // SpecialFrog logic (your rules)
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

    // Draw in canonical order at 128x128, pixelated
    if (C.Frog)        build_trait('Frog',        C.Frog,       'mutateLayers');
    else if (C.SpecialFrog) build_trait('SpecialFrog', C.SpecialFrog, 'mutateLayers');

    if (C.Subset)     build_trait('Frog/subset', C.Subset,    'mutateLayers');
    if (C.Trait)      build_trait('Trait',       C.Trait,     'mutateLayers');
    if (C.Accessory)  build_trait('Accessory',   C.Accessory, 'mutateLayers');
    if (C.Eyes)       build_trait('Eyes',        C.Eyes,      'mutateLayers');
    if (C.Hat)        build_trait('Hat',         C.Hat,       'mutateLayers');
    if (C.Mouth)      build_trait('Mouth',       C.Mouth,     'mutateLayers');

    // Attributes list → C (mirrors dashboard card feel)
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

  function randId(except){
    if (!TOTAL || TOTAL < 1) return 1;
    let id = Math.floor(Math.random() * TOTAL) + 1;
    if (except && TOTAL > 1){
      while (id === except) id = Math.floor(Math.random() * TOTAL) + 1;
    }
    return id;
  }

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
      await mutateBuild(currentId, b);
      titleEl.firstChild.nodeValue = `Frog #${currentId} × #${b} `;
      metaEl.textContent = 'Mutated preview';
    } finally { btnMutate.disabled = false; }
  }

  async function init(){
    await onRefresh();
    btnRefresh?.addEventListener('click', onRefresh);
    btnMutate?.addEventListener('click', onMutate);
  }

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
