// assets/js/app-collection.js
// FreshFrogs: single-file runtime for Collection page.
//
// Fixes in this build:
// - Adds RPC fallback (FF_CFG.RPC_URL or a default per CHAIN_ID) so The Pond works without a connected wallet.
// - Shows explicit diagnostics in The Pond when RPC/addresses are missing.
// - Keeps owned ∪ staked panel, KPIs, and actions intact.

(function(){
'use strict';

/* -------------------------------------------------------
   Config + Web3 (with robust RPC fallback)
------------------------------------------------------- */
var C = window.FF_CFG = window.FF_CFG || {};
var CHAIN_ID  = Number(C.CHAIN_ID || 1);
var NFT_ADDR_RAW  = C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS || '';
var CTRL_ADDR_RAW = C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '';
var NFT_ADDR  = (NFT_ADDR_RAW || '').toLowerCase();
var CTRL_ADDR = (CTRL_ADDR_RAW || '').toLowerCase();
var RESV_HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
var API_KEY   = C.FROG_API_KEY;
var BASE_PATH = (C.SOURCE_PATH || '').replace(/\/+$/,'');
var SYM       = C.REWARD_TOKEN_SYMBOL || '$FLYZ';
var DEC       = Number.isFinite(Number(C.REWARD_DECIMALS)) ? Number(C.REWARD_DECIMALS) : 18;
var PAGE      = Math.max(1, Math.min(50, Number(C.OWNED_PAGE_SIZE || C.PAGE_SIZE || 24)));
var ACT_WINDOW = Number(C.ACTIVITY_BLOCK_WINDOW || 1500);

function defaultRpcFor(chainId){
  switch (Number(chainId||1)) {
    case 1:          return 'https://cloudflare-eth.com';
    case 11155111:   return 'https://rpc.sepolia.org';
    case 5:          return 'https://rpc.ankr.com/eth_goerli';
    default:         return 'https://cloudflare-eth.com';
  }
}

var WEB3 = window.web3;
(function ensureWeb3(){
  if (WEB3) return;
  if (window.ethereum && window.Web3) {
    WEB3 = new window.Web3(window.ethereum);
    window.web3 = WEB3;
    return;
  }
  // Fallback: public/provider RPC (READ-ONLY)
  if (window.Web3) {
    var rpc = C.RPC_URL || defaultRpcFor(CHAIN_ID);
    try {
      WEB3 = new window.Web3(new window.Web3.providers.HttpProvider(rpc, { keepAlive:true }));
      window.web3 = WEB3;
      console.log('[FF] Using RPC fallback:', rpc);
    } catch(e){
      console.warn('[FF] Could not create fallback Web3:', e);
    }
  }
})();

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
    var b = 1n; for (var i=0;i<DEC;i++) b*=10n;
    var whole = bi / b, frac = bi % b;
    if (whole>=100n) return whole.toString();
    var cents = Number((frac*100n)/b);
    var out = Number(whole)+cents/100;
    return (out%1===0? out.toFixed(0) : out.toFixed(2));
  }catch(e){ return '—'; }
}

/* -------------------------------------------------------
   ABI & controller (activity uses logs, not contract)
------------------------------------------------------- */
var CONTROLLER_ABI = window.CONTROLLER_ABI || window.controller_abi || window.FF_CONTROLLER_ABI || [
  {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakers","outputs":[{"internalType":"uint256","name":"amountStaked","type":"uint256"},{"internalType":"uint256","name":"timeOfLastUpdate","type":"uint256"},{"internalType":"uint256","name":"unclaimedRewards","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsClaimed","type":"event"}
];

var controller;
if (WEB3 && CTRL_ADDR) {
  try { controller = new WEB3.eth.Contract(CONTROLLER_ABI, CTRL_ADDR); } catch(e){ /* noop */ }
}

/* -------------------------------------------------------
   Wallet helpers
------------------------------------------------------- */
async function getAddress(){
  try{
    if (window.FF_WALLET?.address) return window.FF_WALLET.address;
    if (window.user_address) return window.user_address;
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
  var a = arr?.[0] || null;
  if (a) window.user_address = a;
  return a;
}

/* -------------------------------------------------------
   Staking adapter
------------------------------------------------------- */
function toNum(x){
  try{
    if (x==null) return NaN;
    if (typeof x==='number') return x;
    if (typeof x==='bigint') return Number(x);
    if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); var n=Number(x); return Number.isFinite(n)?n:NaN; }
    if (typeof x==='object'){
      if (typeof x.toString==='function'){ var s=x.toString(); if (/^\d+$/.test(s)) return Number(s); }
      if ('_hex' in x) return Number(x._hex);
    }
  }catch(e){}
  return NaN;
}
function extractId(obj){
  var n=toNum(obj); if (Number.isFinite(n)) return n;
  if (!obj || typeof obj!=='object') return NaN;
  if ('tokenId' in obj){ n=toNum(obj.tokenId); if (Number.isFinite(n)) return n; }
  if (Array.isArray(obj)){ for (var i=0;i<obj.length;i++){ n=toNum(obj[i]); if (Number.isFinite(n)) return n; } }
  for (var k in obj){ if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
    n = extractId(obj[k]); if (Number.isFinite(n)) return n;
  }
  return NaN;
}
function normalizeIds(rows){ if (!Array.isArray(rows)) return []; var out=[]; for (var i=0;i<rows.length;i++){ var v=extractId(rows[i]); if (Number.isFinite(v)) out.push(v); } return out; }

async function getUserStakedTokens(user){
  try{
    if (!controller) return [];
    var raw = await controller.methods.getStakedTokens(user).call();
    return normalizeIds(raw);
  }catch(e){ return []; }
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

/* -------------------------------------------------------
   The Pond: activity via eth_getLogs (with diagnostics)
------------------------------------------------------- */
var POND = (function(){
  var UL = '#recentStakes';
  var busy=false, done=false, from=null, to=null;
  var MAX_ROWS=250;

  // topics
  var T_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  var T_REWARD = (function(){
    if (!WEB3 || !controller) return null;
    try { return WEB3.utils.sha3('RewardsClaimed(address,uint256)'); }
    catch(e){ return null; }
  })();

  function numHexToDec(hex){ try{ return Number(BigInt(hex)); } catch(e){ return NaN; } }
  async function latest(){ if (!WEB3?.eth) return null; return WEB3.eth.getBlockNumber(); }
  async function getLogs(params){ if (!WEB3?.eth) return []; try{ return await WEB3.eth.getPastLogs(params); }catch(e){ return []; } }

  function rowHTML(e){
    var title = e.kind==='stake' ? 'Staked' : (e.kind==='unstake' ? 'Unstaked' : 'Claimed');
    var when = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var img = BASE_PATH + '/frog/' + (e.id || 0) + '.png';
    var meta = e.kind==='claim'
      ? (shorten(e.user)+' claimed '+e.amountPretty)
      : (shorten(e.from)+' → '+shorten(e.to));
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        (e.id ? '<img class="thumb64" src="'+img+'" alt="'+e.id+'">' : '<div class="thumb64" style="display:flex;align-items:center;justify-content:center">💰</div>')+
        '<div><div><b>'+title+'</b>'+(e.id?(' Frog #'+e.id):'')+'</div>'+
        '<div class="pg-muted">'+when+' • '+meta+'</div></div>'+
      '</li>'
    );
  }

  var timeCache = new Map();
  async function stamp(events){
    if (!WEB3?.eth) return events;
    var blocks = Array.from(new Set(events.map(function(e){return e.blockNumber;})));
    for (var i=0;i<blocks.length;i++){
      var b = blocks[i];
      if (!timeCache.has(b)){
        var blk = await WEB3.eth.getBlock(b).catch(function(){ return null; });
        timeCache.set(b, blk && blk.timestamp || null);
      }
    }
    for (var j=0;j<events.length;j++){ events[j].time = timeCache.get(events[j].blockNumber)||null; }
    return events;
  }

  function setKPIs(){
    var a=$('#stakedController');
    if (a && CTRL_ADDR_RAW){ a.textContent = shorten(CTRL_ADDR_RAW); a.href = escAddr(CTRL_ADDR_RAW); }
    var sym=$('#pondRewardsSymbol'); if (sym) sym.textContent = SYM;
  }

  function showDiag(msg){
    var ul = document.querySelector(UL); if (!ul) return;
    ul.innerHTML = '<li class="row"><div class="pg-muted">'+msg+'</div></li>';
  }

  async function windowLoad(listEl){
    if (busy || done) return;
    busy=true;
    try{
      if (!WEB3?.eth) { showDiag('No RPC available. Set FF_CFG.RPC_URL or connect a wallet.'); done=true; return; }
      if (!NFT_ADDR || !CTRL_ADDR){ showDiag('Missing collection or controller address in config.'); done=true; return; }

      var tip = await latest(); if (tip==null){ showDiag('Could not read latest block.'); done=true; return; }
      if (from==null){ to=tip; from=Math.max(0, to-ACT_WINDOW); }
      else { to=from-1; if (to<=0){ done=true; return; } from=Math.max(0,to-ACT_WINDOW); }

      var toTopic   = '0x000000000000000000000000'+CTRL_ADDR.slice(2);
      var fromTopic = '0x000000000000000000000000'+CTRL_ADDR.slice(2);

      // Stake: Transfer to controller
      var logsStake = await getLogs({
        fromBlock: '0x'+from.toString(16),
        toBlock:   '0x'+to.toString(16),
        address: NFT_ADDR_RAW, // keep original case; providers accept both
        topics: [ T_TRANSFER, null, toTopic ]
      });

      // Unstake: Transfer from controller
      var logsUnstake = await getLogs({
        fromBlock: '0x'+from.toString(16),
        toBlock:   '0x'+to.toString(16),
        address: NFT_ADDR_RAW,
        topics: [ T_TRANSFER, fromTopic ]
      });

      var rows=[], i, l, id;
      for (i=0;i<logsStake.length;i++){
        l=logsStake[i];
        id = numHexToDec(l.topics[3]); // tokenId indexed
        rows.push({ kind:'stake', id:id, from:'0x'+l.topics[1].slice(26), to:'0x'+l.topics[2].slice(26), tx:l.transactionHash, blockNumber:Number(l.blockNumber) });
      }
      for (i=0;i<logsUnstake.length;i++){
        l=logsUnstake[i];
        id = numHexToDec(l.topics[3]);
        rows.push({ kind:'unstake', id:id, from:'0x'+l.topics[1].slice(26), to:'0x'+l.topics[2].slice(26), tx:l.transactionHash, blockNumber:Number(l.blockNumber) });
      }

      // Optional claims
      if (controller && T_REWARD){
        var logsClaim = await getLogs({
          fromBlock: '0x'+from.toString(16),
          toBlock:   '0x'+to.toString(16),
          address: CTRL_ADDR_RAW,
          topics: [ T_REWARD ]
        });
        for (i=0;i<logsClaim.length;i++){
          l=logsClaim[i];
          var user = '0x'+l.topics[1].slice(26);
          var amt  = BigInt(l.data);
          rows.push({ kind:'claim', user:user, amount:amt.toString(), amountPretty:formatToken(amt), tx:l.transactionHash, blockNumber:Number(l.blockNumber) });
        }
      }

      if (rows.length){
        rows.sort(function(a,b){ return b.blockNumber - a.blockNumber; });
        rows = await stamp(rows);

        var frag=document.createDocumentFragment();
        for (i=0;i<rows.length;i++){
          var li=document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(rows[i]);
          (function(tx){ li.addEventListener('click', function(){ window.open(escTx(tx), '_blank'); }); })(rows[i].tx);
          frag.appendChild(li);
        }
        // append or replace first load
        if (listEl.firstElementChild && listEl.firstElementChild.classList.contains('row') && listEl.firstElementChild.textContent.includes('Loading')) {
          listEl.innerHTML='';
        }
        listEl.appendChild(frag);

        var lis=listEl.querySelectorAll('li.row');
        if (lis.length>MAX_ROWS){
          var excess = lis.length-MAX_ROWS;
          for (i=0;i<excess;i++) listEl.removeChild(lis[i]);
        }
      } else if (!listEl.querySelector('li.row')) {
        showDiag('No activity found in the scanned window.');
      }
    } finally {
      busy=false;
    }
  }

  function attachScroll(listEl){
    listEl.classList.add('scrolling');
    listEl.addEventListener('scroll', function(){
      if (busy || done) return;
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80)
        windowLoad(listEl);
    });
    windowLoad(listEl).then(function(){ setTimeout(function(){ windowLoad(listEl); }, 120); });
  }

  function init(){
    var a=$('#stakedController'); if (a) { a.textContent='—'; a.removeAttribute('href'); }
    setKPIs();
    var ul = document.querySelector(UL); if(!ul) return;
    ul.innerHTML = '<li class="row"><div class="pg-muted">Loading recent activity…</div></li>';

    // Early diagnostics
    if (!NFT_ADDR) { showDiag('Missing FF_CFG.COLLECTION_ADDRESS'); return; }
    if (!CTRL_ADDR){ showDiag('Missing FF_CFG.CONTROLLER_ADDRESS'); return; }
    if (!WEB3?.eth){
      var rpcMsg = C.RPC_URL ? 'RPC_URL seems unreachable.' : 'No wallet or RPC available.';
      showDiag(rpcMsg + ' Set FF_CFG.RPC_URL for fallback.');
      return;
    }

    attachScroll(ul);
  }

  return { init:init };
})();

/* -------------------------------------------------------
   Owned ∪ Staked Panel (unchanged logic)
------------------------------------------------------- */
var OWNED = (function(){
  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };

  var idsStaked=[], items=[], cont=null;
  var rewards='—';

  // Ranks (optional)
  async function ensureRanks(){
    if (window.FF && window.FF.RANKS) return window.FF.RANKS;
    try{
      var url = C.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
      var r = await fetch(url); if (!r.ok) throw 0;
      var j = await r.json();
      var map = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
      window.FF = window.FF || {}; window.FF.RANKS = map; return map;
    }catch(e){ window.FF = window.FF || {}; window.FF.RANKS={}; return {}; }
  }

  // Header
  function headerRoot(){
    var card = $('#ownedCard'); if(!card) return null;
    var w = card.querySelector('.oh-wrap');
    if (!w){ w=document.createElement('div'); w.className='oh-wrap'; card.insertBefore(w, $(SEL.grid, card)); }
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

  function syncHeights(){
    if (window.matchMedia('(max-width: 960px)').matches){
      var oc=document.getElementById('ownedCard'); if(oc) oc.style.height='';
      var og=document.getElementById('ownedGrid'); if(og) og.style.maxHeight='';
      return;
    }
    var left=document.querySelectorAll('.page-grid > .pg-card')[0];
    var right=document.getElementById('ownedCard'); if(!left||!right) return;
    right.style.height=left.offsetHeight+'px';
    var header=right.querySelector('.oh-wrap'); var headerH=header?header.offsetHeight+10:0;
    var pad=20; var maxH=left.offsetHeight-headerH-pad;
    var grid=document.getElementById('ownedGrid'); if(grid) grid.style.maxHeight=Math.max(160,maxH)+'px';
  }
  window.addEventListener('resize', function(){ setTimeout(syncHeights,60); });

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
  function fmtMeta(it){ return (it.staked ? 'Staked' : 'Not staked') + ' • Owned by You'; }
  function wireActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            await stakeToken(it.id);
            it.staked = true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
            scope.querySelector('.meta').textContent = fmtMeta(it);
            await refreshKPIs();
          } else if (act==='unstake'){
            await unstakeToken(it.id);
            it.staked = false; btn.textContent='Stake'; btn.setAttribute('data-act','stake');
            scope.querySelector('.meta').textContent = fmtMeta(it);
            await refreshKPIs();
          }
        }catch(e){ console.log('[owned] action failed', e); }
      });
    });
  }
  function etherscanToken(id){
    return etherscanBase('token') + (C.COLLECTION_ADDRESS || NFT_ADDR_RAW) + '?a=' + id;
  }
  function renderCards(){
    var root = $('#ownedGrid'); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(); syncHeights(); return; }
    for (var i=0;i<items.length;i++){
      var it = items[i];
      var card=document.createElement('article'); card.className='frog-card'; card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked?'unstake':'stake')+'">'+(it.staked?'Unstake':'Stake')+'</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
      wireActions(card, it);
    }
    var more = $('#ownedMore');
    if (more){
      more.style.display = cont ? 'block' : 'none';
      more.textContent = 'Load more';
      more.onclick = loadMore;
    }
    renderHeader(); syncHeights();
  }

  // Data
  var META = new Map();
  async function fetchMeta(id){
    if (META.has(id)) return META.get(id);
    try{
      var r = await fetch(metaFor(id));
      var j = r.ok ? await r.json() : null;
      var attrs = (j && Array.isArray(j.attributes)) ? j.attributes.map(function(a){
        return { key:(a && (a.key||a.trait_type))||'', value:(a && (a.value!=null?a.value:a.trait_value)) };
      }) : [];
      var out = { id:id, attrs:attrs }; META.set(id,out); return out;
    }catch(e){ var out2={ id:id, attrs:[] }; META.set(id,out2); return out2; }
  }

  function tokensApiUser(a){ return RESV_HOST + '/users/' + a + '/tokens/v8'; }
  async function fetchOwnedIdsPage(a){
    if (!NFT_ADDR_RAW) return [];
    try{
      var qs = new URLSearchParams({ collection: NFT_ADDR_RAW, limit:String(PAGE), includeTopBid:'false', includeAttributes:'false' });
      if (cont) qs.set('continuation', cont);
      var hdr = { accept:'application/json' }; if (API_KEY) hdr['x-api-key'] = API_KEY;
      var r = await fetch(tokensApiUser(a)+'?'+qs.toString(), { headers: hdr });
      if (!r.ok) throw 0;
      var data = await r.json();
      var ids = (data.tokens||[]).map(function(x){ return Number(x && x.token && x.token.tokenId); }).filter(Number.isFinite);
      cont = data.continuation || null;
      return ids;
    }catch(e){ cont=null; return []; }
  }

  async function refreshKPIs(a){
    try{
      var addr = a || (await getAddress());
      var raw = await availableRewards(addr);
      rewards = formatToken(raw);
    }catch(e){ rewards='—'; }
    renderHeader();
  }

  async function hydrate(ids, ranks){
    var arr=[], i, id;
    for (i=0;i<ids.length;i++){
      id = ids[i];
      var m = await fetchMeta(id);
      arr.push({ id:id, attrs:m.attrs, staked: idsStaked.indexOf(id)>-1, rank:ranks[String(id)] });
    }
    return arr;
  }

  async function loadFirst(addr){
    var ranks = await ensureRanks();
    var ownedIds = await fetchOwnedIdsPage(addr);
    idsStaked = await getUserStakedTokens(addr);
    var set = new Set(ownedIds); for (var i=0;i<idsStaked.length;i++) set.add(idsStaked[i]);
    items = await hydrate(Array.from(set), ranks);
    renderCards();
    await refreshKPIs(addr);
    attachObserver();
  }

  async function loadMore(){
    var ranks = await ensureRanks();
    var addr = await getAddress(); if (!addr) return;
    var more = await fetchOwnedIdsPage(addr);
    var add = more.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
    var extra = await hydrate(add, ranks);
    items = items.concat(extra);
    renderCards();
  }

  function attachObserver(){
    var root = $('#ownedGrid'); if (!root || !cont) return;
    var sentinel = document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
    var io = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      io.disconnect(); loadMore();
    }, { root:root, rootMargin:'140px', threshold:0.01 });
    io.observe(sentinel);
  }

  async function init(){
    // Remove legacy info grid if present
    document.querySelectorAll('#ownedCard .info-grid-2').forEach(function(n){ n.remove(); });

    var btn = $('#ownedConnectBtn');
    if (btn){
      btn.addEventListener('mouseenter', function(){ btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function(){ btn.classList.remove('hover'); });
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await connect(); if (!a) return;
          btn.textContent = shorten(a);
          $('#ownedGrid').innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirst(a);
        } finally { btn.disabled=false; }
      });
    }

    var a0 = await getAddress();
    if (a0){
      if (btn) btn.textContent = shorten(a0);
      $('#ownedGrid').innerHTML = '<div class="pg-muted">Loading…</div>';
      await loadFirst(a0);
    } else {
      $('#ownedGrid').innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    }

    setTimeout(syncHeights, 60);
  }

  return { init:init };
})();

/* -------------------------------------------------------
   Page boot
------------------------------------------------------- */
window.FF_loadRecentStakes = function(){ POND.init(); };
window.FF_initOwnedPanel  = function(){ OWNED.init(); };

})(); // IIFE end
