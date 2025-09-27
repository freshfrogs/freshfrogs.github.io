// assets/js/pond-kpis.js
// Pond header + KPIs helpers:
// - Set concise description
// - Render controller box with truncated Etherscan link
// - Render 4th KPI: % of collection staked (needs FF_CFG.TOTAL_SUPPLY)
//   Falls back gracefully if data not present.

(function (FF, CFG) {
  'use strict';

  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const TOTAL_SUPPLY = Number(CFG.TOTAL_SUPPLY || 0);

  // --- DOM helpers ---
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const pick = (sels)=> sels.map(sel=> $(sel)).find(Boolean);

  function setText(el, text){ if (el) el.textContent = text; }
  function setHTML(el, html){ if (el) el.innerHTML = html; }

  // --- Formatters ---
  function shortAddr(a){ return a ? a.slice(0,6) + '…' + a.slice(-4) : '—'; }
  function etherscanBase(){
    if (CHAIN_ID === 1) return 'https://etherscan.io';
    if (CHAIN_ID === 11155111) return 'https://sepolia.etherscan.io';
    if (CHAIN_ID === 5) return 'https://goerli.etherscan.io';
    return 'https://etherscan.io';
  }
  function etherscanAddr(a){ return etherscanBase() + '/address/' + a; }

  // --- Description (short, more informative) ---
  function updateDescription(){
    const el = pick(['#pondDesc','[data-pond-desc]']);
    if (!el) return;
    setText(el,
      'Live staking dashboard for the FreshFrogs pond — total frogs staked, active controller, and cumulative $FLYZ rewards.'
    );
  }

  // --- Controller KPI (🧰 Controller) ---
  function renderController(){
    const ctrl = CFG.CONTROLLER_ADDRESS || '';
    const target = pick(['#pondController','[data-kpi="controller"]']);
    if (!target) return;

    if (!ctrl){
      // show placeholder if address missing
      setHTML(target, '🧰 Controller<br><span class="pg-muted">Staking contract • </span>—');
      return;
    }
    const html =
      '🧰 Controller<br>' +
      '<span class="pg-muted">Staking contract • </span>' +
      `<a href="${etherscanAddr(ctrl)}" target="_blank" rel="noopener">${shortAddr(ctrl)}</a>`;
    setHTML(target, html);
  }

  // --- % of Collection Staked (4th KPI) ---
  function parseStakedCount(){
    // Try a few likely locations and parse an integer
    const src = pick(['[data-kpi="staked"]', '#pondKpiStaked', '#pondStakedCount']);
    if (!src) return null;
    const txt = (src.textContent || '').replace(/[, ]+/g,' ').trim();
    // Try to extract last number in the string
    const m = txt.match(/(\d[\d,\.]*)\s*$/);
    const raw = m ? m[1] : txt;
    const val = Number(String(raw).replace(/[^\d.-]/g,''));
    return Number.isFinite(val) ? val : null;
    // Note: If your staked KPI is a pure number, this will grab it cleanly.
  }

  function ensurePctKpiSlot(){
    // Try existing placeholders
    let el = pick(['#pondKpiStakedPct','[data-kpi="stakedPct"]']);
    if (el) return el;

    // Try to inject a new KPI box if we can find the KPI grid container
    const grid = $('.pond-kpis, .pond-kpi-grid, .kpi-grid, .info-grid-2, .info-grid-4, .page-kpis');
    if (!grid) return null;

    el = document.createElement('div');
    el.id = 'pondKpiStakedPct';
    el.setAttribute('data-kpi','stakedPct');
    el.className = 'kpi'; // trust your existing styles; falls back harmlessly
    grid.appendChild(el);
    return el;
  }

  function renderStakedPct(){
    const slot = ensurePctKpiSlot();
    if (!slot) return;

    const stakedCount = parseStakedCount();
    if (!TOTAL_SUPPLY || !Number.isFinite(stakedCount) || stakedCount < 0){
      // No data => show muted dash
      setHTML(slot, '📊 Collection Staked<br><span class="pg-muted">—</span>');
      return;
    }
    const pct = Math.max(0, Math.min(100, (stakedCount / TOTAL_SUPPLY) * 100));
    const pretty = pct.toFixed(pct < 1 ? 2 : 1) + '%';
    setHTML(slot, '📊 Collection Staked<br><span class="pg-muted">' + pretty + '</span>');
  }

  // --- Boot ---
  function init(){
    try {
      updateDescription();
      renderController();
      renderStakedPct();
    } catch (e) {
      console.warn('[pond-kpis] init failed', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
