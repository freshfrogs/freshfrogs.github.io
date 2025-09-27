// assets/js/dashboard.js
// Slim dashboard: counts (owned, staked), rewards (flyz), claim, approval.
// + UI tweaks: replace connect button with address; fix Pond KPI labels/links.

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

  // NEW: top-right connect button element we convert into an address badge
  const connectBtnEl = document.getElementById('ownedConnectBtn');

  function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }
  function shorten(a){ return a ? (a.slice(0,6)+'…'+a.slice(-4)) : ''; }

  // ------- Reservoir fetch helpers -------
  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
    // NOTE: You said not to keep/use any other API key here; this uses your existing FROG_API_KEY
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

  // ------- Dashboard data -------
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
        if (prev) {
          if (since && prev.since && since.getTime()>prev.since.getTime()) map.set(id, {id, since});
        } else {
          map.set(id,{id,since});
        }
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

  // ------- UI: replace connect button with address badge -------
  function setOwnedHeaderBadge(addr){
    if (!connectBtnEl) return;
    const label = addr ? shorten(addr) : 'Not connected';
    connectBtnEl.textContent = label;
    connectBtnEl.classList.add('btn-connected');     // keep your pill style
    connectBtnEl.style.pointerEvents = 'none';       // make it non-clickable
    connectBtnEl.removeAttribute('onclick');
    connectBtnEl.removeAttribute('href');
    connectBtnEl.setAttribute('aria-disabled', 'true');
  }

  // ------- Pond KPIs: labels + controller link + FLYZ link -------
  function applyPondKpiLabels(){
    // expects the top info boxes to be in .info-grid-2 as earlier
    const grid = document.querySelector('.info-grid-2');
    if (!grid) return;

    // Box 1: 🪷 Total Staked (keep value as-is; other code fills it)
    const b1 = grid.querySelector('.info-block:nth-child(1)');
    if (b1){
      const ik = b1.querySelector('.ik'); if (ik) ik.textContent = '🪷 Total Staked';
      const inn= b1.querySelector('.in'); if (inn) inn.textContent = 'Across the collection';
    }

    // Box 2: 🧰 Controller (never "-")
    const b2 = grid.querySelector('.info-block:nth-child(2)');
    if (b2){
      const ik = b2.querySelector('.ik'); if (ik) ik.textContent = '🧰 Controller';
      const iv = b2.querySelector('.iv');
      const inn= b2.querySelector('.in');
      if (iv){
        iv.innerHTML = `<a href="https://etherscan.io/address/${CONTROLLER}" target="_blank" rel="noopener">${shorten(CONTROLLER)}</a>`;
      }
      if (inn){ inn.textContent = 'Staking contract'; }
    }

    // Box 3: 🪰 Rewards → $FLYZ link
    const b3 = grid.querySelector('.info-block:nth-child(3)');
    if (b3){
      const ik = b3.querySelector('.ik'); if (ik) ik.textContent = '🪰 Rewards';
      const iv = b3.querySelector('.iv');
      const inn= b3.querySelector('.in');
      if (iv){
        iv.innerHTML = `<a href="https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63" target="_blank" rel="noopener">$FLYZ</a>`;
      }
      if (inn){ inn.textContent = 'Earnings token'; }
    }
  }

  // ------- State + refresh -------
  const st = { connected:false, addr:null, busy:false };

  async function refresh(){
    if (st.busy) return; st.busy = true;
    try{
      applyPondKpiLabels(); // make sure Pond headers are correct on every pass

      if (!st.connected || !st.addr){
        setStatus('Connect your wallet to load your dashboard.');
        addrEl && (addrEl.textContent = '');
        ownedEl && (ownedEl.textContent = '—');
        stakedEl&& (stakedEl.textContent = '—');
        rewardsEl&&(rewardsEl.textContent= '—');
        claimBtn && (claimBtn.disabled = true);
        apprBtn  && (apprBtn.disabled  = true);
        apprNote && (apprNote.textContent = '');
        setOwnedHeaderBadge(null); // show "Not connected" pill
        return;
      }

      setStatus('Loading…');
      addrEl && (addrEl.textContent = shorten(st.addr));
      setOwnedHeaderBadge(st.addr); // show address in the header pill

      let approved = await checkApproval(st.addr);
      if (approved === null){ apprNote && (apprNote.textContent = 'Approval: Unknown'); apprBtn && (apprBtn.disabled=true); }
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

  // Wallet lifecycle hooks
  window.addEventListener('wallet:connected', (ev)=>{ st.connected=true; st.addr = ev?.detail?.address || null; refresh(); });
  window.addEventListener('wallet:disconnected', ()=>{ st.connected=false; st.addr=null; refresh(); });

  // First paint
  document.addEventListener('DOMContentLoaded', ()=>{ applyPondKpiLabels(); setOwnedHeaderBadge(null); });
  refresh();
})(window.FF_CFG || {});
