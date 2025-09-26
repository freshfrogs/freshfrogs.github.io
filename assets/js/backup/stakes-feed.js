// assets/js/stakes-feed.js
// Recent activity: stake (to controller), unstake (from controller), optional claim (RewardsClaimed).
// Windowed block scanning + capped timestamp lookups to prevent crashes.

(function(FF, CFG){
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var UL_SEL   = '#recentStakes';
  var CTRL     = (C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '').toLowerCase();
  var BLOCK_WIN = Number(C.ACTIVITY_BLOCK_WINDOW || 1500);
  var MAX_ROWS  = 250;
  var TIME_CONC = 4;

  var WEB3 = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);

  // Build a minimal collection contract if not present (Transfer event only)
  var ERC721_TRANSFER_ABI = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"}];
  (function ensureCollectionForEvents(){
    if (!window.collection && WEB3 && (C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS)){
      try {
        window.collection = new WEB3.eth.Contract(ERC721_TRANSFER_ABI, (C.COLLECTION_ADDRESS||window.COLLECTION_ADDRESS));
      } catch(e){ console.warn('[pond] could not init temp collection for events', e); }
    }
  })();

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

  function setKPIs(){
    var a = $('#stakedController');
    if (a && CTRL){ a.textContent = shorten(CTRL); a.href = etherscanAddr(CTRL); }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  }

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

  var st = { from:null, to:null, busy:false, done:false };
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

  async function loadWindow(listEl){
    if (st.busy || st.done) return;
    st.busy = true;
    try{
      if (!WEB3 || !WEB3.eth || !window.collection){ st.done=true; return; }
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

      // Optional: RewardsClaimed event on controller
      try{
        if (window.controller && window.controller.getPastEvents){
          var claims = await window.controller.getPastEvents('RewardsClaimed', { fromBlock: st.from, toBlock: st.to });
          for (i=0;i<claims.length;i++){
            var ce = claims[i]; rows.push({ kind:'claim', user:ce.returnValues.user, amount:ce.returnValues.amount, amountPretty:ce.returnValues.amount, tx:ce.transactionHash, blockNumber:ce.blockNumber });
          }
        }
      }catch(e){}

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
      }
    }catch(e){
      console.warn('[pond] load window failed', e);
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
