// assets/js/modal.js — Layered render @ 256px (via buildFrog128), open on row click or [data-open-modal]
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
    const fmOwner = $('#fmOwner');          // hidden (still in DOM)
    const fmRarityLine = $('#fmRarityLine');// hidden
    const fmCollection = $('#fmCollection');// hidden
    const fmAttrs = $('#fmAttrs');          // <ul> Attributes
    const fmHero = $('#fmHero');            // layered art container (we size to 256×256)

    const fmStakeBtn = $('#fmStakeBtn');
    const fmUnstakeBtn = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');
    const fmMorphBtn = $('#fmMorphBtn');

    const fmOpenSea = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmMetaLink = $('#fmMetaLink');    // This is labeled "Original" in the UI

    let current = { id:null, owner:'', staked:false, open:false, since:null };
    const metaCache = new Map(); // id -> Promise(meta)

    // ---------------- helpers ----------------
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));

    const fmtAgoMs = (ms)=>{
      const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
      if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
    };

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

      // "Original" still image link (replace previous "Metadata")
      const base = CFG.SOURCE_PATH || '';
      fmMetaLink && (fmMetaLink.href = `${base}/frog/${id}.png`);
    }

    // Ensure buildFrog128 exists (owned.js defines & exposes it)
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

    async function drawFrog256(id){
      if (!fmHero) return;

      // Size the hero to 256×256 and prep background (hide frog silhouette)
      Object.assign(fmHero.style, {
        width: '256px',
        height: '256px',
        minWidth: '256px',
        minHeight: '256px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        imageRendering: 'pixelated',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '4000% 4000%',   // huge zoom
        backgroundPosition: '3000% 3000%' // push far bottom-right so only bg color shows
      });

      fmHero.innerHTML = '';
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;

      // Wait for layered renderer and build
      try { await waitForRenderer(); } catch(e){ console.warn(e.message); }

      if (typeof window.buildFrog128 === 'function') {
        // buildFrog128 returns a Promise in our implementation
        try { await window.buildFrog128(fmHero, id); } catch {}

        // Enforce 256px on layered images (if any set 128px inline)
        [...fmHero.querySelectorAll('img,canvas')].forEach(el=>{
          el.style.width  = '256px';
          el.style.height = '256px';
        });
      }

      // Sample a corner pixel from a temp <img> to set a solid bg color
      // (in case the CSS background fails to fully hide the silhouette)
      const sample = new Image();
      sample.crossOrigin = 'anonymous';
      sample.onload = ()=>{
        try{
          const c = document.createElement('canvas'); c.width = 2; c.height = 2;
          const ctx = c.getContext('2d', { willReadFrequently:true });
          ctx.drawImage(sample, 0, 0, 2, 2);
          const d = ctx.getImageData(0,0,1,1).data;
          fmHero.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},1)`;
        }catch{}
      };
      sample.src = flatUrl;
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    function setState({ staked, owner, since }) {
      current.staked = !!staked;
      current.owner  = owner || '';
      current.since  = since || null;

      const you = (FF?.wallet?.address) || window.FF_WALLET?.address || window.user_address || null;
      const isYou = you && owner && you.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');

      let line = `${staked ? 'Staked' : 'Not staked'}`;
      if (staked && since){
        const t = (since instanceof Date) ? since : new Date(since);
        if (!isNaN(t)) line = `Staked ${fmtAgoMs(Date.now() - t.getTime())}`;
      }
      line += ` • Owned by ${ownerText}`;

      fmLine && (fmLine.textContent = line);
      fmOwner && (fmOwner.textContent = owner || '—');

      updateButtons();
    }

    function updateButtons(){
      const addr =
        window.FF_WALLET?.address ||
        FF?.wallet?.address ||
        window.user_address ||
        null;

      const isConnected = !!addr;
      const isOwner = isConnected && current.owner && addr.toLowerCase() === current.owner.toLowerCase();

      const canStake    = isConnected && isOwner && !current.staked;
      const canUnstake  = isConnected && isOwner &&  current.staked;
      const canTransfer = isConnected && isOwner;

      fmStakeBtn     && (fmStakeBtn.disabled    = !canStake);
      fmUnstakeBtn   && (fmUnstakeBtn.disabled  = !canUnstake);
      fmTransferBtn  && (fmTransferBtn.disabled = !canTransfer);
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
    async function openFrogModal({ id, owner, staked, since }) {
      current.id = id;

      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS));
      setLinks(id);
      setRarity(id);
      setState({ staked: !!staked, owner: owner || '', since: since || null });

      setOpen(true);                 // open immediately
      drawFrog256(id).catch(()=>{}); // layered render after open
      fillAttributes(id).catch(()=>{});
    }

    // close / esc
    modal.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // actions — wire to your provided functions if present (else custom events)
    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (typeof window.initiate_stake === 'function') { try{ await window.initiate_stake(current.id); }catch(e){ alert(e?.message || 'Stake failed'); } }
      else window.dispatchEvent(new CustomEvent('ff:stake', { detail: { ids: [current.id] } }));
    });
    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (typeof window.initiate_withdraw === 'function') { try{ await window.initiate_withdraw(current.id); }catch(e){ alert(e?.message || 'Unstake failed'); } }
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

    // ---------- open modal from:
    //  (1) Any element with [data-open-modal], OR
    //  (2) Any list row with data-token-id (Owned/Staked/Pond rows)
    document.addEventListener('click', (e) => {
      // Ignore clicks on links/buttons inside a row
      if (e.target.closest('a,button,[data-no-modal]')) return;

      // Preferred hook
      const trigger = e.target.closest('[data-open-modal]');
      if (trigger){
        const id = Number(trigger.getAttribute('data-token-id'));
        const owner = trigger.getAttribute('data-owner') || '';
        const staked = trigger.getAttribute('data-staked') === 'true';
        const sinceAttr = trigger.getAttribute('data-staked-since') || null;
        if (Number.isFinite(id)) {
          e.preventDefault();
          window.FFModal?.openFrogModal({ id, owner, staked, since: sinceAttr });
        }
        return;
      }

      // Row click
      const row = e.target.closest('.list-item[data-token-id]');
      if (!row) return;
      const id = Number(row.getAttribute('data-token-id'));
      const owner = row.getAttribute('data-owner') || '';
      const staked = row.getAttribute('data-staked') === 'true';
      const sinceAttr = row.getAttribute('data-staked-since') || null;
      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked, since: sinceAttr });
      }
    });

    // Keep modal buttons in sync with wallet status:
    window.addEventListener('wallet:connected',  ()=> updateButtons());
    window.addEventListener('wallet:disconnected',()=> updateButtons());

    // warmup (rarity + JIT renderer hint)
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
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
