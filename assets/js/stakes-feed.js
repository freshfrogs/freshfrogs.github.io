// assets/js/stakes-feed.js
// Populates the "Recent Stakes" list without changing styles.
// Uses FFAPI + read-only Web3 fallback so no wallet is required.
(function(){
  'use strict';

  // Ensure WEB3 exists for any legacy code that expects it
  if ((!window.WEB3 || !window.WEB3.eth) && window.FFAPI) {
    const w3 = window.FFAPI.getWeb3Read && window.FFAPI.getWeb3Read();
    if (w3) window.WEB3 = w3;
  }

  function el(id){ return document.getElementById(id); }
  const list = el('recentStakes');
  if (!list) return;

  let cont = null, busy = false, booted = false;

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
    li.className = 'row';
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

  async function loadPage(){
    if (busy) return; busy = true;
    try{
      const got = await window.FFAPI.fetchPondActivityPage(cont, 20);
      cont = got.continuation || null;

      // Clear placeholder on first real load
      if (!booted){
        list.innerHTML = '';
        booted = true;
      }

      const frag = document.createDocumentFragment();
      (got.rows || []).forEach(r => { if (r && r.tokenId != null) frag.appendChild(renderRow(r)); });
      list.appendChild(frag);
    } catch(e){
      console.warn('[pond] load activity failed', e);
      if (!booted){
        list.innerHTML = `<li class="row"><div class="pg-muted">Unable to load recent activity.</div></li>`;
      }
    } finally { busy = false; }
  }

  // Public hook already called by collection.html
  window.FF_loadRecentStakes = function(){
    loadPage();

    // simple infinite scroll (list container or page)
    const wrap = el('pondListWrap') || list.parentElement || window;
    const target = wrap === window ? document.documentElement : wrap;

    function onScroll(){
      const nearBottom = (wrap === window)
        ? (window.scrollY + window.innerHeight >= target.scrollHeight - 200)
        : (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 50);
      if (nearBottom && cont) loadPage();
    }
    wrap.addEventListener('scroll', onScroll);
  };
})();
