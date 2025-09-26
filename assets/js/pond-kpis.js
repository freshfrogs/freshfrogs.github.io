// assets/js/pond-kpis.js
// Total Staked via Reservoir owners/v2 *only*.
// Reads the row matching the controller address. If not found/failed => leave blank.

(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT = (CFG.COLLECTION_ADDRESS || '').toLowerCase();
  var CONTROLLERS = (CFG.CONTROLLER_ADDRESSES || (CFG.CONTROLLER_ADDRESS ? [CFG.CONTROLLER_ADDRESS] : [])).map(function(a){return String(a||'').toLowerCase();});
  var RES_KEY = CFG.RESERVOIR_API_KEY || null;

  // Safety if CFG not ready (you can remove these if you always set CFG)
  if (!CONTRACT) CONTRACT = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  if (!CONTROLLERS.length) CONTROLLERS = ['0xcb1ee125cff4051a10a55a09b10613876c4ef199'];

  var HEAD = { accept:'*/*' };
  if (RES_KEY) HEAD['x-api-key'] = RES_KEY;

  function $(s,p){ return (p||document).querySelector(s); }
  function $$(s,p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function fmt(n){ try{ return (+n).toLocaleString(); }catch(_){ return String(n); } }
  function targetNode(){ return document.getElementById('stakedTotal') || $('.info-grid-2 .info-block:nth-child(1) .iv') || null; }
  function setLabel(){ var ik = $('.info-grid-2 .info-block:nth-child(1) .ik'); if (ik) ik.textContent = '🌿 Total Staked'; }
  function setControllerBox(){
    var a = document.getElementById('stakedController'); if (!a) return;
    var addr = CONTROLLERS[0]; if (!addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = addr.slice(0,6)+'…'+addr.slice(-4);
  }
  function setFLYZ(){
    var box = $('.info-grid-2 .info-block:nth-child(3)'); if (!box) return;
    var lab = box.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
    var iv  = box.querySelector('.iv'); if (!iv) return;
    var a = iv.querySelector('#pondRewardsLink');
    if (!a){ a = document.createElement('a'); a.id='pondRewardsLink'; iv.textContent=''; iv.appendChild(a); }
    a.href='https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63'; a.target='_blank'; a.rel='noopener';
    a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
  }
  function removeFourthBox(){ var blocks = $$('.info-grid-2 .info-block'); if (blocks[3]) blocks[3].remove(); }

  // owners/v2 -> read ONLY the row for the controller address
  function ownersCountFor(controller){
    var url = 'https://api.reservoir.tools/owners/v2?collection='+CONTRACT+'&owner='+controller+'&limit=1';
    return fetch(url, { method:'GET', headers:HEAD })
      .then(function(res){ if (!res.ok) throw new Error('owners/v2 '+res.status); return res.json(); })
      .then(function(j){
        var rows = Array.isArray(j.owners) ? j.owners
                 : Array.isArray(j.ownerships) ? j.ownerships.map(function(o){ return o.owner || o.ownership || o; })
                 : [];
        var row = rows.find(function(r){
          var addr = (r.address || r.owner || r.wallet || r?.ownership?.address || '').toLowerCase();
          return addr === controller;
        });
        if (row && row.tokenCount != null) return Number(row.tokenCount) || 0;
        if (row && row.ownership && row.ownership.tokenCount != null) return Number(row.ownership.tokenCount) || 0;
        return null; // not present → treat as "don't show anything"
      })
      .catch(function(){ return null; });
  }

  function fillTotal(){
    var out = targetNode(); if (!out) return;
    out.textContent = '…';
    Promise.all(CONTROLLERS.map(ownersCountFor)).then(function(arr){
      // If any controller returned null (missing row / shape), leave blank
      if (!arr.length || arr.some(function(v){ return v == null; })){ out.textContent = '—'; return; }
      var sum = arr.reduce(function(a,b){ return a + (b||0); }, 0);
      out.textContent = fmt(sum);
    }).catch(function(){ out.textContent = '—'; });
  }

  function init(){
    setLabel(); setControllerBox(); setFLYZ(); removeFourthBox(); fillTotal();
  }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  document.addEventListener('ff:staking:update', init);
})();
