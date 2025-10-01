// assets/js/owned.js
// Owned / Staked list styled like Pond (128×128 thumbs) + passes data-since to modal
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
  async function reservoirFetch(url, opts={}, retries=2, timeoutMs=8000){
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
        await new Promise(r=>setTimeout(r, 300*(i+1)));
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

  // ------- 128px flat thumbnails like Pond -------
  function flatThumb128(container, id){
    const img = new Image();
    img.decoding='async'; img.loading='lazy';
    img.width=128; img.height=128;
    img.className='thumb128';
    img.src = `${(window.FF_CFG?.SOURCE_PATH || '')}/frog/${id}.png`;
    container.appendChild(img);
  }

  // expose buildFrog128 globally (if not already)
  function safe(s){ return encodeURIComponent(s); }
  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
  function makeLayerImg(attr, value, px){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `/frog/build_files/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;
    const img = new Image();
    img.decoding='async'; img.loading='lazy';
    img.dataset.attr=attr;
    Object.assign(img.style,{
      position:'absolute', left:'0', top:'0',
      width:`${px}px`, height:`${px}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });
    if (allowAnim){ img.src=gif; img.onerror=()=>{ img.onerror=null; img.src=png; }; }
    else img.src=png;

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{ img.style.transform='translate(-8px,-12px)'; img.style.filter='drop-shadow(0 5px 0 rgba(0,0,0,.45))'; });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='translate(0,0)'; img.style.filter='none'; });
    }
    return img;
  }
  async function buildFrog128(container, tokenId){
    const SIZE=128;
    Object.assign(container.style,{
      width:`${SIZE}px`,height:`${SIZE}px`,minWidth:`${SIZE}px`,minHeight:`${SIZE}px`,
      position:'relative',overflow:'hidden',borderRadius:'8px',imageRendering:'pixelated'
    });

    const flatUrl = `${(window.FF_CFG?.SOURCE_PATH || '')}/frog/${tokenId}.png`;
    container.style.backgroundRepeat='no-repeat';
    container.style.backgroundSize='2000% 2000%';
    container.style.backgroundPosition='100% -1200%';
    container.style.backgroundImage=`url("${flatUrl}")`;

    try{
      const meta = await (await fetch(`frog/json/${tokenId}.json`)).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr,val,SIZE));
      }
    }catch{
      const img = new Image(); img.decoding='async'; img.loading='lazy';
      Object.assign(img.style,{position:'absolute',inset:'0',width:`${SIZE}px`,height:`${SIZE}px`,imageRendering:'pixelated',zIndex:'2'});
      img.src=flatUrl; container.appendChild(img);
    }
  }
  window.buildFrog128 = window.buildFrog128 || buildFrog128;

  // ------- state (with caching) -------
  const ST = {
    addr:null,
    mode:'owned',
    cache:{ ownedIds:null, stakedRows:null },
    loadingOwned:false,
    loadingStaked:false,
    connected:false
  };

  function setStatus(msg){ if (status) status.textContent = msg; }
  function clearList(){ if (ul) ul.innerHTML=''; }
  function setActiveTab(which){
    const owned = (which==='owned');
    tabOwned?.setAttribute('aria-selected', owned ? 'true' : 'false');
    tabStaked?.setAttribute('aria-selected', owned ? 'false' : 'true');
  }

  // ------- Card builder (pond-style list row, 128 thumb) -------
  // supports sinceMs to set data-since for staked rows (modal shows "Staked NNd ago")
  function liCard(id, subtitle, ownerAddr, isStaked = false, sinceMs = null){
    const li = document.createElement('li');
    li.className = 'list-item';
    li.setAttribute('tabindex','0');
    li.setAttribute('role','button');

    // make the whole row open the modal (and add data for modal.js)
    li.setAttribute('data-token-id', id);
    li.setAttribute('data-open-modal','');
    li.setAttribute('data-owner', ownerAddr || '');
    li.setAttribute('data-staked', isStaked ? 'true' : 'false');
    if (isStaked && sinceMs && isFinite(sinceMs)) {
      li.setAttribute('data-since', String(sinceMs));
    }

    // LEFT: 128×128 still image (fast)
    const left = document.createElement('div');
    Object.assign(left.style, { width:'128px', height:'128px', minWidth:'128px', minHeight:'128px' });
    li.appendChild(left);
    flatThumb128(left, id);

    // MID: title + subtitle
    const rank = (RANKS && (String(id) in RANKS)) ? RANKS[String(id)] : null;
    const mid = document.createElement('div');
    mid.innerHTML =
      `<div style="display:flex;align-items:center;gap:8px;">
         <b>Frog #${id}</b> ${pillRank(rank)}
       </div>
       <div class="muted">${subtitle || ''}</div>`;
    li.appendChild(mid);

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
        if (prev){
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
    async function next(){
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
    const workers = Array.from({length: Math.min(limit, candidates.length)}, ()=> next());
    await Promise.all(workers);
    return out.sort((a,b)=>{
      const ta=a.since? a.since.getTime():0; const tb=b.since? b.since.getTime():0; return ta - tb;
    });
  }

  async function fetchStakedRows(addr){
    const cands = await fetchStakeCandidates(addr);
    return await confirmStakedByUser(addr, cands);
  }

  // ------- renderers (from cache) -------
  function renderOwnedFromCache(){
    clearList();
    const ids = ST.cache.ownedIds || [];
    if (!ids.length){ setStatus('No owned frogs in this wallet for this collection.'); return; }
    ids.forEach(id=> ul.appendChild(liCard(id, 'Owned by You', ST.addr, false)));
    setStatus(`Showing ${ids.length.toLocaleString()} owned frog(s). Scroll for more.`);
  }

  function renderStakedFromCache(){
    clearList();
    const rows = ST.cache.stakedRows || [];
    if (!rows.length){ setStatus('No frogs from this wallet are currently staked.'); return; }
    rows.forEach(r=>{
      const sinceMs = r.since ? r.since.getTime() : null;
      const info = r.since ? `Staked by You ${fmtAgoMs(Date.now()-sinceMs)}` : 'Staked by You';
      ul.appendChild(liCard(r.id, info, ST.addr, true, sinceMs));
    });
    setStatus(`Showing ${rows.length} staked frog(s). Scroll for more.`);
  }

  // ------- orchestration -------
  async function refreshOwnedFast(){
    if (ST.loadingOwned) return;
    ST.loadingOwned = true;
    setStatus('Loading your owned frogs…');
    try{
      const ownedIds = await fetchOwnedIds(ST.addr);
      ST.cache.ownedIds = ownedIds;
      if (ST.mode === 'owned') renderOwnedFromCache();
    }catch(e){
      console.warn('Owned load failed', e);
      ST.cache.ownedIds = ST.cache.ownedIds || [];
      if (ST.mode === 'owned') renderOwnedFromCache();
    }finally{
      ST.loadingOwned = false;
    }
  }

  async function refreshStakedBg(){
    if (ST.loadingStaked) return;
    ST.loadingStaked = true;
    try{
      const stakedRows = await fetchStakedRows(ST.addr);
      ST.cache.stakedRows = stakedRows;
      if (ST.mode === 'staked') renderStakedFromCache();
    }catch(e){
      console.warn('Staked load failed', e);
      ST.cache.stakedRows = ST.cache.stakedRows || [];
      if (ST.mode === 'staked') renderStakedFromCache();
    }finally{
      ST.loadingStaked = false;
    }
  }

  async function refresh(which=ST.mode){
    if (!ST.connected || !ST.addr){
      clearList();
      setStatus('Connect your wallet to view Owned & Staked.');
      return;
    }
    if (!RANKS) await loadRanks();

    ST.mode = which;
    setActiveTab(which);

    // Kick owned fast; staked in background
    if (ST.cache.ownedIds === null) refreshOwnedFast();
    if (ST.cache.stakedRows === null) refreshStakedBg();

    if (which==='owned') {
      if (ST.cache.ownedIds !== null) renderOwnedFromCache();
      else setStatus('Loading your owned frogs…');
    } else {
      if (ST.cache.stakedRows !== null) renderStakedFromCache();
      else setStatus('Loading your staked frogs…');
    }
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
    setActiveTab('owned');
    refresh('owned');
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
