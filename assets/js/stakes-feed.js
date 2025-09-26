// assets/js/stakes-feed.js
// The Pond (recent activity) — Reservoir-only implementation (no wallet required)
// Shows stake/unstake activity where the Fresh Frogs controller is either the sender or receiver.
// Continuation paging (limit=20), classic list look, click row → Etherscan TX.

(function(FF, CFG){
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var UL_SEL = '#recentStakes';
  var HOST   = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var KEY    = C.FROG_API_KEY || '';
  var CTRL   = (C.CONTROLLER_ADDRESS || '').toLowerCase();
  var COLL   = (C.COLLECTION_ADDRESS || '').toLowerCase();
  var CHAIN  = Number(C.CHAIN_ID || 1);

  var continuation = null;
  var busy = false, done = false;

  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function escTx(h){
    var base = CHAIN===1 ? 'https://etherscan.io/tx/' :
               CHAIN===11155111 ? 'https://sepolia.etherscan.io/tx/' :
               CHAIN===5 ? 'https://goerli.etherscan.io/tx/' : 'https://etherscan.io/tx/';
    return base + h;
  }

  function setKPIs(){
    // Controller link & symbol (optional nodes in HTML)
    var a = $('#stakedController'); if (a && CTRL){ a.textContent = shorten(CTRL); a.href = (CHAIN===1?'https://etherscan.io/address/':CHAIN===11155111?'https://sepolia.etherscan.io/address/':CHAIN===5?'https://goerli.etherscan.io/address/':'https://etherscan.io/address/') + C.CONTROLLER_ADDRESS; }
    var sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  }

  // Row template (classic)
  function rowHTML(e){
    var title = e.kind==='stake' ? 'Staked' : 'Unstaked';
    var when = e.time ? new Date(e.time*1000).toLocaleString() : '—';
    var img = (C.SOURCE_PATH||'') + '/frog/' + (e.id || 0) + '.png';
    return (
      '<li class="row" data-kind="'+e.kind+'">'+
        '<img class="thumb64" src="'+img+'" alt="'+e.id+'">'+
        '<div><div><b>'+title+'</b> Frog #'+e.id+'</div>'+
        '<div class="pg-muted">'+when+' • '+shorten(e.from)+' → '+shorten(e.to)+'</div></div>'+
      '</li>'
    );
  }

  async function fetchPage(){
    if (!KEY) throw new Error('Missing Reservoir API key (FF_CFG.FROG_API_KEY)');
    // Using users/activity keeps this walletless; we filter to our collection and classify stake/unstake
    var u = new URL(HOST + '/users/activity/v6');
    u.searchParams.set('users', C.CONTROLLER_ADDRESS);
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
      var id = Number(r.token?.tokenId || r.tokenId);
      if (!Number.isFinite(id)) continue;

      // keep only our collection
      var col = (r.token?.contract || r.collection || r.contract || '').toLowerCase();
      if (COLL && col && col !== COLL) continue;

      var from = (r.fromAddress || r.from || '').toLowerCase();
      var to   = (r.toAddress   || r.to   || '').toLowerCase();
      if (!from || !to) continue;

      // Classify: stake = to===controller; unstake = from===controller
      var kind = to===CTRL ? 'stake' : (from===CTRL ? 'unstake' : null);
      if (!kind) continue;

      var ts = Number(r.timestamp || (r.createdAt && Math.floor(new Date(r.createdAt).getTime()/1000))) || null;
      out.push({ kind, id, from:r.fromAddress||r.from||'', to:r.toAddress||r.to||'', time:ts, tx:r.txHash||r.transactionHash||'' });
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
    var ul = $(UL_SEL); if (!ul) return;
    ul.innerHTML = ''; // classic: no “loading…” row
    attachScroll(ul);
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
