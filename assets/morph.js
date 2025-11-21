/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   - Shows preview inside a real frog card
   - Uses Parent A background image zoomed to remove black default
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

      await ffMetamorphBuild(tokenA, tokenB);
    });

    clearBtn.addEventListener('click', () => {
      aInput.value = '';
      bInput.value = '';
      const slot = document.getElementById('morph-card-slot');
      if (slot) slot.innerHTML = '';
      if (statusEl) {
        statusEl.textContent =
          'Pick two Frogs to preview a metamorph. This does not mint — it only builds the combo preview + JSON.';
      }
    });
  }

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

      if (statusEl) statusEl.textContent = `Morphing Frog #${tokenA} + Frog #${tokenB}…`;
      if (!slot) throw new Error('morph-card-slot not found');

      // ------- create preview card (real FrogCard) -------
      slot.innerHTML = '';
      const card = ffCreateMorphCard(tokenA, tokenB);
      slot.appendChild(card);

      const previewCont = card.querySelector('#morph-preview');
      const jsonEl      = card.querySelector('#morph-json');
      const traitsEl    = card.querySelector('#morph-traits');

      // Apply Parent A background to layered container
      ffApplyParentBackground(previewCont, tokenA, basePath);

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

      // ----- Build layers + output attributes -----
      const out = { attributes: [] };
      previewCont.innerHTML = '';

      function pushAttr(type, val) {
        out.attributes.push({ trait_type: type, value: val });
        if (traitsEl) {
          const p = document.createElement('p');
          p.className = 'frog-attr-text';
          p.textContent = `${type}: ${val}`;
          traitsEl.appendChild(p);
        }
      }

      if (metadataC.Frog !== '') {
        pushAttr('Frog', metadataC.Frog);
        build_trait('Frog', metadataC.Frog, 'morph-preview');
      } else if (metadataC.SpecialFrog !== '') {
        pushAttr('SpecialFrog', metadataC.SpecialFrog);
        build_trait('SpecialFrog', metadataC.SpecialFrog, 'morph-preview');
      }

      if (metadataC.Subset !== '') {
        pushAttr('Frog/subset', metadataC.Subset);
        build_trait('Frog/subset', metadataC.Subset, 'morph-preview');
      }
      if (metadataC.Trait !== '') {
        pushAttr('Trait', metadataC.Trait);
        build_trait('Trait', metadataC.Trait, 'morph-preview');
      }
      if (metadataC.Accessory !== '') {
        pushAttr('Accessory', metadataC.Accessory);
        build_trait('Accessory', metadataC.Accessory, 'morph-preview');
      }
      if (metadataC.Eyes !== '') {
        pushAttr('Eyes', metadataC.Eyes);
        build_trait('Eyes', metadataC.Eyes, 'morph-preview');
      }
      if (metadataC.Hat !== '') {
        pushAttr('Hat', metadataC.Hat);
        build_trait('Hat', metadataC.Hat, 'morph-preview');
      }
      if (metadataC.Mouth !== '') {
        pushAttr('Mouth', metadataC.Mouth);
        build_trait('Mouth', metadataC.Mouth, 'morph-preview');
      }

      if (jsonEl) jsonEl.textContent = JSON.stringify(out.attributes, null, 2);

      if (statusEl) statusEl.textContent = `Preview ready: Frog #${tokenA} + Frog #${tokenB}`;
      return out;

    } catch (err) {
      console.error('ffMetamorphBuild error:', err);
      if (statusEl) statusEl.textContent = `Morph failed: ${err.message || err}`;
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
        <div class="sale_card_price">#${tokenA} + #${tokenB}</div>
      </div>

      <div id="morph-preview" class="frog_img_cont"></div>

      <div class="recent_sale_properties" id="morph-traits">
        <!-- trait <p> lines injected here -->
      </div>

      <pre id="morph-json" class="morph-json" style="margin:8px; font-size:0.75rem; white-space:pre-wrap;">// morphed attributes will appear here</pre>
    `;
    return card;
  }

  /**
   * Sets Parent A png as background and zooms to show mostly background color.
   * We keep your layered traits on top.
   */
  function ffApplyParentBackground(container, tokenA, basePath) {
    if (!container) return;
    const imgUrl = `https://freshfrogs.github.io/frog/${tokenA}.png`;

    container.style.backgroundImage = `url("${imgUrl}")`;
    container.style.backgroundRepeat = 'no-repeat';

    // Big zoom so you mostly see flat background
    container.style.backgroundSize = '500% 500%';

    // Background in repo pngs is usually clean in corners.
    // bottom right matches your CSS default, so keep it.
    container.style.backgroundPosition = 'bottom right';

    // override black base
    container.style.backgroundColor = 'transparent';
  }

  window.ffMetamorphBuild = ffMetamorphBuild;
})();
