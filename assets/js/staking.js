// assets/js/staking.js
(function(FF, CFG){
  const ST = { items:[], loaded:false };

  // Read-only provider (works without wallet) and optional wallet provider
  const readProvider = new ethers.providers.JsonRpcProvider('https://cloudflare-eth.com');
  let walletProvider = null, signer = null;
  let controller = null, collection = null;

  // Minimal inline ABIs (avoid fetch 404s)
  const CONTROLLER_ABI = [
    // optional convenience, if your controller exposes it
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
    // actions / views
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    // common staker resolvers (we'll try each)
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"tokenIdToStaker","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"ownerOfStaked","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stakedOwnerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ];
  const ERC721_MIN_ABI = [
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];

  async function initContracts(){
    if (!controller){
      if (window.ethereum){
        walletProvider = new ethers.providers.Web3Provider(window.ethereum);
        signer = walletProvider.getSigner();
      }
      controller = new ethers.Contract(CFG.CONTROLLER_ADDRESS, CONTROLLER_ABI, signer || readProvider);
    }
    if (!collection){
      collection = new ethers.Contract(CFG.COLLECTION_ADDRESS, ERC721_MIN_ABI, readProvider);
    }
    return true;
  }

  // ---------- helpers ----------
  function fmtWholeFromWei(weiLike){
    try { return String(Math.round(parseFloat(ethers.utils.formatUnits(weiLike, 18)))); }
    catch {
      try { const bn = typeof weiLike==='bigint'?weiLike:BigInt(String(weiLike)); return (bn/(10n**18n)).toString(); }
      catch { const n=Number(weiLike); return String(Math.round(n/1e18)); }
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
  function isAddr(x){ return /^0x[a-fA-F0-9]{40}$/.test(String(x||'')); }
  const zaddr="0x0000000000000000000000000000000000000000";
  // Use deploy block from config (fallback to your provided height)
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 15209637);

  // ---------- staker resolution ----------
  async function resolveStaker(tokenId){
    await initContracts();
    // 1) try controller view methods
    const tryFns = ['stakerAddress','stakerOf','stakers','tokenIdToStaker','ownerOfStaked','stakedOwnerOf'];
    for (const fn of tryFns){
      try{
        if (typeof controller[fn] === 'function'){
          const a = await controller[fn](ethers.BigNumber.from(String(tokenId)));
          if (isAddr(a) && a !== zaddr) return ethers.utils.getAddress(a);
        }
      }catch{}
    }
    // 2) fallback by logs: last Transfer(* -> controller, tokenId)
    try{
      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);
      const logs = await readProvider.getLogs({
        fromBlock: START_BLOCK, toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS, topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (!logs.length) return null;
      const fromAddr = ethers.utils.getAddress('0x'+logs[logs.length-1].topics[1].slice(26));
      return fromAddr;
    }catch{ return null; }
  }

  // When was it staked? (time of last Transfer -> controller)
  async function timeStakedDate(tokenId){
    await initContracts();
    try{
      const ownerNow = await collection.ownerOf(tokenId).catch(()=>null);
      if (!ownerNow || ownerNow.toLowerCase() !== CFG.CONTROLLER_ADDRESS.toLowerCase()) return null;

      const iface = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)']);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
      const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);
      const logs = await readProvider.getLogs({
        fromBlock: START_BLOCK, toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS, topics: [topicTransfer, null, toTopic, idTopic]
      });
      if (!logs.length) return null;
      const last = logs[logs.length - 1];
      const blk = await readProvider.getBlock(last.blockNumber);
      return new Date(blk.timestamp * 1000);
    }catch{ return null; }
  }

  // Controller-owned token ids (via Reservoir)
  async function controllerOwnedTokenIds(){
    const out = [];
    const key = CFG.FROG_API_KEY;
    if (!key) return out;
    const base = `https://api.reservoir.tools/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8`;
    let continuation = '';
    for (let i=0;i<8;i++){
      const params = new URLSearchParams({ collection: CFG.COLLECTION_ADDRESS, limit: '200' });
      if (continuation) params.set('continuation', continuation);
      const res = await fetch(`${base}?${params.toString()}`, {
        headers: { accept:'*/*','x-api-key': key }
      }).catch(()=>null);
      if (!res || !res.ok) break;
      const json = await res.json();
      const arr = (json?.tokens || []).map(t => Number(t?.token?.tokenId)).filter(Number.isFinite);
      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // ---------- Tabs: Owned / Staked ----------
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

    if (!owned && !ST.loaded && window.FF_getUser()){
      loadStaked().catch(()=>{});
    } else {
      render();
    }
  }
  tabOwned?.addEventListener('click', ()=> setTab('owned'));
  tabStaked?.addEventListener('click', ()=> setTab('staked'));
  window.FF_getTab = ()=> currentTab;
  window.FF_setTab = setTab;

  // ---------- Load user's staked ----------
  async function loadStaked(){
    const status=document.getElementById('stakeStatus');
    const user = window.FF_getUser();
    if(!user){ status.textContent='Connect a wallet first.'; return; }
    await initContracts();
    try{
      status.textContent='Loading staked…';
      let rows = [];

      // Preferred: contract view
      try{
        if (controller.getStakedTokens){
          const res = await controller.getStakedTokens(user);
          rows = (res||[]).map(r => ({ id: Number(r.tokenId), owner: ethers.utils.getAddress(r.staker || user) }));
        }
      }catch{}

      // Fallback: scan controller-owned and filter by real staker
      if (!rows.length){
        const ids = await controllerOwnedTokenIds();
        const out = [];
        for (const id of ids){
          const who = await resolveStaker(id).catch(()=>null);
          if (who && who.toLowerCase() === user.toLowerCase()) out.push({ id, owner: who });
        }
        rows = out;
      }

      ST.items = rows;
      ST.loaded = true;

      // Rewards (rounded whole Flyz)
      const rewardsLine = document.getElementById('rewardsLine');
      try{
        const rewards = await controller.availableRewards(user);
        if(rewardsLine){
          rewardsLine.style.display='block';
          document.getElementById('rewardsEth').textContent = fmtWholeFromWei(rewards);
        }
      }catch{ if(rewardsLine) rewardsLine.style.display='none'; }

      if(currentTab==='staked') render();
      status.textContent = `Staked: ${ST.items.length}`;
    }catch(err){
      console.warn(err);
      status.textContent='Failed to load staked tokens.';
    }
  }
  window.FF_loadStaked = loadStaked;

  async function unstake(tokenId){
    if(!(walletProvider && signer && window.FF_getUser())) { alert('Wallet/contract not ready'); return; }
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
    if(!items.length){ list.innerHTML='<li class="list-item"><div class="muted">No staked tokens yet.</div></li>'; return; }

    // Render ALL (panel scrolls)
    items.forEach(({id,owner})=>{
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item'; li.dataset.frogId=String(id);
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Staker <span class="addr">${owner?FF.shorten(String(owner)):'—'}</span></div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-outline btn-sm" data-unstake="${id}">Un-stake</button>
        </div>`;
      list.appendChild(li);
    });

    // events
    list.querySelectorAll('[data-unstake]').forEach(btn=>{
      btn.addEventListener('click',(ev)=>{ ev.stopPropagation(); unstake(btn.getAttribute('data-unstake')); });
    });
    list.querySelectorAll('.list-item').forEach(li=>{
      li.addEventListener('click', async ()=>{
        const id = Number(li.dataset.frogId);
        const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
        let staker = null, since = null;
        try { staker = await resolveStaker(id); } catch(_){}
        try { since  = await timeStakedDate(id); } catch(_){}
        FF.openFrogModal({
          id,
          rank,
          staker,
          stakedAgo: since ? sinceShort(since) : null,
          image: `${CFG.SOURCE_PATH}/frog/${id}.png`
        });
      });
    });
  }

  // ---------- Pond (controller-owned with staker + time) ----------
  window.FF_renderPondList = async function(containerEl){
    if (!containerEl) return;
    containerEl.innerHTML = '';
    await initContracts();

    let ids = [];
    try { ids = await controllerOwnedTokenIds(); } catch(_){ ids = []; }

    if (!ids.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No frogs are currently staked.';
      containerEl.appendChild(empty);
      return;
    }

    for (const id of ids){
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      let staker = null, since = null;
      try { staker = await resolveStaker(id); } catch(_){}
      try { since  = await timeStakedDate(id); } catch(_){}

      const row = document.createElement('div');
      row.className = 'list-item'; row.dataset.frogId=String(id);
      row.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">
            Staker ${staker ? `<span class="addr">${FF.shorten(staker)}</span>` : '—'}
            ${since ? ` • Staked: ${sinceShort(since)} ago` : ''}
          </div>
        </div>`;
      containerEl.appendChild(row);
    }

    containerEl.querySelectorAll('.list-item').forEach(li=>{
      li.addEventListener('click', async ()=>{
        const id = Number(li.dataset.frogId);
        const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
        let staker = null, since = null;
        try { staker = await resolveStaker(id); } catch(_){}
        try { since  = await timeStakedDate(id); } catch(_){}
        FF.openFrogModal({
          id,
          rank,
          staker,
          stakedAgo: since ? sinceShort(since) : null,
          image: `${CFG.SOURCE_PATH}/frog/${id}.png`
        });
      });
    });
  };

  // ---------- Clear + auto behaviors ----------
  window.FF_clearStaked = ()=>{ ST.items=[]; ST.loaded=false; if(window.FF_getTab && window.FF_getTab()==='staked') render(); };

  // Auto-load shortly after page load if a wallet is already connected
  setTimeout(()=>{ if(window.FF_getUser && window.FF_getUser()) loadStaked().catch(()=>{}); }, 300);

  // Fallback poller: if user connects later and we haven't loaded yet, auto-load once
  let autoTick = setInterval(()=>{
    if (!ST.loaded && window.FF_getUser && window.FF_getUser()){
      clearInterval(autoTick);
      loadStaked().catch(()=>{});
    }
  }, 1500);

})(window.FF, window.FF_CFG);
