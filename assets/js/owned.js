// assets/js/owned.js
(function(CFG){
  const API_USERS = 'https://api.reservoir.tools/users';
  const ACTIVITY  = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';

  // ------- DOM -------
  const ul         = document.getElementById('chipWrap');
  const status     = document.getElementById('stakeStatus');
  const tabOwned   = document.getElementById('tabOwned');
  const tabStaked  = document.getElementById('tabStaked');
  const refreshBtn = document.getElementById('refreshOwned');

  // ------- fetch helpers -------
  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }
  async function reservoirFetch(url, opts={}, retries=3, timeoutMs=9000){
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
          if (i < retries){ await new Promise(r=>setTimeout(r, 300*(i+1))); continue; }
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      }catch(e){
        clearTimeout(t);
        if (i === retries) throw e;
        await new Promise(r=>setTimeout(r, 350*(i+1)));
      }
    }
  }
  const fmtAgoMs = (ms)=>{
    const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
    if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
  };

  // ------- rarity -------
  let RANKS = null;
  async function loadRanks(){
    try { RANKS = await (await fetch('assets/freshfrogs_rank_lookup.json')).json(); }
    catch { RANKS = {}; }
  }
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  // ------- 64px flat renderer for lists -------
  function renderFlat64(container, tokenId){
    container.innerHTML = '';
    const img = new Image();
    img.decoding = 'async';
    img.loading  = 'lazy';
    img.className = 'thumb64';
    img.src = `${(CFG.SOURCE_PATH || '')}/frog/${tokenId}.png`;
    container.appendChild(img);
  }

  // expose layered builder if other parts still need it (unused here)
  function makeLayerImg(){/* no-op in this file now */} // kept to avoid accidental refs
  async function buildFrog128(){/* no-op here now */}   // kept to avoid accidental refs
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  // ------- state (with caching) -------
  const ST = {
    addr:null,
    mode:'owned',
    cache:{ ownedIds:null, stakedRows:null },
    loading:false,
    connected:false
  };

  function setStatus(msg){ if (status) status.textContent = msg; }
  function clearList(){ if (ul) ul.innerHTML=''; }
  function setActiveTab(which){
    const owned = (which==='owned');
    tabOwned?.setAttribute('aria-selected', owned ? 'true' : 'false');
    tabStaked?.setAttribute('aria-selected', owned ? 'false' : 'true');
  }

  // ------- Card builder (FLAT 64 + click-anywhere to open modal) -------
  function liCard(id, subtitle, ownerAddr, isStaked = false, sinceMs = null){
    const li = document.createElement('li');
    li.className = 'list-item';

    // Make whole row open the modal
    li.setAttribute('data-open-modal', '');
    li.setAttribute('data-token-id', id);
    li.setAttribute('data-src', isStaked ? 'staked' : 'owned');
    li.setAttribute('data-staked', isStaked ? 'true' : 'false');
    if (ownerAddr) li.setAttribute('data-owner', ownerAddr);
    if (sinceMs != null) li.setAttribute('data-since', String(sinceMs));

    // LEFT: 64×64 flat PNG
    const left = document.createElement('div');
    Object.assign(left.style, { width:'64px', height:'64px', minWidth:'64px', minHeight:'64px' });
    li.appendChild(left);
    renderFlat64(left, id);

    // MID: title + subtitle
    const rank = (RANKS && (String(id) in RANKS)) ? RANKS[String(id)] : null;
    const mid = document.createElement('div');
    mid.innerHTML =
      `<div style="display:flex;align-items:center;gap:8px;">
         <b>Frog #${id}</b> ${pillRank(rank)}
       </div>
       <div class="muted">${subtitle || ''}</div>`;
    li.appendChild(mid);

    // RIGHT: (optional) simple status tag for staked
    if (isStaked){
      const right = document.createElement('div');
      right.className = 'price';
      right.textContent = 'Staked';
      li.appendChild(right);
    } else {
      // keep 3-column grid structure consistent
      const spacer = document.createElement('div');
      spacer.style.minWidth = '1px';
      li.appendChild(spacer);
    }

    return li;
  }

  // ------- data fetchers -------
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
  async function confirmStakedByUser(addr, candidates, concurrency=8){
    if (!window.ethereum) return [];
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      CFG.CONTROLLER_ADDRESS,
      ['function stakerAddress(uint256) view returns (address)'],
      provider
    );
    const out = [];
    let i = 0;
    async function worker(){
      while (i < candidates.length){
        const c = candidates[i++]; // take next
        try{
          const who = await contract.stakerAddress(c.id);
          if (who && who.toLowerCase() === addr.toLowerCase()){
            out.push({ id:c.id, since:c.since, staker: who });
          }
        }catch{/* ignore */}
      }
    }
    await Promise.all(Array.from({length: Math.min(concurrency, candidates.length)}, worker));
    return out;
  }

  async function fetchStakedRows(addr){
    const cands = await fetchStakeCandidates(addr);
    const rows  = await confirmStakedByUser(addr, cands);
    return rows.sort((a,b)=>{
      const ta=a.since? a.since.getTime():0; const tb=b.since? b.since.getTime():0; return ta - tb;
    });
  }

  // ------- renderers (from cache) -------
  function renderOwnedFromCache(){
    clearList();
    const ids = ST.cache.ownedIds || [];
    if (!ids.length){ setStatus('No owned frogs in this wallet for this collection.'); return; }
    ids.forEach(id=> ul.appendChild(liCard(id, 'Not staked • Owned by You', ST.addr, false, null)));
    setStatus(`Showing ${ids.length.toLocaleString()} owned frog(s).`);
  }
  function renderStakedFromCache(){
    clearList();
    const rows = ST.cache.stakedRows || [];
    if (!rows.length){ setStatus('No frogs from this wallet are currently staked.'); return; }
    rows.forEach(r=>{
      const info = r.since ? `Staked ${fmtAgoMs(Date.now()-r.since.getTime())} • Owned by You` : 'Staked • Owned by You';
      ul.appendChild(liCard(r.id, info, ST.addr, true, r.since ? r.since.getTime() : null));
    });
    setStatus(`Showing ${rows.length} staked frog(s).`);
  }

  // ------- orchestration -------
  async function preloadBoth(){
    if (ST.loading) return;
    ST.loading = true;
    setStatus('Loading your frogs…');
    try{
      const [ownedIds, stakedRows] = await Promise.all([
        fetchOwnedIds(ST.addr),
        fetchStakedRows(ST.addr)
      ]);
      ST.cache.ownedIds  = ownedIds;
      ST.cache.stakedRows= stakedRows;
    }catch(e){
      console.warn('Owned/Staked preload failed', e);
      ST.cache.ownedIds  = ST.cache.ownedIds  || [];
      ST.cache.stakedRows= ST.cache.stakedRows|| [];
    }finally{
      ST.loading = false;
    }
  }

  async function refresh(which=ST.mode){
    if (!ST.connected || !ST.addr){
      clearList();
      setStatus('Connect your wallet to view Owned & Staked.');
      return;
    }
    if (!RANKS) await loadRanks();

    // one-time preload (then switch is instant)
    if (ST.cache.ownedIds===null || ST.cache.stakedRows===null){
      await preloadBoth();
    }

    ST.mode = which;
    setActiveTab(which);

    if (which==='owned') renderOwnedFromCache();
    else renderStakedFromCache();
  }

  // ------- events -------
  tabOwned?.addEventListener('click', ()=>{ if (ST.mode!=='owned') refresh('owned'); });
  tabStaked?.addEventListener('click', ()=>{ if (ST.mode!=='staked') refresh('staked'); });
  refreshBtn?.addEventListener('click', async ()=>{
    if (!ST.connected){ setStatus('Connect your wallet first.'); return; }
    setStatus('Refreshing…');
    ST.cache.ownedIds=null; ST.cache.stakedRows=null;
    await refresh(ST.mode);
  });

  // Wait for explicit connect from wallet.js
  window.addEventListener('wallet:connected', async (ev)=>{
    ST.connected = true;
    ST.addr = ev?.detail?.address || null;
    ST.cache.ownedIds = null;
    ST.cache.stakedRows = null;
    await refresh('owned'); // default to Owned on connect
  });
  window.addEventListener('wallet:disconnected', ()=>{
    ST.connected = false;
    ST.addr = null;
    ST.cache.ownedIds = null;
    ST.cache.stakedRows = null;
    clearList();
    setStatus('No wallet connected.');
    setActiveTab('owned');
  });

  // Initial (disconnected) state
  setActiveTab('owned');
  clearList();
  setStatus('Connect your wallet to view Owned & Staked.');
})(window.FF_CFG);
