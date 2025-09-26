// assets/js/app-collection.js
// FreshFrogs (single runtime)
// - Pond (recent activity): Reservoir users/activity/v6 with users=<CONTROLLER_ADDRESS>
// - Owned ∪ Staked: Reservoir owned + controller.getStakedTokens(address)
// - Stake/Unstake/Claim, Unclaimed Rewards KPI
// - Scrollable owned grid; optional "Staked X ago" label if RPC available

(function(){
'use strict';

/* ---------- Config ---------- */
var CFG = window.FF_CFG = window.FF_CFG || {};
var CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
var NFT_ADDR  = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
var CTRL_ADDR = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
var RESV_HOST = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
var API_KEY   = CFG.FROG_API_KEY || '';
var BASE_PATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
var SYM       = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
var DEC       = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
var PAGE      = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 24)));
var DEPLOY_BLOCK = Number(CFG.CONTROLLER_DEPLOY_BLOCK || 0);

/* ---------- Web3 boot (fallback) ---------- */
function defaultRpcFor(id){
  id = Number(id||1);
  if (id===1) return 'https://cloudflare-eth.com';
  if (id===11155111) return 'https://rpc.sepolia.org';
  if (id===5) return 'https://rpc.ankr.com/eth_goerli';
  return 'https://cloudflare-eth.com';
}
var WEB3 = window.web3;
(function initWeb3(){
  if (WEB3) return;
  if (window.ethereum && window.Web3){
    WEB3 = new window.Web3(window.ethereum);
    window.web3 = WEB3;
    return;
  }
  if (window.Web3){
    var rpc = CFG.RPC_URL || defaultRpcFor(CHAIN_ID);
    try{
      WEB3 = new window.Web3(new window.Web3.providers.HttpProvider(rpc, { keepAlive:true }));
      window.web3 = WEB3;
      console.log('[FF] RPC fallback:', rpc);
    }catch(e){ console.warn('[FF] RPC fallback failed', e); }
  }
})();

/* ---------- Helpers ---------- */
function etherscanBase(kind){
  if (CHAIN_ID===1) return 'https://etherscan.io/'+kind+'/';
  if (CHAIN_ID===11155111) return 'https://sepolia.etherscan.io/'+kind+'/';
  if (CHAIN_ID===5) return 'https://goerli.etherscan.io/'+kind+'/';
  return 'https://etherscan.io/'+kind+'/';
}
function escTx(h){ return etherscanBase('tx')+h; }
function escAddr(a){ return etherscanBase('address')+a; }
function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
function $(s,r){ return (r||document).querySelector(s); }
function imgFor(id){ return BASE_PATH + '/frog/' + id + '.png'; }
function metaFor(id){ return BASE_PATH + '/frog/json/' + id + '.json'; }
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
function timeAgo(ts){
  if (!ts) return '—';
  var diff = Math.max(0, (Date.now()/1000) - ts);
  var d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600), m = Math.floor((diff%3600)/60);
  if (d>0) return d+'d '+h+'h ago';
  if (h>0) return h+'h '+m+'m ago';
  return m+'m ago';
}

/* ---------- ABI / Controller ---------- */
var CONTROLLER_ABI = window.CONTROLLER_ABI || window.controller_abi || window.FF_CONTROLLER_ABI || [
  {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakers","outputs":[{"internalType":"uint256","name":"amountStaked","type":"uint256"},{"internalType":"uint256","name":"timeOfLastUpdate","type":"uint256"},{"internalType":"uint256","name":"unclaimedRewards","type":"uint256"}],"stateMutability":"view","type":"function"}
];

var controller = (WEB3 && CFG.CONTROLLER_ADDRESS) ? new WEB3.eth.Contract(CONTROLLER_ABI, CFG.CONTROLLER_ADDRESS) : null;

/* ---------- Wallet helpers ---------- */
async function getAddress(){
  try{
    if (window.FF_WALLET?.address) return window.FF_WALLET.address;
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

  // IMPORTANT: rebind Web3 + controller to wallet provider so contract reads work immediately
  if (window.Web3){
    WEB3 = new window.Web3(window.ethereum);
    window.web3 = WEB3;
    controller = new WEB3.eth.Contract(CONTROLLER_ABI, CFG.CONTROLLER_ADDRESS);
  }
  return addr;
}

/* ---------- Staking adapter ---------- */
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
async function getUserStakedTokens(user){
  try{
    if (!controller) return [];
    var raw = await controller.methods.getStakedTokens(user).call();
    return normalizeIds(raw);
  }catch(e){ console.warn('[FF] getStakedTokens failed', e); return []; }
}
async function availableRewards(user){
  if (!controller) return '0';
  try { return await controller.methods.availableRewards(user).call(); }
  catch(e){
    try{ var s=await controller.methods.stakers(user).call(); return s?.unclaimedRewards ?? '0'; }
    catch(e2){ return '0'; }
  }
}
async function claimRewards(){
  if (!controller || !WEB3) throw new Error('controller not ready');
  var a = window.user_address || await getAddress();
  var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
  var est = await controller.methods.claimRewards().estimateGas({ from:a }).catch(()=> 200000);
  return controller.methods.claimRewards().send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
}
async function stakeToken(id){
  if (!controller || !WEB3) throw new Error('controller not ready');
  var a = window.user_address || await getAddress();
  var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
  var est = await controller.methods.stake(id).estimateGas({ from:a }).catch(()=> 200000);
  return controller.methods.stake(id).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
}
async function unstakeToken(id){
  if (!controller || !WEB3) throw new Error('controller not ready');
  var a = window.user_address || await getAddress();
  var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
  var est = await controller.methods.withdraw(id).estimateGas({ from:a }).catch(()=> 200000);
  return controller.methods.withdraw(id).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
}

/* "Staked X ago" — optional RPC scan */
var stakeTimeCache = new Map();
async function getStakeTimestamp(tokenId){
  if (!WEB3?.eth) return null;
  if (stakeTimeCache.has(tokenId)) return stakeTimeCache.get(tokenId);
  try{
    var TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    var toTopic   = '0x000000000000000000000000'+CTRL_ADDR.slice(2);
    var idTopic   = '0x'+BigInt(tokenId).toString(16).padStart(64,'0');
    var logs = await WEB3.eth.getPastLogs({
      fromBlock: DEPLOY_BLOCK ? '0x'+DEPLOY_BLOCK.toString(16) : '0x0',
      toBlock:   'latest',
      address: CFG.COLLECTION_ADDRESS,
      topics: [ TRANSFER, null, toTopic, idTopic ]
    });
    if (!logs.length){ stakeTimeCache.set(tokenId,null); return null; }
    var last = logs[logs.length-1];
    var blk  = await WEB3.eth.getBlock(last.blockNumber).catch(()=>null);
    var ts   = blk && blk.timestamp || null;
    stakeTimeCache.set(tokenId, ts);
    return ts;
  }catch(e){ return null; }
}

/* ---------- The Pond (users/activity/v6) ---------- */
var POND = (function(){
  var UL = '#recentStakes';
  var busy=false, done=false, continuation=null;
  var MAX_ROWS=250;

  function diag(msg){
    var ul = document.querySelector(UL); if (!ul) return;
    ul.innerHTML = '<li class="row"><div class="pg-muted">'+msg+'</div></li>';
  }
  function rowHTML(e){
    var title = e.kind==='stake' ? 'Staked' : (e.kind==='unstake' ? 'Unstaked' : 'Activity');
    var when = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var meta = shorten(e.from)+' → '+shorten(e.to);
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        '<img class="thumb64" src="'+imgFor(e.id)+'" alt="'+e.id+'">'+
        '<div><div><b>'+title+'</b> Frog #'+e.id+'</div>'+
        '<div class="pg-muted">'+when+' • '+meta+'</div></div>'+
      '</li>'
    );
  }
  function setStaticKPIs(){
    var a=$('#stakedController'); if (a && CFG.CONTROLLER_ADDRESS){ a.textContent = shorten(CFG.CONTROLLER_ADDRESS); a.href=escAddr(CFG.CONTROLLER_ADDRESS); }
    var notes=$('.info-block .in'); if (notes) notes.textContent='Click a row for Etherscan';
  }

  async function fetchUserActivityPage(){
    if (!API_KEY){ throw new Error('Missing Reservoir API key'); }
    var headers = { accept:'application/json', 'x-api-key': API_KEY };
    // users=controller address (treat controller as a “user”) — we want transfers in/out of controller
    var u = new URL(RESV_HOST + '/users/activity/v6');
    u.searchParams.set('users', CFG.CONTROLLER_ADDRESS);
    u.searchParams.set('limit', '20');
    // We’ll filter transfers client-side; v6 supports multiple types, not all installations expose type filters.
    if (continuation) u.searchParams.set('continuation', continuation);

    var res = await fetch(u.toString(), { headers });
    if (!res.ok){
      var txt = await res.text().catch(function(){return '';});
      throw new Error('Reservoir users/activity failed: '+res.status+' '+txt);
    }
    var j = await res.json();
    continuation = j.continuation || null;

    // Normalize
    var out=[];
    var rows = Array.isArray(j.activities) ? j.activities : [];
    for (var i=0;i<rows.length;i++){
      var r = rows[i]||{};
      // Only consider transfer-like entries with token + addresses
      var from=(r.fromAddress||r.from||'').toLowerCase();
      var to  =(r.toAddress||r.to||'').toLowerCase();
      var id  =Number(r.token?.tokenId || r.tokenId);
      if (!Number.isFinite(id)) continue;
      // Only keep events for our NFT collection
      var col = (r.contract || r.collection || r.collectionAddress || r.token?.contract)?.toLowerCase?.() || '';
      if (NFT_ADDR && col && col!==NFT_ADDR) continue;

      var ts  = Number(r.timestamp || r.blockTimestamp || (r.createdAt && Math.floor(new Date(r.createdAt).getTime()/1000))) || null;
      var tx  = r.txHash || r.txhash || r.transactionHash || '';
      if (!from || !to) continue;

      // stake = transfer TO controller, unstake = transfer FROM controller
      if (to===CTRL_ADDR) out.push({ kind:'stake',   id, from:r.fromAddress||r.from||'', to:r.toAddress||r.to||'', time:ts, tx });
      else if (from===CTRL_ADDR) out.push({ kind:'unstake', id, from:r.fromAddress||r.from||'', to:r.toAddress||r.to||'', time:ts, tx });
    }
    return out;
  }

  async function loadNext(listEl){
    if (busy || done) return; busy=true;
    try{
      if (!CFG.CONTROLLER_ADDRESS || !CFG.COLLECTION_ADDRESS){ diag('Missing addresses'); done=true; return; }
      var rows = await fetchUserActivityPage();

      if (rows.length){
        rows.sort(function(a,b){ return (b.time||0)-(a.time||0); });
        var frag=document.createDocumentFragment();
        for (var k=0;k<rows.length;k++){
          var li=document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(rows[k]);
          (function(tx){ li.addEventListener('click', function(){ if (tx) window.open(escTx(tx),'_blank'); }); })(rows[k].tx);
          frag.appendChild(li);
        }
        if (listEl.firstElementChild && listEl.firstElementChild.classList.contains('row') && listEl.firstElementChild.textContent.includes('Loading')) {
          listEl.innerHTML='';
        }
        listEl.appendChild(frag);
        var lis=listEl.querySelectorAll('li.row');
        if (lis.length>MAX_ROWS){
          var excess=lis.length-MAX_ROWS; for (var z=0; z<excess; z++) listEl.removeChild(lis[z]);
        }
      } else if (!listEl.querySelector('li.row')) {
        diag('No activity yet.');
      }
      if (!continuation) done = true;
    } finally { busy=false; }
  }

  function attachScroll(listEl){
    listEl.classList.add('scrolling');
    listEl.addEventListener('scroll', function(){
      if (busy || done) return;
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80) loadNext(listEl);
    });
    loadNext(listEl).then(function(){ setTimeout(function(){ loadNext(listEl); }, 120); });
  }

  function init(){
    setStaticKPIs();
    var ul = document.querySelector(UL); if(!ul) return;
    ul.innerHTML = '<li class="row"><div class="pg-muted">Loading recent activity…</div></li>';
    attachScroll(ul);
  }

  return { init };
})();

/* ---------- Owned ∪ Staked panel ---------- */
var OWNED = (function(){
  var SEL = { grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };
  var idsStaked=[], items=[], cont=null, rewards='—';

  // Scoped CSS (scrollable owned grid + bullets)
  (function css(){
    if (document.getElementById('owned-clean-css')) return;
    var s=document.createElement('style'); s.id='owned-clean-css';
    s.textContent=[
      '#ownedCard{display:flex;flex-direction:column}',
      '#ownedCard .oh-wrap{margin-bottom:10px}',
      '#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '#ownedCard .oh-mini{font-size:11px;line-height:1}',
      '#ownedCard .oh-spacer{flex:1}',
      '#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}',
      '#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}',
      '#ownedGrid{flex:1 1 auto;max-height:60vh;overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}',
      '#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}',
      '#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}',
      '#ownedCard .staked-ago{font-size:12px;color:var(--muted)}'
    ].join('');
    document.head.appendChild(s);
  })();

  // Ranks (optional)
  async function ranks(){
    if (window.FF?.RANKS) return window.FF.RANKS;
    try{
      var r = await fetch(CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json');
      var j = r.ok ? await r.json() : null;
      var map = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
      window.FF = window.FF || {}; window.FF.RANKS = map; return map;
    }catch(e){ window.FF = window.FF || {}; window.FF.RANKS={}; return {}; }
  }

  // Header
  function headerRoot(){
    var card = document.getElementById('ownedCard'); if(!card) return null;
    var w = card.querySelector('.oh-wrap'); if (!w){ w=document.createElement('div'); w.className='oh-wrap'; card.insertBefore(w, $(SEL.grid, card)); }
    w.innerHTML=''; return w;
  }
  function renderHeader(){
    var w = headerRoot(); if(!w) return;
    var stCount = idsStaked ? idsStaked.length : 0;
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
      '<span class="oh-muted">Owned</span> <b>'+(items.length||0)+'</b>'+
      '<span>•</span><span class="oh-muted">Staked</span> <b>'+stCount+'</b>'+
      '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+rewards+' '+SYM+'</b>'+
      '<span class="oh-spacer"></span>'+
      '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';
    var bC = $('#ohClaim', w);
    if (bC) bC.onclick = async function(){ bC.disabled=true; try{ await claimRewards(); await refreshKPIs(); } finally { bC.disabled=false; } };
  }

  // Cards
  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var rows=[], cap = Number.isFinite(Number(max))?Number(max):4;
    for (var i=0;i<attrs.length && rows.length<cap;i++){
      var a=attrs[i]; if(!a||!a.key||a.value==null) continue;
      rows.push('<li><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    var base = (it.staked ? 'Staked' : 'Not staked') + ' • Owned by You';
    if (it.stakedTs){
      var dt = new Date(it.stakedTs*1000);
      var mm = String(dt.getMonth()+1).padStart(2,'0'), dd = String(dt.getDate()).padStart(2,'0'), yy = String(dt.getFullYear()).slice(-2);
      base += ' • <span class="staked-ago" title="'+dt.toLocaleString()+'">Staked '+timeAgo(it.stakedTs)+' ('+mm+'/'+dd+'/'+yy+')</span>';
    }
    return base;
  }
  function wireActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            await stakeToken(it.id);
            it.staked = true; it.stakedTs = await getStakeTimestamp(it.id);
            btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
            scope.querySelector('.meta').innerHTML = fmtMeta(it);
            await refreshKPIs();
          } else if (act==='unstake'){
            await unstakeToken(it.id);
            it.staked = false; it.stakedTs = null;
            btn.textContent='Stake'; btn.setAttribute('data-act','stake');
            scope.querySelector('.meta').innerHTML = fmtMeta(it);
            await refreshKPIs();
          }
        }catch(e){ console.warn('[FF] action failed', e); }
      });
    });
  }
  function etherscanToken(id){
    return etherscanBase('token') + CFG.COLLECTION_ADDRESS + '?a=' + id;
  }
  function renderCards(){
    var root = $(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(); return; }
    for (var i=0;i<items.length;i++){
      var it = items[i];
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
    }
    var more = $(SEL.more);
    if (more){ more.style.display = cont ? 'block' : 'none'; more.textContent='Load more'; more.onclick = loadMore; }
    renderHeader();
  }

  // Fetch / data
  var META = new Map();
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

  function tokensApiUser(a){ return RESV_HOST + '/users/' + a + '/tokens/v8'; }
  async function fetchOwnedIdsPage(a){
    if (!API_KEY){
      var g=$(SEL.grid); if (g) g.innerHTML='<div class="pg-muted">Reservoir API key missing (FF_CFG.FROG_API_KEY).</div>';
      cont=null; return [];
    }
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

  async function refreshKPIs(addr){
    try{
      var a = addr || (await getAddress());
      var raw = await availableRewards(a);
      rewards = formatToken(raw);
    }catch(e){ rewards='—'; }
    renderHeader();
  }

  async function hydrate(ids, rankMap){
    var out=[];
    for (var i=0;i<ids.length;i++){
      var id = ids[i];
      var m = await fetchMeta(id);
      var st = idsStaked.includes(id);
      var ts = st ? await getStakeTimestamp(id) : null;
      out.push({ id, attrs:m.attrs, staked:st, stakedTs:ts, rank:rankMap[String(id)] });
    }
    return out;
  }

  async function loadFirst(addr){
    var rankMap = await ranks();
    var ownedIds = await fetchOwnedIdsPage(addr);
    idsStaked = await getUserStakedTokens(addr);       // ← ensures staked show after connect
    var set = new Set(ownedIds); for (var i=0;i<idsStaked.length;i++) set.add(idsStaked[i]);
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
    // blow away any legacy info grid to avoid double KPIs
    document.querySelectorAll('#ownedCard .info-grid-2').forEach(function(n){ n.remove(); });

    var btn = $(SEL.btn);
    if (btn){
      btn.addEventListener('mouseenter', function(){ btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function(){ btn.classList.remove('hover'); });
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await connect(); if (!a) return;
          btn.textContent = shorten(a);
          $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirst(a);
        } finally { btn.disabled=false; }
      });
    }

    var a0 = await getAddress();
    if (a0){
      if (btn) btn.textContent = shorten(a0);
      $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
      await loadFirst(a0);
    } else {
      $(SEL.grid).innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    }
  }

  return { init };
})();

/* ---------- Boot ---------- */
window.FF_loadRecentStakes = function(){ POND.init(); };
window.FF_initOwnedPanel  = function(){ OWNED.init(); };

})(); // IIFE
