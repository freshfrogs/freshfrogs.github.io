/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   - Preview inside FrogCard
   - NO JSON output
   - Name line bottom-left with "/"
   - Parent A background zoomed
   - Preview button can either:
       A) use manual inputs (default)
       B) randomize owned+staked frogs if button says "Generate"
   - Morph button (if labeled / data-mode = "morph") saves via saveCurrentMorph()
     using parameters exactly as required (function not edited)
*/

(function () {
  // ------------------------
  // Module state
  // ------------------------
  let LAST_PAIR = null;      // { tokenA, tokenB }
  let LAST_BUILD = null;     // { newTraits, previewUrl }
  let ELIGIBLE_IDS = [];     // owned + staked for user

  document.addEventListener('DOMContentLoaded', () => {
    ffInitMorphPanel();

    const connectBtn = document.getElementById('hero-connect-wallet-btn');
    if (connectBtn && typeof connectWallet === 'function') {
      connectBtn.addEventListener('click', async () => {
        await connectWallet();
        // refresh eligible list after connect
        ELIGIBLE_IDS = await ffGetEligibleTokenIds();
      });
    }

    // preload eligible list if already connected
    ffGetEligibleTokenIds().then(ids => {
      ELIGIBLE_IDS = ids;

      // Auto-generate on load IF we have >= 2 eligible frogs
      if (ids.length >= 2) {
        ffGenerateRandomMorph();
      } else {
        const statusEl = document.getElementById('morph-status');
        if (statusEl) {
          statusEl.textContent =
            'Connect wallet to generate a morph from your owned/staked frogs.';
        }
      }
    });
  });

  function ffInitMorphPanel() {
    const aInput   = document.getElementById('morph-a-input');
    const bInput   = document.getElementById('morph-b-input');
    const runBtn   = document.getElementById('morph-run-btn');
    const clearBtn = document.getElementById('morph-clear-btn');
    const statusEl = document.getElementById('morph-status');

    if (!runBtn) return;

    runBtn.addEventListener('click', async () => {
      // Decide mode based on data-mode or visible label
      const mode =
        (runBtn.dataset.mode || runBtn.textContent || '').trim().toLowerCase();

      if (mode === 'generate') {
        await ffGenerateRandomMorph();
        return;
      }

      // Default: manual preview from inputs
      const tokenA = parseInt(aInput?.value, 10);
      const tokenB = parseInt(bInput?.value, 10);

      if (!Number.isInteger(tokenA) || !Number.isInteger(tokenB)) {
        if (statusEl) statusEl.textContent = 'Enter two valid token IDs.';
        return;
      }
      if (tokenA === tokenB) {
        if (statusEl) statusEl.textContent = 'Pick two different frogs.';
        return;
      }

      LAST_PAIR = { tokenA, tokenB };
      LAST_BUILD = await ffMetamorphBuild(tokenA, tokenB);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const mode =
          (clearBtn.dataset.mode || clearBtn.textContent || '').trim().toLowerCase();

        // If this button is acting as "Morph", then save current preview
        if (mode === 'morph') {
          await ffSaveLastMorph();
          return;
        }

        // Default: clear UI
        if (aInput) aInput.value = '';
        if (bInput) bInput.value = '';

        const slot = document.getElementById('morph-card-slot');
        if (slot) slot.innerHTML = '';

        LAST_PAIR = null;
        LAST_BUILD = null;

        if (statusEl) {
          statusEl.textContent =
            'Pick two Frogs to preview a metamorph. This does not mint — it only builds the combo preview + metadata list.';
        }
      });
    }
  }

  // ------------------------
  // Randomize from owned+staked
  // ------------------------

  async function ffGenerateRandomMorph() {
    const statusEl = document.getElementById('morph-status');

    // refresh eligible list each time in case wallet changed
    ELIGIBLE_IDS = await ffGetEligibleTokenIds();

    if (ELIGIBLE_IDS.length < 2) {
      if (statusEl) {
        statusEl.textContent =
          'You need at least 2 owned or staked frogs to generate a morph.';
      }
      return;
    }

    const { tokenA, tokenB } = ffPickRandomPair(ELIGIBLE_IDS);
    LAST_PAIR = { tokenA, tokenB };

    // If you still have inputs, keep them in sync visually
    const aInput = document.getElementById('morph-a-input');
    const bInput = document.getElementById('morph-b-input');
    if (aInput) aInput.value = tokenA;
    if (bInput) bInput.value = tokenB;

    LAST_BUILD = await ffMetamorphBuild(tokenA, tokenB);
  }

  function ffPickRandomPair(ids) {
    const aIdx = Math.floor(Math.random() * ids.length);
    let bIdx = Math.floor(Math.random() * ids.length);
    if (ids.length > 1) {
      while (bIdx === aIdx) bIdx = Math.floor(Math.random() * ids.length);
    }
    return { tokenA: ids[aIdx], tokenB: ids[bIdx] };
  }

  async function ffGetEligibleTokenIds() {
    const address = ffGetConnectedAddress();
    if (!address) return [];

    let ownedIds = [];
    let stakedIds = [];

    try {
      if (typeof ffFetchOwnedFrogs === 'function') {
        const ownedNfts = await ffFetchOwnedFrogs(address);
        ownedIds = ownedNfts
          .map(n => ffParseTokenId(n.tokenId || n.id?.tokenId))
          .filter(v => v != null);
      }
    } catch (e) {
      console.warn('ffGetEligibleTokenIds: owned fetch failed', e);
    }

    try {
      if (typeof ffFetchStakedTokenIds === 'function') {
        stakedIds = (await ffFetchStakedTokenIds(address))
          .map(v => ffParseTokenId(v))
          .filter(v => v != null);
      }
    } catch (e) {
      console.warn('ffGetEligibleTokenIds: staked fetch failed', e);
    }

    const set = new Set([...ownedIds, ...stakedIds]);
    return Array.from(set).sort((a, b) => a - b);
  }

  function ffParseTokenId(raw) {
    if (raw == null) return null;
    if (typeof raw === 'number') return raw;

    // prefer your global parseTokenId if it exists
    if (typeof parseTokenId === 'function') {
      const v = parseTokenId(raw);
      if (v != null) return v;
    }

    // hex string -> int
    if (typeof raw === 'string') {
      const s = raw.startsWith('0x') ? raw : `0x${raw}`;
      try {
        const v = parseInt(s, 16);
        return Number.isFinite(v) ? v : null;
      } catch {}
      try {
        const v2 = parseInt(raw, 10);
        return Number.isFinite(v2) ? v2 : null;
      } catch {}
    }

    // object w tokenId
    if (typeof raw === 'object') {
      return ffParseTokenId(raw.tokenId ?? raw.id?.tokenId);
    }

    return null;
  }

  // ------------------------
  // Save wrapper (uses LAST_PAIR)
  // ------------------------

  async function ffSaveLastMorph() {
    const statusEl = document.getElementById('morph-status');

    if (!LAST_PAIR?.tokenA || !LAST_PAIR?.tokenB || !LAST_BUILD) {
      if (statusEl) statusEl.textContent = 'Nothing to save yet. Generate a preview first.';
      return;
    }

    const { tokenA, tokenB } = LAST_PAIR;
    const { newTraits, previewUrl } = LAST_BUILD;
    const address = ffGetConnectedAddress();

    if (typeof saveCurrentMorph === 'function') {
      try {
        await saveCurrentMorph(
          address,
          tokenA,
          tokenB,
          newTraits,
          previewUrl,
          null,
          null
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

      // Ensure card exists
      let card = slot.querySelector('.recent_sale_card');
      if (!card) {
        card = ffCreateMorphCard(tokenA, tokenB);
        slot.innerHTML = '';
        slot.appendChild(card);
      } else {
        // update title line if card already there
        const nameLine = card.querySelector('.frog_name');
        if (nameLine) nameLine.textContent = `Morphed Preview #${tokenA} / #${tokenB}`;
      }

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

      const out = { newTraits, previewUrl };
      LAST_BUILD = out;
      return out;

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

      <!-- Buttons slot at bottom of the card (if your HTML injects buttons in here) -->
      <div class="recent_sale_links" id="morph-card-buttons"></div>
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
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  // ------------------------
  // Address Helper
  // ------------------------

  function ffGetConnectedAddress() {
    if (window.FF_CONNECTED_ADDRESS) return window.FF_CONNECTED_ADDRESS;
    if (window.currentAccount) return window.currentAccount;
    if (window.userAddress) return window.userAddress;
    if (window.ethereum?.selectedAddress) return window.ethereum.selectedAddress;
    if (window.web3?.currentProvider?.selectedAddress) {
      return window.web3.currentProvider.selectedAddress;
    }
    return null;
  }

  // Expose helpers just in case you want console access
  window.ffGenerateRandomMorph = ffGenerateRandomMorph;
  window.ffSaveLastMorph = ffSaveLastMorph;
  window.ffMetamorphBuild = ffMetamorphBuild;
})();
