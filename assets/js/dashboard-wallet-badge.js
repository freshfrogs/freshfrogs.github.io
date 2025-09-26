// assets/js/dashboard-wallet-badge.js
// Replaces the Dashboard's top-right "Connect" button with a styled wallet address badge.

(function () {
  'use strict';

  // ---- minimal style (inherits your module theme via CSS vars) ----
  function injectCSS(){
    if (document.getElementById('ff-wallet-badge-css')) return;
    const css = `
      .ff-wallet-badge{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border:1px solid var(--border,#2a2a31);
        border-radius:8px; background:rgba(53,196,106,.10); /* gentle green tint */
        color:var(--ink,#d7d7df); font:inherit; line-height:1; letter-spacing:.2px;
      }
      .ff-wallet-badge .dot{
        width:8px; height:8px; border-radius:50%;
        background: var(--green,#35c46a); box-shadow:0 0 0 2px rgba(53,196,106,.18);
      }
      .ff-panel-actions .ff-wallet-badge { margin-left:8px; }
      @media (max-width:720px){ .ff-wallet-badge{ padding:6px 9px; font-size:.90rem } }
    `.trim();
    const s = document.createElement('style');
    s.id = 'ff-wallet-badge-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---- locate the Dashboard header action area ----
  function findActionsMount(){
    // Common layouts:
    // 1) Panel container with actions area
    const candidates = [
      '#ownedPanel .panel-actions',
      '#dashboardPanel .panel-actions',
      '.owned-panel .panel-actions',
      '.panel-header .panel-actions',
      '.panel .panel-actions'
    ];
    for (const sel of candidates){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // Fallback: right side of the panel header
    const header = document.querySelector('#ownedPanel .panel-header, #dashboardPanel .panel-header, .owned-panel .panel-header, .panel-header');
    if (header){
      let right = header.querySelector('.panel-actions');
      if (!right){
        right = document.createElement('div');
        right.className = 'panel-actions';
        header.appendChild(right);
      }
      return right;
    }
    return null;
  }

  // ---- remove existing "Connect" button in the Dashboard header ----
  function removeDashboardConnect(actions){
    if (!actions) return;
    const btns = actions.querySelectorAll('button, a');
    btns.forEach(b=>{
      const t = (b.textContent || '').trim().toLowerCase();
      const act = b.getAttribute('data-action') || b.getAttribute('data-act') || '';
      if (t === 'connect' || t === 'connect wallet' || /connect/i.test(act)) {
        b.remove();
      }
    });
  }

  // ---- format address like 0xABCD…1234 ----
  const short = a => !a ? '' : (String(a).slice(0,6) + '…' + String(a).slice(-4));

  // ---- create/update the badge ----
  function setBadge(addr){
    const actions = findActionsMount();
    if (!actions) return;

    // remove any connect button still there
    removeDashboardConnect(actions);

    let badge = actions.querySelector('.ff-wallet-badge');
    if (!badge){
      badge = document.createElement('span');
      badge.className = 'ff-wallet-badge';
      badge.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="addr">—</span>`;
      actions.appendChild(badge);
    }
    const span = badge.querySelector('.addr');
    span.textContent = addr ? short(addr) : 'Not connected';
    badge.title = addr || 'No wallet connected';
  }

  // ---- read current address from your wallet helpers or ethereum ----
  function getCurrentAddress(){
    try{
      if (window.Wallet && typeof window.Wallet.getAddress === 'function'){
        const a = window.Wallet.getAddress();
        if (a) return a;
      }
    }catch(_){}
    try{
      if (window.ethereum && window.ethereum.selectedAddress){
        return window.ethereum.selectedAddress;
      }
    }catch(_){}
    return '';
  }

  // ---- init & live updates ----
  function refresh(){
    injectCSS();
    setBadge(getCurrentAddress());
  }

  // Update on common wallet events
  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  document.addEventListener('ff:wallet:ready', e => setBadge(e?.detail?.address || getCurrentAddress()));
  if (window.ethereum && window.ethereum.on){
    window.ethereum.on('accountsChanged', acc => setBadge((acc && acc[0]) || ''));
  }
})();
