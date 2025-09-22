// assets/js/modal.js  — FAST OPEN (flat PNG only)
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // elems
    const fmId = $('#fmId');                // "#1234" (inside "Frog <b>#</b>")
    const fmRankNum = $('#fmRankNum');      // "<b id='fmRankNum'>#51</b>"
    const fmLine = $('#fmLine');            // "Not staked • Owned by …"
    const fmOwner = $('#fmOwner');          // hidden, kept for other code
    const fmRarityLine = $('#fmRarityLine');// hidden, kept for other code
    const fmCollection = $('#fmCollection');// hidden, kept for other code
    const fmAttrs = $('#fmAttrs');          // <ul> we fill with <li>
    const fmHero = $('#fmHero');            // art container

    const fmStakeBtn = $('#fmStakeBtn'), fmUnstakeBtn = $('#fmUnstakeBtn'),
          fmTransferBtn = $('#fmTransferBtn'), fmMorphBtn = $('#fmMorphBtn');
    const fmOpenSea = $('#fmOpenSea'), fmEtherscan = $('#fmEtherscan'),
          fmMetaLink = $('#fmMetaLink'), fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map(); // id -> Promise(meta)

    // ---------- helpers ----------
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));

    const setOpen = (v) => {
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
      if (v) setTimeout(()=>$('.modal-close', modal)?.focus(), 30);
    };

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      if (fmOpenSea) fmOpenSea.href = os;
      if (fmEtherscan) fmEtherscan.href = es;
      const base = CFG.SOURCE_PATH || '';
      if (fmMetaLink)  fmMetaLink.href  = `${base}/frog/json/${id}.json`;
      if (fmImageLink) fmImageLink.href = `${base}/frog/${id}.png`;
    }

    // Flat 128×128 PNG renderer (no awaits)
    function renderFlat(id, size=128){
      if (!fmHero) return;
      fmHero.innerHTML = '';
      const img = new Image();
      img.decoding = 'async';
      img.width = size; img.height = size;
      img.className = 'frog-img';
      img.src = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.appendChild(img);
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum) fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
      if (fmRarityLine) fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      if (fmLine) fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`;
      if (fmOwner) fmOwner.textContent = owner || '—';
      if (fmStakeBtn)   fmStakeBtn.disabled   = !!staked;
      if (fmUnstakeBtn) fmUnstakeBtn.disabled = !staked;
    }

    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const url = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
      const p = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
        .catch(e => { console.warn('meta fetch failed', id, e); return null; });
      metaCache.set(id, p);
      return p;
    }

    // Non-blocking attribute fill (after modal is open)
    async function fillAttributes(id){
      if (!fmAttrs) return;
      fmAttrs.innerHTML = ''; // clear fast
      const meta = await getMeta(id);
      if (!current.open || !meta) return;   // if user closed modal meanwhile
      const list = meta.attributes || [];
      // build once off-DOM, then append
      const frag = document.createDocumentFragment();
      for (const a of list){
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${a.trait_type}</span><span class="val">${a.value}</span>`;
        frag.appendChild(li);
      }
      fmAttrs.innerHTML = '';
      fmAttrs.appendChild(frag);
    }

    // ---------- public open (INSTANT) ----------
    async function openFrogModal({ id, owner, staked }) {
      current.id = id; current.owner = owner || '';

      if (fmId)         fmId.textContent = `#${id}`;
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner || '');

      // 1) OPEN NOW (no awaits)
      setOpen(true);

      // 2) Kick off rendering AFTER opening
      renderFlat(id, 128);     // no await

      // 3) Fill attributes in background
      fillAttributes(id);      // no await
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
      if (window.FFStake?.stakeOne)      await window.FFStake.stakeOne(current.id);
      else if (window.stakeOne)          await window.stakeOne(current.id);
      else window.dispatchEvent(new CustomEvent('ff:stake', { detail: { ids: [current.id] } }));
    });
    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.FFStake?.unstakeOne)    await window.FFStake.unstakeOne(current.id);
      else if (window.unstakeOne)        await window.unstakeOne(current.id);
      else window.dispatchEvent(new CustomEvent('ff:unstake', { detail: { ids: [current.id] } }));
    });
    fmTransferBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      const to=(prompt('Transfer to address (0x…)')||'').trim();
      if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }
      if (window.FFWallet?.transfer) { try{ await window.FFWallet.transfer(CFG.COLLECTION_ADDRESS,current.id,to);}catch(e){console.error(e);alert('Transfer failed');} }
      else if (window.transferToken) { try{ await window.transferToken(CFG.COLLECTION_ADDRESS,current.id,to);}catch(e){console.error(e);alert('Transfer failed');} }
      else window.dispatchEvent(new CustomEvent('ff:transfer',{detail:{collection:CFG.COLLECTION_ADDRESS,id:current.id,to}}));
    });
    fmMorphBtn?.addEventListener('click', ()=> alert('Metamorph coming soon ✨'));

    // ---------- expose ----------
    window.FFModal = { openFrogModal };

    // ---------- click delegation (FAST: no rarity wait) ----------
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-token-id][data-src]');
      if (!el) return;
      if (e.target.closest('a,button,[data-no-modal]')) return;

      const id = Number(el.getAttribute('data-token-id'));
      const src = el.getAttribute('data-src');
      const owner = el.getAttribute('data-owner') || '';
      const staked = (src === 'staked') || el.getAttribute('data-staked') === 'true';

      if (Number.isFinite(id)) {
        e.preventDefault();
        // Do NOT await ensureRarity here; header uses cached rank when available.
        openFrogModal({ id, owner, staked });
      }
    });

    // ---------- optional warmup (makes the first modal snappy) ----------
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
      // preload a common frog image (adjust id if you want)
      const img = new Image(); img.src = `${CFG.SOURCE_PATH || ''}/frog/1.png`;
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
