// assets/js/app-collection.js
// Owned + Staked panel (Reservoir + Controller ABI)
// - Owned: Reservoir (ids only) → local metadata frog/json/{id}.json
// - Staked: controller.getStakedTokens(user) AFTER connect
// - Merged list, deduped; bullet attributes; scroll-to-load for owned
// - Unclaimed Rewards + Claim button
// - Connect button turns/stays green (.btn-connected) with truncated address

(function(){
  'use strict';

  /* ---------- Config ---------- */
  var CFG = window.FF_CFG = window.FF_CFG || {};
  var CHAIN   = Number(CFG.CHAIN_ID || 1);
  var HOST    = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var API_KEY = CFG.FROG_API_KEY || '';
  var COLL    = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  var CTRL    = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  var BASE    = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  var PAGE    = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 24)));
  var SYM     = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
  var DEC     = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;

  /* ---------- Utils ---------- */
  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function imgFor(id){ return BASE + '/frog/' + id + '.png'; }
  function metaFor(id){ return BASE + '/frog/json/' + id + '.json'; }
  function etherscanBase(kind){
    if (CHAIN===1) return 'https://etherscan.io/'+kind+'/';
    if (CHAIN===11155111) return 'https://sepolia.etherscan.io/'+kind+'/';
    if (CHAIN===5) return 'https://goerli.etherscan.io/'+kind+'/';
    return 'https://etherscan.io/'+kind+'/';
  }
  function etherscanToken(id){ return etherscanBase('token') + CFG.COLLECTION_ADDRESS + '?a=' + id; }
  function formatToken(raw){
    try{
      if (raw==null) return '—';
      var bi = (typeof raw==='bigint') ? raw : BigInt(String(raw));
      var base = 1n; for (var i=0;i<DEC;i++) base*=10n;
      var whole= bi/base, frac = bi%base;
      if (whole>=100n) return whole.toString();
      var cents = Number((frac*100n)/base);
      var n = Number(whole)+cents/100;
      return (n%1===0? n.toFixed(0) : n.toFixed(2));
    }catch(e){ return '—'; }
  }

  /* ---------- Web3/controller (lazy) ---------- */
  var WEB3 = null, controller = null;
  var CONTROLLER_ABI = window.CONTROLLER_ABI || window.controller_abi || window.FF_CONTROLLER_ABI || [
    {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"}
  ];

  function haveWeb3Lib(){ return !!window.Web3; }
  function bindWeb3To(provider){
    try{ WEB3 = new window.Web3(provider); return true; }catch(e){ return false; }
  }
  function ensureReadWeb3(){
    if (WEB3) return true;
    if (window.ethereum && haveWeb3Lib()){ return bindWeb3To(window.ethereum); }
    if (haveWeb3Lib() && CFG.RPC_URL){ return bindWeb3To(new window.Web3.providers.HttpProvider(CFG.RPC_URL, { keepAlive:true })); }
    return false;
  }
  function ensureController(){
    try{
      if (!ensureReadWeb3()) return false;
      if (!controller && CFG.CONTROLLER_ADDRESS) controller = new WEB3.eth.Contract(CONTROLLER_ABI, CFG.CONTROLLER_ADDRESS);
      return !!controller;
    }catch(e){ console.warn('[owned] ensureController failed', e); return false; }
  }

  async function getAddress(){
    try{
      if (window.user_address) return window.user_address;
      if (window.ethereum?.request){
        var a = await window.ethereum.request({ method:'eth_accounts' });
        return a?.[0] || null;
      }
    }catch(e){}
    return null;
  }
  async function connect(){
    if (!window.ethereum?.request) throw new Error('No wallet provider');
    var a = await window.ethereum.request({ method:'eth_requestAccounts' });
    var addr = a?.[0] || null;
    if (addr) window.user_address = addr;
    // bind provider (for reads+writes)
    if (haveWeb3Lib()) bindWeb3To(window.ethereum);
    ensureController();
    return addr;
  }

  // Staking helpers
  function toNum(x){
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); var n=Number(x); return Number.isFinite(n)?n:NaN; }
      if (typeof x==='object'){
        if (typeof x.toString==='function'){ var s=x.toString(); if(/^\d+$/.test(s)) return Number(s); }
        if ('_hex' in x) return Number(x._hex);
      }
    }catch(e){}
    return NaN;
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    var out=[]; for (var i=0;i<rows.length;i++){
      var r = rows[i]||{};
      var v = ('tokenId' in r) ? r.tokenId : r;
      var n = toNum(v);
      if (Number.isFinite(n)) out.push(n);
    } return out;
  }
  async function getUserStakedIds(addr){
    if (!ensureController()) return [];
    try{ var raw = await controller.methods.getStakedTokens(addr).call(); return normalizeIds(raw); }
    catch(e){ console.warn('[owned] getStakedTokens failed', e); return []; }
  }
  async function getAvailableRewards(addr){
    if (!ensureController()) return '0';
    try{ return await controller.methods.availableRewards(addr).call(); }
    catch(e){
      // fallback if availableRewards isn’t present in some build
      try{ var s = await controller.methods.stakers(addr).call(); return s?.unclaimedRewards ?? '0'; }
      catch(e2){ return '0'; }
    }
  }
  async function claimRewards(){
    if (!WEB3 || !controller) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice().catch(function(){ return null; });
    var est = await controller.methods.claimRewards().estimateGas({ from:a }).catch(function(){ return 200000; });
    return controller.methods.claimRewards().send({ from:a, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
  }
  async function stakeToken(id){
    if (!WEB3 || !controller) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice().catch(function(){ return null; });
    var est = await controller.methods.stake(id).estimateGas({ from:a }).catch(function(){ return 200000; });
    return controller.methods.stake(id).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
  }
  async function unstakeToken(id){
    if (!WEB3 || !controller) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice().catch(function(){ return null; });
    var est = await controller.methods.withdraw(id).estimateGas({ from:a }).catch(function(){ return 200000; });
    return controller.methods.withdraw(id).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
  }

  /* ---------- State ---------- */
  var SEL = { grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };
  var items=[], cont=null, stakedIds=[], rewards='—';
  var META = new Map(), RANKS=null;

  async function ranks(){
    if (RANKS) return RANKS;
    try{
      var r = await fetch(CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json');
      var j = r.ok ? await r.json() : null;
      RANKS = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
      return RANKS;
    }catch(e){ RANKS={}; return RANKS; }
  }
  async function fetchMeta(id){
    if (META.has(id)) return META.get(id);
    try{
      var r = await fetch(metaFor(id)); var j = r.ok ? await r.json() : null;
      var attrs = (j && Array.isArray(j.attributes)) ? j.attributes.map(function(a){
        return { key:(a && (a.key||a.trait_type))||'', value:(a && (a.value!=null?a.value:a.trait_value)) };
      }) : [];
      var out = { id:id, attrs:attrs }; META.set(id,out); return out;
    }catch(e){ var out2={ id:id, attrs:[] }; META.set(id,out2); return out2; }
  }

  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var rows=[], cap = Number.isFinite(Number(max))?Number(max):4;
    for (var i=0;i<attrs.length && rows.length<cap;i++){
      var a=attrs[i]; if(!a||!a.key||a.value==null) continue;
      rows.push('<li class="attr"><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
    }
    return rows.length? '<ul class="attr-list">'+rows.join('')+'</ul>' : '';
  }

  function fmtMeta(it){
    return (it.staked ? 'Staked' : 'Not staked') + ' • Owned by You';
  }

  function renderHeader(){
    var root = $('#ownedCard'); if (!root) return;
    var wrap = root.querySelector('.oh-wrap'); if (!wrap){ wrap=document.createElement('div'); wrap.className='oh-wrap'; root.insertBefore(wrap, $(SEL.grid, root)); }
    var stCount = stakedIds ? stakedIds.length : 0;
    wrap.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Owned</span> <b>'+(items.length||0)+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b>'+stCount+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+rewards+' '+SYM+'</b>'+
        '<span class="oh-spacer"></span>'+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';
    var bC = $('#ohClaim', wrap);
    if (bC) bC.onclick = async function(){ bC.disabled=true; try{
      await claimRewards(); await refreshKPIs();
    }catch(e){} finally{ bC.disabled=false; } };
  }

  function wireActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act = btn.getAttribute('data-act');
        btn.disabled = true;
        try{
          if (act==='stake'){ await stakeToken(it.id); it.staked=true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake'); }
          else if (act==='unstake'){ await unstakeToken(it.id); it.staked=false; btn.textContent='Stake'; btn.setAttribute('data-act','stake'); }
          scope.querySelector('.meta').textContent = fmtMeta(it);
          await refreshKPIs();
        }catch(e){ /* toast? */ } finally{ btn.disabled=false; }
      });
    });
  }

  function renderCards(){
    var root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(); return; }
    items.forEach(function(it){
      var el=document.createElement('article'); el.className='frog-card'; el.setAttribute('data-token-id', String(it.id));
      el.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked?'unstake':'stake')+'">'+(it.staked?'Unstake':'Stake')+'</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(el);
      wireActions(el, it);
    });
    var more=$(SEL.more); if (more){ more.style.display = cont ? 'block' : 'none'; more.textContent='Load more'; more.onclick = loadMore; }
    renderHeader();
  }

  async function refreshKPIs(addr){
    try{
      var a = addr || (await getAddress());
      if (a){ var raw = await getAvailableRewards(a); rewards = formatToken(raw); }
      else { rewards = '—'; }
    }catch(e){ rewards='—'; }
    renderHeader();
  }

  // Reservoir (owned ids)
  function tokensApiUser(a){ return HOST + '/users/' + a + '/tokens/v8'; }
  async function fetchOwnedIdsPage(a){
    if (!API_KEY) return []; // silent; UI will ask to set key if needed
    try{
      var qs=new URLSearchParams({ collection: CFG.COLLECTION_ADDRESS, limit:String(PAGE), includeTopBid:'false', includeAttributes:'false' });
      if (cont) qs.set('continuation', cont);
      var r = await fetch(tokensApiUser(a)+'?'+qs.toString(), { headers:{ accept:'application/json', 'x-api-key': API_KEY }});
      if (!r.ok) throw 0;
      var data = await r.json();
      var ids = (data.tokens||[]).map(function(x){ return Number(x?.token?.tokenId); }).filter(Number.isFinite);
      cont = data.continuation || null;
      return ids;
    }catch(e){ cont=null; return []; }
  }

  async function hydrate(ids, rankMap){
    var out=[];
    for (var i=0;i<ids.length;i++){
      var id = ids[i];
      var meta = await fetchMeta(id);
      out.push({ id, attrs: meta.attrs, staked: stakedIds.includes(id), rank: rankMap[String(id)] });
    }
    return out;
  }

  async function loadFirst(addr){
    var rankMap = await ranks();
    // Owned page 1
    var ownedIds = API_KEY ? await fetchOwnedIdsPage(addr) : [];
    // Staked (after connect)
    stakedIds = await getUserStakedIds(addr);

    // Merge
    var set = new Set(ownedIds); stakedIds.forEach(function(id){ set.add(id); });
    items = await hydrate(Array.from(set), rankMap);
    renderCards();
    await refreshKPIs(addr);
    attachObserver();
  }

  async function loadMore(){
    var rankMap = await ranks();
    var addr = await getAddress(); if (!addr) return;
    var more = await fetchOwnedIdsPage(addr);
    var add = more.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
    var extra = await hydrate(add, rankMap);
    items = items.concat(extra);
    renderCards();
  }

  function attachObserver(){
    var root = $(SEL.grid); if (!root || !cont) return;
    var sentinel=document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
    var io=new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      io.disconnect(); loadMore();
    },{ root, rootMargin:'140px', threshold:0.01 });
    io.observe(sentinel);
  }

  async function init(){
    // strip old stat grid on the card
    document.querySelectorAll('#ownedCard .info-grid-2').forEach(function(n){ n.remove(); });

    var btn = $(SEL.btn);
    if (btn){
      // on hover, it already turns green via CSS; on connected, keep it green
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await connect(); if (!a) return;
          btn.textContent = shorten(a);
          btn.classList.add('btn-connected');
          $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirst(a);
        } finally { btn.disabled=false; }
      });
    }

    // If they were already connected, hydrate immediately (staked requires connect for address)
    var a0 = await getAddress();
    if (a0){
      if (btn){ btn.textContent = shorten(a0); btn.classList.add('btn-connected'); }
      $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
      await loadFirst(a0);
    } else {
      // Owned needs API key; staked needs connect → explain only if no key
      if (!API_KEY) $(SEL.grid).innerHTML = '<div class="pg-muted">Set FF_CFG.FROG_API_KEY to load owned frogs. Connect wallet to load staked frogs.</div>';
      else $(SEL.grid).innerHTML = '<div class="pg-muted">Connect your wallet to view staked frogs.</div>';
    }
  }

  window.FF_initOwnedPanel = init;
})();
