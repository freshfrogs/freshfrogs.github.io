// assets/js/topbar.js — centered, compact, theme-colored buttons (no container bg)
(function(){
  'use strict';

  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL  = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL || (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/'+CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  // inject minimal CSS (plain rgba; no color-mix; smaller, less rounded; centered)
  function injectStyles(){
    if (document.getElementById('ff-topbar-css')) return;
    var css = [
      '.ff-topbar{display:flex;justify-content:center;align-items:center;gap:8px;padding:8px 0;}',
      '.ff-btn{-webkit-tap-highlight-color:transparent;display:inline-flex;align-items:center;justify-content:center;',
      '  padding:6px 10px;font:inherit;font-size:0.92rem;line-height:1;letter-spacing:.2px;',
      '  border:1px solid var(--border,#2a2a31);border-radius:8px;background:transparent;color:var(--ink,#d7d7df);',
      '  cursor:pointer;text-decoration:none;transition:background-color .12s ease,border-color .12s ease,color .12s ease,transform .04s ease;}',
      '.ff-btn:active{transform:translateY(1px)}',
      /* per-button theme shades */
      '.is-connect{border-color:rgba(53,196,106,.6);background:rgba(53,196,106,.10);color:#e8ffe8;}',
      '.is-connect:hover{background:rgba(53,196,106,.18);border-color:rgba(53,196,106,.8);}',
      '.is-opensea{border-color:rgba(71,165,255,.5);background:rgba(71,165,255,.10);color:#e9f4ff;}',
      '.is-opensea:hover{background:rgba(71,165,255,.18);border-color:rgba(71,165,255,.75);}',
      '.is-etherscan{border-color:rgba(139,143,153,.5);background:rgba(139,143,153,.10);color:#eceff3;}',
      '.is-etherscan:hover{background:rgba(139,143,153,.18);border-color:rgba(139,143,153,.7);}',
      '.is-rankings{border-color:rgba(255,184,74,.55);background:rgba(255,184,74,.12);color:#fff6e6;}',
      '.is-rankings:hover{background:rgba(255,184,74,.2);border-color:rgba(255,184,74,.8);}',
      '.is-pond{border-color:rgba(38,140,86,.55);background:rgba(38,140,86,.10);color:#e3f7ea;}',
      '.is-pond:hover{background:rgba(38,140,86,.18);border-color:rgba(38,140,86,.8);}',
      '.is-mutate{border-color:rgba(255,106,58,.55);background:rgba(255,106,58,.10);color:#ffefe9;}',
      '.is-mutate:hover{background:rgba(255,106,58,.2);border-color:rgba(255,106,58,.8);}',
      '@media (max-width:720px){.ff-topbar{gap:6px;padding:6px 0}.ff-btn{padding:6px 9px;font-size:.9rem}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'ff-topbar-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureBar(){
    var bar = document.querySelector('.ff-topbar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'ff-topbar';
    // insert at very top without any panel background
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  function short(a){ return !a ? '' : (a.slice(0,6)+'…'+a.slice(-4)); }

  function render(){
    injectStyles();
    var bar = ensureBar();
    bar.innerHTML =
      '<button class="ff-btn is-connect"   data-action="connect">Connect Wallet</button>'+
      '<a class="ff-btn is-opensea"        href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>'+
      '<a class="ff-btn is-etherscan"      href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>'+
      '<button class="ff-btn is-rankings"  data-action="rankings">Rankings</button>'+
      '<button class="ff-btn is-pond"      data-action="pond">The Pond</button>'+
      '<button class="ff-btn is-mutate"    data-action="mutate">Mutate</button>';

    bar.addEventListener('click', onClick);

    // if already connected, show short address (best-effort)
    try{
      if (window.Wallet && typeof window.Wallet.getAddress==='function'){
        var a = window.Wallet.getAddress();
        if (a) setAddr(short(a));
      } else if (window.ethereum && window.ethereum.selectedAddress){
        setAddr(short(window.ethereum.selectedAddress));
      }
    }catch(_){}
  }

  function setAddr(txt){
    var b = document.querySelector('.ff-btn.is-connect');
    if (b) b.textContent = txt || 'Connect Wallet';
  }

  function connect(){
    try{
      if (window.Wallet && typeof window.Wallet.connect==='function'){
        window.Wallet.connect().then(function(a){
          if (a) setAddr(short(a));
          document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
        }).catch(function(){});
        return;
      }
      if (window.ethereum && window.ethereum.request){
        window.ethereum.request({method:'eth_requestAccounts'}).then(function(arr){
          var a = (arr && arr[0]) ? arr[0] : '';
          if (a) setAddr(short(a));
          document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
        }).catch(function(){});
        return;
      }
      alert('No Ethereum wallet detected (e.g., MetaMask).');
    }catch(_){}
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

  function onClick(ev){
    var a = ev.target.closest ? ev.target.closest('[data-action]') : null;
    if (!a) return;
    var act = a.getAttribute('data-action');
    if (act==='connect') return connect();
    if (act==='rankings') return go('rankings');
    if (act==='pond')     return go('pond');
    if (act==='mutate')   return go('mutate');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
  if (window.ethereum && window.ethereum.on){
    window.ethereum.on('accountsChanged', function(acc){
      setAddr(short((acc && acc[0]) ? acc[0] : ''));
    });
  }
})();
