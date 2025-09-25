// assets/js/owned-panel.js — Layout B only (key/value bar), removes big info squares.
// Shows: Wallet, Owned, Staked, Rewards, Approval + actions. Cards unchanged.

(function (FF, CFG) {
  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn' };
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  /* ========== Styles: Layout B (clean inline bar) ========== */
  (function injectCSS(){
    if (document.getElementById('owned-b-css')) return;
    const css = `
#ownedCard .oh-wrap{margin-bottom:10px}
#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#ownedCard .oh-spacer{flex:1}
#ownedCard .oh-muted{color:var(--muted)}
#ownedCard .oh-mini{font-size:11px;line-height:1}
#ownedCard .badge{display:inline-flex;align-items:center;gap:6px;border:1px dashed var(--border);border-radius:999px;padding:4px 8px;font-size:12px}
#ownedCard .ok{color:color-mix(in srgb,#22c55e 85%, #ffffff 15%)}
#ownedCard .warn{color:color-mix(in srgb,#f59e0b 85%, #ffffff 15%)}
#ownedCard .oh-btn{
  font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;
  border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;
  display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;
  transition:background .15s,border-color .15s,color .15s,transform .05s
}
#ownedCard .oh-btn:active{transform:translateY(1px)}
#ownedCard .oh-btn:hover{
  background: color-mix(in srgb,#22c55e 14%,var(--panel));
  border-color: color-mix(in srgb,#22c55e 80%,var(--border));
  color: color-mix(in srgb,#ffffff 85%,#22c55e)
}
    `;
    const el=document.createElement('style'); el.id='owned-b-css'; el.textContent=css; document.head.appendChild(el);
  })();

  /* ========== Shared Reservoir queue ========== */
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    const headers=()=> (FF.apiHeaders?.() || { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY });
    async function spaced(url){ const d=Date.now()-lastAt; if(d<RATE_MIN_MS) await sleep(RATE_MIN_MS-d); lastAt=Date.now(); return fetch(url,{headers:headers()}); }
    async function run(url){ let i=0; while(true){ const res=await spaced(url); if(res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; } if(!res.ok){ const t=await res.text().catch(()=> ''); throw new Error('HTTP '+res.status+(t?' — '+t:'')); } return res.json(); } }
    window.FF_RES_QUEUE={ fetch:(url)=> (chain = chain.then(()=> run(url))) };
  }

  /* ========== Utils ========== */
  const $=(s,r=document)=>r.querySelector(s);
  const shorten=(a)=> (FF.shorten?.(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const imgFor=(id)=> (CFG.SOURCE_PATH||'')+'/frog/'+id+'.png';
  const etherscanToken=(id)=>{
    const base =
      CHAIN_ID===1?'https://etherscan.io/token/':
      CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/':
      CHAIN_ID===5?'https://goerli.etherscan.io/token/':
      'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  };
  const openseaToken=(id)=>`https://opensea.io/assets/ethereum/${COLLECTION}/${id}`;
  const toast=(m)=>{ try{FF.toast?.(m);}catch{} console.log('[owned]',m); };

  // Rewards (18 decimals → neat)
  function toBigIntSafe(v){
    try{
      if (typeof v==='bigint') return v;
      if (typeof v==='number') return BigInt(Math.trunc(v));
      if (typeof v==='string') return BigInt(v.split('.')[0]);
    }catch{}
    return null;
  }
  function formatWei(v, decimals=18){
    const bi = toBigIntSafe(v); if (bi==null) return '—';
    const neg = bi<0n?'-':'', abs = bi<0n ? -bi : bi;
    const base = 10n**BigInt(decimals);
    const whole = abs/base, frac = abs%base;
    if (whole>=100n) return neg+whole.toString();
    const two = Number((frac*100n)/base);
    const out = Number(whole)+two/100;
    return (neg+out.toFixed(2)).replace(/\.00$/,'');
  }

  // Time ago
  function fmtAgo(tsMs){
    if (!tsMs || !isFinite(tsMs)) return null;
    const s = Math.max(0, Math.floor((Date.now()-tsMs)/1000));
    const d = Math.floor(s/86400); if (d>=1) return d+'d ago';
    const h = Math.floor((s%86400)/3600); if (h>=1) return h+'h ago';
    const m = Math.floor((s%3600)/60); if (m>=1) return m+'m ago';
    return s+'s ago';
  }

  /* ========== Wallet & staking helpers ========== */
  async function getConnectedAddress(){
    try{
      if (window.FF_WALLET?.address) return window.FF_WALLET.address;
      if (FF.wallet?.getAddress){ const a=await FF.wallet.getAddress(); if(a) return a; }
      if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_accounts'}); return arr?.[0]||null; }
    }catch{} return null;
  }
  async function requestConnect(){
    try{
      if (FF.wallet?.connect){ const a=await FF.wallet.connect(); if(a) return a; }
      if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_requestAccounts'}); return arr?.[0]||null; }
    }catch(e){ toast('Connect failed'); }
    throw new Error('No wallet provider found.');
  }
  const STK = ()=> (FF.staking || window.FF_STAKING || {});
  async function isApproved(addr){
    for (const k of ['isApproved','isApprovedForAll','checkApproval'])
      if (typeof STK()[k]==='function'){ try{ return !!await STK()[k](addr);}catch{} }
    return null;
  }
  async function requestApproval(){
    for (const k of ['approve','approveIfNeeded','requestApproval','setApproval'])
      if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Approval helper not found.');
  }
  async function getRewards(addr){
    for (const k of ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards'])
      if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }
  async function claimRewards(){
    for (const k of ['claimRewards','claim','harvest'])
      if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Claim helper not found.');
  }
  async function getStakedIds(addr){
    if (window.FF_WALLET?.stakedIds?.values) return Array.from(window.FF_WALLET.stakedIds.values());
    for (const k of ['getStakedTokenIds','getUserStakedTokens','stakedTokenIds','stakedIds'])
      if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }
  async function getStakeSinceMs(tokenId){
    const S = STK();
    try{
      if (typeof S.getStakeSince==='function'){ const v=await S.getStakeSince(tokenId); return Number(v)>1e12?Number(v):Number(v)*1000; }
      if (typeof S.getStakeInfo==='function'){ const i=await S.getStakeInfo(tokenId); const sec=i?.since??i?.stakedAt??i?.timestamp; if (sec!=null) return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
      if (typeof S.stakeSince==='function'){ const sec=await S.stakeSince(tokenId); return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
    }catch{}
    return null;
  }

  /* ========== State ========== */
  let addr=null, continuation=null, items=[], loading=false, io=null, RANKS=null;
  let _stakedCount=null, _rewards=null, _rewardsPretty=null, _approved=null;

  /* ========== Header (Layout B only) ========== */
  function removeOldSquares(){
    // remove the big info blocks under #ownedCard (no HTML edits needed)
    const card=$(SEL.card); if(!card) return;
    card.querySelectorAll('.info-grid-2').forEach(n=> n.remove());
  }
  function headerRoot(){
    const card=$(SEL.card); if(!card) return null;
    let wrap = card.querySelector('.oh-wrap');
    if (!wrap){ wrap=document.createElement('div'); wrap.className='oh-wrap'; card.insertBefore(wrap, $(SEL.grid, card)); }
    wrap.innerHTML=''; return wrap;
  }
  function badge(approved){
    if (approved===true)  return '<span class="badge ok">Approved</span>';
    if (approved===false) return '<span class="badge warn">Not approved</span>';
    return '<span class="badge">Approval: —</span>';
  }
  function headerData(){
    const osHref = addr ? ('https://opensea.io/'+addr+'/collections') : '#';
    return {
      walletShort: addr?shorten(addr):'—',
      owned: items.length||0,
      staked: _stakedCount==null?'—':_stakedCount,
      rewards: _rewardsPretty ?? (_rewards==null?'—':String(_rewards)),
      approved: _approved,
      osHref
    };
  }
  function buildHeader(){
    const w = headerRoot(); if(!w) return;
    const d = headerData();
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Wallet</span> <a id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener"><b id="ohWallet">'+d.walletShort+'</b></a>'+
        '<span>•</span><span class="oh-muted">Owned</span> <b id="ohOwned">'+d.owned+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b id="ohStaked">'+d.staked+'</b>'+
        '<span>•</span><span class="oh-muted">Rewards</span> <b id="ohRewards">'+d.rewards+'</b>'+
        '<span>•</span>'+badge(d.approved)+
        '<span class="oh-spacer"></span>'+
        '<button class="oh-btn" id="ohConnect">Connect</button>'+
        '<button class="oh-btn" id="ohApprove">Approve</button>'+
        '<button class="oh-btn" id="ohClaim">Claim</button>'+
        '<a class="oh-btn" id="ohOS" href="'+d.osHref+'" target="_blank" rel="noopener">OpenSea</a>'+
      '</div>';

    const bC = w.querySelector('#ohConnect'), bA = w.querySelector('#ohApprove'), bCl = w.querySelector('#ohClaim');
    if (bC) bC.onclick = handleConnectClick;
    if (bA) bA.onclick = async ()=>{ bA.disabled=true; try{ await requestApproval(); toast('Approval submitted'); await refreshHeaderStats(); }catch{ toast('Approve failed'); }finally{ bA.disabled=false; } };
    if (bCl) bCl.onclick = async ()=>{ bCl.disabled=true; try{ await claimRewards(); toast('Claim sent'); await refreshHeaderStats(); }catch{ toast('Claim failed'); }finally{ bCl.disabled=false; } };
  }
  async function renderHeader(){ buildHeader(); }

  /* ========== KPIs ========== */
  async function refreshHeaderStats(){
    try{ _approved = addr ? await isApproved(addr) : null; }catch{ _approved=null; }
    try{ const ids = addr ? await getStakedIds(addr) : null; _stakedCount = Array.isArray(ids)?ids.length:'—'; }catch{ _stakedCount='—'; }
    try{ _rewards = addr ? await getRewards(addr) : null; _rewardsPretty = _rewards==null?'—':formatWei(_rewards,18); }catch{ _rewards=null; _rewardsPretty='—'; }
    await renderHeader();
  }

  /* ========== Cards (unchanged) ========== */
  function rankPill(rank){ return (rank||rank===0) ? '<span class="pill">Rank #'+rank+'</span>' : '<span class="pill"><span class="muted">Rank N/A</span></span>'; }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const chips=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; chips.push('<li class="attr">'+a.key+': <b>'+String(a.value)+'</b></li>'); if(chips.length>=max) break; }
    return chips.length? '<ul class="attr-list">'+chips.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    if (it.staked){ const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null; return ago ? ('Staked '+ago+' • Owned by You') : 'Staked • Owned by You'; }
    return 'Not staked • Owned by You';
  }
  function wireCardActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            if (FF.staking?.stakeToken) await FF.staking.stakeToken(it.id);
            else if (FF.staking?.stakeTokens) await FF.staking.stakeTokens([it.id]);
            else return toast('Stake: helper not found');
            it.staked=true; it.sinceMs=Date.now();
            btn.textContent='Unstake'; btn.dataset.act='unstake';
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = fmtMeta(it);
            await refreshHeaderStats();
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; it.sinceMs=null;
            btn.textContent='Stake'; btn.dataset.act='stake';
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = fmtMeta(it);
            await refreshHeaderStats();
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch(e){ toast('Action failed'); }
      });
    });
  }

  async function hydrateStakedSince(batch){
    for (const it of batch){ if (!it.staked) continue; try{ it.sinceMs = await getStakeSinceMs(it.id); }catch{ it.sinceMs=null; } }
  }

  function renderCards(){
    const root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; updateHeaderOwned(0); return; }
    updateHeaderOwned(items.length);
    items.forEach(it=>{
      const card=document.createElement('article');
      card.className='frog-card';
      card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+' '+rankPill(it.rank)+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        (attrsHTML(it.attrs,4))+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked ? 'unstake' : 'stake')+'">'+(it.staked ? 'Unstake' : 'Stake')+'</button>'+
          '<button class="btn btn-outline-gray" data-act="transfer">Transfer</button>'+
          '<a class="btn btn-outline-gray" href="'+openseaToken(it.id)+'" target="_blank" rel="noopener">OpenSea</a>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
      wireCardActions(card,it);
    });
  }
  function updateHeaderOwned(n){
    const el = document.getElementById('ohOwned'); if (el) el.textContent = String(n);
  }

  /* ========== Paging ========== */
  async function fetchPage(){
    const qs=new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'true' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr)+'?'+qs.toString());
    const rows = (j?.tokens||[]).map(row=>{
      const t=row?.token||{}; const id=Number(t?.tokenId); if(!isFinite(id)) return null;
      const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value:(a?.value ?? a?.trait_value ?? '') })) : [];
      const staked = !!(window.FF_WALLET?.stakedIds?.has?.(id));
      return { id, attrs, staked, sinceMs:null };
    }).filter(Boolean);
    continuation = j?.continuation || null;
    return rows;
  }

  async function ensureRanks(){
    if (FF.RANKS) return FF.RANKS;
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    const j = FF.fetchJSON ? await FF.fetchJSON(url) : await (await fetch(url)).json();
    const map = Array.isArray(j) ? j.reduce((m,r)=> (m[String(r.id)]=r.ranking, m), {}) : (j||{});
    FF.RANKS = map; return map;
  }

  async function loadFirstPage(){
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r=> r.rank = (ranks||{})[String(r.id)]);
      await hydrateStakedSince(rows);
      items = rows;
      renderCards();

      const root=$(SEL.grid); if (!root) return;
      if (!continuation) return;
      const sentinel=document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
      io=new IntersectionObserver(async es=>{
        if (!es[0].isIntersecting || loading) return;
        loading=true;
        try{
          const r=await fetchPage(); r.forEach(x=> x.rank=(FF.RANKS||{})[String(x.id)]);
          await hydrateStakedSince(r);
          items=items.concat(r); renderCards();
        }catch(e){ toast('Could not load more'); }
        finally{ loading=false; }
      },{root,rootMargin:'140px',threshold:0.01});
      io.observe(sentinel);
    }catch(e){
      console.warn('[owned] first page failed',e);
      const root=$(SEL.grid); if(root) root.innerHTML='<div class="pg-muted">Failed to load owned frogs.</div>';
      updateHeaderOwned('—');
    }
  }

  /* ========== Connect & Init ========== */
  async function handleConnectClick(ev){
    const btn = ev?.currentTarget; if (btn) btn.disabled = true;
    try{
      addr = await requestConnect();
      if(!addr){ toast('No address'); return; }
      await afterConnect();
    }catch(e){ toast('Connect failed'); }
    finally{ if (btn) btn.disabled=false; }
  }
  async function afterConnect(){
    await renderHeader();
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Loading…</div>';
    await Promise.all([ loadFirstPage(), refreshHeaderStats() ]);
  }

  async function initOwned(){
    removeOldSquares();
    await renderHeader();

    const inlineBtn = document.getElementById('ownedConnectBtn');
    if (inlineBtn){ inlineBtn.style.display='inline-flex'; inlineBtn.onclick = handleConnectClick; }

    addr = await getConnectedAddress();
    if (addr){ await afterConnect(); return; }

    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
  }

  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
