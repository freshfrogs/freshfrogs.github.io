// assets/js/modal.js — Layered render (via buildFrog128 scaled to 256), fast-open
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
    const fmAttrs = $('#fmAttrs');          // <ul> Attributes (no section title)
    const fmHero = $('#fmHero');            // art container (256×256 layered)

    const fmStakeBtn = $('#fmStakeBtn');
    const fmUnstakeBtn = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');

    const fmOpenSea = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmImageLink = $('#fmImageLink');  // repurposed as "Original"

    let current = { id:null, owner:'', staked:false, open:false, sinceMs:null };
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
      // "Original" (still image)
      fmImageLink && (fmImageLink.href = `${base}/frog/${id}.png`);
    }

    // Format "NNd/h/m/s ago" from ms
    function fmtAgoMs(ms){
      const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
      if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
    }

    function setHeaderLine(staked, owner, sinceMs){
      const you = (FF?.wallet?.address) || window.FF_WALLET?.address || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      const left = staked
        ? (`Staked` + (sinceMs ? ` ${fmtAgoMs(sinceMs)} ` : ' ') + `• Owned by ${ownerText}`)
        : `Not staked • Owned by ${ownerText}`;
      fmLine && (fmLine.textContent = left);
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    function setState(staked, owner, sinceMs){
      current.staked = !!staked; current.owner = owner || ''; current.sinceMs = sinceMs || null;
      fmOwner && (fmOwner.textContent = owner || '—');
      fmStakeBtn && (fmStakeBtn.disabled = !!staked);
      fmUnstakeBtn && (fmUnstakeBtn.disabled = !staked);
      setHeaderLine(!!staked, owner || '', sinceMs || null);
    }

    // ---- Background color sampler (no background image to avoid silhouette) ----
    async function sampleAndSetBgColor(el, id){
      try{
        const url = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const ok = await new Promise(res=>{
          img.onload = ()=>res(true);
          img.onerror = ()=>res(false);
          img.src = url;
        });
        if (!ok) { el.style.backgroundColor = 'var(--panelSoft, #11161d)'; return; }
        const c = document.createElement('canvas');
        c.width = 2; c.height = 2;
        const ctx = c.getContext('2d', { willReadFrequently:true });
        ctx.drawImage(img, 0, 0, 2, 2);
        const d = ctx.getImageData(0,0,1,1).data;
        el.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},1)`;
      }catch{
        el.style.backgroundColor = 'var(--panelSoft, #11161d)';
      }
    }

    // ---- Layered draw: reuse buildFrog128, scale to 256 ----
    function scaleLayersTo256(container){
      // Double every child layer that has width/height set to 128.
      Array.from(container.children).forEach(ch=>{
        if (ch.tagName === 'IMG' || ch.tagName === 'CANVAS'){
          ch.style.width = '256px';
          ch.style.height = '256px';
          ch.style.transformOrigin = 'top left';
          // If a previous transform exists (e.g., hover lifts), append scale only if needed:
          const t = getComputedStyle(ch).transform;
          if (!t || t === 'none'){
            ch.style.transform = 'scale(2)';           // 128×2 => 256
          } else if (!/scale\(/.test(ch.style.transform)) {
            ch.style.transform = `${ch.style.transform} scale(2)`;
          }
        }
      });
    }

    function ensureHero256(){
      if (!fmHero) return;
      fmHero.style.aspectRatio = '1 / 1';
      fmHero.style.minWidth = '256px';
      fmHero.style.minHeight = '256px';
      fmHero.style.borderRadius = '12px';
      fmHero.style.overflow = 'hidden';
      fmHero.style.position = 'relative';
    }

    async function drawFrog(id){
      fmHero.innerHTML = '';
      ensureHero256();
      await sampleAndSetBgColor(fmHero, id);

      // Render layered 128, then scale layers to 256
      if (typeof window.buildFrog128 === 'function') {
        try{
          const maybe = window.buildFrog128(fmHero, id);
          if (maybe?.then){
            await maybe;
          }
        }catch(e){ console.warn('buildFrog128 failed', e); }
      } else {
        console.warn('buildFrog128 is not defined; showing flat image');
        const img = new Image();
        img.decoding='async'; img.loading='lazy';
        img.style.position='absolute'; img.style.inset='0';
        img.style.width='256px'; img.style.height='256px';
        img.style.imageRendering='pixelated';
        img.src = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
        fmHero.appendChild(img);
        return;
      }

      // Upscale the layered children
      scaleLayersTo256(fmHero);
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

    // ----- Optional: fetch "since" if not provided, only for staked tokens -----
    async function tryFetchStakedSince(id){
      if (!CFG?.FROG_API_KEY) return null;
      try{
        const qs = new URLSearchParams({
          collection: CFG.COLLECTION_ADDRESS,
          tokens: `${CFG.COLLECTION_ADDRESS}:${id}`,
          types: 'transfer',
          limit: '20'
        });
        const url = `https://api.reservoir.tools/tokens/activity/v6?${qs.toString()}`;
        const res = await fetch(url, { headers: { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY } });
        if (!res.ok) return null;
        const json = await res.json();
        const acts = json?.activities || [];
        const controller = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
        // latest transfer INTO controller
        for (const a of acts){
          const to = (a?.toAddress || '').toLowerCase();
          if (to === controller){
            const when = a?.createdAt ? new Date(a.createdAt)
                       : (a?.timestamp ? new Date(a.timestamp*1000) : null);
            if (when) return Date.now() - when.getTime();
          }
        }
        return null;
      }catch{ return null; }
    }

    // ------------- public open (instant) -------------
    async function openFrogModal({ id, owner, staked, sinceMs }) {
      current.id = id; current.owner = owner || '';

      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS));
      setLinks(id);
      setRarity(id);
      setState(!!staked, owner || '', sinceMs || null);

      setOpen(true);                // open immediately
      // draw & attrs in parallel
      drawFrog(id).catch(()=>{});
      fillAttributes(id).catch(()=>{});

      // If staked and we don't have sinceMs, try to fetch it and update the line
      if (staked && !sinceMs){
        try{
          const fetched = await tryFetchStakedSince(id);
          if (current.open && current.id === id && fetched){
            current.sinceMs = fetched;
            setHeaderLine(true, owner || '', fetched);
          }
        }catch{}
      }
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

    // ---------- open modal from:
    // 1) any [data-open-modal] button
    // 2) or clicking anywhere on a row (li.list-item) that has data-token-id
    document.addEventListener('click', (e) => {
      // (1) explicit button
      let el = e.target.closest('[data-open-modal]');
      if (el) {
        const id = Number(el.getAttribute('data-token-id'));
        const owner = el.getAttribute('data-owner') || '';
        const staked = el.getAttribute('data-staked') === 'true';
        const sinceAttr = el.getAttribute('data-since');
        const sinceMs = sinceAttr ? Number(sinceAttr) : null;
        if (Number.isFinite(id)) {
          e.preventDefault();
          window.FFModal?.openFrogModal({ id, owner, staked, sinceMs });
          return;
        }
      }
      // (2) whole row
      el = e.target.closest('li.list-item[data-token-id]');
      if (!el || e.target.closest('a,button,[data-no-modal]')) return;
      const id = Number(el.getAttribute('data-token-id'));
      const owner = el.getAttribute('data-owner') || '';
      const staked = el.getAttribute('data-staked') === 'true' || (el.getAttribute('data-src') === 'staked');
      const sinceAttr = el.getAttribute('data-since');
      const sinceMs = sinceAttr ? Number(sinceAttr) : null;
      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked, sinceMs });
      }
    });

    // warmup (rarity)
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
