// assets/js/stakes-feed.js
// Pond "Recent Staking Activity" — uses Reservoir /users/activity/v6
// No visual changes: renders into <ul id="recentStakes"> using your .row styles.

(function(){
  'use strict';

  // --- Config ---------------------------------------------------------------
  const C = (window.FF_CFG || {});
  const RES_HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';

  const LIST_ID = 'recentStakes';
  const PAGE_SIZE = 20; // reservoir max per call is 20 for this endpoint

  // --- DOM helpers ----------------------------------------------------------
  function $(sel){ return document.querySelector(sel); }
  function el(id){ return document.getElementById(id); }

  function fmtAgo(tsSec){
    if (!tsSec) return '';
    const ms = Date.now() - (tsSec*1000);
    const d = Math.floor(ms/86400000);
    if (d > 0) return `${d}d ago`;
    const h = Math.floor((ms%86400000)/3600000);
    if (h > 0) return `${h}h ago`;
    const m = Math.max(0, Math.floor((ms%3600000)/60000));
    return `${m}m ago`;
  }

  function renderRow(row){
    const li = document.createElement('li');
    li.className = 'row'; // matches your CSS
    const pillClass = row.kind === 'stake' ? 'pill-green' : 'pill-gray';
    const label = row.kind === 'stake' ? 'Staked' : 'Unstaked';
    const ago = fmtAgo(row.timestamp);
    const scan = row.tx ? `https://etherscan.io/tx/${row.tx}` : null;

    li.innerHTML = `
      <div class="mono">#${row.tokenId}</div>
      <div class="muted">${ago}</div>
      <div class="pill ${pillClass}" style="margin-left:auto;">${label}</div>
    `;
    if (scan) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', ()=> window.open(scan, '_blank'));
    }
    return li;
  }

  // --- Data fetch (Reservoir activity) --------------------------------------
  async function fetchActivityPage(controllerAddr, continuation=null){
    const ctrl = (controllerAddr || '').toLowerCase();
    if (!ctrl) throw new Error('Missing FF_CFG.CONTROLLER_ADDRESS');

    const qs = new URLSearchParams({
      users: controllerAddr,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${RES_HOST}/users/activity/v6?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) },
      // Note: from file:// this will fail (Origin:null). Use http://localhost or Pages.
    });
    if (!res.ok) throw new Error(`Reservoir HTTP ${res.status}`);
    const j = await res.json();

    const rows = (j.activities || []).flatMap(a => {
      const ev = a.event || {};
      if (ev.kind !== 'transfer') return [];
      const from = (ev.fromAddress||'').toLowerCase();
      const to   = (ev.toAddress||'').toLowerCase();
      let kind = null;
      if (to === ctrl) kind = 'stake';
      else if (from === ctrl) kind = 'unstake';
      else return [];
      return [{
        kind,
        tokenId: Number(a.token?.tokenId) || null,
        tx: a.txHash || null,
        timestamp: a.timestamp || null
      }];
    });

    return { rows, continuation: j.continuation || null };
  }

  // --- Mount / infinite scroll ---------------------------------------------
  let cont = null;
  let busy = false;
  let booted = false;
  let listEl = null;

  async function loadPage(){
    if (busy) return;
    if (!listEl) listEl = el(LIST_ID) || $('[data-pond-list]');
    if (!listEl) return;

    busy = true;
    try{
      const out = await fetchActivityPage(C.CONTROLLER_ADDRESS, cont);
      cont = out.continuation || null;

      if (!booted){
        listEl.innerHTML = '';
        // Make scrollable if lots of rows (matches your CSS)
        listEl.classList.add('scrolling');
        booted = true;
      }

      const frag = document.createDocumentFragment();
      (out.rows || []).forEach(r => { if (r && r.tokenId != null) frag.appendChild(renderRow(r)); });
      listEl.appendChild(frag);
    } catch(e){
      console.warn('[pond] recent activity failed:', e);
      if (!booted && listEl){
        listEl.innerHTML = `<li class="row"><div class="pg-muted">Unable to load recent activity.</div></li>`;
      }
    } finally {
      busy = false;
    }
  }

  function attachInfiniteScroll(){
    const wrap = el('pondListWrap') || (listEl ? listEl.parentElement : null) || window;
    const target = wrap === window ? document.documentElement : wrap;

    function onScroll(){
      const nearBottom = (wrap === window)
        ? (window.scrollY + window.innerHeight >= target.scrollHeight - 200)
        : (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 50);
      if (nearBottom && cont) loadPage();
    }
    wrap.addEventListener('scroll', onScroll);
  }

  // Public hook you already call in collection.html
  window.FF_loadRecentStakes = function(){
    listEl = el(LIST_ID) || $('[data-pond-list]');
    if (!listEl) return;
    loadPage();
    attachInfiniteScroll();
  };

  // Also auto-boot (harmless if you keep the explicit call)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FF_loadRecentStakes());
  } else {
    window.FF_loadRecentStakes();
  }
})();
