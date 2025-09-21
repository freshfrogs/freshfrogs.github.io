(function(FF, CFG){
  const ST = { items:[] };
  let provider, signer, controller;

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
  window.FF_setTab = setTab;

  function stakingReady(){ return controller && signer && window.FF_getUser(); }
  async function ensureRarity(){ try{ await FF.ensureRarity?.(); }catch{} }

  async function initEthers(){
    if(!window.ethereum) return false;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const abi = [
      {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
      {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
    ];
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
      const rows = await controller.getStakedTokens(user);
      ST.items = (rows||[]).map(r => ({ id: Number(r.tokenId), owner: r.staker || user }));

      // Rewards → 1e18
      const rewards = await controller.availableRewards(user);
      const rewardsLine = document.getElementById('rewardsLine');
      if(rewardsLine){
        rewardsLine.style.display='block';
        let flyz = '0';
        try{
          const one = ethers.BigNumber.from('1000000000000000000');
          flyz = ethers.BigNumber.from(rewards).div(one).toString();
        }catch{ flyz = String(Math.round(Number(rewards)/1e18)); }
        document.getElementById('rewardsEth').textContent = flyz;
      }

      await ensureRarity();
      if(currentTab==='staked') render();
      status.textContent=`Owned/Staked ready • Staked: ${ST.items.length}`;
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

  async function render(){
    const list=document.getElementById('chipWrap'); if(!list) return;
    list.innerHTML='';

    if(currentTab==='owned'){ window.FF_renderOwned?.(); return; }

    await ensureRarity();

    const items=ST.items||[];
    if(!window.FF_getUser()){
      list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to load staked tokens.</div></li>'; return;
    }
    if(!items.length){
      list.innerHTML='<li class="list-item"><div class="muted">No staked tokens yet.</div></li>'; return;
    }

    items.forEach(({id,owner})=>{
      const rank = FF.getRankById ? FF.getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
            <span class="pill pill-green">Staked</span>
          </div>
          <div class="muted">Owner <span class="addr">${owner?FF.shorten(String(owner)):'—'}</span></div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-outline btn-sm" data-unstake="${id}">Un-stake</button>
        </div>`;
      li.addEventListener('click', (ev)=>{ if(ev.target.closest('[data-unstake]')) return; FF.openFrogModal?.({ id }); });
      list.appendChild(li);
    });

    list.querySelectorAll('[data-unstake]').forEach(btn=>{
      btn.addEventListener('click',()=> unstake(btn.getAttribute('data-unstake')));
    });
  }

  window.FF_loadStaked = loadStaked;
  window.FF_clearStaked = ()=>{ ST.items=[]; if(window.FF_getTab && window.FF_getTab()==='staked'){ render(); } };
})(window.FF, window.FF_CFG);
