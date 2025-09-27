// === DASHBOARD: replace "Connect" button with address badge (robust) ===
(function(){
  'use strict';

  const short = a => (a && a.length > 10) ? (a.slice(0,6)+'…'+a.slice(-4)) : (a || 'Not connected');

  function readAddress(){
    return (window.walletState && window.walletState.address)
        || (window.FF_WALLET && window.FF_WALLET.address)
        || (window.ethereum && (window.ethereum.selectedAddress || (Array.isArray(window.ethereum.accounts) && window.ethereum.accounts[0])))
        || localStorage.getItem('ff:lastAddress')
        || '';
  }

  function findConnectButton(){
    // Try multiple likely selectors so we catch your actual markup
    const sels = [
      '#ownedConnectBtn',
      '.owned-panel .panel-head .btn[data-role="owned-connect"]',
      '.owned-panel .panel-head .btn[data-act="connect"]',
      '.panel-head .btn[data-act="connect"]',
      '.panel-head button.btn' // fallback
    ];
    for (const s of sels){
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function replaceWithBadge(){
    const btn = findConnectButton();
    if (!btn) return;

    // If we already replaced it earlier, just update label
    if (btn.dataset && btn.dataset.addrBadge === '1'){
      btn.textContent = short(readAddress());
      return;
    }

    // Build a badge that uses the same visual style as your module
    const badge = document.createElement('button');
    badge.className = 'btn btn-connected';
    badge.style.display = 'inline-flex';
    badge.textContent = short(readAddress());
    badge.setAttribute('aria-disabled','true');
    badge.dataset.addrBadge = '1';
    badge.style.pointerEvents = 'none';

    try { btn.replaceWith(badge); }
    catch { btn.parentNode && btn.parentNode.insertBefore(badge, btn) && (btn.style.display='none'); }
  }

  function startObserver(){
    // Watch the dashboard header so if any script re-adds the connect button, we swap it again
    const head = document.querySelector('.owned-panel .panel-head') || document.querySelector('.panel-head');
    if (!head) return;
    const mo = new MutationObserver(() => replaceWithBadge());
    mo.observe(head, {childList:true, subtree:true});
  }

  function sync(){ replaceWithBadge(); }

  // Run now, on load, and on wallet change
  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('load', () => { sync(); startObserver(); });
  window.addEventListener('ff:wallet:changed', sync);
  window.addEventListener('wallet:connected', sync);
  window.addEventListener('wallet:disconnected', sync);

  // Optional: expose a manual hook your wallet code can call after connect()
  window.FF_setWalletBadge = sync;
})();
