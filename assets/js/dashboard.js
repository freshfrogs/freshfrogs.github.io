// assets/js/dashboard.js — Baseline: leave your logic intact, safe address badge swap
(function(){
  'use strict';

  // ---- SAFE address badge (won't throw, won't block) ----
  function short(a){ return a && a.length>10 ? (a.slice(0,6)+'…'+a.slice(-4)) : (a||'Not connected'); }
  function readAddr(){
    try{
      return (window.walletState && window.walletState.address)
          || (window.FF_WALLET && window.FF_WALLET.address)
          || (window.ethereum && (window.ethereum.selectedAddress || (Array.isArray(window.ethereum.accounts)&&window.ethereum.accounts[0])))
          || localStorage.getItem('ff:lastAddress')
          || '';
    }catch{ return ''; }
  }
  function setOwnedHeaderBadge(){
    try{
      const el=document.getElementById('ownedConnectBtn');
      if(!el) return;
      el.textContent=short(readAddr());
      el.classList.add('btn','btn-connected');
      el.style.pointerEvents='none';
      el.setAttribute('aria-disabled','true');
      el.removeAttribute('onclick'); el.removeAttribute('href');
    }catch(e){ console.warn('[dashboard] badge',e); }
  }

  function start(){
    setOwnedHeaderBadge();
  }
  document.addEventListener('DOMContentLoaded', start);
  window.addEventListener('load', start);
  window.addEventListener('ff:wallet:changed', start);
  window.addEventListener('wallet:connected', start);
  window.addEventListener('wallet:disconnected', start);
})();
