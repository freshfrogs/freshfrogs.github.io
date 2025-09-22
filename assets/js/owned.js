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

  // ------- 128px layered renderer (same as Pond) -------
  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);
  function mk(tag, props={}, style={}){ const el=document.createElement(tag); Object.assign(el,props); Object.assign(el.style,style); return el; }
  function safe(s){ return encodeURIComponent(s); }

  function pickBgCandidates(id){
    const local = `frog/${id}.png`;
    const root  = `/frog/${id}.png`;
    const cfg   = (CFG.SOURCE_PATH ? `${CFG.SOURCE_PATH}/frog/${id}.png` : local);
    return [local, root, cfg];
  }
  async function applyFrogBackground(container, tokenId){
    Object.assign(container.style, {
      backgroundRepeat:'no-repeat',
      backgroundSize:'2000% 2000%',
      backgroundPosition:'100% 100%',
      imageRendering:'pixelated'
    });
    const urls = pickBgCandidates(tokenId);
    for (const url of urls){
      const ok = await new Promise(resolve=>{
        const img = new Image();
        img.crossOrigin='anonymous';
        img.onload=()=>{
          try{
            const c=document.createElement('canvas'); c.width=2; c.height=2;
            const x=c.getContext('2d'); x.drawImage(img,0,0,2,2);
            const d=x.getImageData(0,0,1,1).data;
            container.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},${(d[3]||255)/255})`;
          }catch{}
          container.style.backgroundImage = `url('${url}')`;
          resolve(true);
        };
        img.onerror=()=>resolve(false);
        img.src=url;
      });
      if (ok) return true;
    }
    container.style.backgroundColor='#151a1e';
    container.style.backgroundImage='none';
    return false;
  }
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
    await applyFrogBackground(container, tokenId);

    const metaUrl = `frog/json/${tokenId}.json`;
    try{
      const meta = await (await fetch(metaUrl)).json();
      const attrs = Array.isArray(meta?.attributes)?meta.attributes:[];
      for (const r of attrs){
        const attr = String(r.trait_type || r.traitType || '').trim();
        const val  = String(r.value).trim();
        if (!attr || !val) continue;
        container.appendChild(makeLayerImg(attr,val,SIZE));
      }
    }catch{
      const [url] = pickBgCandidates(tokenId);
      const flat = new Image(); flat.decoding='async'; flat.loading='lazy';
      Object.assign(flat.style,{position:'absolute',inset:'0',width:`${SIZE}px`,height:`${SIZE}px`,imageRendering:'pixelated',zIndex:'2'});
      flat.src=url; container.appendChild(flat);
    }
  }
  // expose renderer globally for pond.js & modal.js
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

  // ------- Card builder (LAYERED + compact actions under subtitle) -------
  // ------- Card builder (LAYERED + compact actions under subtitle) -------
  function liCard(id, subtitle, ownerAddr, isStaked = false){
    const li = document.createElement('li');
    li.className = 'list-item';

    li.setAttribute('data-token-id', id);
    li.setAttribute('data-src', isStaked ? 'staked' : 'owned');
    li.setAttribute('data-staked', isStaked ? 'true' : 'false');
    if (ownerAddr) li.setAttribute('data-owner', ownerAddr);

    const left = document.createElement('div');
    Object.assign(left.style, { width:'128px', height:'128px', minWidth:'128px', minHeight:'128px' });
    li.appendChild(left);
    if (typeof window.buildFrog128 === 'function') window.buildFrog128(left, id);

    const rank = (RANKS && (String(id) in RANKS)) ? RANKS[String(id)] : null;
    const mid = document.createElement('div');

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.innerHTML = `<b>Frog #${id}</b> ${pillRank(rank)}`;
    mid.appendChild(header);

    const sub = document.createElement('div');
    sub.className = 'muted';
    sub.textContent = subtitle || '';
    mid.appendChild(sub);

    const actions = document.createElement('div');
    actions.style.marginTop = '6px';
    actions.style.display = 'flex';
    actions.style.flexWrap = 'wrap';
    actions.style.gap = '6px';

    const moreBtn = document.createElement('button');
    moreBtn.className = 'btn btn-ghost btn-xs';
    moreBtn.textContent = 'See more';
    moreBtn.setAttribute('data-open-modal','');
    moreBtn.setAttribute('data-token-id', String(id));
    moreBtn.setAttribute('data-owner', ownerAddr || '');
    moreBtn.setAttribute('data-staked', isStaked ? 'true' : 'false');
    actions.appendChild(moreBtn);

    const os = document.createElement('a');
    os.className = 'btn btn-ghost btn-xs';
    os.target = '_blank'; os.rel = 'noopener';
    os.href = `https://opensea.io/assets/ethereum/${COLLECTION}/${id}`;
    os.textContent = 'OpenSea';
    actions.appendChild(os);

    const es = document.createElement('a');
    es.className = 'btn btn-ghost btn-xs';
    es.target = '_blank'; es.rel = 'noopener';
    es.href = `https://etherscan.io/token/${COLLECTION}?a=${id}`;
    es.textContent = 'Etherscan';
    actions.appendChild(es);

    mid.appendChild(actions);
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
    const out=[];
    for (const c of candidates){
      try{
        const who = await contract.stakerAddress(c.id);
        if (who && who.toLowerCase() === addr.toLowerCase()){
          out.push({ id:c.id, since:c.since, staker: who });
        }
      }catch{}
    }
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
    ids.forEach(id=> ul.appendChild(liCard(id, 'Not staked • Owned by You', ST.addr, false)));
    setStatus(`Showing ${ids.length.toLocaleString()} owned frog(s).`);
  }
  function renderStakedFromCache(){
    clearList();
    const rows = ST.cache.stakedRows || [];
    if (!rows.length){ setStatus('No frogs from this wallet are currently staked.'); return; }
    rows.forEach(r=>{
      const info = r.since ? `Staked ${fmtAgoMs(Date.now()-r.since.getTime())} • Owned by You` : 'Staked • Owned by You';
      // pass sinceMs so modal can compute "X ago" correctly from the button dataset
      ul.appendChild(liCard(r.id, info, ST.addr, true, r.since ? r.since.getTime() : NaN));
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
