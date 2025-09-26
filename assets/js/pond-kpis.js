// assets/js/pond-kpis.js — Total Staked via Reservoir (no wallet/RPC)
// Counts tokens owned by your staking controller(s) using Reservoir owners API,
// falls back to tokens/v10 if needed. Optional API key via CFG.RESERVOIR_API_KEY.

(function () {
  'use strict';

  // ---------- CFG ----------
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var COLLECTION = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  var CONTROLLERS = (CFG.CONTROLLER_ADDRESSES || (CFG.CONTROLLER_ADDRESS ? [CFG.CONTROLLER_ADDRESS] : [])).map(function(a){return String(a||'').toLowerCase();});
  var RES_KEY = CFG.RESERVOIR_API_KEY || null;

  // Defaults (safe fallbacks if CFG not loaded yet)
  if (!COLLECTION) COLLECTION = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  if (!CONTROLLERS.length) CONTROLLERS = ['0xcb1ee125cff4051a10a55a09b10613876c4ef199'];

  var HEAD = { accept:'*/*' };
  if (RES_KEY) HEAD['x-api-key'] = RES_KEY;

  // ---------- DOM helpers ----------
  function $(s, p){ return (p||document).querySelector(s); }
  function $$ (s, p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function fmt(n){
    try{ return (+n).toLocaleString(); }catch(_){ try{ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }catch(_2){ return String(n); } }
  }
  function targetNode(){
    var el = document.getElementById('stakedTotal');
    if (el) return el;
    var guess = $('.info-grid-2 .info-block:nth-child(1) .iv');
    if (guess) return guess;
    return null;
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
    var box = $('.info-grid-2 .info-block:nth-child(3)');
    if (!box) return;
    var lab = box.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
    var iv  = box.querySelector('.iv'); if (!iv) return;
    var a = iv.querySelector('#pondRewardsLink');
    if (!a){ a = document.createElement('a'); a.id='pondRewardsLink'; iv.textContent=''; iv.appendChild(a); }
    a.href='https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
    a.target='_blank'; a.rel='noopener';
    a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
  }
  function removeFourthBox(){
    var blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();
  }

  // ---------- Reservoir fetchers ----------
  // Fast aggregate count per controller
  function ownersCount(controller){
    var url = 'https://api.reservoir.tools/owners/v2?collection='+COLLECTION+'&owner='+controller+'&limit=1';
    return fetch(url, {method:'GET', headers:HEAD}).then(function(res){
      if (!res.ok) throw new Error('owners/v2 '+res.status);
      return res.json();
    }).then(function(j){
      var row = (j.owners && j.owners[0]) || (j.ownerships && j.ownerships[0]) || j.ownership || null;
      var cnt = row ? (row.tokenCount!=null ? row.tokenCount :
                       row.ownership && row.ownership.tokenCount!=null ? row.ownership.tokenCount :
                       0) : 0;
      return Number(cnt||0);
    }).catch(function(){ return 0; });
  }

  // Exact count fallback via tokens/v10 (paged)
  function tokensCount(controller){
    var total = 0, cont = null, guard = 0;
    function once(){
      var base = 'https://api.reservoir.tools/tokens/v10?collection='+COLLECTION+'&owner='+controller+'&limit=1000&includeTopBid=false';
      var url  = cont ? base + '&continuation=' + encodeURIComponent(cont) : base;
      return fetch(url, {method:'GET', headers:HEAD}).then(function(res){
        if (!res.ok) throw new Error('tokens/v10 '+res.status);
        return res.json();
      }).then(function(j){
        total += (j.tokens || []).length;
        cont = j.continuation || null;
        guard++;
        if (cont && guard < 20) return once();
        return total;
      }).catch(function(){ return total; });
    }
    return once();
  }

  function fetchTotalStaked(){
    // First try owners/v2 for all controllers, then fallback to tokens/v10 for any zeroes.
    return Promise.all(CONTROLLERS.map(ownersCount)).then(function(ownersArr){
      var sum = ownersArr.reduce(function(a,b){return a + (b||0);}, 0);
      // If sum > 0, good enough (fast). If 0, try exact tokens/v10 (slower).
      if (sum > 0) return sum;
      return Promise.all(CONTROLLERS.map(tokensCount)).then(function(tokensArr){
        return tokensArr.reduce(function(a,b){return a + (b||0);}, 0);
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
