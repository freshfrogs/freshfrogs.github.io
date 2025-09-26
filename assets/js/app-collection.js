// assets/js/stakes-feed.js
// Recent activity (The Pond): stake (to controller), unstake (from controller), optional claim (RewardsClaimed).
// Windowed block scanning + capped timestamp lookups. Resilient to missing injected web3.

(function(FF, CFG){
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var UL_SEL   = '#recentStakes';
  var CTRL     = (C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '').toLowerCase();
  var COLL     = (C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS || '');
  var CHAIN_ID = Number(C.CHAIN_ID || 1);

  // scanning behavior
  var BLOCK_WIN = Number(C.ACTIVITY_BLOCK_WINDOW || 1500);
  var MAX_ROWS  = Number(C.ACTIVITY_MAX_ROWS || 250);
  var TIME_CONC = Number(C.ACTIVITY_TS_CONCURRENCY || 4);

  // ---------- Utilities ----------
  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function etherscanTx(hash){
    var base = CHAIN_ID===1 ? 'https://etherscan.io/tx/' :
               CHAIN_ID===11155111 ? 'https://sepolia.etherscan.io/tx/' :
               CHAIN_ID===5 ? 'https://goerli.etherscan.io/tx/' : 'https://etherscan.io/tx/';
    return base + hash;
  }
  function etherscanAddr(a){
    var base = CHAIN_ID===1 ? 'https://etherscan.io/address/' :
               CHAIN_ID===11155111 ? 'https://sepolia.etherscan.io/address/' :
               CHAIN_ID===5 ? 'https://goerli.etherscan.io/address/' : 'https://etherscan.io/address/';
    return base + a;
  }
  function defaultRpcFor(id){
    if (id===1) return 'https://cloudflare-eth.com';
    if (id===11155111) return 'https://rpc.sepolia.org';
    if (id===5) return 'https://rpc.ankr.com/eth_goerli';
    return 'https://cloudflare-eth.com';
  }

  // ---------- Web3 provider (resilient) ----------
  // Requires the Web3 library on the page (e.g., web3.min.js). We’ll gracefully fall back to public RPC.
  var WEB3 = null;
  (function initWeb3(){
    try{
      if (window.Web3 && window.ethereum){
        WEB3 = new window.Web3(window.ethereum);            // EIP-1193 wallet
        window.web3 = WEB3;
        return;
      }
      if (window.Web3){
        var rpc = C.RPC_URL || defaultRpcFor(CHAIN_ID);
        WEB3 = new window.Web3(new window.Web3.providers.HttpProvider(rpc, { keepAlive:true }));
        window.web3 = WEB3;
        return;
      }
      // No Web3 library loaded — we can’t scan, but do NOT crash:
      console.warn('[pond] Web3 library not found; please include web3.min.js or set FF_CFG.RPC_URL and include Web3.');
    }catch(e){
      console.warn('[pond] initWeb3 failed', e);
      WEB3 = null;
    }
  })();

  // Build a minimal collection contract for Transfer events
  var ERC721_TRANSFER_ABI = [
    {"anonymous":false,"inputs":[
      {"indexed":true,"internalType":"address","name":"from","type":"address"},
      {"indexed":true,"internalType":"address","name":"to","type":"address"},
      {"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],
     "name":"Transfer","type":"event"}
  ];
  // Optional: RewardsClaimed event on controller
  var REWARDS_EVENT_ABI = [
    {"anonymous":false,"inputs":[
      {"indexed":true,"internalType":"address","name":"user","type":"address"},
      {"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],
     "name":"RewardsClaimed","type":"event"}
  ];

  function ensureContracts(){
    try{
      if (WEB3 && !window.collection && COLL){
        window.collection = new WEB3.eth.Contract(ERC721_TRANSFER_ABI, COLL);
      }
      if (WEB3 && !window.controller && CTRL){
        window.controller = new WEB3.eth.Contract(REWARDS_EVENT_ABI, CTRL);
      }
    }catch(e){ console.warn('[pond] ensureContracts failed', e); }
  }
  ensureContracts();

  // ---------- KPIs ----------
  function setKPIs(){
    var a = $('#stakedController');
    if (a && CTRL){ a.textContent = shorten(CTRL); a.href = etherscanAddr(CTRL); }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  }

  // ---------- Row rendering (classic look) ----------
  function rowHTML(e){
    var title = e.kind==='stake' ? 'Staked' : (e.kind==='unstake' ? 'Unstaked' : 'Claimed');
    var when = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var img = (C.SOURCE_PATH||'') + '/frog/' + (e.id || 0) + '.png';
    var meta = e.kind==='claim'
      ? (shorten(e.user)+' claimed '+(e.amountPretty||e.amount))
      : (shorten(e.from)+' → '+shorten(e.to));
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        (e.id ? '<img class="thumb64" src="'+img+'" alt="'+e.id+'">' : '<div class="thumb64" style="display:flex;align-items:center;justify-content:center">💰</div>')+
        '<div><div><b>'+title+'</b>'+(e.id?(' Frog #'+e.id):'')+'</div>'+
        '<div class="pg-muted">'+when+' • '+meta+'</div></div>'+
      '</li>'
    );
  }

  // ---------- Time stamping ----------
  var timeCache = new Map();
  async function getBlockTime(bn){
    if (!WEB3 || !WEB3.eth) return null;
    if (timeCache.has(bn)) return timeCache.get(bn);
    var b = await WEB3.eth.getBlock(bn).catch(function(){ return null; });
    var t = b && b.timestamp || null;
    timeCache.set(bn, t);
    return t;
  }
  async function stampEvents(events){
    var blocks = []; var i;
    for (i=0;i<events.length;i++){ var bn=events[i].blockNumber; if (blocks.indexOf(bn)===-1) blocks.push(bn); }
    var idx=0;
    async function worker(){
      while(idx<blocks.length){
        var bn = blocks[idx++]; await getBlockTime(bn);
      }
    }
    var workers=[]; var n = Math.min(TIME_CONC, blocks.length);
    for (i=0;i<n;i++) workers.push(worker());
    await Promise.all(workers);
    for (i=0;i<events.length;i++){ events[i].time = timeCache.get(events[i].blockNumber) || null; }
    return events;
  }

  // ---------- Loader state ----------
  var st = { from:null, to:null, busy:false, done:false };

  async function loadWindow(listEl){
    if (st.busy || st.done) return;
    st.busy = true;
    try{
      if (!WEB3 || !WEB3.eth){
        if (!listEl.querySelector('.pg-muted')){
          var li=document.createElement('li'); li.className='row';
          li.innerHTML = '<div class="pg-muted">No RPC/Web3 available. Include Web3 and set FF_CFG.RPC_URL if needed.</div>';
          listEl.appendChild(li);
        }
        st.done = true; return;
      }
      ensureContracts();
      if (!window.collection){
        var li2=document.createElement('li'); li2.className='row';
        li2.innerHTML='<div class="pg-muted">Missing collection address.</div>'; listEl.appendChild(li2);
        st.done=true; return;
      }

      var latest = await WEB3.eth.getBlockNumber();
      if (st.from==null){ st.to = latest; st.from = Math.max(0, st.to - BLOCK_WIN); }
      else { st.to = st.from - 1; if (st.to <= 0){ st.done=true; return; } st.from = Math.max(0, st.to - BLOCK_WIN); }

      var toCtrl   = await window.collection.getPastEvents('Transfer', { filter:{ to: CTRL },   fromBlock: st.from, toBlock: st.to });
      var fromCtrl = await window.collection.getPastEvents('Transfer', { filter:{ from: CTRL }, fromBlock: st.from, toBlock: st.to });

      var rows = [], i;
      for (i=0;i<toCtrl.length;i++){
        var ev = toCtrl[i];
        rows.push({ kind:'stake',   id:Number(ev.returnValues.tokenId), from:ev.returnValues.from, to:ev.returnValues.to, tx:ev.transactionHash, blockNumber:ev.blockNumber });
      }
      for (i=0;i<fromCtrl.length;i++){
        var ev2 = fromCtrl[i];
        rows.push({ kind:'unstake', id:Number(ev2.returnValues.tokenId), from:ev2.returnValues.from, to:ev2.returnValues.to, tx:ev2.transactionHash, blockNumber:ev2.blockNumber });
      }

      // Optional: RewardsClaimed events on controller (if ABI/address available)
      try{
        if (window.controller && window.controller.getPastEvents){
          var claims = await window.controller.getPastEvents('RewardsClaimed', { fromBlock: st.from, toBlock: st.to });
          for (i=0;i<claims.length;i++){
            var ce = claims[i];
            rows.push({
              kind:'claim',
              user:ce.returnValues.user,
              amount:ce.returnValues.amount,
              amountPretty:ce.returnValues.amount,
              tx:ce.transactionHash,
              blockNumber:ce.blockNumber
            });
          }
        }
      }catch(e){ /* non-fatal */ }

      if (rows.length){
        await stampEvents(rows);
        rows.sort(function(a,b){ return b.blockNumber - a.blockNumber; });

        var frag = document.createDocumentFragment();
        for (i=0;i<rows.length;i++){
          var li=document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(rows[i]);
          (function(tx){ li.addEventListener('click', function(){ window.open(etherscanTx(tx), '_blank'); }); })(rows[i].tx);
          frag.appendChild(li);
        }
        listEl.appendChild(frag);

        // prune DOM
        var items = listEl.querySelectorAll('li.row');
        if (items.length > MAX_ROWS){
          var excess = items.length - MAX_ROWS;
          for (i=0;i<excess;i++) listEl.removeChild(items[i]);
        }
      } else {
        // If first window had nothing, keep scanning backward on next scroll
      }
    }catch(e){
      console.warn('[pond] load window failed', e);
      // Fail softly but try not to loop forever
      st.done = true;
    }finally{
      st.busy = false;
    }
  }

  function attachScroll(listEl){
    listEl.classList.add('scrolling');
    function onScroll(){
      if (st.busy || st.done) return;
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80) loadWindow(listEl);
    }
    listEl.addEventListener('scroll', onScroll);
    // Kick off two windows to fill the viewport
    loadWindow(listEl).then(function(){ setTimeout(function(){ loadWindow(listEl); }, 80); });
  }

  function init(){
    setKPIs();
    var ul = document.querySelector(UL_SEL);
    if (!ul) return;
    ul.innerHTML = ''; // match your original (no "loading..." row)
    attachScroll(ul);
  }

  // Export init the same as your original
  window.FF_loadRecentStakes = init;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
