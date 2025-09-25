// assets/js/owned-panel.js
// Owned ∪ Staked view with reliable paging and KPIs. Safe and fast.

(function (FF, CFG) {
  'use strict';

  var SEL = { card:'#ownedCard', grid:'#ownedGrid', btn:'#ownedConnectBtn', more:'#ownedMore' };
  var C = window.FF_CFG || CFG || {};
  var RESV  = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var COLLN = C.COLLECTION_ADDRESS;
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

  // Inject tiny CSS (safe)
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
      '#ownedCard{display:flex;flex-direction:column}',
      '#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}',
      '#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}',
      '#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}'
    ].join('');
    document.head.appendChild(s);
  })();

  // ranks (optional)
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

  // state
  var addr=null, cont=null, idsOwned=[], idsStaked=[], items=[];
  var approved=null, rewards='—';

  // header
  function headerRoot(){
    var w = $('#ownedCard .oh-wrap'); if (!w){ w=document.createElement('div'); w.className='oh-wrap'; $('#ownedCard').insertBefore(w, $('#ownedGrid')); }
    w.innerHTML=''; return w;
  }
  function renderHeader(){
    var w=headerRoot(); if(!w) return;
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
      '<span class="oh-muted">Owned</span> <b>'+(items.length||0)+'</b>'+
      '<span>•</span><span class="oh-muted">Staked</span> <b>'+(idsStaked.length||0)+'</b>'+
      '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b>'+rewards+' '+SYM+'</b>'+
      '<span class="oh-spacer"></span>'+
      (approved===false? '<button class="oh-btn" id="ohApprove">Approve Staking</button>':'')+
      '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';
    var bA = $('#ohApprove', w); var bC = $('#ohClaim', w);
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

  // cards
  function attrsHTML(attrs, max){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    var rows=[], cap = Number.isFinite(Number(max))?Number(max):4;
    for (var i=0;i<attrs.length && rows.length<cap;i++){
      var a=attrs[i]; if(!a||!a.key||a.value==null) continue;
      rows.push('<li><b>'+String(a.key)+':</b> '+String(a.value)+'</li>');
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    if (it.staked){ return (it.sinceMs?('Staked '+timeAgo(it.sinceMs)):'Staked')+' • Owned by You'; }
    return 'Not staked • Owned by You';
  }
  function timeAgo(ms){
    if(!ms) return null;
    var s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    var d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    var h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    var m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }
  function wireActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        var act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            await FF.staking.stakeToken(it.id);
            it.staked = true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
            scope.querySelector('.meta').textContent = fmtMeta(it);
            await refreshKPIs();
          }else if (act==='unstake'){
            await FF.staking.unstakeToken(it.id);
            it.staked = false; btn.textContent='Stake'; btn.setAttribute('data-act','stake');
            scope.querySelector('.meta').textContent = fmtMeta(it);
            await refreshKPIs();
          }else if (act==='transfer' && FF.wallet?.promptTransfer){
            await FF.wallet.promptTransfer(it.id);
          }
        }catch(e){ console.log(e); }
      });
    });
  }
  function renderCards(){
    var root = $(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; renderHeader(); syncHeights(); return; }
    for (var i=0;i<items.length;i++){
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

  // data helpers
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
    try{
      var qs = new URLSearchParams({ collection: COLLN, limit:String(PAGE), includeTopBid:'false', includeAttributes:'false' });
      if (cont) qs.set('continuation', cont);
      var j = await fetch(tokensApiUser(a)+'?'+qs.toString(), { headers: (FF.apiHeaders?.()||{ accept:'application/json', 'x-api-key': C.FROG_API_KEY }) });
      if (!j.ok) throw 0;
      var data = await j.json();
      var ids = (data.tokens||[]).map(function(r){ return Number(r?.token?.tokenId); }).filter(Number.isFinite);
      cont = data.continuation || null;
      return ids;
    }catch(e){ cont=null; return []; }
  }

  async function stakeSinceMs(id){
    try{
      if (!window.collection?.getPastEvents) return null;
      var ctrl = (C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || '').toLowerCase();
      var evs = await window.collection.getPastEvents('Transfer', { filter:{ to: ctrl, tokenId: id }, fromBlock: 0, toBlock: 'latest' });
      if (!evs.length) return null;
      var last = evs[evs.length-1];
      var blk = await (window.web3 || (window.Web3?new window.Web3(window.ethereum):null)).eth.getBlock(last.blockNumber);
      return Number(blk.timestamp)*1000;
    }catch(e){ return null; }
  }

  // KPIs
  async function refreshKPIs(){
    try{
      approved = await FF.staking.isApprovedForAll(addr, C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS);
    }catch(e){ approved=null; }
    try{
      var raw = await FF.staking.availableRewards(addr);
      rewards = formatToken(raw);
    }catch(e){ rewards='—'; }
    renderHeader();
  }

  // flow
  async function hydrate(ids, ranks){
    var merged=[];
    for (var i=0;i<ids.length;i++){
      var id=ids[i]; var m=await fetchMeta(id);
      merged.push({ id:id, attrs:m.attrs, staked: idsStaked.indexOf(id)>-1, sinceMs:null, rank:ranks[String(id)] });
    }
    // stake times (only for staked items; keep light)
    for (var j=0;j<merged.length;j++){
      if (merged[j].staked) merged[j].sinceMs = await stakeSinceMs(merged[j].id);
    }
    return merged;
  }

  async function loadFirst(){
    var ranks = await ensureRanks();
    idsOwned = await fetchOwnedIdsPage(addr);
    idsStaked = await (FF.staking.getUserStakedTokens ? FF.staking.getUserStakedTokens(addr) : Promise.resolve([]));

    var set = new Set(idsOwned);
    for (var i=0;i<idsStaked.length;i++) set.add(idsStaked[i]);
    var all = Array.from(set);

    items = await hydrate(all, ranks);
    renderCards();
    await refreshKPIs();

    // IO + fallback
    attachObserver();
  }

  async function loadMore(){
    var ranks = await ensureRanks();
    var moreOwned = await fetchOwnedIdsPage(addr);
    var add = moreOwned.filter(function(id){ return !items.some(function(x){ return x.id===id; }); });
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
    // remove old info grid under ownedCard (prevents double header & extra layout)
    document.querySelectorAll('#ownedCard .info-grid-2').forEach(function(n){ n.remove(); });

    var btn = $(SEL.btn);
    if (btn){
      btn.addEventListener('mouseenter', function(){ btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function(){ btn.classList.remove('hover'); });
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          var a = await (FF.wallet.connect ? FF.wallet.connect() : Promise.resolve(null));
          if (!a) return;
          addr = a; btn.textContent = shorten(a);
          $(SEL.grid).innerHTML = '<div class="pg-muted">Loading…</div>';
          await loadFirst();
        } finally { btn.disabled=false; }
      });
    }

    // already connected?
    var a0 = await (FF.wallet.getAddress ? FF.wallet.getAddress() : Promise.resolve(null));
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
