// assets/js/mints-feed.js
// Recent Mints — prefers pond.js helpers if available; otherwise Reservoir fallback.
// Uses a global spaced queue to avoid 429s across modules.
(function (FF, CFG) {
  const UL_ID = 'recentMints';

  // ---- Config
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = BASE + '/collections/activity/v6';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 5)));
  const MAX_PAGES = Math.max(1, Number(CFG.MAX_PAGES || 8));
  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);

  // ---- Headers
  function apiHeaders(){
    if (FF.apiHeaders && typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---- Global queue (shared with stakes)
  (function ensureQueue(){
    if (window.FF_RES_QUEUE) return;
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900, 1700, 3200];
    let lastAt = 0, chain = Promise.resolve();

    const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
    async function spacedFetch(url, init){
      const delta = Date.now() - lastAt;
      if (delta < RATE_MIN_MS) await sleep(RATE_MIN_MS - delta);
      lastAt = Date.now();
      return fetch(url, init);
    }
    async function run(url, init){
      const hdrs = Object.assign({}, apiHeaders(), init && init.headers || {});
      let i = 0;
      while (true){
        const res = await spacedFetch(url, { headers: hdrs });
        if (res.status === 429){ await sleep(BACKOFFS[Math.min(i++, BACKOFFS.length-1)]); continue; }
        if (!res.ok){ const t = await res.text().catch(()=> ''); const e = new Error(`HTTP ${res.status}${t?' — '+t:''}`); e.url=url; throw e; }
        return res.json();
      }
    }
    window.FF_RES_QUEUE = { fetch(url, init){ chain = chain.then(()=> run(url, init)); return chain; } };
  })();

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
    const tokenId = Number(a?.token?.tokenId);
    if (!isFinite(tokenId)) return null;
    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';
    const isMint = String(a?.type||'').toLowerCase()==='mint' || from===zero;
    if (!isMint) return null;

    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }
    const tx = a?.txHash || a?.transactionHash || null;
    return { id: tokenId, to: a?.toAddress || null, time: dt, img: imgFor(tokenId), tx };
  }

  async function fetchPage(cont){
    const pond = await pondFetchMints({ collection: CFG.COLLECTION_ADDRESS, limit: PAGE_SIZE, continuation: cont });
    if (pond){
      const rows = (pond.activities || pond.rows || []).map(mapRow).filter(Boolean);
      return { rows, continuation: pond.continuation || null };
    }
    const qs = new URLSearchParams({ collection: CFG.COLLECTION_ADDRESS, limit: String(PAGE_SIZE), types: 'mint' });
    if (cont) qs.set('continuation', cont);
    const json = await window.FF_RES_QUEUE.fetch(API + '?' + qs.toString());
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    return { rows, continuation: json?.continuation || null };
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
