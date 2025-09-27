// assets/js/pond-kpis.js — 🪷 Total Staked, 🧰 Controller (linked), 🪰 $FLYZ (linked)
(function () {
  'use strict';

  const CFG = (window.CFG || window.FF_CFG || {});
  const CONTRACT =
    String(CFG.COLLECTION_ADDRESS || '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b').toLowerCase();
  const CONTROLLER =
    String(CFG.CONTROLLER_ADDRESS || (CFG.CONTROLLER_ADDRESSES && CFG.CONTROLLER_ADDRESSES[0]) || '0xcb1ee125cff4051a10a55a09b10613876c4ef199').toLowerCase();
  const API_KEY = CFG.RESERVOIR_API_KEY || null;

  const HEADERS = { accept: '*/*' };
  if (API_KEY) HEADERS['x-api-key'] = API_KEY;

  const $ = (s, r) => (r||document).querySelector(s);
  const cut = a => (a && a.length > 10) ? (a.slice(0,6)+'…'+a.slice(-4)) : (a || '');
  const fmt = n => { try { return (+n).toLocaleString(); } catch { return String(n); } };

  function setLabels(){
    // 1) 🪷 Total Staked
    const b1 = $('.info-grid-2 .info-block:nth-child(1)');
    if (b1){
      const ik = $('.ik', b1); if (ik) ik.textContent = '🪷 Total Staked';
      const inn = $('.in', b1); if (inn) inn.textContent = 'Across the collection';
    }

    // 2) 🧰 Controller (linked)
    const b2 = $('.info-grid-2 .info-block:nth-child(2)');
    if (b2){
      const ik = $('.ik', b2); if (ik) ik.textContent = '🧰 Controller';
      const iv = $('.iv', b2);
      const inn = $('.in', b2);
      if (iv){
        iv.innerHTML = `<a href="https://etherscan.io/address/${CONTROLLER}" target="_blank" rel="noopener">${cut(CONTROLLER)}</a>`;
      }
      if (inn) inn.textContent = 'Staking contract';
    }

    // 3) 🪰 Rewards → $FLYZ linked
    const b3 = $('.info-grid-2 .info-block:nth-child(3)');
    if (b3){
      const ik = $('.ik', b3); if (ik) ik.textContent = '🪰 Rewards';
      const iv = $('.iv', b3);
      const inn = $('.in', b3);
      if (iv){
        iv.innerHTML = `<a href="https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63" target="_blank" rel="noopener">$FLYZ</a>`;
      }
      if (inn) inn.textContent = 'Earnings token';
    }
  }

  // Optional: Reservoir fallback for total staked (owners/v2; limit=3)
  function fetchStakedViaReservoir(){
    const url = 'https://api.reservoir.tools/owners/v2'
      + '?collection=' + encodeURIComponent(CONTRACT)
      + '&limit=3&sortBy=tokenCount&sortDirection=desc';
    return fetch(url, { method:'GET', headers: HEADERS })
      .then(r => { if (!r.ok) throw new Error('owners/v2 '+r.status); return r.json(); })
      .then(j => {
        const owners = Array.isArray(j.owners) ? j.owners : [];
        const row = owners.find(o => String(o.address||'').toLowerCase() === CONTROLLER);
        const cnt = row?.ownership?.tokenCount ?? row?.tokenCount;
        return (cnt == null) ? null : Number(cnt);
      })
      .catch(() => null);
  }

  function putTotal(n){
    const out = document.getElementById('stakedTotal')
      || $('.info-grid-2 .info-block:nth-child(1) .iv');
    if (!out) return;
    out.textContent = (n == null) ? '—' : fmt(n);
  }

  async function init(){
    setLabels();
    // If your own code already sets the total, leave it; otherwise try Reservoir:
    const current = ($('.info-grid-2 .info-block:nth-child(1) .iv')||{}).textContent || '';
    if (!current || current.trim()==='—' || current.trim()===''){
      putTotal('…');
      const n = await fetchStakedViaReservoir();
      putTotal(n);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
})();
