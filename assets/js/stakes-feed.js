// assets/js/stakes-feed.js
// Recent Staking Activity (Reservoir) — mirrors mints-feed style.
// Renders into <ul id="recentStakes"> using your existing .row / .pill styles.

(function () {
  'use strict';

  // --- Config ---------------------------------------------------------------
  const C     = window.FF_CFG || {};
  const HOST  = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY   = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const CTRL  = (C.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLL  = (C.COLLECTION_ADDRESS || '').toLowerCase();
  const LIMIT = 20;

  // --- DOM helpers ----------------------------------------------------------
  const $  = s => document.querySelector(s);
  const el = id => document.getElementById(id);

  function fmtAgo(ts){
    if (!ts) return '';
    const ms = Date.now() - ts * 1000;
    const d = Math.floor(ms / 86400000); if (d > 0) return `${d}d ago`;
    const h = Math.floor(ms % 86400000 / 3600000); if (h > 0) return `${h}h ago`;
    const m = Math.max(0, Math.floor(ms % 3600000 / 60000)); return `${m}m ago`;
  }

  function rowHTML({ kind, tokenId, tx, timestamp }) {
    const pill = kind === 'stake' ? 'pill-green' : 'pill-gray';
    const label = kind === 'stake' ? 'Staked' : 'Unstaked';
    const ago = fmtAgo(timestamp);
    return `
      <div class="mono">#${tokenId}</div>
      <div class="muted">${ago}</div>
      <div class="pill ${pill}" style="margin-left:auto;">${label}</div>
    `;
  }

  function renderRow(targetUL, data) {
    const li = document.createElement('li');
    li.className = 'row';
    li.innerHTML = rowHTML(data);
    if (data.tx) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => window.open(`https://etherscan.io/tx/${data.tx}`, '_blank'));
    }
    targetUL.appendChild(li);
  }

  // --- Fetch (users + collection + transfer) --------------------------------
  async function fetchPage(continuation = null) {
    if (!CTRL) throw new Error('Missing FF_CFG.CONTROLLER_ADDRESS');
    if (!COLL) throw new Error('Missing FF_CFG.COLLECTION_ADDRESS');

    const qs = new URLSearchParams({
      users: C.CONTROLLER_ADDRESS,
      collection: C.COLLECTION_ADDRESS,
      types: 'transfer',
      limit: String(LIMIT)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${HOST}/users/activity/v6?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) }
    });
    if (!res.ok) throw new Error(`Reservoir ${res.status}`);

    const j = await res.json();

    // Robust address extraction: event.* or top-level *Address/* fields
    const rows = (j.activities || []).flatMap(a => {
      const type = a.event?.kind || a.type;
      if (type !== 'transfer') return [];
      const from = (a.event?.fromAddress || a.fromAddress || a.from || '').toLowerCase();
      const to   = (a.event?.toAddress   || a.toAddress   || a.to   || '').toLowerCase();

      let kind = null;
      if (to === CTRL) kind = 'stake';
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

  // --- Mount + infinite scroll ----------------------------------------------
  let cont = null, busy = false, booted = false, listEl = null;

  async function loadPage() {
    if (busy) return;
    if (!listEl) listEl = el('recentStakes') || $('[data-pond-list]');
    if (!listEl) return;

    busy = true;
    try {
      const { rows, continuation } = await fetchPage(cont);
      cont = continuation;

      if (!booted) {
        listEl.innerHTML = '';
        listEl.classList.add('scrolling'); // matches your CSS
        booted = true;
      }

      if (!rows.length && !cont && !listEl.children.length) {
        listEl.innerHTML = `<li class="row"><div class="pg-muted">No recent stakes/unstakes found.</div></li>`;
        return;
      }

      const frag = document.createDocumentFragment();
      rows.forEach(r => { if (r && r.tokenId != null) renderRow(frag, r); });
      listEl.appendChild(frag);
    } catch (e) {
      console.warn('[pond] recent activity failed:', e);
      if (!booted && listEl) {
        const hint = location.protocol === 'file:' ? ' (file:// origin blocked)' : '';
        listEl.innerHTML = `<li class="row"><div class="pg-muted">Unable to load recent activity${hint}. Check API key / origin.</div></li>`;
      }
    } finally { busy = false; }
  }

  function attachInfiniteScroll() {
    const wrap = el('pondListWrap') || (listEl ? listEl.parentElement : null) || window;
    const target = wrap === window ? document.documentElement : wrap;
    wrap.addEventListener('scroll', () => {
      const nearBottom = (wrap === window)
        ? (window.scrollY + window.innerHeight >= target.scrollHeight - 200)
        : (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 50);
      if (nearBottom && cont) loadPage();
    });
  }

  // Public init (same as index.html feed)
  window.FF_loadRecentStakes = function () {
    listEl = el('recentStakes') || $('[data-pond-list]');
    if (!listEl) return;
    loadPage();
    attachInfiniteScroll();
  };

  // Auto-boot (safe if you also call it explicitly)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FF_loadRecentStakes && window.FF_loadRecentStakes());
  } else {
    window.FF_loadRecentStakes && window.FF_loadRecentStakes();
  }
})();
