// assets/js/topbar.js — pill buttons styled like the dashboard connect button
// - Centered row under the hero (title/small frogs)
// - No container background/border
// - Fully-filled, bright-ish theme-matched pills per role

(function () {
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/' + CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $ (s, p){ return (p||document).querySelector(s); }

  // --- inject compact pill style (matches dashboard vibe) ---
  function injectCSS(){
    if (document.getElementById('frog-topbar-css')) return;
    var css = `
/* Centered row; no background/border wrapper */
.frog-btnrow{ display:flex; justify-content:center; align-items:center; gap:10px; padding:10px 0; }

/* Pill button base: small, boldish, fully rounded, subtle inner sheen */
.frog-btn{
  -webkit-tap-highlight-color:transparent;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:7px 14px; font:600 0.92rem/1 system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif;
  border-radius:9999px; border:1px solid var(--bd, #2a2a31); background:var(--bg, #152015); color:var(--fg, #e9f6ea);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  text-decoration:none; cursor:pointer; letter-spacing:.2px;
  transition:background-color .12s ease, border-color .12s ease, box-shadow .12s ease, transform .04s ease, color .12s ease;
}
.frog-btn:active{ transform: translateY(1px); }

/* Hover brighten + soft ring that matches the fill */
.frog-btn:hover{
  filter: brightness(1.05);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--bd, #2a2a31), transparent 75%),
    inset 0 1px 0 rgba(255,255,255,0.07);
}

/* Role palettes (filled like the dashboard connect pill) */
.frog-connect{ --bg:#144c2b; --bd:#2ec56a; --fg:#eaffef; }   /* green */
.frog-pond{    --bg:#0f3c25; --bd:#20a35d; --fg:#e6f9ee; }   /* darker green */
.frog-opensea{ --bg:#0e2a44; --bd:#58afff; --fg:#eaf4ff; }   /* light blue */
.frog-ethersc{ --bg:#22262d; --bd:#9aa0aa; --fg:#edf0f5; }   /* gray */
.frog-mutate{  --bg:#3b1a11; --bd:#ff7a4f; --fg:#ffefe9; }   /* red/orange */
.frog-rank{    --bg:#3a2a0f; --bd:#ffc262; --fg:#fff7e6; }   /* yellow/orange */

/* Mobile tweaks */
@media (max-width:720px){
  .frog-btnrow{ flex-wrap:wrap; gap:8px; padding:8px 0; }
  .frog-btn{ padding:7px 12px; font-size:.9rem; }
}
    `.trim();
    var s = document.createElement('style');
    s.id = 'frog-topbar-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // mount right under the hero (title/small frogs). fallback: top of body
  function mountRow(row){
    var hero = $('.frog-hero');
    if (hero && hero.parentNode){
      if (hero.nextSibling) hero.parentNode.insertBefore(row, hero.nextSibling);
      else hero.parentNode.appendChild(row);
    } else {
      document.body.insertBefore(row, document.body.firstChild);
    }
  }

  function short(a){ return !a ? '' : (String(a).slice(0,6)+'…'+String(a).slice(-4)); }
  function setAddrOnConnect(btn){
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
    row.className = 'frog-btnrow';
    row.innerHTML = [
      '<button class="frog-btn frog-connect" data-act="connect">Connect Wallet</button>',
      '<a class="frog-btn frog-opensea"  href="'+OPENSEA_URL+'"  target="_blank" rel="noopener">Shop on OpenSea</a>',
      '<a class="frog-btn frog-ethersc"  href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>',
      '<button class="frog-btn frog-rank" data-act="rankings">Rankings</button>',
      '<button class="frog-btn frog-pond" data-act="pond">The Pond</button>',
      '<button class="frog-btn frog-mutate" data-act="mutate">Mutate</button>'
    ].join('');

    mountRow(row);

    // already-connected short address
    setAddrOnConnect(row.querySelector('.frog-connect'));

    // actions
    row.addEventListener('click', function(ev){
      var a = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'connect'){
        try{
          if (window.Wallet && typeof window.Wallet.connect==='function'){
            window.Wallet.connect().then(function(addr){
              if (addr) a.textContent = short(addr);
              document.dispatchEvent(new CustomEvent('ff:wallet:ready', { detail:{ address: addr }}));
            }).catch(function(){});
            return;
          }
          if (window.ethereum && window.ethereum.request){
            window.ethereum.request({ method:'eth_requestAccounts' }).then(function(arr){
              var addr = (arr && arr[0]) ? arr[0] : '';
              if (addr) a.textContent = short(addr);
              document.dispatchEvent(new CustomEvent('ff:wallet:ready', { detail:{ address: addr }}));
            }).catch(function(){});
            return;
          }
          alert('No Ethereum wallet detected (e.g., MetaMask).');
        }catch(_){}
      }
      if (act === 'rankings')  return goTo('rankings');
      if (act === 'pond')      return goTo('pond');
      if (act === 'mutate')    return goTo('mutate');
    });

    // update text when account changes
    if (window.ethereum && window.ethereum.on){
      window.ethereum.on('accountsChanged', function(acc){
        var btn = row.querySelector('.frog-connect');
        if (btn) btn.textContent = short((acc && acc[0]) || '');
      });
    }
  }

  var TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };
  function goTo(kind){
    var sels = TARGETS[kind] || [];
    for (var i=0;i<sels.length;i++){
      var el = document.querySelector(sels[i]);
      if (el){ el.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
    }
    var hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    var target = (kind==='mutate' && sels.indexOf('mutate.html')>-1) ? 'mutate.html' : ('collection.html'+hash);
    window.location.href = target;
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
})();
