// assets/js/pond-kpis.js
// Minimal + safe: update pond description and controller value only.
// No new boxes. No CSS. No changes to "Total Staked Frogs" or other KPIs.

(function (FF, CFG) {
  'use strict';

  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const CTRL     = String(CFG.CONTROLLER_ADDRESS || '').trim();

  // ---- Helpers
  const $  = (s, r=document)=> r.querySelector(s);
  const pick = (sels)=> sels.map(sel=> $(sel)).find(Boolean);

  function shortAddr(a){ return a ? a.slice(0,6) + '…' + a.slice(-4) : '—'; }
  function etherscanBase(){
    if (CHAIN_ID === 1) return 'https://etherscan.io';
    if (CHAIN_ID === 11155111) return 'https://sepolia.etherscan.io';
    if (CHAIN_ID === 5) return 'https://goerli.etherscan.io';
    return 'https://etherscan.io';
  }
  function etherscanAddr(a){ return `${etherscanBase()}/address/${a}`; }

  // ---- Description: short & informative
  function updateDescription(){
    const el = pick(['#pondDesc','[data-pond-desc]']);
    if (!el) return;
    el.textContent = 'Live staking dashboard for the FreshFrogs pond — total frogs staked, active controller, and cumulative $FLYZ rewards.';
  }

  // ---- Controller box: only update the VALUE part if possible
  function updateControllerBox(){
    if (!CTRL) return;

    // Prefer a dedicated "value" node if your markup has one.
    // These selectors are conservative and won’t affect layout.
    let val = pick([
      '[data-kpi="controller"] .kpi-value',
      '#pondController .kpi-value',
      '#pondController .value',
      '[data-kpi="controller"] .value',
    ]);

    // If no explicit value node, fall back to the whole controller box,
    // but ONLY replace its content with the expected two-line shape.
    // (Your surrounding label/emoji should live outside or be CSS-generated.)
    if (!val) {
      val = pick(['#pondController','[data-kpi="controller"]']);
      if (!val) return;

      val.innerHTML =
        '🧰 Controller<br>' +
        '<span class="pg-muted">Staking contract • </span>' +
        `<a href="${etherscanAddr(CTRL)}" target="_blank" rel="noopener">${shortAddr(CTRL)}</a>`;
      return;
    }

    // Update just the value text (best case: label stays untouched by your markup)
    val.innerHTML =
      `<span class="pg-muted">Staking contract • </span>` +
      `<a href="${etherscanAddr(CTRL)}" target="_blank" rel="noopener">${shortAddr(CTRL)}</a>`;
  }

  function init(){
    try{
      updateDescription();
      updateControllerBox();
    }catch(e){
      console.warn('[pond-kpis] minimal init failed', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
