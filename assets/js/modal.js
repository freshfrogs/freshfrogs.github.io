// assets/js/modal.js — Layered render (256×256 in modal), fast-open, open via [data-open-modal]
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
    const fmMetaLink = $('#fmMetaLink');
    const fmImageLink = $('#fmImageLink');

    // compact modal buttons
    (function normalizeModalButtons(){
      fmStakeBtn && (fmStakeBtn.className = 'btn btn-solid btn-xs');
      fmUnstakeBtn && (fmUnstakeBtn.className = 'btn btn-xs');
      fmTransferBtn && (fmTransferBtn.className = 'btn btn-xs');
      fmOpenSea && (fmOpenSea.className = 'btn btn-ghost btn-xs');
      fmEtherscan && (fmEtherscan.className = 'btn btn-ghost btn-xs');
      fmMetaLink && (fmMetaLink.className = 'btn btn-ghost btn-xs');
    })();

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

    // ------- 256px layered renderer (modal-only, self-contained) -------
    const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
    const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
    const safe = (s)=> encodeURIComponent(s);

    function makeLayerImg(attr, value, sizePx){
      const allowAnim = !NO_ANIM_FOR.has(attr);
      const base = `/frog/build_files/${safe(attr)}`;
      const png  = `${base}/${safe(value)}.png`;
      const gif  = `${base}/animations/${safe(value)}_animation.gif`;

      const img = new Image();
      img.decoding = 'async';
      img.loading  = 'lazy';
      img.dataset.attr = attr;
      Object.assign(img.style, {
        position:'absolute', left:'0', top:'0',
        width:`${sizePx}px`, height:`${sizePx}px`,
        imageRendering:'pixelated', zIndex:'2',
        transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
      });
      if (allowAnim){
        img.src = gif;
        img.onerror = ()=>{ img.onerror=null; img.src=png; };
      } else {
        img.src = png;
      }
      if (!NO_LIFT_FOR.has(attr)){
        img.addEventListener('mouseenter', ()=>{
          img.style.transform='translate(-8px,-12px)';
          img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))';
        });
        img.addEventListener('mouseleave', ()=>{
          img.style.transform='translate(0,0)';
          img.style.filter='none';
        });
      }
      return img;
    }

    function setBgFromFlat(container, id){
      // set zoomed flat image as background + sample color
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      Object.assign(container.style, {
        backgroundImage: `url("${flatUrl}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '320% 320%',
        backgroundPosition: '100% 100%'
      });
      // sample color async (non-blocking)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=>{
        try{
          const c = document.createElement('canvas');
          c.width = 2; c.height = 2;
          const x = c.getContext('2d');
          x.drawImage(img,0,0,2,2);
          const d = x.getImageData(0,0,1,1).data;
          container.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},${(d[3]||255)/255})`;
        }catch{}
      };
      img.src = flatUrl;
    }

    async function buildFrog256(container, tokenId){
      const SIZE = 256;

      // ensure fixed 256×256 box inside modal
      Object.assign(container.style, {
        width:`${SIZE}px`,
        height:`${SIZE}px`,
        minWidth:`${SIZE}px`,
        minHeight:`${SIZE}px`,
        position:'relative',
        overflow:'hidden',
        borderRadius:'12px',
        imageRendering:'pixelated',
        margin:'0 auto' // center inside the left column
      });

      setBgFromFlat(container, tokenId);

      // fetch attributes and layer
      const metaUrl = `${CFG.SOURCE_PATH || ''}/frog/json/${tokenId}.json`;
      let meta;
      try{
        meta = await (FF?.fetchJSON ? FF.fetchJSON(metaUrl) : fetch(metaUrl).then(r=>r.json()));
      }catch{
        // fallback: just drop the flat PNG on top
        const img = new Image();
        img.decoding='async'; img.loading='lazy';
        Object.assign(img.style, { position:'absolute', inset:'0', width:`${SIZE}px`, height:`${SIZE}px`, imageRendering:'pixelated', zIndex:'2' });
        img.src = `${CFG.SOURCE_PATH || ''}/frog/${tokenId}.png`;
        container.appendChild(img);
        return;
      }

      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const rec of attrs){
        const attr = String(rec.trait_type || rec.traitType || '').trim();
        const val  = String(rec.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr, val, SIZE));
      }
    }

    async function drawFrog(id){
      fmHero.innerHTML = '';
      await buildFrog256(fmHero, id);
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

      setOpen(true);          // open immediately
      drawFrog(id).catch(()=>{});
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

    // expose
    window.FFModal = { openFrogModal };

    // open modal only from [data-open-modal]
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

    // warmup (rarity)
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
