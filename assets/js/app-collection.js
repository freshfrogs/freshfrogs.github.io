// assets/js/app-collection.js
// "My Frogs (Owned)" — restore mini header (Owned • Staked • Unclaimed Rewards)
// Approve shows only when needed; Claim Rewards action; cards unchanged;
// Meta shows "Owned by You" / "Staked NNd ago by You". Owned=Reservoir, Staked=controller.

(function(){
  'use strict';

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
  var DEPLOY_BLOCK = Number(CFG.CONTROLLER_DEPLOY_BLOCK || 0);

  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };

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
  function fmtAmt(raw){
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
  function timeAgoDays(ts){
    if (!ts) return null;
    var d = Math.floor((Date.now()/1000 - ts)/86400);
    return d<0 ? 0 : d;
  }

  // ---- Web3/controller + ERC721 (approval) ----
  var WEB3=null, controller=null, nft=null;
  var ABI_CTRL = window.CONTROLLER_ABI || [
    {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"}
  ];
  var ABI_ERC721 = [
    {"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":false,"inputs":[{"name":"operator","type":"address"},{"name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}
  ];

  function haveWeb3(){ return !!window.Web3; }
  function bind(provider){ try{ WEB3 = new window.Web3(provider); return true; }catch(e){ return false; } }
  function ensureReadWeb3(){
    if (WEB3) return true;
    if (window.ethereum && haveWeb3()) return bind(window.ethereum);
    if (haveWeb3() && CFG.RPC_URL)   return bind(new window.Web3.providers.HttpProvider(CFG.RPC_URL, { keepAlive:true }));
    return false;
  }
  function ensureContracts(){
    if (!ensureReadWeb3()) return false;
    if (!controller && CFG.CONTROLLER_ADDRESS) controller = new WEB3.eth.Contract(ABI_CTRL, CFG.CONTROLLER_ADDRESS);
    if (!nft && CFG.COLLECTION_ADDRESS)        nft        = new WEB3.eth.Contract(ABI_ERC721, CFG.COLLECTION_ADDRESS);
    return !!controller && !!nft;
  }

  async function getAddress(){
    if (window.user_address) return window.user_address;
    try{
      if (window.ethereum?.request){
        var arr = await window.ethereum.request({ method:'eth_accounts' });
        return arr?.[0] || null;
      }
    }catch(e){}
    return null;
  }
  async function connect(){
    if (!window.ethereum?.request) throw new Error('No wallet provider');
    var arr = await window.ethereum.request({ method:'eth_requestAccounts' });
    var addr = arr?.[0] || null;
    if (addr) window.user_address = addr;
    if (haveWeb3()) bind(window.ethereum);
    ensureContracts();
    return addr;
  }

  async function isApproved(addr){
    if (!ensureContracts()) return false;
    try{ return await nft.methods.isApprovedForAll(addr, CFG.CONTROLLER_ADDRESS).call(); }
    catch(e){ return false; }
  }
  async function setApproval(addr){
    if (!ensureContracts()) throw new Error('No contracts');
    var gp = await WEB3.eth.getGasPrice().catch(function(){return null;});
    var est= await nft.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS,true).estimateGas({from:addr}).catch(function(){return 200000;});
    return nft.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS,true).send({ from:addr, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
  }
  async function availableRewards(addr){
    if (!ensureContracts()) return '0';
    try{ return await controller.methods.availableRewards(addr).call(); }
    catch(e){ return '0'; }
  }
  async function getStakedIds(addr){
    if (!ensureContracts()) return [];
    try{
      var rows = await controller.methods.getStakedTokens(addr).call();
      return Array.isArray(rows) ? rows.map(function(r){ return Number(r.tokenId); }).filter(Number.isFinite) : [];
    }catch(e){ return []; }
  }
  // stake age
  var stakeTimeCache = new Map();
  async function getStakeTs(tokenId){
    if (!WEB3?.eth || !CFG.COLLECTION_ADDRESS || !CTRL) return null;
    if (stakeTimeCache.has(tokenId)) return stakeTimeCache.get(tokenId);
    try{
      var TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      var toTopic  = '0x000000000000000000000000'+CTRL.slice(2);
      var idTopic  = '0x'+BigInt(tokenId).toString(16).padStart(64,'0');
      var fromBlk  = DEPLOY_BLOCK ? '0x'+DEPLOY_BLOCK.toString(16) : '0x0';
      var logs = await WEB3.eth.getPastLogs({ fromBlock: fromBlk, toBlock:'latest', address: CFG.COLLECTION_ADDRESS, topics:[TRANSFER, null, toTopic, idTopic] });
      if (!logs.length){ stakeTimeCache.set(tokenId,null); return null; }
      var last = logs[logs.length-1]; var blk = await WEB3.eth.getBlock(last.blockNumber).catch(function(){return null;});
      var ts = blk && blk.timestamp || null;
      stakeTimeCache.set(tokenId, ts);
      return ts;
    }catch(e){ return null; }
  }

  // ---- State ----
  var items=[], cont=null, stakedIds=[], rewards='—', approved=false;
  var META=new Map(), RANKS=null;

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
  function metaLine(it){
    if (!it.staked) return 'Owned by You';
    var days = it.stakedTs ? timeAgoDays(it.stakedTs) : null;
    return days!=null ? ('Staked '+days+'d ago by You') : 'Staked by You';
  }

  function headerRoot(){
    var card=$(SEL.card); if(!card) return null;
    var wrap = card.querySelector('.oh-wrap');
    if (!wrap){ wrap=document.createElement('div'); wrap.className='oh-wrap'; card.insertBefore(wrap, $(SEL.grid, card)); }
    return wrap;
  }
  function renderHeader(addr){
    var wrap = headerRoot(); if (!wrap) return;
    var stCount = stakedIds ? stakedIds.length : 0;
    wrap.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Wallet</span> <b>'+ (addr?shorten(addr):'—') +'</b>'+
        '<span>•</span><span class="oh-muted">Owned</span> <b>'+(items.length||0)+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b>'+stCount+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+rewards+' '+SYM+'</b>'+
      '</div>'+
      '<div class="oh-row oh-slim" style="margin-top:6px">'+
        (approved ? '' : '<button class="oh-btn" id="ohApprove">Approve Staking</button>')+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';

    var bA=$('#ohApprove', wrap), bC=$('#ohClaim', wrap);
    if (bA) bA.onclick = async function(){ try{
      bA.disabled=true; var a = await getAddress(); await setApproval(a); approved=true; renderHeader(a);
    }catch(e){} finally{ bA.disabled=false; } };
    if (bC) bC.onclick = async function(){ try{
      bC.disabled=true; if (!ensureContracts()) return;
      var a = await getAddress(); var gp=await WEB3.eth.getGasPrice().catch(function(){return null;});
      var est=await controller.methods.claimRewards().estimateGas({from:a}).catch(function(){return 200000;});
      await controller.methods.claimRewards().send({ from:a, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
      await updateRewards(a);
    }catch(e){} finally{ bC.disabled=false; } };
  }

  function wireActions(scope, it, addr){
    scope.querySelectorAll('button[data-act]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act = btn.getAttribute('data-act');
        btn.disabled = true;
        try{
          if (act==='stake'){
            var gp=await WEB3.eth.getGasPrice().catch(function(){return null;});
            var est=await controller.methods.stake(it.id).estimateGas({from:addr}).catch(function(){return 200000;});
            await controller.methods.stake(it.id).send({ from:addr, gas:WEB3.utils.toHex(est), gasPrice: gp?WEB3.utils.toHex(Math.round(Number(gp)*1.05)):undefined });
            it.staked=true; it.stakedTs = await getStakeTs(it.id);
            btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
          } else if (act==='unstake'){
            var gp2=await WEB3.eth.getGasPrice().catch(function(){return null;});
            var est2=await controller.methods.withdraw(it.id).estimateGas({from:addr}).catch(function(){return 200000;});
            await controller.methods.withdraw(it.id).send({ from:addr, gas:WEB3.utils.toHex(est2), gasPrice: gp2?WEB3.utils.toHex(Math.round(Number(gp2)*1.05)):undefined });
            it.staked=false; it.stakedTs=null;
            btn.textContent='Stake'; btn.setAttribute('data-act','stake');
          }
          var metaEl = scope.querySelector('.meta'); if (metaEl) metaEl.textContent = metaLine(it);
          await updateRewards(addr);
        }catch(e){ /* swallow */ } finally{ btn.disabled=false; }
      });
    });
  }

  function renderCards(addr){
    var root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(addr); return; }
    items.forEach(function(it){
      var el=document.createElement('article'); el.className='frog-card'; el.setAttribute('data-token-id', String(it.id));
      el.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+metaLine(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked?'unstake':'stake')+'">'+(it.staked?'Unstake':'Stake')+'</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(el);
      wireActions(el, it, addr);
    });
    var more=$(SEL.more); if (more){ more.style.display = cont ? 'block' : 'none'; more.textContent='Load more'; more.onclick = function(){ loadMore(addr); }; }
    renderHeader(addr);
  }

  // ----- Reservoir (owned ids) -----
  function tokensApiUser(a){ return HOST + '/users/' + a + '/tokens/v8'; }
  async function fetchOwnedIdsPage(a){
    if (!API_KEY) return [];
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

  // ----- Compose -----
  var META_CACHE = new Map(), RANKS=null;
  async function ranksMap(){
    if (RANKS) return RANKS;
    try{
      var r = await fetch(CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json');
      var j = r.ok ? await r.json() : null;
      RANKS = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
      return RANKS;
    }catch(e){ RANKS={}; return RANKS; }
  }

  async function hydrate(ids){
    var rankMap = await ranksMap();
    var out=[];
    for (var i=0;i<ids.length;i++){
      var id = ids[i];
      var meta = await fetchMeta(id);
      var st = stakedIds.includes(id);
      var ts = st ? await getStakeTs(id) : null;
      out.push({ id, attrs: meta.attrs, staked: st, stakedTs: ts, rank: rankMap[String(id)] });
    }
    return out;
  }

  async function updateRewards(addr){
    try{
      var raw = await availableRewards(addr);
      rewards = fmtAmt(raw);
    }catch(e){ rewards='—'; }
    renderHeader(addr);
  }

  async function loadFirst(addr){
    stakedIds = await getStakedIds(addr);
    var owned = API_KEY ? await fetchOwnedIdsPage(addr) : [];
    var set = new Set(owned); stakedIds.forEach(function(id){ set.add(id); });
    items = await hydrate(Array.from(set));
    renderCards(addr);
    await updateRewards(addr);
  }

  async function loadMore(addr){
    var more = await fetchOwnedIdsPage(addr);
    var add = more.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
    var extra = await hydrate(add);
    items = items.concat(extra);
    renderCards(addr);
  }

  async function init(){
    // Restore small header + counters after connect
    var btn = $(SEL.btn);
    if (btn){
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await connect(); if (!a) return;
          btn.textContent = shorten(a);
          btn.classList.add('btn-connected');
          $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
          approved = await isApproved(a);
          await loadFirst(a);
        } finally { btn.disabled=false; }
      });
    }
    // Autoload if already connected
    var a0 = await getAddress();
    if (a0){
      if (btn){ btn.textContent = shorten(a0); btn.classList.add('btn-connected'); }
      $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
      approved = await isApproved(a0);
      await loadFirst(a0);
    } else {
      // Keep original look; just ensure grid has a hint
      if (!API_KEY) $(SEL.grid).innerHTML = '<div class="pg-muted">Set FF_CFG.FROG_API_KEY to load owned frogs. Connect wallet to load staked frogs.</div>';
    }
  }

  window.FF_initOwnedPanel = init;
})();
