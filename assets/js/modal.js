// assets/js/modal.js
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // elements (these IDs must exist in your modal HTML)
    const fmId          = $('#fmId');
    const fmRankNum     = $('#fmRankNum');      // shows "Rank #1234"
    const fmLine        = $('#fmLine');         // "Not staked • Owned by You/0x…"
    const fmOwner       = $('#fmOwner');        // hidden, kept for other code
    const fmRarityLine  = $('#fmRarityLine');   // hidden, kept for other code
    const fmCollection  = $('#fmCollection');   // hidden, kept for other code
    const fmAttrs       = $('#fmAttrs');        // attributes list
    const fmHero        = $('#fmHero');         // art container

    const fmStakeBtn    = $('#fmStakeBtn');
    const fmUnstakeBtn  = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');
    const fmMorphBtn    = $('#fmMorphBtn');

    const fmOpenSea     = $('#fmOpenSea');
    const fmEtherscan   = $('#fmEtherscan');
    const fmMetaLink    = $('#fmMetaLink');
    const fmImageLink   = $('#fmImageLink');

    let current = { id: null, owner: '', staked: false };

    // ---------- helpers ----------
    const shorten = (addr) =>
      (FF && FF.shorten) ? FF.shorten(addr) : (addr ? addr.slice(0,6)+'…'+addr.slice(-4) : '—');

    const setOpen = (val) => {
      modal.classList.toggle('open', !!val);
      modal.setAttribute('aria-hidden', val ? 'false' : 'true');
      if (val) setTimeout(()=>$('.modal-close', modal)?.focus(), 50);
    };

    function setLinks(tokenId) {
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${tokenId}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${tokenId}`;
      if (fmOpenSea)   fmOpenSea.href   = os;
      if (fmEtherscan) fmEtherscan.href = es;

      const base = CFG.SOURCE_PATH || '';
      if (fmMetaLink)  fmMetaLink.href  = `${base}/frog/json/${tokenId}.json`;
      if (fmImageLink) fmImageLink.href = `${base}/frog/${tokenId}.png`;
    }

    // EXACT parity with Owned/Staked: use your canonical renderer,
    // plus the background trick (flat PNG huge, bottom-right).
    async function drawFrog(id) {
      fmHero.innerHTML = '';

      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize = '320% 320%';
      fmHero.style.backgroundPosition = '100% 100%';

      const maybe = (typeof window.buildFrog128 === 'function')
        ? window.buildFrog128(fmHero, id)
        : null;

      if (maybe && typeof maybe.then === 'function') {
        try { await maybe; } catch (e) {}
      }
      // ensure canvas has painted before sampling
      await new Promise(r => requestAnimationFrame(r));

      try {
        const cv = fmHero.querySelector('canvas');
        if (cv) {
          const ctx = cv.getContext('2d', { willReadFrequently: true });
          const px = ctx.getImageData(0,0,1,1).data; // top-left pixel
          fmHero.style.backgroundColor = `rgba(${px[0]},${px[1]},${px[2]},1)`;
        }
      } catch (e) {
        fmHero.style.backgroundColor = 'var(--panelSoft)';
      }

      // Fallback if buildFrog128 not present
      if (!maybe && typeof window.buildFrog128 !== 'function') {
        const img = new Image();
        img.decoding = 'async';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.imageRendering = 'pixelated';
        img.src = flatUrl;
        fmHero.appendChild(img);
      }
    }

    function setRarity(id) {
      const rank = (FF && FF.getRankById) ? FF.getRankById(id) : null;
      if (fmRankNum)    fmRankNum.textContent   = (rank != null) ? `#${rank}` : '—';
      if (fmRarityLine) fmRarityLine.textContent = (rank != null)
        ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState(staked, owner) {
      current.staked = !!staked;
      current.owner  = owner || '';

      // Try to detect current wallet to show "You"
      const youAddr = (FF && FF.wallet && FF.wallet.address) || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = youAddr && owner && (youAddr.toLowerCase() === owner.toLowerCase());
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');

      if (fmLine)       fmLine.textContent      = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`;
      if (fmOwner)      fmOwner.textContent     = owner || '—';

      if (fmStakeBtn)   fmStakeBtn.disabled     = !!staked;
      if (fmUnstakeBtn) fmUnstakeBtn.disabled   = !staked;
    }

    async function loadAttributes(id) {
      try {
        const metaUrl = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
        const meta = await (FF && FF.fetchJSON ? FF.fetchJSON(metaUrl) : fetch(metaUrl).then(r=>r.json()));
        if (fmAttrs) {
          fmAttrs.innerHTML = '';
          (meta?.attributes || []).forEach(attr => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="name">${attr.trait_type}</span><span class="val">${attr.value}</span>`;
            fmAttrs.appendChild(li);
          });
        }
      } catch (e) { /* optional */ }
    }

    // ---------- public open ----------
    async function openFrogModal({ id, owner, staked }) {
      if (fmId)         fmId.textContent        = `#${id}`;
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);

      setLinks(id);
      setRarity(id);
      setState(!!staked, owner || '');

      await Promise.all([drawFrog(id), loadAttributes(id)]);
      setOpen(true);
    }

    // ---------- close / esc ----------
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // ---------- actions ----------
    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.FFStake?.stakeOne) {
        await window.FFStake.stakeOne(current.id);
      } else if (window.stakeOne) {
        await window.stakeOne(current.id);
      } else {
        window.dispatchEvent(new CustomEvent('ff:stake', { detail: { ids: [current.id] } }));
      }
    });

    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.FFStake?.unstakeOne) {
        await window.FFStake.unstakeOne(current.id);
      } else if (window.unstakeOne) {
        await window.unstakeOne(current.id);
      } else {
        window.dispatchEvent(new CustomEvent('ff:unstake', { detail: { ids: [current.id] } }));
      }
    });

    fmTransferBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      const to = (prompt('Transfer to address (0x…)') || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(to)) { alert('Invalid address'); return; }

      if (window.FFWallet?.transfer) {
        try { await window.FFWallet.transfer(CFG.COLLECTION_ADDRESS, current.id, to); }
        catch (e) { console.error(e); alert('Transfer failed'); }
      } else if (window.transferToken) {
        try { await window.transferToken(CFG.COLLECTION_ADDRESS, current.id, to); }
        catch (e) { console.error(e); alert('Transfer failed'); }
      } else {
        window.dispatchEvent(new CustomEvent('ff:transfer', { detail: { collection: CFG.COLLECTION_ADDRESS, id: current.id, to }}));
      }
    });

    fmMorphBtn?.addEventListener('click', () => {
      alert('Metamorph coming soon ✨');
    });

    // ---------- expose ----------
    window.FFModal = { openFrogModal };

    // ---------- click delegation for rows ----------
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-token-id][data-src]');
      if (!el) return;
      if (e.target.closest('a,button,[data-no-modal]')) return;

      const id = Number(el.getAttribute('data-token-id'));
      const src = el.getAttribute('data-src'); // "owned" | "staked" | "pond"
      const owner = el.getAttribute('data-owner') || '';
      const staked = (src === 'staked') || el.getAttribute('data-staked') === 'true';

      if (Number.isFinite(id)) {
        e.preventDefault();
        if (FF && FF.ensureRarity) { try { await FF.ensureRarity(); } catch(e){} }
        openFrogModal({ id, owner, staked });
      }
    });
  });

})(window.FF || (window.FF = {}), window.FF_CFG || {});
