// assets/js/pond-kpis.js — Total Staked via Reservoir owners/v2 (read the row for the controller address).
// If the controller row isn't present, falls back to exact tokens/v10 counting.
// Needs window.CFG.COLLECTION_ADDRESS and window.CFG.CONTROLLER_ADDRESS/CONTROLLER_ADDRESSES.
// Optional: window.CFG.RESERVOIR_API_KEY.

(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  var CONTROLLERS = (CFG.CONTROLLER_ADDRESSES || (CFG.CONTROLLER_ADDRESS ? [CFG.CONTROLLER_ADDRESS] : [])).map(function(a){return String(a||'').toLowerCase();});
  var RES_KEY = CFG.RESERVOIR_API_KEY || null;

  // Safety fallbacks (you can remove if you always set CFG)
  if (!CONTRACT) CONTRACT = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  if (!CONTROLLERS.length) CONTROLLERS = ['0xcb1ee125cff4051a10a55a09b10613876c4ef199'];

  var HEAD = { accept:'*/*' };
  if (RES_KEY) HEAD['x-api-key'] = RES_KEY;

  function $(s,p){ return (p||document).querySelector(s); }
  function $$(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function fmt(n){ try{ return (+n).toLocaleString(); }catch(_){ return String(n); } }

  function targetNode(){
    return document.getElementById('stakedTotal') || $('.info-grid-2 .info-block:nth-child(1) .iv') || null;
  }
  function setLabel(){
    var ik = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (ik) ik.textContent = '🌿 Total Staked';
  }
  function setControllerBox(){
    var a = document.getElementById('stakedController');
    if (!a) return;
    var addr = CONTROLLERS[0];
    if (!addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = addr.slice(0,6)+'…'+addr.slice(-4);
  }
  function setFLYZ(){
    var box = $('.info-grid-2 .info-block:nth-child(3)'); if (!box) return;
    var lab = box.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
    var iv  = box.querySelector('.iv'); if (!iv) return;
    var a = iv.querySelector('#pondRewardsLink');
    if (!a){ a = document.createElement('a'); a.id='pondRewardsLink'; iv.textContent=''; iv.appendChild(a); }
    a.href='https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
    a.target='_blank'; a.rel='noopener';
    a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
  }
  function removeFourthBox(){
    var blocks = $$('.info-grid-2 .info-block'); if (blocks[3]) blocks[3].remove();
  }

  // ---- owners/v2: read ONLY the row matching the controller address ----
  function ownersCountFor(controller){
    var url = 'https://api.reservoir.tools/owners/v2?collection=' + CONTRACT + '&owner=' + controller + '&limit=1';
    return fetch(url, { method:'GET', headers:HEAD })
      .then(function(res){ if (!res.ok) throw new Error('owners/v2 '+res.status); return res.json(); })
      .then(function(j){
        // API can return { owners:[{address, tokenCount, ...}, ...] } or { ownerships:[{owner:{address,tokenCount}}] }
        var rows = Array.isArray(j.owners) ? j.owners
                 : Array.isArray(j.ownerships) ? j.ownerships.map(function(o){ return o.owner || o.ownership || o; })
                 : [];
        var row = rows.find(function(r){
          var addr = (r.address || r.owner || r.wallet || r?.ownership?.address || '').toLowerCase();
          return addr === controller;
        });
        // If exact controller row found, take its tokenCount
        if (row && row.tokenCount != null) return Number(row.tokenCount) || 0;
        if (row && row.ownership && row.ownership.tokenCount != null) return Number(row.ownership.tokenCount) || 0;
        // If not found, return null so caller can decide to fallback
        return null;
      })
      .catch(function(){ return null; });
  }

  // ---- tokens/v10 fallback: exact count for (contract + owner) ----
  function tokensCountFor(controller){
    var total = 0, cont = null, guard = 0;
    function page(){
      // Use contracts=<addr> to force single-contract scope (avoid collection-set ambiguity)
      var base = 'https://api.reservoir.tools/tokens/v10?contracts=' + CONTRACT + '&owner=' + controller + '&limit=1000&includeTopBid=false';
      var url  = cont ? base + '&continuation=' + encodeURIComponent(cont) : base;
      return fetch(url, { method:'GET', headers:HEAD })
        .then(function(res){ if (!res.ok) throw new Error('tokens/v10 '+res.status); return res.json(); })
        .then(function(j){
          total += (j.tokens || []).length;
          cont = j.continuation || null;
          guard++;
          if (cont && guard < 50) return page();
          return total;
        })
        .catch(function(){ return total; });
    }
    return page();
  }

  function fetchTotalStaked(){
    // Try owners/v2 first (but only the row with the controller address).
    return Promise.all(CONTROLLERS.map(ownersCountFor)).then(function(arr){
      var needFallback = [];
      var sum = 0;
      for (var i=0;i<arr.length;i++){
        if (arr[i] == null) needFallback.push(CONTROLLERS[i]);  // no matching row: fallback
        else sum += arr[i];
      }
      if (!needFallback.length) return sum;
      // For controllers that didn't return a row, compute via tokens/v10 and add
      return Promise.all(needFallback.map(tokensCountFor)).then(function(parts){
        var extra = parts.reduce(function(a,b){return a+(b||0);},0);
        return sum + extra;
      });
    });
  }

  function fillTotal(){
    var out = targetNode(); if (!out) return;
    out.textContent = '…';
    fetchTotalStaked().then(function(n){
      out.textContent = fmt(n);
    }).catch(function(){
      out.textContent = '—';
    });
  }

  function init(){
    setLabel();
    setControllerBox();
    setFLYZ();
    removeFourthBox();
    fillTotal();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  document.addEventListener('ff:staking:update', init);
})();
