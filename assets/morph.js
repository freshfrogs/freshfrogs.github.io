/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   - Buttons live at bottom of preview card
   - Generate = randomize A/B + preview
   - Morph = save current preview via saveCurrentMorph()
   - Auto-generate+preview on page load
*/

(function () {
  // stash last build so Morph button can save it
  let LAST_MORPH = null;

  document.addEventListener('DOMContentLoaded', () => {
    ffWireButtons();
    ffAutoGenerateOnLoad();

    const connectBtn = document.getElementById('hero-connect-wallet-btn');
    if (connectBtn && typeof connectWallet === 'function') {
      connectBtn.addEventListener('click', connectWallet);
    }
  });

  function ffWireButtons() {
    const genBtn = document.getElementById('morph-generate-btn');
    const saveBtn = document.getElementById('morph-save-btn');

    genBtn?.addEventListener('click', async () => {
      const { a, b } = ffPickTwoRandomTokens();
      ffSetInputs(a, b);
      LAST_MORPH = await ffMetamorphBuild(a, b);
    });

    saveBtn?.addEventListener('click', async () => {
      await FrogMorph();
    });
  }

  function ffAutoGenerateOnLoad() {
    const { a, b } = ffPickTwoRandomTokens();
    ffSetInputs(a, b);
    ffMetamorphBuild(a, b).then(res => {
      LAST_MORPH = res;
    });
  }

  // ------------------------
  // FrogMorph = SAVE wrapper
  // ------------------------

    async function FrogMorph() {
        const statusEl = document.getElementById('morph-status');

        if (!LAST_MORPH) {
            if (statusEl) statusEl.textContent = 'Nothing to save yet — click Generate first.';
            return;
        }

        const { tokenA, tokenB, newTraits, previewUrl } = LAST_MORPH;
        const address = ffGetConnectedAddress();

        // ✅ Call the test helper ONLY when we have real args
        if (typeof saveCurrentMorph === "function") {
            saveCurrentMorph({
            address,
            frogA: tokenA,
            frogB: tokenB,
            newTraits,
            previewUrl,
            value: null,
            signature: null
            });
        }

        if (typeof saveCurrentMorph !== 'function') {
            console.warn('saveCurrentMorph() not found on window. Preview built but not saved.');
            if (statusEl) statusEl.textContent = 'Save function not loaded.';
            return;
        }

        try {
            if (statusEl) statusEl.textContent = `Saving morph #${tokenA} / #${tokenB}…`;
            await saveCurrentMorph(
            address,
            tokenA,
            tokenB,
            newTraits,
            previewUrl,
            null, // value optional
            null  // signature optional
            );
            if (statusEl) statusEl.textContent = `Saved morph for #${tokenA} / #${tokenB}`;
        } catch (e) {
            console.error('saveCurrentMorph failed:', e);
            if (statusEl) statusEl.textContent = 'Save failed — check console.';
        }
    }

  window.FrogMorph = FrogMorph;

  // ------------------------
  // Morph Core Logic
  // ------------------------

  async function ffMetamorphBuild(tokenA, tokenB) {
    const statusEl = document.getElementById('morph-status');
    const card = document.querySelector('#morph-card-slot .recent_sale_card');

    try {
      const basePath =
        (typeof SOURCE_PATH !== 'undefined' && SOURCE_PATH) ||
        'https://freshfrogs.github.io/assets';

      if (typeof build_trait !== 'function') {
        throw new Error('build_trait() missing. Make sure ethereum-dapp.js loads before morph.js.');
      }
      if (!card) throw new Error('Preview card not found.');

      const previewCont = card.querySelector('#morph-preview');
      const traitsEl    = card.querySelector('#morph-traits');
      const nameEl      = card.querySelector('#morph-name');

      if (statusEl) statusEl.textContent = `Morphing Frog #${tokenA} / Frog #${tokenB}…`;

      // Apply Parent A background (removes black)
      ffApplyParentBackground(previewCont, tokenA);

      // Base maps
      const metadataA = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataB = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataC = { Frog:'', SpecialFrog:'', Subset:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };

      // Fetch A
      const aRaw = await (await fetch(`${basePath}/frog/json/${tokenA}.json`)).json();
      for (const attr of (aRaw.attributes || [])) {
        if (attr?.trait_type in metadataA) metadataA[attr.trait_type] = attr.value || '';
      }

      // Fetch B
      const bRaw = await (await fetch(`${basePath}/frog/json/${tokenB}.json`)).json();
      for (const attr of (bRaw.attributes || [])) {
        if (attr?.trait_type in metadataB) metadataB[attr.trait_type] = attr.value || '';
      }

      // ----- Legacy special frog rules -----
      if (metadataA.SpecialFrog !== '' || metadataB.SpecialFrog !== '') {
        if (metadataA.SpecialFrog !== '' && metadataB.SpecialFrog !== '') {
          metadataB.SpecialFrog = `${metadataA.SpecialFrog}/SpecialFrog/${metadataB.SpecialFrog}`;
          metadataB.Trait = '';
        } else if (metadataB.Frog !== '') {
          metadataB.Trait = `SpecialFrog/${metadataA.SpecialFrog}/${metadataB.Trait}`;
          metadataB.SpecialFrog = `${metadataA.SpecialFrog}/${metadataB.Frog}`;
          metadataB.Frog = '';
        } else if (metadataA.Frog !== '') {
          metadataB.Trait = `SpecialFrog/${metadataB.SpecialFrog}/${metadataA.Trait}`;
          metadataA.SpecialFrog = metadataB.SpecialFrog;
          metadataB.SpecialFrog = `${metadataB.SpecialFrog}/${metadataA.Frog}`;
          metadataA.Frog = '';
        }
      }

      // ----- Selection order -----
      if (metadataA.Frog !== '') metadataC.Frog = metadataB.Frog;
      else if (metadataA.SpecialFrog !== '') metadataC.SpecialFrog = `/bottom/${metadataA.SpecialFrog}`;

      if (metadataB.Frog !== '') metadataC.Subset = metadataA.Frog;
      else if (metadataB.SpecialFrog !== '') metadataC.SpecialFrog = metadataB.SpecialFrog;

      metadataC.Trait     = metadataB.Trait     || metadataA.Trait     || '';
      metadataC.Accessory = metadataA.Accessory || metadataB.Accessory || '';
      metadataC.Eyes      = metadataA.Eyes      || metadataB.Eyes      || '';
      metadataC.Hat       = metadataA.Hat       || metadataB.Hat       || '';
      metadataC.Mouth     = metadataA.Mouth     || metadataB.Mouth     || '';

      // ----- Build layers + metadata list -----
      previewCont.innerHTML = '';
      traitsEl.innerHTML = '';
      const newTraits = [];

      function addTrait(type, val, layerKey) {
        if (!val) return;
        newTraits.push({ trait_type: type, value: val });

        const p = document.createElement('p');
        p.className = 'frog-attr-text';
        p.textContent = `${type}: ${val}`;
        traitsEl.appendChild(p);

        if (layerKey) build_trait(layerKey, val, 'morph-preview');
      }

      if (metadataC.Frog !== '') {
        addTrait('Frog', metadataC.Frog, 'Frog');
      } else if (metadataC.SpecialFrog !== '') {
        addTrait('SpecialFrog', metadataC.SpecialFrog, 'SpecialFrog');
      }

      addTrait('Frog/subset', metadataC.Subset, 'Frog/subset');
      addTrait('Trait', metadataC.Trait, 'Trait');
      addTrait('Accessory', metadataC.Accessory, 'Accessory');
      addTrait('Eyes', metadataC.Eyes, 'Eyes');
      addTrait('Hat', metadataC.Hat, 'Hat');
      addTrait('Mouth', metadataC.Mouth, 'Mouth');

      // Update bottom-left name line
      if (nameEl) nameEl.textContent = `Morphed Preview #${tokenA} / #${tokenB}`;

      // Capture preview to PNG dataURL for save
      const previewUrl = await ffCapturePreviewDataUrl('morph-preview', tokenA);

      if (statusEl) statusEl.textContent = `Preview ready: #${tokenA} / #${tokenB}`;

      return { tokenA, tokenB, newTraits, previewUrl };

    } catch (err) {
      console.error('ffMetamorphBuild error:', err);
      if (statusEl) statusEl.textContent = `Morph failed: ${err.message || err}`;
      return null;
    }
  }

  // ------------------------
  // Helpers
  // ------------------------

  function ffPickTwoRandomTokens() {
    const max = 4040;
    let a = Math.floor(Math.random() * max) + 1;
    let b = Math.floor(Math.random() * max) + 1;
    while (b === a) b = Math.floor(Math.random() * max) + 1;
    return { a, b };
  }

  function ffSetInputs(a, b) {
    const aInput = document.getElementById('morph-a-input');
    const bInput = document.getElementById('morph-b-input');
    if (aInput) aInput.value = a;
    if (bInput) bInput.value = b;
  }

  function ffApplyParentBackground(container, tokenA) {
    if (!container) return;
    const imgUrl = `https://freshfrogs.github.io/frog/${tokenA}.png`;
    container.style.backgroundImage = `url("${imgUrl}")`;
    container.style.backgroundRepeat = 'no-repeat';
    container.style.backgroundSize = '500% 500%';
    container.style.backgroundPosition = 'bottom right';
    container.style.backgroundColor = 'transparent';
  }

  async function ffCapturePreviewDataUrl(containerId, tokenA) {
    const cont = document.getElementById(containerId);
    if (!cont) return `https://freshfrogs.github.io/frog/${tokenA}.png`;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const baseUrl = `https://freshfrogs.github.io/frog/${tokenA}.png`;
    await ffDrawImage(ctx, baseUrl, size);

    const imgs = Array.from(cont.querySelectorAll('img'));
    for (const imgEl of imgs) {
      const src = imgEl.getAttribute('src');
      if (!src) continue;
      await ffDrawImage(ctx, src, size);
    }

    return canvas.toDataURL('image/png');
  }

  function ffDrawImage(ctx, src, size) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { ctx.drawImage(img, 0, 0, size, size); resolve(); };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  function ffGetConnectedAddress() {
    if (window.FF_CONNECTED_ADDRESS) return window.FF_CONNECTED_ADDRESS;
    if (window.currentAccount) return window.currentAccount;
    if (window.userAddress) return window.userAddress;
    if (window.ethereum?.selectedAddress) return window.ethereum.selectedAddress;
    if (window.web3?.currentProvider?.selectedAddress) return window.web3.currentProvider.selectedAddress;
    return null;
  }

  // TESTING ONLY — does NOT call the Worker yet.
    // Builds the payload you *will* send and logs it.
    function saveCurrentMorph({
    address,
    frogA,
    frogB,
    newTraits = [],     // array of {trait_type,value} OR {type,value}
    previewUrl = null,  // image URL or base64
    value = null,       // optional EIP-712 value object
    signature = null    // optional signature string
    } = {}) {
    // Basic guards so you notice missing stuff in console
    if (!address) console.warn("[saveCurrentMorph] Missing address");
    if (frogA == null || frogB == null) console.warn("[saveCurrentMorph] Missing frogA/frogB");

    // Normalize traits into attributes[] your FrogCards expect
    const attributes = (newTraits || []).map(t => ({
        trait_type: t.trait_type || t.type || t.trait || "Unknown",
        value: t.value ?? t.val ?? ""
    }));

    const morphedMeta = {
        name: `Morphed Frog (${frogA} + ${frogB})`,
        image: previewUrl,
        attributes,
        frogA,
        frogB,
        createdBy: address
    };

    const payload = {
        address,
        frogA,
        frogB,
        morphedMeta,
        value,
        signature
    };

    console.log("🧪 SaveFrogMorph TEST payload:", payload);
    console.log("🧪 morphedMeta:", morphedMeta);
    console.table(attributes);

    return payload; // handy for quick inspection / unit tests
    }

})();
