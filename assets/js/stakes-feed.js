// assets/js/stakes-feed.js
// Pond — Recent Staking Activity (Reservoir users+collection filter)
// Renders into <ul id="recentStakes"> using existing .row / .pill styles.
// No visual changes.

(function(){
  'use strict';

  // --- Config ---------------------------------------------------------------
  const C    = (window.FF_CFG || {});
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const CTRL = (C.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLL = (C.COLLECTION_ADDRESS || '').toLowerCase();

  const LIST_ID   = 'recentStakes';
  const PAGE_SIZE = 20;

  // --- DOM helpers ----------------------------------------------------------
  const $  = (sel) => document.querySelector(sel);
  const el = (id)  => document.getElementById(id);

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
    li.className = 'row';
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

  // --- Data fetch (Reservoir) -----------------------------------------------
  async function fetchActivityPage(continuation=null){
    if (!CTRL) throw new Error('Missing FF_CFG.CONTROLLER_ADDRESS');
    if (!COLL) throw new Error('Missing FF_CFG.COLLECTION_ADDRESS');

    const qs = new URLSearchParams({
      users: C.CONTROLLER_ADDRESS,
      collection: C.COLLECTION_ADDRESS,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${HOST}/users/activity/v6?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) }
    });
    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(`Reservoir ${res.status}: ${t.slice(0,160)}`);
    }
    const j = await res.json();

    // Robust mapping: support event.from/to OR top-level fromAddress/toAddress
    const rows = (j.activities || []).flatMap(a => {
      const type = a.event?.kind || a.type;           // "transfer"
      if (type !== 'transfer') return [];
      const from = (a.event?.fromAddress || a.fromAddress || a.from || '').toLowerCase();
      const to   = (a.event?.toAddress   || a.toAddress   || a.to   || '').toLowerCase();

      let kind = null;
      if (to === CTRL)        kind = 'stake';
      else if (from === CTRL) kind = 'unstake';
      else return [];

      return [{
        kind,
        tokenId: Number(a.token?.tokenId ?? a.tokenId) || null,
        tx: a.txHash || a.transactionHash || null,
        timestamp: a.timestamp || null
      }];
    });

    return { rows, continuation: j.continuation || null };
  }

  // --- Mount / infinite scroll ---------------------------------------------
  let cont = null, busy = false, booted = false, listEl = null;

  async function loadPage(){
    if (busy) return;
    if (!listEl) listEl = el(LIST_ID) || $('[data-pond-list]');
    if (!listEl) return;

    busy = true;
    try{
      const out = await fetchActivityPage(cont);
      cont = out.continuation || null;

      if (!booted){
        listEl.innerHTML = '';
        listEl.classList.add('scrolling'); // you already style this id
        booted = true;
      }

      const frag = document.createDocumentFragment();
      (out.rows || []).forEach(r => { if (r && r.tokenId != null) frag.appendChild(renderRow(r)); });
      if (!frag.childNodes.length && !cont && !listEl.children.length){
        listEl.innerHTML = `<li class="row"><div class="pg-muted">No recent stakes/unstakes found.</div></li>`;
      } else {
        listEl.appendChild(frag);
      }
    } catch(e){
      console.warn('[pond] recent activity failed:', e);
      if (!booted && listEl){
        const hint = (location.protocol === 'file:' ? ' (file:// origin blocked)' : '');
        listEl.innerHTML = `<li class="row"><div class="pg-muted">Unable to load recent activity${hint}. Check API key / origin.</div></li>`;
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

  // Public hook already called in your collection.html
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
