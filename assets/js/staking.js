(function(FF, CFG){
  const ST = { items:[], page:0, pageSize:5 };
  let provider, signer, controller;

  // Tabs
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
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    // load ABI
    const abi = await FF.fetchJSON('assets/abi/controller_abi.json');
    controller = new ethers.Contract(CFG.CONTROLLER_ADDRESS, abi, signer);
    return true;
  }

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

      // rewards
      const rewards = await controller.availableRewards(user);
      const rewardsLine = document.getElementById('rewardsLine');
      if(rewardsLine){
        rewardsLine.style.display='block';
        document.getElementById('rewardsEth').textContent = ethers.BigNumber.isBigNumber(rewards) ? rewards.toString() : String(rewards);
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

    // staked
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

  // expose
  window.FF_setTab = setTab;
  window.FF_clearStaked = ()=>{ ST.items=[]; ST.page=0; if(window.FF_getTab && window.FF_getTab()==='staked') render(); };
})(window.FF, window.FF_CFG);
