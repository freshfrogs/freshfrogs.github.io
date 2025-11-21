/* assets/morph.js — SAFE Metamorph Lab
   - renders 20 random frogs with local minimal FrogCards (no site.js dependency)
   - click two to select, Morph composites layers from:
     SOURCE_PATH/frog/build_files/
*/

document.addEventListener("DOMContentLoaded", () => {

  const MAX_SUPPLY = 4040;

  // keep your existing SOURCE_PATH if already set elsewhere
  window.SOURCE_PATH = window.SOURCE_PATH || "https://freshfrogs.github.io/assets";
  const SOURCE_PATH = window.SOURCE_PATH;

  // ✅ YOUR REAL LAYER LOCATION
  const BUILD_BASE = `${SOURCE_PATH}/frog/build_files`;

  // DOM
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

  // ------------------------
  // Utils
  // ------------------------
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

  // ------------------------
  // Minimal FrogCard (matches your CSS classes)
  // ------------------------
  function createMorphFrogCard(id){
    const card = document.createElement("div");
    card.className = "frog-card panel";   // your existing card styling
    card.dataset.tokenId = id;

    card.innerHTML = `
      <div class="frog-card-inner">
        <div class="frog-thumb">
          <img
            src="${frogImgUrl(id)}"
            alt="Frog #${id}"
            style="width:100%;image-rendering:pixelated;display:block;"
            loading="lazy"
          >
        </div>
        <div class="frog-meta" style="padding:6px 4px 0;">
          <div class="frog-title" style="font-weight:700;">Frog #${id}</div>
          <div class="frog-sub" style="opacity:.7;font-size:12px;">Click to select</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => onSelect(id));
    return card;
  }

  // ------------------------
  // Grid
  // ------------------------
  function renderGrid(){
    if (!gridEl) return;
    gridEl.innerHTML = "";
    currentCards = [];

    const ids = pickUnique(20, 1, MAX_SUPPLY);
    ids.forEach(id => {
      const card = createMorphFrogCard(id);
      currentCards.push(card);
      gridEl.appendChild(card);
    });

    syncUI();
  }

  // ------------------------
  // Selection
  // ------------------------
  function onSelect(id){
    if (selectedA === id) selectedA = null;
    else if (selectedB === id) selectedB = null;
    else if (selectedA == null) selectedA = id;
    else if (selectedB == null) selectedB = id;
    else selectedA = id; // replace alpha if both full

    syncUI();
  }

  function syncUI(){
    currentCards.forEach(c => {
      const id = Number(c.dataset.tokenId);
      c.classList.toggle("morph-selected", id === selectedA || id === selectedB);
    });

    if (slotATxt) slotATxt.textContent = selectedA ? `Frog #${selectedA}` : "None selected";
    if (slotBTxt) slotBTxt.textContent = selectedB ? `Frog #${selectedB}` : "None selected";

    if (slotAEl){
      slotAEl.innerHTML = selectedA
        ? `<img src="${frogImgUrl(selectedA)}" alt="Alpha"><div>Alpha – #${selectedA}</div>`
        : `<div><div style="opacity:.7;">Alpha</div><div>None selected</div></div>`;
    }

    if (slotBEl){
      slotBEl.innerHTML = selectedB
        ? `<img src="${frogImgUrl(selectedB)}" alt="Bravo"><div>Bravo – #${selectedB}</div>`
        : `<div><div style="opacity:.7;">Bravo</div><div>None selected</div></div>`;
    }

    if (morphBtn) morphBtn.disabled = !(selectedA && selectedB);
  }

  // ------------------------
  // Preview (canvas composite from build_files)
  // ------------------------
  function clearPreview(){
    if (!previewEl) return;
    previewEl.innerHTML = `<div class="preview-hint">Select two frogs to preview</div>`;
  }

  function showFallback(alphaId, bravoId){
    if (!previewEl) return;
    previewEl.innerHTML = `
      <div class="preview-fallback">
        <img src="${frogImgUrl(alphaId)}" alt="Alpha">
        <img src="${frogImgUrl(bravoId)}" alt="Bravo">
      </div>
      <div class="tiny-muted" style="margin-top:6px; text-align:center;">
        (Could not load build_files layers — showing base frogs)
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

  async function resolveTraitLayer(traitType, traitValue){
    const safeType  = String(traitType).replace(/^\/+/, "");
    const safeValue = String(traitValue).replace(/^\/+/, "");
    const url = `${BUILD_BASE}/${safeType}/${safeValue}.png`;
    const img = await loadImg(url);
    return img ? { url, img } : null;
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

  // ------------------------
  // Metamorph logic (your rules)
  // ------------------------
  async function metamorph_build(token_a, token_b){
    clearPreview();
    if (jsonEl) jsonEl.textContent = "";

    const metadata_a = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    const metadata_b = { Frog:"", SpecialFrog:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };
    const metadata_c = { Frog:"", SpecialFrog:"", Subset:"", Trait:"", Accessory:"", Eyes:"", Hat:"", Mouth:"" };

    let aRaw, bRaw;
    try {
      aRaw = await fetchMetadata(token_a);
      bRaw = await fetchMetadata(token_b);
    } catch (e){
      console.error(e);
      showFallback(token_a, token_b);
      return null;
    }

    aRaw.attributes.forEach(attr => metadata_a[attr.trait_type] = attr.value);
    bRaw.attributes.forEach(attr => metadata_b[attr.trait_type] = attr.value);

    // Special frogs
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
    const traitQueue = [];

    // same order as old build_trait stacking
    if (metadata_c.Frog !== "") {
      out.attributes.push({trait_type:"Frog", value:metadata_c.Frog});
      traitQueue.push(["Frog", metadata_c.Frog]);
    } else if (metadata_c.SpecialFrog !== "") {
      out.attributes.push({trait_type:"SpecialFrog", value:metadata_c.SpecialFrog});
      traitQueue.push(["SpecialFrog", metadata_c.SpecialFrog]);
    }

    if (metadata_c.Subset !== "") {
      out.attributes.push({trait_type:"Subset", value:metadata_c.Subset});
      traitQueue.push(["Frog/subset", metadata_c.Subset]);
    }
    if (metadata_c.Trait !== "") {
      out.attributes.push({trait_type:"Trait", value:metadata_c.Trait});
      traitQueue.push(["Trait", metadata_c.Trait]);
    }
    if (metadata_c.Accessory !== "") {
      out.attributes.push({trait_type:"Accessory", value:metadata_c.Accessory});
      traitQueue.push(["Accessory", metadata_c.Accessory]);
    }
    if (metadata_c.Eyes !== "") {
      out.attributes.push({trait_type:"Eyes", value:metadata_c.Eyes});
      traitQueue.push(["Eyes", metadata_c.Eyes]);
    }
    if (metadata_c.Hat !== "") {
      out.attributes.push({trait_type:"Hat", value:metadata_c.Hat});
      traitQueue.push(["Hat", metadata_c.Hat]);
    }
    if (metadata_c.Mouth !== "") {
      out.attributes.push({trait_type:"Mouth", value:metadata_c.Mouth});
      traitQueue.push(["Mouth", metadata_c.Mouth]);
    }

    if (jsonEl) jsonEl.textContent = JSON.stringify(out.attributes, null, 2);

    // load layers from build_files and composite
    const resolvedLayers = [];
    for (const [type, val] of traitQueue){
      resolvedLayers.push(await resolveTraitLayer(type, val));
    }

    const ok = await renderComposite(resolvedLayers);
    if (!ok) showFallback(token_a, token_b);

    return out;
  }

  window.metamorph_build = metamorph_build;

  // ------------------------
  // Buttons
  // ------------------------
  if (morphBtn){
    morphBtn.addEventListener("click", async () => {
      if (!selectedA || !selectedB) return;
      await metamorph_build(selectedA, selectedB);
    });
  }

  if (shuffleBtn){
    shuffleBtn.addEventListener("click", () => {
      selectedA = null;
      selectedB = null;
      renderGrid();
      clearPreview();
      if (jsonEl) jsonEl.textContent = "";
    });
  }

  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      selectedA = null;
      selectedB = null;
      syncUI();
      clearPreview();
      if (jsonEl) jsonEl.textContent = "";
    });
  }

  // init
  renderGrid();
});
