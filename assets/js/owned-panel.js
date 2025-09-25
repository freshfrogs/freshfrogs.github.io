// assets/js/owned-panel.js
// Shows all frogs: owned (Reservoir) ∪ staked (controller). Safe fallbacks, visible "Load more".

(function (FF, CFG) {
  'use strict';

  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };
  var C = window.FF_CFG || CFG || {};
  var RESV  = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var COLLN = C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS || window.FF_COLLECTION_ADDRESS;
  var PAGE  = Math.max(1, Math.min(50, Number(C.OWNED_PAGE_SIZE || C.PAGE_SIZE || 24)));
  var SYM   = C.REWARD_TOKEN_SYMBOL || '$FLYZ';
  var DEC   = Number.isFinite(Number(C.REWARD_DECIMALS)) ? Number(C.REWARD_DECIMALS) : 18;
  var BASE  = (C.SOURCE_PATH || '').replace(/\/+$/,'');

  function $(s,r){ return (r||document).querySelector(s); }
  function shorten(a){ return a ? a.slice(0,6)+'…'+a.slice(-4) : '—'; }
  function imgFor(id){ return BASE + '/frog/' + id + '.png'; }
  function metaFor(id){ return BASE + '/frog/json/' + id + '.json'; }
  function etherscanToken(id){
    var chain = Number(C.CHAIN_ID || 1);
    var base = chain===1?'https://etherscan.io/token/': chain===11155111?'https://sepolia.etherscan.io/token/': chain===5?'https://goerli.etherscan.io/token/':'https://etherscan.io/token/';
    return base + COLLN + '?a=' + id;
  }
  function formatToken(raw){
    try{
      if (raw==null) return '—';
      var bi = (typeof raw==='bigint') ? raw : BigInt(String(raw));
      var b = 1n; for (var i=0;i<DEC;i++) b*=10n;
      var whole = bi / b, frac = bi % b;
      if (whole>=100n) return whole.toString();
      var cents = Number((frac*100n)/b);
      var out = Number(whole)+cents/100;
      return (out%1===0? out.toFixed(0) : out.toFixed(2));
    }catch(e){ return '—'; }
  }

  // small CSS for bullets + hover connect
  (function css(){
    if (document.getElementById('owned-clean-css')) return;
    var s=document.createElement('style'); s.id='owned-clean-css';
    s.textContent=[
      '#ownedCard .oh-wrap{margin-bottom:10px}',
      '#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '#ownedCard .oh-mini{font-size:11px;line-height:1}',
      '#ownedCard .oh-spacer{flex:1}',
      '#ownedCard .oh-muted{color:var(--muted)}',
      '#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}',
      '#ownedCard .oh-btn:hover, #ownedConnectBtn.hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}',
      '#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}',
      '#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}',
      '#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}'
    ].join('');
    document.head.appendChild(s);
  })();

  // Ranks (optional)
  async function ensureRanks(){
    if (FF.RANKS) return FF.RANKS;
    try{
      var url = C.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
      var r = await fetch(url); if(!r.ok) throw 0;
      var j = await r.json();
      FF.RANKS = Array.isArray(j) ? j.reduce(function(m,rr){ m[String(rr.id)]=rr.ranking; return m; }, {}) : (j||{});
    }catch(e){ FF.RANKS={}; }
    return FF.RANKS;
  }

  // State
  var addr=null, cont=null, idsStaked=[], items=[], approved=null, rewards='—';

  // Header
  function headerRoot(){
    var w = $('#ownedCard .oh-wrap'); if (!w){ w=document.createElement('div'); w.className='oh-wrap'; $('#ownedCard').insertBefore(w, $('#ownedGrid')); }
    w.innerHTML=''; return w;
  }
  function renderHeader(){
    var w=headerRoot();
    var stCount = idsStaked ? idsStaked.length : 0;
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Owned</span> <b>'+(items.length||0)+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b>'+stCount+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+rewards+' '+SYM+'</b>'+
        '<span class="oh-spacer"></span>'+
        (approved===false? '<button class="oh-btn" id="ohApprove">Approve Staking</button>':'')+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';
    var bA = $('#ohApprove', w), bC = $('#ohClaim', w);
    if (bA) bA.onclick = async function(){ bA.disabled=true; try{ await FF.staking.setApprovalForAll(); await refreshKPIs(); } finally{ bA.disabled=false; } };
    if (bC) bC.onclick = async function(){ bC.disabled=true; try{ await FF.staking.claimRewards(); await refreshKPIs(); } finally{ bC.disabled=false; } };
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

  // Cards
  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var rows=[], cap = Number.isFinite(Number(max))?Number(max):4, i;
    for (i=0;i<attrs.length && rows.length<cap;i++){
      var a=attrs[i]; if(!a||!a.key||a.value==null) continue;
      rows.push('<li><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    return (it.staked ? 'Staked' : 'Not staked') + ' • Owned by You';
  }
  function wireActions(scope, it){
    var list = scope.querySelectorAll('button[data-act]'); var i;
    for (i=0;i<list.length;i++){
      (function(btn){
        btn.addEventListener('click', async function(){
          var act = btn.getAttribute('data-act');
          try{
            if (act==='stake'){
              await FF.staking.stakeToken(it.id);
              it.staked = true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
              scope.querySelector('.meta').textContent = fmtMeta(it);
              await refreshKPIs();
            } else if (act==='unstake'){
              await FF.staking.unstakeToken(it.id);
              it.staked = false; btn.textContent='Stake'; btn.setAttribute('data-act','stake');
              scope.querySelector('.meta').textContent = fmtMeta(it);
              await refreshKPIs();
            } else if (act==='transfer' && FF.wallet && FF.wallet.promptTransfer){
              await FF.wallet.promptTransfer(it.id);
            }
          }catch(e){ console.log('[owned] action failed', e); }
        });
      })(list[i]);
    }
  }
  function renderCards(){
    var root = $(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(); syncHeights(); return; }
    var i;
    for (i=0;i<items.length;i++){
      var it = items[i];
      var card=document.createElement('article'); card.className='frog-card'; card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+( (it.rank||it.rank===0)? (' <span class="pill">Rank #'+it.rank+'</span>') : '' )+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        attrsHTML(it.attrs,4)+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked?'unstake':'stake')+'">'+(it.staked?'Unstake':'Stake')+'</button>'+
          '<button class="btn btn-outline-gray" data-act="transfer">Transfer</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
      wireActions(card, it);
    }
    var more = $(SEL.more);
    if (more){
      more.style.display = cont ? 'block' : 'none';
      more.textContent = 'Load more';
      more.onclick = loadMore;
    }
    renderHeader(); syncHeights();
  }

  // Data
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

  function tokensApiUser(a){ return RESV + '/users/' + a + '/tokens/v8'; }
  async function fetchOwnedIdsPage(a){
    if (!COLLN){ return []; }
    try{
      var qs = new URLSearchParams({ collection: COLLN, limit:String(PAGE), includeTopBid:'false', includeAttributes:'false' });
      if (cont) qs.set('continuation', cont);
      var hdr = (FF.apiHeaders && FF.apiHeaders()) || { accept:'application/json', 'x-api-key': C.FROG_API_KEY };
      var r = await fetch(tokensApiUser(a)+'?'+qs.toString(), { headers: hdr });
      if (!r.ok) throw 0;
      var data = await r.json();
      var ids = (data.tokens||[]).map(function(x){ return Number(x && x.token && x.token.tokenId); }).filter(function(n){ return Number.isFinite(n); });
      cont = data.continuation || null;
      return ids;
    }catch(e){
      cont = null; return [];
    }
  }

  // Staked
  async function fetchStakedIds(a){
    try{
      if (typeof FF.staking.getUserStakedTokens === 'function') return await FF.staking.getUserStakedTokens(a);
      if (typeof FF.staking.getStakedTokens === 'function'){
        var raw = await FF.staking.getStakedTokens(a);
        // normalize inside adapter, but just in case:
        var out=[], i, id;
        for (i=0;i<raw.length;i++){ id = raw[i] && (raw[i].tokenId || raw[i][1] || raw[i]); id = Number(id); if (Number.isFinite(id)) out.push(id); }
        return out;
      }
    }catch(e){}
    return [];
  }

  // KPIs
  async function refreshKPIs(){
    try{ approved = await FF.staking.isApprovedForAll(addr, (C.CONTROLLER_ADDRESS||window.CONTROLLER_ADDRESS)); }catch(e){ approved=null; }
    try{ rewards = formatToken(await FF.staking.availableRewards(addr)); }catch(e){ rewards='—'; }
    renderHeader();
  }

  // Flow
  var cont = null;

  async function hydrate(ids, ranks){
    var out=[], i, id, m;
    for (i=0;i<ids.length;i++){
      id = ids[i]; m = await fetchMeta(id);
      out.push({ id:id, attrs:m.attrs, staked: idsStaked.indexOf(id)>-1, rank:ranks[String(id)] });
    }
    return out;
  }

  async function loadFirst(){
    var ranks = await ensureRanks();

    // owned page 1
    var ownedIds = await fetchOwnedIdsPage(addr);
    // staked
    idsStaked = await fetchStakedIds(addr);

    // merge
    var set = new Set(ownedIds);
    for (var i=0;i<idsStaked.length;i++) set.add(idsStaked[i]);
    var all = Array.from(set);

    items = await hydrate(all, ranks);
    renderCards();
    await refreshKPIs();

    attachObserver();
  }

  async function loadMore(){
    var ranks = await ensureRanks();
    var moreIds = await fetchOwnedIdsPage(addr);
    var add = []; var i;
    for (i=0;i<moreIds.length;i++){
      if (!items.some(function(x){ return x.id===moreIds[i]; })) add.push(moreIds[i]);
    }
    var extra = await hydrate(add, ranks);
    items = items.concat(extra);
    renderCards();
  }

  function attachObserver(){
    var root = $(SEL.grid); if (!root || !cont) return;
    var sentinel = document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
    var io = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      io.disconnect(); loadMore();
    }, { root:root, rootMargin:'140px', threshold:0.01 });
    io.observe(sentinel);
  }

  async function init(){
    // Clean any legacy info grid under the owned panel
    var olds = document.querySelectorAll('#ownedCard .info-grid-2'); for (var i=0;i<olds.length;i++) olds[i].remove();

    var btn = $(SEL.btn);
    if (btn){
      btn.addEventListener('mouseenter', function(){ btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function(){ btn.classList.remove('hover'); });
      btn.addEventListener('click', async function(){
        btn.disabled = true;
        try{
          var a = (FF.wallet && FF.wallet.connect) ? await FF.wallet.connect() : null;
          if (!a && window.ethereum && window.ethereum.request){
            var arr = await window.ethereum.request({ method:'eth_requestAccounts' }); a = arr && arr[0] || null;
          }
          if (!a) return;
          addr = a; btn.textContent = shorten(a);
          $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirst();
        } finally { btn.disabled=false; }
      });
    }

    // already connected?
    var a0 = (FF.wallet && FF.wallet.getAddress) ? await FF.wallet.getAddress() : null;
    if (!a0 && window.ethereum && window.ethereum.request){
      try{ var arr2 = await window.ethereum.request({ method:'eth_accounts' }); a0 = arr2 && arr2[0] || null; }catch(e){}
    }
    if (a0){
      addr = a0; if (btn) btn.textContent = shorten(a0);
      $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
      await loadFirst();
    } else {
      $(SEL.grid).innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    }

    setTimeout(syncHeights, 60);
  }

  window.FF_initOwnedPanel = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
