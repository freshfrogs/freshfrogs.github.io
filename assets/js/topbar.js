// assets/js/topbar.js — one-row top buttons styled EXACTLY like the dashboard pill.
// Uses the same classes: "btn btn-connected". No wrapper styling. Mounted under .frog-hero.
(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/' + CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $(s, p){ return (p||document).querySelector(s); }

  function ensureSingleRow(){
    var old = document.getElementById('ffTopRow'); if (old) old.remove();
    var row = document.createElement('div');
    row.id = 'ffTopRow';
    row.style.display = 'flex';
    row.style.justifyContent = 'center';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.padding = '10px 0';
    row.style.flexWrap = 'nowrap';
    row.style.overflowX = 'auto';
    row.style.scrollbarWidth = 'none';
    row.style.webkitOverflowScrolling = 'touch';
    row.innerHTML =
      '<button class="btn btn-connected" data-act="connect">Connect Wallet</button>' +
      '<a class="btn btn-connected" href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>' +
      '<a class="btn btn-connected" href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>' +
      '<button class="btn btn-connected" data-act="rankings">Rankings</button>' +
      '<button class="btn btn-connected" data-act="pond">The Pond</button>' +
      '<button class="btn btn-connected" data-act="mutate">Mutate</button>';
    // mount directly under the hero
    var hero = $('.frog-hero');
    if (hero && hero.parentNode) {
      if (hero.nextSibling) hero.parentNode.insertBefore(row, hero.nextSibling);
      else hero.parentNode.appendChild(row);
    } else {
      document.body.insertBefore(row, document.body.firstChild);
    }
    return row;
  }

  function short(a){ return !a ? '' : (String(a).slice(0,6)+'…'+String(a).slice(-4)); }
  function setConnectLabel(btn){
    try{
      if (window.Wallet && typeof window.Wallet.getAddress==='function') {
        var a = window.Wallet.getAddress(); if (a) btn.textContent = short(a);
      } else if (window.ethereum && window.ethereum.selectedAddress) {
        btn.textContent = short(window.ethereum.selectedAddress);
      }
    }catch(_){}
  }

  function go(kind){
    var map = {
      rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
      pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
      mutate:   ['#mutatePanel','#mutate','mutate.html']
    };
    var sels = map[kind] || [];
    for (var i=0;i<sels.length;i++){
      var el = document.querySelector(sels[i]);
      if (el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    var hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    var target = (kind==='mutate' && sels.indexOf('mutate.html')>-1) ? 'mutate.html' : ('collection.html'+hash);
    window.location.href = target;
  }

  function render(){
    var row = ensureSingleRow();

    // connect label if already connected
    setConnectLabel(row.querySelector('[data-act="connect"]'));

    // actions
    row.addEventListener('click', function(e){
      var el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
      var act = el.getAttribute('data-act');
      if (act==='connect'){
        try{
          if (window.Wallet && typeof window.Wallet.connect==='function'){
            window.Wallet.connect().then(function(addr){
              if (addr) el.textContent = short(addr);
              document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:addr}}));
            }).catch(function(){});
            return;
          }
          if (window.ethereum && window.ethereum.request){
            window.ethereum.request({method:'eth_requestAccounts'}).then(function(arr){
              var a = (arr && arr[0]) ? arr[0] : '';
              if (a) el.textContent = short(a);
              document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
            }).catch(function(){});
            return;
          }
          alert('No Ethereum wallet detected (e.g., MetaMask).');
        }catch(_){}
      }
      if (act==='rankings') return go('rankings');
      if (act==='pond')     return go('pond');
      if (act==='mutate')   return go('mutate');
    });

    if (window.ethereum && window.ethereum.on){
      window.ethereum.on('accountsChanged', function(acc){
        var btn = row.querySelector('[data-act="connect"]');
        if (btn) btn.textContent = short((acc && acc[0]) || '');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
})();
