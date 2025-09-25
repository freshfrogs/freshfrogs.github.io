// assets/js/owned-panel.js
// Shows ALL frogs for the connected user (owned ∪ staked), loads more pages,
// shows Unclaimed Rewards, and wires Stake/Unstake/Claim using staking-adapter.

(function (FF, CFG) {
  'use strict';

  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn', more:'#ownedMore' };
  var C = window.FF_CFG || CFG || {};
  var RESV = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var COLLECTION = C.COLLECTION_ADDRESS;
  var PAGE_SIZE = Math.max(1, Math.min(50, Number(C.OWNED_PAGE_SIZE || C.PAGE_SIZE || 24)));
  var REWARD_SYMBOL   = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
  var REWARD_DECIMALS = Number.isFinite(Number(C.REWARD_DECIMALS)) ? Number(C.REWARD_DECIMALS) : 18;
  var BASEPATH = (C.SOURCE_PATH || '').replace(/\/+$/,'');

  function imgFor(id){ return BASEPATH + '/frog/' + id + '.png'; }
  function metaFor(id){ return BASEPATH + '/frog/json/' + id + '.json'; }
  function etherscanToken(id){
    var chain = Number(C.CHAIN_ID || 1);
    var base =
      chain===1?'https://etherscan.io/token/':
      chain===11155111?'https://sepolia.etherscan.io/token/':
      chain===5?'https://goerli.etherscan.io/token/':'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  }

  // ---- CSS (scoped) ----
  (function css(){
    if (document.getElementById('owned-clean-css')) return;
    var s=document.createElement('style'); s.id='owned-clean-css';
    s.textContent = [
      '#ownedCard .oh-wrap{margin-bottom:10px}',
      '#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '#ownedCard .oh-mini{font-size:11px;line-height:1}',
      '#ownedCard .oh-spacer{flex:1}',
      '#ownedCard .oh-muted{color:var(--muted)}',
      '#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}',
      '#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}',
      '#ownedCard{display:flex;flex-direction:column}',
      '#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}',
      '#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}',
      '#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}'
    ].join('');
    document.head.appendChild(s);
  })();

  // ---- Minimal queue for Reservoir ----
  if (!window.FF_RES_QUEUE){
    var RATE = Number(C.RATE_MIN_MS || 800), last=0, chain=Promise.resolve();
    function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
    function headers(){ return (FF.apiHeaders && FF.apiHeaders()) || { accept:'application/json', 'x-api-key': C.FROG_API_KEY }; }
    function spaced(url){ var d=Date.now()-last; var wait = d<RATE ? (RATE-d) : 0; return sleep(wait).then(function(){ last=Date.now(); return fetch(url,{headers:headers()}); }); }
    function run(url){ return spaced(url).then(function(r){ if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP '+r.status+(t?' — '+t:'')); }); return r.json(); }); }
    window.FF_RES_QUEUE = { fetch: function(url){ return (chain = chain.then(function(){ return run(url); })); } };
  }

  // ---- Utils ----
  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'); }
  function toast(m){ try{ if (FF.toast) FF.toast(m); }catch(e){} console.log('[owned]',m); }
  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    var s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    var d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    var h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    var m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }
  function formatToken(raw){
    // raw is uint256 wei (string)
    try{
      if (raw==null) return '—';
      if (typeof raw==='object' && 'toString' in raw) raw = raw.toString();
      if (typeof raw==='string' && raw.indexOf('.')>-1) return raw;
      var bi = (typeof raw==='bigint') ? raw : BigInt(String(raw));
      var base = 1n; for (var i=0;i<REWARD_DECIMALS;i++) base*=10n;
      var whole = bi / base, frac = bi % base;
      if (whole>=100n) return whole.toString();
      var cents = Number((frac*100n)/base);
      var out = Number(whole)+cents/100;
      return (out%1===0? out.toFixed(0): out.toFixed(2));
    }catch(e){ return '—'; }
  }

  // ---- Ranks (optional local JSON) ----
  async function ensureRanks(){
    if (FF.RANKS) return FF.RANKS;
    try{
      var url = C.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
      var r = await fetch(url); if(!r.ok) throw 0;
      var j = await r.json();
      FF.RANKS = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
    }catch(e){ FF.RANKS = {}; }
    return FF.RANKS;
  }

  // ---- State ----
  var addr=null, continuation=null, idsOwned=[], idsStaked=[], items=[];
  var _approved=null, _rewards='—';

  // ---- Header ----
  function headerRoot(){
    var w = $('#ownedCard .oh-wrap'); if (!w){ w=document.createElement('div'); w.className='oh-wrap'; var grid=$(SEL.grid, $(SEL.card)); $(SEL.card).insertBefore(w, grid); }
    w.innerHTML='';
    return w;
  }
  function renderHeader(){
    var w=headerRoot(); if(!w) return;
    var owned = items.length||0;
    var staked = idsStaked.length||0;
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Owned</span> <b>'+owned+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b>'+staked+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+_rewards+' '+(C.REWARD_TOKEN_SYMBOL||'$FLYZ')+'</b>'+
        '<span class="oh-spacer"></span>'+
        (_approved===false ? '<button class="oh-btn" id="ohApprove">Approve Staking</button>' : '')+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';

    var bA = $('#ohApprove', w);
    var bC = $('#ohClaim', w);
    if (bA) bA.onclick = async function(){ bA.disabled=true; try{ await FF.staking.setApprovalForAll(); await refreshKPIs(); }catch(e){ toast('Approve failed'); }finally{ bA.disabled=false; } };
    if (bC) bC.onclick = async function(){ bC.disabled=true; try{ await FF.staking.claimRewards(); await refreshKPIs(); }catch(e){ toast('Claim failed'); }finally{ bC.disabled=false; } };
  }

  function syncHeights(){
    if (window.matchMedia('(max-width: 960px)').matches){
      var oc=document.getElementById('ownedCard'); if(oc) oc.style.height='';
      var og=document.getElementById('ownedGrid'); if(og) og.style.maxHeight='';
      return;
    }
    var left=document.querySelectorAll('.page-grid > .pg-card')[0];
    var right=document.getElementById('ownedCard'); if(!left||!right) return;
    right.style.height=left.offsetHeight+'px';
    var header=right.querySelector('.oh-wrap'); var headerH=header?header.offsetHeight+10:0;
    var pad=20; var maxH=left.offsetHeight-headerH-pad;
    var grid=document.getElementById('ownedGrid'); if(grid) grid.style.maxHeight=Math.max(160,maxH)+'px';
  }
  window.addEventListener('resize', function(){ setTimeout(syncHeights,60); });

  // ---- Cards ----
  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var cap = Number.isFinite(Number(max)) ? Number(max) : 4;
    var rows=[], i;
    for (i=0;i<attrs.length;i++){
      var a=attrs[i]; if(!a || !a.key || a.value==null) continue;
      rows.push('<li><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
      if(rows.length>=cap) break;
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    if (it.staked){
      var a = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return (a?('Staked '+a):'Staked')+' • Owned by You';
    }
    return 'Not staked • Owned by You';
  }
  function wireCardActions(scope, it){
    var btns = scope.querySelectorAll('button[data-act]');
    for (var i=0;i<btns.length;i++){
      (function(btn){
        btn.addEventListener('click', async function(){
          var act = btn.getAttribute('data-act');
          try{
            if (act==='stake'){
              await FF.staking.stakeToken(it.id);
              it.staked=true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
              scope.querySelector('.meta').textContent = fmtMeta(it);
              await refreshKPIs();
            } else if (act==='unstake'){
              await FF.staking.unstakeToken(it.id);
              it.staked=false; btn.textContent='Stake'; btn.setAttribute('data-act','stake');
              scope.querySelector('.meta').textContent = fmtMeta(it);
              await refreshKPIs();
            } else if (act==='transfer'){
              if (FF.wallet && FF.wallet.promptTransfer) await FF.wallet.promptTransfer(it.id);
            }
          }catch(e){ toast('Action failed'); }
        });
      })(btns[i]);
    }
  }

  function renderCards(){
    var root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      renderHeader(); syncHeights(); return;
    }
    for (var i=0;i<items.length;i++){
      var it = items[i];
      var card=document.createElement('article'); card.className='frog-card'; card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked ? 'unstake' : 'stake')+'">'+(it.staked ? 'Unstake' : 'Stake')+'</button>'+
          '<button class="btn btn-outline-gray" data-act="transfer">Transfer</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
      wireCardActions(card, it);
    }
    // Load-more fallback button (in case IntersectionObserver cannot run within a scrollable grid)
    var more = document.getElementById('ownedMore');
    if (more){
      more.style.display = continuation ? 'block' : 'none';
      more.textContent = 'Load more';
      more.onclick = loadMoreOwned;
    }
    renderHeader(); syncHeights();
  }

  // ---- Data fetchers ----
  var META = new Map();
  async function fetchMeta(id){
    if (META.has(id)) return META.get(id);
    try{
      var r = await fetch(metaFor(id));
      var j = r.ok ? await r.json() : null;
      var attrs = (j && Array.isArray(j.attributes)) ? j.attributes.map(function(a){
        return { key:(a && (a.key||a.trait_type))||'', value:(a && (a.value!=null?a.value:a.trait_value)) };
      }) : [];
      var out = { id:id, attrs:attrs }; META.set(id,out); return out;
    }catch(e){ var out2={ id:id, attrs:[] }; META.set(id,out2); return out2; }
  }

  function tokensApiUser(addr){
    return RESV + '/users/' + addr + '/tokens/v8';
  }
  async function fetchOwnedIdsPage(address){
    try{
      var qs = new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'false' });
      if (continuation) qs.set('continuation', continuation);
      var j = await window.FF_RES_QUEUE.fetch(tokensApiUser(address)+'?'+qs.toString());
      var ids = (j && Array.isArray(j.tokens) ? j.tokens : []).map(function(r){
        return Number(r && r.token && r.token.tokenId);
      }).filter(function(n){ return Number.isFinite(n); });
      continuation = (j && j.continuation) || null;
      return ids;
    }catch(e){
      console.warn('[owned] Reservoir unavailable; showing staked + loaded IDs only', e);
      continuation = null;
      return [];
    }
  }

  async function getStakeSinceMs(tokenId){
    try{
      // Best-effort: compute from Transfer to controller
      if (!window.collection || !window.collection.getPastEvents) return null;
      var controllerAddr = (C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '').toLowerCase();
      var evs = await window.collection.getPastEvents('Transfer', { filter:{ to: C.CONTROLLER_ADDRESS }, fromBlock: 0, toBlock: 'latest' });
      for (var i=evs.length-1;i>=0;i--){
        var e = evs[i];
        if (String(e.returnValues.tokenId)===String(tokenId)) {
          var blk = await (window.web3 || (window.Web3? new window.Web3(window.ethereum):null)).eth.getBlock(e.blockNumber);
          return Number(blk.timestamp)*1000;
        }
      }
    }catch(e){}
    return null;
  }

  // ---- KPIs ----
  async function refreshKPIs(){
    _approved = null; _rewards = '—';
    try{
      var a = addr || await FF.wallet.getAddress();
      if (a && FF.staking && FF.staking.isApprovedForAll) {
        var ap = await FF.staking.isApprovedForAll(a, C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS);
        _approved = (ap===true);
      }
    }catch(e){ _approved=null; }
    try{
      var r = addr ? await FF.staking.availableRewards(addr) : null;
      _rewards = formatToken(r);
    }catch(e){ _rewards = '—'; }
    renderHeader(); // reflect updated KPIs
  }

  // ---- Flow ----
  async function loadFirstPage(){
    var ranks = await ensureRanks();
    // 1) pull owned IDs page 1
    var owned = await fetchOwnedIdsPage(addr);
    // 2) pull staked IDs (controller)
    idsStaked = await (FF.staking.getUserStakedTokens ? FF.staking.getUserStakedTokens(addr) : (async function(){ return []; })());

    // Merge sets
    var set = new Set(owned);
    for (var i=0;i<idsStaked.length;i++) set.add(idsStaked[i]);
    var all = Array.from(set);

    // Hydrate metadata
    items = [];
    for (var j=0;j<all.length;j++){
      var id = all[j];
      var m = await fetchMeta(id);
      items.push({ id:id, attrs:m.attrs, staked: idsStaked.indexOf(id)>-1, sinceMs:null, rank:ranks[String(id)] });
    }
    // Stake since
    for (var k=0;k<items.length;k++){
      if (items[k].staked) items[k].sinceMs = await getStakeSinceMs(items[k].id);
    }
    renderCards();
    // Attach IO for automatic “more”
    attachOwnedObserver();
    await refreshKPIs();
  }

  async function loadMoreOwned(){
    if (!continuation) return;
    var ranks = await ensureRanks();
    var moreIds = await fetchOwnedIdsPage(addr);
    var add = moreIds.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
    for (var i=0;i<add.length;i++){
      var id=add[i]; var m=await fetchMeta(id);
      items.push({ id:id, attrs:m.attrs, staked: idsStaked.indexOf(id)>-1, sinceMs: (idsStaked.indexOf(id)>-1 ? await getStakeSinceMs(id) : null), rank:ranks[String(id)] });
    }
    renderCards();
  }

  function attachOwnedObserver(){
    var root=$(SEL.grid); if (!root || !continuation) return;
    // If the grid itself scrolls, a viewport-based IO may never fire.
    // So we also add a manual "Load more" button; IO is a nice-to-have.
    var sentinel=document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
    var io = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      io.disconnect(); loadMoreOwned();
    },{root:root,rootMargin:'140px',threshold:0.01});
    io.observe(sentinel);
  }

  async function init(){
    // Remove any legacy info squares under the owned panel
    var junk=document.querySelectorAll('#ownedCard .info-grid-2'); for (var i=0;i<junk.length;i++) junk[i].remove();

    // Connect button behavior
    var btn = $(SEL.btnConn);
    if (btn){
      btn.style.display='inline-flex';
      btn.addEventListener('mouseenter', function(){ btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function(){ btn.classList.remove('hover'); });
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await FF.wallet.connect();
          if (!a) return; addr = a;
          btn.textContent = shorten(a);
          btn.classList.add('btn-connected');
          $('#ownedGrid').innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirstPage();
        } finally { btn.disabled=false; }
      });
    }

    // If already connected
    var a0 = await FF.wallet.getAddress();
    if (a0){
      addr = a0;
      if (btn){ btn.textContent = shorten(a0); btn.classList.add('btn-connected'); }
      $('#ownedGrid').innerHTML = '<div class="pg-muted">Loading…</div>';
      await loadFirstPage();
    } else {
      $('#ownedGrid').innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    }

    setTimeout(syncHeights, 50);
  }

  window.FF_initOwnedPanel = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
