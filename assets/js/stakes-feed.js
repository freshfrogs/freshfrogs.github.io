// assets/js/stakes-feed.js
// The Pond — Reservoir-only recent activity (+ total staked via ERC721.balanceOf)
// Classic row style; 20 per page; continuation on scroll; no wallet needed.

(function(FF, CFG){
  'use strict';

  var C     = window.FF_CFG || CFG || {};
  var UL    = '#recentStakes';
  var HOST  = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var KEY   = C.FROG_API_KEY || '';
  var CTRL  = (C.CONTROLLER_ADDRESS || '').toLowerCase();
  var COLL  = (C.COLLECTION_ADDRESS || '').toLowerCase();
  var CHAIN = Number(C.CHAIN_ID || 1);

  var busy=false, done=false, continuation=null;

  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function etherscan(kind){
    if (CHAIN===1) return 'https://etherscan.io/'+kind+'/';
    if (CHAIN===11155111) return 'https://sepolia.etherscan.io/'+kind+'/';
    if (CHAIN===5) return 'https://goerli.etherscan.io/'+kind+'/';
    return 'https://etherscan.io/'+kind+'/';
  }
  function escTx(h){ return etherscan('tx') + h; }
  function age(ts){
    if (!ts) return '—';
    var diff = Math.max(0, (Date.now()/1000) - ts);
    var d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600);
    if (d>0) return d+'d ago';
    if (h>0) return h+'h ago';
    var m = Math.floor((diff%3600)/60);
    return m+'m ago';
  }

  // KPIs — controller link + rewards symbol; total staked via balanceOf(controller)
  async function setKPIs(){
    // Controller link
    var a = $('#stakedController');
    if (a && CTRL){
      a.textContent = shorten(CTRL);
      a.href = etherscan('address') + C.CONTROLLER_ADDRESS;
    }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');

    // Total Frogs Staked = ERC721.balanceOf(controller)
    try{
      if (!window.Web3 || !C.COLLECTION_ADDRESS || !C.CONTROLLER_ADDRESS) return;
      var provider = window.ethereum
        ? window.ethereum
        : (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL, { keepAlive:true }) : null);
      if (!provider) return;
      var web3 = new window.Web3(provider);
      var ABI  = [{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}];
      var erc721 = new web3.eth.Contract(ABI, C.COLLECTION_ADDRESS);
      var bal = await erc721.methods.balanceOf(C.CONTROLLER_ADDRESS).call();
      var n = Number(bal||0);
      var el = $('#stakedTotal'); if (el) el.textContent = String(n);
    }catch(e){
      console.warn('[pond] balanceOf failed', e);
    }
  }

  // Classic row look to match your screenshot
  function rowHTML(e){
    var thumb = (C.SOURCE_PATH||'') + '/frog/' + (e.id || 0) + '.png';
    var line1 = (e.kind==='stake'?'Stake':'Unstake') + ' • Frog #' + e.id;
    var line2 = shorten(e.from)+' → '+shorten(e.to)+' • '+age(e.time)+' • '+'Etherscan';
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        '<img class="thumb64" src="'+thumb+'" alt="'+e.id+'">'+
        '<div><div><b>'+line1+'</b></div>'+
        '<div class="pg-muted">'+line2+'</div></div>'+
      '</li>'
    );
  }

  async function fetchPage(){
    if (!KEY) throw new Error('Missing FF_CFG.FROG_API_KEY');

    var u = new URL(HOST + '/users/activity/v6');
    u.searchParams.set('users', C.CONTROLLER_ADDRESS);
    u.searchParams.set('types', 'transfer');
    if (C.COLLECTION_ADDRESS) u.searchParams.set('collections', C.COLLECTION_ADDRESS);
    u.searchParams.set('limit', '20');
    if (continuation) u.searchParams.set('continuation', continuation);

    var res = await fetch(u.toString(), { headers:{ accept:'application/json', 'x-api-key': KEY }});
    if (!res.ok){
      var txt = await res.text().catch(function(){ return ''; });
      throw new Error('Reservoir activity '+res.status+' '+txt);
    }
    var j = await res.json();
    continuation = j.continuation || null;

    var out=[], rows = Array.isArray(j.activities) ? j.activities : [];
    for (var i=0;i<rows.length;i++){
      var r = rows[i] || {};
      var token   = r.token || {};
      var id      = Number(token.tokenId || r.tokenId);
      var from    = (r.fromAddress || r.from || '').toLowerCase();
      var to      = (r.toAddress   || r.to   || '').toLowerCase();
      var ts      = Number(r.timestamp || (r.createdAt && Math.floor(new Date(r.createdAt).getTime()/1000))) || null;
      var tx      = r.txHash || r.transactionHash || '';
      if (!Number.isFinite(id) || !from || !to) continue;

      // restrict to our contract
      var contract = (token.contract || r.contract || '').toLowerCase();
      if (COLL && contract && contract !== COLL) continue;

      var kind = (to===CTRL) ? 'stake' : (from===CTRL ? 'unstake' : null);
      if (!kind) continue;

      out.push({ kind, id, from:r.fromAddress||r.from||'', to:r.toAddress||r.to||'', time:ts, tx:tx });
    }
    out.sort(function(a,b){ return (b.time||0)-(a.time||0); });
    return out;
  }

  async function loadNext(listEl){
    if (busy || done) return; busy=true;
    try{
      var rows = await fetchPage();
      if (!rows.length && !continuation){
        if (!listEl.children.length){
          var li=document.createElement('li'); li.className='row';
          li.innerHTML='<div class="pg-muted">No recent activity.</div>'; listEl.appendChild(li);
        }
        done = true; return;
      }
      var frag=document.createDocumentFragment();
      rows.forEach(function(r){
        var li=document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(r);
        if (r.tx){ li.addEventListener('click', function(){ window.open(escTx(r.tx), '_blank'); }); }
        frag.appendChild(li);
      });
      listEl.appendChild(frag);
      if (!continuation) done = true;
    }catch(e){
      console.warn('[pond] load failed', e);
      if (!listEl.children.length){
        var li=document.createElement('li'); li.className='row';
        li.innerHTML='<div class="pg-muted">Couldn’t load activity.</div>'; listEl.appendChild(li);
      }
      done = true;
    }finally{ busy=false; }
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
    setKPIs();
    var ul = $(UL); if (!ul) return;
    ul.innerHTML = '';
    done = false; busy = false; continuation = null;
    attachScroll(ul);
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
