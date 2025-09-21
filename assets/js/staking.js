// assets/js/staking.js
(function(FF, CFG){
  const ST = { items:[], page:0, pageSize:5 };
  let provider, signer, controller, collection;

  // ---------- helpers ----------
  function fmtWholeFromWei(weiLike){
    try {
      if (typeof ethers!=="undefined" && ethers.utils?.formatUnits){
        const f = parseFloat(ethers.utils.formatUnits(weiLike, 18));
        return Math.round(f).toString(); // change to Math.floor for round-down
      }
    } catch {}
    try {
      const bn = typeof weiLike==='bigint' ? weiLike : BigInt(String(weiLike));
      return (bn / (10n**18n)).toString();
    } catch {
      const n = Number(weiLike);
      return Math.round(n/1e18).toString();
    }
  }
  function sinceShort(date){
    if (!date) return '';
    const ms = Date.now() - date.getTime();
    const s = Math.floor(ms/1000); if (s < 60) return `${s}s`;
    const m = Math.floor(s/60);    if (m < 60) return `${m}m`;
    const h = Math.floor(m/60);    if (h < 24) return `${h}h`;
    const d = Math.floor(h/24);    return `${d}d`;
  }
  function stakingReady(){ return controller && signer && window.FF_getUser(); }

  // ---------- tabs (Owned / Staked) ----------
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

  // ---------- ethers / contracts ----------
  async function initEthers(){
    if (provider && signer && controller) return true;
    if(!window.ethereum) return false;

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    const ctrlAbi = await FF.fetchJSON('assets/abi/controller_abi.json');
    controller = new ethers.Contract(CFG.CONTROLLER_ADDRESS, ctrlAbi, signer);

    try {
      const colAbi  = await FF.fetchJSON('assets/abi/collection_abi.json');
      collection = new ethers.Contract(CFG.COLLECTION_ADDRESS, colAbi, provider); // read-only
    } catch {
      collection = null; // Pond still renders; timestamps may be skipped
    }
    return true;
  }

  // ---------- user staked ----------
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

      const rewards = await controller.availableRewards(user);
      const rewardsLine = document.getElementById('rewardsLine');
      if(rewardsLine){
        rewardsLine.style.display='block';
        document.getElementById('rewardsEth').textContent = fmtWholeFromWei(rewards);
      }

      if(currentTab==='staked') render();
      status.textContent=`Staked: ${ST.items.length}`;
    }catch(err){
      console.warn(err);
      status.textContent='Failed to load staked tokens.';
    }
  }
  document.getElementById('loadStakedBtn')?.addEventListener('click', loadStaked);

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

    if(currentTab==='owned'){ window.FF_renderOwned?.(); return; }

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

    list.querySelectorAll('[data-unstake]').forEach(btn=>{
      btn.addEventListener('click',()=> unstake(btn.getAttribute('data-unstake')));
    });

    // pager controls
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

  // ---------- The Pond (controller-owned) ----------
  async function timeStakedDate(tokenId){
    // need collection + provider; try to init if missing
    if (!collection || !provider) { try{ await initEthers(); }catch{} }
    if (!collection || !provider) return null;

    // verify the current owner is controller
    try{
      const ownerNow = await collection.ownerOf(tokenId);
      if (!ownerNow || ownerNow.toLowerCase() !== CFG.CONTROLLER_ADDRESS.toLowerCase()) return null;
    }catch(_){ return null; }

    try{
      // Prefer contract filter if ABI indexes tokenId
      try{
        const filter = collection.filters.Transfer(null, CFG.CONTROLLER_ADDRESS, ethers.BigNumber.from(String(tokenId)));
        const events = await collection.queryFilter(filter, (CFG.COLLECTION_START_BLOCK ?? 0), 'latest');
        if (events.length){
          const last = events[events.length - 1];
          const blk = await provider.getBlock(last.blockNumber);
          return new Date(blk.timestamp * 1000);
        }
      }catch{}

      // Fallback to raw getLogs
      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);
      const logs = await provider.getLogs({
        fromBlock: (CFG.COLLECTION_START_BLOCK ?? 0),
        toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (logs.length){
        const last = logs[logs.length - 1];
        const blk = await provider.getBlock(last.blockNumber);
        return new Date(blk.timestamp * 1000);
      }
    }catch(_){}
    return null;
  }

  async function fetchTokensByOwner(ownerAddr){
    // Use Reservoir users/{owner}/tokens/v8 (same as Owned)
    const out = [];
    const key = CFG.FROG_API_KEY;
    if (!key) return out;

    const base = `https://api.reservoir.tools/users/${ownerAddr}/tokens/v8`;
    let continuation = '';
    for (let i=0;i<6;i++){
      const params = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        limit: '200'
      });
      if (continuation) params.set('continuation', continuation);
      const res = await fetch(`${base}?${params.toString()}`, {
        headers: { accept:'*/*','x-api-key': key }
      }).catch(()=>null);
      if (!res || !res.ok) break;
      const json = await res.json();
      const arr = (json?.tokens || []).map(t => {
        const tid = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        return tid != null ? Number(tid) : NaN;
      }).filter(Number.isFinite);
      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // Render Pond list into provided container
  window.FF_renderPondList = async function(containerEl){
    if (!containerEl) return;
    containerEl.innerHTML = '';

    await initEthers().catch(()=>{});

    let ids = [];
    try { ids = await fetchTokensByOwner(CFG.CONTROLLER_ADDRESS); } catch(_){ ids = []; }

    if (!ids.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No frogs are currently staked.';
      containerEl.appendChild(empty);
      return;
    }

    for (const id of ids){
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      let since = null;
      try { since = await timeStakedDate(id); } catch(_){}

      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Owner Staking Controller${since ? ` • Staked: ${sinceShort(since)} ago` : ''}</div>
        </div>`;
      containerEl.appendChild(row);
    }
  };

  // ---------- expose ----------
  document.getElementById('loadStakedBtn')?.addEventListener('click', loadStaked);

  window.FF_setTab = setTab;
  window.FF_clearStaked = ()=>{ ST.items=[]; ST.page=0; if(window.FF_getTab && window.FF_getTab()==='staked') (render()); };
  window.FF_loadStaked = loadStaked;
  window.FF_timeStakedDate = timeStakedDate;
})(window.FF, window.FF_CFG);
