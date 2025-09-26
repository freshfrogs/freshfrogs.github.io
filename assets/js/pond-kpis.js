// assets/js/pond-kpis.js — Total Staked via Reservoir only (no wallet/web3)
// Uses tokens/v10 (exact, paginated) then owners/v2 (fast, aggregate) as fallback.
// Also: sets label "🌿 Total Staked", fills Controller link, enforces FLYZ link.
(function () {
  'use strict';

  // ---- constants ----
  var FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // ---- helpers ----
  function $(s, p){ return (p||document).querySelector(s); }
  function $all(s, p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function byId(id){ return document.getElementById(id); }
  function shorten(a){ return !a ? '—' : String(a).slice(0,6)+'…'+String(a).slice(-4); }
  function fmtInt(v){
    try{
      if (v && typeof v==='object' && v.toString) v = v.toString();
      if (typeof v==='string'){ if (v.indexOf('.')>-1) v=v.split('.')[0]; return isFinite(+v)?(+v).toLocaleString():v.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
      if (typeof v==='number') return Math.floor(v).toLocaleString();
      return String(v||'—');
    }catch(_){ return String(v||'—'); }
  }

  // ---- config ----
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});

  function getCollection(){
    return (CFG.COLLECTION_ADDRESS || CFG.collectionAddress || '').toLowerCase();
  }
  function getControllers(){
    var many = CFG.CONTROLLER_ADDRESSES || CFG.controllerAddresses;
    var one  = CFG.CONTROLLER_ADDRESS  || CFG.controllerAddress  || readControllerFromLink();
    if (!Array.isArray(many)) many = one ? [one] : [];
    // dedupe + lowercase
    var out = [];
    for (var i=0;i<many.length;i++){
      var a = String(many[i]||'').toLowerCase();
      if (a && out.indexOf(a)===-1) out.push(a);
    }
    return out;
  }
  function readControllerFromLink(){
    var a = byId('stakedController');
    if (a && a.href){
      var m = a.href.match(/0x[a-fA-F0-9]{40}/);
      if (m) return m[0];
    }
    return '';
  }
  function apiHeaders(){
    var h = { accept: '*/*' };
    var key = (CFG.FROG_API_KEY || window.RESERVOIR_API_KEY);
    if (key) h['x-api-key'] = key; // optional
    return h;
  }

  // ---- UI priming ----
  function primeUI(){
    var firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

    var blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // Rewards link
    var third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third){
      var lab = third.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      var iv = third.querySelector('.iv');
      if (iv){
        var a = iv.querySelector('#pondRewardsLink');
        if (!a){
          a = document.createElement('a');
          a.id = 'pondRewardsLink';
          a.target = '_blank';
          a.rel = 'noopener';
          a.href = FLYZ_URL;
          a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          iv.textContent = '';
          iv.appendChild(a);
        }else{
          a.href = FLYZ_URL;
          a.target = '_blank';
          a.rel = 'noopener';
          if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
        }
      }
    }

    // Remove Notes if present
    var blocks = $all('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].parentNode.removeChild(blocks[3]);
  }

  function fillControllerBox(){
    var a = byId('stakedController');
    var list = getControllers();
    var addr = list[0];
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // ---- Reservoir fetchers ----
  // Exact but slower: tokens/v10 paging across all controllers
  function tokensCount(){
    var collection = getCollection();
    var controllers = getControllers();
    if (!collection || !controllers.length) return Promise.reject(new Error('missing addresses'));

    var headers = apiHeaders();
    function fetchOneController(c){
      return new Promise(function(resolve, reject){
        var total = 0;
        var continuation = null;
        var guard = 0;
        function loop(){
          var base = 'https://api.reservoir.tools/tokens/v10?collection='+collection+'&owner='+c+'&limit=1000&includeTopBid=false';
          var url  = continuation ? (base + '&continuation=' + encodeURIComponent(continuation)) : base;
          fetch(url, { method:'GET', headers: headers }).then(function(res){
            if (!res.ok) throw new Error('tokens/v10 ' + res.status);
            return res.json();
          }).then(function(j){
            var items = j.tokens || [];
            total += items.length;
            continuation = j.continuation || null;
            guard++;
            if (continuation && guard < 10) loop();
            else resolve(total);
          }).catch(reject);
        }
        loop();
      });
    }

    var promises = [];
    for (var i=0;i<controllers.length;i++) promises.push(fetchOneController(controllers[i]));
    return Promise.all(promises).then(function(parts){
      var sum = 0; for (var k=0;k<parts.length;k++) sum += (parts[k]||0);
      return sum;
    });
  }

  // Fast aggregate (may lag slightly): owners/v2
  function ownersCount(){
    var collection = getCollection();
    var controllers = getControllers();
    if (!collection || !controllers.length) return Promise.reject(new Error('missing addresses'));

    var headers = apiHeaders();
    function fetchOne(c){
      var url = 'https://api.reservoir.tools/owners/v2?collection='+collection+'&owner='+c+'&limit=1';
      return fetch(url, { method:'GET', headers: headers })
        .then(function(res){ if (!res.ok) throw new Error('owners/v2 ' + res.status); return res.json(); })
        .then(function(j){
          var arr = j.owners || j.ownerships || [];
          if (!arr.length) return 0;
          var row = arr[0];
          var cnt = (row.tokenCount!=null) ? row.tokenCount
                   : (row.ownership && row.ownership.tokenCount!=null) ? row.ownership.tokenCount
                   : (row.ownerships && row.ownerships[0] && row.ownerships[0].tokenCount!=null) ? row.ownerships[0].tokenCount
                   : 0;
          return Number(cnt||0);
        });
    }

    var p = [];
    for (var i=0;i<controllers.length;i++) p.push(fetchOne(controllers[i]));
    return Promise.all(p).then(function(parts){
      var sum = 0; for (var k=0;k<parts.length;k++) sum += (parts[k]||0);
      return sum;
    });
  }

  function fillTotalStaked(){
    var out = byId('stakedTotal'); if (!out) return;

    // Prefer exact paged count; fallback to owners aggregate
    tokensCount().then(function(exact){
      out.textContent = fmtInt(exact);
    }).catch(function(){
      ownersCount().then(function(fast){
        out.textContent = fmtInt(fast);
      }).catch(function(){
        if (!out.textContent || out.textContent.trim()==='') out.textContent = '—';
      });
    });
  }

  function refresh(){
    primeUI();
    fillControllerBox();
    fillTotalStaked();
  }

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  document.addEventListener('ff:staking:update', refresh);
})();
