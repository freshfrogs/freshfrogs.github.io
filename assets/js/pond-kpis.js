// assets/js/pond-kpis.js — Reservoir-based KPIs (no ABI, no wallet needed)
(function () {
  'use strict';

  // ---- constants ----
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // Fallbacks so KPIs work even if config hasn't hydrated yet
  const FALLBACK_CONTROLLER = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const FALLBACK_COLLECTION = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';

  // ---- dom helpers ----
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // ---- formatting ----
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

  // ---- config discovery ----
  function getCollection(){
    const col = window?.CFG?.COLLECTION_ADDRESS || window?.CONFIG?.COLLECTION_ADDRESS || FALLBACK_COLLECTION;
    return String(col).toLowerCase();
  }
  function getControllers(){
    // Support one or many controller addresses
    const many = window?.CFG?.CONTROLLER_ADDRESSES
              || window?.CONFIG?.CONTROLLER_ADDRESSES
              || window?.FF_CONFIG?.CONTROLLER_ADDRESSES;
    const one  = window?.CFG?.CONTROLLER_ADDRESS
              || window?.CONFIG?.CONTROLLER_ADDRESS
              || window?.FF_CONFIG?.CONTROLLER_ADDRESS
              || FALLBACK_CONTROLLER;
    const arr = (Array.isArray(many) ? many : [one]).filter(Boolean);
    return [...new Set(arr.map(a => String(a).toLowerCase()))];
  }
  function apiHeaders(){
    const h = { accept: '*/*' };
    const key = window?.CFG?.FROG_API_KEY || window?.RESERVOIR_API_KEY;
    if (key) h['x-api-key'] = key; // optional
    return h;
  }

  // ---- UI priming (labels, links, blurb, remove notes, rename header) ----
  function primeUI(){
    // Pond blurb
    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // First KPI label → '🌿 Totak Staked' (requested exact wording)
    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Totak Staked';

    // Rewards → ensure emoji + link to FLYZ
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

    // Remove 4th info box (Notes), if present
    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();

    // Rename "My Frogs (Owned)" → Dashboard (if applicable)
    const heads = Array.from(document.querySelectorAll('#ownedPanel .panel-title, .owned-panel .panel-title, h2.panel-title'));
    const ownedHead = heads.find(h => /My Frogs\s*\(Owned\)/i.test(h.textContent));
    if (ownedHead) ownedHead.textContent = 'Dashboard';
  }

  // ---- controller box fill ----
  function fillControllerBox(){
    const a = $('#stakedController');
    if (!a) return;
    const controllers = getControllers();
    const addr = controllers[0];
    if (!addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // ---- Reservoir fetchers ----
  // Fast aggregate via owners/v2 (sum across controllers if needed)
  async function ownersCount(){
    const collection = getCollection();
    const controllers = getControllers();
    if (!controllers.length) throw new Error('No controller address');

    let total = 0;
    for (const c of controllers){
      const url = `https://api.reservoir.tools/owners/v2?collection=${collection}&owner=${c}&limit=1`;
      const res = await fetch(url, { method:'GET', headers: apiHeaders() });
      if (!res.ok) throw new Error(`owners/v2 ${res.status}`);
      const j = await res.json();
      const row = (j.owners || j.ownerships || [])[0] || {};
      const cnt = row.tokenCount ?? row?.ownership?.tokenCount ?? row?.ownerships?.[0]?.tokenCount ?? 0;
      total += Number(cnt || 0);
    }
    return total;
  }

  // Exact but slower via tokens/v10 paging (sum across controllers)
  async function tokensCount(){
    const collection = getCollection();
    const controllers = getControllers();
    if (!controllers.length) throw new Error('No controller address');

    let grand = 0;
    for (const c of controllers){
      let continuation = null, subtotal = 0, guard = 0;
      do {
        const base = `https://api.reservoir.tools/tokens/v10?collection=${collection}&owner=${c}&limit=1000&includeTopBid=false`;
        const url  = continuation ? `${base}&continuation=${encodeURIComponent(continuation)}` : base;
        const res  = await fetch(url, { method:'GET', headers: apiHeaders() });
        if (!res.ok) throw new Error(`tokens/v10 ${res.status}`);
        const j = await res.json();
        subtotal += (j.tokens || []).length;
        continuation = j.continuation || null;
        guard++;
      } while (continuation && guard < 10); // safety cap (supply 4040)
      grand += subtotal;
    }
    return grand;
  }

  // ---- total staked fill + cross-check ----
  async function fillTotalStaked(){
    const outEl = $('#stakedTotal');
    if (!outEl) return;

    // Try owners (fast)
    let fast = null;
    try { fast = await ownersCount(); } catch(e){ /* fall through */ }

    // Try tokens (exact)
    let slow = null;
    try { slow = await tokensCount(); } catch(e){ /* fall through */ }

    // Decide what to show
    const decided =
      (typeof slow === 'number' && !Number.isNaN(slow)) ? slow :
      (typeof fast === 'number' && !Number.isNaN(fast)) ? fast :
      null;

    if (decided != null) outEl.textContent = formatInt(decided);
    else if (!outEl.textContent || outEl.textContent.trim() === '') outEl.textContent = '—';

    // Optional: if both exist and differ, choose larger and log
    if (typeof fast === 'number' && typeof slow === 'number' && fast !== slow){
      outEl.textContent = formatInt(Math.max(fast, slow));
      console.warn('[PondKPIs] owners vs tokens mismatch', { owners_v2: fast, tokens_v10: slow, shown: outEl.textContent });
    }
  }

  // ---- public API + init ----
  async function refresh(){
    primeUI();
    fillControllerBox();
    await fillTotalStaked();
  }

  window.PondKPIs = { refresh };

  function kick(){ refresh().catch(()=>{}); }
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
