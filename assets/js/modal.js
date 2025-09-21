// assets/js/modal.js
(function (FF, CFG) {
  // Run after DOM is ready so #frogModal definitely exists
  const onReady = (fn) =>
    (document.readyState !== 'loading')
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $  = (q, el=document) => el.querySelector(q);
    const $$ = (q, el=document) => [...el.querySelectorAll(q)];

    const modal = $('#frogModal');
    if (!modal) {
      console.warn('frogModal not found in DOM');
      return;
    }

    // elems
    const fmId = $('#fmId'), fmRank = $('#fmRank'), fmOwner = $('#fmOwner'),
          fmOwnerShort = $('#fmOwnerShort'), fmRarityLine = $('#fmRarityLine'),
          fmCollection = $('#fmCollection'), fmAttrs = $('#fmAttrs'),
          fmHero = $('#fmHero'), fmCanvas = $('#fmCanvas'),
          fmStakeBtn = $('#fmStakeBtn'), fmUnstakeBtn = $('#fmUnstakeBtn'),
          fmOpenSea = $('#fmOpenSea'), fmEtherscan = $('#fmEtherscan'),
          fmState = $('#fmState');

    let current = { id: null, owner: null, staked: null };

    // ------- helpers -------
    function shorten(addr) { return (FF && FF.shorten) ? FF.shorten(addr) : (addr ? addr.slice(0,6)+'…'+addr.slice(-4) : '—'); }
    function setOpen(val) {
      modal.classList.toggle('open', !!val);
      modal.setAttribute('aria-hidden', val ? 'false' : 'true');
      if (val) setTimeout(()=>$('.modal-close', modal)?.focus(), 50);
    }

    function setLinks(tokenId) {
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${tokenId}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${tokenId}`;
      if (fmOpenSea) fmOpenSea.href = os;
      if (fmEtherscan) fmEtherscan.href = es;
    }

    // draw layered 128×128 from /frog/json/{id}.json
    async function drawFrog(id) {
      const metaUrl = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      const ctx = fmCanvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0,0,128,128);

      // background trick (flat PNG as bg)
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundSize = '320% 320%';
      fmHero.style.backgroundPosition = '100% 100%';

      const meta = await (FF.fetchJSON ? FF.fetchJSON(metaUrl) : fetch(metaUrl).then(r=>r.json()));
      const layers = meta?.build_files || meta?.layers || []; // allow either key

      // build attributes list
      if (fmAttrs) {
        fmAttrs.innerHTML = '';
        (meta?.attributes || []).forEach(attr => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="name">${attr.trait_type}</span><span class="val">${attr.value}</span>`;
          fmAttrs.appendChild(li);
        });
      }

      // draw layers in order
      for (const layer of layers) {
        const url = `${CFG.SOURCE_PATH || ''}/frog/build_files/${encodeURIComponent(layer.attribute)}/${encodeURIComponent(layer.value)}.png`;
        const img = await loadImage(url);
        ctx.drawImage(img, 0, 0, 128, 128);
      }

      // sample top-left pixel to tint the container background fallback
      try {
        const pixel = ctx.getImageData(0,0,1,1).data;
        fmHero.style.backgroundColor = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},1)`;
      } catch (e) {}
    }

    function loadImage(src) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    }

    function setRarity(id) {
      // Prefer your array JSON via utils (e.g., FF.ensureRarity + FF.getRankById)
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

    // ------- public open -------
    async function openFrogModal({ id, owner, staked }) {
      current.id = id;
      current.owner = owner;

      if (fmId) fmId.textContent = `#${id}`;
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner);
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);

      await drawFrog(id);
      setOpen(true);
    }

    // ------- close / esc / backdrop -------
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // ------- actions (Stake / Unstake) -------
    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      // Call existing staking helpers if present; else fire an event the app can handle
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

    // expose
    window.FFModal = { openFrogModal };

    // --------- OPTIONAL: click delegation for owned/staked/pond lists ----------
    // If your renderers add data-token-id + data-src on items, this will Just Work™
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-token-id][data-src]');
      if (!el) return;
      const id = Number(el.getAttribute('data-token-id'));
      const src = el.getAttribute('data-src'); // "owned" | "staked" | "pond"
      const owner = el.getAttribute('data-owner') || '';
      const staked = (src === 'staked') || el.getAttribute('data-staked') === 'true';

      if (Number.isFinite(id)) {
        e.preventDefault();
        // Make sure rarity is warmed
        if (FF.ensureRarity) { try { await FF.ensureRarity(); } catch(e){} }
        openFrogModal({ id, owner, staked });
      }
    });
  });

})(window.FF || (window.FF = {}), window.FF_CFG || {});
