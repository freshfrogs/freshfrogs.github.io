/* assets/morph.js — minimal + unbreakable */

// run after DOM
document.addEventListener("DOMContentLoaded", () => {

  const MAX_SUPPLY = 4040;

  // smart SOURCE_PATH:
  // - on your live site -> absolute
  // - locally / custom host -> relative
  const isGitHubHost = location.hostname.includes("freshfrogs.github.io");
  window.SOURCE_PATH = window.SOURCE_PATH || (isGitHubHost ? "https://freshfrogs.github.io/assets" : "./assets");
  const SOURCE_PATH = window.SOURCE_PATH;

  const BUILD_BASE = `${SOURCE_PATH}/frog/build_files`;

  const gridEl     = document.getElementById("morph-grid");
  const slotAEl    = document.getElementById("slot-a");
  const slotBEl    = document.getElementById("slot-b");
  const slotATxt   = document.getElementById("slot-a-text");
  const slotBTxt   = document.getElementById("slot-b-text");
  const previewEl  = document.getElementById("morph-preview");
  const jsonEl     = document.getElementById("morph-json");

  const morphBtn   = document.getElementById("morph-btn");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const clearBtn   = document.getElementById("clear-btn");

  let selectedA = null;
  let selectedB = null;
  let currentCards = [];

  // utils
  const randInt = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

  function pickUnique(count, min, max){
    const s = new Set();
    while (s.size < count) s.add(randInt(min, max));
    return [...s];
  }

  const frogImgUrl = id => `${SOURCE_PATH}/frog/${id}.png`;

  async function fetchMetadata(id){
    const url = `${SOURCE_PATH}/frog/json/${id}.json`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Metadata ${id} not found`);
    return res.json();
  }

  // forced-visible cards
  function createCard(id){
    const card = document.createElement("div");
    card.className = "panel morph-card";
    card.dataset.tokenId = id;
    card.innerHTML = `
      <img src="${frogImgUrl(id)}" alt="Frog #${id}" loading="lazy">
      <div class="title">Frog #${id}</div>
      <div class="tiny-muted">Click to select</div>
    `;
    card.addEventListener("click", () => onSelect(id));
    return card;
  }

  function renderGrid(){
    gridEl.innerHTML = "";
    currentCards = [];

    pickUnique(20, 1, MAX_SUPPLY).forEach(id => {
      const card = createCard(id);
      currentCards.push(card);
      gridEl.appendChild(card);
    });

    syncUI();
  }

  function onSelect(id){
    if (selectedA === id) selectedA = null;
    else if (selectedB === id) selectedB = null;
    else if (selectedA == null) selectedA = id;
    else if (selectedB == null) selectedB = id;
    else selectedA = id;

    syncUI();
  }

  function syncUI(){
    currentCards.forEach(c => {
      const id = Number(c.dataset.tokenId);
      c.classList.toggle("morph-selected", id === selectedA || id === selectedB);
    });

    slotATxt.textContent = selectedA ? `Frog #${selectedA}` : "None selected";
    slotBTxt.textContent = selectedB ? `Frog #${selectedB}` : "None selected";

    slotAEl.innerHTML = selectedA
      ? `<img src="${frogImgUrl(selectedA)}" alt="Alpha"><div>Alpha – #${selectedA}</div>`
      : `<div><div class="tiny-muted">Alpha</div><div>None selected</div></div>`;

    slotBEl.innerHTML = selectedB
      ? `<img src="${frogImgUrl(selectedB)}" alt="Bravo"><div>Bravo – #${selectedB}</div>`
      : `<div><div class="tiny-muted">Bravo</div><div>None selected</div></div>`;

    morphBtn.disabled = !(selectedA && selectedB);
  }

  // preview
  function clearPreview(){
    previewEl.innerHTML = `<div class="tiny-muted">Select two frogs to preview</div>`;
  }

  function showFallback(a, b){
    previewEl.innerHTML = `
      <div class="preview-fallback">
        <img src="${frogImgUrl(a)}" alt="Alpha">
        <img src="${frogImgUrl(b)}" alt="Bravo">
      </div>
      <div class="tiny-muted" style="margin-top:6px;text-align:center;">
        (Layers missing — showing bases)
      </div>
    `;
  }

  function loadImg(url){
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function resolveTraitLayer(type, val){
    const safeType = String(type).replace(/^\/+/, "");
    const safeVal  = String(val).replace(/^\/+/, "");
    const url = `${BUILD_BASE}/${safeType}/${safeVal}.png`;
    const img = await loadImg(url);
    return img ? {url, img} : null;
  }

  async function renderComposite(layers){
    const first = layers.find(l => l && l.img);
    if (!first) return false;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width  = first.img.width  || 512;
    canvas.height = first.img.height || 512;

    for (const layer of layers){
      if (layer && layer.img){
        ctx.drawImage(layer.img, 0, 0, canvas.width, canvas.height);
      }
    }

    previewEl.innerHTML = "";
    canvas.className = "preview-canvas";
    previewEl.appendChild(canvas);
    return true;
  }

  // metamorph rules
  async function metamorph_build(a, b){
    clearPreview();
    jsonEl.textContent = "";

    const ma = {Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    const mb = {Frog:"",SpecialFrog:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};
    const mc = {Frog:"",SpecialFrog:"",Subset:"",Trait:"",Accessory:"",Eyes:"",Hat:"",Mouth:""};

    let aRaw, bRaw;
    try {
      aRaw = await fetchMetadata(a);
      bRaw = await fetchMetadata(b);
    } catch (e){
      console.error(e);
      showFallback(a,b);
      return;
    }

    aRaw.attributes.forEach(x => ma[x.trait_type]=x.value);
    bRaw.attributes.forEach(x => mb[x.trait_type]=x.value);

    if (ma.SpecialFrog!=="" || mb.SpecialFrog!==""){
      if (ma.SpecialFrog!=="" && mb.SpecialFrog!==""){
        mb.SpecialFrog = ma.SpecialFrog+"/SpecialFrog/"+mb.SpecialFrog;
        mb.Trait="";
      } else if (mb.Frog!==""){
        mb.Trait=`SpecialFrog/${ma.SpecialFrog}/${mb.Trait}`;
        mb.SpecialFrog=`${ma.SpecialFrog}/${mb.Frog}`;
        mb.Frog="";
      } else if (ma.Frog!==""){
        mb.Trait=`SpecialFrog/${mb.SpecialFrog}/${ma.Trait}`;
        ma.SpecialFrog=mb.SpecialFrog;
        mb.SpecialFrog=`${mb.SpecialFrog}/${ma.Frog}`;
        ma.Frog="";
      }
    }

    if (ma.Frog!=="") mc.Frog=mb.Frog;
    else if (ma.SpecialFrog!=="") mc.SpecialFrog="/bottom/"+ma.SpecialFrog;

    if (mb.Frog!=="") mc.Subset=ma.Frog;
    else if (mb.SpecialFrog!=="") mc.SpecialFrog=mb.SpecialFrog;

    mc.Trait = mb.Trait || ma.Trait || "";
    mc.Accessory = ma.Accessory || mb.Accessory || "";
    mc.Eyes = ma.Eyes || mb.Eyes || "";
    mc.Hat = ma.Hat || mb.Hat || "";
    mc.Mouth = ma.Mouth || mb.Mouth || "";

    const out={attributes:[]};
    const q=[];

    if (mc.Frog!==""){ out.attributes.push({trait_type:"Frog",value:mc.Frog}); q.push(["Frog",mc.Frog]); }
    else if (mc.SpecialFrog!==""){ out.attributes.push({trait_type:"SpecialFrog",value:mc.SpecialFrog}); q.push(["SpecialFrog",mc.SpecialFrog]); }

    if (mc.Subset!==""){ out.attributes.push({trait_type:"Subset",value:mc.Subset}); q.push(["Frog/subset",mc.Subset]); }
    if (mc.Trait!==""){ out.attributes.push({trait_type:"Trait",value:mc.Trait}); q.push(["Trait",mc.Trait]); }
    if (mc.Accessory!==""){ out.attributes.push({trait_type:"Accessory",value:mc.Accessory}); q.push(["Accessory",mc.Accessory]); }
    if (mc.Eyes!==""){ out.attributes.push({trait_type:"Eyes",value:mc.Eyes}); q.push(["Eyes",mc.Eyes]); }
    if (mc.Hat!==""){ out.attributes.push({trait_type:"Hat",value:mc.Hat}); q.push(["Hat",mc.Hat]); }
    if (mc.Mouth!==""){ out.attributes.push({trait_type:"Mouth",value:mc.Mouth}); q.push(["Mouth",mc.Mouth]); }

    jsonEl.textContent = JSON.stringify(out.attributes, null, 2);

    const layers=[];
    for (const [t,v] of q) layers.push(await resolveTraitLayer(t,v));

    const ok = await renderComposite(layers);
    if (!ok) showFallback(a,b);
  }

  // buttons
  morphBtn.addEventListener("click", () => {
    if (selectedA && selectedB) metamorph_build(selectedA, selectedB);
  });
  shuffleBtn.addEventListener("click", () => {
    selectedA=null; selectedB=null;
    renderGrid(); clearPreview(); jsonEl.textContent="";
  });
  clearBtn.addEventListener("click", () => {
    selectedA=null; selectedB=null;
    syncUI(); clearPreview(); jsonEl.textContent="";
  });

  // init
  renderGrid();
});
