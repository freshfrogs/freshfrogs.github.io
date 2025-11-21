document.addEventListener("DOMContentLoaded", () => {

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

  // ---------- utils
  const randInt = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

  function pickUnique(count, min, max){
    const s = new Set();
    while (s.size < count) s.add(randInt(min, max));
    return [...s];
  }

  async function fetchMetadata(id){
    const res = await fetch(`/frog/json/${id}.json`);
    if(!res.ok) throw new Error(`Metadata ${id} not found`);
    return res.json();
  }

  function normalizeMetadata(metadata){
    if (!metadata || typeof metadata !== "object") return { attributes: [] };
    const attrs = Array.isArray(metadata.attributes) ? metadata.attributes : [];
    return { attributes: attrs };
  }

  function hasUsableMetadata(metadata){
    return Array.isArray(metadata?.attributes) && metadata.attributes.length;
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildTraitsHtml(metadata){
    const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
    if (!attributes.length) return '<p class="frog-attr-text">Metadata unavailable</p>';

    return attributes.map((attr) => {
      if (!attr?.trait_type) return '';
      const type  = String(attr.trait_type);
      const value = attr.value != null ? String(attr.value) : '';
      return `
        <p class="frog-attr-text"
           data-trait-type="${escapeHtml(type)}"
           data-trait-value="${escapeHtml(value)}">
          ${escapeHtml(type)}: ${escapeHtml(value)}
        </p>`;
    }).filter(Boolean).join('');
  }

  // ---------- FrogCard clone (matches your createFrogCard look)
  function createMorphCard(tokenId, metadata){
    const frogName = `Frog #${tokenId}`;
    const traitsHtml = buildTraitsHtml(metadata);
    const imgContainerId = `frog-img-${tokenId}-${Math.random().toString(16).slice(2)}`;

    const card = document.createElement("div");
    card.className = "recent_sale_card";
    card.dataset.tokenId = tokenId;
    card.dataset.imgContainerId = imgContainerId;

    card.innerHTML = `
      <strong class="sale_card_title">--</strong>
      <strong class="sale_card_price">--</strong>
      <div style="clear: both;"></div>

      <div id="${imgContainerId}" class="frog_img_cont">
        <img
          src="/frog/${tokenId}.png"
          class="recent_sale_img"
          alt="Frog #${tokenId}"
          loading="lazy"
        />
      </div>

      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong><br>
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
      </div>
    `;

    card.addEventListener("click", () => onSelect(tokenId));
    return card;
  }

  // ---------- grid render
  async function renderGrid(){
    gridEl.innerHTML = "";
    currentCards = [];

    const ids = pickUnique(20, 1, 4040);

    for (const id of ids){
      let md = {};
      try {
        md = normalizeMetadata(await fetchMetadata(id));
      } catch (e){
        md = { attributes: [] };
      }

      const card = createMorphCard(id, md);
      currentCards.push(card);
      gridEl.appendChild(card);
    }

    syncUI();
  }

  // ---------- selection
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
      ? `<img src="/frog/${selectedA}.png" alt="Alpha"><div>Alpha – #${selectedA}</div>`
      : `<div><div class="tiny-muted">Alpha</div><div>None selected</div></div>`;

    slotBEl.innerHTML = selectedB
      ? `<img src="/frog/${selectedB}.png" alt="Bravo"><div>Bravo – #${selectedB}</div>`
      : `<div><div class="tiny-muted">Bravo</div><div>None selected</div></div>`;

    morphBtn.disabled = !(selectedA && selectedB);
  }

  // ---------- preview helpers
  function clearPreview(){
    previewEl.innerHTML = `<div class="tiny-muted">Select two frogs to preview</div>`;
  }

  function showFallback(a,b){
    previewEl.innerHTML = `
      <div class="preview-fallback">
        <img src="/frog/${a}.png" alt="Alpha">
        <img src="/frog/${b}.png" alt="Bravo">
      </div>
      <div class="tiny-muted" style="margin-top:6px;text-align:center;">
        (Some layers missing — showing bases)
      </div>
    `;
  }

  function loadImg(url){
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function resolveLayer(type, value){
    const safeType = String(type).replace(/^\/+/, "");
    const safeVal  = String(value).replace(/^\/+/, "");
    const url = `/frog/build_files/${safeType}/${safeVal}.png`;
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

  // ---------- metamorph rules (from your old function)
  async function metamorph_build(token_a, token_b){
    clearPreview();
    jsonEl.textContent = "";

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
      return;
    }

    aRaw.attributes.forEach(attr => metadata_a[attr.trait_type] = attr.value);
    bRaw.attributes.forEach(attr => metadata_b[attr.trait_type] = attr.value);

    // Special frogs merge logic
    if (metadata_a.SpecialFrog !== "" || metadata_b.SpecialFrog !== "") {
      if (metadata_a.SpecialFrog !== "" && metadata_b.SpecialFrog !== "") {
        metadata_b.SpecialFrog = metadata_a.SpecialFrog + "/SpecialFrog/" + metadata_b.SpecialFrog;
        metadata_b.Trait = "";
      } else if (metadata_b.Frog !== "") {
        metadata_b.Trait = "SpecialFrog/" + metadata_a.SpecialFrog + "/" + metadata_b.Trait;
        metadata_b.SpecialFrog = metadata_a.SpecialFrog + "/" + metadata_b.Frog;
        metadata_b.Frog = "";
      } else if (metadata_a.Frog !== "") {
        metadata_b.Trait = "SpecialFrog/" + metadata_b.SpecialFrog + "/" + metadata_a.Trait;
        metadata_a.SpecialFrog = metadata_b.SpecialFrog;
        metadata_b.SpecialFrog = metadata_b.SpecialFrog + "/" + metadata_a.Frog;
        metadata_a.Frog = "";
      }
    }

    if (metadata_a.Frog !== "") metadata_c.Frog = metadata_b.Frog;
    else if (metadata_a.SpecialFrog !== "") metadata_c.SpecialFrog = "/bottom/" + metadata_a.SpecialFrog;

    if (metadata_b.Frog !== "") metadata_c.Subset = metadata_a.Frog;
    else if (metadata_b.SpecialFrog !== "") metadata_c.SpecialFrog = metadata_b.SpecialFrog;

    metadata_c.Trait     = metadata_b.Trait     || metadata_a.Trait     || "";
    metadata_c.Accessory = metadata_a.Accessory || metadata_b.Accessory || "";
    metadata_c.Eyes      = metadata_a.Eyes      || metadata_b.Eyes      || "";
    metadata_c.Hat       = metadata_a.Hat       || metadata_b.Hat       || "";
    metadata_c.Mouth     = metadata_a.Mouth     || metadata_b.Mouth     || "";

    const out = { attributes: [] };
    const traitQueue = [];

    // Order matches your build_trait stacking
    if (metadata_c.Frog !== "") {
      out.attributes.push({ trait_type:"Frog", value: metadata_c.Frog });
      traitQueue.push(["Frog", metadata_c.Frog]);
    } else if (metadata_c.SpecialFrog !== "") {
      out.attributes.push({ trait_type:"SpecialFrog", value: metadata_c.SpecialFrog });
      traitQueue.push(["SpecialFrog", metadata_c.SpecialFrog]);
    }

    if (metadata_c.Subset !== "") {
      out.attributes.push({ trait_type:"Subset", value: metadata_c.Subset });
      // NOTE: your folder is Frog/subSet/ (capital S)
      traitQueue.push(["Frog/subSet", metadata_c.Subset]);
    }

    if (metadata_c.Trait !== "") {
      out.attributes.push({ trait_type:"Trait", value: metadata_c.Trait });
      traitQueue.push(["Trait", metadata_c.Trait]);
    }
    if (metadata_c.Accessory !== "") {
      out.attributes.push({ trait_type:"Accessory", value: metadata_c.Accessory });
      traitQueue.push(["Accessory", metadata_c.Accessory]);
    }
    if (metadata_c.Eyes !== "") {
      out.attributes.push({ trait_type:"Eyes", value: metadata_c.Eyes });
      traitQueue.push(["Eyes", metadata_c.Eyes]);
    }
    if (metadata_c.Hat !== "") {
      out.attributes.push({ trait_type:"Hat", value: metadata_c.Hat });
      traitQueue.push(["Hat", metadata_c.Hat]);
    }
    if (metadata_c.Mouth !== "") {
      out.attributes.push({ trait_type:"Mouth", value: metadata_c.Mouth });
      traitQueue.push(["Mouth", metadata_c.Mouth]);
    }

    jsonEl.textContent = JSON.stringify(out.attributes, null, 2);

    const layers = [];
    for (const [type,val] of traitQueue){
      layers.push(await resolveLayer(type, val));
    }

    const ok = await renderComposite(layers);
    if (!ok) showFallback(token_a, token_b);

    return out;
  }

  // ---------- buttons
  morphBtn.addEventListener("click", () => {
    if (selectedA && selectedB) metamorph_build(selectedA, selectedB);
  });

  shuffleBtn.addEventListener("click", () => {
    selectedA = null; selectedB = null;
    renderGrid();
    clearPreview();
    jsonEl.textContent = "";
  });

  clearBtn.addEventListener("click", () => {
    selectedA = null; selectedB = null;
    syncUI();
    clearPreview();
    jsonEl.textContent = "";
  });

  // init
  renderGrid();
});
