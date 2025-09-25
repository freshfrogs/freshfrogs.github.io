// assets/js/stakes-feed.js
// Recently Staked — mirrors pond.js approach using users/activity + controller filter.
// Shares the global spaced queue with mints to prevent 429s.
(function (FF, CFG) {
  const UL_ID   = 'recentStakes';
  const ID_TOTAL= 'stakedTotal';
  const ID_CTRL = 'stakedController';
  const ID_WHEN = 'stakedUpdated';

  // ---- Config
  const BASE        = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_USERACT = BASE + '/users/activity/v6';     // ✅ same base as pond.js
  const API_USERCOLL= (addr)=> BASE + '/users/' + addr + '/collections/v2';
  const PAGE_SIZE   = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 5)));
  const MAX_PAGES   = Math.max(1, Number(CFG.MAX_PAGES || 8));
  const CHAIN_ID    = Number(CFG.CHAIN_ID || 1);

  // ---- Required keys
  const API_KEY     = CFG.FROG_API_KEY;
  const COLLECTION  = CFG.COLLECTION_ADDRESS;
  const CONTROLLER  = CFG.CONTROLLER_ADDRESS;

  if (!API_KEY || !COLLECTION || !CONTROLLER){
    console.warn('[stakes] Missing config: FROG_API_KEY / COLLECTION_ADDRESS / CONTROLLER_ADDRESS');
  }

  // ---- Headers
  function apiHeaders(){
    if (FF.apiHeaders && typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

  // ---- Global queue (created by mints or here)
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    async function spacedFetch(url, init){
      const delta = Date.now()-lastAt; if (delta<RATE_MIN_MS) await sleep(RATE_MIN_MS-delta);
      lastAt = Date.now(); return fetch(url, init);
    }
    async function run(url, init){
      const hdrs = Object.assign({}, apiHeaders(), init && init.headers || {});
      let i=0;
      while(true){
        const res = await spacedFetch(url, { headers: hdrs });
        if (res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; }
        if (!res.ok){ const t=await res.text().catch(()=> ''); const e=new Error(`HTTP ${res.status}${t?' — '+t:''}`); e.url=url; throw e; }
        return res.json();
      }
    }
    window.FF_RES_QUEUE = { fetch(url, init){ chain = chain.then(()=> run(url, init)); return chain; } };
  }

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

  function ul(){ return document.getElementById(UL_ID); }
  function applyVisibleRows(root){
    if (!root) return;
    root.classList.add('scrolling'); root.style.overflowY='auto';
    const visible = Number(root.getAttribute('data-visible')) || Number(CFG.STAKES_VISIBLE || CFG.MINTS_VISIBLE || 6);
    const r0 = root.querySelector('.row'); if (!r0){ root.style.maxHeight=''; return; }
    const gap = parseFloat(getComputedStyle(root).gap || '0') || 0;
    const h = r0.getBoundingClientRect().height || 84;
    root.style.maxHeight = Math.round(h*visible + gap*(visible-1))+'px';
  }

  // ---- pond-style selection: transfers TO controller, ignore controller->out & zero->controller mints
  function mapStake(a){
    if (String(a?.type||'').toLowerCase() !== 'transfer') return null;
    const to   = (a?.toAddress   || '').toLowerCase();
    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';
    if (to !== String(CONTROLLER||'').toLowerCase()) return null;
    if (from === zero) return null;

    const tokenId = Number(a?.token?.tokenId); if (!isFinite(tokenId)) return null;
    const ts = a?.createdAt ?? a?.timestamp;
    let dt=null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }
    const tx = a?.txHash || a?.transactionHash || null;

    return { id: tokenId, from: a?.fromAddress || null, to: a?.toAddress || null, time: dt, img: imgFor(tokenId), tx };
  }

  async function fetchPage(cont){
    // Use users/activity like pond.js
    const qs = new URLSearchParams({
      users: String(CONTROLLER),
      collection: String(COLLECTION),
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (cont) qs.set('continuation', cont);

    const json = await window.FF_RES_QUEUE.fetch(API_USERACT + '?' + qs.toString());
    const acts = Array.isArray(json?.activities) ? json.activities : [];
    const rows = acts.map(mapStake).filter(Boolean);
    return { rows, continuation: json?.continuation || null };
  }

  async function fetchStakedTotal(){
    // cheap/fast: controller's count for the collection
    const url = API_USERCOLL(CONTROLLER) + '?collections=' + encodeURIComponent(COLLECTION) + '&limit=20';
    const json = await window.FF_RES_QUEUE.fetch(url);
    const rows = Array.isArray(json?.collections) ? json.collections : [];
    const row  = rows.find(r => String(r?.collection?.id||'').toLowerCase() === String(COLLECTION).toLowerCase());
    const n = Number(row?.ownership?.tokenCount || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function setStats(obj){
    const elT = document.getElementById(ID_TOTAL);
    const elC = document.getElementById(ID_CTRL);
    const elW = document.getElementById(ID_WHEN);
    if (elT) elT.textContent = String(obj?.total ?? '—');
    if (elC){
      const base =
        CHAIN_ID === 1        ? 'https://etherscan.io/address/' :
        CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/address/' :
        CHAIN_ID === 5        ? 'https://goerli.etherscan.io/address/' :
                                'https://etherscan.io/address/';
      elC.href = base + CONTROLLER;
      elC.textContent = (FF.shorten ? FF.shorten(CONTROLLER) : CONTROLLER);
    }
    if (elW) elW.textContent = obj?.updatedMs ? new Date(obj.updatedMs).toLocaleString() : '—';
  }

  // ---- Render + infinite scroll
  let items=[], continuation=null, pageCount=0, loading=false, io=null;
  function ensureSentinel(root){
    let s = root.querySelector('li[data-sentinel]');
    if (!s){ s=document.createElement('li'); s.setAttribute('data-sentinel','true'); s.className='row'; s.style.justifyContent='center'; s.innerHTML='<div class="pg-muted">Loading more…</div>'; root.appendChild(s); }
    return s;
  }
  function setSentinelText(root, t){ const s=root.querySelector('li[data-sentinel]'); if (s) s.innerHTML='<div class="pg-muted">'+t+'</div>'; }
  function attachObserver(root){
    if (io) io.disconnect();
    const s = ensureSentinel(root);
    io = new IntersectionObserver(entries=>{
      const e = entries[0]; if (!e || !e.isIntersecting) return;
      if (loading || !continuation || pageCount>=MAX_PAGES) return;
      loadNextPage(root);
    }, { root, rootMargin:'140px', threshold:0.01 });
    io.observe(s);
  }

  function renderAll(root){
    root.innerHTML='';
    if (!items.length){
      root.innerHTML = '<li class="row"><div class="pg-muted">No recent stakes yet.</div></li>';
    } else {
      items.forEach(it=>{
        const meta = [ it.from ? (shorten(it.from)+' → '+shorten(it.to)) : null, it.time ? ago(it.time) : null ].filter(Boolean).join(' • ');
        const li = document.createElement('li'); li.className='row';
        const href = txUrl(it.tx);
        if (href){ li.title='View transaction on Etherscan'; li.addEventListener('click', ()=> window.open(href,'_blank','noopener')); }
        else { li.addEventListener('click', ()=> FF.openFrogModal && FF.openFrogModal({ id: it.id })); }
        li.innerHTML =
          (FF.thumb64 ? FF.thumb64(it.img, 'Frog '+it.id) : '<img class="thumb64" src="'+it.img+'" alt="'+it.id+'">') +
          '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Stake</b> • Frog #'+it.id+
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
      // 1) page first
      const first = await fetchPage(null);
      items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      continuation = first.continuation; pageCount=1;
      renderAll(root);

      // 2) stats after
      try { const total = await fetchStakedTotal(); setStats({ total, updatedMs: Date.now() }); }
      catch { setStats({ total:'—', updatedMs:null }); }

      // 3) observer later (avoid immediate bursts)
      setTimeout(()=> attachObserver(root), 200);
    }catch(e){
      console.warn('[stakes] failed', e, e.url ? '\nURL: '+e.url : '');
      root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent stakes.</div></li>';
      setStats({ total:'—', updatedMs:null });
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
      // spaced refresh of total
      try { const total = await fetchStakedTotal(); setStats({ total, updatedMs: Date.now() }); } catch {}
    }catch(e){
      console.warn('[stakes] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }finally{ loading=false; }
  }

  window.FF_loadRecentStakes = function(){
    const root = ul(); if (!root) return;
    // Fill controller link immediately
    const a = document.getElementById(ID_CTRL);
    if (a){
      const base =
        CHAIN_ID === 1 ? 'https://etherscan.io/address/' :
        CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/address/' :
        CHAIN_ID === 5 ? 'https://goerli.etherscan.io/address/' :
        'https://etherscan.io/address/';
      a.href = base + CONTROLLER;
      a.textContent = (FF.shorten ? FF.shorten(CONTROLLER) : CONTROLLER);
    }
    loadFirstPage(root);
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
