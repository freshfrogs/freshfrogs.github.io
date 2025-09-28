// assets/js/topbar.js — centered pill buttons row shared across pages
(function () {
  'use strict';

  var CFG = (window.FF_CFG || window.CONFIG || window.CFG || {});
  var ROOT = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/' + CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  function $(s, p){ return (p||document).querySelector(s); }
  function short(a){ return a ? (a.slice(0,6)+'…'+a.slice(-4)) : 'Connect Wallet'; }
  function go(href){ window.location.href = href; }

  // Self-contained CSS so pills look identical on any page
  function injectCSS(){
    if (document.getElementById('ff-pill-css')) return;
    var css = `
#ffTopRow{
  display:flex; gap:10px; align-items:center; justify-content:center;
  padding:10px; margin:0 auto 16px; max-width:1100px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
}
#ffTopRow::-webkit-scrollbar{ display:none; }
#ffTopRow .btn{
  font-family:var(--font-ui, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial);
  border:1px solid var(--border, #2a3340);
  background:transparent;
  color:inherit;
  border-radius:999px;
  padding:8px 12px;
  font-weight:800;
  font-size:12px;
  line-height:1;
  display:inline-flex;
  align-items:center;
  gap:8px;
  text-decoration:none;
  letter-spacing:.01em;
  transition:background .15s,border-color .15s,color .15s,transform .05s, filter .15s;
  white-space:nowrap;
}
#ffTopRow .btn:active{ transform:translateY(1px) }
#ffTopRow .btn:hover{ filter:brightness(1.05) }

#ffTopRow .ffc-connect { background:#144c2b; border-color:#2ec56a; color:#eaffef; }
#ffTopRow .ffc-pond    { background:#0f3c25; border-color:#20a35d; color:#e6f9ee; }
#ffTopRow .ffc-mutate  { background:#3b1a11; border-color:#ff7a4f; color:#ffefe9; }
#ffTopRow .ffc-rank    { background:#3a2a0f; border-color:#ffc262; color:#fff7e6; }
#ffTopRow .ffc-opensea { background:#0e2a44; border-color:#58afff; color:#eaf4ff; }
#ffTopRow .ffc-ethers  { background:#22262d; border-color:#9aa0aa; color:#edf0f5; }
    `;
    var el = document.createElement('style');
    el.id = 'ff-pill-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ensureRow(){
    var row = document.getElementById('ffTopRow');
    if (row) return row;
    // try to place under a hero if present, otherwise prepend to body
    var hero = $('.frog-hero');
    row = document.createElement('div');
    row.id = 'ffTopRow';
    if (hero && hero.parentNode){
      hero.parentNode.insertBefore(row, hero.nextSibling);
    } else {
      document.body.insertBefore(row, document.body.firstChild);
    }
    return row;
  }

  async function getAddress(){
    try{
      if (window.FF_WALLET && window.FF_WALLET.address) return window.FF_WALLET.address;
      if (window.ethereum && window.ethereum.request){
        var arr = await window.ethereum.request({ method:'eth_accounts' });
        return (arr && arr[0]) || null;
      }
    }catch(_){}
    return null;
  }
  async function requestConnect(){
    try{
      if (window.FF && window.FF.wallet && window.FF.wallet.connect){
        var a = await window.FF.wallet.connect();
        if (a) return a;
      }
      if (window.ethereum && window.ethereum.request){
        var arr = await window.ethereum.request({ method:'eth_requestAccounts' });
        return (arr && arr[0]) || null;
      }
    }catch(_){}
    return null;
  }

  function render(){
    injectCSS();
    var row = ensureRow();
    row.innerHTML = `
      <button class="btn ffc-connect" data-act="connect">Connect Wallet</button>
      <button class="btn ffc-pond"    data-act="pond">The Pond</button>
      <button class="btn ffc-mutate"  data-act="mutate">Mutate</button>
      <button class="btn ffc-rank"    data-act="rarity">Rarity</button>
      <a class="btn ffc-opensea" href="${OPENSEA_URL}" target="_blank" rel="noopener">OpenSea</a>
      <a class="btn ffc-ethers"  href="${ETHERSCAN_URL}" target="_blank" rel="noopener">Etherscan</a>
    `;

    // Set connect label
    getAddress().then(function(a){
      var btn = row.querySelector('[data-act="connect"]');
      if (btn) btn.textContent = short(a);
    });

    // Wiring
    row.addEventListener('click', async function(e){
      var el = e.target.closest('.btn'); if(!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'connect'){
        el.disabled = true;
        try{
          var a = await requestConnect();
          el.textContent = short(a);
        } finally {
          el.disabled = false;
        }
        return;
      }
      if (act === 'pond')   return go('pond.html');
      if (act === 'rarity') return go('rarity.html');
      if (act === 'mutate') return go('mutate.html');
    });

    // Reflect wallet change
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
