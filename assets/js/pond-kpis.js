// assets/js/pond-kpis.js
// Total Staked from Reservoir owners/v2 with limit=3.
// Picks the row whose address === controller from config.js.
// If not found or any error: show "—".

(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT   = String(CFG.COLLECTION_ADDRESS || '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b').toLowerCase();
  var CONTROLLER = String(CFG.CONTROLLER_ADDRESS || (CFG.CONTROLLER_ADDRESSES && CFG.CONTROLLER_ADDRESSES[0]) || '0xcb1ee125cff4051a10a55a09b10613876c4ef199').toLowerCase();
  var API_KEY    = CFG.RESERVOIR_API_KEY || null; // your key if you have one; we never use a demo key

  var HEADERS = { accept: '*/*' };
  if (API_KEY) HEADERS['x-api-key'] = API_KEY;

  function $(s,p){ return (p||document).querySelector(s); }
  function targetNode(){
    return document.getElementById('stakedTotal') ||
           $('.info-grid-2 .info-block:nth-child(1) .iv') || null;
  }
  function setStaticBits(){
    var lab = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (lab) lab.textContent = '🌿 Total Staked';
    var a = document.getElementById('stakedController');
    if (a){ a.href='https://etherscan.io/address/'+CONTROLLER; a.textContent = CONTROLLER.slice(0,6)+'…'+CONTROLLER.slice(-4); }
  }
  function fmt(n){ try{ return (+n).toLocaleString(); }catch(_){ return String(n); } }

  function fetchOwners(){
    var url = 'https://api.reservoir.tools/owners/v2'
            + '?collection=' + encodeURIComponent(CONTRACT)
            + '&limit=3'
            + '&sortBy=tokenCount'
            + '&sortDirection=desc';
    return fetch(url, { method:'GET', headers: HEADERS })
      .then(function(res){ if (!res.ok) throw new Error('owners/v2 '+res.status); return res.json(); });
  }

  function extractCount(json){
    var owners = Array.isArray(json.owners) ? json.owners : [];
    var row = owners.find(function(r){ return String(r.address||'').toLowerCase() === CONTROLLER; });
    if (!row) return null;
    var tc = row.ownership && row.ownership.tokenCount;
    if (tc == null && row.tokenCount != null) tc = row.tokenCount;
    return (tc == null) ? null : Number(tc);
  }

  function render(n){
    var out = targetNode(); if (!out) return;
    out.textContent = (n == null) ? '—' : fmt(n);
  }

  function init(){
    setStaticBits();
    var out = targetNode(); if (out) out.textContent = '…';
    fetchOwners().then(function(j){ render(extractCount(j)); })
                 .catch(function(){ render(null); });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
})();
