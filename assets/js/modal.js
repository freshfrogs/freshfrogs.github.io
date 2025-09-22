// assets/js/modal.js — Layered render (256px), solid-color bg (no silhouette), open via [data-open-modal] or row click
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
    const fmMetaLink = $('#fmMetaLink');   // may be hidden/unused if you renamed it
    const fmImageLink = $('#fmImageLink'); // "Original" link target

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map(); // id -> Promise(meta)

    // ---------------- helpers ----------------
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));
    const flatPng = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
    const metaUrl = (id)=> `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;

    const setOpen = (v) => {
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
      if (v) setTimeout(()=>$('.modal-close', modal)?.focus(), 30);
    };

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      fmOpenSea   && (fmOpenSea.href   = os);
      fmEtherscan && (fmEtherscan.href = es);
      const base = CFG.SOURCE_PATH || '';
      fmMetaLink  && (fmMetaLink.href  = `${base}/frog/json/${id}.json`);
      // "Original" still image
      fmImageLink && (fmImageLink.href = `${base}/frog/${id}.png`);
    }

    function enforceHeroSize(px=256){
      if (!fmHero) return;
      fmHero.style.width  = px+'px';
      fmHero.style.height = px+'px';
      fmHero.querySelectorAll('img,canvas').forEach(el=>{
        el.style.width  = px+'px';
        el.style.height = px+'px';
      });
    }

    function waitForRenderer(timeoutMs=2500){
      return new Promise((res, rej)=>{
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > timeoutMs) return rej(new Error('buildFrog128 not found'));
          requestAnimationFrame(tick);
        })();
      });
    }

    // Sample the flat PNG’s top-left pixel and set a SOLID background (no image),
    // so the original frog silhouette can never "peek".
    async function setSolidHeroBgFromFlat(id){
      if (!fmHero) return;
      const url = flatPng(id);
      await new Promise((resolve)=>{
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = ()=>{
          try{
            const c = document.createElement('canvas');
            c.width = 2; c.height = 2;
            const ctx = c.getContext('2d', { willReadFrequently:true });
            ctx.drawImage(img, 0, 0, 2, 2);
            const d = ctx.getImageData(0,0,1,1).data;
            fmHero.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},1)`;
          } catch {
            // neutral fallback
            fmHero.style.backgroundColor = '#11151a';
          }
          // IMPORTANT: remove any background image to avoid silhouette leak
          fmHero.style.backgroundImage = 'none';
          fmHero.style.backgroundRepeat = 'no-repeat';
          fmHero.style.backgroundSize = 'auto';
          fmHero.style.backgroundPosition = '0 0';
          resolve();
        };
        img.onerror = ()=>{
          fmHero.style.backgroundColor = '#11151a';
          fmHero.style.backgroundImage = 'none';
          resolve();
        };
        img.src = url;
      });
    }

    async function drawFrog(id){
      fmHero.innerHTML = '';
      await setSolidHeroBgFromFlat(id); // set solid bg first
      enforceHeroSize(256);

      // Try layered
      let layeredOk = false;
      try {
        await waitForRenderer().catch(()=>{});
        if (typeof window.buildFrog128 === 'function'){
          const maybe = window.buildFrog128(fmHero, id);
          if (maybe?.then) await maybe.catch(()=>{});
          layeredOk = !!fmHero.firstChild; // something got rendered
        }
      } catch {}

      // Fallback to flat 256 if layered failed
      if (!layeredOk){
        const img = new Image();
        img.decoding = 'async';
        img.loading  = 'lazy';
        img.alt = `Frog #${id}`;
        Object.assign(img.style, {
          position:'absolute', inset:'0',
          width:'256px', height:'256px',
          imageRendering:'pixelated'
        });
        img.src = flatPng(id);
        fmHero.appendChild(img);
      }

      // Ensure the final size and child sizing are correct
      enforceHeroSize(256);
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.FF_WALLET?.address || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      fmLine && (fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`);
      fmOwner && (fmOwner.textContent = owner || '—');
      fmStakeBtn && (fmStakeBtn.disabled   = !!staked);
      fmUnstakeBtn && (fmUnstakeBtn.disabled = !staked);
    }

    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const p = (FF?.fetchJSON ? FF.fetchJSON(metaUrl(id)) : fetch(metaUrl(id)).then(r=>r.json()))
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

      setOpen(true);              // open immediately
      enforceHeroSize(256);       // size the container first
      drawFrog(id).catch(()=>{}); // render after open
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

    // ---------- open modal from [data-open-modal] OR row click ----------
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-modal]');
      const row = e.target.closest('.list-item[data-token-id]');
      const el = btn || row;
      if (!el) return;

      // Don’t trigger from links/buttons inside the row (unless it’s the explicit open control)
      if (!btn && e.target.closest('a,button,[data-no-modal]')) return;

      const id = Number(el.getAttribute('data-token-id'));
      const owner = el.getAttribute('data-owner') || '';
      const staked = el.getAttribute('data-staked') === 'true';

      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked });
      }
    });

    // warmup (rarity + hint renderer)
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
      // JIT the renderer once offscreen if available
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(tmp);
      if (typeof window.buildFrog128 === 'function') {
        try { const m = window.buildFrog128(tmp, 1); if (m?.then) m.finally(()=>tmp.remove()); else tmp.remove(); }
        catch { tmp.remove(); }
      } else { tmp.remove(); }
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
