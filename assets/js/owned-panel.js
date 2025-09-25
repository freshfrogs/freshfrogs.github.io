// assets/js/owned-panel.js — 5 header layouts (A–E) + robust Connect.
// Cards remain unchanged. Shows: wallet, owned, staked, approval status, rewards.

(function (FF, CFG) {
  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn', more:'#ownedMore' };
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // ---------- Header CSS ----------
  (function injectCSS(){
    if (document.getElementById('owned-headers-5')) return;
    const css = `
#ownedCard .oh-wrap{margin-bottom:10px}
#ownedCard .oh-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#ownedCard .oh-spacer{flex:1}
#ownedCard .oh-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:12px}
#ownedCard .oh-k{opacity:.7}
#ownedCard .oh-v{font-weight:800}
#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedCard .oh-btn:active{transform:translateY(1px)}
#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedCard .oh-mini{font-size:11px;line-height:1}
#ownedCard .oh-muted{color:var(--muted)}
#ownedCard .oh-grid{display:grid;gap:8px}
#ownedCard .oh-grid.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){#ownedCard .oh-grid.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
#ownedCard .oh-tile{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:8px}
#ownedCard .oh-tile .t-k{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
#ownedCard .oh-tile .t-v{font-weight:900;font-size:16px}
#ownedCard .oh-side{display:grid;grid-template-columns:180px 1fr;gap:10px}
@media (max-width:900px){#ownedCard .oh-side{grid-template-columns:1fr}}
#ownedCard .oh-side .box{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:8px;font-size:12px}
#ownedCard .oh-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:6px}
#ownedCard .oh-tab{padding:6px 10px;border:1px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;background:var(--panel)}
#ownedCard .oh-tab[aria-selected="true"]{font-weight:800}
#ownedCard .oh-badge{display:inline-flex;align-items:center;gap:6px;border:1px dashed var(--border);border-radius:999px;padding:4px 8px}
#ownedCard .ok{color:color-mix(in srgb,#22c55e 85%, #ffffff 15%)}
#ownedCard .warn{color:color-mix(in srgb,#f59e0b 85%, #ffffff 15%)}
#ownedCard .err{color:color-mix(in srgb,#ef4444 85%, #ffffff 15%)}
#ownedCard .oh-right{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#ownedCard .oh-select{border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 8px;font-size:12px}
    `;
    const el=document.createElement('style'); el.id='owned-headers-5'; el.textContent=css; document.head.appendChild(el);
  })();

  // ---------- Reservoir queue ----------
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

  // ---------- Utils ----------
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

  // Rewards (18 decimals → nice string)
  function toBigIntSafe(v){
    try{
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') return BigInt(Math.trunc(v));
      if (typeof v === 'string') return BigInt(v.split('.')[0]);
    }catch{}
    return null;
  }
  function formatWei(v, decimals=18){
    const bi = toBigIntSafe(v);
    if (bi == null) return '—';
    const neg = bi < 0n ? '-' : '';
    const abs = neg ? -bi : bi;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    if (whole >= 100n) return neg + whole.toString();
    const two = Number((frac * 100n) / base);
    const out = Number(whole) + two/100;
    return (neg + out.toFixed(2)).replace(/\.00$/,'');
  }

  // Time ago
  function fmtAgo(tsMs){
    if (!tsMs || !isFinite(tsMs)) return null;
    const s = Math.max(0, Math.floor((Date.now() - tsMs)/1000));
    const d = Math.floor(s/86400); if (d>=1) return d+'d ago';
    const h = Math.floor((s%86400)/3600); if (h>=1) return h+'h ago';
    const m = Math.floor((s%3600)/60); if (m>=1) return m+'m ago';
    return s+'s ago';
  }

  // Wallet & staking helpers
  async function getConnectedAddress(){
    try{
      if (window.FF_WALLET?.address) return window.FF_WALLET.address;
      if (FF.wallet?.getAddress){ const a=await FF.wallet.getAddress(); if(a) return a; }
      if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_accounts'}); return arr?.[0]||null; }
    }catch{}
    return null;
  }
  async function requestConnect(){
    try{
      if (FF.wallet?.connect){ const a=await FF.wallet.connect(); if (a) return a; }
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
      if (typeof S.getStakeSince === 'function'){
        const v = await S.getStakeSince(tokenId);
        return Number(v) > 1e12 ? Number(v) : Number(v)*1000;
      }
      if (typeof S.getStakeInfo === 'function'){
        const info = await S.getStakeInfo(tokenId);
        const sec = info?.since ?? info?.stakedAt ?? info?.timestamp;
        if (sec != null) return Number(sec) > 1e12 ? Number(sec) : Number(sec)*1000;
      }
      if (typeof S.stakeSince === 'function'){
        const sec = await S.stakeSince(tokenId);
        return Number(sec) > 1e12 ? Number(sec) : Number(sec)*1000;
      }
    }catch{}
    return null;
  }

  // ---------- State ----------
  let addr=null, continuation=null, items=[], loading=false, io=null, RANKS=null;
  let _stakedCount = null, _rewards = null, _rewardsPretty = null, _approved = null;
  const LKEY='FF_OWNED_HEADER_LAYOUT_5';
  const layouts=['A','B','C','D','E'];
  function getLayout(){ const v=localStorage.getItem(LKEY)||'B'; return layouts.includes(v)?v:'B'; }
  function setLayout(v){ localStorage.setItem(LKEY, layouts.includes(v)?v:'B'); }

  // ---------- Ranks ----------
  async function ensureRanks(){
    if (FF.RANKS){ RANKS=FF.RANKS; return RANKS; }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    const j = FF.fetchJSON ? await FF.fetchJSON(url) : await (await fetch(url)).json();
    RANKS = Array.isArray(j) ? j.reduce((m,r)=> (m[String(r.id)]=r.ranking, m), {}) : (j||{});
    FF.RANKS=RANKS; return RANKS;
  }

  // ---------- Data ----------
  function mapRow(row){
    const t=row?.token||{}; const id=Number(t?.tokenId); if(!isFinite(id)) return null;
    const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value:(a?.value ?? a?.trait_value ?? '') })) : [];
    const staked = !!(window.FF_WALLET?.stakedIds?.has?.(id));
    return { id, attrs, staked, sinceMs:null };
  }
  async function fetchPage(){
    const qs=new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'true' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr)+'?'+qs.toString());
    const rows = (j?.tokens||[]).map(mapRow).filter(Boolean);
    continuation = j?.continuation || null;
    return rows;
  }

  // ---------- Header ----------
  function headerRoot(){
    const card=$(SEL.card); if(!card) return null;
    let wrap = card.querySelector('.oh-wrap');
    if (!wrap){ wrap = document.createElement('div'); wrap.className='oh-wrap'; card.insertBefore(wrap, $(SEL.grid, card)); }
    wrap.innerHTML = ''; return wrap;
  }
  function approvalBadge(approved){
    if (approved === true) return '<span class="oh-badge ok">Approved</span>';
    if (approved === false) return '<span class="oh-badge warn">Not approved</span>';
    return '<span class="oh-badge">Approval: —</span>';
  }
  function actionsHTML(layout){
    return [
      '<div class="oh-right">',
      '<button class="oh-btn" id="ohConnect">Connect</button>',
      '<button class="oh-btn" id="ohApprove">Approve</button>',
      '<button class="oh-btn" id="ohClaim">Claim</button>',
      '<select class="oh-select" id="ohLayout">',
      layouts.map(l=>'<option value="'+l+'" '+(l===layout?'selected':'')+'>'+l+'</option>').join(''),
      '</select></div>'
    ].join('');
  }
  function headerData(){
    const osHref = addr ? ('https://opensea.io/'+addr+'/collections') : '#';
    return {
      wallet: addr,
      walletShort: addr ? shorten(addr) : '—',
      owned: items.length || 0,
      staked: _stakedCount == null ? '—' : _stakedCount,
      rewards: _rewardsPretty ?? (_rewards==null?'—':String(_rewards)),
      approved: _approved,
      osHref
    };
  }
  function buildHeader(layout, d){
    const w = headerRoot(); if(!w) return;
    if (layout==='A'){
      w.innerHTML =
        '<div class="oh-row oh-mini">'+
          '<a id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener" class="oh-chip"><span class="oh-k">Wallet</span><span class="oh-v" id="ohWallet">'+d.walletShort+'</span></a>'+
          '<span class="oh-chip"><span class="oh-k">Owned</span><span class="oh-v" id="ohOwned">'+d.owned+'</span></span>'+
          '<span class="oh-chip"><span class="oh-k">Staked</span><span class="oh-v" id="ohStaked">'+d.staked+'</span></span>'+
          '<span class="oh-chip"><span class="oh-k">Rewards</span><span class="oh-v" id="ohRewards">'+d.rewards+'</span></span>'+
          approvalBadge(d.approved)+
          '<span class="oh-spacer"></span>'+
          actionsHTML(layout)+
        '</div>';
    }
    if (layout==='B'){
      w.innerHTML =
        '<div class="oh-row oh-mini">'+
          '<span class="oh-muted">Wallet</span> <a id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener"><b id="ohWallet">'+d.walletShort+'</b></a>'+
          '<span>•</span><span class="oh-muted">Owned</span> <b id="ohOwned">'+d.owned+'</b>'+
          '<span>•</span><span class="oh-muted">Staked</span> <b id="ohStaked">'+d.staked+'</b>'+
          '<span>•</span><span class="oh-muted">Rewards</span> <b id="ohRewards">'+d.rewards+'</b>'+
          '<span>•</span>'+approvalBadge(d.approved)+
          '<span class="oh-spacer"></span>'+actionsHTML(layout)+
        '</div>';
    }
    if (layout==='C'){
      w.innerHTML =
        '<div class="oh-grid cols-4">'+
          '<div class="oh-tile"><div class="t-k">Wallet</div><div class="t-v" id="ohWallet">'+d.walletShort+'</div></div>'+
          '<div class="oh-tile"><div class="t-k">Owned</div><div class="t-v" id="ohOwned">'+d.owned+'</div></div>'+
          '<div class="oh-tile"><div class="t-k">Staked</div><div class="t-v" id="ohStaked">'+d.staked+'</div></div>'+
          '<div class="oh-tile"><div class="t-k">Rewards</div><div class="t-v" id="ohRewards">'+d.rewards+'</div></div>'+
        '</div>'+
        '<div class="oh-row" style="margin-top:6px">'+
          approvalBadge(d.approved)+
          '<a class="oh-btn" id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener">OpenSea</a>'+
          '<span class="oh-spacer"></span>'+actionsHTML(layout)+
        '</div>';
    }
    if (layout==='D'){
      w.innerHTML =
        '<div class="oh-side">'+
          '<div class="box">'+
            '<div><span class="oh-muted">Wallet</span> <a id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener"><b id="ohWallet">'+d.walletShort+'</b></a></div>'+
            '<div><span class="oh-muted">Owned</span> <b id="ohOwned">'+d.owned+'</b></div>'+
            '<div><span class="oh-muted">Staked</span> <b id="ohStaked">'+d.staked+'</b></div>'+
            '<div><span class="oh-muted">Rewards</span> <b id="ohRewards">'+d.rewards+'</b></div>'+
            '<div style="margin-top:6px">'+approvalBadge(d.approved)+'</div>'+
          '</div>'+
          '<div class="oh-row">'+actionsHTML(layout)+'</div>'+
        '</div>';
    }
    if (layout==='E'){
      w.innerHTML =
        '<div class="oh-tabs"><div class="oh-tab" aria-selected="true">Summary</div><div class="oh-spacer"></div>'+actionsHTML(layout)+'</div>'+
        '<div class="oh-row oh-mini">'+
          '<span>Wallet <a id="ohWalletOS" href="'+d.osHref+'" target="_blank" rel="noopener"><b id="ohWallet">'+d.walletShort+'</b></a></span>'+
          '<span>•</span><span>Owned <b id="ohOwned">'+d.owned+'</b></span>'+
          '<span>•</span><span>Staked <b id="ohStaked">'+d.staked+'</b></span>'+
          '<span>•</span><span>Rewards <b id="ohRewards">'+d.rewards+'</b></span>'+
          '<span>•</span>'+approvalBadge(d.approved)+
        '</div>';
    }

    const sel = w.querySelector('#ohLayout');
    if (sel) sel.addEventListener('change', e=>{ setLayout(e.target.value); renderHeader(); });

    const bC = w.querySelector('#ohConnect'), bA = w.querySelector('#ohApprove'), bCl = w.querySelector('#ohClaim');
    if (bC) bC.onclick = handleConnectClick;
    if (bA) bA.onclick = async ()=>{ bA.disabled=true; try{ await requestApproval(); toast('Approval submitted'); await refreshHeaderStats(); } catch{ toast('Approve failed'); } finally{ bA.disabled=false; } };
    if (bCl) bCl.onclick = async ()=>{ bCl.disabled=true; try{ await claimRewards(); toast('Claim sent'); await refreshHeaderStats(); } catch{ toast('Claim failed'); } finally{ bCl.disabled=false; } };

    if (addr){
      const ow = document.getElementById('ohWallet'); if (ow) ow.textContent = shorten(addr);
      const os = document.getElementById('ohWalletOS'); if (os) os.href = 'https://opensea.io/'+addr+'/collections';
    }
  }
  async function renderHeader(){ buildHeader(getLayout(), headerData()); }

  // ---------- KPIs ----------
  async function refreshHeaderStats(){
    try{ _approved = addr ? await isApproved(addr) : null; }catch{ _approved = null; }
    try{ const ids = addr ? await getStakedIds(addr) : null; _stakedCount = Array.isArray(ids) ? ids.length : '—'; }catch{ _stakedCount = '—'; }
    try{ _rewards = addr ? await getRewards(addr) : null; _rewardsPretty = _rewards == null ? '—' : formatWei(_rewards, 18); }catch{ _rewards=null; _rewardsPretty='—'; }
    await renderHeader();
  }

  // ---------- Cards ----------
  function rankPill(rank){
    // (fixed) no nested template strings
    if (rank || rank === 0) return '<span class="pill">Rank #'+rank+'</span>';
    return '<span class="pill"><span class="muted">Rank N/A</span></span>';
  }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const chips=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; chips.push('<li class="attr">'+a.key+': <b>'+String(a.value)+'</b></li>'); if(chips.length>=max) break; }
    return chips.length? '<ul class="attr-list">'+chips.join('')+'</ul>' : '';
  }
  function metaLine(it){
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return ago ? ('Staked '+ago+' • Owned by You') : 'Staked • Owned by You';
    }
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
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = metaLine(it);
            await refreshHeaderStats();
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; it.sinceMs=null;
            btn.textContent='Stake'; btn.dataset.act='stake';
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = metaLine(it);
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
    for (const it of batch){
      if (!it.staked) continue;
      try{ it.sinceMs = await getStakeSinceMs(it.id); }catch{ it.sinceMs=null; }
    }
  }

  function renderCards(){
    const root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; awaitHeaderOwned(0); return; }
    awaitHeaderOwned(items.length);

    items.forEach(it=>{
      const card=document.createElement('article');
      card.className='frog-card';
      card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+' '+rankPill(it.rank)+'</h4>'+
        '<div class="meta">'+metaLine(it)+'</div>'+
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
  function awaitHeaderOwned(n){
    const el = document.getElementById('ohOwned'); if (el) el.textContent = String(n);
  }

  // ---------- Paging ----------
  async function loadFirstPage(){
    loading=true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r=> r.rank = ranks?.[String(r.id)]);
      await hydrateStakedSince(rows);
      items = rows;
      renderCards();

      const root=$(SEL.grid); if (!root) return;
      if (io) io.disconnect();
      if (!continuation) return;
      const sentinel=document.createElement('div'); sentinel.setAttribute('data-sentinel',''); sentinel.style.height='1px'; root.appendChild(sentinel);
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
      awaitHeaderOwned('—');
    }finally{ loading=false; }
  }

  // ---------- Connect wiring ----------
  async function handleConnectClick(ev){
    const btn = ev?.currentTarget; if (btn) btn.disabled = true;
    try{
      addr = await requestConnect();
      if(!addr) { toast('No address'); return; }
      await afterConnect();
    }catch(e){ toast('Connect failed'); }
    finally{ if (btn) btn.disabled = false; }
  }
  async function afterConnect(){
    await renderHeader();
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Loading…</div>';
    continuation=null; items=[];
    await Promise.all([ loadFirstPage(), refreshHeaderStats() ]);
  }

  // ---------- Init ----------
  async function initOwned(){
    await renderHeader();
    const inlineBtn = document.getElementById('ownedConnectBtn');
    if (inlineBtn){ inlineBtn.style.display='inline-flex'; inlineBtn.onclick = handleConnectClick; }
    addr = await getConnectedAddress();
    if (addr){ await afterConnect(); return; }
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
  }

  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
