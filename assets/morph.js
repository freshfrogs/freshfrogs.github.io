/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   - Buttons live at bottom of preview card
   - Generate = randomize A/B + preview
   - Morph = sign + save current preview via SaveFrogMorph()
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
    const genBtn  = document.getElementById('morph-generate-btn');
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
  // FrogMorph = SIGN + SAVE wrapper
  // ------------------------
  async function FrogMorph() {
    const statusEl = document.getElementById('morph-status');

    if (!LAST_MORPH) {
      if (statusEl) statusEl.textContent = 'Nothing to save yet — click Generate first.';
      return;
    }

    if (typeof SaveFrogMorph !== 'function') {
      console.warn('SaveFrogMorph() not found on window. Preview built but not saved.');
      if (statusEl) statusEl.textContent = 'Save function not loaded.';
      return;
    }

    const { tokenA, tokenB, newTraits, previewUrl } = LAST_MORPH;

    // Ensure numeric token IDs
    const frogA = (typeof parseTokenId === 'function') ? parseTokenId(tokenA) : Number(tokenA);
    const frogB = (typeof parseTokenId === 'function') ? parseTokenId(tokenB) : Number(tokenB);

    if (frogA == null || frogB == null || !Number.isFinite(frogA) || !Number.isFinite(frogB)) {
      console.warn('Bad morph token IDs:', tokenA, tokenB);
      if (statusEl) statusEl.textContent = 'Invalid token IDs for morph.';
      return;
    }

    const address = ffGetConnectedAddress();
    if (!address) {
      console.warn('No connected wallet address found.');
      if (statusEl) statusEl.textContent = 'Connect your wallet to save a morph.';
      return;
    }

    // ---- Ask user to sign intent ----
    if (statusEl) statusEl.textContent = 'Please sign the morph request in your wallet…';

    let signed = null;
    try {
      signed = await ffSignMorphIntent(address, frogA, frogB);
      if (!signed?.signature) throw new Error('Signature missing');
    } catch (err) {
      console.warn('Morph signature cancelled/failed:', err);
      if (statusEl) statusEl.textContent = 'Signature cancelled. Morph not saved.';
      return; // require signature for save
    }

    // ---- Save to Worker/KV ----
    if (statusEl) statusEl.textContent = `Saving morph for #${frogA} / #${frogB}…`;

    try {
      await SaveFrogMorph({
        address,
        frogA,
        frogB,
        newTraits,
        previewUrl,
        value: signed.value,
        signature: signed.signature
      });

      if (statusEl) {
        statusEl.textContent =
          `✅ Morph saved! It will show up with your owned frogs the next time you open Wallet.`;
      }
    } catch (err) {
      console.error('FrogMorph save failed:', err);
      if (statusEl) statusEl.textContent = 'Save failed. Check console.';
    }
  }

  window.FrogMorph = FrogMorph;

  // ------------------------
  // Wallet signature (EIP-712 typed data)
  // ------------------------
  async function ffSignMorphIntent(address, frogA, frogB) {
    if (!window.ethereum?.request) {
      throw new Error('No wallet found');
    }

    // chainId for domain
    let chainId = 1;
    try {
      const chainHex = await ethereum.request({ method: 'eth_chainId' });
      chainId = parseInt(chainHex, 16) || 1;
    } catch {}

    const nonce = Math.floor(Math.random() * 1e9);
    const timestamp = Math.floor(Date.now() / 1000);

    const domain = {
      name: "FreshFrogs Morph Test",
      version: "1",
      chainId,
      verifyingContract: (typeof FF_COLLECTION_ADDRESS !== 'undefined')
        ? FF_COLLECTION_ADDRESS
        : "0x0000000000000000000000000000000000000000"
    };

    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      MorphIntent: [
        { name: "user", type: "address" },
        { name: "frogA", type: "uint256" },
        { name: "frogB", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "timestamp", type: "uint256" }
      ]
    };

    const value = {
      user: address,
      frogA,
      frogB,
      nonce,
      timestamp
    };

    const typedData = JSON.stringify({
      domain,
      types,
      primaryType: "MorphIntent",
      message: value
    });

    const signature = await ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [address, typedData]
    });

    return { value, signature };
  }

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
      metadataC.Eyes      = metadataA.Eyes      || metadataB.Eeyes     || '';
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
    if (window.user_address) return window.user_address;      // connectWallet sets this
    if (window.currentAccount) return window.currentAccount;
    if (window.userAddress) return window.userAddress;
    if (window.ethereum?.selectedAddress) return window.ethereum.selectedAddress;
    if (window.web3?.currentProvider?.selectedAddress) return window.web3.currentProvider.selectedAddress;
    return null;
  }

  // ---------------------------------------------------
  // REAL SAVE — sends morphed metadata to your Worker KV
  // (unchanged from your version)
  // ---------------------------------------------------
  async function SaveFrogMorph({
    address,
    frogA,
    frogB,
    newTraits = [],
    previewUrl = null,
    value = null,
    signature = null
  } = {}) {
    if (typeof FF_MORPH_WORKER_URL === 'undefined' || !FF_MORPH_WORKER_URL) {
      console.warn("[SaveFrogMorph] Missing FF_MORPH_WORKER_URL");
      return null;
    }
    if (!address || frogA == null || frogB == null) {
      console.warn("[SaveFrogMorph] Missing address/frogA/frogB");
      return null;
    }

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

    try {
      const res = await fetch(FF_MORPH_WORKER_URL + "/saveMorph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("[SaveFrogMorph] Worker error:", res.status, out);
        throw new Error(out.error || "SaveMorph failed");
      }

      console.log("✅ SaveFrogMorph saved:", out);
      return out;
    } catch (err) {
      console.error("❌ SaveFrogMorph failed:", err);
      return null;
    }
  }

  window.SaveFrogMorph = SaveFrogMorph;

})();
