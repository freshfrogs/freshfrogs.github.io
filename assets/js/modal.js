// assets/js/modal.js — Layered render (buildFrog128), fast-open, open via [data-open-modal]
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // DOM refs
    const fmId = $('#fmId');                // e.g., "#1234"
    const fmRankNum = $('#fmRankNum');      // e.g., "#51"
    const fmLine = $('#fmLine');            // "Not staked • Owned by …"
    const fmOwner = $('#fmOwner');          // hidden
    const fmRarityLine = $('#fmRarityLine');// hidden
    const fmCollection = $('#fmCollection');// hidden
    const fmAttrs = $('#fmAttrs');          // <ul> Attributes
    const fmHero = $('#fmHero');            // layered art container

    const fmStakeBtn = $('#fmStakeBtn');
    const fmUnstakeBtn = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');
    const fmMorphBtn = $('#fmMorphBtn');

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
      fmOpenSea && (fmOpenSea.href = os);
      fmEtherscan && (fmEtherscan.href = es);
      const base = CFG.SOURCE_PATH || '';
      fmMetaLink  && (fmMetaLink.href  = `${base}/frog/json/${id}.json`);
      fmImageLink && (fmImageLink.href = `${base}/frog/${id}.png`);
    }

    // Wait for buildFrog128 to exist (owned.js defines it)
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

    async function drawFrog(id){
      // Layered + animation; keep flat PNG as background trick just for color
      fmHero.innerHTML = '';

      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize = '320% 320%';
      fmHero.style.backgroundPosition = '100% 100%';

      try { await waitForRenderer(); } catch(e){ console.warn(e.message); }

      if (typeof window.buildFrog128 === 'function') {
        const maybe = window.buildFrog128(fmHero, id);
        if (maybe?.then) { try { await maybe; } catch {} }
      }

      // After first frame, sample canvas top-left to set solid color
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
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      fmLine && (fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`);
      fmOwner && (fmOwner.textContent = owner || '—');
      fmStakeBtn && (fmStakeBtn.disabled = !!staked);
      fmUnstakeBtn && (fmUnstakeBtn.disabled = !staked);
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

      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS));
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner || '');

      setOpen(true);            // open immediately
      drawFrog(id).catch(()=>{});   // layered render after open
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

    // warmup (rarity + one render path)
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
      // hint the renderer to JIT once offscreen
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(tmp);
      if (typeof window.buildFrog128 === 'function') {
        try { const m = window.buildFrog128(tmp, 1); if (m?.then) m.then(()=>tmp.remove(),()=>tmp.remove()); else tmp.remove(); }
        catch { tmp.remove(); }
      } else { tmp.remove(); }
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
