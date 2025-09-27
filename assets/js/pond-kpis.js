// assets/js/pond-kpis.js — labels/links + total staked (limit=3)
(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var CONTRACT   = String(CFG.COLLECTION_ADDRESS || '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b').toLowerCase();
  var CONTROLLER = String(CFG.CONTROLLER_ADDRESS || (CFG.CONTROLLER_ADDRESSES && CFG.CONTROLLER_ADDRESSES[0]) || '0xcb1ee125cff4051a10a55a09b10613876c4ef199').toLowerCase();
  var API_KEY    = CFG.RESERVOIR_API_KEY || null;

  var HEADERS = { accept: '*/*' };
  if (API_KEY) HEADERS['x-api-key'] = API_KEY;

  function $(s, p){ return (p||document).querySelector(s); }

  // ---------- set labels/links/hide ----------
  function setStaticBits(){
    // 1) Total Staked label with lily pad
    var block1 = $('.info-grid-2 .info-block:nth-child(1)');
    if (block1){
      var ik1 = $('.ik', block1); if (ik1) ik1.textContent = '🪷 Total Staked';
      var in1 = $('.in', block1); if (in1) in1.textContent = 'Across the collection';
    }

    // 2) Controller block (leave as-is but ensure link exists if you have an anchor)
    var block2 = $('.info-grid-2 .info-block:nth-child(2)');
    if (block2){
      var in2 = $('.in', block2);
      if (in2 && !in2.querySelector('a')){
        // optional: add a small link to controller address if you want
        var a = document.createElement('a');
        a.href = 'https://etherscan.io/address/'+CONTROLLER;
        a.textContent = (CONTROLLER.slice(0,6)+'…'+CONTROLLER.slice(-4));
        a.target = '_blank'; a.rel='noopener';
        in2.appendChild(document.createTextNode(' • '));
        in2.appendChild(a);
      }
    }

    // 3) Rewards $FLYZ with emoji + link to token
    var block3 = $('.info-grid-2 .info-block:nth-child(3)');
    if (block3){
      var ik3 = $('.ik', block3);
      var iv3 = $('.iv', block3);
      var in3 = $('.in', block3);
      if (ik3) ik3.textContent = '🪰 Rewards';
      if (iv3){
        iv3.innerHTML = ''; // clear
        var a3 = document.createElement('a');
        a3.href = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
        a3.textContent = '$FLYZ';
        a3.target = '_blank'; a3.rel = 'noopener';
        iv3.appendChild(a3);
      }
      if (in3) in3.textContent = 'Earnings token';
    }

    // 4) Remove the 4th box entirely
    var block4 = $('.info-grid-2 .info-block:nth-child(4)');
    if (block4 && block4.parentNode) block4.parentNode.removeChild(block4);
  }

  function fmt(n){ try{ return (+n).toLocaleString(); } catch(_){ return String(n); } }

  // ---------- total staked from Reservoir owners/v2 (limit=3) ----------
  function fetchOwners(){
    var url = 'https://api.reservoir.tools/owners/v2'
            + '?collection=' + encodeURIComponent(CONTRACT)
            + '&limit=3&sortBy=tokenCount&sortDirection=desc';
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
  function targetNode(){
    return document.getElementById('stakedTotal') ||
           $('.info-grid-2 .info-block:nth-child(1) .iv') || null;
  }
  function fill(){
    var out = targetNode(); if (!out) return;
    out.textContent = '…';
    fetchOwners()
      .then(function(j){
        var n = extractCount(j);
        out.textContent = (n == null) ? '—' : fmt(n);
      })
      .catch(function(){ out.textContent = '—'; });
  }

  function init(){ setStaticBits(); fill(); }
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
})();
