// assets/js/pond-kpis.js — Reservoir-based fill (no ABI required)
(function () {
  'use strict';

  // --- Known constants ---
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // Fallbacks so the KPIs work even if config.js hasn't hydrated yet
  const FALLBACK_CONTROLLER = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const FALLBACK_COLLECTION = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';

  // --- DOM helpers ---
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // --- Formatting helpers ---
  const shorten = (addr) => !addr ? '—' : String(addr).slice(0,6) + '…' + String(addr).slice(-4);
  function formatInt(v){
    try {
      if (v && typeof v === 'object' && 'toString' in v) v = v.toString();
      if (typeof v === 'string') {
        if (v.includes('.')) v = v.split('.')[0];
        return Number.isSafeInteger(+v) ? (+v).toLocaleString() : v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      if (typeof v === 'bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (typeof v === 'number') return Math.floor(v).toLocaleString();
      return String(v ?? '—');
    } catch { return String(v ?? '—'); }
  }

  // --- Config discovery ---
  function getCollection(){ return window?.CFG?.COLLECTION_ADDRESS || FALLBACK_COLLECTION; }
  function getController(){
    return window?.CFG?.CONTROLLER_ADDRESS
        || window?.CONFIG?.CONTROLLER_ADDRESS
        || window?.FF_CONFIG?.CONTROLLER_ADDRESS
        || FALLBACK_CONTROLLER;
  }
  function apiHeaders(){
    const h = { accept: '*/*' };
    const key = window?.CFG?.FROG_API_KEY || window?.RESERVOIR_API_KEY;
    if (key) h['x-api-key'] = key;
    return h;
  }

  // --- UI priming (emoji, links, remove Notes, blurb) ---
  function primeUI(){
    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Frogs Staked';

    const third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third) {
      const label = third.querySelector('.ik');
      if (label) label.textContent = '🪙 Rewards';
      const iv = third.querySelector('.iv');
      if (iv) {
        let a = iv.querySelector('#pondRewardsLink');
        if (!a) {
          a = document.createElement('a');
          a.id = 'pondRewardsLink';
          a.target = '_blank';
          a.rel = 'noopener';
          a.href = FLYZ_URL;
          a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          iv.textContent = '';
          iv.appendChild(a);
        } else {
          a.href = FLYZ_URL;
          a.target = '_blank';
          a.rel = 'noopener';
          if (!a.querySelector('#pondRewardsSymbol')) {
            a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          }
        }
      }
    }

    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove(); // remove Notes if present
  }

  // --- Fill Controller box ---
  function fillControllerBox(){
    const a = $('#stakedController');
    const addr = getController();
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // --- Fetch total staked using Reservoir ---
  // Preferred: /owners/v2?collection=<>&owner=<>
  async function fetchTotalStakedOwners(){
    const owner = getController();
    const collection = getCollection();
    const url = `https://api.reservoir.tools/owners/v2?collection=${collection}&owner=${owner}&limit=1`;
    const res = await fetch(url, { method: 'GET', headers: apiHeaders() });
    if (!res.ok) throw new Error(`owners/v2 ${res.status}`);
    const j = await res.json();

    // Try several shapes used by Reservoir over time
    // j.owners[0].tokenCount  OR  j.ownerships[0].tokenCount  OR  j.owners[0].ownership?.tokenCount
    const arr = j.owners || j.ownerships || [];
    if (arr.length) {
      const first = arr[0];
      const count = first.tokenCount ?? first?.ownership?.tokenCount ?? first?.ownerships?.[0]?.tokenCount;
      if (typeof count !== 'undefined' && count !== null) return Number(count);
    }
    // If API shape different, fall back to slow path
    throw new Error('owners/v2 missing tokenCount');
  }

  // Fallback: paginate /tokens/v10?collection=<>&owner=<>
  async function fetchTotalStakedByPaging(){
    const owner = getController();
    const collection = getCollection();
    let continuation = null;
    let total = 0;
    let safety = 0; // hard cap to avoid infinite loops

    do {
      const base = `https://api.reservoir.tools/tokens/v10?collection=${collection}&owner=${owner}&limit=1000&includeTopBid=false`;
      const url = continuation ? `${base}&continuation=${encodeURIComponent(continuation)}` : base;
      const res = await fetch(url, { method: 'GET', headers: apiHeaders() });
      if (!res.ok) throw new Error(`tokens/v10 ${res.status}`);
      const j = await res.json();
      const items = j.tokens || [];
      total += items.length;
      continuation = j.continuation || null;
      safety++;
      // stop after 10k just in case (your supply is 4040)
      if (safety > 10) break;
    } while (continuation);

    return total;
  }

  async function fillTotalStaked(){
    const outEl = $('#stakedTotal');
    if (!outEl) return;

    try {
      // Try owners endpoint first (fast, aggregated)
      const count = await fetchTotalStakedOwners();
      outEl.textContent = formatInt(count);
      return;
    } catch(e) {
      // console.warn('owners/v2 failed, falling back:', e);
    }

    try {
      // Fallback to paging tokens
      const count = await fetchTotalStakedByPaging();
      outEl.textContent = formatInt(count);
      return;
    } catch(e) {
      console.warn('tokens/v10 fallback failed:', e);
    }

    // If both fail, leave as —
    if (!outEl.textContent || outEl.textContent.trim() === '') outEl.textContent = '—';
  }

  async function refresh(){
    primeUI();
    fillControllerBox();
    await fillTotalStaked();
  }

  // public handle if you need to force refresh from elsewhere
  window.PondKPIs = { refresh };

  function kick(){ refresh().catch(()=>{}); }
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
