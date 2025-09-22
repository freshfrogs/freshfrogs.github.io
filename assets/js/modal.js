
(function (FF, CFG) {
  const BASE = (CFG.SOURCE_PATH || '');
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
    const fmMetaLink = $('#fmMetaLink');     // labeled as "Original"
    const fmImageLink = $('#fmImageLink');   // sr-only backup

    let current = { id:null, owner:'', staked:false, open:false };
    const metaCache = new Map();

    // Wallet helper
    function getConnectedAddr(){
      return (
        window.FF_WALLET?.address ||
        FF?.wallet?.address ||
        window.user_address ||
        window.WALLET_ADDR ||
        window.SELECTED_WALLET ||
        null
      );
    }

    // Enable/disable + style action buttons based on ownership / staking state
    function updateButtons(){
      if (!fmStakeBtn || !fmUnstakeBtn || !fmTransferBtn) return;

      const addr = getConnectedAddr();
      const isConnected = !!addr;
      const isOwner = !!(addr && current.owner && addr.toLowerCase() === current.owner.toLowerCase());
      const isStaked = !!current.staked;

      // Base: disabled by default
      const disableAll = () => {
        fmStakeBtn.disabled   = true;
        fmUnstakeBtn.disabled = true;
        fmTransferBtn.disabled= true;
      };

      if (!isConnected || !isOwner) {
        disableAll();      // not connected or not the owner: all grayed out
        return;
      }

      // Owner connected:
      // - If staked: only Unstake is active
      // - If not staked: only Stake + Transfer are active
      fmStakeBtn.disabled    = isStaked;       // Stake enabled only when NOT staked
      fmUnstakeBtn.disabled  = !isStaked;      // Unstake enabled only when staked
      fmTransferBtn.disabled = isStaked;       // Transfer disabled while staked
    }

    // helpers
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));
    const setOpen = (v) => {
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
      if (v) setTimeout(()=>$('.modal-close', modal)?.focus(), 30);
    };

    function setLinks(id){
      if (fmOpenSea)   fmOpenSea.href   = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      if (fmEtherscan) fmEtherscan.href = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      // "Metadata" → "Original" (still PNG)
      if (fmMetaLink){
        fmMetaLink.textContent = 'Original';
        fmMetaLink.href = `${BASE}/frog/${id}.png`;
      }
      if (fmImageLink) fmImageLink.href = `${BASE}/frog/${id}.png`;
    }

    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const url = `${BASE}/frog/json/${id}.json`;
      const p = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
        .catch(e => { console.warn('meta fetch failed', id, e); return null; });
      metaCache.set(id, p);
      return p;
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum) fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
      if (fmRarityLine) fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState({ staked, owner, stakedSince }){
      current.staked = !!staked;
      current.owner = owner || '';
      current.stakedSince = stakedSince || null;

      const addr = getConnectedAddr();
      const isYou = addr && owner && addr.toLowerCase() === owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? (FF?.shorten ? FF.shorten(owner) : owner.slice(0,6)+'…'+owner.slice(-4)) : '—');

      let line;
      if (staked) {
        if (stakedSince && !Number.isNaN(stakedSince)) {
          const ago = (function(ms){
            const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
            if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
          })(Date.now() - stakedSince);
          line = `Staked ${ago} • Owned by ${ownerText}`;
        } else {
          line = `Staked • Owned by ${ownerText}`;
        }
      } else {
        line = `Not staked • Owned by ${ownerText}`;
      }

      if (fmLine) fmLine.textContent = line;
      if (fmOwner) fmOwner.textContent = owner || '—';

      // Button enable/disable logic
      updateButtons();
    }

    // ---- 256×256 layered render using a scaled 128×128 stage ----
    async function drawFrog(id){
      fmHero.innerHTML = '';

      // Ensure hero itself is exactly 256 × 256
      Object.assign(fmHero.style, {
        width:'256px', height:'256px', position:'relative', overflow:'hidden'
      });

      // Background trick: only show the original background color
      fmHero.style.backgroundImage = `url("${BASE}/frog/${id}.png")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize = '2000% 2000%';
      fmHero.style.backgroundPosition = '100% 100%'; // bottom-right

      // Build into a 128×128 inner stage so buildFrog128 can do its thing
      const stage = document.createElement('div');
      // Let buildFrog128 set its usual 128×128 styles on this stage
      Object.assign(stage.style, {
        position:'absolute', left:'0', top:'0'
      });
      fmHero.appendChild(stage);

      let layeredOK = false;
      try{
        // Prefer layered renderer
        if (typeof window.buildFrog128 === 'function'){
          const res = window.buildFrog128(stage, id);
          if (res && typeof res.then === 'function') { await res; }
          // Now scale the whole stage up to 256×256
          Object.assign(stage.style, {
            width:'128px', height:'128px',
            transform:'scale(2)',
            transformOrigin:'top left'
          });
          layeredOK = !!stage.querySelector('img,canvas');
        }
      }catch(e){
        console.warn('layered render failed', e);
      }

      if (!layeredOK){
        // Fallback: flat still (never show empty)
        const img = new Image();
        img.decoding = 'async';
        Object.assign(img.style, { position:'absolute', inset:'0', width:'256px', height:'256px', imageRendering:'pixelated' });
        img.src = `${BASE}/frog/${id}.png`;
        fmHero.appendChild(img);
      }
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

    // public open (instant shell; content fills right after)
    async function openFrogModal({ id, owner, staked }) {
      current.id = id; current.owner = owner || '';

      if (fmId)         fmId.textContent = `#${id}`;
      if (fmCollection) fmCollection.textContent = (CFG.COLLECTION_ADDRESS || '').slice(0,6)+'…'+(CFG.COLLECTION_ADDRESS || '').slice(-4);
      setLinks(id);
      setRarity(id);
      setState({ staked: !!staked, owner: owner || '', stakedSince: current.stakedSince || null });

      setOpen(true);
      drawFrog(id).catch(()=>{});
      fillAttributes(id).catch(()=>{});
    }

    // close / esc
    modal.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false);
    });

    // actions
    // STAKE
    fmStakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (fmStakeBtn.disabled) return;

      // Prefer your custom flow if present
      if (typeof window.initiate_stake === 'function') {
        try { await window.initiate_stake(current.id); } catch(e){ console.warn(e); }
        return;
      }

      // Fallback to previous events (if you still have them)
      if (window.FFStake?.stakeOne)      { try{ await window.FFStake.stakeOne(current.id); }catch(e){ console.warn(e); } }
      else if (window.stakeOne)          { try{ await window.stakeOne(current.id); }catch(e){ console.warn(e); } }
      else window.dispatchEvent(new CustomEvent('ff:stake', { detail: { ids: [current.id] } }));
    });

    // UNSTAKE
    fmUnstakeBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (fmUnstakeBtn.disabled) return;

      if (typeof window.initiate_withdraw === 'function') {
        try { await window.initiiate_withdraw?.(current.id) || await window.initiate_withdraw(current.id); } catch(e){ console.warn(e); }
        return;
      }

      if (window.FFStake?.unstakeOne)    { try{ await window.FFStake.unstakeOne(current.id); }catch(e){ console.warn(e); } }
      else if (window.unstakeOne)        { try{ await window.unstakeOne(current.id); }catch(e){ console.warn(e); } }
      else window.dispatchEvent(new CustomEvent('ff:unstake', { detail: { ids: [current.id] } }));
    });

    // TRANSFER
    fmTransferBtn?.addEventListener('click', async () => {
      if (!current.id) return;
      if (fmTransferBtn.disabled) return;

      // If you expose a generic helper, you can wire it here.
      // Otherwise keep the simple prompt fallback:
      const to = (prompt('Transfer to address (0x…)') || '').trim();
      if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }

      // If you have a helper like send_write_transaction + collection instance, you could do:
      // if (window.send_write_transaction && window.collection && window.user_address) {
      //   try {
      //     await send_write_transaction(window.collection.methods.safeTransferFrom(window.user_address, to, String(current.id)));
      //     return;
      //   } catch(e){ console.warn(e); }
      // }

      // Legacy fallbacks you already had:
      if (window.FFWallet?.transfer) {
        try { await window.FFWallet.transfer(CFG.COLLECTION_ADDRESS, current.id, to); }
        catch(e){ console.error(e); alert('Transfer failed'); }
      } else if (window.transferToken) {
        try { await window.transferToken(CFG.COLLECTION_ADDRESS, current.id, to); }
        catch(e){ console.error(e); alert('Transfer failed'); }
      } else {
        window.dispatchEvent(new CustomEvent('ff:transfer', { detail:{ collection: CFG.COLLECTION_ADDRESS, id: current.id, to } }));
      }
    });

    fmMorphBtn?.addEventListener('click', ()=> alert('Metamorph coming soon ✨'));

    // expose
    window.FFModal = { openFrogModal };

    // OPEN: click anywhere on a list row (Owned / Staked / Pond)
    document.addEventListener('click', (e) => {
      const row = e.target.closest('[data-token-id]');
      if (!row) return;
      if (e.target.closest('a,button,[data-no-modal]')) return;
      const id = Number(row.getAttribute('data-token-id'));
      const owner = row.getAttribute('data-owner') || '';
      const staked = row.getAttribute('data-staked') === 'true' || row.getAttribute('data-src') === 'staked';
      if (Number.isFinite(id)) {
        e.preventDefault();
        window.FFModal?.openFrogModal({ id, owner, staked });
      }
    });

    // warmup
    window.addEventListener('load', () => {
      try { FF?.ensureRarity && FF.ensureRarity(); } catch {}
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});