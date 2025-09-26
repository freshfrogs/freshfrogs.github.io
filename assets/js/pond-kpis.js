// assets/js/pond-kpis.js
// Read Total Staked from Reservoir owners/v2?collection=<contract>
// Find the row whose address === controller and display its ownership.tokenCount.
// If not found or any error: show "—".

(function () {
  'use strict';

  // ---- config ----
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT   = String(CFG.COLLECTION_ADDRESS || '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b').toLowerCase();
  var CONTROLLER = String((CFG.CONTROLLER_ADDRESS || (CFG.CONTROLLER_ADDRESSES && CFG.CONTROLLER_ADDRESSES[0]) || '0xcb1ee125cff4051a10a55a09b10613876c4ef199')).toLowerCase();
  var API_KEY    = CFG.RESERVOIR_API_KEY || null; // do NOT use demo keys

  var HEADERS = { accept: '*/*' };
  if (API_KEY) HEADERS['x-api-key'] = API_KEY;

  // ---- dom helpers ----
  function $(s, p){ return (p||document).querySelector(s); }
  function targetNode(){
    return document.getElementById('stakedTotal') ||
           $('.info-grid-2 .info-block:nth-child(1) .iv') || null;
  }
  function setStaticBits(){
    var label = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (label) label.textContent = '🌿 Total Staked';
    var a = document.getElementById('stakedController');
    if (a){ a.href = 'https://etherscan.io/address/'+CONTROLLER;
            a.textContent = CONTROLLER.slice(0,6)+'…'+CONTROLLER.slice(-4); }
  }
  function fmt(n){ try{ return (+n).toLocaleString(); } catch(_){ return String(n); } }

  // ---- data fetch ----
  function fetchOwners(){
    var url = 'https://api.reservoir.tools/owners/v2'
            + '?collection=' + encodeURIComponent(CONTRACT)
            + '&limit=1000&sortBy=tokenCount&sortDirection=desc';
    return fetch(url, { method:'GET', headers: HEADERS })
      .then(function(res){ if (!res.ok) throw new Error('owners/v2 '+res.status); return res.json(); });
  }
  function extractCount(json){
    // Response shape you pasted: { owners: [ { address, ownership:{ tokenCount } }, ... ] }
    var owners = Array.isArray(json.owners) ? json.owners : [];
    var row = owners.find(function(r){ return String(r.address||'').toLowerCase() === CONTROLLER; });
    if (!row) return null;
    // prefer ownership.tokenCount (string) else tokenCount if present
    var tc = (row.ownership && row.ownership.tokenCount != null) ? row.ownership.tokenCount : row.tokenCount;
    return (tc == null) ? null : Number(tc);
  }

  // ---- render ----
  function fill(){
    var out = targetNode(); if (!out) return;
    out.textContent = '…';
    fetchOwners()
      .then(function(j){
        var n = extractCount(j);
        out.textContent = (n == null) ? '—' : fmt(n);
      })
      .catch(function(){
        out.textContent = '—';
      });
  }

  function init(){ setStaticBits(); fill(); }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
})();
