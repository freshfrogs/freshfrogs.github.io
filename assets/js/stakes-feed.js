// assets/js/stakes-feed.js
// Populates the Pond "Recent Activity" list (stake/unstake via Reservoir).
(function(){
  'use strict';

  // Ensure WEB3 exists for any legacy code that expects it
  if ((!window.WEB3 || !window.WEB3.eth) && window.FFAPI) {
    const w3 = window.FFAPI.getWeb3Read && window.FFAPI.getWeb3Read();
    if (w3) window.WEB3 = w3;
  }

  function $(sel){ return document.querySelector(sel); }
  function findListEl(){
    // Support both markup variants:
    //  - <ul id="recentStakes">…</ul>
    //  - <ul id="pondList">…</ul>
    return $('#recentStakes') || $('#pondList') || $('[data-pond-list]') || null;
  }

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

  function renderRow(r){
    const li = document.createElement('li');
    li.className = 'row'; // matches your existing CSS
    const pillClass = r.kind === 'stake' ? 'pill-green' : 'pill-gray';
    const label = r.kind === 'stake' ? 'Staked' : 'Unstaked';
    const ago = fmtAgo(r.timestamp);
    const scan = r.tx ? `https://etherscan.io/tx/${r.tx}` : null;

    li.innerHTML = `
      <div class="mono">#${r.tokenId}</div>
      <div class="muted">${ago}</div>
      <div class="pill ${pillClass}" style="margin-left:auto;">${label}</div>
    `;
    if (scan) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', ()=> window.open(scan, '_blank'));
    }
    return li;
  }

  let cont = null, busy = false, booted = false, listEl = null;

  async function loadPage(){
    if (!window.FFAPI) return;
    if (!listEl) listEl = findListEl();
    if (!listEl || busy) return;
    busy = true;
    try{
      const got = await window.FFAPI.fetchPondActivityPage(cont, 20);
      cont = got.continuation || null;

      if (!booted){
        listEl.innerHTML = '';
        booted = true;
      }

      const frag = document.createDocumentFragment();
      (got.rows || []).forEach(r => {
        if (r && r.tokenId != null) frag.appendChild(renderRow(r));
      });
      listEl.appendChild(frag);
    } catch(e){
      console.warn('[pond] load activity failed', e);
      if (!booted && listEl){
        listEl.innerHTML = `<li class="row"><div class="pg-muted">Unable to load recent activity.</div></li>`;
      }
    } finally {
      busy = false;
    }
  }

  function attachInfiniteScroll(){
    const wrap = $('#pondListWrap') || (listEl ? listEl.parentElement : null) || window;
    const target = wrap === window ? document.documentElement : wrap;

    function onScroll(){
      const nearBottom = (wrap === window)
        ? (window.scrollY + window.innerHeight >= target.scrollHeight - 200)
        : (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 50);
      if (nearBottom && cont) loadPage();
    }
    wrap.addEventListener('scroll', onScroll);
  }

  // Public hook (kept for backward compatibility)
  window.FF_loadRecentStakes = function(){
    listEl = findListEl();
    if (!listEl) return;
    loadPage();
    attachInfiniteScroll();
  };

  // Also auto-boot when DOM is ready (in case the page forgot to call the hook)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FF_loadRecentStakes());
  } else {
    window.FF_loadRecentStakes();
  }
})();
