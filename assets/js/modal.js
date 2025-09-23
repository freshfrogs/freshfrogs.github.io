// assets/js/modal.js — layered frog at exact 256×256, image above info
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading')
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) return;

    // DOM refs
    const fmId         = $('#fmId');
    const fmRankNum    = $('#fmRankNum');
    const fmLine       = $('#fmLine');
    const fmAttrs      = $('#fmAttrs');
    const fmHero       = $('#fmHero');

    const fmStakeBtn    = $('#fmStakeBtn');
    const fmUnstakeBtn  = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');

    const fmOpenSea  = $('#fmOpenSea');
    const fmEtherscan= $('#fmEtherscan');
    const fmOriginal = $('#fmOriginal'); // renamed button

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map();

    // ------- helpers -------
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
      const still = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      if (fmOpenSea)   fmOpenSea.href = os;
      if (fmEtherscan) fmEtherscan.href = es;
      if (fmOriginal)  fmOriginal.href = still;
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum) fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
    }

    function setState({ staked, owner }){
      current.staked = !!staked; current.owner = owner || '';
      const you = youAddr();
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      if (fmLine) fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`;

      const connected = !!you;
      const canStake    = connected && isYou && !staked;
      const canUnstake  = connected && isYou &&  staked;
      const canTransfer = connected && isYou;

      if (fmStakeBtn)    fmStakeBtn.disabled    = !canStake;
      if (fmUnstakeBtn)  fmUnstakeBtn.disabled  = !canUnstake;
      if (fmTransferBtn) fmTransferBtn.disabled = !canTransfer;
    }

    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const url = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
      const p = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
        .catch(() => null);
      metaCache.set(id, p);
      return p;
    }

    async function fillAttributes(id){
      if (!fmAttrs) return;
      fmAttrs.innerHTML = '';
      const meta = await getMeta(id);
      if (!current.open || !meta) return;
      const list = Array.isArray(meta.attributes) ? meta.attributes : [];
      const frag = document.createDocumentFragment();
      for (const a of list){
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${a.trait_type}</span><span class="val">${a.value}</span>`;
        frag.appendChild(li);
      }
      fmAttrs.innerHTML = '';
      fmAttrs.appendChild(frag);
    }

    // ------- hero background helpers -------
    function styleHeroBox(id){
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      Object.assign(fmHero.style, {
        width:'256px', height:'256px', minWidth:'256px', minHeight:'256px',
        position:'relative', overflow:'hidden', borderRadius:'12px',
        backgroundRepeat:'no-repeat',
        backgroundSize:'3200% 3200%',        // push silhouette off-screen
        backgroundPosition:'-2500% 2500%',
        backgroundImage:`url("${flatUrl}")`,
        imageRendering:'pixelated'
      });
    }
    async function tintHeroFromFlat(id){
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      await new Promise((resolve)=>{
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = ()=>{
          try{
            const c=document.createElement('canvas'); c.width=2; c.height=2;
            const x=c.getContext('2d',{ willReadFrequently:true });
            x.drawImage(img,0,0,2,2);
            const d=x.getImageData(0,0,1,1).data;
            fmHero.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},1)`;
          }catch{}
          resolve();
        };
        img.onerror = ()=>resolve();
        img.src = flatUrl;
      });
    }

    // ------- 256×256 layered render using 128×128 wrapper scaled 2× -------
    async function drawLayeredAt256(id){
      if (!fmHero) return;
      fmHero.innerHTML = '';
      styleHeroBox(id);     // set bg image + size/position
      tintHeroFromFlat(id); // set solid color too

      // wrapper that buildFrog128 renders into
      const inner = document.createElement('div');
      Object.assign(inner.style, {
        position:'absolute', left:'0', top:'0',
        width:'128px', height:'128px',
        transform:'scale(2)', transformOrigin:'top left',
        imageRendering:'pixelated'
      });
      fmHero.appendChild(inner);

      // wait for renderer if needed
      const ok = await new Promise(res=>{
        if (typeof window.buildFrog128 === 'function') return res(true);
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > 2000) return res(false);
          requestAnimationFrame(tick);
        })();
      });
      if (!ok) return;

      try{
        const maybe = window.buildFrog128(inner, id);
        if (maybe?.then) await maybe;
      }catch{}

      // ensure crisp sizing
      inner.querySelectorAll('img,canvas').forEach(el=>{
        el.style.width='128px'; el.style.height='128px'; el.style.imageRendering='pixelated';
      });
    }

    // ------- open/close -------
    async function openFrogModal({ id, owner, staked }) {
      current.id = id; current.owner = owner || '';

      if (fmId) fmId.textContent = `#${id}`;
      setLinks(id);
      setRarity(id);
      setState({ staked: !!staked, owner: owner || '' });

      setOpen(true);
      await drawLayeredAt256(id); // 256×256 layered frog
      fillAttributes(id);
    }

    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // ------- actions (wire to provided functions or safe fallbacks) -------
    async function fallbackStake(id){
      if (!window.web3 || !window.collection || !window.controller || !window.user_address){
        alert('Wallet or contracts unavailable.'); return;
      }
      try{
        const approved = await collection.methods.isApprovedForAll(window.user_address, CFG.CONTROLLER_ADDRESS).call({ from: window.user_address});
        if (!approved){
          const ok = confirm('Approve controller to access your Frogs?');
          if (!ok) return;
          await collection.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: window.user_address });
        }
        await controller.methods.stake(id).send({ from: window.user_address });
        alert('Stake submitted.');
      }catch(e){ alert(e?.message || 'Stake failed'); }
    }
    async function fallbackUnstake(id){
      if (!window.web3 || !window.controller || !window.user_address){
        alert('Wallet or contracts unavailable.'); return;
      }
      try{
        await controller.methods.withdraw(id).send({ from: window.user_address });
        alert('Unstake submitted.');
      }catch(e){ alert(e?.message || 'Unstake failed'); }
    }
    async function fallbackTransfer(id){
      if (!window.web3 || !window.collection || !window.user_address){
        alert('Wallet or contracts unavailable.'); return;
      }
      const to=(prompt('Transfer to address (0x…)')||'').trim();
      if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }
      try{
        await collection.methods.safeTransferFrom(window.user_address, to, id).send({ from: window.user_address });
        alert('Transfer submitted.');
      }catch(e){ alert(e?.message || 'Transfer failed'); }
    }

    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id || fmStakeBtn.disabled) return;
      if (window.initiate_stake) {
        const msg = await window.initiate_stake(current.id);
        if (msg) alert(msg);
      } else {
        await fallbackStake(current.id);
      }
    });
    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id || fmUnstakeBtn.disabled) return;
      if (window.initiate_withdraw) {
        const msg = await window.initiate_withdraw(current.id);
        if (msg) alert(msg);
      } else {
        await fallbackUnstake(current.id);
      }
    });
    fmTransferBtn?.addEventListener('click', async () => {
      if (!current.id || fmTransferBtn.disabled) return;
      if (window.transferToken) {
        try { await window.transferToken(CFG.COLLECTION_ADDRESS, current.id); }
        catch(e){ alert(e?.message || 'Transfer failed'); }
      } else {
        await fallbackTransfer(current.id);
      }
    });

    // open modal from any element carrying [data-open-modal]
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-modal]');
      if (!opener) return;
      const id = Number(opener.getAttribute('data-token-id'));
      const owner = opener.getAttribute('data-owner') || '';
      const staked = opener.getAttribute('data-staked') === 'true';
      if (Number.isFinite(id)) {
        e.preventDefault();
        openFrogModal({ id, owner, staked });
      }
    });

    // update button states when wallet state changes
    function updateButtons(){
      if (!current.open) return;
      setState({ staked: current.staked, owner: current.owner });
    }
    window.addEventListener('wallet:connected',  updateButtons);
    window.addEventListener('wallet:disconnected',updateButtons);

    // tiny warmup so the first layered render is snappy
    window.addEventListener('load', () => {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(tmp);
      if (typeof window.buildFrog128 === 'function') {
        try { const m = window.buildFrog128(tmp, 1); if (m?.then) m.finally(()=>tmp.remove()); else tmp.remove(); }
        catch { tmp.remove(); }
      } else { tmp.remove(); }
    });

    // expose (optional)
    window.FFModal = { openFrogModal };
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
