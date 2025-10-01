// assets/js/rarity-page.js — vanilla ES5-compatible rarity loader used by
// rarity.html. This version intentionally avoids optional chaining, default
// parameters, and other newer syntax so that the cards render in older
// browsers.

(function(global){
  'use strict';

  var FF  = global.FF     || {};
  var CFG = global.FF_CFG || {};

  var GRID       = document.getElementById('rarityGrid');
  var BTN_MORE   = document.getElementById('btnMore');
  var BTN_RANK   = document.getElementById('btnSortRank');
  var BTN_SCORE  = document.getElementById('btnSortScore');
  var FIND_INPUT = document.getElementById('raritySearchId');
  var BTN_GO     = document.getElementById('btnGo');
  if (!GRID) return;

  var PRIMARY_RANK_FILE = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
  var LOOKUP_FILE       = 'assets/freshfrogs_rank_lookup.json';
  var PAGE_SIZE         = 60;
  var SOURCE_PATH       = (CFG.SOURCE_PATH || '').replace(/\/+$/, '');

  var RESERVOIR_HOST = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/, '');
  var RESERVOIR_KEY  = CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '';
  var CTRL_ADDR      = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  var CTRL_DEPLOY    = Number(CFG.CONTROLLER_DEPLOY_BLOCK);

  var allItems   = [];
  var viewItems  = [];
  var offset     = 0;
  var sortMode   = 'rank';
  var lookupMap  = null; // Map<id, {rank, score}>
  var currentUser = null;

  function uiError(msg) {
    GRID.innerHTML = '<div class="pg-muted" style="padding:10px">' + msg + '</div>';
  }

  function clearGrid() {
    GRID.innerHTML = '';
    if (GRID.classList && GRID.classList.add) {
      GRID.classList.add('frog-cards');
    }
  }

  function ensureMoreBtn() {
    if (!BTN_MORE) return;
    BTN_MORE.style.display = offset < viewItems.length ? 'inline-flex' : 'none';
  }

  function asNum(x) {
    var n = Number(x);
    return isFinite(n) ? n : NaN;
  }

  function getRankLike(obj) {
    if (!obj) return NaN;
    if (obj.rank != null) return asNum(obj.rank);
    if (obj.ranking != null) return asNum(obj.ranking);
    if (obj.position != null) return asNum(obj.position);
    if (obj.place != null) return asNum(obj.place);
    return NaN;
  }

  function shortAddr(addr) {
    if (!addr || typeof addr !== 'string') return '\u2014';
    if (addr.length <= 10) return addr;
    return addr.slice(0, 6) + '\u2026' + addr.slice(-4);
  }

  function traitKey(t) {
    if (!t) return '';
    var keys = ['key', 'trait_type', 'traitType', 'trait'];
    for (var i = 0; i < keys.length; i++) {
      if (t[keys[i]] != null) {
        return String(t[keys[i]]).trim();
      }
    }
    return '';
  }

  function traitVal(t) {
    if (!t) return '';
    var keys = ['value', 'trait_value'];
    for (var i = 0; i < keys.length; i++) {
      if (t[keys[i]] != null) {
        return String(t[keys[i]]).trim();
      }
    }
    return '';
  }

  function fmtAgo(ms) {
    if (!ms || !isFinite(ms)) return null;
    var s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    var d = Math.floor(s / 86400);
    if (d >= 1) return d + 'd ago';
    var h = Math.floor((s % 86400) / 3600);
    if (h >= 1) return h + 'h ago';
    var m = Math.floor((s % 3600) / 60);
    if (m >= 1) return m + 'm ago';
    return s + 's ago';
  }

  function sinceMs(sec) {
    if (sec == null) return null;
    var n = Number(sec);
    if (!isFinite(n)) return null;
    return n > 1e12 ? n : n * 1000;
  }

  function getUserAddress() {
    return new Promise(function(resolve){
      try {
        if (global.FF_WALLET && global.FF_WALLET.address) {
          resolve(global.FF_WALLET.address);
          return;
        }
      } catch (err) {}

      try {
        if (global.ethereum && typeof global.ethereum.request === 'function') {
          global.ethereum.request({ method: 'eth_accounts' }).then(function(arr){
            resolve(arr && arr.length ? arr[0] : null);
          }).catch(function(){ resolve(null); });
          return;
        }
      } catch (err2) {}

      resolve(null);
    });
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + url);
      return res.json();
    });
  }

  function parseRankToIdMap(obj) {
    var map = new Map();
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      var rank = asNum(key);
      var id = asNum(obj[key]);
      if (isFinite(rank) && isFinite(id)) {
        map.set(id, { rank: rank, score: 0 });
      }
    }
    return map.size ? map : null;
  }

  function normalizeRankingsArray(arr) {
    return arr
      .map(function(x){
        var id = asNum(x && (x.id != null ? x.id : (x.tokenId != null ? x.tokenId : (x.token_id != null ? x.token_id : (x.frogId != null ? x.frogId : x.frog_id)))));
        var rank = getRankLike(x);
        var score = asNum(x && (x.score != null ? x.score : (x.rarityScore != null ? x.rarityScore : x.points)));
        if (!isFinite(score)) score = 0;
        return { id: id, rank: rank, score: score };
      })
      .filter(function(r){ return isFinite(r.id) && isFinite(r.rank) && r.rank > 0; })
      .sort(function(a, b){ return a.rank - b.rank; });
  }

  function loadLookup() {
    return fetchJson(LOOKUP_FILE).then(function(json){
      if (Array.isArray(json)) {
        var map = new Map();
        for (var i = 0; i < json.length; i++) {
          var id = asNum(json[i]);
          if (isFinite(id)) map.set(id, { rank: i + 1, score: 0 });
        }
        lookupMap = map.size ? map : null;
      } else if (json && typeof json === 'object') {
        lookupMap = parseRankToIdMap(json);
      } else {
        lookupMap = null;
      }
    }).catch(function(err){
      console.warn('[rarity] lookup load failed', err);
      lookupMap = null;
    });
  }

  function loadPrimaryRanks() {
    return fetchJson(PRIMARY_RANK_FILE).then(function(json){
      if (!Array.isArray(json)) return [];
      var arr = normalizeRankingsArray(json);
      if (lookupMap) {
        arr.forEach(function(r){
          var lk = lookupMap.get(r.id);
          if (!lk) return;
          if (!isFinite(r.rank) && isFinite(lk.rank)) r.rank = lk.rank;
          if (!isFinite(r.score) && isFinite(lk.score)) r.score = lk.score;
        });
        arr.sort(function(a, b){ return a.rank - b.rank; });
      }
      return arr;
    }).catch(function(err){
      console.warn('[rarity] primary rankings load failed', err);
      return [];
    });
  }

  function fetchMeta(id) {
    var tries = [
      'frog/json/' + id + '.json',
      'frog/' + id + '.json',
      'assets/frogs/' + id + '.json'
    ];

    var next = function(ix){
      if (ix >= tries.length) {
        return Promise.resolve({ name: 'Frog #' + id, image: 'frog/' + id + '.png', attributes: [] });
      }
      var url = tries[ix];
      return fetch(url, { cache: 'no-store' }).then(function(res){
        if (!res.ok) return next(ix + 1);
        return res.json();
      }).catch(function(){
        return next(ix + 1);
      });
    };

    return next(0);
  }

  function normalizeAttrs(meta) {
    var out = [];
    var arr = meta && Array.isArray(meta.attributes) ? meta.attributes : [];
    for (var i = 0; i < arr.length; i++) {
      var key = traitKey(arr[i]);
      var val = traitVal(arr[i]);
      if (!key || !val) continue;
      out.push({ key: key, value: val });
    }
    return out;
  }

  var _web3 = null;
  var _collection = null;
  var _controller = null;
  var _stakeSinceCache = new Map();
  var _stakerCache = new Map();

  function getWeb3(){
    if (_web3) return _web3;
    if (!global.Web3) return null;

    var provider = null;
    if (global.ethereum) {
      provider = global.ethereum;
    } else if (global.Web3.givenProvider) {
      provider = global.Web3.givenProvider;
    } else if (CFG.RPC_URL && global.Web3 && global.Web3.providers && global.Web3.providers.HttpProvider) {
      try {
        provider = new global.Web3.providers.HttpProvider(CFG.RPC_URL);
      } catch (err) {
        console.warn('[rarity] failed to build HttpProvider', err);
      }
    }

    if (!provider) return null;

    _web3 = new global.Web3(provider);
    return _web3;
  }

  function resolveCollectionAbi(){
    if (typeof global.COLLECTION_ABI !== 'undefined') return global.COLLECTION_ABI;
    if (typeof global.collection_abi !== 'undefined') return global.collection_abi;
    if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI;
    if (typeof collection_abi !== 'undefined') return collection_abi;
    return null;
  }

  function resolveControllerAbi(){
    if (typeof global.CONTROLLER_ABI !== 'undefined') return global.CONTROLLER_ABI;
    if (typeof global.controller_abi !== 'undefined') return global.controller_abi;
    if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI;
    if (typeof controller_abi !== 'undefined') return controller_abi;
    return null;
  }

  function getCollectionContract(){
    if (_collection) return _collection;
    if (!CFG.COLLECTION_ADDRESS) return null;
    var abi = resolveCollectionAbi();
    if (!abi || !abi.length) return null;
    var web3 = getWeb3();
    if (!web3 || !web3.eth || !web3.eth.Contract) return null;
    _collection = new web3.eth.Contract(abi, CFG.COLLECTION_ADDRESS);
    return _collection;
  }

  function getControllerContract(){
    if (_controller) return _controller;
    if (!CFG.CONTROLLER_ADDRESS) return null;
    var abi = resolveControllerAbi();
    if (!abi || !abi.length) return null;
    var web3 = getWeb3();
    if (!web3 || !web3.eth || !web3.eth.Contract) return null;
    _controller = new web3.eth.Contract(abi, CFG.CONTROLLER_ADDRESS);
    return _controller;
  }

  function isHexAddress(addr){
    return typeof addr === 'string' && addr.indexOf('0x') === 0 && addr.length === 42;
  }

  function padTokenHex(id){
    var n = Number(id);
    if (!isFinite(n) || n < 0) n = 0;
    var hex = n.toString(16);
    while (hex.length < 64) hex = '0' + hex;
    return '0x' + hex;
  }

  function fetchStakeTimestamp(id){
    if (_stakeSinceCache.has(id)) return Promise.resolve(_stakeSinceCache.get(id));

    return new Promise(function(resolve){
      try {
        var web3 = getWeb3();
        if (!web3 || !web3.eth || !web3.eth.getPastLogs || !CFG.COLLECTION_ADDRESS || !CTRL_ADDR) {
          _stakeSinceCache.set(id, null);
          resolve(null);
          return;
        }

        var topics = [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          '0x000000000000000000000000' + CTRL_ADDR.slice(2),
          padTokenHex(id)
        ];

        var fromBlock = isFinite(CTRL_DEPLOY) && CTRL_DEPLOY > 0 ? '0x' + CTRL_DEPLOY.toString(16) : '0x0';

        web3.eth.getPastLogs({
          fromBlock: fromBlock,
          toBlock: 'latest',
          address: CFG.COLLECTION_ADDRESS,
          topics: topics
        }).then(function(logs){
          if (!logs || !logs.length) {
            _stakeSinceCache.set(id, null);
            resolve(null);
            return;
          }
          var last = logs[logs.length - 1];
          web3.eth.getBlock(last.blockNumber).then(function(block){
            var ts = block && block.timestamp != null ? Number(block.timestamp) : null;
            var ms = ts ? (ts > 1e12 ? ts : ts * 1000) : null;
            _stakeSinceCache.set(id, ms);
            resolve(ms);
          }).catch(function(err){
            console.warn('[rarity] stake block lookup failed', err);
            _stakeSinceCache.set(id, null);
            resolve(null);
          });
        }).catch(function(err2){
          console.warn('[rarity] stake log lookup failed', err2);
          _stakeSinceCache.set(id, null);
          resolve(null);
        });
      } catch (err3) {
        console.warn('[rarity] stake timestamp error', err3);
        _stakeSinceCache.set(id, null);
        resolve(null);
      }
    });
  }

  function fetchStakerAddress(id){
    if (_stakerCache.has(id)) return Promise.resolve(_stakerCache.get(id));

    return new Promise(function(resolve){
      try {
        var ctrl = getControllerContract();
        if (!ctrl || !ctrl.methods || !ctrl.methods.stakerAddress) {
          _stakerCache.set(id, null);
          resolve(null);
          return;
        }
        ctrl.methods.stakerAddress(String(id)).call().then(function(addr){
          if (!addr || !isHexAddress(addr) || addr === '0x0000000000000000000000000000000000000000') {
            _stakerCache.set(id, null);
            resolve(null);
            return;
          }
          _stakerCache.set(id, addr);
          resolve(addr);
        }).catch(function(err){
          console.warn('[rarity] staker lookup failed', err);
          _stakerCache.set(id, null);
          resolve(null);
        });
      } catch (err2) {
        console.warn('[rarity] staker error', err2);
        _stakerCache.set(id, null);
        resolve(null);
      }
    });
  }

  function ownerFromContract(id){
    return new Promise(function(resolve){
      try {
        var contract = getCollectionContract();
        if (!contract) { resolve(null); return; }
        contract.methods.ownerOf(String(id)).call().then(function(addr){
          resolve(addr || null);
        }).catch(function(){ resolve(null); });
      } catch (err) {
        resolve(null);
      }
    });
  }

  function ownerFromReservoir(id){
    if (!RESERVOIR_KEY || !CFG.COLLECTION_ADDRESS) return Promise.resolve(null);
    var token = CFG.COLLECTION_ADDRESS + ':' + id;
    var url = RESERVOIR_HOST + '/owners/v2?tokens=' + encodeURIComponent(token) + '&limit=1';
    return fetch(url, {
      headers: {
        accept: 'application/json',
        'x-api-key': RESERVOIR_KEY
      }
    }).then(function(res){
      if (!res.ok) return null;
      return res.json();
    }).then(function(json){
      if (!json || !json.owners || !json.owners.length) return null;
      var owner = json.owners[0] && json.owners[0].owner;
      return (typeof owner === 'string' && owner.indexOf('0x') === 0) ? owner : null;
    }).catch(function(err){
      console.warn('[rarity] reservoir owner lookup failed', err);
      return null;
    });
  }

  function fetchOwnerOf(id){
    return ownerFromContract(id).then(function(onchain){
      var holder = isHexAddress(onchain) ? onchain : null;
      var controllerOwned = !!(holder && CTRL_ADDR && holder.toLowerCase() === CTRL_ADDR);

      if (controllerOwned) {
        return fetchStakerAddress(id).then(function(staker){
          return (staker ? Promise.resolve(staker) : ownerFromReservoir(id)).then(function(ownerGuess){
            return fetchStakeTimestamp(id).then(function(since){
              return {
                owner: staker || ownerGuess || null,
                holder: holder,
                controllerOwned: true,
                stakeSinceMs: since,
                staker: staker || null
              };
            });
          });
        });
      }

      if (holder) {
        return {
          owner: holder,
          holder: holder,
          controllerOwned: false,
          stakeSinceMs: null,
          staker: null
        };
      }

      return ownerFromReservoir(id).then(function(resOwner){
        return {
          owner: resOwner || null,
          holder: holder,
          controllerOwned: false,
          stakeSinceMs: null,
          staker: null
        };
      });
    }).catch(function(err){
      console.warn('[rarity] owner lookup fallback', err);
      return ownerFromReservoir(id).then(function(resOwner){
        return {
          owner: resOwner || null,
          holder: null,
          controllerOwned: false,
          stakeSinceMs: null,
          staker: null
        };
      }).catch(function(){
        return {
          owner: null,
          holder: null,
          controllerOwned: false,
          stakeSinceMs: null,
          staker: null
        };
      });
    });
  }

  function fetchStakeInfo(id){
    return new Promise(function(resolve){
      var done = false;
      function finish(info){
        if (done) return;
        done = true;
        resolve(info || { staked: false, since: null });
      }

      try {
        if (FF.staking && typeof FF.staking.getStakeInfo === 'function') {
          FF.staking.getStakeInfo(id).then(function(info){ finish(info); }).catch(function(){ finish(null); });
          return;
        }
      } catch (err) {
        console.warn('[rarity] staking info via FF.staking failed', err);
      }

      try {
        if (global.STAKING_ADAPTER && typeof global.STAKING_ADAPTER.getStakeInfo === 'function') {
          global.STAKING_ADAPTER.getStakeInfo(id).then(function(info){ finish(info); }).catch(function(){ finish(null); });
          return;
        }
      } catch (err2) {
        console.warn('[rarity] staking adapter lookup failed', err2);
      }

      finish(null);
    });
  }

  function normalizeStake(info){
    var staked = info && !!info.staked;
    var since = null;
    if (info) {
      if (info.since != null) since = info.since;
      else if (info.sinceMs != null) since = info.sinceMs;
      else if (info.since_ms != null) since = info.since_ms;
      else if (info.stakedSince != null) since = info.stakedSince;
    }
    return { staked: staked, sinceMs: sinceMs(since) };
  }

  function fallbackMetaLine(item){
    var ownerLabel = null;
    if (item.ownerYou) ownerLabel = 'You';
    else if (item.ownerShort && item.ownerShort !== '\u2014') ownerLabel = item.ownerShort;
    else if (item.owner) ownerLabel = shortAddr(item.owner);
    else if (item.holder) ownerLabel = shortAddr(item.holder);
    if (!ownerLabel) ownerLabel = 'Unknown';
    if (item.staked) {
      var ago = item.sinceMs ? fmtAgo(item.sinceMs) : null;
      return '<span class="staked-flag">Staked</span>' + (ago ? (' ' + ago) : '') + ' by ' + ownerLabel;
    }
    return 'Owned by ' + ownerLabel;
  }

  function metaLineForCard(item){
    try {
      if (global.FF && typeof global.FF.formatOwnerLine === 'function') {
        return global.FF.formatOwnerLine(item);
      }
    } catch (err) {
      console.warn('[rarity] meta line formatter failed', err);
    }
    return fallbackMetaLine(item);
  }

  function buildFallbackCard(rec) {
    var card = document.createElement('article');
    card.className = 'frog-card';
    card.setAttribute('data-token-id', String(rec.id));

    var row = document.createElement('div');
    row.className = 'row';

    var thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';

    var img = document.createElement('img');
    img.className = 'thumb';
    img.alt = (rec.metaRaw && rec.metaRaw.name) ? rec.metaRaw.name : ('Frog #' + rec.id);
    img.loading = 'lazy';
    img.src = (rec.metaRaw && rec.metaRaw.image) ? rec.metaRaw.image : (SOURCE_PATH + '/frog/' + rec.id + '.png');
    thumbWrap.appendChild(img);

    var right = document.createElement('div');
    var title = document.createElement('h4');
    title.className = 'title';
    title.textContent = (rec.metaRaw && rec.metaRaw.name) ? rec.metaRaw.name : ('Frog #' + rec.id);
    if (rec.rank != null) {
      var pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = '♦ #' + rec.rank;
      title.appendChild(pill);
    }
    var metaLine = document.createElement('div');
    metaLine.className = 'meta';
    metaLine.innerHTML = metaLineForCard(rec);

    right.appendChild(title);
    right.appendChild(metaLine);

    if (rec.attrs && rec.attrs.length) {
      var list = document.createElement('ul');
      list.className = 'attr-bullets';
      rec.attrs.forEach(function(attr){
        var li = document.createElement('li');
        li.innerHTML = '<b>' + attr.key + ':</b> ' + attr.value;
        list.appendChild(li);
      });
      right.appendChild(list);
    }

    row.appendChild(thumbWrap);
    row.appendChild(right);
    card.appendChild(row);
    return card;
  }

  function buildCard(rec) {
    if (global.FF && typeof global.FF.buildFrogCard === 'function') {
      return global.FF.buildFrogCard({
        id: rec.id,
        rank: rec.rank,
        attrs: rec.attrs,
        staked: rec.staked,
        sinceMs: rec.sinceMs,
        metaRaw: rec.metaRaw,
        owner: rec.owner,
        ownerShort: rec.ownerShort,
        ownerYou: rec.ownerYou,
        holder: rec.holder
      }, {
        showActions: false,
        rarityTiers: CFG.RARITY_TIERS,
        metaLine: metaLineForCard
      });
    }
    return buildFallbackCard(rec);
  }

  function loadMore() {
    var slice = viewItems.slice(offset, offset + PAGE_SIZE);
    if (!slice.length) {
      ensureMoreBtn();
      return Promise.resolve();
    }

    return Promise.all(slice.map(function(x){ return fetchMeta(x.id); }))
      .then(function(metas){
        return Promise.all(slice.map(function(x){ return fetchOwnerOf(x.id); })).then(function(owners){
          return Promise.all(slice.map(function(x){ return fetchStakeInfo(x.id); })).then(function(stakes){
            var frag = document.createDocumentFragment();
            for (var i = 0; i < slice.length; i++) {
              var meta = metas[i] || { attributes: [] };
              var ownerInfo = owners[i] || {};
              if (ownerInfo && typeof ownerInfo === 'string') {
                ownerInfo = { owner: ownerInfo, holder: ownerInfo, controllerOwned: false, stakeSinceMs: null, staker: null };
              }
              var stake = normalizeStake(stakes[i] || null);
              var attrs = normalizeAttrs(meta);

              var isStaked = stake.staked || !!ownerInfo.controllerOwned;
              var since = stake.sinceMs || ownerInfo.stakeSinceMs || null;
              var actualOwner = ownerInfo.owner || null;
              if (!actualOwner && !isStaked && ownerInfo.holder) {
                actualOwner = ownerInfo.holder;
              }
              if (!actualOwner && ownerInfo.staker) {
                actualOwner = ownerInfo.staker;
              }

              var ownerShort = actualOwner ? shortAddr(actualOwner) : null;
              var ownerYou = false;
              if (currentUser && actualOwner && typeof currentUser === 'string' && typeof actualOwner === 'string') {
                ownerYou = currentUser.toLowerCase() === actualOwner.toLowerCase();
              } else if (currentUser && !actualOwner && ownerInfo.holder && typeof ownerInfo.holder === 'string') {
                ownerYou = currentUser.toLowerCase() === ownerInfo.holder.toLowerCase();
              }

              var rec = {
                id: slice[i].id,
                rank: slice[i].rank,
                score: slice[i].score,
                metaRaw: meta,
                attrs: attrs,
                staked: isStaked,
                sinceMs: since,
                owner: actualOwner,
                ownerShort: ownerShort,
                ownerYou: ownerYou,
                holder: ownerInfo && ownerInfo.holder ? ownerInfo.holder : null
              };
              frag.appendChild(buildCard(rec));
            }

            GRID.appendChild(frag);
            offset += slice.length;
            ensureMoreBtn();
          });
        });
      }).catch(function(err){
        console.error('[rarity] loadMore failed', err);
        uiError('Failed to load frogs.');
      });
  }

  function resort() {
    viewItems.sort(function(a, b){
      if (sortMode === 'rank') return a.rank - b.rank;
      var diff = (b.score - a.score);
      if (diff) return diff;
      return a.rank - b.rank;
    });
    offset = 0;
    clearGrid();
    loadMore();
  }

  function jumpToId(id) {
    var ix = -1;
    for (var i = 0; i < viewItems.length; i++) {
      if (viewItems[i].id === id) { ix = i; break; }
    }
    if (ix < 0) return;
    offset = Math.floor(ix / PAGE_SIZE) * PAGE_SIZE;
    clearGrid();
    loadMore();
  }

  function init() {
    loadLookup().then(function(){
      return loadPrimaryRanks();
    }).then(function(primary){
      if (primary && primary.length) {
        allItems = primary;
      } else if (lookupMap && lookupMap.size) {
        allItems = Array.from(lookupMap).map(function(entry){
          return { id: entry[0], rank: entry[1].rank, score: entry[1].score || 0 };
        }).sort(function(a, b){ return a.rank - b.rank; });
      } else {
        uiError('Could not load rarity data. Check both JSON files\' shapes.');
        return null;
      }

      viewItems = allItems.slice(0);
      offset = 0;
      clearGrid();

      return getUserAddress().then(function(addr){
        currentUser = addr;
        return loadMore();
      });
    }).then(function(){
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';

      if (BTN_MORE) BTN_MORE.addEventListener('click', function(){ loadMore(); });
      if (BTN_RANK) BTN_RANK.addEventListener('click', function(){ sortMode = 'rank'; resort(); });
      if (BTN_SCORE) BTN_SCORE.addEventListener('click', function(){ sortMode = 'score'; resort(); });
      if (BTN_GO) BTN_GO.addEventListener('click', function(){
        var id = Number(FIND_INPUT && FIND_INPUT.value);
        if (isFinite(id)) jumpToId(id);
      });

      if (global.ethereum && typeof global.ethereum.on === 'function') {
        global.ethereum.on('accountsChanged', function(){ global.location.reload(); });
      }
    }).catch(function(err){
      console.error('[rarity] init error', err);
      uiError('Failed to initialize rarity view. See console for details.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
