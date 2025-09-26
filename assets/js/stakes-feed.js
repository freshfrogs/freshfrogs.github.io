// assets/js/stakes-feed.js
// The Pond (recent activity) — Reservoir-only (no wallet)
// • Shows stake (to controller) and unstake (from controller) transfer events
// • Endpoint: /users/activity/v6?users=<controller>&types=transfer&collections=<collection>&limit=20
// • Classic row look; click -> Etherscan; continuation on scroll

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
  function escTx(h){
    var base = CHAIN===1 ? 'https://etherscan.io/tx/' :
               CHAIN===11155111 ? 'https://sepolia.etherscan.io/tx/' :
               CHAIN===5 ? 'https://goerli.etherscan.io/tx/' : 'https://etherscan.io/tx/';
    return base + h;
  }
  function setKPIs(){
    var a = $('#stakedController');
    if (a && CTRL){
      var base = CHAIN===1 ? 'https://etherscan.io/address/' :
                 CHAIN===11155111 ? 'https://sepolia.etherscan.io/address/' :
                 CHAIN===5 ? 'https://goerli.etherscan.io/address/' : 'https://etherscan.io/address/';
      a.textContent = shorten(CTRL);
      a.href = base + C.CONTROLLER_ADDRESS;
    }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  }

  // Classic look
  function rowHTML(e){
    var title = e.kind==='stake' ? 'Staked' : 'Unstaked';
    var when  = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var img   = (C.SOURCE_PATH||'') + '/frog/' + (e.id || 0) + '.png';
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        '<img class="thumb64" src="'+img+'" alt="'+e.id+'">'+
        '<div><div><b>'+title+'</b> Frog #'+e.id+'</div>'+
        '<div class="pg-muted">'+when+' • '+shorten(e.from)+' → '+shorten(e.to)+'</div></div>'+
      '</li>'
    );
  }

  async function fetchPage(){
    if (!KEY) throw new Error('Missing FF_CFG.FROG_API_KEY');

    var u = new URL(HOST + '/users/activity/v6');
    u.searchParams.set('users', C.CONTROLLER_ADDRESS);   // controller-centric activity
    u.searchParams.set('types', 'transfer');             // we only want transfers
    if (C.COLLECTION_ADDRESS) u.searchParams.set('collections', C.COLLECTION_ADDRESS); // just our frogs
    u.searchParams.set('limit', '20');                   // page size
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
      // Defensively read fields across schema variants
      var token   = r.token || {};
      var id      = Number(token.tokenId || r.tokenId);
      var from    = (r.fromAddress || r.from || '').toLowerCase();
      var to      = (r.toAddress   || r.to   || '').toLowerCase();
      var ts      = Number(r.timestamp || (r.createdAt && Math.floor(new Date(r.createdAt).getTime()/1000))) || null;
      var tx      = r.txHash || r.transactionHash || '';

      if (!Number.isFinite(id) || !from || !to) continue;

      // Restrict to our collection if API returns mixed collections
      var contract = (token.contract || r.contract || '').toLowerCase();
      if (COLL && contract && contract !== COLL) continue;

      var kind = (to===CTRL) ? 'stake' : (from===CTRL ? 'unstake' : null);
      if (!kind) continue;

      out.push({ kind, id, from:r.fromAddress||r.from||'', to:r.toAddress||r.to||'', time:ts, tx:tx });
    }
    // newest first
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
    loadNext(listEl).then(function(){ setTimeout(function(){ loadNext(listEl); }, 100); });
  }

  function init(){
    setKPIs();
    var ul = $(UL); if (!ul) return;
    ul.innerHTML = ''; // no "loading..." line, matches classic look
    done = false; busy = false; continuation = null;
    attachScroll(ul);
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
