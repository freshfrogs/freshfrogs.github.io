// assets/js/dashboard.js
// User dashboard: counts (owned, staked), rewards (flyz), claim, approval,
// and quick lists of Owned/Staked that open the same modal.

(function (CFG) {
  const API_USERS   = 'https://api.reservoir.tools/users';
  const ACTIVITY    = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION  = CFG.COLLECTION_ADDRESS || '';

  // ---------- DOM ----------
  const $ = (id)=> document.getElementById(id);
  const statusEl  = $('dashStatus');
  const addrEl    = $('dashAddress');
  const ownedEl   = $('dashOwned');
  const stakedEl  = $('dashStaked');
  const rewardsEl = $('dashRewards');
  const claimBtn  = $('dashClaim');
  const apprBtn   = $('dashApprove');
  const apprNote  = $('dashApprovalNote');
  const ownedList = $('dashOwnedList');   // <ul>
  const stakedList= $('dashStakedList');  // <ul>
  const refreshBtn= $('dashRefresh');

  function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }
  function shorten(a){ return a ? (a.slice(0,6)+'…'+a.slice(-4)) : ''; }

  // ---------- fetch helpers ----------
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
  const fmtAgoMs = (ms)=>{
    const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
    if (d>0) return `${d}d`; if (h>0) return `${h}h`; if (m>0) return `${m}m`; return `${s}s`;
  };

  // ---------- rarity (for pills) ----------
  let RANKS = null;
  async function ensureRanks(){
    if (RANKS) return;
    try { RANKS = await (await fetch('assets/freshfrogs_rank_lookup.json')).json(); }
    catch { RANKS = {}; }
  }
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  // ---------- Reservoir: Owned IDs ----------
  async function fetchOwnedIds(addr){
    const out=[]; let cont='';
    for (let guard=0; guard<30; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit:'200', includeTopBid:'false' });
      if (cont) qs.set('continuation', cont);
      const url = `${API_USERS}/${addr}/tokens/v8?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      const arr = (json?.tokens||[])
        .map(t=>Number(t?.token?.tokenId ?? t?.tokenId ?? t?.id))
        .filter(Number.isFinite);
      out.push(...arr);
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return out;
  }

  // ---------- Staked (by user): detect via activity + controller contract check ----------
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
  async function confirmStakedByUser(addr, candidates){
    if (!window.ethereum) return [];
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      CFG.CONTROLLER_ADDRESS,
      ['function stakerAddress(uint256) view returns (address)'],
      provider
    );
    const limit = 6;
    let idx = 0;
    const out = [];
    async function worker(){
      while (idx < candidates.length){
        const i = idx++;
        const c = candidates[i];
        try{
          const who = await contract.stakerAddress(c.id);
          if (who && who.toLowerCase() === addr.toLowerCase()){
            out.push({ id:c.id, since:c.since, staker: who });
          }
        }catch{/* ignore */}
      }
    }
    await Promise.all(Array.from({length: Math.min(limit, candidates.length)}, ()=>worker()));
    return out.sort((a,b)=>{
      const ta=a.since? a.since.getTime():0; const tb=b.since? b.since.getTime():0; return ta - tb;
    });
  }
  async function fetchStakedRows(addr){
    const c = await fetchStakeCandidates(addr);
    return await confirmStakedByUser(addr, c);
  }

  // ---------- Approval ----------
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

  // ---------- Rewards (best-effort hooks) ----------
  // We’ll try to use your existing globals if present; otherwise show “—”.
  async function readRewards(addr){
    try{
      if (typeof window.get_pending_rewards === 'function'){
        // common pattern: returns BigNumber or number of Flyz with 18 decimals
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

  // ---------- small UI helpers ----------
  function clearLists(){
    if (ownedList) ownedList.innerHTML = '';
    if (stakedList) stakedList.innerHTML= '';
  }
  function mk(tag, props={}, style={}){
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }
  function addOwnedRow(id, owner){
    const li = mk('li', { className:'list-item', tabIndex:0, role:'button' });
    li.setAttribute('data-open-modal','');
    li.setAttribute('data-token-id', String(id));
    li.setAttribute('data-owner', owner || '');
    li.setAttribute('data-staked','false');

    const left = mk('div', {}, { width:'128px',height:'128px',minWidth:'128px',minHeight:'128px' });
    const img = new Image(); img.width=128; img.height=128; img.loading='lazy';
    img.src = `${(CFG.SOURCE_PATH || '')}/frog/${id}.png`;
    left.appendChild(img);
    li.appendChild(left);

    const rank = RANKS?.[String(id)] ?? null;
    const mid = mk('div');
    mid.innerHTML =
      `<div style="display:flex;align-items:center;gap:8px;">
         <b>Frog #${id}</b> ${pillRank(rank)}
       </div>
       <div class="muted">Not staked • Owned by You</div>`;
    li.appendChild(mid);

    ownedList?.appendChild(li);
  }
  function addStakedRow(r, owner){
    const li = mk('li', { className:'list-item', tabIndex:0, role:'button' });
    li.setAttribute('data-open-modal','');
    li.setAttribute('data-token-id', String(r.id));
    li.setAttribute('data-owner', owner || '');
    li.setAttribute('data-staked','true');
    if (r.since instanceof Date) li.setAttribute('data-since', String(r.since.getTime()));

    const left = mk('div', {}, { width:'128px',height:'128px',minWidth:'128px',minHeight:'128px' });
    const img = new Image(); img.width=128; img.height=128; img.loading='lazy';
    img.src = `${(CFG.SOURCE_PATH || '')}/frog/${r.id}.png`;
    left.appendChild(img);
    li.appendChild(left);

    const rank = RANKS?.[String(r.id)] ?? null;
    const ago = r.since ? fmtAgoMs(Date.now() - r.since.getTime()) : null;
    const mid = mk('div');
    mid.innerHTML =
      `<div style="display:flex;align-items:center;gap:8px;">
         <b>Frog #${r.id}</b> ${pillRank(rank)}
       </div>
       <div class="muted">Staked ${ago||''}${ago?' • ':''}Owned by You</div>`;
    li.appendChild(mid);

    stakedList?.appendChild(li);
  }

  // ---------- main refresh ----------
  const st = { connected:false, addr:null, busy:false };

  async function refresh(){
    if (st.busy) return;
    st.busy = true;

    try{
      await ensureRanks();

      if (!st.connected || !st.addr){
        setStatus('Connect your wallet to load your dashboard.');
        addrEl && (addrEl.textContent = '');
        ownedEl && (ownedEl.textContent = '—');
        stakedEl&& (stakedEl.textContent = '—');
        rewardsEl&&(rewardsEl.textContent= '—');
        claimBtn && (claimBtn.disabled = true);
        apprBtn  && (apprBtn.disabled  = true);
        apprNote && (apprNote.textContent = '');
        clearLists();
        return;
      }

      setStatus('Loading…');
      addrEl && (addrEl.textContent = shorten(st.addr));

      // Approval
      let approved = await checkApproval(st.addr);
      if (approved === null){
        apprNote && (apprNote.textContent = 'Approval: Unknown');
        apprBtn  && (apprBtn.disabled = true);
      }else if (approved){
        apprNote && (apprNote.textContent = 'Approval: Granted');
        apprBtn  && (apprBtn.disabled = true);
      }else{
        apprNote && (apprNote.textContent = 'Approval: Not granted');
        apprBtn  && (apprBtn.disabled = false);
      }

      // Counts + lists
      const [ownedIds, stakedRows] = await Promise.all([
        fetchOwnedIds(st.addr),
        fetchStakedRows(st.addr)
      ]);

      ownedEl  && (ownedEl.textContent  = String(ownedIds.length));
      stakedEl && (stakedEl.textContent = String(stakedRows.length));

      clearLists();
      ownedIds.slice(0, 20).forEach(id=> addOwnedRow(id, st.addr));
      stakedRows.slice(0, 20).forEach(r => addStakedRow(r, st.addr));

      // Rewards (best effort)
      const rew = await readRewards(st.addr);
      if (rew == null){
        rewardsEl && (rewardsEl.textContent = '—');
        claimBtn && (claimBtn.disabled = true);
      }else{
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

  // ---------- events ----------
  refreshBtn?.addEventListener('click', refresh);

  apprBtn?.addEventListener('click', async ()=>{
    if (!st.connected || !st.addr) return;
    try{
      apprBtn.disabled = true;
      apprBtn.textContent = 'Approving…';
      await requestApproval(st.addr);
      apprBtn.textContent = 'Approved';
      await refresh();
    }catch(e){
      console.warn(e);
      apprBtn.textContent = 'Approve Staking';
      apprBtn.disabled = false;
      alert(e?.message || 'Approval failed');
    }
  });

  claimBtn?.addEventListener('click', async ()=>{
    if (!st.connected || !st.addr) return;
    try{
      claimBtn.disabled = true;
      claimBtn.textContent = 'Claiming…';
      const msg = await claimRewards(st.addr);
      if (msg) alert(msg);
      claimBtn.textContent = 'Claim Rewards';
      await refresh();
    }catch(e){
      console.warn(e);
      claimBtn.textContent = 'Claim Rewards';
      claimBtn.disabled = false;
      alert(e?.message || 'Claim failed');
    }
  });

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

  // initial
  refresh();
})(window.FF_CFG || {});
