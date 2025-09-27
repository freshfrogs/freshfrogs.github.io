// assets/js/mutate.js
// Single centered frog-card (exact markup/classes). Mutate builds 128x128 layers and
// sets a SOLID background color sampled from the base PNG (no stripes).

(function (FF, CFG) {
  'use strict';

  const TOTAL = Number(CFG.TOTAL_SUPPLY || 4040);
  const SOURCE_PATH = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANKS_URL   = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';

  const $ = (s, r=document)=> r.querySelector(s);

  // DOM
  const card       = $('#mutateCard');
  const thumbImg   = $('#mutateThumb');       // <img.thumb>
  const thumbBuild = $('#mutateThumbBuild');  // <div.thumb.thumb-build>
  const layersRoot = $('#mutateLayers');

  const titleEl    = $('#mutateTitle');
  const rankEl     = $('#mutateRank');
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
      const r = await fetch(RANKS_URL); const j = await r.json();
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

  // Robust dominant-color sampler (solid bg, no stripes)
  async function sampleDominantBgColor(url){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = url;
    await new Promise(res=>{ img.onload = res; img.onerror = res; });
    const W=16, H=16, cnv=document.createElement('canvas');
    cnv.width=W; cnv.height=H;
    const ctx = cnv.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(img, 0, 0, W, H);
    const data = ctx.getImageData(0,0,W,H).data;
    const buckets = new Map(); const round = v => (v & ~7);
    for (let i=0;i<data.length;i+=4){
      if (data[i+3] < 220) continue;               // ignore transparent/semis
      const k = `${round(data[i])},${round(data[i+1])},${round(data[i+2])}`;
      buckets.set(k, (buckets.get(k)||0)+1);
    }
    if (!buckets.size) return 'transparent';
    let bestK=null, bestN=-1;
    for (const [k,n] of buckets) if (n>bestN){ bestN=n; bestK=k; }
    return `rgb(${bestK})`;
  }

  // Layer image helper: /frog/build_files/<family>/<attribute>.png
  function build_trait(trait, attribute, rootId){
    const root = document.getElementById(rootId) || layersRoot;
    const img  = document.createElement('img');
    img.src = `${SOURCE_PATH}/frog/build_files/${trait}/${attribute}.png`;
    img.alt = `${trait}:${attribute}`;
    img.style.width = '128px';
    img.style.height = '128px';
    img.style.imageRendering = 'pixelated';
    root.appendChild(img);
  }

  async function showFrog(id){
    currentId = id;
    card?.setAttribute('data-token-id', String(id));

    // show base image; hide build container
    thumbImg.style.display   = 'block';
    thumbBuild.style.display = 'none';
    layersRoot.innerHTML = '';

    thumbImg.src = imgFor(id);
    thumbImg.alt = String(id);
    thumbImg.style.width = '128px';
    thumbImg.style.height= '128px';
    thumbImg.style.imageRendering = 'pixelated';

    try{
      const [rM, ranks] = await Promise.all([ fetch(jsonFor(id)), ensureRanks() ]);
      const meta = rM.ok ? await rM.json() : null;

      // Title + optional rank pill (exact structure)
      const rk = ranks[String(id)];
      titleEl.innerHTML = `Frog #${id} <span class="pill" id="mutateRank"${rk==null?' style="display:none"':''}>${rk!=null?`Rank #${rk}`:''}</span>`;
      metaEl.textContent = 'Not staked • Owned by You';
      renderAttrs(meta?.attributes || []);
    }catch{
      titleEl.textContent = `Frog #${id}`;
      metaEl.textContent  = 'Preview • —';
      attrsEl.innerHTML   = '';
      if (rankEl) rankEl.style.display='none';
    }
  }

  function randId(except){
    if (!TOTAL || TOTAL<1) return 1;
    let id = Math.floor(Math.random()*TOTAL)+1;
    if (except && TOTAL>1){ while(id===except) id = Math.floor(Math.random()*TOTAL)+1; }
    return id;
  }

  // A × B => C; draw into thumbBuild and set solid bg color
  async function mutateBuild(aId, bId){
    layersRoot.innerHTML = '';

    // solid background color from A’s PNG
    const bg = await sampleDominantBgColor(imgFor(aId));
    thumbBuild.style.backgroundColor = bg || 'transparent';

    // Swap visibility
    thumbImg.style.display   = 'none';
    thumbBuild.style.display = 'block';

    // Compose metadata (your morph rules)
    const A = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    const B = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    const C = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    const ja = await (await fetch(jsonFor(aId))).json();
    for (const at of ja.attributes) A[at.trait_type] = at.value;
    const jb = await (await fetch(jsonFor(bId))).json();
    for (const at of jb.attributes) B[at.trait_type] = at.value;

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

    // Draw layers at 128×128, pixelated
    if (C.Frog)              build_trait('Frog',        C.Frog,       'mutateLayers');
    else if (C.SpecialFrog)  build_trait('SpecialFrog', C.SpecialFrog,'mutateLayers');
    if (C.Subset)            build_trait('Frog/subset', C.Subset,     'mutateLayers');
    if (C.Trait)             build_trait('Trait',       C.Trait,      'mutateLayers');
    if (C.Accessory)         build_trait('Accessory',   C.Accessory,  'mutateLayers');
    if (C.Eyes)              build_trait('Eyes',        C.Eyes,       'mutateLayers');
    if (C.Hat)               build_trait('Hat',         C.Hat,        'mutateLayers');
    if (C.Mouth)             build_trait('Mouth',       C.Mouth,      'mutateLayers');

    // Attributes list reflects C (matches card bullets)
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
      titleEl.innerHTML = `Frog #${currentId} <span class="pill" style="display:none"></span>`;
      titleEl.firstChild.nodeValue = `Frog #${currentId} × #${b} `;
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
