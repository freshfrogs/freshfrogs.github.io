// assets/js/mints-feed.js  (DROP-IN)

(function(FF, CFG){
  'use strict';

  var RES  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  var API  = RES + '/collections/activity/v6';
  var COLL = (CFG.COLLECTION_ADDRESS || '').trim();
  var API_KEY = (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '').trim();
  var PAGE_SIZE = Math.max(1, Math.min(20, Number(CFG.MINTS_PAGE_SIZE || 12)));

  // NEW: short address helper
  function shorten(a){
    if (!a || typeof a !== 'string') return '—';
    if (a.length <= 12) return a;
    return a.slice(0, 6) + '…' + a.slice(-4);
  }

  // Basic queue (reuse if present)
  if (!window.FF_RES_QUEUE){
    (function(){
      var RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
      var lastAt = 0, chain = Promise.resolve();
      function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
      function spaced(url, init){
        var d = Date.now() - lastAt;
        var wait = d < RATE_MIN_MS ? (RATE_MIN_MS - d) : 0;
        return sleep(wait).then(function(){
          lastAt = Date.now();
          var headers = (FF.apiHeaders && FF.apiHeaders()) || { accept:'application/json', 'x-api-key': API_KEY };
          init = init || {};
          init.headers = headers;
          return fetch(url, init);
        });
      }
      function run(url, init){
        return spaced(url, init).then(function(res){
          if (res.status === 429){
            return sleep(1000).then(function(){ return run(url, init); });
          }
          if (!res.ok){ return res.text().then(function(t){ throw new Error('HTTP '+res.status+(t?(' — '+t):'')); }); }
          return res.json();
        });
      }
      window.FF_RES_QUEUE = { fetch: function(url, init){ return (chain = chain.then(function(){ return run(url, init); })); } };
    })();
  }

  function root(){ return document.getElementById('mintsFeed'); } // your feed <ul>/<ol> id

  function liHTML(row){
    var tx  = (row && row.txHash) || (row && row.txHashHex) || '';
    var minter = (row && (row.toAddress || (row.to && row.to.address))) || '';
    var when = (row && row.createdAt) || (row && row.timestamp) || '';

    var href = tx ? ('https://etherscan.io/tx/'+tx) : '#';
    var whenTxt = when ? new Date(when).toLocaleString() : '';

    return (
      '<li class="mint-row">'+
        '<div class="mint-main">'+
          '<b class="minter">'+ shorten(minter) +'</b>'+
          ' minted '+
          '<span class="mint-token">#'+ String(row.token && row.token.tokenId || row.tokenId || '') +'</span>'+
        '</div>'+
        '<div class="mint-sub">'+
          '<a class="mint-link" href="'+href+'" target="_blank" rel="noopener">Etherscan</a>'+
          (whenTxt ? '<span class="mint-time">'+whenTxt+'</span>' : '')+
        '</div>'+
      '</li>'
    );
  }

  function paint(rows){
    var el = root(); if (!el) return;
    if (!rows || !rows.length){ el.innerHTML = '<div class="pg-muted">No recent mints.</div>'; return; }
    el.innerHTML = rows.map(liHTML).join('');
  }

  function fetchPage(continuation){
    var qs = new URLSearchParams({
      collection: COLL,
      types: 'mint',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);
    return window.FF_RES_QUEUE.fetch(API + '?' + qs.toString());
  }

  function load(){
    var el = root(); if (!el) return;
    el.innerHTML = '<div class="pg-muted">Loading…</div>';
    fetchPage(null).then(function(j){
      var rows = (j && j.activities) || [];
      paint(rows);
    }).catch(function(e){
      console.warn('[mints-feed] failed', e);
      el.innerHTML = '<div class="pg-muted">Failed to load mints.</div>';
    });
  }

  document.addEventListener('DOMContentLoaded', load);

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
