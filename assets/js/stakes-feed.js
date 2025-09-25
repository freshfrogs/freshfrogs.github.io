// assets/js/stakes-feed.js
// The Pond: Recent staking activity, loaded from chain Transfer events to/from controller.
// - Scroll to load more (moves backward by block windows)
// - Sets KPIs: stakedTotal, stakedController link, pondRewardsSymbol

(function(FF, CFG){
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var REWARD_SYMBOL = C.REWARD_TOKEN_SYMBOL || '$FLYZ';
  var UL_ID = '#recentStakes';
  var WINDOW_BLOCKS = Number(C.ACTIVITY_BLOCK_WINDOW || 2500);
  var MAX_ROWS = 200; // safety cap in DOM

  // Web3 + contracts assumed present (same as owned panel)
  var WEB3 = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
  function hasWeb3(){ return !!(WEB3 && WEB3.eth); }

  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function etherscanTx(hash){
    var chain = Number(C.CHAIN_ID || 1);
    var base =
      chain===1?'https://etherscan.io/tx/':
      chain===11155111?'https://sepolia.etherscan.io/tx/':
      chain===5?'https://goerli.etherscan.io/tx/':'https://etherscan.io/tx/';
    return base + hash;
  }
  function etherscanAddr(a){
    var chain = Number(C.CHAIN_ID || 1);
    var base =
      chain===1?'https://etherscan.io/address/':
      chain===11155111?'https://sepolia.etherscan.io/address/':
      chain===5?'https://goerli.etherscan.io/address/':'https://etherscan.io/address/';
    return base + a;
  }

  function setKPIs(){
    var ctrl = C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '';
    var a = $('#stakedController'); if (a){ a.textContent = shorten(ctrl); a.href = etherscanAddr(ctrl); }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = REWARD_SYMBOL;
  }

  function rowHTML(e){
    var kind = (e.kind==='stake'?'Staked':'Unstaked');
    var when = new Date(e.time*1000).toLocaleString();
    return (
      '<li class="row" onclick="window.open(\''+etherscanTx(e.tx)+'\',\'_blank\')">'+
        '<img class="thumb64" src="'+( (C.SOURCE_PATH||'') + '/frog/'+e.id+'.png')+'" alt="'+e.id+'">'+
        '<div><div><b>'+kind+'</b> Frog #'+e.id+'</div>'+
        '<div class="pg-muted">'+when+' • '+shorten(e.from)+' → '+shorten(e.to)+'</div></div>'+
      '</li>'
    );
  }

  var state = { fromBlock:null, toBlock:null, done:false, busy:false, rows:[] };

  async function loadWindow(listEl){
    if (state.busy || state.done) return;
    state.busy = true;
    try{
      if (!hasWeb3() || !window.collection) throw new Error('web3/collection missing');
      var latest = await WEB3.eth.getBlockNumber();
      if (state.fromBlock==null){
        state.toBlock = latest;
        state.fromBlock = Math.max(0, state.toBlock - WINDOW_BLOCKS);
      } else {
        state.toBlock = state.fromBlock - 1;
        if (state.toBlock <= 0){ state.done=true; return; }
        state.fromBlock = Math.max(0, state.toBlock - WINDOW_BLOCKS);
      }

      var ctrl = C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS;
      var stakes = await window.collection.getPastEvents('Transfer', { filter:{ to: ctrl }, fromBlock: state.fromBlock, toBlock: state.toBlock });
      var unstakes = await window.collection.getPastEvents('Transfer', { filter:{ from: ctrl }, fromBlock: state.fromBlock, toBlock: state.toBlock });

      var all = [];
      var i;
      for (i=0;i<stakes.length;i++){
        var ev = stakes[i];
        all.push({ kind:'stake', id:Number(ev.returnValues.tokenId), from:ev.returnValues.from, to:ev.returnValues.to, tx:ev.transactionHash, time:(await WEB3.eth.getBlock(ev.blockNumber)).timestamp });
      }
      for (i=0;i<unstakes.length;i++){
        var ev2 = unstakes[i];
        all.push({ kind:'unstake', id:Number(ev2.returnValues.tokenId), from:ev2.returnValues.from, to:ev2.returnValues.to, tx:ev2.transactionHash, time:(await WEB3.eth.getBlock(ev2.blockNumber)).timestamp });
      }
      all.sort(function(a,b){ return b.time - a.time; });

      // append to DOM
      var frag = document.createDocumentFragment();
      for (i=0;i<all.length;i++){
        var li = document.createElement('li'); li.className='row'; li.innerHTML = rowHTML(all[i]);
        li.addEventListener('click', function(tx){ return function(){ window.open(etherscanTx(tx), '_blank'); }; }(all[i].tx));
        frag.appendChild(li);
      }
      listEl.appendChild(frag);

      // keep DOM light
      var lis = listEl.querySelectorAll('li.row');
      if (lis.length > MAX_ROWS){
        for (i=0;i<lis.length-MAX_ROWS;i++){ listEl.removeChild(lis[i]); }
      }

      // total staked (rough approximation from map: stakerAddress(tokenId) != 0x0)
      try{
        if (window.controller && window.controller.methods && typeof window.controller.methods.stakers === 'function' && window.FF && window.FF.wallet){
          // (Keeping stakedTotal KPI simple elsewhere; leave as-is if you compute differently)
        }
      }catch(e){}
    }catch(e){
      console.warn('[stakes-feed] window failed:', e);
      state.done = true;
    }finally{
      state.busy = false;
    }
  }

  function attachScroll(listEl){
    listEl.classList.add('scrolling');
    function onScroll(){
      if (state.busy || state.done) return;
      var nearBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 80;
      if (nearBottom) loadWindow(listEl);
    }
    listEl.addEventListener('scroll', onScroll);
    // prime first two windows
    loadWindow(listEl).then(function(){ setTimeout(function(){ loadWindow(listEl); }, 50); });
  }

  function init(){
    setKPIs();
    var ul = document.querySelector(UL_ID);
    if (!ul){ return; }
    ul.innerHTML = ''; // clear placeholder
    attachScroll(ul);
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
