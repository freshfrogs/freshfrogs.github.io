// assets/js/stakes-feed.js
// Recent Staking Activity — EXACT same renderer/behaviour as mints-feed.
// Source: Reservoir users+collection activity; classifies stake/unstake by controller.
// Renders into <ul id="recentStakes">.

(function (FF, CFG) {
  'use strict';

  // --------- REQUIRED CONFIG ----------
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = BASE + '/users/activity/v6';
  const API_KEY    = (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '').trim();
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = (CFG.COLLECTION_ADDRESS || '').trim();
  if (!API_KEY || !CONTROLLER || !COLLECTION) {
    console.warn('[stakes] Missing API key / CONTROLLER_ADDRESS / COLLECTION_ADDRESS in config.js');
  }

  // --------- TUNING (match mints-feed defaults) ----------
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.STAKES_PAGE_SIZE || 10)));
  const MAX_PAGES = Math.max(1, Number(CFG.STAKES_MAX_PAGES || 8));

  // --------- Headers (share with mints-feed if present) ----------
  function apiHeaders(){
    if (FF.apiHeaders && typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

  // --------- Shared rate-limited fetch queue (identical to mints) ----------
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

  // --------- Small utils (identical outputs to mints-feed) ----------
  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime())+' ago' : d.toLocaleString()) : '';
  const imgFor  = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';

  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return CFG.ETHERSCAN_TX_BASE.replace(/\/+$/,'') + '/' + hash;
    const chainId = Number(CFG.CHAIN_ID || 1);
    const base =
      chainId === 1        ? 'https://etherscan.io/tx/' :
      chainId === 11155111 ? 'https://sepolia.etherscan.io/tx/' :
                              'https://etherscan.io/tx/';
    return base + hash;
  }

  // --------- DOM helpers (same behaviour as mints) ----------
  const UL_ID = 'recentStakes';
  function root(){ return document.getElementById(UL_ID); }

  function applyVisibleRows(ul){
    if (!ul) return;
    ul.classList.add('scrolling'); ul.style.overflowY='auto';
    const visible = Number(ul.getAttribute('data-visible')) || Number(CFG.STAKES_VISIBLE || 6);
    const r0 = ul.querySelector('.row'); if (!r0){ ul.style.maxHeight=''; return; }
    const gap = parseFloat(getComputedStyle(ul).gap || '0') || 0;
    const h = r0.getBoundingClientRect().height || 84;
    ul.style.maxHeight = Math.round(h*visible + gap*(visible-1))+'px';
  }
  function ensureSentinel(ul){
    let s = ul.querySelector('li[data-sentinel]');
    if (!s){ s=document.createElement('li'); s.setAttribute('data-sentinel','1'); s.innerHTML='<div class="pg-muted">Loading more…</div>'; ul.appendChild(s); }
    return s;
  }
  function setSentinelText(ul, t){ const s=ul.querySelector('li[data-sentinel]'); if (s) s.innerHTML = '<div class="pg-muted">'+t+'</div>'; }

  // --------- Map API activity → row model (mirrors mints style) ----------
  function mapRow(a){
    const type = a?.event?.kind || a?.type;   // "transfer"
    if (type !== 'transfer') return null;

    // Robust address extraction
    const from = (a?.event?.fromAddress || a?.fromAddress || a?.from || '').toLowerCase();
    const to   = (a?.event?.toAddress   || a?.toAddress   || a?.to   || '').toLowerCase();

    // Classify stake/unstake by controller side; show counterparty like mints feed does
    let kind=null, other=null;
    if (to === CONTROLLER){ kind='stake';   other = from; }
    else if (from === CONTROLLER){ kind='unstake'; other = to; }
    else return null;

    const tokenId = Number(a?.token?.tokenId ?? a?.tokenId);
    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }
    const tx = a?.txHash || a?.transactionHash || null;

    return { id: tokenId, other, time: dt, img: imgFor(tokenId), tx, kind };
  }

  // --------- Fetch a page (users + collection + transfer) ----------
  async function fetchPage(continuation){
    const qs = new URLSearchParams({
      users: CONTROLLER,
      collection: COLLECTION,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);
    const json = await window.FF_RES_QUEUE.fetch(API + '?' + qs.toString());
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    return { rows, continuation: json?.continuation || null };
  }

  // --------- Render (EXACT mints-card layout) ----------
  function renderOne(it){
    const li = document.createElement('li'); li.className = 'row';
    const href = txUrl(it.tx);
    if (href){ li.title='View transaction on Etherscan'; li.addEventListener('click', ()=> window.open(href,'_blank','noopener')); }

    // left thumb matches mints-feed (uses FF.thumb64 helper if present)
    const thumb = (FF.thumb64 ? FF.thumb64(it.img, 'Frog '+it.id) : `<img class="thumb64" src="${it.img}" alt="${it.id}">`);
    const label = `<b>${it.kind==='stake' ? 'Staked' : 'Unstaked'}</b> • Frog #${it.id}`;
    const isNarrow = window.matchMedia('(max-width: 700px)').matches;
    // Build "addr → controller • time • Etherscan"
    const userAddr =
      it.other || it.from || it.maker || it.owner || it.user || null;
    const controllerAddr = (CFG && CFG.CONTROLLER_ADDRESS) ? CFG.CONTROLLER_ADDRESS : null;

    const left  = userAddr ? shorten(userAddr) : '—';
    const right = controllerAddr ? shorten(controllerAddr) : '—';

    const meta = [
      `${left} → ${right}`,
      it.time ? ago(it.time) : null,
      href ? 'Etherscan' : null
    ].filter(Boolean).join(' • ');

    li.innerHTML = thumb + `<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${label}</div><div class="pg-muted">${meta}</div></div>`;
    return li;
  }

  // --------- State + infinite scroll ----------
  let items=[], continuation=null, pageCount=0, loading=false, io=null;

  function paint(ul){
    ul.innerHTML = '';
    if (!items.length){
      ul.innerHTML = '<li class="row"><div class="pg-muted">No recent stakes yet.</div></li>';
    } else {
      const frag = document.createDocumentFragment();
      items.forEach(it => frag.appendChild(renderOne(it)));
      ul.appendChild(frag);
      ensureSentinel(ul);
      setSentinelText(ul, (!continuation || pageCount>=MAX_PAGES) ? 'End of results' : 'Loading more…');
    }
    requestAnimationFrame(()=> applyVisibleRows(ul));
  }

  async function loadFirst(ul){
    loading=true;
    try{
      const first = await fetchPage(null);
      // show newest first, like mints
      items = first.rows.sort((a,b) => (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation; pageCount = 1;
      paint(ul);
    }catch(e){
      console.warn('[stakes] first page failed', e);
      ul.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent stakes.</div></li>';
    }finally{ loading=false; }
  }

  async function loadMore(ul){
    if (!continuation || loading || pageCount>=MAX_PAGES) return;
    loading=true;
    try{
      const next = await fetchPage(continuation);
      continuation = next.continuation; pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      paint(ul);
    }catch(e){
      console.warn('[stakes] next page failed', e);
      setSentinelText(ul, 'Could not load more.');
    }finally{ loading=false; }
  }

  function observe(ul){
    if (io) { try { io.disconnect(); } catch{} io=null; }
    const s = ensureSentinel(ul);
    io = new IntersectionObserver((entries)=>{
      entries.forEach(en => { if (en.isIntersecting) loadMore(ul); });
    }, { root: ul, rootMargin: '100px' });
    io.observe(s);
  }

  // --------- Public init (same name as index feed pattern) ----------
  window.FF_loadRecentStakes = function(){
    const ul = root(); if (!ul) return;
    loadFirst(ul);
    observe(ul);
  };

  // auto-boot (harmless if also called inline)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FF_loadRecentStakes && window.FF_loadRecentStakes());
  } else {
    window.FF_loadRecentStakes && window.FF_loadRecentStakes();
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
