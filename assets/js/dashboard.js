// assets/js/dashboard.js
(function(CFG){
  const st = {
    connected:false,
    addr:null
  };

  const qs = (id)=> document.getElementById(id);
  const statusEl = qs('dashStatus');
  const ownedEl  = qs('dashOwned');
  const stakedEl = qs('dashStaked');
  const rewEl    = qs('dashRewards');
  const claimBtn = qs('dashClaim');

  function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }

  async function safeAvailableRewards(addr){
    if (!window.controller || !window.availableRewards) {
      // fallback to 0 if controller not on page yet
      return 0;
    }
    try{
      const n = await window.availableRewards(addr);
      return Number(n) || 0;
    }catch{ return 0; }
  }

  // Try to read totals using existing caches from owned.js if available
  function readTotalsFromOwned(){
    try{
      // owned.js keeps cached lists in its module; no direct export—so we compute quickly using DOM:
      const cards = document.querySelectorAll('#chipWrap .list-item');
      if (!cards.length) return { owned:null, staked:null };
      // Heuristic: when "Owned" tab active we can count owned quickly
      const ownedTab = document.getElementById('tabOwned');
      const stakedTab= document.getElementById('tabStaked');
      const owned = ownedTab?.getAttribute('aria-selected')==='true' ? cards.length : null;
      // When on Staked tab
      const staked = stakedTab?.getAttribute('aria-selected')==='true' ? cards.length : null;
      return { owned, staked };
    }catch{ return { owned:null, staked:null }; }
  }

  async function refresh(){
    if (!st.connected || !st.addr){
      setStatus('Connect your wallet to load your stats.');
      ownedEl && (ownedEl.textContent = '—');
      stakedEl&& (stakedEl.textContent = '—');
      rewEl   && (rewEl.textContent    = '—');
      if (claimBtn) claimBtn.disabled = true;
      return;
    }

    setStatus('Loading…');

    // lightweight owned count via Reservoir
    const API_USERS = 'https://api.reservoir.tools/users';
    const headers = CFG.FROG_API_KEY ? { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY } : { accept:'*/*' };

    async function fetchOwnedCount(){
      try{
        let cont='', total=0;
        for (let guard=0; guard<5; guard++){
          const qs = new URLSearchParams({ collection: CFG.COLLECTION_ADDRESS, limit:'200', includeTopBid:'false' });
          if (cont) qs.set('continuation', cont);
          const url = `${API_USERS}/${st.addr}/tokens/v8?${qs.toString()}`;
          const res = await fetch(url, { headers });
          const json = await res.json();
          total += (json?.tokens || []).length;
          cont = json?.continuation || '';
          if (!cont) break;
        }
        return total;
      }catch{ return null; }
    }

    // staked count using controller if present
    async function fetchStakedCount(){
      try{
        if (!window.getStakedTokens) return null;
        const arr = await window.getStakedTokens(st.addr);
        return Array.isArray(arr) ? arr.length : null;
      }catch{ return null; }
    }

    const [owned, staked, rewards] = await Promise.all([
      fetchOwnedCount(),
      fetchStakedCount(),
      safeAvailableRewards(st.addr)
    ]);

    if (ownedEl)  ownedEl.textContent  = (owned==null)  ? '—' : owned.toString();
    if (stakedEl) stakedEl.textContent = (staked==null) ? '—' : staked.toString();
    if (rewEl)    rewEl.textContent    = (rewards==null)? '—' : (+rewards).toFixed(3);

    setStatus('Ready');

    if (claimBtn){
      claimBtn.disabled = !(rewards > 0 && window.controller && window.user_address);
      claimBtn.onclick = async ()=>{
        if (!window.controller || !window.user_address){ alert('Wallet or controller unavailable.'); return; }
        try{
          // assume controller.claimRewards() exists (or adapt to your actual method)
          if (window.controller.methods?.claimRewards){
            await window.controller.methods.claimRewards().send({ from: window.user_address });
            alert('Claim submitted.');
          } else {
            alert('Claim function not found on controller.');
          }
        }catch(e){ alert(e?.message || 'Claim failed'); }
      };
    }
  }

  window.addEventListener('wallet:connected', (ev)=>{
    st.connected = true;
    st.addr = ev?.detail?.address || null;
    refresh();
  });
  window.addEventListener('wallet:disconnected', ()=>{
    st.connected = false;
    st.addr = null;
    refresh();
  });

  // initial state
  refresh();
})(window.FF_CFG);
