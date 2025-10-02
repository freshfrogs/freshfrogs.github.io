// assets/js/topbar.js — one-row, centered, dashboard-pill buttons with role colors + separators
(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/' + CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $(s, p){ return (p||document).querySelector(s); }

  // Inject minimal overrides: keep .btn.btn-connected base, just recolor by role.
  function injectCSS(){
    if (document.getElementById('ff-pill-css')) return;
    var css = `
/* Row: centered, one line, no wrapper chrome, a bit of bottom spacing */
#ffTopRow{
  display:flex; justify-content:center; align-items:center;
  gap:10px; padding:10px 0; flex-wrap:nowrap; overflow-x:auto;
  scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:14px;
}
#ffTopRow::-webkit-scrollbar{ display:none; }

/* Use site's pill style, then override colors per role (kept bright/filled) */
#ffTopRow .btn.btn-connected{ white-space:nowrap; }
#ffTopRow .ffc-connect { background:#144c2b !important; border-color:#2ec56a !important; color:#eaffef !important; }
#ffTopRow .ffc-pond    { background:#0f3c25 !important; border-color:#20a35d !important; color:#e6f9ee !important; }
#ffTopRow .ffc-opensea { background:#0e2a44 !important; border-color:#58afff !important; color:#eaf4ff !important; }
#ffTopRow .ffc-ethers  { background:#22262d !important; border-color:#9aa0aa !important; color:#edf0f5 !important; }
#ffTopRow .ffc-mutate  { background:#3b1a11 !important; border-color:#ff7a4f !important; color:#ffefe9 !important; }
#ffTopRow .ffc-rank    { background:#3a2a0f !important; border-color:#ffc262 !important; color:#fff7e6 !important; }

/* Gentle brighten on hover to match your theme */
#ffTopRow .btn.btn-connected:hover{ filter:brightness(1.05); }

/* Middle-dot separators */
#ffTopRow .ff-sep{
  display:inline-block; padding:0 2px; color:var(--muted,#9aa0aa); opacity:.7; user-select:none;
}
@media (max-width:720px){
  #ffTopRow{ gap:8px; padding:8px 0; margin-bottom:12px; }
}
    `.trim();
    var s = document.createElement('style');
    s.id = 'ff-pill-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function ensureRow(){
    var old = document.getElementById('ffTopRow'); if (old) old.remove();
    var row = document.createElement('div');
    row.id = 'ffTopRow';

    // Build: button • button • ...
    function sep(){ return '<span class="ff-sep">•</span>'; }
    row.innerHTML =
      '<button class="btn btn-connected ffc-connect" data-act="connect">Connect Wallet</button>' +
      sep() +
      '<a class="btn btn-connected ffc-opensea" href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>' +
      sep() +
      '<a class="btn btn-connected ffc-ethers" href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>' +
      sep() +
      '<button class="btn btn-connected ffc-rank" data-act="rankings">Rankings</button>' +
      sep() +
      '<button class="btn btn-connected ffc-pond" data-act="pond">The Pond</button>' +
      sep() +
      '<button class="btn btn-connected ffc-mutate" data-act="mutate">Mutate</button>';

    // Mount directly under the hero strip (title/small frogs)
    var hero = document.querySelector('.ff-page-hero, .ff-hero, .frog-hero');
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
      if (window.Wallet && typeof window.Wallet.getAddress==='function'){
        var a = window.Wallet.getAddress(); if (a) btn.textContent = short(a);
      } else if (window.ethereum && window.ethereum.selectedAddress){
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
    injectCSS();
    var row = ensureRow();

    // show short address if already connected
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
