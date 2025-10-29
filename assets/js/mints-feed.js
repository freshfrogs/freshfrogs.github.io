// assets/js/mints-feed.js
// Renders recent mints as frog cards with a load-more button.
(function (FF, CFG) {
  const ROOT_ID = 'recentMints';
  const MORE_ID = 'recentMintsMore';
  const STATUS_ID = 'recentMintsStatus';
  const REFRESH_ID = 'recentMintsRefresh';

  const PAGE_SIZE = Math.max(1, Math.min(36, Number(CFG.PAGE_SIZE || 6)));
  const MAX_PAGES = Math.max(1, Number(CFG.MAX_PAGES || 6));
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);

  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago = (d)=> d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime())+' ago' : d.toLocaleString()) : '';
  const imgFor = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';
  const metaFor = (id)=> (CFG.SOURCE_PATH || '') + '/frog/json/' + id + '.json';

  const root = document.getElementById(ROOT_ID);
  const moreWrap = document.getElementById(MORE_ID);
  const moreBtn = moreWrap ? moreWrap.querySelector('button') : null;
  const statusEl = document.getElementById(STATUS_ID);
  const refreshBtn = document.getElementById(REFRESH_ID);

  if (!root) return;

  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return CFG.ETHERSCAN_TX_BASE.replace(/\/+$/,'') + '/' + hash;
    const base =
      CHAIN_ID === 1        ? 'https://etherscan.io/tx/' :
      CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/tx/' :
      CHAIN_ID === 5        ? 'https://goerli.etherscan.io/tx/' :
                              'https://etherscan.io/tx/';
    return base + hash;
  }

  async function pondFetchMints({ collection, limit, continuation }){
    if (!FF.pond) return null;
    const fns = [
      FF.pond.fetchMintsActivity,
      FF.pond.fetchMintActivity,
      FF.pond.fetchActivityMints,
      FF.pond.activityMints,
      FF.pond.getMintActivity,
      FF.pond.getActivityMints
    ].filter(fn => typeof fn === 'function');
    for (const fn of fns){
      try { const out = await fn({ collection, limit, continuation }); if (out) return out; } catch {}
    }
    return null;
  }

  function mapRow(a){
    let tokenId = null;
    let from = '';
    let to = '';
    let ts = null;
    let tx = null;

    if (a && a.token && a.token.tokenId != null){
      tokenId = Number(a.token.tokenId);
      from = (a.fromAddress || '').toLowerCase();
      to   = (a.toAddress   || '').toLowerCase();
      ts   = a.timestamp ?? a.createdAt;
      tx   = a.txHash || a.transactionHash || null;
    } else if (a && typeof a.id !== 'undefined'){
      tokenId = Number(a.id);
      from = (a.from || '').toLowerCase();
      to   = (a.to   || '').toLowerCase();
      ts   = a.blockTimestamp || null;
      tx   = a.txHash || null;
    }

    if (!Number.isFinite(tokenId)) return null;
    const zero = '0x0000000000000000000000000000000000000000';
    const isMint = from === zero || String(a?.type||'').toLowerCase()==='mint';
    if (!isMint) return null;

    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!Number.isNaN(p)) dt = new Date(p); }
    return { id: tokenId, to: to || null, time: dt, img: imgFor(tokenId), tx };
  }

  async function fetchPage(cont){
    const pond = await pondFetchMints({ collection: CFG.COLLECTION_ADDRESS, limit: PAGE_SIZE, continuation: cont });
    if (pond){
      const rows = (pond.activities || pond.rows || []).map(mapRow).filter(Boolean);
      return { rows, continuation: pond.continuation || null };
    }
    if (!window.FF_ALCH) throw new Error('Alchemy helper not loaded');
    const { transfers, pageKey } = await window.FF_ALCH.getCollectionTransfers({
      pageKey: cont || undefined,
      maxCount: PAGE_SIZE * 4,
      order: 'desc'
    });
    const rows = transfers.map(mapRow).filter(Boolean);
    return { rows, continuation: pageKey || null };
  }

  function setStatus(text){
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.display = text ? 'block' : 'none';
  }

  function showLoading(v){
    if (v) {
      if (statusEl) statusEl.style.display = 'block';
      setStatus('Loading…');
    } else {
      if (statusEl) statusEl.style.display = 'none';
    }
  }

  let items = [];
  let continuation = null;
  let pageCount = 0;
  let loading = false;

  function renderCards(){
    root.innerHTML = '';
    if (!items.length){
      const empty = document.createElement('div');
      empty.className = 'pg-muted';
      empty.textContent = 'No recent mints yet.';
      root.appendChild(empty);
      if (moreWrap) moreWrap.style.display = 'none';
      return;
    }

    for (const it of items){
      const card = document.createElement('article');
      card.className = 'frog-card';
      const metaParts = [];
      if (it.to) metaParts.push('Owner ' + shorten(it.to));
      if (it.time) metaParts.push(ago(it.time));
      const metaLine = metaParts.join(' • ');
      const txHref = txUrl(it.tx);
      const imgHref = imgFor(it.id);
      const metaHref = metaFor(it.id);

      card.innerHTML = `
        <img class="thumb" src="${imgHref}" alt="Frog #${it.id}">
        <h4 class="title">Frog #${it.id} <span class="pill">Minted</span></h4>
        <div class="meta">${metaLine || 'Mint detected on chain.'}</div>
        <div class="actions">
          <button class="btn btn-outline-gray" type="button" data-modal>View details</button>
          ${txHref ? `<a class="btn btn-outline-gray" href="${txHref}" target="_blank" rel="noopener">Etherscan</a>` : ''}
          <a class="btn btn-outline-gray" href="${imgHref}" target="_blank" rel="noopener">Image</a>
          <a class="btn btn-outline-gray" href="${metaHref}" target="_blank" rel="noopener">Metadata</a>
        </div>
      `;

      card.querySelector('[data-modal]')?.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        if (FF.openFrogModal) FF.openFrogModal({ id: it.id });
      });

      card.addEventListener('click', (ev)=>{
        if (ev.target.closest('.actions a, .actions button')) return;
        if (FF.openFrogModal) FF.openFrogModal({ id: it.id });
      });

      root.appendChild(card);
    }

    if (moreWrap){
      moreWrap.style.display = continuation ? 'block' : 'none';
      if (moreBtn) moreBtn.disabled = loading;
    }
  }

  async function loadFirstPage(){
    if (loading) return;
    loading = true;
    showLoading(true);
    if (moreBtn) moreBtn.disabled = true;
    try {
      const first = await fetchPage(null);
      items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation;
      pageCount = 1;
      renderCards();
      showLoading(false);
      if (!items.length) setStatus('No recent mints yet.');
    } catch (err){
      console.warn('[mints] failed', err);
      root.innerHTML = '<div class="pg-muted">Could not load recent mints.</div>';
      setStatus('');
    } finally {
      loading = false;
      if (moreBtn) moreBtn.disabled = false;
    }
  }

  async function loadNextPage(){
    if (!continuation || loading || pageCount >= MAX_PAGES) return;
    loading = true;
    if (moreBtn) moreBtn.disabled = true;
    showLoading(true);
    try {
      const next = await fetchPage(continuation);
      continuation = next.continuation;
      pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      renderCards();
    } catch (err){
      console.warn('[mints] next page failed', err);
      setStatus('Could not load more.');
    } finally {
      loading = false;
      showLoading(false);
      if (moreBtn) moreBtn.disabled = false;
    }
  }

  refreshBtn?.addEventListener('click', ()=>{ loadFirstPage(); });
  moreBtn?.addEventListener('click', ()=>{ loadNextPage(); });

  window.FF_loadRecentMints = function(){
    loadFirstPage();
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
