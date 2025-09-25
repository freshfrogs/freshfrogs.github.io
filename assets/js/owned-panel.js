// assets/js/owned-panel.js
(function (FF, CFG) {
  'use strict';

  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn' };
  var CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
  var RESV_HOST = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  var COLLECTION = CFG.COLLECTION_ADDRESS;
  var REWARD_SYMBOL   = (CFG.REWARD_TOKEN_SYMBOL || '$FLYZ');
  var REWARD_DECIMALS = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
  var BASEPATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');

  function imgFor(id){ return BASEPATH + '/frog/' + id + '.png'; }
  function jsonFor(id){ return BASEPATH + '/frog/json/' + id + '.json'; }
  function tokensApiUser(addr){ return RESV_HOST + '/users/' + addr + '/tokens/v8'; }
  function etherscanToken(id){
    var base =
      CHAIN_ID===1?'https://etherscan.io/token/':
      CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/':
      CHAIN_ID===5?'https://goerli.etherscan.io/token/':
      'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  }

  // CSS
  (function injectCSS(){
    if (document.getElementById('owned-clean-css')) return;
    var el=document.createElement('style'); el.id='owned-clean-css';
    el.textContent = [
      '#ownedCard .oh-wrap{margin-bottom:10px}',
      '#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '#ownedCard .oh-mini{font-size:11px;line-height:1}',
      '#ownedCard .oh-spacer{flex:1}',
      '#ownedCard .oh-muted{color:var(--muted)}',
      '#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}',
      '#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}',
      '#ownedCard{display:flex;flex-direction:column}',
      '#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}',
      '@media (hover:hover){#ownedGrid::-webkit-scrollbar{width:8px}#ownedGrid::-webkit-scrollbar-thumb{background: color-mix(in srgb,var(--muted) 35%, transparent); border-radius:8px}}',
      '#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}',
      '#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}'
    ].join('');
    document.head.appendChild(el);
  })();

  // Reservoir queue (IDs only)
  if (!window.FF_RES_QUEUE){
    var RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    var BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    var lastAt=0, chain=Promise.resolve();
    function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
    function headers(){ return (FF.apiHeaders && FF.apiHeaders()) || { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY }; }
    function spaced(url,init){ var d=Date.now()-lastAt; var wait = d<RATE_MIN_MS ? (RATE_MIN_MS-d) : 0; return sleep(wait).then(function(){ lastAt=Date.now(); return fetch(url,{headers:headers(), ...(init||{})}); }); }
    function run(url,init){
      var i=0;
      function loop(){
        return spaced(url,init).then(function(res){
          if (res.status===429){ var ms=BACKOFFS[Math.min(i++,BACKOFFS.length-1)]; return sleep(ms).then(loop); }
          if (!res.ok){ return res.text().catch(function(){return'';}).then(function(t){ throw new Error('HTTP '+res.status+(t?' — '+t:'')); }); }
          return res.json();
        });
      }
      return loop();
    }
    window.FF_RES_QUEUE={ fetch:function(url,init){ return (chain = chain.then(function(){ return run(url,init); })); } };
  }

  // Utils
  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'); }
  function toast(m){ try{ if (FF.toast) FF.toast(m); }catch(e){} console.log('[owned]',m); }

  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    var s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    var d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    var h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    var m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }

  function formatToken(raw,dec){
    var DEC = Number.isFinite(Number(dec)) ? Number(dec) : REWARD_DECIMALS;
    function toBigInt(v){
      try{
        if(typeof v==='bigint') return v;
        if(typeof v==='number') return BigInt(Math.trunc(v));
        if(typeof v==='string'){ if(/^0x/i.test(v)) return BigInt(v); if(/^-?\d+/.test(v)) return BigInt(v.split('.')[0]); }
        if(v && typeof v.toString==='function' && v.toString!==Object.prototype.toString){ var s=v.toString(); if(/^\d+$/.test(s)) return BigInt(s); }
        if(v && typeof v._hex==='string') return BigInt(v._hex);
      }catch(e){}
      return null;
    }
    if (raw && typeof raw==='object'){
      if ('formatted' in raw) return String(raw.formatted);
      if ('value' in raw && 'decimals' in raw) return formatToken(raw.value, Number(raw.decimals));
      if ('amount' in raw && 'decimals' in raw) return formatToken(raw.amount, Number(raw.decimals));
    }
    if (typeof raw==='string' && raw.indexOf('.')>-1) return raw;
    var bi = toBigInt(raw); if (bi==null) return '—';
    var base = (function(n){ var out=1n; for(var i=0;i<n;i++) out*=10n; return out; })(BigInt(DEC));
    var whole = bi / base, frac = bi % base;
    if (whole>=100n) return whole.toString();
    var cents = Number((frac*100n)/base);
    var out = Number(whole)+cents/100;
    return (out%1===0 ? out.toFixed(0) : out.toFixed(2));
  }

  // Wallet & staking helpers
  async function getConnectedAddress(){
    try{
      if (window.FF_WALLET && window.FF_WALLET.address) return window.FF_WALLET.address;
      if (FF.wallet && FF.wallet.getAddress){ var a=await FF.wallet.getAddress(); if(a) return a; }
      if (window.ethereum && window.ethereum.request){ var arr=await window.ethereum.request({method:'eth_accounts'}); return (arr && arr[0])||null; }
    }catch(e){}
    return null;
  }
  async function requestConnect(){
    try{
      if (FF.wallet && FF.wallet.connect){ var a=await FF.wallet.connect(); if(a) return a; }
      if (window.ethereum && window.ethereum.request){ var arr=await window.ethereum.request({method:'eth_requestAccounts'}); return (arr && arr[0])||null; }
    }catch(e){ toast('Connect failed'); }
    throw new Error('No wallet provider found.');
  }
  function STK(){ return (FF.staking || window.FF_STAKING || {}); }

  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    function toNum(x){
      try{
        if(x==null) return NaN;
        if(typeof x==='number') return x;
        if(typeof x==='bigint') return Number(x);
        if(typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
        if(typeof x==='object'){
          if(typeof x.toString==='function' && x.toString!==Object.prototype.toString){ var s=x.toString(); if(/^\d+$/.test(s)) return Number(s); }
          if('_hex' in x) return Number(x._hex);
          if('hex'  in x) return Number(x.hex);
        }
      }catch(e){}
      return NaN;
    }
    return rows.map(function(r){
      if (Array.isArray(r)) return toNum(r[0]);
      if (typeof r==='string' || typeof r==='number' || typeof r==='bigint') return toNum(r);
      if (typeof r==='object'){ var cand=r.tokenId || r.id || r.token_id || r.tokenID || r[0]; return toNum(cand); }
      return NaN;
    }).filter(function(n){ return Number.isFinite(n); });
  }

  async function getStakedIds(addr){
    try{
      if (typeof window.getStakedTokens === 'function'){ var raw1=await window.getStakedTokens(addr); return normalizeIds(raw1); }
      var S = STK();
      if (typeof S.getStakedTokens === 'function'){ var raw2=await S.getStakedTokens(addr); return normalizeIds(raw2); }
      if (typeof S.getUserStakedTokens === 'function'){ var ids=await S.getUserStakedTokens(addr); return normalizeIds(ids); }
      if (window.controller && window.controller.methods && window.controller.methods.getStakedTokens){ var raw3=await window.controller.methods.getStakedTokens(addr).call(); return normalizeIds(raw3); }
    }catch(e){ console.warn('[owned] getStakedIds failed', e); }
    return [];
  }

  async function isApproved(addr){
    var s = STK();
    var keys=['isApproved','isApprovedForAll','checkApproval'];
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      if (typeof s[k]==='function'){
        try{ var v=await s[k](addr); return !!v; }catch(e){}
      }
    }
    return null;
  }

  async function requestApproval(){
    var s = STK();
    var keys=['approve','approveIfNeeded','requestApproval','setApproval'];
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      if (typeof s[k]==='function'){ return s[k](); }
    }
    throw new Error('Approval helper not found.');
  }

  async function getRewards(addr){
    var s = STK();
    var keys=['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards'];
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      if (typeof s[k]==='function'){
        try{ return await s[k](addr); }catch(e){}
      }
    }
    try{
      if (window.controller && window.controller.methods && window.controller.methods.getAvailableRewards){
        return await window.controller.methods.getAvailableRewards(addr).call();
      }
    }catch(e){}
    return null;
  }

  async function claimRewards(){
    var s = STK();
    var keys=['claimRewards','claim','harvest'];
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      if (typeof s[k]==='function') return s[k]();
    }
    throw new Error('Claim helper not found.');
  }

  async function getStakeSinceMs(tokenId){
    var s=STK();
    try{
      if (typeof s.getStakeSince==='function'){ var v=await s.getStakeSince(tokenId); return Number(v)>1e12?Number(v):Number(v)*1000; }
      if (typeof s.getStakeInfo==='function'){ var i=await s.getStakeInfo(tokenId); var t=(i && (i.since||i.stakedAt||i.timestamp)); if (t!=null) return Number(t)>1e12?Number(t):Number(t)*1000; }
      if (typeof s.stakeSince==='function'){ var s2=await s.stakeSince(tokenId); return Number(s2)>1e12?Number(s2):Number(s2)*1000; }
      if (window.controller && window.controller.methods && window.controller.methods.stakeSince){ var s3=await window.controller.methods.stakeSince(tokenId).call(); return Number(s3)*1000; }
    }catch(e){}
    return null;
  }

  // State
  var addr=null, items=[], stakedIdsGlobal=[];
  var continuation=null;
  var _stakedCount=null, _rewardsPretty='—', _approved=null;

  // Metadata cache
  var META = new Map();
  async function fetchMeta(id){
    if (META.has(id)) return META.get(id);
    try{
      var r = await fetch(jsonFor(id));
      var j = r.ok ? await r.json() : null;
      var attrs = (j && Array.isArray(j.attributes)) ? j.attributes.map(function(a){
        return { key:(a && (a.key||a.trait_type))||'', value:(a && (a.value!=null ? a.value : a.trait_value)) };
      }) : [];
      var out = { id:id, attrs:attrs };
      META.set(id,out); return out;
    }catch(e){
      var out2={ id:id, attrs:[] }; META.set(id,out2); return out2;
    }
  }

  // Header
  function headerRoot(){
    var card=$(SEL.card); if(!card) return null;
    var w=card.querySelector('.oh-wrap'); if(!w){ w=document.createElement('div'); w.className='oh-wrap'; card.insertBefore(w,$(SEL.grid,card)); }
    w.innerHTML=''; return w;
  }
  function renderHeader(){
    var w=headerRoot(); if(!w) return;
    var owned = items.length||0;
    var staked = (_stakedCount==null?'—':_stakedCount);
    var rewards = _rewardsPretty;
    var needsApprove = _approved !== true;

    w.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Owned</span> <b id="ohOwned">'+owned+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b id="ohStaked">'+staked+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b id="ohRewards">'+rewards+' '+REWARD_SYMBOL+'</b>'+
        '<span class="oh-spacer"></span>'+
        (needsApprove ? '<button class="oh-btn" id="ohApprove">Approve Staking</button>' : '')+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';

    var bA=w.querySelector('#ohApprove');
    var bC=w.querySelector('#ohClaim');
    if (bA) bA.onclick = async function(){ bA.disabled=true; try{ await requestApproval(); await refreshHeaderStats(); }catch(e){ toast('Approve failed'); }finally{ bA.disabled=false; } };
    if (bC) bC.onclick = async function(){ bC.disabled=true; try{ await claimRewards(); await refreshHeaderStats(); }catch(e){ toast('Claim failed'); }finally{ bC.disabled=false; } };
  }

  // Sizing
  function syncHeights(){
    if (window.matchMedia('(max-width: 960px)').matches){
      var oc=document.getElementById('ownedCard'); if(oc) oc.style.height='';
      var og=document.getElementById('ownedGrid'); if(og) og.style.maxHeight=''; return;
    }
    var left=document.querySelectorAll('.page-grid > .pg-card')[0];
    var right=document.getElementById('ownedCard');
    if(!left||!right) return;
    right.style.height=left.offsetHeight+'px';
    var header=right.querySelector('.oh-wrap'); var headerH=header?header.offsetHeight+10:0;
    var pad=20; var maxH=left.offsetHeight-headerH-pad;
    var grid=document.getElementById('ownedGrid'); if(grid) grid.style.maxHeight=Math.max(160,maxH)+'px';
  }
  window.addEventListener('resize',function(){ setTimeout(syncHeights,50); });

  // KPIs
  async function refreshHeaderStats(){
    try{ _approved = addr ? await isApproved(addr) : null; }catch(e){ _approved=null; }
    try{ stakedIdsGlobal = addr ? await getStakedIds(addr) : []; _stakedCount = stakedIdsGlobal.length; }catch(e){ stakedIdsGlobal=[]; _stakedCount='—'; }
    try{ var raw = addr ? await getRewards(addr) : null; _rewardsPretty = formatToken(raw, REWARD_DECIMALS); }catch(e){ _rewardsPretty='—'; }
    renderHeader(); syncHeights();
  }

  // Cards
  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var cap = Number.isFinite(Number(max)) ? Number(max) : 4;
    var rows=[], i;
    for (i=0;i<attrs.length;i++){
      var a=attrs[i]; if(!a || !a.key || a.value==null) continue;
      rows.push('<li><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
      if(rows.length>=cap) break;
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    if (it.staked){
      var a = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return (a?('Staked '+a):'Staked')+' • Owned by You';
    }
    return 'Not staked • Owned by You';
  }

  function renderCards(){
    var root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){
      var div=document.createElement('div'); div.className='pg-muted'; div.textContent='No frogs found for this wallet.'; root.appendChild(div);
      renderHeader(); syncHeights(); return;
    }
    items.forEach(function(it){
      var card=document.createElement('article'); card.className='frog-card'; card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked ? 'unstake' : 'stake')+'">'+(it.staked ? 'Unstake' : 'Stake')+'</button>'+
          '<button class="btn btn-outline-gray" data-act="transfer">Transfer</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
    });
    renderHeader(); syncHeights();
  }

  // Owned IDs page (IDs only)
  async function fetchOwnedIdsPage(address){
    try{
      var qs = new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'false' });
      if (continuation) qs.set('continuation', continuation);
      var j = await window.FF_RES_QUEUE.fetch(tokensApiUser(address)+'?'+qs.toString());
      var ids = (j && Array.isArray(j.tokens) ? j.tokens : []).map(function(r){
        return Number(r && r.token && r.token.tokenId);
      }).filter(function(n){ return Number.isFinite(n); });
      continuation = (j && j.continuation) || null;
      return ids;
    }catch(e){
      console.warn('[owned] Reservoir unavailable, falling back to staked only', e);
      continuation = null;
      return [];
    }
  }

  // Ranks
  async function ensureRanks(){
    if (FF.RANKS) return FF.RANKS;
    try{
      var url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
      var r = await fetch(url); if (!r.ok) throw new Error('no ranks');
      var j = await r.json();
      FF.RANKS = Array.isArray(j) ? j.reduce(function(m,rk){ m[String(rk.id)] = rk.ranking; return m; }, {}) : (j||{});
      return FF.RANKS;
    }catch(e){ FF.RANKS = {}; return FF.RANKS; }
  }

  // Flow
  async function loadFirstPage(address){
    var ranks = await ensureRanks();
    var ownedIds = await fetchOwnedIdsPage(address);
    if (!Array.isArray(stakedIdsGlobal)) stakedIdsGlobal = await getStakedIds(address);

    var idSet = new Set(ownedIds);
    stakedIdsGlobal.forEach(function(id){ idSet.add(id); });
    var allIds = Array.from(idSet);

    // metadata
    items = [];
    for (var i=0;i<allIds.length;i++){
      var id = allIds[i];
      var m = await fetchMeta(id);
      items.push({ id:id, attrs:m.attrs, staked: stakedIdsGlobal.indexOf(id)>-1, sinceMs:null, rank:ranks[String(id)] });
    }

    // hydrate stake times
    for (var j=0;j<items.length;j++){
      var it = items[j];
      if (it.staked){
        try{
          var ms = await getStakeSinceMs(it.id);
          it.sinceMs = (ms && ms<1e12) ? ms*1000 : ms;
        }catch(e){ it.sinceMs = null; }
      }
    }

    renderCards();

    // infinite scroll (more OWNED pages)
    var root=$(SEL.grid); if (!root) return;
    if (!continuation) return;
    var sentinel=document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
    var io = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      io.disconnect();
      (async function(){
        try{
          var moreIds = await fetchOwnedIdsPage(address);
          var add = moreIds.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
          for (var k=0;k<add.length;k++){
            var id2 = add[k]; var m2 = await fetchMeta(id2);
            items.push({ id:id2, attrs:m2.attrs, staked: stakedIdsGlobal.indexOf(id2)>-1, sinceMs: await getStakeSinceMs(id2), rank:ranks[String(id2)] });
          }
          renderCards();
        }catch(err){ console.warn('[owned] paging failed', err); }
      })();
    },{root:root,rootMargin:'140px',threshold:0.01});
    io.observe(sentinel);
  }

  async function afterConnect(address){
    var grid=$(SEL.grid); if (grid){ grid.innerHTML='<div class="pg-muted">Loading…</div>'; }
    await Promise.all([ refreshHeaderStats(), loadFirstPage(address) ]);
  }

  async function init(){
    // remove legacy info squares
    var olds = document.querySelectorAll('#ownedCard .info-grid-2');
    for (var i=0;i<olds.length;i++){ olds[i].remove(); }

    var btn = document.getElementById('ownedConnectBtn');
    if (btn){
      btn.style.display='inline-flex';
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await requestConnect();
          if (!a) return;
          btn.classList.add('btn-connected');
          btn.textContent = shorten(a);
          addr = a;
          await afterConnect(a);
        } finally { btn.disabled=false; }
      });
    }

    addr = await getConnectedAddress();
    if (btn && addr){ btn.classList.add('btn-connected'); btn.textContent = shorten(addr); }
    if (addr){ await afterConnect(addr); }
    else {
      var grid=$(SEL.grid);
      if (grid){ grid.innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>'; }
    }

    syncHeights();
  }

  window.FF_initOwnedPanel = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
