// assets/js/stakes-feed.js
// Recently Staked — scrollable with pagination + Etherscan links + stats
// - Uses CONTROLLER_ADDRESS from FF_CFG
// - Handles Reservoir 429 with spacing + retry backoff
(function (FF, CFG) {
  const UL_ID   = 'recentStakes';
  const ID_TOTAL= 'stakedTotal';
  const ID_CTRL = 'stakedController';
  const ID_WHEN = 'stakedUpdated';

  function need(k){ if(!CFG[k]) throw new Error('[stakes] Missing FF_CFG.'+k); return CFG[k]; }

  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_ACTIVITY = BASE + '/collections/activity/v6';
  const API_USERCOLL = (addr)=> BASE + '/users/' + addr + '/collections/v2';

  const API_KEY    = need('FROG_API_KEY');
  const COLLECTION = need('COLLECTION_ADDRESS');
  const CONTROLLER = need('CONTROLLER_ADDRESS'); // ✅ your config key
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  const PAGE_SIZE  = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 5))); // your config uses 5
  const MAX_PAGES  = Math.max(1, Number(CFG.MAX_PAGES || 8));

  // -------- Headers (prefer repo helper) --------
  function apiHeaders(){
    if (typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

  // -------- Small utils --------
  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime())+' ago' : d.toLocaleString()) : '';
  const imgFor  = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';

  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return CFG.ETHERSCAN_TX_BASE.replace(/\/+$/, '') + '/' + hash;
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
    const visible = Number(root.getAttribute('data-visible')) || Number(CFG.STAKES_VISIBLE || CFG.MINTS_VISIBLE || 6);
    const firstRow = root.querySelector('.row');
    if (!firstRow){ root.style.maxHeight = ''; return; }
    const csUL = getComputedStyle(root);
    const gap  = parseFloat(csUL.gap || '0') || 0;
    const rowH = firstRow.getBoundingClientRect().height || 84;
    const rows = Math.max(1, visible);
    root.style.maxHeight = Math.round(rowH * rows + gap * (rows - 1)) + 'px';
  }

  // -------- Simple rate-limit scheduler + retry on 429 --------
  const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 650); // >= 650ms between calls
  const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [800, 1600, 3200]; // on 429

  let lastAt = 0;
  function wait(ms){ return new Promise(res=> setTimeout(res, ms)); }

  async function spacedFetch(url, init){
    const now = Date.now();
    const elapsed = now - lastAt;
    if (elapsed < RATE_MIN_MS) {
      await wait(RATE_MIN_MS - elapsed);
    }
    lastAt = Date.now();
    return fetch(url, init);
  }

  async function reservoirFetch(url, opt={}){
    const hdrs = Object.assign({}, apiHeaders(), opt.headers||{});
    let attempt = 0;
    while (true){
      const res = await spacedFetch(url, { headers: hdrs });
      if (res.status !== 429 && !res.ok){
        const txt = await res.text().catch(()=> '');
        const err = new Error(`HTTP ${res.status}${txt ? ' — '+txt : ''}`);
        err.url = url;
        throw err;
      }
      if (res.status === 429){
        const back = BACKOFFS[Math.min(attempt, BACKOFFS.length-1)];
        attempt++;
        // console.warn('[stakes] 429; retrying in', back, 'ms');
        await wait(back);
        continue;
      }
      return res.json();
    }
  }

  // -------- Map activity -> "stakes": transfer TO controller (exclude zero->controller) --------
  function mapRow(a){
    if (String(a?.type || '').toLowerCase() !== 'transfer') return null;
    const to   = (a?.toAddress || '').toLowerCase();
    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';
    if (to !== String(CONTROLLER || '').toLowerCase()) return null;
    if (from === zero) return null;

    const tokenId = Number(a?.token?.tokenId);
    if (!isFinite(tokenId)) return null;

    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }

    const txHash = a?.txHash || a?.transactionHash || null;

    return { id: tokenId, from: a?.fromAddress || null, to: a?.toAddress || null, time: dt, img: imgFor(tokenId), tx: txHash };
  }

  // -------- Stats (use pond.js helpers if available) --------
  async function fetchStakedTotal(){
    // Prefer FF.pond.fetchStakedTotal if available
    if (FF.pond && typeof FF.pond.fetchStakedTotal === 'function'){
      try { return await FF.pond.fetchStakedTotal(COLLECTION, CONTROLLER); } catch(e){}
    }
    // Reservoir fallback
    const url = API_USERCOLL(CONTROLLER) + '?collections=' + encodeURIComponent(COLLECTION) + '&limit=20';
    const json = await reservoirFetch(url);
    const rows = Array.isArray(json?.collections) ? json.collections : [];
    const row  = rows.find(r => String(r?.collection?.id || '').toLowerCase() === String(COLLECTION).toLowerCase());
    const n = Number(row?.ownership?.tokenCount || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function setStats(obj){
    const elT = document.getElementById(ID_TOTAL);
    const elC = document.getElementById(ID_CTRL);
    const elW = document.getElementById(ID_WHEN);
    if (elT) elT.textContent = String(obj?.total ?? '—');
    if (elC){
      elC.textContent = shorten(CONTROLLER);
      const base =
        CHAIN_ID === 1        ? 'https://etherscan.io/address/' :
        CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/address/' :
        CHAIN_ID === 5        ? 'https://goerli.etherscan.io/address/' :
                                'https://etherscan.io/address/';
      elC.href = base + CONTROLLER;
    }
    if (elW) elW.textContent = obj?.updatedMs ? new Date(obj.updatedMs).toLocaleString() : '—';
  }

  // -------- Infinite list state --------
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
    }, { root, rootMargin: '160px', threshold: 0.01 }); // larger margin so we prefetch sooner and smoother
    io.observe(sentinel);
  }

  function renderAll(root){
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<li class="row"><div class="pg-muted">No recent stakes yet.</div></li>';
      applyVisibleRows(root);
      return;
    }
    items.forEach(it=>{
      const meta = [ it.from ? (shorten(it.from)+' → '+shorten(it.to)) : null, it.time ? ago(it.time) : null ]
        .filter(Boolean).join(' • ');
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
        '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Stake</b> • Frog #'+it.id+
        '</div><div class="pg-muted">'+meta+(href ? ' • Etherscan' : '')+'</div></div>';
      root.appendChild(li);
    });

    ensureSentinel(root);
    setSentinelText(root, (!continuation || pageCount >= MAX_PAGES) ? 'End of results' : 'Loading more…');

    // after DOM paints, compute height for N visible rows
    requestAnimationFrame(()=> applyVisibleRows(root));
  }

  // Optionally reuse a pond.js helper for activity (if present)
  async function fetchPage(cont){
    if (FF.pond && typeof FF.pond.fetchStakeActivity === 'function'){
      // expected signature: fetchStakeActivity({ collection, controller, limit, continuation })
      try {
        const out = await FF.pond.fetchStakeActivity({
          collection: COLLECTION,
          controller: CONTROLLER,
          limit: PAGE_SIZE,
          continuation: cont
        });
        const rows = (out?.activities || out?.rows || []).map(mapRow).filter(Boolean);
        return { rows, continuation: out?.continuation || null };
      } catch (e) {
        // fall through to Reservoir raw call
      }
    }

    const qs = new URLSearchParams({ collection: COLLECTION, limit: String(PAGE_SIZE), types: 'transfer' });
    if (cont) qs.set('continuation', cont);
    const url = API_ACTIVITY + '?' + qs.toString();
    const json = await reservoirFetch(url);
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    return { rows, continuation: json?.continuation || null };
  }

  async function loadFirstPage(root){
    loading = true;
    try{
      // 1) first page (avoid parallel to reduce 429 risk)
      const first = await fetchPage(null);
      items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation;
      pageCount = 1;
      renderAll(root);

      // 2) stats shortly after (spaced by scheduler)
      try {
        const total = await fetchStakedTotal();
        setStats({ total, updatedMs: Date.now() });
      } catch(e) {
        setStats({ total: '—', updatedMs: null });
      }

      // 3) enable observer a tick later
      setTimeout(()=> attachObserver(root), 100);
    }catch(e){
      console.warn('[stakes] failed', e, e.url ? '\nURL: '+e.url : '');
      root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent stakes.</div></li>';
      setStats({ total: '—', updatedMs: null });
    }finally{
      loading = false;
    }
  }

  async function loadNextPage(root){
    if (!continuation || loading) return;
    loading = true;
    try{
      const next = await fetchPage(continuation);
      continuation = next.continuation;
      pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      renderAll(root);

      // refresh total (spaced call)
      try {
        const total = await fetchStakedTotal();
        setStats({ total, updatedMs: Date.now() });
      } catch {}
    }catch(e){
      console.warn('[stakes] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }finally{
      loading = false;
    }
  }

  window.FF_loadRecentStakes = function(){
    const root = ul(); if (!root) return;
    loadFirstPage(root);
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
