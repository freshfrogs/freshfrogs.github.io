/* assets/morph.js
   Metamorph Lab page
   - shows 20 random frogs as cards
   - click two to select Alpha + Bravo
   - runs metamorph_build() to preview combined traits
*/

// ------------------------
// Config / Globals
// ------------------------
const MAX_SUPPLY = 4040;

// If your site already defines SOURCE_PATH globally, this won't override it.
window.SOURCE_PATH = window.SOURCE_PATH || "https://freshfrogs.github.io/assets";

// Where trait PNG layers live; tweak to match your real folder.
const TRAIT_BASE = `${SOURCE_PATH}/traits`;

const gridEl   = document.getElementById("morph-grid");
const slotAEl  = document.getElementById("slot-a");
const slotBEl  = document.getElementById("slot-b");
const slotATxt = document.getElementById("slot-a-text");
const slotBTxt = document.getElementById("slot-b-text");
const previewEl= document.getElementById("morph-preview");
const jsonEl   = document.getElementById("morph-json");

const morphBtn = document.getElementById("morph-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const clearBtn = document.getElementById("clear-btn");

let selectedA = null;
let selectedB = null;
let currentCards = [];

// ------------------------
// Utilities
// ------------------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUnique(count, min, max) {
  const s = new Set();
  while (s.size < count) s.add(randInt(min, max));
  return Array.from(s);
}

function frogImgUrl(id){ 
  return `${SOURCE_PATH}/frog/${id}.png`;
}

async function fetchMetadata(id){
  const url = `${SOURCE_PATH}/frog/json/${id}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Metadata ${id} not found`);
  return res.json();
}

// ------------------------
// Minimal FrogCard renderer
// Uses existing CSS as much as possible.
// Swap with your main FrogCard function if you want.
// ------------------------
function createMorphFrogCard(id){
  const card = document.createElement("div");
  card.className = "frog-card panel";  // panel/frog-card should match your styling
  card.dataset.tokenId = id;

  card.innerHTML = `
    <div class="frog-card-inner">
      <div class="frog-thumb">
        <img src="${frogImgUrl(id)}" alt="Frog #${id}" style="width:100%;image-rendering:pixelated;">
      </div>
      <div class="frog-meta" style="padding:6px 4px 0;">
        <div class="frog-title" style="font-weight:700;">Frog #${id}</div>
        <div class="frog-sub" style="opacity:.7;font-size:12px;">Click to select</div>
      </div>
    </div>
  `;

  // Click to select
  card.addEventListener("click", () => onSelectCard(id, card));
  return card;
}

function renderGrid(){
  gridEl.innerHTML = "";
  currentCards = [];

  const ids = pickUnique(20, 1, MAX_SUPPLY);
  ids.forEach(id => {
    const card = createMorphFrogCard(id);
    currentCards.push(card);
    gridEl.appendChild(card);
  });

  // keep selection highlight if cards overlap
  syncSelectionUI();
}

// ------------------------
// Selection logic
// ------------------------
function onSelectCard(id, card){
  // if already selected, unselect
  if (selectedA === id) selectedA = null;
  else if (selectedB === id) selectedB = null;
  else if (selectedA == null) selectedA = id;
  else if (selectedB == null) selectedB = id;
  else {
    // replace Alpha first if both full
    selectedA = id;
  }

  syncSelectionUI();
}

function syncSelectionUI(){
  // highlight cards
  currentCards.forEach(c => {
    const id = Number(c.dataset.tokenId);
    c.classList.toggle("morph-selected", id === selectedA || id === selectedB);
  });

  // update slots
  slotATxt.textContent = selectedA ? `Frog #${selectedA}` : "None selected";
  slotBTxt.textContent = selectedB ? `Frog #${selectedB}` : "None selected";

  slotAEl.innerHTML = selectedA
    ? `<img src="${frogImgUrl(selectedA)}" alt="Alpha"> <div style="margin-top:6px;">Alpha – #${selectedA}</div>`
    : `<div><div style="opacity:.7;">Alpha</div><div>None selected</div></div>`;

  slotBEl.innerHTML = selectedB
    ? `<img src="${frogImgUrl(selectedB)}" alt="Bravo"> <div style="margin-top:6px;">Bravo – #${selectedB}</div>`
    : `<div><div style="opacity:.7;">Bravo</div><div>None selected</div></div>`;

  morphBtn.disabled = !(selectedA && selectedB);
}

// ------------------------
// Trait layer builder
// Old metamorph_build calls build_trait(type, value, location)
// This implementation layers PNGs into the preview div.
// Update TRAIT_BASE/path rules if your folders differ.
// ------------------------
function clearPreviewLayers(location){
  const el = document.getElementById(location);
  if (!el) return;
  el.innerHTML = "";
}

function build_trait(traitType, traitValue, location){
  const el = document.getElementById(location);
  if (!el) return;

  // traitValue sometimes contains slashes already (SpecialFrog paths)
  const safeValue = String(traitValue).replace(/^\/+/, "");
  const path = `${TRAIT_BASE}/${traitType}/${safeValue}.png`;

  const layer = document.createElement("div");
  layer.className = "layer";
  layer.style.backgroundImage = `url("${path}")`;
  el.appendChild(layer);
}

// ------------------------
// Your metamorph_build, cleaned up but same logic
// ------------------------
async function metamorph_build(token_a, token_b, location) {

  console.log('=-=-=-=-=-=-=-=-=-= Morphing =-=-=-=-=-=-=-=-=-=');
  console.log('= Morphing Frog #'+token_a+' & Frog #'+token_b);
  console.log('= Fetching Metadata...');

  const metadata_a = {
    Frog: "", SpecialFrog: "", Trait: "",
    Accessory: "", Eyes: "", Hat: "", Mouth: ""
  };

  const metadata_b = {
    Frog: "", SpecialFrog: "", Trait: "",
    Accessory: "", Eyes: "", Hat: "", Mouth: ""
  };

  const metadata_c = {
    Frog: "", SpecialFrog: "", Subset: "",
    Trait: "", Accessory: "", Eyes: "", Hat: "", Mouth: ""
  };

  clearPreviewLayers(location);
  jsonEl.textContent = "";

  // Fetch Alpha
  const metadata_a_raw = await fetchMetadata(token_a);
  for (let i = 0; i < metadata_a_raw.attributes.length; i++) {
    const attribute = metadata_a_raw.attributes[i];
    metadata_a[attribute.trait_type] = attribute.value;
  }

  // Fetch Bravo
  const metadata_b_raw = await fetchMetadata(token_b);
  for (let j = 0; j < metadata_b_raw.attributes.length; j++) {
    const attribute = metadata_b_raw.attributes[j];
    metadata_b[attribute.trait_type] = attribute.value;
  }

  // Special Frogs logic (kept same)
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

  // Select attributes
  if (metadata_a['Frog'] !== '') metadata_c['Frog'] = metadata_b['Frog'];
  else if (metadata_a['SpecialFrog'] !== '') metadata_c['SpecialFrog'] = '/bottom/'+metadata_a['SpecialFrog'];

  if (metadata_b['Frog'] !== '') metadata_c['Subset'] = metadata_a['Frog'];
  else if (metadata_b['SpecialFrog'] !== '') metadata_c['SpecialFrog'] = metadata_b['SpecialFrog'];

  if (metadata_b['Trait'] !== '') metadata_c['Trait'] = metadata_b['Trait'];
  else if (metadata_a['Trait'] !== '') metadata_c['Trait'] = metadata_a['Trait'];

  if (metadata_a['Accessory'] !== '') metadata_c['Accessory'] = metadata_a['Accessory'];
  else if (metadata_b['Accessory'] !== '') metadata_c['Accessory'] = metadata_b['Accessory'];

  if (metadata_a['Eyes'] !== '') metadata_c['Eyes'] = metadata_a['Eyes'];
  else if (metadata_b['Eyes'] !== '') metadata_c['Eyes'] = metadata_b['Eyes'];

  if (metadata_a['Hat'] !== '') metadata_c['Hat'] = metadata_a['Hat'];
  else if (metadata_b['Hat'] !== '') metadata_c['Hat'] = metadata_b['Hat'];

  if (metadata_a['Mouth'] !== '') metadata_c['Mouth'] = metadata_a['Mouth'];
  else if (metadata_b['Mouth'] !== '') metadata_c['Mouth'] = metadata_b['Mouth'];

  // Build new JSON element
  const morphMetadataJsonObject = { attributes: [] };

  // Build preview layers in correct order
  if (metadata_c['Frog'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Frog", value: metadata_c['Frog']});
    build_trait('Frog', metadata_c['Frog'], location);
  } else if (metadata_c['SpecialFrog'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"SpecialFrog", value: metadata_c['SpecialFrog']});
    build_trait('SpecialFrog', metadata_c['SpecialFrog'], location);
  }

  if (metadata_c['Subset'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Subset", value: metadata_c['Subset']});
    build_trait('Frog/subset', metadata_c['Subset'], location);
  }

  if (metadata_c['Trait'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Trait", value: metadata_c['Trait']});
    build_trait('Trait', metadata_c['Trait'], location);
  }

  if (metadata_c['Accessory'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Accessory", value: metadata_c['Accessory']});
    build_trait('Accessory', metadata_c['Accessory'], location);
  }

  if (metadata_c['Eyes'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Eyes", value: metadata_c['Eyes']});
    build_trait('Eyes', metadata_c['Eyes'], location);
  }

  if (metadata_c['Hat'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Hat", value: metadata_c['Hat']});
    build_trait('Hat', metadata_c['Hat'], location);
  }

  if (metadata_c['Mouth'] !== '') {
    morphMetadataJsonObject.attributes.push({trait_type:"Mouth", value: metadata_c['Mouth']});
    build_trait('Mouth', metadata_c['Mouth'], location);
  }

  jsonEl.textContent = JSON.stringify(morphMetadataJsonObject.attributes, null, 2);
  return morphMetadataJsonObject;
}

// Expose for console/debug
window.metamorph_build = metamorph_build;

// ------------------------
// Button handlers
// ------------------------
morphBtn.addEventListener("click", async () => {
  if (!selectedA || !selectedB) return;

  previewEl.innerHTML = "";
  // make sure preview container is empty but alive
  await metamorph_build(selectedA, selectedB, "morph-preview");
});

shuffleBtn.addEventListener("click", () => {
  selectedA = null;
  selectedB = null;
  renderGrid();
});

clearBtn.addEventListener("click", () => {
  selectedA = null;
  selectedB = null;
  syncSelectionUI();
  previewEl.innerHTML = `<div style="opacity:.6;">Choose two frogs to preview</div>`;
  jsonEl.textContent = "";
});

// ------------------------
// Init
// ------------------------
renderGrid();
