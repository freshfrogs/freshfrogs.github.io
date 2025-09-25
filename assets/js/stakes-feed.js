// assets/js/stakes-feed.js
// Efficient, windowed activity loader for The Pond.
// Shows stake/unstake (NFT Transfer to/from controller).
// Optionally shows claim if controller has RewardsClaimed(address,uint256) event.
// Prevents crashes by (a) small block windows, (b) deduped block timestamp fetch with capped concurrency.

(function(FF, CFG){
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var UL_SEL   = '#recentStakes';
  var CTRL     = (C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '').toLowerCase();
  var BLOCK_WIN = Number(C.ACTIVITY_BLOCK_WINDOW || 1500);
  var MAX_ROWS  = 250; // DOM safety
  var TIME_CONCURRENCY = 4; // at most 4 parallel getBlock requests

  var WEB3 = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
  if (!WEB3) { console.warn('[pond] web3 missing'); }

  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function etherscanTx(hash){
    var chain = Number(C.CHAIN_ID || 1);
    var base = chain===1 ? 'https://etherscan.io/tx/' :
               chain===11155111 ? 'https://sepolia.etherscan.io/tx/' :
               chain===5 ? 'https://goerli.etherscan.io/tx/' : 'https://etherscan.io/tx/';
    return base + hash;
  }
  function etherscanAddr(a){
    var chain = Number(C.CHAIN_ID || 1);
    var base = chain===1 ? 'https://etherscan.io/address/' :
               chain===11155111 ? 'https://sepolia.etherscan.io/address/' :
               chain===5 ? 'https://goerli.etherscan.io/address/' : 'https://etherscan.io/address/';
    return base + a;
  }

  // KPI header hooks
  function setKPIs(){
    var a = $('#stakedController');
    if (a && CTRL){ a.textContent = shorten(CTRL); a.href = etherscanAddr(CTRL); }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  }

  // Row template
  function rowHTML(e){
    var title = (e.kind==='stake' ? 'Staked' : (e.kind==='unstake' ? 'Unstaked' : 'Claimed'));
    var when = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var img = (C.SOURCE_PATH||'') + '/frog/' + (e.id || 0) + '.png';
    var meta = e.kind==='claim'
      ? (shorten(e.user) + ' claimed ' + e.amountPretty)
      : (shorten(e.from) + ' → ' + shorten(e.to));
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        (e.id ? '<img class="thumb64" src="'+img+'" alt="'+e.id+'">' : '<div class="thumb64" style="display:flex;align-items:center;justify-content:center">💰</div>')+
        '<div><div><b>'+title+'</b>'+(e.id?(' Frog #'+e.id):'')+'</div>'+
        '<div class="pg-muted">'+when+' • '+meta+'</div></div>'+
      '</li>'
    );
  }

  // State for windowing
  var st = { from:null, to:null, busy:false, done:false };
  var timeCache = new Map();
  async function getBlockTime(blockNumber){
    if (!WEB3?.eth) return null;
    if (timeCache.has(blockNumber)) return timeCache.get(blockNumber);
    var t = (await WEB3.eth.getBlock(blockNumber))?.timestamp || null;
    timeCache.set(blockNumber, t);
    return t;
  }

  // limited concurrency map for timestamps
  async function stampEvents(events){
    // Deduplicate blocks
    var blocks = Array.from(new Set(events.map(e=>e.blockNumber)));
    // chunk into small groups
    var i=0;
    async function worker(){
      while(i<blocks.length){
        var b = blocks[i++]; await getBlockTime(b);
      }
    }
    var workers = []; for (var k=0;k<Math.min(TIME_CONCURRENCY, blocks.length); k++) workers.push(worker());
    await Promise.all(workers);
    for (var j=0;j<events.length;j++){
      events[j].time = timeCache.get(events[j].blockNumber) || null;
    }
    return events;
  }

  async function loadWindow(listEl){
    if (st.busy || st.done) return;
    st.busy = true;
    try{
      if (!WEB3?.eth || !window.collection){ st.done = true; return; }
      var latest = await WEB3.eth.getBlockNumber();
      if (st.from==null){
        st.to   = latest;
        st.from = Math.max(0, st.to - BLOCK_WIN);
      } else {
        st.to   = st.from - 1;
        if (st.to <= 0){ st.done=true; return; }
        st.from = Math.max(0, st.to - BLOCK_WIN);
      }

      // get NFT transfer events to/from controller
      var toCtrl   = await window.collection.getPastEvents('Transfer', { filter:{ to: CTRL },   fromBlock: st.from, toBlock: st.to });
      var fromCtrl = await window.collection.getPastEvents('Transfer', { filter:{ from: CTRL }, fromBlock: st.from, toBlock: st.to });

      var rows = [];
      for (var i=0;i<toCtrl.length;i++){
        var ev = toCtrl[i];
        rows.push({ kind:'stake', id:Number(ev.returnValues.tokenId), from:ev.returnValues.from, to:ev.returnValues.to, tx:ev.transactionHash, blockNumber:ev.blockNumber });
      }
      for (var j=0;j<fromCtrl.length;j++){
        var ev2 = fromCtrl[j];
        rows.push({ kind:'unstake', id:Number(ev2.returnValues.tokenId), from:ev2.returnValues.from, to:ev2.returnValues.to, tx:ev2.transactionHash, blockNumber:ev2.blockNumber });
      }

      // OPTIONAL: claims if controller has a RewardsClaimed event
      try{
        if (window.controller?.getPastEvents){
          var claims = await window.controller.getPastEvents('RewardsClaimed', { fromBlock: st.from, toBlock: st.to });
          for (var c=0;c<claims.length;c++){
            var ce = claims[c]; // expect returnValues: user, amount
            rows.push({ kind:'claim', id:null, user:ce.returnValues.user, amount:ce.returnValues.amount, amountPretty:ce.returnValues.amount, tx:ce.transactionHash, blockNumber:ce.blockNumber });
          }
        }
      }catch(e){ /* harmless if no event */ }

      if (rows.length){
        await stampEvents(rows);
        rows.sort(function(a,b){ return b.blockNumber - a.blockNumber; });

        var frag = document.createDocumentFragment();
        for (var r=0;r<rows.length;r++){
          var li = document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(rows[r]);
          (function(tx){ li.addEventListener('click', function(){ window.open(etherscanTx(tx), '_blank'); }); })(rows[r].tx);
          frag.appendChild(li);
        }
        listEl.appendChild(frag);

        // cap DOM
        var allLis = listEl.querySelectorAll('li.row');
        if (allLis.length > MAX_ROWS){
          var excess = allLis.length - MAX_ROWS;
          for (var x=0;x<excess;x++){ listEl.removeChild(allLis[x]); }
        }
      }
    }catch(e){
      console.warn('[pond] window load failed', e);
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
    // prime a couple of windows
    loadWindow(listEl).then(function(){ setTimeout(function(){ loadWindow(listEl); }, 60); });
  }

  function init(){
    setKPIs();
    var ul = document.querySelector(UL_SEL);
    if (!ul) return;
    ul.innerHTML = '';
    attachScroll(ul);
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
