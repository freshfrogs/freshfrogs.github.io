// assets/js/topbar.js — single-row pill buttons styled like the dashboard connect pill.
// Mounts just under `.frog-hero`. Removes any previous row to avoid duplicates.
(function(){
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/'+CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $(s,p){ return (p||document).querySelector(s); }

  // ---- inject style that mimics the dashboard connect pill exactly (filled + border) ----
  function injectCSS(){
    if (document.getElementById('ff-pill-css')) return;
    var css = `
/* Row: centered, one line, no wrapper chrome */
#ffTopRow{ display:flex; justify-content:center; align-items:center; gap:10px; padding:10px 0; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; }
#ffTopRow::-webkit-scrollbar{ display:none; }

/* Pill base (match dashboard connect) */
.ff-pill{
  -webkit-tap-highlight-color:transparent;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:7px 14px; font:600 0.92rem/1 system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif;
  border-radius:9999px; border:1px solid var(--bd, #2a2a31); background:var(--bg, #152015); color:var(--fg, #e9f6ea);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05); text-decoration:none; cursor:pointer; letter-spacing:.2px;
  transition:background-color .12s ease, border-color .12s ease, box-shadow .12s ease, transform .04s ease, color .12s ease;
}
.ff-pill:hover{ filter:brightness(1.05); box-shadow:0 0 0 2px rgba(255,255,255,.03), inset 0 1px 0 rgba(255,255,255,.07); }
.ff-pill:active{ transform:translateY(1px); }

/* Role color fills (brightened a touch) */
.ff-connect { --bg:#144c2b; --bd:#2ec56a; --fg:#eaffef; }   /* Connect (green) */
.ff-pond    { --bg:#0f3c25; --bd:#20a35d; --fg:#e6f9ee; }   /* Pond (deep green) */
.ff-opensea { --bg:#0e2a44; --bd:#58afff; --fg:#eaf4ff; }   /* OpenSea (light blue) */
.ff-ethers  { --bg:#22262d; --bd:#9aa0aa; --fg:#edf0f5; }   /* Etherscan (gray) */
.ff-mutate  { --bg:#3b1a11; --bd:#ff7a4f; --fg:#ffefe9; }   /* Mutate (red/orange) */
.ff-rank    { --bg:#3a2a0f; --bd:#ffc262; --fg:#fff7e6; }   /* Rankings (yellow/orange) */

/* Keep one row on phones; allow sideways scroll if cramped */
@media (max-width:720px){
  #ffTopRow{ gap:8px; padding:8px 0; }
  .ff-pill{ padding:7px 12px; font-size:.9rem; }
}
    `.trim();
    var s = document.createElement('style');
    s.id = 'ff-pill-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mountRow(row){
    // remove any older row we added
    var old = document.getElementById('ffTopRow'); if (old) old.remove();

    var hero = $('.frog-hero');
    if (hero && hero.parentNode){
      if (hero.nextSibling) hero.parentNode.insertBefore(row, hero.nextSibling);
      else hero.parentNode.appendChild(row);
    } else {
      document.body.insertBefore(row, document.body.firstChild);
    }
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

  function render(){
    injectCSS();

    var row = document.createElement('div');
    row.id = 'ffTopRow';
    row.innerHTML = [
      '<button class="ff-pill ff-connect" data-act="connect">Connect Wallet</button>',
      '<a class="ff-pill ff-opensea" href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>',
      '<a class="ff-pill ff-ethers" href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>',
      '<button class="ff-pill ff-rank" data-act="rankings">Rankings</button>',
      '<button class="ff-pill ff-pond" data-act="pond">The Pond</button>',
      '<button class="ff-pill ff-mutate" data-act="mutate">Mutate</button>'
    ].join('');
    mountRow(row);

    // address if already connected
    setConnectLabel(row.querySelector('.ff-connect'));

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

    // update when account changes
    if (window.ethereum && window.ethereum.on){
      window.ethereum.on('accountsChanged', function(acc){
        var btn = row.querySelector('.ff-connect'); if (btn) btn.textContent = short((acc && acc[0]) || '');
      });
    }
  }

  var TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };
  function go(kind){
    var sels = TARGETS[kind] || [];
    for (var i=0;i<sels.length;i++){
      var el = document.querySelector(sels[i]);
      if (el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    var hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    var target = (kind==='mutate' && sels.indexOf('mutate.html')>-1) ? 'mutate.html' : ('collection.html'+hash);
    window.location.href = target;
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
})();
