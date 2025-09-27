// assets/js/pond-kpis.js
// Hotfix: write pond description, Total Frogs (from config), and Controller link.
// Zero CSS changes. Defensive selectors. Only fills when blank/missing.

(function (FF, CFG) {
  'use strict';

  const CHAIN_ID     = Number(CFG.CHAIN_ID || 1);
  const TOTAL_SUPPLY = (CFG.TOTAL_SUPPLY != null) ? Number(CFG.TOTAL_SUPPLY) : NaN;
  const CTRL_ADDR    = String(CFG.CONTROLLER_ADDRESS || '').trim();

  // ---- tiny helpers
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const pick = (sels)=> sels.map(sel=> $(sel)).find(Boolean);
  const setText = (el, v)=> { if (el) el.textContent = v; };
  const setHTML = (el, v)=> { if (el) el.innerHTML   = v; };

  function shortAddr(a){ return a ? a.slice(0,6) + '…' + a.slice(-4) : '—'; }
  function etherscanBase(){
    if (CHAIN_ID === 1) return 'https://etherscan.io';
    if (CHAIN_ID === 11155111) return 'https://sepolia.etherscan.io';
    if (CHAIN_ID === 5) return 'https://goerli.etherscan.io';
    return 'https://etherscan.io';
  }
  function etherscanAddr(a){ return `${etherscanBase()}/address/${a}`; }

  // ---- Description (only if target exists)
  function updateDescription(){
    const el = pick(['#pondDesc','[data-pond-desc]']);
    if (!el) return;
    // Only set if empty or clearly default-ish
    const cur = (el.textContent || '').trim();
    if (!cur || /live view of staking/i.test(cur)){
      el.textContent = 'Live staking dashboard for the FreshFrogs pond — total frogs staked, active controller, and cumulative $FLYZ rewards.';
    }
  }

  // ---- Try to find a "value" cell inside a KPI box
  function findValueNode(box){
    if (!box) return null;
    return box.querySelector('.kpi-value, .value, .pg-kpi-value, .pg-muted:last-child') || null;
  }

  // ---- Total Frogs (from config)
  function updateTotalFrogs(){
    if (!Number.isFinite(TOTAL_SUPPLY)) return;

    // 1) ID/data-kpi if present
    let box = pick(['#pondTotal', '#pondTotalFrogs', '[data-kpi="total"]']);
    if (!box){
      // 2) Fallback: find any KPI whose heading looks like "Total Frogs"
      box = $$('.kpi, .info, .card, .pg-kpi, div').find(n => {
        const t = (n.textContent || '').toLowerCase();
        return /total\s+frogs/.test(t) || /🐸\s*total/.test(t);
      }) || null;
    }
    if (!box) return;

    const valNode = findValueNode(box);
    const pretty = String(TOTAL_SUPPLY);

    if (valNode){
      // only overwrite if empty or numeric-looking placeholder
      const cur = (valNode.textContent || '').trim();
      if (!cur || cur === '—' || /^\d*$/.test(cur)) setText(valNode, pretty);
      return;
    }

    // If no explicit value node and box is blank-ish, render a safe two-line fallback
    const txt = (box.textContent || '').replace(/\s+/g,' ').trim();
    if (!txt || txt === '—'){
      setHTML(box, '🐸 Total Frogs<br><span class="pg-muted">'+pretty+'</span>');
    }
  }

  // ---- Controller (truncate + link)
  function updateController(){
    if (!CTRL_ADDR) return;

    // 1) ID/data-kpi if present
    let box = pick(['#pondController','[data-kpi="controller"]']);
    if (!box){
      // 2) Fallback: find KPI with wording "Controller"
      box = $$('.kpi, .info, .card, .pg-kpi, div').find(n => {
        const t = (n.textContent || '').toLowerCase();
        return /controller/.test(t) || /🧰/.test(t);
      }) || null;
    }
    if (!box) return;

    const valNode = findValueNode(box);
    const linkHTML = `<a href="${etherscanAddr(CTRL_ADDR)}" target="_blank" rel="noopener">${shortAddr(CTRL_ADDR)}</a>`;

    if (valNode){
      const cur = (valNode.innerHTML || valNode.textContent || '').trim();
      if (!cur || cur === '—' || /0x[0-9a-f]{40}/i.test(cur)){
        setHTML(valNode, linkHTML);
      }
      return;
    }

    // If no value node and box is blank-ish, write a safe two-line fallback
    const txt = (box.textContent || '').replace(/\s+/g,' ').trim();
    if (!txt || txt === '—'){
      setHTML(box, '🧰 Controller<br><span class="pg-muted">Staking contract • </span>' + linkHTML);
    }
  }

  function init(){
    try{
      updateDescription();
      updateTotalFrogs();
      updateController();
    }catch(e){
      console.warn('[pond-kpis] hotfix init failed', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
