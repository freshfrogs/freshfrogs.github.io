// assets/js/stakes-feed.js
// Recently Staked — scrollable with pagination (Reservoir continuation) + Etherscan links + stats
(function (FF, CFG) {
  const UL_ID = 'recentStakes';
  const ID_TOTAL = 'stakedTotal';
  const ID_CTRL  = 'stakedController';
  const ID_WHEN  = 'stakedUpdated';

  function need(k){ if(!CFG[k]) throw new Error('[stakes] Missing FF_CFG.'+k); return CFG[k]; }

  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_ACTIVITY = BASE + '/collections/activity/v6';
  const API_USERCOLL = function(addr){ return BASE + '/users/' + addr + '/collections/v2'; };

  const API_KEY    = need('FROG_API_KEY');
  const COLLECTION = need('COLLECTION_ADDRESS');
  const CONTROLLER = need('STAKING_CONTROLLER');
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  const PAGE_SIZE  = Math.max(1, Math.min(50, Number(CFG.PAGE_SIZE || 50)));
  const MAX_PAGES  = Math.max(1, Number(CFG.MAX_PAGES || 5));

  function apiHeaders(){
    if (typeof FF.apiHeaders === 'function') return FF.apiHeaders();
    return { accept: 'application/json', 'x-api-key': API_KEY };
  }

  const shorten = function(a){ return (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'); };
  const ago     = function(d){ return d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime())+' ago' : d.toLocaleString()) : ''; };
  const imgFor  = function(id){ return (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png'; };

  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return CFG.ETHERSCAN_TX_BASE.replace(/\/+$/,'') + '/' + hash;
    var base =
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
    var visible = Number(root.getAttribute('data-visible')) || Number(CFG.STAKES_VISIBLE || CFG.MINTS_VISIBLE || 6);
    var firstRow = root.querySelector('.row');
    if (!firstRow){ root.style.maxHeight = ''; return; }
    var csUL = getComputedStyle(root);
    var gap  = parseFloat(csUL.gap || '0') || 0;
    var rowH = firstRow.getBoundingClientRect().height || 84;
    var rows = Math.max(1, visible);
    var maxH = rowH * rows + gap * (rows - 1);
    root.style.maxHeight = Math.round(maxH) + 'px';
  }

  function reservoirFetch(url){
    return fetch(url, { headers: apiHeaders() }).then(function(res){
      if (!res.ok) return res.text().then(function(t){ var e = new Error('HTTP '+res.status+(t?' — '+t:'')); e.url=url; throw e; });
      return res.json();
    });
  }

  // Keep transfers TO controller (exclude zero->controller edge mints)
  function mapRow(a){
    if (String(a && a.type || '').toLowerCase() !== 'transfer') return null;
    var to   = (a && a.toAddress || '').toLowerCase();
    var from = (a && a.fromAddress || '').toLowerCase();
    var zero = '0x0000000000000000000000000000000000000000';
    if (to !== String(CONTROLLER || '').toLowerCase()) return null;
    if (from === zero) return null;

    var tokenId = Number(a && a.token && a.token.tokenId);
    if (!isFinite(tokenId)) return null;

    var ts = a.timestamp != null ? a.timestamp : a.createdAt;
    var dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ var p = Date.parse(ts); if (!isNaN(p)) dt = new Date(p); }

    var txHash = a.txHash || a.transactionHash || null;

    return { id: tokenId, from: a && a.fromAddress || null, to: a && a.toAddress || null, time: dt, img: imgFor(tokenId), tx: txHash };
  }

  // ===== Stats =====
  function fetchStakedTotal(){
    var url = API_USERCOLL(CONTROLLER) + '?collections=' + encodeURIComponent(COLLECTION) + '&limit=20';
    return reservoirFetch(url).then(function(json){
      var rows = Array.isArray(json && json.collections) ? json.collections : [];
      var row  = null;
      for (var i=0;i<rows.length;i++){
        var id = rows[i] && rows[i].collection && rows[i].collection.id || '';
        if (String(id).toLowerCase() === String(COLLECTION).toLowerCase()){ row = rows[i]; break; }
      }
      var n = Number(row && row.ownership && row.ownership.tokenCount || 0);
      return isFinite(n) ? n : 0;
    });
  }

  function setStats(obj){
    var elT = document.getElementById(ID_TOTAL);
    var elC = document.getElementById(ID_CTRL);
    var elW = document.getElementById(ID_WHEN);
    if (elT) elT.textContent = String(obj && obj.total != null ? obj.total : '—');
    if (elC){
      elC.textContent = shorten(CONTROLLER);
      var base =
        CHAIN_ID === 1        ? 'https://etherscan.io/address/' :
        CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/address/' :
        CHAIN_ID === 5        ? 'https://goerli.etherscan.io/address/' :
                                'https://etherscan.io/address/';
      elC.href = base + CONTROLLER;
    }
    if (elW) elW.textContent = obj && obj.updatedMs ? new Date(obj.updatedMs).toLocaleString() : '—';
  }

  // ===== Infinite list =====
  var items = [];
  var continuation = null;
  var pageCount = 0;
  var loading = false;
  var io = null;

  function ensureSentinel(root){
    var s = root.querySelector('li[data-sentinel]');
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
    var s = root.querySelector('li[data-sentinel]');
    if (s) s.innerHTML = '<div class="pg-muted">'+text+'</div>';
  }
  function attachObserver(root){
    if (io) io.disconnect();
    var sentinel = ensureSentinel(root);
    io = new IntersectionObserver(function(entries){
      var entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      if (loading || !continuation || pageCount >= MAX_PAGES) return;
      loadNextPage(root);
    }, { root: root, rootMargin: '120px', threshold: 0.01 });
    io.observe(sentinel);
  }

  function renderAll(root){
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<li class="row"><div class="pg-muted">No recent stakes yet.</div></li>';
      applyVisibleRows(root);
      return;
    }
    items.forEach(function(it){
      var meta = [ it.from ? shorten(it.from) + ' → ' + shorten(it.to) : null, it.time ? ago(it.time) : null ].filter(Boolean).join(' • ');
      var li = document.createElement('li');
      li.className = 'row';
      var href = txUrl(it.tx);
      if (href){
        li.title = 'View transaction on Etherscan';
        li.addEventListener('click', function(){ window.open(href, '_blank', 'noopener'); });
      }else{
        li.addEventListener('click', function(){ if (FF.openFrogModal) FF.openFrogModal({ id: it.id }); });
      }
      li.innerHTML = (FF.thumb64 ? FF.thumb64(it.img, 'Frog '+it.id) : '<img class="thumb64" src="'+it.img+'" alt="'+it.id+'">') +
        '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Stake</b> • Frog #'+it.id+
        '</div><div class="pg-muted">'+meta+(href ? ' • Etherscan' : '')+'</div></div>';
      root.appendChild(li);
    });
    ensureSentinel(root);
    if (!continuation || pageCount >= MAX_PAGES) setSentinelText(root, 'End of results');
    else setSentinelText(root, 'Loading more…');
    requestAnimationFrame(function(){ applyVisibleRows(root); });
  }

  function fetchPage(cont){
    var qs = new URLSearchParams({ collection: COLLECTION, limit: String(PAGE_SIZE), types: 'transfer' });
    if (cont) qs.set('continuation', cont);
    var url = API_ACTIVITY + '?' + qs.toString();
    return reservoirFetch(url).then(function(json){
      var rows = ((json && json.activities) || []).map(mapRow).filter(Boolean);
      return { rows: rows, continuation: json && json.continuation || null };
    });
  }

  function loadFirstPage(root){
    loading = true;
    Promise.all([ fetchStakedTotal().catch(function(){ return 0; }), fetchPage(null) ])
      .then(function(pair){
        var total = pair[0];
        var first = pair[1];
        items = first.rows.sort(function(a,b){ return (b.time && b.time.getTime() || 0) - (a.time && a.time.getTime() || 0); });
        continuation = first.continuation;
        pageCount = 1;
        renderAll(root);
        setStats({ total: total, updatedMs: Date.now() });
        attachObserver(root);
      })
      .catch(function(e){
        console.warn('[stakes] failed', e, e.url ? '\nURL: '+e.url : '');
        root.innerHTML = '<li class="row"><div class="pg-muted">Could not load recent stakes.</div></li>';
        setStats({ total: '—', updatedMs: null });
      })
      .finally(function(){ loading = false; });
  }

  function loadNextPage(root){
    if (!continuation || loading) return;
    loading = true;
    fetchPage(continuation).then(function(next){
      continuation = next.continuation;
      pageCount += 1;
      items = items.concat(next.rows).sort(function(a,b){ return (b.time && b.time.getTime() || 0) - (a.time && a.time.getTime() || 0); });
      renderAll(root);
      fetchStakedTotal().then(function(n){ setStats({ total: n, updatedMs: Date.now() }); }).catch(function(){});
    }).catch(function(e){
      console.warn('[stakes] next page failed', e);
      setSentinelText(root, 'Could not load more.');
    }).finally(function(){ loading = false; });
  }

  function loadAndRender(){
    var root = ul(); if (!root) return;
    loadFirstPage(root);
  }

  window.FF_loadRecentStakes = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
