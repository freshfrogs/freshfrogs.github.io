// assets/js/hub.js
// Unified hub: overview stats, approval + claim, optional mint info (uses your existing hooks if present)

// Requires: ethers v5, FF_CFG present, wallet.js emits wallet:connected / wallet:disconnected
(function (CFG) {
  const API_USERS  = 'https://api.reservoir.tools/users';
  const ACTIVITY   = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';

  // ---- DOM ----
  const $ = (id)=> document.getElementById(id);
  const elAddr   = $('hubAddr');
  const elOwned  = $('hubOwned');
  const elStaked = $('hubStaked');
  const elRew    = $('hubRewards');
  const elAppr   = $('hubApprove');
  const elApprN  = $('hubApprovalNote');
  const elClaim  = $('hubClaim');
  const elRef    = $('hubRefresh');

  // mint
  const elMintPrice  = $('hubMintPrice');
  const elMintSupply = $('hubMintSupply');
  const elMintQty    = $('hubMintQty');
  const elMintBtn    = $('hubMintBtn');
  const elMintNote   = $('hubMintNote');

  function shorten(a){ return a ? (a.slice(0,6)+'…'+a.slice(-4)) : '—'; }
  function requireKey(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
  }
  function apiHeaders(){ return { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY }; }

  async function reservoirFetch(url, opts={}, retries=2, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        if (res.status === 429 && i<retries){
          const ra = Number(res.headers.get('retry-after')) || (1<<i);
          await new Promise(r=>setTimeout(r, ra*1000)); continue;
        }
        if (!res.ok){ if (i<retries){ await new Promise(r=>setTimeout(r, 250*(i+1))); continue; } throw new Error(`HTTP ${res.status}`); }
        return await res.json();
      }catch(e){ clearTimeout(t); if (i===retries) throw e; await new Promise(r=>setTimeout(r, 300*(i+1))); }
    }
  }

  // ---- Overview: owned/staked counts ----
  async function fetchOwnedCount(addr){
    requireKey();
    let cont=''; let total=0;
    for (let guard=0; guard<30; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit:'200', includeTopBid:'false' });
      if (cont) qs.set('continuation', cont);
      const url = `${API_USERS}/${addr}/tokens/v8?${qs.toString()}`;
      const j = await reservoirFetch(url, { headers: apiHeaders() });
      total += (j?.tokens||[]).length;
      cont = j?.continuation || '';
      if (!cont) break;
    }
    return total;
  }

  async function fetchStakeCandidates(addr){
    requireKey();
    const map=new Map(); let cont='';
    for (let guard=0; guard<40; guard++){
      const qs = new URLSearchParams({ users: addr, collection: COLLECTION, types:'transfer', limit:'20' });
      if (cont) qs.set('continuation', cont);
      const url = `${ACTIVITY}?${qs.toString()}`;
      const j = await reservoirFetch(url, { headers: apiHeaders() });
      for (const a of (j?.activities||[])){
        const to = (a?.toAddress||'').toLowerCase();
        if (to !== CONTROLLER) continue;
        const id = Number(a?.token?.tokenId); if (!Number.isFinite(id)) continue;
        const since = a?.createdAt ? new Date(a.createdAt) : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        const prev = map.get(id);
        if (!prev || (since && prev.since && since.getTime()>prev.since.getTime())) map.set(id, {id,since});
        else if (!prev) map.set(id,{id,since});
      }
      cont = j?.continuation || '';
      if (!cont) break;
    }
    return [...map.values()];
  }
  async function countStakedByUser(addr){
    if (!window.ethereum) return 0;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      CFG.CONTROLLER_ADDRESS,
      ['function stakerAddress(uint256) view returns (address)'],
      provider
    );
    const cands = await fetchStakeCandidates(addr);
    const limit = 6; let idx=0; let count=0;
    async function worker(){
      while (idx<cands.length){
        const i = idx++; const c = cands[i];
        try{ const who = await contract.stakerAddress(c.id); if (who && who.toLowerCase()===addr.toLowerCase()) count++; }catch{}
      }
    }
    await Promise.all(Array.from({length: Math.min(limit, cands.length)}, ()=>worker()));
    return count;
  }

  // ---- Approval / Rewards ----
  async function checkApproval(addr){
    if (!window.ethereum) return null;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const erc721   = new ethers.Contract(
      CFG.COLLECTION_ADDRESS,
      ['function isApprovedForAll(address owner, address operator) view returns (bool)'],
      provider
    );
    try { return !!(await erc721.isApprovedForAll(addr, CFG.CONTROLLER_ADDRESS)); }
    catch { return null; }
  }
  async function requestApproval(){
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer   = provider.getSigner();
    const erc721   = new ethers.Contract(
      CFG.COLLECTION_ADDRESS,
      ['function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    return await erc721.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true);
  }

  async function readRewards(addr){
    try{
      if (typeof window.get_pending_rewards === 'function'){
        const v = await window.get_pending_rewards(addr);
        const n = (typeof v === 'object' && v?._isBigNumber) ? Number(ethers.utils.formatUnits(v, 18))
                : Number(v);
        if (isFinite(n)) return n;
      }
      if (typeof window.getRewards === 'function'){
        const n = Number(await window.getRewards(addr));
        if (isFinite(n)) return n;
      }
    }catch{}
    return null;
  }
  async function claimRewards(addr){
    if (typeof window.claim_rewards === 'function') return await window.claim_rewards(addr);
    if (typeof window.claimRewards  === 'function') return await window.claimRewards(addr);
    throw new Error('No claim function found (claim_rewards / claimRewards).');
  }

  // ---- Mint panel (non-breaking: uses your hooks if present) ----
  async function loadMintInfo(){
    try{
      if (typeof window.get_mint_info === 'function'){
        const info = await window.get_mint_info(); // { price, supply, maxSupply } or similar
        if (info){
          const price = info.price ?? info.mintPrice ?? info.priceWei;
          const supply = info.supply ?? info.total ?? info.totalSupply;
          const max = info.maxSupply ?? info.cap ?? CFG.SUPPLY;
          const pretty = price != null
            ? (typeof price === 'object' && price._isBigNumber
               ? `${ethers.utils.formatEther(price)} ETH`
               : (isFinite(price) ? `${price} ETH` : String(price)))
            : '—';
          elMintPrice && (elMintPrice.textContent = pretty);
          elMintSupply && (elMintSupply.textContent = (supply!=null && max!=null) ? `${supply}/${max}` : (supply ?? '—'));
          return;
        }
      }
    }catch(e){ console.warn('Mint info failed', e); }
    elMintPrice  && (elMintPrice.textContent  = '—');
    elMintSupply && (elMintSupply.textContent = '—');
  }

  async function doMint(){
    const qty = Math.max(1, Number(elMintQty?.value || 1));
    try{
      if (typeof window.initiate_mint === 'function'){
        elMintBtn.disabled = true; elMintBtn.textContent = 'Minting…';
        const msg = await window.initiate_mint(qty);
        if (msg) alert(msg);
      } else {
        alert('Mint function not available on this site.');
      }
    }catch(e){
      alert(e?.message || 'Mint failed');
    }finally{
      elMintBtn.disabled = false; elMintBtn.textContent = 'Mint';
    }
  }

  // ---- Orchestration ----
  const ST = { connected:false, addr:null, busy:false };

  async function refresh(){
    if (ST.busy) return; ST.busy = true;
    try{
      if (!ST.connected || !ST.addr){
        elAddr   && (elAddr.textContent = '—');
        elOwned  && (elOwned.textContent = '—');
        elStaked && (elStaked.textContent= '—');
        elRew    && (elRew.textContent   = '—');
        elClaim  && (elClaim.disabled    = true);
        elAppr   && (elAppr.disabled     = true);
        elApprN  && (elApprN.textContent = '');
        elMintNote && (elMintNote.textContent = 'Connect wallet to mint.');
        await loadMintInfo();
        return;
      }

      elAddr && (elAddr.textContent = shorten(ST.addr));
      elMintNote && (elMintNote.textContent = '');

      // Approval first
      const approved = await checkApproval(ST.addr);
      if (approved === null){ elApprN&&(elApprN.textContent='Approval: Unknown'); elAppr&&(elAppr.disabled=true); }
      else if (approved){ elApprN&&(elApprN.textContent='Approval: Granted'); elAppr&&(elAppr.disabled=true); }
      else { elApprN&&(elApprN.textContent='Approval: Not granted'); elAppr&&(elAppr.disabled=false); }

      // Counts
      const [ownedCount, stakedCount] = await Promise.all([
        fetchOwnedCount(ST.addr),
        countStakedByUser(ST.addr)
      ]);
      elOwned  && (elOwned.textContent  = String(ownedCount));
      elStaked && (elStaked.textContent = String(stakedCount));

      // Rewards
      const rew = await readRewards(ST.addr);
      if (rew == null){ elRew && (elRew.textContent='—'); elClaim && (elClaim.disabled=true); }
      else { const pretty = (Math.round(rew*100)/100).toLocaleString(); elRew && (elRew.textContent = `${pretty} FLYZ`); elClaim && (elClaim.disabled = rew <= 0); }

      // Mint info (if available)
      await loadMintInfo();

    }catch(e){
      console.warn('Hub refresh failed:', e);
    }finally{
      ST.busy = false;
    }
  }

  // ---- Events ----
  elRef?.addEventListener('click', refresh);
  elAppr?.addEventListener('click', async ()=>{
    if (!ST.connected || !ST.addr) return;
    try{
      elAppr.disabled = true; elAppr.textContent = 'Approving…';
      await requestApproval();
      elAppr.textContent = 'Approved';
      await refresh();
    }catch(e){
      console.warn(e);
      elAppr.textContent = 'Approve Staking'; elAppr.disabled = false;
      alert(e?.message || 'Approval failed');
    }
  });

  elClaim?.addEventListener('click', async ()=>{
    if (!ST.connected || !ST.addr) return;
    try{
      elClaim.disabled = true; elClaim.textContent = 'Claiming…';
      const msg = await claimRewards(ST.addr);
      if (msg) alert(msg);
      elClaim.textContent = 'Claim Rewards';
      await refresh();
    }catch(e){
      console.warn(e);
      elClaim.textContent = 'Claim Rewards'; elClaim.disabled = false;
      alert(e?.message || 'Claim failed');
    }
  });

  elMintBtn?.addEventListener('click', ()=> doMint());

  window.addEventListener('wallet:connected', (ev)=>{
    ST.connected = true;
    ST.addr = ev?.detail?.address || null;
    refresh();
  });
  window.addEventListener('wallet:disconnected', ()=>{
    ST.connected = false;
    ST.addr = null;
    refresh();
  });

  // initial
  refresh();
})(window.FF_CFG || {});
