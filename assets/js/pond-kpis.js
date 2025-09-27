// assets/js/pond-kpis.js
// Minimal + safe: update pond description, Total Frogs, and Controller value only.

(function (FF, CFG) {
  'use strict';

  const CHAIN_ID     = Number(CFG.CHAIN_ID || 1);
  const TOTAL_SUPPLY = (CFG.TOTAL_SUPPLY != null) ? Number(CFG.TOTAL_SUPPLY) : NaN;
  const CTRL_ADDR    = String(CFG.CONTROLLER_ADDRESS || '').trim();

  // ---- tiny DOM helpers
  const $  = (s, r=document)=> r.querySelector(s);
  const pick = (arr)=> arr.map(sel => $(sel)).find(Boolean);
  const setText = (el, v)=> { if (el) el.textContent = v; };
  const setHTML = (el, v)=> { if (el) el.innerHTML   = v; };

  // ---- formatters
  function shortAddr(a){ return a ? a.slice(0,6) + '…' + a.slice(-4) : '—'; }
  function etherscanBase(){
    if (CHAIN_ID === 1) return 'https://etherscan.io';
    if (CHAIN_ID === 11155111) return 'https://sepolia.etherscan.io';
    if (CHAIN_ID === 5) return 'https://goerli.etherscan.io';
    return 'https://etherscan.io';
  }
  function etherscanAddr(a){ return `${etherscanBase()}/address/${a}`; }

  // ---- 1) Description
  function updateDescription(){
    const el = pick(['#pondDesc','[data-pond-desc]']);
    if (!el) return;
    el.textContent = 'Live staking dashboard for the FreshFrogs pond — total frogs staked, active controller, and cumulative $FLYZ rewards.';
  }

  // ---- 2) Total Frogs (from config TOTAL_SUPPLY)
  function updateTotalFrogs(){
    if (!Number.isFinite(TOTAL_SUPPLY)) return;

    // Prefer updating just the "value" span if it exists
    let val = pick([
      '[data-kpi="total"] .kpi-value',
      '#pondTotal .kpi-value',
      '#pondTotalFrogs .kpi-value',
      '[data-kpi="total"] .value',
      '#pondTotal .value',
      '#pondTotalFrogs .value'
    ]);

    if (val){
      setText(val, String(TOTAL_SUPPLY));
      return;
    }

    // Fall back to replacing the whole box content (still minimal)
    const box = pick(['#pondTotal','[data-kpi="total"]','#pondTotalFrogs']);
    if (!box) return;

    setHTML(box,
      '🐸 Total Frogs<br>' +
      `<span class="pg-muted">${TOTAL_SUPPLY}</span>`
    );
  }

  // ---- 3) Controller (truncate + link)
  function updateController(){
    if (!CTRL_ADDR) return;

    // Prefer updating just a value node inside the box
    let val = pick([
      '[data-kpi="controller"] .kpi-value',
      '#pondController .kpi-value',
      '[data-kpi="controller"] .value',
      '#pondController .value'
    ]);

    if (val){
      setHTML(val,
        `<a href="${etherscanAddr(CTRL_ADDR)}" target="_blank" rel="noopener">${shortAddr(CTRL_ADDR)}</a>`
      );
      return;
    }

    // Fall back to replacing the whole box content (still minimal, keeps emoji/text simple)
    const box = pick(['#pondController','[data-kpi="controller"]']);
    if (!box) return;

    setHTML(box,
      '🧰 Controller<br>' +
      '<span class="pg-muted">Staking contract • </span>' +
      `<a href="${etherscanAddr(CTRL_ADDR)}" target="_blank" rel="noopener">${shortAddr(CTRL_ADDR)}</a>`
    );
  }

  function init(){
    try{
      updateDescription();
      updateTotalFrogs();
      updateController();
    }catch(e){
      console.warn('[pond-kpis] init failed', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
