// assets/js/modal.js — robust layered render via buildFrog128, 256×256, safe fallbacks
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // DOM refs
    const fmId = $('#fmId');
    const fmRankNum = $('#fmRankNum');
    const fmLine = $('#fmLine');
    const fmOwner = $('#fmOwner');
    const fmRarityLine = $('#fmRarityLine');
    const fmCollection = $('#fmCollection');
    const fmAttrs = $('#fmAttrs');
    const fmHero = $('#fmHero');

    const fmStakeBtn = $('#fmStakeBtn');
    const fmUnstakeBtn = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');
    const fmMorphBtn = $('#fmMorphBtn');

    const fmOpenSea = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmMetaLink = $('#fmMetaLink');   // kept (even if hidden in UI)
    const fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map();

    // ---------------- helpers ----------------
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
      if (fmOpenSea)   fmOpenSea.href   = os;
      if (fmEtherscan) fmEtherscan.href = es;
      const base = CFG.SOURCE_PATH || '';
      if (fmMetaLink)  fmMetaLink.href  = `${base}/frog/json/${id}.json`;
      if (fmImageLink) fmImageLink.href = `${base}/frog/${id}.png`;
    }

    function waitForRenderer(timeoutMs=2500){
      return new Promise((res,rej)=>{
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > timeoutMs) return rej(new Error('buildFrog128 not found'));
          requestAnimationFrame(tick);
        })();
      });
    }

    // Force any layer children to 256×256
    function upscaleLayers(container, px=256){
      Object.assign(container.style, {
        width: px + 'px',
        height: px + 'px',
        minWidth: px + 'px',
        minHeight: px + 'px'
      });
      container.querySelectorAll('img,canvas').forEach(el=>{
        el.style.width  = px + 'px';
        el.style.height = px + 'px';
        if (!el.style.position) el.style.position = 'absolute';
        if (!el.style.left) el.style.left = '0';
        if (!el.style.top)  el.style.top  = '0';
        el.style.imageRendering = 'pixelated';
      });
    }

    function countLayeredChildren(container){
      return container.querySelectorAll('img,canvas').length;
    }

    function appendFlatFallback(container, id, px=256){
      const flat = new Image();
      flat.decoding = 'async';
      flat.loading  = 'eager';
      flat.width = px; flat.height = px;
      Object.assign(flat.style, {
        position:'absolute', inset:'0',
        width: px + 'px', height: px + 'px',
        imageRendering:'pixelated', zIndex:'2'
      });
      flat.src = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      container.appendChild(flat);
    }

    async function drawFrog(id){
      if (!fmHero) return;
      fmHero.innerHTML = '';

      // Ensure hero is 256 square from the start
      upscaleLayers(fmHero, 256);

      // Start with the flat PNG as BG, zoomed FAR away to minimize silhouette
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize   = '2800% 2800%'; // bigger zoom than before
      fmHero.style.backgroundPosition = '140% 140%'; // push further off corner
      fmHero.style.imageRendering = 'pixelated';

      // Try layered renderer
      let layeredOK = false;
      try { await waitForRenderer(); } catch(e){ /* ignore, we’ll fallback */ }

      if (typeof window.buildFrog128 === 'function') {
        try {
          const maybe = window.buildFrog128(fmHero, id);
          if (maybe?.then) await maybe;
        } catch(e) {
          // ignore; we’ll fallback below
        }
      }

      // Next frame, see if we actually got any layers
      await new Promise(r => requestAnimationFrame(r));
      const layersNow = countLayeredChildren(fmHero);
      if (layersNow > 0){
        layeredOK = true;
        // enforce 256 and remove BG image (keep bgColor from build’s sampling)
        upscaleLayers(fmHero, 256);
        fmHero.style.backgroundImage = 'none';
      } else {
        // Layered failed — show flat 256px image (visible), keep bg image off.
        fmHero.style.backgroundImage = 'none';
        appendFlatFallback(fmHero, id, 256);
      }
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum)     fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
      if (fmRarityLine)  fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.FF_WALLET?.address || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      if (fmLine)      fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`;
      if (fmOwner)     fmOwner.textContent = owner || '—';
      if (fmStakeBtn)  fmStakeBtn.disabled   = !!staked;
      if (fmUnstakeBtn)fmUnstakeBtn.disabled = !staked;
    }

    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const url = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
      const p = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
        .catch(e => { console.warn('meta fetch failed', id, e); return null; });
      metaCache.set(id, p);
      return p;
    }

    async function fillAttributes(id){
      if (!fmAttrs) return;
      fmAttrs.innerHTML = '';
      const meta = await getMeta(id);
      if (!current.open || !meta) return;
      const list = meta.attributes || [];
      const frag = document.createDocumentFragment();
      for (const a of list){
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${a.trait_type}</span><span class="val">${a.value}</span>`;
        frag.appendChild(li);
      }
      fmAttrs.innerHTML = '';
      fmAttrs.appendChild(frag);
    }

    // ------------- public open (instant) -------------
    async function openFrogModal({ id, owner, staked }) {
      current.id = id; current.owner = owner || '';

      if (fmId)         fmId.textContent = `#${id}`;
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner || '');

      setOpen(true);                 // open immediately
      drawFrog(id).catch(()=>{});    // render layered (or flat fallback)
      fillAttributes(id).catch(()=>{});
    }

    // close / esc
    modal.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // actions
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

    // expose
    window.FFModal = { openFrogModal };

    // ---------- open modal only from [data-open-modal] ----------
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-modal]');
      if (!btn) return;

      const id = Number(btn.getAttribute('data-token-id'));
      const owner = btn.getAttribute('data-owner') || '';
      const staked = btn.getAttribute('data-staked') === 'true';

      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked });
      }
    });

    // warmup
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(tmp);
      if (typeof window.buildFrog128 === 'function') {
        try {
          const m = window.buildFrog128(tmp, 1);
          if (m?.then) m.then(()=>tmp.remove(),()=>tmp.remove());
          else tmp.remove();
        } catch { tmp.remove(); }
      } else { tmp.remove(); }
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
