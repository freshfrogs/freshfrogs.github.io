// assets/js/modal.js — Layered render (256×256), single-column modal, open via [data-open-modal]
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
    const fmMorphBtn = $('#fmMorphBtn'); // optional

    const fmOpenSea = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmMetaLink = $('#fmMetaLink');
    const fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map(); // id -> Promise(meta)

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

    // Wait for buildFrog128 to exist (owned/pond define layered logic)
    function waitForRenderer(timeoutMs=3000){
      return new Promise((res,rej)=>{
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > timeoutMs) return rej(new Error('buildFrog128 not found'));
          requestAnimationFrame(tick);
        })();
      });
    }

    // Force all child layers to SIZE×SIZE regardless of how buildFrog128 sized them
    function resizeFrogLayers(container, SIZE){
      container.style.width = SIZE + 'px';
      container.style.height = SIZE + 'px';
      const kids = container.querySelectorAll('img, canvas');
      kids.forEach(k=>{
        k.style.width = SIZE + 'px';
        k.style.height = SIZE + 'px';
        // Make sure they stay pinned at 0,0
        k.style.left = '0';
        k.style.top  = '0';
        k.style.position = 'absolute';
        // Remove any transform lift left behind
        k.style.transform = 'translate(0,0)';
        k.style.filter = 'none';
      });
    }

    // Layered draw at EXACT 256 × 256
    async function drawFrog(id){
      const SIZE = 256;

      fmHero.innerHTML = '';
      fmHero.style.width = SIZE + 'px';
      fmHero.style.height = SIZE + 'px';

      // background trick using flat PNG (zoomed to only show bg color)
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize = '2400% 2400%';
      fmHero.style.backgroundPosition = '100% 100%';

      try { await waitForRenderer(); } catch(e){ console.warn(e.message); }

      if (typeof window.buildFrog128 === 'function') {
        // build at 128, then immediately coerce to 256
        const maybe = window.buildFrog128(fmHero, id);
        if (maybe?.then) { try { await maybe; } catch {} }
        resizeFrogLayers(fmHero, SIZE);
      }

      // sample top-left pixel to set solid fallback bg color
      await new Promise(r => requestAnimationFrame(r));
      try{
        const cv = fmHero.querySelector('canvas');
        if (cv){
          const ctx = cv.getContext('2d', { willReadFrequently:true });
          const px = ctx.getImageData(0,0,1,1).data;
          fmHero.style.backgroundColor = `rgba(${px[0]},${px[1]},${px[2]},1)`;
        }
      }catch{}
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum) fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
      if (fmRarityLine) fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.FF_WALLET?.address || window.WALLET_ADDR || null;
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
      drawFrog(id).catch(()=>{});    // draw after opening
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
      if (window.FFWallet?.transfer) {
        try{ await window.FFWallet.transfer(CFG.COLLECTION_ADDRESS,current.id,to); }
        catch(e){ console.error(e); alert('Transfer failed'); }
      } else if (window.transferToken) {
        try{ await window.transferToken(CFG.COLLECTION_ADDRESS,current.id,to); }
        catch(e){ console.error(e); alert('Transfer failed'); }
      } else {
        window.dispatchEvent(new CustomEvent('ff:transfer',{detail:{collection:CFG.COLLECTION_ADDRESS,id:current.id,to}}));
      }
    });
    fmMorphBtn?.addEventListener?.('click', ()=> alert('Metamorph coming soon ✨'));

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

    // Warm up for snappy first open
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
      const img = new Image(); img.src = `${CFG.SOURCE_PATH || ''}/frog/1.png`;
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
