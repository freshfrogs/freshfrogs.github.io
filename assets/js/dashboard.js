// assets/js/dashboard.js
// Slim dashboard: counts (owned, staked), rewards (flyz), claim, approval. No frog lists (panel is mounted separately).

(function (CFG) {
  const API_USERS   = 'https://api.reservoir.tools/users';
  const ACTIVITY    = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION  = CFG.COLLECTION_ADDRESS || '';

  const $ = (id)=> document.getElementById(id);
  const statusEl  = $('dashStatus');
  const addrEl    = $('dashAddress');
  const ownedEl   = $('dashOwned');
  const stakedEl  = $('dashStaked');
  const rewardsEl = $('dashRewards');
  const claimBtn  = $('dashClaim');
  const apprBtn   = $('dashApprove');
  const apprNote  = $('dashApprovalNote');
  const refreshBtn= $('dashRefresh');

  function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }
  function shorten(a){ return a ? (a.slice(0,6)+'…'+a.slice(-4)) : ''; }

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }
  async function reservoirFetch(url, opts={}, retries=2, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        if (res.status === 429 && i < retries){
          const ra = Number(res.headers.get('retry-after')) || (1<<i);
          await new Promise(r=>setTimeout(r, ra*1000));
          continue;
        }
        if (!res.ok){
          if (i < retries){ await new Promise(r=>setTimeout(r, 250*(i+1))); continue; }
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      }catch(e){
        clearTimeout(t);
        if (i === retries) throw e;
        await new Promise(r=>setTimeout(r, 320*(i+1)));
      }
    }
  }

  async function fetchOwnedCount(addr){
    let cont=''; let total=0;
    for (let guard=0; guard<30; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit:'200', includeTopBid:'false' });
      if (cont) qs.set('continuation', cont);
      const url = `${API_USERS}/${addr}/tokens/v8?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      total += (json?.tokens||[]).length;
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return total;
  }

  async function fetchStakeCandidates(addr){
    const map=new Map(); let cont='';
    for (let guard=0; guard<40; guard++){
      const qs = new URLSearchParams({ users: addr, collection: COLLECTION, types:'transfer', limit:'20' });
      if (cont) qs.set('continuation', cont);
      const url = `${ACTIVITY}?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      const acts = json?.activities || [];
      for (const a of acts){
        const to = (a?.toAddress||'').toLowerCase();
        if (to !== CONTROLLER) continue;
        const id = Number(a?.token?.tokenId);
        if (!Number.isFinite(id)) continue;
        const since = a?.createdAt ? new Date(a.createdAt) :
                      (a?.timestamp ? new Date(a.timestamp*1000) : null);
        const prev = map.get(id);
        if (!prev || (since && prev.since && since.getTime()>prev.since.getTime())) map.set(id, {id, since});
        else if (!prev) map.set(id,{id,since});
      }
      cont = json?.continuation || '';
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
    let idx = 0, count = 0;
    const limit = 6;
    async function worker(){
      while (idx < cands.length){
        const i = idx++;
        const c = cands[i];
        try{
          const who = await contract.stakerAddress(c.id);
          if (who && who.toLowerCase() === addr.toLowerCase()) count++;
        }catch{}
      }
    }
    await Promise.all(Array.from({length: Math.min(limit, cands.length)}, ()=>worker()));
    return count;
  }

  async function checkApproval(addr){
    if (!window.ethereum) return null;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const erc721  = new ethers.Contract(
      CFG.COLLECTION_ADDRESS,
      ['function isApprovedForAll(address owner, address operator) view returns (bool)',
       'function setApprovalForAll(address operator, bool approved)'],
      provider
    );
    try{
      const ok = await erc721.isApprovedForAll(addr, CFG.CONTROLLER_ADDRESS);
      return !!ok;
    }catch{ return null; }
  }
  async function requestApproval(addr){
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer   = provider.getSigner();
    const erc721   = new ethers.Contract(
      CFG.COLLECTION_ADDRESS,
      ['function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    await erc721.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true);
  }

  async function readRewards(addr){
    try{
      if (typeof window.get_pending_rewards === 'function'){
        const v = await window.get_pending_rewards(addr);
        if (v == null) return null;
        const n = (typeof v === 'object' && v._isBigNumber) ? Number(ethers.utils.formatUnits(v, 18))
                : (typeof v === 'string' ? Number(v) : Number(v));
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

  const st = { connected:false, addr:null, busy:false };

  async function refresh(){
    if (st.busy) return; st.busy = true;
    try{
      if (!st.connected || !st.addr){
        setStatus('Connect your wallet to load your dashboard.');
        addrEl && (addrEl.textContent = '');
        ownedEl && (ownedEl.textContent = '—');
        stakedEl&& (stakedEl.textContent = '—');
        rewardsEl&&(rewardsEl.textContent= '—');
        claimBtn && (claimBtn.disabled = true);
        apprBtn  && (apprBtn.disabled  = true);
        apprNote && (apprNote.textContent = '');
        return;
      }

      setStatus('Loading…');
      addrEl && (addrEl.textContent = shorten(st.addr));

      let approved = await checkApproval(st.addr);
      if (approved === null){ apprNote?.(apprNote.textContent = 'Approval: Unknown'); apprBtn && (apprBtn.disabled=true); }
      else if (approved){ apprNote && (apprNote.textContent='Approval: Granted'); apprBtn && (apprBtn.disabled=true); }
      else { apprNote && (apprNote.textContent='Approval: Not granted'); apprBtn && (apprBtn.disabled=false); }

      const [ownedCount, stakedCount] = await Promise.all([
        fetchOwnedCount(st.addr),
        countStakedByUser(st.addr)
      ]);
      ownedEl  && (ownedEl.textContent  = String(ownedCount));
      stakedEl && (stakedEl.textContent = String(stakedCount));

      const rew = await readRewards(st.addr);
      if (rew == null){ rewardsEl && (rewardsEl.textContent = '—'); claimBtn && (claimBtn.disabled = true); }
      else {
        const pretty = (Math.round(rew * 100) / 100).toLocaleString();
        rewardsEl && (rewardsEl.textContent = `${pretty} FLYZ`);
        claimBtn && (claimBtn.disabled = rew <= 0);
      }

      setStatus('Ready');
    }catch(e){
      console.warn('Dashboard refresh failed:', e);
      setStatus('Failed to load. Try again.');
    }finally{
      st.busy = false;
    }
  }

  refreshBtn?.addEventListener('click', refresh);
  apprBtn?.addEventListener('click', async ()=>{
    if (!st.connected || !st.addr) return;
    try{ apprBtn.disabled=true; apprBtn.textContent='Approving…'; await requestApproval(st.addr); apprBtn.textContent='Approved'; await refresh(); }
    catch(e){ console.warn(e); apprBtn.textContent='Approve Staking'; apprBtn.disabled=false; alert(e?.message||'Approval failed'); }
  });
  claimBtn?.addEventListener('click', async ()=>{
    if (!st.connected || !st.addr) return;
    try{ claimBtn.disabled=true; claimBtn.textContent='Claiming…'; const msg = await claimRewards(st.addr); if (msg) alert(msg); claimBtn.textContent='Claim Rewards'; await refresh(); }
    catch(e){ console.warn(e); claimBtn.textContent='Claim Rewards'; claimBtn.disabled=false; alert(e?.message||'Claim failed'); }
  });

  window.addEventListener('wallet:connected', (ev)=>{ st.connected=true; st.addr = ev?.detail?.address || null; refresh(); });
  window.addEventListener('wallet:disconnected', ()=>{ st.connected=false; st.addr=null; refresh(); });

  refresh();
})(window.FF_CFG || {});
// === Dashboard: top-right wallet chip ===
(function(FF){
  const shorten = (a)=> a ? (a.slice(0,6)+'…'+a.slice(-4)) : '—';

  // Try a few common header selectors used in the project
  function findHeader(){
    return document.querySelector(
      '#dashboardPanel .panel-head, ' +
      '#dashboard .panel-head, ' +
      '.dashboard-panel .panel-head, ' +
      '#dashboardPanel .panel-header, ' +
      '.dashboard-panel .panel-header'
    );
  }

  function ensureChip(){
    const head = findHeader();
    if (!head) return null;

    // Make sure header can right-align things
    const style = window.getComputedStyle(head);
    if (style.display !== 'flex') {
      head.style.display = 'flex';
      head.style.alignItems = 'center';
    }

    let chip = head.querySelector('.dash-wallet-chip');
    if (!chip){
      chip = document.createElement('div');
      chip.className = 'dash-wallet-chip dash-wallet-push';
      chip.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="addr">—</span>`;
      head.appendChild(chip);
    }
    return chip;
  }

  function currentAddr(){
    return (FF && FF.wallet && FF.wallet.address) || null;
  }

  function render(){
    const chip = ensureChip();
    if (!chip) return;

    const addrEl = chip.querySelector('.addr');
    const addr = currentAddr();
    if (!addr) {
      addrEl.textContent = 'Not connected';
      chip.style.opacity = .6;
      return;
    }
    addrEl.textContent = shorten(addr);
    chip.style.opacity = .95;
  }

  // Initial paint
  document.addEventListener('DOMContentLoaded', render);

  // Refresh when wallet changes (wallet.js typically sets FF.wallet + emits events)
  window.addEventListener('ff:wallet:connected', render);
  window.addEventListener('ff:wallet:changed', render);
  window.addEventListener('ff:wallet:disconnected', render);

  // Fallback: also react to MetaMask account changes if exposed
  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on('accountsChanged', render);
  }

  // Safety: small delayed pass (in case header renders after DOMContentLoaded)
  window.addEventListener('load', ()=> setTimeout(render, 50));
})(window.FF || (window.FF = {}));
