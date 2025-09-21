// assets/js/modal.js
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // elems
    const fmId = $('#fmId'), fmRank = $('#fmRank'), fmOwner = $('#fmOwner'),
          fmOwnerShort = $('#fmOwnerShort'), fmRarityLine = $('#fmRarityLine'),
          fmCollection = $('#fmCollection'), fmAttrs = $('#fmAttrs'),
          fmHero = $('#fmHero'),
          fmStakeBtn = $('#fmStakeBtn'), fmUnstakeBtn = $('#fmUnstakeBtn'),
          fmTransferBtn = $('#fmTransferBtn'), fmMorphBtn = $('#fmMorphBtn'),
          fmOpenSea = $('#fmOpenSea'), fmEtherscan = $('#fmEtherscan'),
          fmMetaLink = $('#fmMetaLink'), fmImageLink = $('#fmImageLink'),
          fmState = $('#fmState');

    let current = { id: null, owner: null, staked: null };

    function shorten(addr) { return (FF && FF.shorten) ? FF.shorten(addr) : (addr ? addr.slice(0,6)+'…'+addr.slice(-4) : '—'); }
    function setOpen(val) {
      modal.classList.toggle('open', !!val);
      modal.setAttribute('aria-hidden', val ? 'false' : 'true');
      if (val) setTimeout(()=>$('.modal-close', modal)?.focus(), 50);
    }

    function setLinks(tokenId) {
      // Market / chain explorers
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${tokenId}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${tokenId}`;
      if (fmOpenSea)   fmOpenSea.href   = os;
      if (fmEtherscan) fmEtherscan.href = es;

      // Local assets
      const base = CFG.SOURCE_PATH || '';
      if (fmMetaLink)  fmMetaLink.href  = `${base}/frog/json/${tokenId}.json`;
      if (fmImageLink) fmImageLink.href = `${base}/frog/${tokenId}.png`;
    }

    // Use your site-wide renderer for pixel-perfect look
    async function drawFrog(id) {
      fmHero.innerHTML = '';
      if (typeof window.buildFrog128 === 'function') {
        window.buildFrog128(fmHero, id);
        try {
          const cv = fmHero.querySelector('canvas');
          if (cv) {
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            const px = ctx.getImageData(0,0,1,1).data;
            fmHero.style.backgroundImage = 'none';
            fmHero.style.backgroundColor = `rgba(${px[0]},${px[1]},${px[2]},1)`;
          }
        } catch(e){}
      } else {
        // Fallback image
        fmHero.style.backgroundImage = 'none';
        fmHero.style.backgroundColor = 'var(--panelSoft)';
        const img = new Image();
        img.decoding = 'async';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.imageRendering = 'pixelated';
        img.src = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
        fmHero.appendChild(img);
      }
    }

    function setRarity(id) {
      const rank = (FF.getRankById ? FF.getRankById(id) : null);
      if (rank != null) {
        if (fmRank) fmRank.textContent = `Rank ${rank}`;
        if (fmRarityLine) fmRarityLine.textContent = `#${rank} of ${CFG.SUPPLY || 4040}`;
      } else {
        if (fmRank) fmRank.textContent = `Rank —`;
        if (fmRarityLine) fmRarityLine.textContent = `—`;
      }
    }

    function setState(staked, owner) {
      current.staked = !!staked;
      if (fmState) fmState.textContent = staked ? 'Staked' : 'Not staked';
      if (fmStakeBtn) fmStakeBtn.disabled = !!staked;
      if (fmUnstakeBtn) fmUnstakeBtn.disabled = !staked;

      if (fmOwner) fmOwner.textContent = owner || '—';
      if (fmOwnerShort) fmOwnerShort.textContent = `Owned by ${shorten(owner || '')}`;
    }

    // Load attributes into the list
    async function loadAttributes(id) {
      try {
        const metaUrl = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
        const meta = await (FF.fetchJSON ? FF.fetchJSON(metaUrl) : fetch(metaUrl).then(r=>r.json()));
        if (fmAttrs) {
          fmAttrs.innerHTML = '';
          (meta?.attributes || []).forEach(attr => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="name">${attr.trait_type}</span><span class="val">${attr.value}</span>`;
            fmAttrs.appendChild(li);
          });
        }
      } catch(e){ /* ignore */ }
    }

    // ------- public open -------
    async function openFrogModal({ id, owner, staked }) {
      current.id = id;
      current.owner = owner;

      if (fmId) fmId.textContent = `#${id}`;
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner);
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);

      await Promise.all([drawFrog(id), loadAttributes(id)]);
      setOpen(true);
    }

    // ------- close / esc / backdrop -------
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // ------- actions (Stake / Unstake / Transfer / Metamorph) -------
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

      // Try known helpers, else dispatch an event for app-level handling
      if (window.FFWallet?.transfer) {
        // FFWallet.transfer(collection, tokenId, to)
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

    // expose
    window.FFModal = { openFrogModal };

    // --------- click delegation (Owned/Staked/Pond rows) ----------
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
        if (FF.ensureRarity) { try { await FF.ensureRarity(); } catch(e){} }
        openFrogModal({ id, owner, staked });
      }
    });
  });

})(window.FF || (window.FF = {}), window.FF_CFG || {});
