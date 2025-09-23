// assets/js/modal.js — layered 256×256 hero, rank, "Staked Xd ago", green-hover buttons, and your stake/unstake/transfer hooks
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
    const fmOwner = $('#fmOwner');           // sr-only
    const fmRarityLine = $('#fmRarityLine'); // sr-only
    const fmCollection = $('#fmCollection'); // sr-only
    const fmAttrs = $('#fmAttrs');

    const fmStakeBtn = $('#fmStakeBtn');
    const fmUnstakeBtn = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');

    const osLink = $('#fmOsLink');
    const ethLink = $('#fmEthLink');
    const rawLink = $('#fmRawLink');

    const hero = $('#fmHero');

    // current modal state
    let current = { open:false, id:null, owner:'', staked:false, sinceMs:null };

    // --- stake age helpers ---
    const fmtDaysAgo = (ms) => `${Math.floor(ms / 86400000)}d ago`;
    function ownerLabel(a){ return (a && a.slice) ? (a.slice(0,6)+'…'+a.slice(-4)) : '—'; }

    async function fetchStakeSinceMs(id, owner){
      try{
        const API = 'https://api.reservoir.tools/users/activity/v6';
        const headers = { accept:'*/*' };
        if (CFG.FROG_API_KEY) headers['x-api-key'] = CFG.FROG_API_KEY;

        const qs = (cont='')=>{
          const p = new URLSearchParams({
            users: owner, collection: CFG.COLLECTION_ADDRESS, types:'transfer', limit:'20'
          });
          if (cont) p.set('continuation', cont);
          return p.toString();
        };

        let cont = '';
        for (let guard = 0; guard < 20; guard++){
          const res = await fetch(`${API}?${qs(cont)}`, { headers });
          const json = await res.json();
          const acts = json?.activities || [];
          for (const a of acts){
            const to = String(a?.toAddress || '').toLowerCase();
            if (to !== String(CFG.CONTROLLER_ADDRESS || '').toLowerCase()) continue;
            const tid = Number(a?.token?.tokenId);
            if (tid !== id) continue;
            const ms = a?.createdAt ? Date.parse(a.createdAt)
                     : (a?.timestamp ? a.timestamp*1000 : null);
            if (ms) return ms;
          }
          cont = json?.continuation || '';
          if (!cont) break;
        }
      }catch(e){ console.warn('fetchStakeSinceMs failed', e); }
      return null;
    }

    async function setStakeLine({ staked, owner }){
      if (!fmLine) return;
      if (!staked){
        fmLine.textContent = `Not staked • Owned by ${ownerLabel(owner)}`;
        return;
      }
      if (current?.sinceMs && !isNaN(current.sinceMs)){
        fmLine.textContent = `Staked ${fmtDaysAgo(Date.now() - Number(current.sinceMs))} • Owned by ${ownerLabel(owner)}`;
        return;
      }
      fmLine.textContent = `Staked • Owned by ${ownerLabel(owner)}`;
      const ms = await fetchStakeSinceMs(current.id, owner);
      if (ms && current?.open && current.id){
        current.sinceMs = ms;
        fmLine.textContent = `Staked ${fmtDaysAgo(Date.now() - ms)} • Owned by ${ownerLabel(owner)}`;
      }
    }

    function setOpen(v){
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
    }

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      const raw = FF?.imageUrl ? FF.imageUrl(id, 1024) : (CFG.IMAGE_BASE ? `${CFG.IMAGE_BASE}/${id}.png` : '');
      osLink && (osLink.href = os);
      ethLink && (ethLink.href = es);
      rawLink && (rawLink.href = raw);
    }

    function setHeroFrom(id){
      if (!hero) return;
      const flatUrl = FF?.imageUrl ? FF.imageUrl(id, 1024) : (CFG.IMAGE_BASE ? `${CFG.IMAGE_BASE}/${id}.png` : '');
      hero.style.background = 'transparent';
      hero.style.backgroundImage = `url("${flatUrl}")`;
      hero.style.backgroundRepeat = 'no-repeat';
      hero.style.backgroundPosition = 'center';
      hero.style.backgroundSize = 'contain';
      hero.style.imageRendering = 'pixelated';
      // attempt to derive background from top-left pixel to avoid empty bg
      try{
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = ()=>{
          try{
            const c = document.createElement('canvas'); c.width=2; c.height=2;
            const x = c.getContext('2d', { willReadFrequently:true });
            x.drawImage(img, 0, 0, 2, 2);
            const d = x.getImageData(0,0,1,1).data;
            hero.style.backgroundColor = `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
          }catch(e){}
        };
        img.src = flatUrl;
      }catch(e){}
    }

    function setRank(id){
      if (!fmRankNum) return;
      try{
        const r = (FF && FF.ranks && FF.ranks.lookup && FF.ranks.lookup[id]) || null;
        fmRankNum.textContent = r ? `#${r.rank}` : '—';
      }catch(e){
        fmRankNum.textContent = '—';
      }
    }

    function setAttrs(id){
      if (!fmAttrs) return;
      fmAttrs.innerHTML = '';
      if (!FF || !FF.ranks || !FF.ranks.items) return;
      const it = FF.ranks.items.find(x=> Number(x.id)===Number(id));
      if (!it || !Array.isArray(it.attributes)) return;
      it.attributes.forEach(a=>{
        const row = document.createElement('div');
        row.className = 'attr-row';
        const k = document.createElement('div'); k.className='attr-k'; k.textContent = a.trait_type || a.type || '—';
        const v = document.createElement('div'); v.className='attr-v'; v.textContent = a.value || '—';
        row.appendChild(k); row.appendChild(v);
        fmAttrs.appendChild(row);
      });
    }

    function youAddr(){
      return (FF?.wallet?.address) || window.user_address || window.FF_WALLET?.address || null;
    }

    async function setState({ staked, owner }){
      current.staked = !!staked; current.owner = owner || '';

      // Render the stake line (will include "NNd ago" when available)
      await setStakeLine({ staked, owner });

      fmOwner && (fmOwner.textContent = owner || '—');

      const you = youAddr();
      const isYou = !!you && !!owner && you.toLowerCase() === owner.toLowerCase();
      const canStake    = you && isYou && !staked;
      const canUnstake  = you && isYou &&  staked;
      const canTransfer = you && isYou;

      if (fmStakeBtn)    fmStakeBtn.disabled    = !canStake;
      if (fmUnstakeBtn)  fmUnstakeBtn.disabled  = !canUnstake;
      if (fmTransferBtn) fmTransferBtn.disabled = !canTransfer;
    }

    function setId(id){
      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = CFG.COLLECTION_ADDRESS);
    }

    function closeModal(){
      setOpen(false);
      current = { open:false, id:null, owner:'', staked:false, sinceMs:null };
    }

    // external API for other scripts
    window.FFModal = window.FFModal || {};
    window.FFModal.close = closeModal;

    function onKey(e){ if (e.key === 'Escape') closeModal(); }
    function onBg(e){ if (e.target === modal) closeModal(); }
    $('#fmClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', onBg);
    document.addEventListener('keydown', onKey);

    // Open + populate
    function openLinks(id){ setLinks(id); }
    function openHero(id){ setHeroFrom(id); }
    function openRank(id){ setRank(id); }
    function openAttrs(id){ setAttrs(id); }

    function openFrogModal ({ id, owner, staked, sinceMs }){
      setOpen(true);
      current = { id, owner, staked, sinceMs: sinceMs || null };
      setId(id);
      openLinks(id);
      openHero(id);
      openRank(id);
      openAttrs(id);
      setState({ staked, owner });
    }

    window.FFModal.openFrogModal = openFrogModal;

    // Buttons
    fmStakeBtn?.addEventListener('click', async ()=>{
      if (!current?.id) return;
      try{
        if (window.stakeSelected) {
          await window.stakeSelected([current.id]);
        }else{
          alert('Stake action not wired');
        }
      }catch(e){ alert(e?.message || 'Stake failed'); }
    });

    fmUnstakeBtn?.addEventListener('click', async ()=>{
      if (!current?.id) return;
      try{
        if (window.unstakeSelected) {
          await window.unstakeSelected([current.id]);
        }else{
          alert('Unstake action not wired');
        }
      }catch(e){ alert(e?.message || 'Unstake failed'); }
    });

    fmTransferBtn?.addEventListener('click', async ()=>{
      if (!current?.id) return;
      try{
        if (window.transferSingle){
          await window.transferSingle(current.id);
        } else {
          if (!window.collection || !window.user_address){ alert('Wallet/contracts not available'); return; }
          const to=(prompt('Transfer to address (0x…)')||'').trim();
          if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }
          try{ await collection.methods.safeTransferFrom(window.user_address, to, current.id).send({ from: window.user_address }); }
          catch(e){ alert(e?.message || 'Transfer failed'); }
        }
      }catch(e){ alert(e?.message || 'Transfer failed'); }
    });

    // ---------- open from list items ----------
    window.FFModal = { openFrogModal };
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-modal]');
      if (!opener) return;
      const id     = Number(opener.getAttribute('data-token-id'));
      const owner  = opener.getAttribute('data-owner') || '';
      const staked = opener.getAttribute('data-staked') === 'true';
      const sinceAttr = opener.getAttribute('data-since');
      const sinceMs   = sinceAttr ? Number(sinceAttr) : null;
      if (!Number.isFinite(id)) return;
      e.preventDefault();
      window.FFModal.openFrogModal({ id, owner, staked, sinceMs });
    });

    // keep buttons in sync with wallet connection
    function updateButtons(){ if (current.open) setState({ staked: current.staked, owner: current.owner }); }
    window.addEventListener('wallet:connected',  updateButtons);
    window.addEventListener('wallet:disconnected', updateButtons);
    window.addEventListener('FF:walletConnected',  updateButtons);
    window.addEventListener('FF:walletDisconnected', updateButtons);
  });
})(window.FF || (window.FF={}), window.FF_CFG);
