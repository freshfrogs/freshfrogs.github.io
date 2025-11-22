/* assets/morph.js
   FreshFrogs Morph / Metamorph logic

   NEW:
   - Loads user's owned + staked frogs into a 128x128 gallery
   - User selects 2 frogs from gallery to build preview
   - Auto-previews morph on 2nd selection
   - Generate button = manual preview fallback
   - Morph button = sign + save
*/

(function () {
  let LAST_MORPH = null;
  let SELECTED = []; // [tokenIdA, tokenIdB]

  document.addEventListener('DOMContentLoaded', () => {
    ffWireButtons();
    ffEnsureGalleryContainer();
    ffLoadUserGalleryOnStart();

    const connectBtn = document.getElementById('hero-connect-wallet-btn');
    if (connectBtn && typeof connectWallet === 'function') {
      connectBtn.addEventListener('click', async () => {
        await connectWallet();
        ffLoadUserGalleryOnStart(true);
      });
    }
  });

  // ------------------------
  // Buttons
  // ------------------------
  function ffWireButtons() {
    const genBtn  = document.getElementById('morph-generate-btn');
    const saveBtn = document.getElementById('morph-save-btn');

    // Manual preview fallback if they type IDs
    genBtn?.addEventListener('click', async () => {
      const a = parseTokenId(document.getElementById('morph-a-input')?.value);
      const b = parseTokenId(document.getElementById('morph-b-input')?.value);
      if (a == null || b == null) return ffSetMorphStatus('Pick/select two frogs first.');
      LAST_MORPH = await ffMetamorphBuild(a, b);
    });

    saveBtn?.addEventListener('click', async () => {
      await FrogMorph();
    });
  }

  // ------------------------
  // Gallery container
  // ------------------------
    function ffEnsureGalleryContainer() {
    if (document.getElementById('morph-token-gallery')) return;

    const slot = document.getElementById('morph-card-slot');
    const gallery = document.createElement('div');
    gallery.id = 'morph-token-gallery';
    gallery.className = 'morph-gallery';

    if (slot?.parentElement) {
        // ✅ Insert gallery AFTER the preview card slot
        slot.parentElement.insertBefore(gallery, slot.nextSibling);
    } else {
        document.body.appendChild(gallery);
    }
    }

  // ------------------------
  // Load user's owned + staked frogs
  // ------------------------
  async function ffLoadUserGalleryOnStart(force = false) {
    const address = ffGetConnectedAddress();
    if (!address) {
      ffSetMorphStatus('Connect wallet to load your frogs.');
      return;
    }

    ffSetMorphStatus('Loading your frogs…');

    const gallery = document.getElementById('morph-token-gallery');
    if (!gallery) return;

    if (!force && gallery.dataset.loadedFor === address.toLowerCase()) return;

    gallery.dataset.loadedFor = address.toLowerCase();
    gallery.innerHTML = '';

    try {
      const [ownedIds, stakedIds] = await Promise.all([
        ffFetchOwnedTokenIds(address),
        ffFetchStakedTokenIds(address)
      ]);

      const allIds = Array.from(new Set([...ownedIds, ...stakedIds]))
        .filter(id => id != null)
        .sort((a,b) => a-b);

      if (!allIds.length) {
        ffSetMorphStatus('No owned or staked frogs found.');
        return;
      }

      ffRenderGallery(allIds);
      ffSetMorphStatus('Select two frogs to morph.');

    } catch (err) {
      console.warn('ffLoadUserGalleryOnStart failed:', err);
      ffSetMorphStatus('Failed to load your frogs.');
    }
  }

  function ffRenderGallery(tokenIds) {
    const gallery = document.getElementById('morph-token-gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    for (const id of tokenIds) {
      const btn = document.createElement('button');
      btn.className = 'morph-thumb';
      btn.dataset.tokenId = id;

      btn.innerHTML = `
        <img
          src="https://freshfrogs.github.io/frog/${id}.png"
          width="128"
          height="128"
          alt="Frog #${id}"
          loading="lazy"
        />
        <div class="morph-thumb-label">#${id}</div>
      `;

      btn.addEventListener('click', () => ffToggleSelect(id, btn));
      gallery.appendChild(btn);
    }
  }

  function ffToggleSelect(tokenId, btnEl) {
    const idx = SELECTED.indexOf(tokenId);

    if (idx >= 0) {
      SELECTED.splice(idx, 1);
      btnEl.classList.remove('selected');
    } else {
      if (SELECTED.length >= 2) {
        // reset old selection if they pick a 3rd
        SELECTED = [];
        document.querySelectorAll('.morph-thumb.selected')
          .forEach(el => el.classList.remove('selected'));
      }
      SELECTED.push(tokenId);
      btnEl.classList.add('selected');
    }

    // update inputs
    const aInput = document.getElementById('morph-a-input');
    const bInput = document.getElementById('morph-b-input');
    if (aInput) aInput.value = SELECTED[0] ?? '';
    if (bInput) bInput.value = SELECTED[1] ?? '';

    // auto-preview on 2nd selection
    if (SELECTED.length === 2) {
      ffMetamorphBuild(SELECTED[0], SELECTED[1]).then(res => {
        LAST_MORPH = res;
      });
    }
  }

  // ------------------------
  // SIGN + SAVE
  // ------------------------
  async function FrogMorph() {
    const statusEl = document.getElementById('morph-status');

    if (!LAST_MORPH) {
      ffSetMorphStatus('Nothing to save yet — select two frogs first.');
      return;
    }

    if (typeof SaveFrogMorph !== 'function') {
      console.warn('SaveFrogMorph() not found.');
      ffSetMorphStatus('Save function not loaded.');
      return;
    }

    const { tokenA, tokenB, newTraits, previewUrl } = LAST_MORPH;
    const frogA = parseTokenId(tokenA);
    const frogB = parseTokenId(tokenB);

    const address = ffGetConnectedAddress();
    if (!address) {
      ffSetMorphStatus('Connect your wallet to save a morph.');
      return;
    }

    ffSetMorphStatus('Please sign the morph request in your wallet…');

    let signed;
    try {
      signed = await ffSignMorphIntent(address, frogA, frogB);
    } catch (err) {
      console.warn('Signature cancelled:', err);
      ffSetMorphStatus('Signature cancelled. Morph not saved.');
      return;
    }

    ffSetMorphStatus(`Saving morph for #${frogA} / #${frogB}…`);

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

      ffSetMorphStatus('✅ Morph saved! It will show up in your Wallet.');

    } catch (err) {
      console.error('Save failed:', err);
      ffSetMorphStatus('Save failed. Check console.');
    }
  }

  window.FrogMorph = FrogMorph;

  // ------------------------
  // EIP-712 Signature
  // ------------------------
  async function ffSignMorphIntent(address, frogA, frogB) {
    if (!window.ethereum?.request) throw new Error("No wallet");

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

    const value = { user: address, frogA, frogB, nonce, timestamp };

    const typedData = JSON.stringify({
      domain, types, primaryType: "MorphIntent", message: value
    });

    const signature = await ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [address, typedData]
    });

    return { value, signature };
  }

  // ------------------------
  // Morph Core Logic (unchanged except no random)
  // ------------------------
  async function ffMetamorphBuild(tokenA, tokenB) {
    const statusEl = document.getElementById('morph-status');
    const card = document.querySelector('#morph-card-slot .recent_sale_card');

    try {
      const basePath =
        (typeof SOURCE_PATH !== 'undefined' && SOURCE_PATH) ||
        'https://freshfrogs.github.io/assets';

      if (typeof build_trait !== 'function') {
        throw new Error('build_trait() missing.');
      }
      if (!card) throw new Error('Preview card not found.');

      const previewCont = card.querySelector('#morph-preview');
      const traitsEl    = card.querySelector('#morph-traits');
      const nameEl      = card.querySelector('#morph-name');

      ffSetMorphStatus(`Morphing Frog #${tokenA} / Frog #${tokenB}…`);

      ffApplyParentBackground(previewCont, tokenA);

      const metadataA = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataB = { Frog:'', SpecialFrog:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };
      const metadataC = { Frog:'', SpecialFrog:'', Subset:'', Trait:'', Accessory:'', Eyes:'', Hat:'', Mouth:'' };

      const aRaw = await (await fetch(`${basePath}/frog/json/${tokenA}.json`)).json();
      for (const attr of (aRaw.attributes || [])) {
        if (attr?.trait_type in metadataA) metadataA[attr.trait_type] = attr.value || '';
      }

      const bRaw = await (await fetch(`${basePath}/frog/json/${tokenB}.json`)).json();
      for (const attr of (bRaw.attributes || [])) {
        if (attr?.trait_type in metadataB) metadataB[attr.trait_type] = attr.value || '';
      }

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

      if (metadataA.Frog !== '') metadataC.Frog = metadataB.Frog;
      else if (metadataA.SpecialFrog !== '') metadataC.SpecialFrog = `/bottom/${metadataA.SpecialFrog}`;

      if (metadataB.Frog !== '') metadataC.Subset = metadataA.Frog;
      else if (metadataB.SpecialFrog !== '') metadataC.SpecialFrog = metadataB.SpecialFrog;

      metadataC.Trait     = metadataB.Trait     || metadataA.Trait     || '';
      metadataC.Accessory = metadataA.Accessory || metadataB.Accessory || '';
      metadataC.Eyes      = metadataA.Eyes      || metadataB.Eyes      || '';
      metadataC.Hat       = metadataA.Hat       || metadataB.Hat       || '';
      metadataC.Mouth     = metadataA.Mouth     || metadataB.Mouth     || '';

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

      if (metadataC.Frog !== '') addTrait('Frog', metadataC.Frog, 'Frog');
      else if (metadataC.SpecialFrog !== '') addTrait('SpecialFrog', metadataC.SpecialFrog, 'SpecialFrog');

      addTrait('Frog/subset', metadataC.Subset, 'Frog/subset');
      addTrait('Trait', metadataC.Trait, 'Trait');
      addTrait('Accessory', metadataC.Accessory, 'Accessory');
      addTrait('Eyes', metadataC.Eyes, 'Eyes');
      addTrait('Hat', metadataC.Hat, 'Hat');
      addTrait('Mouth', metadataC.Mouth, 'Mouth');

      if (nameEl) nameEl.textContent = `Morphed Preview #${tokenA} / #${tokenB}`;

      const previewUrl = await ffCapturePreviewDataUrl('morph-preview', tokenA);

      ffSetMorphStatus(`Preview ready: #${tokenA} / #${tokenB}`);

      return { tokenA, tokenB, newTraits, previewUrl };

    } catch (err) {
      console.error('ffMetamorphBuild error:', err);
      ffSetMorphStatus(`Morph failed: ${err.message || err}`);
      return null;
    }
  }

  // ------------------------
  // Helpers
  // ------------------------
  function ffSetMorphStatus(msg) {
    const el = document.getElementById('morph-status');
    if (el) el.textContent = msg;
  }

  function parseTokenId(raw) {
    if (raw == null) return null;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 && n <= 4040 ? n : null;
  }

  async function ffFetchOwnedTokenIds(address) {
    // if site.js already provided it, use it
    if (typeof ffFetchOwnedFrogs === "function") {
      const nfts = await ffFetchOwnedFrogs(address);
      return nfts.map(n => parseTokenId(n?.tokenId || n?.id?.tokenId)).filter(Boolean);
    }

    const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=false&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
    const target = FF_COLLECTION_ADDRESS.toLowerCase();
    return all
      .filter(nft => nft?.contract?.address?.toLowerCase() === target)
      .map(nft => parseTokenId(nft.tokenId || nft.id?.tokenId))
      .filter(Boolean);
  }

  async function ffFetchStakedTokenIds(address) {
    if (typeof window.stakerAddress === "function" && typeof window.stakingValues === "function") {
      // if read-contract helpers already exist, use the controller method from site.js
      if (typeof window.ffFetchStakedTokenIds === "function") {
        return await window.ffFetchStakedTokenIds(address).catch(() => []);
      }
    }

    // minimal read-contract init (same logic as site.js, but tiny)
    if (!window.web3 && window.ethereum) {
      window.web3 = new Web3(window.ethereum);
    } else if (!window.web3) {
      window.web3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
    }

    if (!window.controller && typeof CONTROLLER_ABI !== "undefined") {
      window.controller = new window.web3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }
    if (!window.controller?.methods) return [];

    const names = ['getStakedTokensOf','getStakedTokens','getUserStakedTokens','stakedTokensOf'];
    let stakedRaw = null;
    for (const n of names) {
      if (window.controller.methods[n]) {
        try {
          stakedRaw = await window.controller.methods[n](address).call();
          break;
        } catch {}
      }
    }
    if (!stakedRaw) return [];

    const out = [];
    const seen = new Set();
    const add = (v) => {
      const id = parseTokenId(v?.tokenId ?? v);
      if (id != null && !seen.has(id)) { seen.add(id); out.push(id); }
    };

    if (Array.isArray(stakedRaw)) stakedRaw.forEach(add);
    else add(stakedRaw);

    return out;
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
    if (window.user_address) return window.user_address;
    if (window.currentAccount) return window.currentAccount;
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
