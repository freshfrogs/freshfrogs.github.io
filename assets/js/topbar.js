// assets/js/topbar.js — simple centered button row (no color overrides)
(function () {
  'use strict';

  var CFG = (window.FF_CFG || window.CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/' + CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $(s, p){ return (p||document).querySelector(s); }
  function short(a){ return a ? (String(a).slice(0,6)+'…'+String(a).slice(-4)) : 'Connect Wallet'; }

  // Row layout only; let site CSS style the .btn variants
  function injectCSS(){
    if (document.getElementById('ff-pill-css')) return;
    var css = `
#ffTopRow{
  display:flex; justify-content:center; align-items:center;
  gap:10px; padding:10px 0; flex-wrap:nowrap; overflow-x:auto;
  scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:14px;
}
#ffTopRow::-webkit-scrollbar{ display:none; }
#ffTopRow .ff-sep{ display:inline-block; padding:0 2px; color:var(--muted,#9aa0aa); opacity:.7; user-select:none; }
@media (max-width:720px){ #ffTopRow{ gap:8px; padding:8px 0; margin-bottom:12px; } }
`.trim();
    var s = document.createElement('style'); s.id='ff-pill-css'; s.textContent=css; document.head.appendChild(s);
  }

  function ensureRow(){
    var old = document.getElementById('ffTopRow'); if (old) old.remove();
    var row = document.createElement('div'); row.id = 'ffTopRow';
    function sep(){ return '<span class="ff-sep">•</span>'; }

    row.innerHTML =
      '<button class="btn btn-outline-gray" data-act="connect">Connect Wallet</button>' +
      sep() +
      '<a class="btn btn-outline-gray" href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>' +
      sep() +
      '<a class="btn btn-outline-gray" href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>' +
      sep() +
      '<button class="btn btn-outline-gray" data-act="rankings">Rankings</button>' +
      sep() +
      '<button class="btn btn-outline-gray" data-act="pond">The Pond</button>' +
      sep() +
      '<button class="btn btn-outline-gray" data-act="mutate">Mutate</button>';

    // Place the row immediately under the hero section (like collection.html)
    var hero = $('.frog-hero');
    if (hero && hero.parentNode) {
      if (hero.nextSibling) hero.parentNode.insertBefore(row, hero.nextSibling);
      else hero.parentNode.appendChild(row);
    } else {
      document.body.insertBefore(row, document.body.firstChild);
    }
    return row;
  }

  async function getAddress(){
    try{
      if (window.Wallet && typeof window.Wallet.getAddress==='function'){
        var a = await window.Wallet.getAddress(); if (a) return a;
      }
      if (window.ethereum && window.ethereum.request){
        var arr = await window.ethereum.request({ method:'eth_accounts' });
        return (arr && arr[0]) || null;
      }
    }catch(_){}
    return null;
  }

  async function requestConnect(){
    try{
      if (window.Wallet && typeof window.Wallet.connect==='function'){
        var a = await window.Wallet.connect(); if (a) return a;
      }
      if (window.ethereum && window.ethereum.request){
        var arr = await window.ethereum.request({ method:'eth_requestAccounts' });
        return (arr && arr[0]) || null;
      }
    }catch(_){}
    return null;
  }

  function go(kind){
    // Try to scroll on same page; else navigate to collection.html anchor or mutate.html
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
    injectCSS();
    var row = ensureRow();

    // Reflect current address (if already connected)
    getAddress().then(function(a){
      var btn = row.querySelector('[data-act="connect"]');
      if (btn) btn.textContent = short(a);
    });

    // Click actions
    row.addEventListener('click', function(e){
      var el = e.target.closest && e.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act');

      if (act === 'connect'){
        el.disabled = true;
        requestConnect().then(function(addr){
          el.textContent = short(addr);
          document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:addr}}));
        }).catch(function(){}).finally(function(){ el.disabled = false; });
        return;
      }
      if (act === 'rankings') return go('rankings');
      if (act === 'pond')     return go('pond');
      if (act === 'mutate')   return go('mutate');
    });

    // Update label when wallet changes
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
