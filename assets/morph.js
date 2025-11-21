/* assets/morph.js */

// ------------------------
// Config
// ------------------------
const MAX_SUPPLY = 4040;
window.SOURCE_PATH = window.SOURCE_PATH || "https://freshfrogs.github.io/assets";

// If your trait PNGs are elsewhere, change this.
const TRAIT_BASE = `${SOURCE_PATH}/traits`;

// DOM
const gridEl    = document.getElementById("morph-grid");
const slotAEl   = document.getElementById("slot-a");
const slotBEl   = document.getElementById("slot-b");
const slotATxt  = document.getElementById("slot-a-text");
const slotBTxt  = document.getElementById("slot-b-text");
const previewEl = document.getElementById("morph-preview");
const jsonEl    = document.getElementById("morph-json");

const morphBtn   = document.getElementById("morph-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const clearBtn   = document.getElementById("clear-btn");

let selectedA = null;
let selectedB = null;
let currentCards = [];

// ------------------------
// Utils
// ------------------------
const randInt = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

function pickUnique(count, min, max){
  const s = new Set();
  while(s.size < count) s.add(randInt(min,max));
  return [...s];
}

const frogImgUrl = id => `${SOURCE_PATH}/frog/${id}.png`;

async function fetchMetadata(id){
  const url = `${SOURCE_PATH}/frog/json/${id}.json`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Metadata ${id} not found`);
  return res.json();
}

// ------------------------
// FrogCard rendering (auto-reuse your site renderer if present)
// ------------------------
function renderFrogCardForMorph(id){
  // If your site exposes a FrogCard factory/renderer, use it.
  if (typeof window.renderFrogCard === "function") {
    return window.renderFrogCard({ tokenId:id, isMorph:true });
  }
  if (typeof window.createFrogCard === "function") {
    return window.createFrogCard({ tokenId:id, isMorph:true });
  }
  if (typeof window.displayFrogCard === "function") {
    // Some sites render by side effect; fallback to wrapper.
    const wrap = document.createElement("div");
    window.displayFrogCard(id, wrap);
    return wrap.firstElementChild || wrap;
  }

  // Fallback minimal card that still matches your CSS
  const card = document.createElement("div");
  card.className = "frog-card panel";
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
  return card;
}

function attachSelectHandler(card, id){
  card.dataset.tokenId = id;
  card.addEventListener("click", () => onSelectCard(id, card));
}

// ------------------------
// Grid
// ------------------------
function renderGrid(){
  gridEl.innerHTML = "";
  currentCards = [];

  const ids = pickUnique(20, 1, MAX_SUPPLY);

  ids.forEach(id => {
    const card = renderFrogCardForMorph(id);
    attachSelectHandler(card, id);

    currentCards.push(card);
    gridEl.appendChild(card);
  });

  syncSelectionUI();
}

// ------------------------
// Selection
// ------------------------
function onSelectCard(id){
  if (selectedA === id) selectedA = null;
  else if (selectedB === id) selectedB = null;
  else if (selectedA == null) selectedA = id;
  else if (selectedB == null) selectedB = id;
  else selectedA = id; // replace alpha if full

  syncSelectionUI();
}

function syncSelectionUI(){
  currentCards.forEach(c => {
    const id = Number(c.dataset.tokenId);
    c.classList.toggle("morph-selected", id === selectedA || id === selectedB);
  });

  slotATxt.textContent = selectedA ? `Frog #${selectedA}` : "None selected";
  slotBTxt.textContent = selectedB ? `Frog #${selectedB}` : "None selected";

  slotAEl.innerHTML = selectedA
    ? `<img src="${frogImgUrl(selectedA)}" alt="Alpha"><div style="margin-top:6px;">Alpha – #${selectedA}</div>`
    : `<div><div style="opacity:.7;">Alpha</div><div>None selected</div></div>`;

  slotBEl.innerHTML = selectedB
    ? `<img src="${frogImgUrl(selectedB)}" alt="Bravo"><div style="margin-top:6px;">Bravo – #${selectedB}</div>`
    : `<div><div style="opacity:.7;">Bravo</div><div>None selected</div></div>`;

  morphBtn.disabled = !(selectedA && selectedB);
}

// ------------------------
// Preview layering (FIXED)
// old version used background-image; now stacked <img> layers.
// ------------------------
function clearPreviewLayers(){
  previewEl.innerHTML = `<div class="hint">Pick two frogs to preview</div>`;
}

function traitLayerUrl(traitType, traitValue){
  const safeValue = String(traitValue).replace(/^\/+/, "");
  return `${TRAIT_BASE}/${traitType}/${safeValue}.png`;
}

function build_trait(traitType, traitValue){
  const url = traitLayerUrl(traitType, traitValue);

  const img = document.createElement("img");
  img.className = "layer-img";
  img.src = url;
  img.alt = `${traitType}: ${traitValue}`;
  previewEl.appendChild(img);
}

// ------------------------
// Metamorph logic (same as yours)
// ------------------------
async function metamorph_build(token_a, token_b){
  console.log(`Morphing #${token_a} + #${token_b}`);

  clearPreviewLayers();
  jsonEl.textContent = "";

  const metadata_a = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
  const metadata_b = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
  const metadata_c = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

  const metadata_a_raw = await fetchMetadata(token_a);
  metadata_a_raw.attributes.forEach(attr => metadata_a[attr.trait_type] = attr.value);

  const metadata_b_raw = await fetchMetadata(token_b);
  metadata_b_raw.attributes.forEach(attr => metadata_b[attr.trait_type] = attr.value);

  // Special Frogs
  if (metadata_a.SpecialFrog !== "" || metadata_b.SpecialFrog !== "") {
    if (metadata_a.SpecialFrog !== "" && metadata_b.SpecialFrog !== "") {
      metadata_b.SpecialFrog = `${metadata_a.SpecialFrog}/SpecialFrog/${metadata_b.SpecialFrog}`;
      metadata_b.Trait = "";
    } else if (metadata_b.Frog !== "") {
      metadata_b.Trait = `SpecialFrog/${metadata_a.SpecialFrog}/${metadata_b.Trait}`;
      metadata_b.SpecialFrog = `${metadata_a.SpecialFrog}/${metadata_b.Frog}`;
      metadata_b.Frog = "";
    } else if (metadata_a.Frog !== "") {
      metadata_b.Trait = `SpecialFrog/${metadata_b.SpecialFrog}/${metadata_a.Trait}`;
      metadata_a.SpecialFrog = metadata_b.SpecialFrog;
      metadata_b.SpecialFrog = `${metadata_b.SpecialFrog}/${metadata_a.Frog}`;
      metadata_a.Frog = "";
    }
  }

  if (metadata_a.Frog !== "") metadata_c.Frog = metadata_b.Frog;
  else if (metadata_a.SpecialFrog !== "") metadata_c.SpecialFrog = `/bottom/${metadata_a.SpecialFrog}`;

  if (metadata_b.Frog !== "") metadata_c.Subset = metadata_a.Frog;
  else if (metadata_b.SpecialFrog !== "") metadata_c.SpecialFrog = metadata_b.SpecialFrog;

  metadata_c.Trait     = metadata_b.Trait     || metadata_a.Trait     || "";
  metadata_c.Accessory = metadata_a.Accessory || metadata_b.Accessory || "";
  metadata_c.Eyes      = metadata_a.Eyes      || metadata_b.Eyes      || "";
  metadata_c.Hat       = metadata_a.Hat       || metadata_b.Hat       || "";
  metadata_c.Mouth     = metadata_a.Mouth     || metadata_b.Mouth     || "";

  const out = { attributes: [] };

  // order matters for layers
  if (metadata_c.Frog !== "") {
    out.attributes.push({trait_type:"Frog", value:metadata_c.Frog});
    build_trait("Frog", metadata_c.Frog);
  } else if (metadata_c.SpecialFrog !== "") {
    out.attributes.push({trait_type:"SpecialFrog", value:metadata_c.SpecialFrog});
    build_trait("SpecialFrog", metadata_c.SpecialFrog);
  }

  if (metadata_c.Subset !== "") {
    out.attributes.push({trait_type:"Subset", value:metadata_c.Subset});
    build_trait("Frog/subset", metadata_c.Subset);
  }
  if (metadata_c.Trait !== "") {
    out.attributes.push({trait_type:"Trait", value:metadata_c.Trait});
    build_trait("Trait", metadata_c.Trait);
  }
  if (metadata_c.Accessory !== "") {
    out.attributes.push({trait_type:"Accessory", value:metadata_c.Accessory});
    build_trait("Accessory", metadata_c.Accessory);
  }
  if (metadata_c.Eyes !== "") {
    out.attributes.push({trait_type:"Eyes", value:metadata_c.Eyes});
    build_trait("Eyes", metadata_c.Eyes);
  }
  if (metadata_c.Hat !== "") {
    out.attributes.push({trait_type:"Hat", value:metadata_c.Hat});
    build_trait("Hat", metadata_c.Hat);
  }
  if (metadata_c.Mouth !== "") {
    out.attributes.push({trait_type:"Mouth", value:metadata_c.Mouth});
    build_trait("Mouth", metadata_c.Mouth);
  }

  jsonEl.textContent = JSON.stringify(out.attributes, null, 2);
  return out;
}

window.metamorph_build = metamorph_build;

// ------------------------
// Buttons
// ------------------------
morphBtn.addEventListener("click", async () => {
  if(!selectedA || !selectedB) return;
  await metamorph_build(selectedA, selectedB);
});

shuffleBtn.addEventListener("click", () => {
  selectedA = null; selectedB = null;
  renderGrid();
});

clearBtn.addEventListener("click", () => {
  selectedA = null; selectedB = null;
  syncSelectionUI();
  clearPreviewLayers();
  jsonEl.textContent = "";
});

// init
renderGrid();
