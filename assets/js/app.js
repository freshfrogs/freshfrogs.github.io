
/* ======================= CONFIG ======================= */
window.FF_CFG = {
  SOURCE_PATH: "https://freshfrogs.github.io",
  SUPPLY: 4040,
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",
  JSON_PATH: "assets/freshfrogs_rarity_rankings.json",
  FROG_API_KEY: (window.frog_api || "3105c552-60b6-5252-bca7-291c724a54bf")
};
/* ======================= THEME ======================= */
(function(){
  const K="ff_theme",root=document.documentElement;
  function set(t){
    root.setAttribute("data-theme",t);
    document.querySelectorAll(".theme-dock .swatch").forEach(s=>s.setAttribute("aria-current",s.dataset.theme===t?"true":"false"));
    localStorage.setItem(K,t);
  }
  set(localStorage.getItem(K)||root.getAttribute("data-theme")||"noir");
  document.querySelectorAll(".theme-dock .swatch").forEach(s=>s.addEventListener("click",()=>set(s.dataset.theme)));
})();
/* ======================= UTILS ======================= */
window.FF = window.FF || {};
(function(FF,CFG){
  FF.shorten = a => a?(a.slice(0,6)+'…'+a.slice(-4)):'';
  FF.thumb64 = (src,alt)=>`<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1e3); if(s<60) return s+'s';
    const m=Math.floor(s/60); if(m<60) return m+'m';
    const h=Math.floor(m/60); if(h<24) return h+'h';
    const d=Math.floor(h/24); return d+'d';
  };
  FF.fetchJSON = async (p)=>{ const r=await fetch(p,{cache:"no-store"}); if(!r.ok) throw new Error(r.status); return r.json(); };
})(window.FF, window.FF_CFG);
/* ======================= GRID ======================= */
(function(C){
  const g=document.getElementById('grid'), L=document.getElementById('lightbox'), S=document.getElementById('lightboxStage');
  function ids(n){ const s=new Set(); while(s.size<n) s.add(1+Math.floor(Math.random()*C.SUPPLY)); return [...s]; }
  function render(){
    g.innerHTML='';
    ids(9).forEach(id=>{
      const t=document.createElement('div'); t.className='tile';
      t.innerHTML = `<img src="${C.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" decoding="async">`;
      t.addEventListener('click',()=>{
        S.innerHTML=''; const b=document.createElement('img');
        b.src=`${C.SOURCE_PATH}/frog/${id}.png`; b.alt=`Frog #${id}`;
        Object.assign(b.style,{width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated'});
        S.appendChild(b); L.style.display='grid';
      });
      g.appendChild(t);
    });
  }
  L.addEventListener('click',()=>L.style.display='none');
  window.FF_renderGrid = render;
})(window.FF_CFG);
/* ======================= SALES ======================= */
(function(FF,C){
  const opt={method:'GET',headers:{accept:'*/*','x-api-key':C.FROG_API_KEY}};
  let data=[];
  function addr(s){const c=s?.toAddress||s?.to?.address||s?.to;if(!c)return'—';const h=String(c);return /^0x[a-fA-F0-9]{40}$/.test(h)?(h.slice(0,6)+'…'+h.slice(-4)):(h.length>16?h.slice(0,6)+'…'+h.slice(-2):h)}
  function ts(s){let r=s?.timestamp??s?.createdAt;if(r==null)return null;if(typeof r==='number'){const ms=r<1e12?r*1000:r;return new Date(ms)}const t=Date.parse(r);return Number.isNaN(t)?null:new Date(t)}
  function map(res){return(res||[]).map(s=>{const tid=s?.token?.tokenId??s?.tokenId;const id=tid!=null?parseInt(String(tid),10):null;const b=addr(s);const d=ts(s);const p=s?.price?.amount?.decimal??s?.price?.gross?.decimal??null;if(!id)return null;return{id,time:d?FF.formatAgo(Date.now()-d.getTime()):'—',price:p!=null?p.toFixed(3)+' ETH':'—',buyer:b}}).filter(Boolean)}
  async function fetchSales({limit=50,continuation=""}={}){const base="https://api.reservoir.tools/sales/v6";const q=new URLSearchParams({collection:C.COLLECTION_ADDRESS,limit:String(limit),sortBy:"time",sortDirection:"desc"});if(continuation)q.set("continuation",continuation);const r=await fetch(base+'?'+q.toString(),opt);if(!r.ok)throw new Error(r.status);return r.json()}
  function renderAll(list=data){
    const ul=document.getElementById('recentSales'); if(!ul) return; ul.innerHTML='';
    const arr=(list&&list.length)?list:[{id:3250,time:"3m",price:"0.080 ETH",buyer:"0x9a…D1"}];
    // render ALL; panel scrolls
    arr.forEach(x=>{
      const rank=(window.FF_getRankById?window.FF_getRankById(x.id):null);
      const badge=(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(`${C.SOURCE_PATH}/frog/${x.id}.png`,`Frog ${x.id}`)+
        `<div>
          <div style="display:flex;align-items:center;gap:8px;"><b>Frog #${x.id}</b> ${badge}</div>
          <div class="muted">${x.time!=="—"?x.time+" ago":"—"} • Buyer ${x.buyer}</div>
        </div>
        <div class="price">${x.price}</div>`;
      ul.appendChild(li);
    });
  }
  async function live(){try{if(!C.FROG_API_KEY||C.FROG_API_KEY==="YOUR_RESERVOIR_API_KEY_HERE")throw new Error("Missing Reservoir API key");const f=await fetchSales({limit:50});const m=map(f.sales||[]);if(m.length){data=m;renderAll();return true}return false}catch(e){console.warn('Sales fetch failed',e);return false}}
  document.getElementById('refreshBtn')?.addEventListener('click',()=>renderAll());
  document.getElementById('fetchLiveBtn')?.addEventListener('click',live);
  window.FF_renderSales=()=>renderAll();
  window.FF_loadSalesLive=live;
})(window.FF,window.FF_CFG);
/* ======================= RARITY ======================= */
(function(FF,C){
  let LIST=null,LOOK=null; let sortBy='rank';
  function setL(a){LIST=a;LOOK=Object.fromEntries(a.map(x=>[String(x.id),Number(x.ranking??x.rank??NaN)]).filter(([,v])=>!Number.isNaN(v)))}
  async function loadFetch(){try{const a=await FF.fetchJSON(C.JSON_PATH);if(!Array.isArray(a))throw 0;setL(a);return true}catch{return false}}
  function sorted(){if(!LIST?.length)return[];const a=[...LIST];if(sortBy==='score')a.sort((x,y)=>Number(y.rarity??y.score??0)-Number(x.rarity??x.score??0));else a.sort((x,y)=>Number(x.ranking??x.rank??1e9)-Number(y.ranking??y.rank??1e9));return a}
  function renderAll(){
    const ul=document.getElementById('rarityList'); if(!ul) return; ul.innerHTML='';
    const data=sorted(); if(!data.length){ ul.innerHTML='<li class="list-item"><div class="muted">No data yet</div></li>'; return; }
    // render ALL; panel scrolls
    data.forEach(it=>{
      const id=it.id, rank=it.ranking??it.rank??'?', score=(it.rarity??it.score??'').toString();
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(`${C.SOURCE_PATH}/frog/${id}.png`,`Frog ${id}`)+
        `<div>
          <div><b>Frog #${id}</b></div>
          <div class="muted">${score?`Rarity Score: ${score}`:`Rarity Score: N/A`}</div>
        </div>
        <span class="pill">#${rank}</span>`;
      ul.appendChild(li);
    });
  }
  document.getElementById('sortRankBtn')?.addEventListener('click',()=>{sortBy='rank';renderAll()});
  document.getElementById('sortScoreBtn')?.addEventListener('click',()=>{sortBy='score';renderAll()});
  function showPick(){document.getElementById('localLoad').style.display='block'}
  function wire(){
    const f=document.getElementById('rarityFile'), b=document.getElementById('useLocalBtn');
    b?.addEventListener('click', ()=>{
      const file=f?.files?.[0]; if(!file){ alert("Choose assets/freshfrogs_rarity_rankings.json"); return; }
      const rd=new FileReader();
      rd.onload=()=>{ try{
        const arr=JSON.parse(rd.result); if(!Array.isArray(arr)) throw 0;
        setL(arr); renderAll();
        window.FF_getRankById = (id)=> LOOK ? (LOOK[String(id)] ?? null) : null;
        document.getElementById('localLoad').style.display='none';
      }catch{ alert("Invalid rarity JSON"); } };
      rd.readAsText(file);
    });
  }
  window.FF_loadRarity = async ()=>{
    let ok=false; if(location.protocol!=='file:'){ ok = await loadFetch(); }
    if(!ok){ showPick(); wire(); }
    window.FF_getRankById = (id)=> LOOK ? (LOOK[String(id)] ?? null) : null;
    renderAll();
  };
})(window.FF,window.FF_CFG);
/* ======================= WALLET ======================= */
(function(FF){
  let user=null;
  function ui(a){
    const l=document.getElementById('walletLabel'), b=document.getElementById('connectBtn');
    if(a){ l.textContent='Connected: '+FF.shorten(a); l.style.display=''; b.textContent='Disconnect'; }
    else { l.style.display='none'; b.textContent='Connect Wallet'; }
  }
  async function connect(){
    if(location.protocol==='file:'){ alert('Open the site over http(s) to enable wallet.'); return; }
    const p=window.ethereum; if(!p){ alert("No Ethereum provider found. Install/enable MetaMask."); return; }
    try{
      const acc=await p.request({method:'eth_requestAccounts'}); user=acc?.[0]||null; ui(user);
      if(user){
        window.FF_clearOwned?.(); window.FF_fetchOwned?.(user);
        // Auto-load staked on connect
        window.FF_loadStaked?.();
        document.getElementById('stakeStatus').textContent='Connected. Loading Owned/Staked…';
      }
    }catch(e){ console.warn(e); }
  }
  function disconnect(){
    user=null; ui(null);
    window.FF_clearOwned?.(); window.FF_clearStaked?.();
    document.getElementById('stakeStatus').textContent='Disconnected.';
  }
  document.getElementById('connectBtn')?.addEventListener('click', ()=>{ user?disconnect():connect(); });
  if(window.ethereum){
    window.ethereum.on?.('accountsChanged', a=>{
      user = a?.[0]||null; ui(user);
      if(user){ window.FF_clearOwned?.(); window.FF_fetchOwned?.(user); window.FF_loadStaked?.(); }
      else { window.FF_clearOwned?.(); window.FF_clearStaked?.(); }
    });
  }
  window.FF_getUser = ()=> user;
  window.FF_setWalletUI = ui;
})(window.FF);
/* ======================= OWNED ======================= */
(function(FF, CFG){
  let heldTokens = [];
  let heldContinuation = '';

  function renderOwned(){
    const list=document.getElementById('chipWrap'); if(!list) return;
    if(window.FF_getTab && window.FF_getTab()!=='owned') return; // render only on 'owned'
    list.innerHTML='';
    const user = window.FF_getUser();
    if(!user){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to view owned tokens.</div></li>'; return; }
    if(!heldTokens.length){ list.innerHTML='<li class="list-item"><div class="muted">No tokens loaded yet. Click “Refresh Owned”.</div></li>'; return; }

    // render ALL; container scrolls
    heldTokens.forEach(({id,image})=>{
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(image || (`${CFG.SOURCE_PATH}/frog/${id}.png`), `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Owned by <span class="addr">${FF.shorten(user)}</span></div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-outline btn-sm" disabled title="Stake flow wired later">🔒 Stake</button>
        </div>`;
      list.appendChild(li);
    });
  }

  async function fetchOwned(wallet, limit=50, nextStr){
    try{
      wallet = wallet || window.FF_getUser();
      if(!wallet){ document.getElementById('stakeStatus').textContent='Connect a wallet to load owned tokens.'; return; }
      const cont = nextStr || heldContinuation || '';
      const qs = cont ? '&continuation='+encodeURIComponent(cont) : '';
      const url = `https://api.reservoir.tools/users/${wallet}/tokens/v8?collection=${CFG.COLLECTION_ADDRESS}&limit=${limit}${qs}`;
      const res = await fetch(url, { method:'GET', headers:{ accept:'*/*','x-api-key': CFG.FROG_API_KEY } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const items = (data.tokens||[]).map(t=>{
        const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        const id = tokenId!=null?parseInt(String(tokenId),10):null;
        const img = t?.token?.image ?? (`${CFG.SOURCE_PATH}/frog/${tokenId}.png`);
        return id ? { id, image: img } : null;
      }).filter(Boolean);

      heldTokens = heldTokens.concat(items);
      heldContinuation = data.continuation || '';

      if(window.FF_getTab && window.FF_getTab()==='owned') renderOwned();
      const ss=document.getElementById('stakeStatus');
      ss.textContent = `Owned: ${heldTokens.length}` + (heldContinuation ? ' • more available' : '');

      // Optional "Load more" button
      const anchor = document.getElementById('stakeControls');
      let btn = document.getElementById('heldMoreBtn');
      if(!heldContinuation){ if(btn) btn.remove(); }
      else {
        if(!btn){
          btn=document.createElement('button');
          btn.id='heldMoreBtn'; btn.className='btn btn-outline btn-sm'; btn.textContent='Load more Owned';
          anchor?.appendChild(btn);
        }
        btn.onclick = ()=> fetchOwned(wallet, limit, heldContinuation);
      }
    }catch(e){
      console.warn(e);
      document.getElementById('stakeStatus').textContent='Failed to fetch owned tokens.';
    }
  }

  document.getElementById('refreshOwned')?.addEventListener('click', ()=>{
    const u = window.FF_getUser();
    if(!u){ document.getElementById('stakeStatus').textContent='Connect a wallet first.'; return; }
    heldTokens=[]; heldContinuation=''; fetchOwned(u);
  });
  document.getElementById('selectAll')?.addEventListener('click',()=>{ document.getElementById('stakeStatus').textContent='Selected all visible tokens (demo).'; });
  document.getElementById('clearSel')?.addEventListener('click',()=>{ document.getElementById('stakeStatus').textContent='Cleared selection (demo).'; });

  window.FF_fetchOwned = fetchOwned;
  window.FF_clearOwned = ()=>{ heldTokens=[]; heldContinuation=''; if(window.FF_getTab && window.FF_getTab()==='owned') renderOwned(); };
  window.FF_renderOwned = renderOwned;
})(window.FF, window.FF_CFG);
/* ======================= STAKING ======================= */
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

  function stakingReady(){ return controller && signer && window.FF_getUser(); }
  async function initEthers(){
    if(!window.ethereum) return false;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    // minimal ABI for this page
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

      const rewards = await controller.availableRewards(user);
      const rewardsLine = document.getElementById('rewardsLine');
      if(rewardsLine){
        rewardsLine.style.display='block';
        document.getElementById('rewardsEth').textContent =
          ethers.BigNumber.isBigNumber(rewards) ? rewards.toString() : String(rewards);
      }

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

  function render(){
    const list=document.getElementById('chipWrap'); if(!list) return;
    list.innerHTML='';

    if(currentTab==='owned'){ window.FF_renderOwned?.(); return; }

    const items=ST.items||[];
    if(!window.FF_getUser()){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to load staked tokens.</div></li>'; return; }
    if(!items.length){ list.innerHTML='<li class="list-item"><div class="muted">No staked tokens yet.</div></li>'; return; }

    items.forEach(({id,owner})=>{
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
  }

  // expose so wallet.js can auto-load on connect
  window.FF_loadStaked = loadStaked;
  window.FF_clearStaked = ()=>{ ST.items=[]; if(window.FF_getTab && window.FF_getTab()==='staked'){ render(); } };
  window.FF_setTab = setTab;
})(window.FF, window.FF_CFG);
/* ======================= MAIN ======================= */
(async function(){
  await window.FF_loadRarity();
  const ok = await window.FF_loadSalesLive();
  const b=document.getElementById('fetchLiveBtn');
  if(ok && b){ b.textContent="Live loaded"; b.disabled=true; b.classList.add('btn-ghost'); }
  window.FF_renderSales();
  window.FF_renderGrid();

  // Default to OWNED tab but load both datasets if wallet is already connected
  window.FF_setTab('owned');

  // If MetaMask already injected with a selected address, auto-init UI and load both lists
  const pre = window.ethereum?.selectedAddress;
  if(pre){
    window.FF_setWalletUI(pre);
    window.FF_fetchOwned?.(pre);
    window.FF_loadStaked?.();
  }
})();
function FF_round18(weiLike){
  const S = 10n**18n;
  const n = BigInt(weiLike.toString());
  return ((n + S/2n) / S).toString();
}
window.FF_round18 = FF_round18;

function FF_setRewardsAvailable(weiLike){
  const v = FF_round18(weiLike);
  (document.getElementById('rewardsAvailable') || document.querySelector('[data-rewards-available]'))?.textContent = v;
  return v;
}
window.FF_setRewardsAvailable = FF_setRewardsAvailable;
