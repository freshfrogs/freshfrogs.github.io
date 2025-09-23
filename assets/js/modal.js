// assets/js/modal.js — Fast open (flat), upgrade to layered 256, wired actions
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

    const fmOpenSea = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmMetaLink = $('#fmMetaLink');   // "Original" still PNG
    const fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map();

    // helpers
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));
    const youAddr = ()=> (FF?.wallet?.address) || window.FF_WALLET?.address || window.user_address || null;

    const setOpen = (v) => {
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
    };

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      fmOpenSea && (fmOpenSea.href = os);
      fmEtherscan && (fmEtherscan.href = es);
      const base = CFG.SOURCE_PATH || '';
      fmMetaLink  && (fmMetaLink.href  = `${base}/frog/${id}.png`); // "Original"
      fmImageLink && (fmImageLink.href = `${base}/frog/${id}.png`);
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    function setState({ staked, owner }){
      current.staked = !!staked; current.owner = owner || '';
      const you = youAddr();
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      fmLine && (fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`);
      fmOwner && (fmOwner.textContent = owner || '—');

      const connected = !!you;
      const canStake    = connected && isYou && !staked;
      const canUnstake  = connected && isYou &&  staked;
      const canTransfer = connected && isYou;

      if (fmStakeBtn)    { fmStakeBtn.disabled    = !canStake;    fmStakeBtn.classList.toggle('btn-solid',  canStake); }
      if (fmUnstakeBtn)  { fmUnstakeBtn.disabled  = !canUnstake;  fmUnstakeBtn.classList.toggle('btn-solid',canUnstake); }
      if (fmTransferBtn) { fmTransferBtn.disabled = !canTransfer; }
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

    // 256×256 hero container + “hide image” bg trick
    function ensureHeroBox(id){
      if (!fmHero) return;
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      Object.assign(fmHero.style, {
        width:'256px', height:'256px', minWidth:'256px', minHeight:'256px',
        position:'relative', overflow:'hidden', borderRadius:'12px',
        backgroundRepeat:'no-repeat',
        backgroundSize:'2600% 2600%',
        backgroundPosition:'1400% -1400%',
        backgroundImage:`url("${flatUrl}")`,
        imageRendering:'pixelated'
      });
    }

    function drawFlat(id){
      if (!fmHero) return;
      fmHero.innerHTML = '';
      ensureHeroBox(id);
      const img = new Image();
      img.decoding = 'async';
      img.loading  = 'eager';
      Object.assign(img.style, { position:'absolute', inset:'0', width:'256px', height:'256px', imageRendering:'pixelated' });
      img.src = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.appendChild(img);
    }

    function waitForRenderer(timeoutMs=1500){
      return new Promise((res)=> {
        if (typeof window.buildFrog128 === 'function') return res(true);
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > timeoutMs) return res(false);
          requestAnimationFrame(tick);
        })();
      });
    }

    async function drawLayered(id){
      const ready = await waitForRenderer();
      if (!current.open || !ready) return;

      fmHero.innerHTML = '';  // keep bg styles
      ensureHeroBox(id);

      const maybe = window.buildFrog128(fmHero, id);
      if (maybe && typeof maybe.then === 'function'){
        try { await maybe; } catch {}
      }

      // Force all layers to 256×256
      Array.from(fmHero.querySelectorAll('img,canvas')).forEach(el=>{
        el.style.width  = '256px';
        el.style.height = '256px';
        el.style.imageRendering = 'pixelated';
        el.style.transform = 'none';
      });

      // Sample top-left to solidify bg color (optional)
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

    // public open
    async function openFrogModal({ id, owner, staked }) {
      current.id = id; current.owner = owner || '';

      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS));
      setLinks(id);
      setRarity(id);
      setState({ staked: !!staked, owner: owner || '' });

      setOpen(true);
      drawFlat(id);      // immediate
      drawLayered(id);   // non-blocking
      fillAttributes(id);
    }

    // close / esc
    modal.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // ----- ACTIONS (wired to your functions, with fallbacks) -----
    async function fallbackStake(id){
      if (!window.web3 || !window.collection || !window.controller || !window.user_address){ alert('Wallet or contracts not available.'); return; }
      // approve-all check
      try{
        const approved = await collection.methods.isApprovedForAll(user_address, CFG.CONTROLLER_ADDRESS).call({ from: user_address});
        if (!approved){
          const ok = confirm('Staking needs collection approval. Grant approval now?');
          if (!ok) return;
          await collection.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: user_address });
        }
        await controller.methods.stake(id).send({ from: user_address });
        alert('Stake transaction submitted.');
      }catch(e){ alert(e?.message || 'Stake failed'); }
    }

    async function fallbackUnstake(id){
      if (!window.web3 || !window.controller || !window.user_address){ alert('Wallet or contracts not available.'); return; }
      try{
        await controller.methods.withdraw(id).send({ from: user_address });
        alert('Unstake transaction submitted.');
      }catch(e){ alert(e?.message || 'Unstake failed'); }
    }

    async function fallbackTransfer(id){
      if (!window.web3 || !window.collection || !window.user_address){ alert('Wallet or contracts not available.'); return; }
      const to=(prompt('Transfer to address (0x…)')||'').trim();
      if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }
      try{
        await collection.methods.safeTransferFrom(window.user_address, to, id).send({ from: window.user_address });
        alert('Transfer submitted.');
      }catch(e){ alert(e?.message || 'Transfer failed'); }
    }

    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.initiate_stake) {
        const msg = await window.initiate_stake(current.id);
        if (msg) alert(msg);
      } else {
        await fallbackStake(current.id);
      }
    });

    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.initiate_withdraw) {
        const msg = await window.initiate_withdraw(current.id);
        if (msg) alert(msg);
      } else {
        await fallbackUnstake(current.id);
      }
    });

    fmTransferBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (window.transferToken) {
        try { await window.transferToken(CFG.COLLECTION_ADDRESS, current.id); }
        catch(e){ alert(e?.message || 'Transfer failed'); }
      } else {
        await fallbackTransfer(current.id);
      }
    });

    // expose
    window.FFModal = { openFrogModal };

    // open modal from any element carrying [data-open-modal]
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-modal]');
      if (!opener) return;
      const id = Number(opener.getAttribute('data-token-id'));
      const owner = opener.getAttribute('data-owner') || '';
      const staked = opener.getAttribute('data-staked') === 'true';
      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked });
      }
    });

    function updateButtons(){
      if (!current.open) return;
      setState({ staked: current.staked, owner: current.owner });
    }
    window.addEventListener('wallet:connected',  updateButtons);
    window.addEventListener('wallet:disconnected',updateButtons);

    // warmup renderer once
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
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
