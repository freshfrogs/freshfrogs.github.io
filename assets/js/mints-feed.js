// assets/js/mints-feed.js
// Recent Mints — prefers pond.js helpers if available; otherwise Reservoir fallback.
// Uses a global spaced queue to avoid 429s across modules.
(function (FF, CFG) {
  const UL_ID = 'recentMints';

  // ---- Config
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 5)));
  const MAX_PAGES = Math.max(1, Number(CFG.MAX_PAGES || 8));
  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);

  // ---- Utils
  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime())+' ago' : d.toLocaleString()) : '';
  const imgFor  = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';

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

  // ---- pond adapters (try first)
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

  function ul(){ return document.getElementById(UL_ID); }
  function applyVisibleRows(root){
    if (!root) return;
    root.classList.add('scrolling'); root.style.overflowY='auto';
    const visible = Number(root.getAttribute('data-visible')) || Number(CFG.MINTS_VISIBLE || 6);
    const r0 = root.querySelector('.row'); if (!r0){ root.style.maxHeight=''; return; }
    const gap = parseFloat(getComputedStyle(root).gap || '0') || 0;
    const h = r0.getBoundingClientRect().height || 84;
    root.style.maxHeight = Math.round(h*visible + gap*(visible-1))+'px';
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
    } else if (a && typeof a.id !== 'undefined'){ // Alchemy shape
      tokenId = Number(a.id);
      from = (a.from || '').toLowerCase();
      to   = (a.to   || '').toLowerCase();
      ts   = a.blockTimestamp || null;
      tx   = a.txHash || null;
    }

    if (!isFinite(tokenId)) return null;
    const zero = '0x0000000000000000000000000000000000000000';
    const isMint = from === zero || String(a?.type||'').toLowerCase()==='mint';
    if (!isMint) return null;

    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }
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

  // ---- Render + infinite scroll
  let items=[], continuation=null, pageCount=0, loading=false, io=null;
  function ensureSentinel(root){
    let s = root.querySelector('li[data-sentinel]');
    if (!s){ s=document.createElement('li'); s.setAttribute('data-sentinel','true'); s.className='row'; s.style.justifyContent='center'; s.innerHTML='<div class="pg-muted">Loading more…</div>'; root.appendChild(s); }
    return s;
  }
  function setSentinelText(root, t){ const s=root.querySelector('li[data-sentinel]'); if (s) s.innerHTML = '<div class="pg-muted">'+t+'</div>'; }
  function attachObserver(root){
    if (io) io.disconnect();
    const s = ensureSentinel(root);
    io = new IntersectionObserver(entries=>{
      const e=entries[0]; if (!e||!e.isIntersecting) return;
      if (loading || !continuation || pageCount>=MAX_PAGES) return;
      loadNextPage(root);
    }, { root, rootMargin:'140px', threshold:0.01 });
    io.observe(s);
  }

  function renderAll(root){
    root.innerHTML='';
    if (!items.length){
      root.innerHTML = '<li class="row"><div class="pg-muted">No recent mints yet.</div></li>';
    } else {
      items.forEach(it=>{
        const meta = [ it.to ? '→ '+shorten(it.to) : null, it.time ? ago(it.time) : null ].filter(Boolean).join(' • ');
        const li = document.createElement('li'); li.className='row';
        const href = txUrl(it.tx);
        if (href){ li.title='View transaction on Etherscan'; li.addEventListener('click', ()=> window.open(href,'_blank','noopener')); }
        else { li.addEventListener('click', ()=> FF.openFrogModal && FF.openFrogModal({ id: it.id })); }
        li.innerHTML =
          (FF.thumb64 ? FF.thumb64(it.img, 'Frog '+it.id) : '<img class="thumb64" src="'+it.img+'" alt="'+it.id+'">') +
          '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Mint</b> • Frog #'+it.id+
          '</div><div class="pg-muted">'+meta+(href?' • Etherscan':'')+'</div></div>';
        root.appendChild(li);
      });
      ensureSentinel(root);
      setSentinelText(root, (!continuation || pageCount>=MAX_PAGES) ? 'End of results' : 'Loading more…');
    }
    requestAnimationFrame(()=> applyVisibleRows(root));
  }

  async function loadFirstPage(root){
    loading=true;
    try{
      const first = await fetchPage(null);
      items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation; pageCount=1;
      renderAll(root);
      setTimeout(()=> attachObserver(root), 150);
    }catch(e){
      console.warn('[mints] failed', e, e.url ? '\nURL: '+e.url : '');
      root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent mints.</div></li>';
    }finally{ loading=false; }
  }

  async function loadNextPage(root){
    if (!continuation || loading) return;
    loading=true;
    try{
      const next = await fetchPage(continuation);
      continuation = next.continuation; pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      renderAll(root);
    }catch(e){
      console.warn('[mints] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }finally{ loading=false; }
  }

  window.FF_loadRecentMints = function(){
    const root = ul(); if (!root) return;
    loadFirstPage(root);
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
