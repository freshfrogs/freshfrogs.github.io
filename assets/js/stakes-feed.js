// assets/js/stakes-feed.js
// Recently Staked — scrollable with pagination + Etherscan links + stats
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
  const CONTROLLER = need('CONTROLLER_ADDRESS');           // ✅ your config key
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  const PAGE_SIZE  = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 50)));
  const MAX_PAGES  = Math.max(1, Number(CFG.MAX_PAGES || 8));

  function apiHeaders(){
    if (typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

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

  function reservoirFetch(url){
    return fetch(url, { headers: apiHeaders() }).then(res=>{
      if (!res.ok) return res.text().then(t=>{ const e = new Error('HTTP '+res.status+(t?' — '+t:'')); e.url=url; throw e; });
      return res.json();
    });
  }

  // Keep transfers TO controller (exclude zero->controller edge mints)
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

  // ===== Stats =====
  function fetchStakedTotal(){
    const url = API_USERCOLL(CONTROLLER) + '?collections=' + encodeURIComponent(COLLECTION) + '&limit=20';
    return reservoirFetch(url).then(json=>{
      const rows = Array.isArray(json?.collections) ? json.collections : [];
      const row  = rows.find(r => String(r?.collection?.id || '').toLowerCase() === String(COLLECTION).toLowerCase());
      const n = Number(row?.ownership?.tokenCount || 0);
      return isFinite(n) ? n : 0;
    });
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

  // ===== Infinite list =====
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
    requestAnimationFrame(()=> applyVisibleRows(root));
  }

  function fetchPage(cont){
    const qs = new URLSearchParams({ collection: COLLECTION, limit: String(PAGE_SIZE), types: 'transfer' });
    if (cont) qs.set('continuation', cont);
    const url = API_ACTIVITY + '?' + qs.toString();
    return reservoirFetch(url).then(json=>{
      const rows = (json?.activities || []).map(mapRow).filter(Boolean);
      return { rows, continuation: json?.continuation || null };
    });
  }

  function loadFirstPage(root){
    loading = true;
    Promise.all([ fetchStakedTotal().catch(()=>0), fetchPage(null) ])
      .then(([total, first])=>{
        items = first.rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
        continuation = first.continuation;
        pageCount = 1;
        renderAll(root);
        setStats({ total, updatedMs: Date.now() });
        attachObserver(root);
      })
      .catch(e=>{
        console.warn('[stakes] failed', e, e.url ? '\nURL: '+e.url : '');
        root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent stakes.</div></li>';
        setStats({ total: '—', updatedMs: null });
      })
      .finally(()=>{ loading = false; });
  }

  function loadNextPage(root){
    if (!continuation || loading) return;
    loading = true;
    fetchPage(continuation).then(next=>{
      continuation = next.continuation;
      pageCount += 1;
      items = items.concat(next.rows).sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
      renderAll(root);
      fetchStakedTotal().then(n=> setStats({ total: n, updatedMs: Date.now() })).catch(()=>{});
    }).catch(e=>{
      console.warn('[stakes] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }).finally(()=>{ loading = false; });
  }

  window.FF_loadRecentStakes = function(){
    const root = ul(); if (!root) return;
    loadFirstPage(root);
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
