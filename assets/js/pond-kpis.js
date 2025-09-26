// Total Staked from Reservoir owners/v2 (collection only).
// Reads the row for the controller address from config.js.
// If the controller row isn’t returned, show "—".

(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  var CONTROLLERS = (CFG.CONTROLLER_ADDRESSES || (CFG.CONTROLLER_ADDRESS ? [CFG.CONTROLLER_ADDRESS] : []))
    .map(function(a){ return String(a||'').toLowerCase(); });
  var CONTROLLER = CONTROLLERS[0] || '';
  var RES_KEY = CFG.RESERVOIR_API_KEY || null;

  // optional safety defaults (remove if you always set CFG)
  if (!CONTRACT)   CONTRACT   = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  if (!CONTROLLER) CONTROLLER = '0xcb1ee125cff4051a10a55a09b10613876c4ef199';

  var HEAD = { accept:'*/*' };
  if (RES_KEY) HEAD['x-api-key'] = RES_KEY;

  function $(s,p){ return (p||document).querySelector(s); }
  function $$(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function fmt(n){ try{ return (+n).toLocaleString(); } catch(_){ return String(n); } }

  function targetNode(){
    return document.getElementById('stakedTotal') ||
           $('.info-grid-2 .info-block:nth-child(1) .iv') || null;
  }

  function setStaticBits(){
    var ik = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (ik) ik.textContent = '🌿 Total Staked';

    var a = document.getElementById('stakedController');
    if (a){ a.href = 'https://etherscan.io/address/'+CONTROLLER;
            a.textContent = CONTROLLER.slice(0,6)+'…'+CONTROLLER.slice(-4); }

    var box = $('.info-grid-2 .info-block:nth-child(3)');
    if (box){
      var lab = box.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      var iv  = box.querySelector('.iv'); if (iv){
        var link = iv.querySelector('#pondRewardsLink') || document.createElement('a');
        link.id='pondRewardsLink'; link.target='_blank'; link.rel='noopener';
        link.href='https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
        link.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
        iv.textContent=''; iv.appendChild(link);
      }
    }
    var blocks = $$('.info-grid-2 .info-block'); if (blocks[3]) blocks[3].remove();
  }

  function fetchOwners(){
    var url = 'https://api.reservoir.tools/owners/v2'
            + '?collection=' + encodeURIComponent(CONTRACT)
            + '&limit=1000&sortBy=tokenCount&sortDirection=desc';
    return fetch(url, {method:'GET', headers:HEAD})
      .then(function(r){ if(!r.ok) throw new Error('owners/v2 '+r.status); return r.json(); });
  }

  function controllerCount(json){
    var rows = Array.isArray(json.owners) ? json.owners
             : Array.isArray(json.ownerships) ? json.ownerships.map(function(o){ return o.owner || o.ownership || o; })
             : [];
    var row = rows.find(function(r){
      var addr = (r.address || r.owner || r.wallet || (r.ownership && r.ownership.address) || '').toLowerCase();
      return addr === CONTROLLER;
    });
    if (!row) return null;
    if (row.tokenCount != null) return Number(row.tokenCount) || 0;
    if (row.ownership && row.ownership.tokenCount != null) return Number(row.ownership.tokenCount) || 0;
    return null;
  }

  function fill(){
    var out = targetNode(); if (!out) return;
    out.textContent = '…';
    fetchOwners().then(function(j){
      var n = controllerCount(j);
      out.textContent = (n == null) ? '—' : fmt(n);
    }).catch(function(){ out.textContent = '—'; });
  }

  function init(){ setStaticBits(); fill(); }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  document.addEventListener('ff:staking:update', init);
})();
