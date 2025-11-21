/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   - Preview inside FrogCard
   - NO JSON output
   - Name line bottom-left with "/"
   - Parent A background zoomed
   - Preview Morph button ALSO calls saveCurrentMorph()
     using parameters exactly as required (function not edited)
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    ffInitMorphPanel();

    const connectBtn = document.getElementById('hero-connect-wallet-btn');
    if (connectBtn && typeof connectWallet === 'function') {
      connectBtn.addEventListener('click', connectWallet);
    }
  });

  function ffInitMorphPanel() {
    const aInput   = document.getElementById('morph-a-input');
    const bInput   = document.getElementById('morph-b-input');
    const runBtn   = document.getElementById('morph-run-btn');
    const clearBtn = document.getElementById('morph-clear-btn');
    const statusEl = document.getElementById('morph-status');

    if (!runBtn || !aInput || !bInput) return;

    runBtn.addEventListener('click', async () => {
      const tokenA = parseInt(aInput.value, 10);
      const tokenB = parseInt(bInput.value, 10);

      if (!Number.isInteger(tokenA) || !Number.isInteger(tokenB)) {
        if (statusEl) statusEl.textContent = 'Enter two valid token IDs.';
        return;
      }
      if (tokenA === tokenB) {
        if (statusEl) statusEl.textContent = 'Pick two different frogs.';
        return;
      }

      await ffMetamorphBuildAndSave(tokenA, tokenB);
    });

    clearBtn.addEventListener('click', () => {
      aInput.value = '';
      bInput.value = '';
      const slot = document.getElementById('morph-card-slot');
      if (slot) slot.innerHTML = '';
      if (statusEl) {
        statusEl.textContent =
          'Pick two Frogs to preview a metamorph. This does not mint — it only builds the combo preview + metadata list.';
      }
    });
  }

  // ------------------------
  // Build + Save wrapper
  // ------------------------

  async function ffMetamorphBuildAndSave(tokenA, tokenB) {
    const statusEl = document.getElementById('morph-status');

    // 1) build preview + traits
    const result = await ffMetamorphBuild(tokenA, tokenB);
    if (!result) return;

    const { newTraits, previewUrl } = result;

    // 2) get address
    const address = ffGetConnectedAddress();

    // 3) call your save function EXACTLY as-is
    if (typeof saveCurrentMorph === 'function') {
      try {
        await saveCurrentMorph(
          address,
          tokenA,
          tokenB,
          newTraits,
          previewUrl,
          null,   // value optional
          null    // signature optional
        );
        if (statusEl) statusEl.textContent = `Saved morph for #${tokenA} / #${tokenB}`;
      } catch (e) {
        console.error('saveCurrentMorph failed:', e);
        if (statusEl) statusEl.textContent = `Preview ready (save failed — check console)`;
      }
    } else {
      console.warn('saveCurrentMorph() not found on window. Preview built but not saved.');
      if (statusEl) statusEl.textContent = `Preview ready (save function not loaded)`;
    }
  }

  // ------------------------
  // Morph Core Logic
  // ------------------------

  async function ffMetamorphBuild(tokenA, tokenB) {
    const statusEl = document.getElementById('morph-status');
    const slot = document.getElementById('morph-card-slot');

    try {
      const basePath =
        (typeof SOURCE_PATH !== 'undefined' && SOURCE_PATH) ||
        'https://freshfrogs.github.io/assets';

      if (typeof build_trait !== 'function') {
        throw new Error('build_trait() missing. Make sure ethereum-dapp.js loads before morph.js.');
      }

      if (statusEl) statusEl.textContent = `Morphing Frog #${tokenA} / Frog #${tokenB}…`;
      if (!slot) throw new Error('morph-card-slot not found');

      // ------- create preview card (real FrogCard) -------
      slot.innerHTML = '';
      const card = ffCreateMorphCard(tokenA, tokenB);
      slot.appendChild(card);

      const previewCont = card.querySelector('#morph-preview');
      const traitsEl    = card.querySelector('#morph-traits');

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
        if (traitsEl) {
          const p = document.createElement('p');
          p.className = 'frog-attr-text';
          p.textContent = `${type}: ${val}`;
          traitsEl.appendChild(p);
        }
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

      // Capture preview to a PNG dataURL for previewUrl param
      const previewUrl = await ffCapturePreviewDataUrl('morph-preview', tokenA);

      if (statusEl) statusEl.textContent = `Preview ready: #${tokenA} / #${tokenB}`;

      return { newTraits, previewUrl };

    } catch (err) {
      console.error('ffMetamorphBuild error:', err);
      if (statusEl) statusEl.textContent = `Morph failed: ${err.message || err}`;
      return null;
    }
  }

  // ------------------------
  // UI Helpers
  // ------------------------

  function ffCreateMorphCard(tokenA, tokenB) {
    const card = document.createElement('div');
    card.className = 'recent_sale_card';
    card.style.margin = '0 auto';

    card.innerHTML = `
      <div class="recent_sale_header">
        <div class="sale_card_title">Morphed Preview</div>
      </div>

      <div id="morph-preview" class="frog_img_cont"></div>

      <div class="frog_name" style="margin: 6px 8px 2px; text-align:left;">
        Morphed Preview #${tokenA} / #${tokenB}
      </div>

      <div class="recent_sale_properties" id="morph-traits"></div>
    `;
    return card;
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

  // ------------------------
  // Preview Capture (dataURL)
  // ------------------------

  /**
   * Builds a PNG dataURL from the layered preview container.
   * Draw order = background (Parent A PNG) then each overlay image in DOM order.
   */
  async function ffCapturePreviewDataUrl(containerId, tokenA) {
    const cont = document.getElementById(containerId);
    if (!cont) return `https://freshfrogs.github.io/frog/${tokenA}.png`;

    const size = 256; // your frog frames are 256x256
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw base (Parent A PNG)
    const baseUrl = `https://freshfrogs.github.io/frog/${tokenA}.png`;
    await ffDrawImage(ctx, baseUrl, size);

    // Draw overlays (traits) in order
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
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        resolve();
      };
      img.onerror = () => resolve(); // fail soft
      img.src = src;
    });
  }

  // ------------------------
  // Address Helper
  // ------------------------

  function ffGetConnectedAddress() {
    // Prefer any explicit globals your site.js might set
    if (window.FF_CONNECTED_ADDRESS) return window.FF_CONNECTED_ADDRESS;
    if (window.currentAccount) return window.currentAccount;
    if (window.userAddress) return window.userAddress;

    // MetaMask / EIP-1193
    if (window.ethereum?.selectedAddress) return window.ethereum.selectedAddress;

    // Web3 fallback
    if (window.web3?.currentProvider?.selectedAddress) {
      return window.web3.currentProvider.selectedAddress;
    }

    return null; // allowed by your save function
  }

  window.ffMetamorphBuildAndSave = ffMetamorphBuildAndSave;
})();
