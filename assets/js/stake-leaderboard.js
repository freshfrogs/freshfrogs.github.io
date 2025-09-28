// assets/js/stake-leaderboard.js
// Current Stakers Leaderboard (ES5-safe)
// - Fetch all token IDs currently held by CONTROLLER (staked now)
// - Scan controller transfer activity (to=controller) newest->older
// - First inbound per token = current staker
// - Aggregate per-wallet counts and render TOP_N

(function(FF, CFG){
  'use strict';

  var BASE        = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var TOKENS_API  = function(a){ return BASE + '/users/' + a + '/tokens/v8'; };
  var ACT_API     = BASE + '/users/activity/v6';
  var API_KEY     = (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '').trim();
  var CONTROLLER  = String(CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  var COLLECTION  = String(CFG.COLLECTION_ADDRESS || '').trim();

  var PAGE_SIZE_TOKENS = 20;
  var PAGE_SIZE_ACT    = 20;
  var MAX_TOKEN_PAGES  = Math.max(1, Number(CFG.LB_MAX_TOKEN_PAGES || 50));
  var MAX_ACT_PAGES    = Math.max(1, Number(CFG.LB_MAX_ACT_PAGES   || 200));
  var TOP_N            = Math.max(3, Number(CFG.LB_TOP_N || 10));

  // styles
  (function(){
    if (document.getElementById('lb-css')) return;
    var css = ''
    + '#stakeLeaderboard{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}'
    + '#stakeLeaderboard .lb-row{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:color-mix(in srgb, var(--panel) 25%, transparent);}'
    + '#stakeLeaderboard .lb-rank{font-weight:800;color:var(--muted);text-align:center;}'
    + '#stakeLeaderboard .lb-addr{display:flex;flex-direction:column;gap:2px;}'
    + '#stakeLeaderboard .lb-addr b{font-family:var(--font-ui);font-weight:800;}'
    + '#stakeLeaderboard .lb-addr small{color:var(--muted);}'
    + '#stakeLeaderboard .lb-score{font-weight:800;padding:4px 8px;border-radius:999px;border:1px solid var(--border);}'
    + '@media (max-width:700px){#stakeLeaderboard .lb-row{grid-template-columns:24px 1fr auto;}}';
    var el=document.createElement('style'); el.id='lb-css'; el.textContent=css; document.head.appendChild(el);
  })();

  // queue
  (function ensureQueue(){
    if (window.FF_RES_QUEUE) return;
    var RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    var lastAt=0, chain=Promise.resolve();
    function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function spaced(url, init){
      var d=Date.now()-lastAt, wait=d<RATE_MIN_MS?(RATE_MIN_MS-d):0;
      return sleep(wait).then(function(){
        lastAt=Date.now();
        var headers = (FF.apiHeaders && FF.apiHeaders()) || { accept:'application/json', 'x-api-key': API_KEY };
        init = init || {}; init.headers = headers;
        return fetch(url, init);
      });
    }
    function run(url, init){
      return spaced(url, init).then(function(res){
        if (res.status===429){ return sleep(1000).then(function(){ return run(url, init); }); }
        if (!res.ok){ return res.text().then(function(t){ throw new Error('HTTP '+res.status+(t?(' — '+t):'')); }); }
        return res.json();
      });
    }
    window.FF_RES_QUEUE = { fetch:function(url,init){ return (chain = chain.then(function(){ return run(url,init); })); } };
  })();

  function root(){ return document.getElementById('stakeLeaderboard'); }
  function shorten(a){
    if (!a) return '—';
    a=String(a);
    return a.length>12 ? (a.slice(0,6)+'…'+a.slice(-4)) : a;
  }

  function paint(list){
    var ul = root(); if (!ul) return;
    ul.innerHTML = '';
    if (!list.length){ ul.innerHTML = '<div class="pg-muted">No frogs currently staked.</div>'; return; }
    for (var i=0;i<list.length;i++){
      var it=list[i];
      var li=document.createElement('li');
      li.className='lb-row';
      li.innerHTML =
        '<div class="lb-rank">'+(i+1)+'</div>'+
        '<div class="lb-addr"><b>'+shorten(it.addr)+'</b><small>'+it.addr+'</small></div>'+
        '<div class="lb-score" title="Frogs currently staked">'+it.count+'</div>';
      ul.appendChild(li);
    }
  }

  function fetchAllStakedTokenIds(){
    var all=[], cont=null, page=0;
    function loop(){
      if (page >= MAX_TOKEN_PAGES) return Promise.resolve();
      page++;
      var qs = new URLSearchParams({
        collection: COLLECTION,
        limit: String(PAGE_SIZE_TOKENS),
        includeTopBid: 'false',
        includeAttributes: 'false'
      });
      if (cont) qs.set('continuation', cont);
      return window.FF_RES_QUEUE.fetch(TOKENS_API(CONTROLLER)+'?'+qs.toString()).then(function(j){
        var toks = (j && j.tokens) || [];
        for (var i=0;i<toks.length;i++){
          var tid = toks[i] && toks[i].token && toks[i].token.tokenId;
          tid = Number(tid);
          if (isFinite(tid)) all.push(tid);
        }
        cont = (j && j.continuation) || null;
        if (cont) return loop();
      });
    }
    return loop().then(function(){ return all; });
  }

  function buildCurrentStakerMap(stakedIds){
    var stakedSet = {};
    for (var i=0;i<stakedIds.length;i++) stakedSet[stakedIds[i]] = true;

    var stakerOf = {}; // tokenId -> address
    var filled = 0;
    var need = stakedIds.length;

    var cont=null, page=0;

    function loop(){
      if (page >= MAX_ACT_PAGES) return Promise.resolve();
      if (filled >= need) return Promise.resolve();
      page++;

      var qs = new URLSearchParams({
        users: CONTROLLER,
        collection: COLLECTION,
        types: 'transfer',
        limit: String(PAGE_SIZE_ACT)
      });
      if (cont) qs.set('continuation', cont);

      return window.FF_RES_QUEUE.fetch(ACT_API + '?' + qs.toString()).then(function(j){
        var rows = (j && j.activities) || [];
        for (var k=0;k<rows.length;k++){
          var a = rows[k] || {};
          var to = String(a.event && a.event.toAddress || a.toAddress || a.to || '').toLowerCase();
          if (to !== CONTROLLER) continue;
          var tokenId = Number((a.token && a.token.tokenId) || a.tokenId);
          if (!isFinite(tokenId) || !stakedSet[tokenId]) continue;
          if (stakerOf.hasOwnProperty(tokenId)) continue;
          var from = String(a.event && a.event.fromAddress || a.fromAddress || a.from || '').toLowerCase();
          if (!from) continue;
          stakerOf[tokenId] = from;
          filled++;
          if (filled >= need) break;
        }
        cont = (j && j.continuation) || null;
        if (cont && filled < need) return loop();
      });
    }

    return loop().then(function(){ return stakerOf; });
  }

  function build(){
    var ul = root(); if (!ul) return;
    ul.innerHTML = '<div class="pg-muted">Building leaderboard…</div>';

    fetchAllStakedTokenIds()
      .then(function(ids){ return buildCurrentStakerMap(ids).then(function(map){ return { ids: ids, map: map }; }); })
      .then(function(res){
        var map = res.map;
        var counts = {};
        for (var tid in map){ if (!map.hasOwnProperty(tid)) continue;
          var addr = map[tid];
          counts[addr] = (counts[addr]||0) + 1;
        }
        var arr = [];
        for (var a in counts){ if (counts.hasOwnProperty(a)) arr.push({ addr:a, count: counts[a] }); }
        arr.sort(function(x,y){ return y.count - x.count; });
        arr = arr.slice(0, TOP_N);
        paint(arr);
      })
      .catch(function(e){
        console.warn('[leaderboard] failed', e);
        ul.innerHTML = '<div class="pg-muted">Failed to build leaderboard.</div>';
      });
  }

  document.addEventListener('DOMContentLoaded', build);

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
