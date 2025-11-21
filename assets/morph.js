/* assets/morph.js
   FreshFrogs Morph / Metamorph logic
   Standalone for morph.html, but relies on ethereum-dapp.js for build_trait().
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    ffInitMorphPanel();

    // If your site.js exposes a connect function, keep the button behavior consistent.
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn && typeof connectWallet === 'function') {
      connectBtn.addEventListener('click', connectWallet);
    }
  });

  // ------------------------
  // Morph Panel Wiring
  // ------------------------

  function ffInitMorphPanel() {
    const aInput   = document.getElementById('morph-a-input');
    const bInput   = document.getElementById('morph-b-input');
    const runBtn   = document.getElementById('morph-run-btn');
    const clearBtn = document.getElementById('morph-clear-btn');
    const preview  = document.getElementById('morph-preview');
    const jsonEl   = document.getElementById('morph-json');
    const statusEl = document.getElementById('morph-status');

    if (!runBtn || !aInput || !bInput || !preview || !jsonEl) return;

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

      await ffMetamorphBuild(tokenA, tokenB, 'morph-preview', jsonEl, statusEl);
    });

    clearBtn.addEventListener('click', () => {
      aInput.value = '';
      bInput.value = '';
      preview.innerHTML = '';
      jsonEl.textContent = '// morphed attributes will appear here';
      if (statusEl) {
        statusEl.textContent =
          'Pick two Frogs to preview a metamorph. This does not mint — it only builds the combo preview + JSON.';
      }
    });
  }

  // ------------------------
  // Morph Core Logic
  // ------------------------

  /**
   * ffMetamorphBuild(tokenA, tokenB, locationId, jsonEl, statusEl)
   * Matches old ethereum-dapp.js metamorph_build behavior:
   *  - fetch both metadata json
   *  - merge attributes with special-frog rules
   *  - build layered preview via build_trait()
   *  - output attributes JSON
   */
  async function ffMetamorphBuild(tokenA, tokenB, locationId, jsonEl, statusEl) {
    try {
      // SOURCE_PATH is defined in your current site.js in most builds.
      // If not, fall back to your GitHub Pages assets base.
      const basePath =
        (typeof SOURCE_PATH !== 'undefined' && SOURCE_PATH) ||
        'https://freshfrogs.github.io/assets';

      if (typeof build_trait !== 'function') {
        throw new Error('build_trait() missing. Make sure ethereum-dapp.js is loaded before morph.js.');
      }

      const location = document.getElementById(locationId);
      if (!location) throw new Error(`Preview container #${locationId} not found.`);
      location.innerHTML = '';

      if (statusEl) statusEl.textContent = `Morphing Frog #${tokenA} + Frog #${tokenB}…`;

      // Base maps (legacy shape)
      const metadataA = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataB = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataC = { Frog:'', SpecialFrog:'', Subset:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };

      // Fetch Alpha metadata
      const aRaw = await (await fetch(`${basePath}/frog/json/${tokenA}.json`)).json();
      for (const attr of (aRaw.attributes || [])) {
        if (attr?.trait_type in metadataA) metadataA[attr.trait_type] = attr.value || '';
      }

      // Fetch Bravo metadata
      const bRaw = await (await fetch(`${basePath}/frog/json/${tokenB}.json`)).json();
      for (const attr of (bRaw.attributes || [])) {
        if (attr?.trait_type in metadataB) metadataB[attr.trait_type] = attr.value || '';
      }

      // ----- Legacy Special Frog merge rules -----
      if (metadataA.SpecialFrog !== '' || metadataB.SpecialFrog !== '') {

        // Base Special + Sub Special
        if (metadataA.SpecialFrog !== '' && metadataB.SpecialFrog !== '') {
          metadataB.SpecialFrog = `${metadataA.SpecialFrog}/SpecialFrog/${metadataB.SpecialFrog}`;
          metadataB.Trait = '';
        }

        // Base Special Frog (A is special, B normal)
        else if (metadataB.Frog !== '') {
          metadataB.Trait = `SpecialFrog/${metadataA.SpecialFrog}/${metadataB.Trait}`;
          metadataB.SpecialFrog = `${metadataA.SpecialFrog}/${metadataB.Frog}`;
          metadataB.Frog = '';
        }

        // Sub Special Frog (B is special, A normal)
        else if (metadataA.Frog !== '') {
          metadataB.Trait = `SpecialFrog/${metadataB.SpecialFrog}/${metadataA.Trait}`;
          metadataA.SpecialFrog = metadataB.SpecialFrog;
          metadataB.SpecialFrog = `${metadataB.SpecialFrog}/${metadataA.Frog}`;
          metadataA.Frog = '';
        }
      }

      // ----- Legacy attribute selection order -----
      if (metadataA.Frog !== '') {
        metadataC.Frog = metadataB.Frog;
      } else if (metadataA.SpecialFrog !== '') {
        metadataC.SpecialFrog = `/bottom/${metadataA.SpecialFrog}`;
      }

      if (metadataB.Frog !== '') {
        metadataC.Subset = metadataA.Frog;
      } else if (metadataB.SpecialFrog !== '') {
        metadataC.SpecialFrog = metadataB.SpecialFrog;
      }

      if (metadataB.Trait !== '') metadataC.Trait = metadataB.Trait;
      else if (metadataA.Trait !== '') metadataC.Trait = metadataA.Trait;

      if (metadataA.Accessory !== '') metadataC.Accessory = metadataA.Accessory;
      else if (metadataB.Accessory !== '') metadataC.Accessory = metadataB.Accessory;

      if (metadataA.Eyes !== '') metadataC.Eyes = metadataA.Eyes;
      else if (metadataB.Eyes !== '') metadataC.Eyes = metadataB.Eyes;

      if (metadataA.Hat !== '') metadataC.Hat = metadataA.Hat;
      else if (metadataB.Hat !== '') metadataC.Hat = metadataB.Hat;

      if (metadataA.Mouth !== '') metadataC.Mouth = metadataA.Mouth;
      else if (metadataB.Mouth !== '') metadataC.Mouth = metadataB.Mouth;

      // ----- Build new attributes + layered preview -----
      const out = { attributes: [] };

      // FROG A or SPECIALFROG
      if (metadataC.Frog !== '') {
        out.attributes.push({ trait_type: 'Frog', value: metadataC.Frog });
        build_trait('Frog', metadataC.Frog, locationId);
      } else if (metadataC.SpecialFrog !== '') {
        out.attributes.push({ trait_type: 'SpecialFrog', value: metadataC.SpecialFrog });
        build_trait('SpecialFrog', metadataC.SpecialFrog, locationId);
      }

      // SUBSET (frog B)
      if (metadataC.Subset !== '') {
        out.attributes.push({ trait_type: 'Frog/subset', value: metadataC.Subset });
        build_trait('Frog/subset', metadataC.Subset, locationId);
      }

      // TRAIT
      if (metadataC.Trait !== '') {
        out.attributes.push({ trait_type: 'Trait', value: metadataC.Trait });
        build_trait('Trait', metadataC.Trait, locationId);
      }

      // ACCESSORY
      if (metadataC.Accessory !== '') {
        out.attributes.push({ trait_type: 'Accessory', value: metadataC.Accessory });
        build_trait('Accessory', metadataC.Accessory, locationId);
      }

      // EYES
      if (metadataC.Eyes !== '') {
        out.attributes.push({ trait_type: 'Eyes', value: metadataC.Eyes });
        build_trait('Eyes', metadataC.Eyes, locationId);
      }

      // HAT
      if (metadataC.Hat !== '') {
        out.attributes.push({ trait_type: 'Hat', value: metadataC.Hat });
        build_trait('Hat', metadataC.Hat, locationId);
      }

      // MOUTH
      if (metadataC.Mouth !== '') {
        out.attributes.push({ trait_type: 'Mouth', value: metadataC.Mouth });
        build_trait('Mouth', metadataC.Mouth, locationId);
      }

      // Output JSON
      const jsonString = JSON.stringify(out.attributes, null, 2);
      jsonEl.textContent = jsonString;

      if (statusEl) statusEl.textContent = `Preview ready: Frog #${tokenA} + Frog #${tokenB}`;
      return out;

    } catch (err) {
      console.error('ffMetamorphBuild error:', err);
      if (statusEl) statusEl.textContent = `Morph failed: ${err.message || err}`;
    }
  }

  // Expose for console/testing
  window.ffMetamorphBuild = ffMetamorphBuild;

})();
