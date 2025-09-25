// assets/js/mints-feed.js
// Recent Mints — scrollable with pagination (Reservoir continuation) + Etherscan links
(function (FF, CFG) {
  const UL_ID = 'recentMints';
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = BASE + '/collections/activity/v6';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 50)));
  const MAX_PAGES = Math.max(1, Number(CFG.MAX_PAGES || 8));

  function need(k){ if(!CFG[k]) throw new Error('[mints] Missing FF_CFG.'+k); return CFG[k]; }
  const API_KEY    = need('FROG_API_KEY');
  const COLLECTION = need('COLLECTION_ADDRESS');
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  // Prefer repo header helper if present
  function apiHeaders(){
    if (typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

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

  function ul(){ return document.getElementById(UL_ID); }

  function applyVisibleRows(root){
    if (!root) return;
    root.classList.add('scrolling');
    root.style.overflowY = 'auto';
    const visible = Number(root.getAttribute('data-visible')) || Number(CFG.MINTS_VISIBLE || 6);
    const firstRow = root.querySelector('.row');
    if (!firstRow){ root.style.maxHeight = ''; return; }
    const csUL = getComputedStyle(root);
    const gap  = parseFloat(csUL.gap || '0') || 0;
    const rowH = firstRow.getBoundingClientRect().height || 84;
    const rows = Math.max(1, visible);
    root.style.maxHeight = Math.round(rowH * rows + gap * (rows - 1)) + 'px';
  }

  function reservoirFetch(url){
    return fetch(url, { headers: apiHeaders() }).then(res=>{
      if (!res.ok) return res.text().then(t=>{ const e = new Error('HTTP '+res.status+(t?' — '+t:'')); e.url=url; throw e; });
      return res.json();
    });
  }

  function mapRow(a){
    const tokenId = Number(a?.token?.tokenId);
    if (!isFinite(tokenId)) return null;
    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';
    const reported = String(a?.type || '').toLowerCase();
    const isMint = (reported === 'mint') || (from === zero);
    if (!isMint) return null;

    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }
    const txHash = a?.txHash || a?.transactionHash || null;

    return { id: tokenId, to: a?.toAddress || null, time: dt, img: imgFor(tokenId), tx: txHash };
  }

  let items = [];
  let continuation = null;
  let pageCount = 0;
  let loading = false;
  let io = null;

  function ensureSentinel(root){
    let s = root.querySelector('li[data-sentinel]');
    if (!s){
      s = document.createElement('li');
      s.setAttribute('data-sentinel','true');
      s.className = 'row';
      s.style.justifyContent = 'center';
      s.innerHTML = '<div class="pg-muted">Loading more…</div>';
      root.appendChild(s);
    }
    return s;
  }
  function setSentinelText(root, text){
    const s = root.querySelector('li[data-sentinel]');
    if (s) s.innerHTML = '<div class="pg-muted">'+text+'</div>';
  }
  function attachObserver(root){
    if (io) io.disconnect();
    const sentinel = ensureSentinel(root);
    io = new IntersectionObserver(entries=>{
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      if (loading || !continuation || pageCount >= MAX_PAGES) return;
      loadNextPage(root);
    }, { root, rootMargin: '120px', threshold: 0.01 });
    io.observe(sentinel);
  }

  function renderAll(root){
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<li class="row"><div class="pg-muted">No recent mints yet.</div></li>';
      applyVisibleRows(root);
      return;
    }
    items.forEach(it=>{
      const meta = [ it.to ? '→ '+shorten(it.to) : null, it.time ? ago(it.time) : null ].filter(Boolean).join(' • ');
      const li = document.createElement('li');
      li.className = 'row';
      const href = txUrl(it.tx);
      if (href){
        li.title = 'View transaction on Etherscan';
        li.addEventListener('click', ()=> window.open(href, '_blank', 'noopener'));
      }else{
        li.addEventListener('click', ()=> FF.openFrogModal && FF.openFrogModal({ id: it.id }));
      }
      li.innerHTML =
        (FF.thumb64 ? FF.thumb64(it.img, 'Frog '+it.id) : '<img class="thumb64" src="'+it.img+'" alt="'+it.id+'">') +
        '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Mint</b> • Frog #'+it.id+
        '</div><div class="pg-muted">'+meta+(href ? ' • Etherscan' : '')+'</div></div>';
      root.appendChild(li);
    });
    ensureSentinel(root);
    setSentinelText(root, (!continuation || pageCount >= MAX_PAGES) ? 'End of results' : 'Loading more…');
    requestAnimationFrame(()=> applyVisibleRows(root));
  }

  function fetchPage(cont){
    const qs = new URLSearchParams({ collection: COLLECTION, limit: String(PAGE_SIZE), types: 'mint' });
    if (cont) qs.set('continuation', cont);
    const url = API + '?' + qs.toString();
    return reservoirFetch(url).then(json=>{
      const rows = (json?.activities || []).map(mapRow).filter(Boolean);
      return { rows, continuation: json?.continuation || null };
    });
  }

  function loadFirstPage(root){
    loading = true;
    fetchPage(null).then(first=>{
      items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation;
      pageCount = 1;
      renderAll(root);
      attachObserver(root);
    }).catch(e=>{
      console.warn('[mints] failed', e, e.url ? '\nURL: '+e.url : '');
      root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent mints.</div></li>';
    }).finally(()=>{ loading = false; });
  }

  function loadNextPage(root){
    if (!continuation || loading) return;
    loading = true;
    fetchPage(continuation).then(next=>{
      continuation = next.continuation;
      pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      renderAll(root);
    }).catch(e=>{
      console.warn('[mints] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }).finally(()=>{ loading = false; });
  }

  window.FF_loadRecentMints = function(){
    const root = ul(); if (!root) return;
    loadFirstPage(root);
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
