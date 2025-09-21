(function(FF, CFG){
  const ST = { items:[], page:0, pageSize:5 };
  let provider, signer, controller, collection;

  // ---- tiny helpers (local, no other files required) ----
  function fmtWholeFromWei(weiLike){
    try{
      if (typeof ethers!=="undefined" && ethers.utils?.formatUnits){
        const f = parseFloat(ethers.utils.formatUnits(weiLike, 18));
        return Math.round(f).toLocaleString();
      }
    }catch(_){}
    try{
      const bn = typeof weiLike==='bigint' ? weiLike : BigInt(String(weiLike));
      return (bn / (10n**18n)).toString();
    }catch(_){
      const n = Number(weiLike);
      return Math.round(n/1e18).toLocaleString();
    }
  }
  function sinceShort(date){
    if (!date) return '—';
    const ms = Date.now() - date.getTime();
    const s = Math.floor(ms/1000); if (s < 60) return `${s}s`;
    const m = Math.floor(s/60);    if (m < 60) return `${m}m`;
    const h = Math.floor(m/60);    if (h < 24) return `${h}h`;
    const d = Math.floor(h/24);    return `${d}d`;
  }

  // Tabs (unchanged)
  let currentTab='owned';
  const tabOwned=document.getElementById('tabOwned');
  const tabStaked=document.getElementById('tabStaked');
  const tabsWrap=document.getElementById('stakeTabs');
  function setTab(which){
    currentTab=which;
    const owned=(which==='owned');
    tabOwned?.setAttribute('aria-selected', owned?'true':'false');
    tabStaked?.setAttribute('aria-selected', owned?'false':'true');
    tabsWrap?.style.setProperty('--tab-i', owned?0:1);
    render();
  }
  tabOwned?.addEventListener('click', ()=> setTab('owned'));
  tabStaked?.addEventListener('click', ()=> setTab('staked'));
  window.FF_getTab = ()=> currentTab;

  function stakingReady(){ return controller && signer && window.FF_getUser(); }

  async function initEthers(){
    if(!window.ethereum) return false;
    if (provider && signer && controller && collection) return true;

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Controller
    const ctrlAbi = await FF.fetchJSON('assets/abi/controller_abi.json');
    controller = new ethers.Contract(CFG.CONTROLLER_ADDRESS, ctrlAbi, signer);

    // Collection (ERC721)
    try{
      const colAbi = await FF.fetchJSON('assets/abi/collection_abi.json');
      collection = new ethers.Contract(CFG.COLLECTION_ADDRESS, colAbi, provider); // read-only is fine
    }catch(_){
      collection = null; // pond time-stamp fallback will just omit "staked ago"
    }
    return true;
  }

  // -------- YOUR EXISTING FLOW (kept, with rewards formatting fix) --------
  async function loadStaked(){
    const status=document.getElementById('stakeStatus');
    const user = window.FF_getUser();
    if(!user){ status.textContent='Connect a wallet first.'; return; }
    if(!await initEthers()){ status.textContent='Ethereum provider not available.'; return; }
    try{
      status.textContent='Loading staked…';
      const rows = await controller.getStakedTokens(user); // [{staker, tokenId}]
      ST.items = (rows||[]).map(r => ({ id: Number(r.tokenId), owner: r.staker || user }));
      ST.page = 0;

      // rewards (fixed formatting)
      const rewards = await controller.availableRewards(user);
      const rewardsLine = document.getElementById('rewardsLine');
      if(rewardsLine){
        rewardsLine.style.display='block';
        document.getElementById('rewardsEth').textContent = fmtWholeFromWei(rewards);
      }

      setTab('staked');
      status.textContent=`Staked: ${ST.items.length}`;
    }catch(err){
      console.warn(err);
      status.textContent='Failed to load staked tokens.';
    }
  }

  async function unstake(tokenId){
    if(!stakingReady()) { alert('Wallet/contract not ready'); return; }
    try{
      const tx = await controller.withdraw(ethers.BigNumber.from(String(tokenId)));
      document.getElementById('stakeStatus').textContent = 'Tx sent: '+tx.hash.slice(0,10)+'…';
      await tx.wait();
      ST.items = ST.items.filter(t => t.id !== Number(tokenId));
      render();
      document.getElementById('stakeStatus').textContent = 'Un-staked #'+tokenId;
    }catch(err){
      console.warn(err);
      alert('Failed to un-stake: '+(err?.message||err));
    }
  }

  function render(){
    const wrap=document.getElementById('chipWrap'); if(!wrap) return;
    const list=document.createElement('ul'); list.className='card-list'; wrap.innerHTML=''; wrap.appendChild(list);

    if(currentTab==='owned'){ window.FF_renderOwned(); return; }

    // staked (per-user)
    const items=ST.items||[];
    if(!window.FF_getUser()){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to load staked tokens.</div></li>'; return; }
    if(!items.length){ list.innerHTML='<li class="list-item"><div class="muted">No staked tokens yet. Click “Load Staked”.</div></li>'; return; }
    const start=ST.page*ST.pageSize, end=start+ST.pageSize;
    items.slice(start,end).forEach(({id,owner})=>{
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Owner <span class="addr">${owner?FF.shorten(String(owner)):'—'}</span></div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-outline btn-sm" data-unstake="${id}">Un-stake</button>
        </div>`;
      list.appendChild(li);
    });

    // wire unstake
    list.querySelectorAll('[data-unstake]').forEach(btn=>{
      btn.addEventListener('click',()=> unstake(btn.getAttribute('data-unstake')));
    });

    // pager
    const controls=document.getElementById('stakeControls');
    let more=document.getElementById('stakedMoreBtn');
    let less=document.getElementById('stakedLessBtn');
    const pages=Math.ceil(ST.items.length/ST.pageSize);
    if(!less){ less=document.createElement('button'); less.id='stakedLessBtn'; less.className='btn btn-ghost btn-sm'; less.textContent='Show less'; controls.appendChild(less); }
    if(!more){ more=document.createElement('button'); more.id='stakedMoreBtn'; more.className='btn btn-outline btn-sm'; more.textContent='View more'; controls.appendChild(more); }
    less.style.display = (ST.page>0)?'':'none';
    more.style.display = (ST.page<pages-1)?'':'none';
    more.onclick=()=>{ if(ST.page<pages-1){ ST.page++; render(); } };
    less.onclick=()=>{ if(ST.page>0){ ST.page--; render(); } };
  }

  // buttons
  document.getElementById('loadStakedBtn')?.addEventListener('click', loadStaked);

  // expose originals
  window.FF_setTab = setTab;
  window.FF_clearStaked = ()=>{ ST.items=[]; ST.page=0; if(window.FF_getTab && window.FF_getTab()==='staked') render(); };

  // =========================
  //   THE POND (global view)
  // =========================

  // 1) Time-staked from on-chain logs: most recent Transfer(* -> controller, tokenId)
  async function FF_timeStakedDate(tokenId){
    if (!collection || !provider) { try{ await initEthers(); }catch{} }
    if (!collection || !provider) return null;

    // quick owner check (only compute if currently owned by controller)
    try{
      const ownerNow = await collection.ownerOf(tokenId);
      if (!ownerNow || ownerNow.toLowerCase() !== CFG.CONTROLLER_ADDRESS.toLowerCase()) return null;
    }catch(_){ return null; }

    // query logs for latest transfer into controller for this token
    const startBlock = (CFG.COLLECTION_START_BLOCK ?? 0);
    let events = [];
    try{
      const filter = collection.filters.Transfer(null, CFG.CONTROLLER_ADDRESS, ethers.BigNumber.from(String(tokenId)));
      events = await collection.queryFilter(filter, startBlock, 'latest');
    }catch(_){
      // fallback: manual filter by topics (in case ABI/filter lacks indexed tokenId)
      try{
        const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
        const topicTransfer = iface.getEventTopic('Transfer');
        const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
        const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);
        const logs = await provider.getLogs({
          fromBlock: startBlock,
          toBlock: 'latest',
          address: CFG.COLLECTION_ADDRESS,
          topics: [topicTransfer, null, toTopic, idTopic]
        });
        events = logs.map(l => ({ blockNumber: l.blockNumber }));
      }catch(__){ /* give up */ }
    }
    if (!events || !events.length) return null;
    const last = events[events.length - 1];
    const bn = Number(last.blockNumber);
    const blk = await provider.getBlock(bn);
    return new Date(blk.timestamp * 1000);
  }

  // 2) Fetch tokens owned by controller (prefer your Owned fetcher; fallback to Reservoir)
  async function FF_fetchTokensByOwner(ownerAddr){
    // Prefer your existing owned.js function if present
    if (typeof window.FF_fetchTokensByOwner === 'function' && window.FF_fetchTokensByOwner !== FF_fetchTokensByOwner){
      try { return await window.FF_fetchTokensByOwner(ownerAddr); } catch(_) {}
    }

    // Fallback: Reservoir (you’ll provide CFG.FROG_API_KEY on your end)
    const out = [];
    if (!CFG.FROG_API_KEY) return out;
    const base = 'https://api.reservoir.tools/tokens/v7';
    let continuation = '';
    for (let i=0;i<10;i++){ // cap pages defensively
      const params = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: ownerAddr,
        limit: '200',
        includeTopBid: 'false'
      });
      if (continuation) params.set('continuation', continuation);
      const res = await fetch(`${base}?${params.toString()}`, {
        headers: { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY }
      }).catch(()=>null);
      if (!res || !res.ok) break;
      const json = await res.json();
      const arr = (json?.tokens || []).map(t => ({
        tokenId: Number(t?.token?.tokenId),
        id: Number(t?.token?.tokenId),
        owner: ownerAddr
      })).filter(x => Number.isFinite(x.id));
      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // 3) Render the Pond into any container (for the unified panel)
  window.FF_renderPondList = async function(containerEl){
    if (!containerEl) return;
    containerEl.innerHTML = '';

    // ensure provider/contracts ready for time-stamps
    await initEthers().catch(()=>{});

    // fetch all tokens currently owned by controller
    let items = [];
    try { items = await FF_fetchTokensByOwner(CFG.CONTROLLER_ADDRESS); } catch(_){ items = []; }

    if (!items.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No frogs are currently staked.';
      containerEl.appendChild(empty);
      return;
    }

    // Build rows
    for (const it of items){
      const id = Number(it.id ?? it.tokenId);
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;

      // compute "staked since"
      let since = null;
      try { since = await FF_timeStakedDate(id); } catch(_){}

      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">
            Owner Staking Controller
            ${since ? ` • Staked: ${sinceShort(since)} ago` : ''}
          </div>
        </div>`;
      containerEl.appendChild(row);
    }
  };

})(window.FF, window.FF_CFG);
