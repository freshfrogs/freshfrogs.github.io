(function(global){
  'use strict';

  const output = document.getElementById('terminalOutput');
  const form = document.getElementById('terminalForm');
  const input = document.getElementById('command');
  if (!output || !form || !input) return;

  const CFG = global.FF_CFG || {};
  const SOURCE = String(CFG.SOURCE_PATH || '').replace(/\/+$/, '');
  const RANKS_PATH = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
  const CONTROLLER_ADDR = String(CFG.CONTROLLER_ADDRESS || '').toLowerCase();

  const state = {
    ranks: [],
    rankMap: {},
    rarityCursor: 0,
    loadingRanks: null,
    metaCache: new Map(),
    wallet: { address: null, short: '', connected: false },
    busy: false
  };

  const stakeCache = new Map();
  let web3Read = null;
  let web3Write = null;
  let collectionRead = null;
  let collectionWrite = null;
  let controllerRead = null;

  function fullPath(rel){
    if (!rel) return '';
    if (/^https?:/i.test(rel)) return rel;
    const clean = String(rel).replace(/^\/+/, '');
    if (SOURCE) return SOURCE + '/' + clean;
    return clean;
  }

  function scrollToBottom(){ output.scrollTop = output.scrollHeight; }

  function write(line){
    output.textContent += String(line || '') + '\n';
    scrollToBottom();
  }

  function promptLine(cmd){
    write('$ ' + cmd);
  }

  function shorten(addr){
    if (!addr) return '';
    const str = String(addr);
    if (str.length <= 10) return str;
    return str.slice(0, 6) + '\u2026' + str.slice(-4);
  }

  function padId(id){
    let str = String(id);
    while (str.length < 4) str = '0' + str;
    return str;
  }

  function parseError(err){
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.error && typeof err.error.message === 'string') return err.error.message;
    if (typeof err.message === 'string') return err.message;
    try { return JSON.stringify(err); }
    catch(_) { return String(err); }
  }

  function parseTokenId(raw){
    if (raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  }

  function parseCount(raw, fallback){
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
  }

  function isHexAddress(addr){
    return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  function setWallet(addr, silent){
    const next = addr ? String(addr) : null;
    state.wallet.address = next;
    state.wallet.connected = !!next;
    state.wallet.short = next ? shorten(next) : '';

    // mirror globals used elsewhere
    global.FF = global.FF || {};
    global.FF.wallet = { address: next, connected: !!next };
    global.FF_WALLET = { address: next, connected: !!next };
    global.WALLET_ADDR = next;
    global.SELECTED_WALLET = next;

    if (next){
      if (!silent) write('> wallet connected: ' + shorten(next));
      try {
        global.dispatchEvent(new global.CustomEvent('wallet:connected', { detail: { address: next } }));
        global.dispatchEvent(new global.CustomEvent('FF:walletConnected', { detail: { address: next } }));
      } catch (_) {}
    } else {
      if (!silent) write('> wallet disconnected.');
      try {
        global.dispatchEvent(new global.CustomEvent('wallet:disconnected'));
        global.dispatchEvent(new global.CustomEvent('FF:walletDisconnected'));
      } catch (_) {}
    }
  }

  function ensureWallet(){
    if (state.wallet.address) return state.wallet.address;
    write('> connect a wallet first with `connect`.');
    return null;
  }

  function getWeb3Read(){
    if (web3Read) return web3Read;
    if (!global.Web3) return null;
    try {
      if (CFG.RPC_URL){
        web3Read = new global.Web3(new global.Web3.providers.HttpProvider(CFG.RPC_URL));
      } else if (global.ethereum){
        web3Read = new global.Web3(global.ethereum);
      }
    } catch (err) {
      console.warn('[terminal] web3 read init failed', err);
      web3Read = null;
    }
    return web3Read;
  }

  function getWeb3Write(){
    if (web3Write) return web3Write;
    if (!global.Web3 || !global.ethereum) return null;
    try {
      web3Write = new global.Web3(global.ethereum);
    } catch (err) {
      console.warn('[terminal] web3 write init failed', err);
      web3Write = null;
    }
    return web3Write;
  }

  function resolveCollectionAbi(){
    if (typeof global.COLLECTION_ABI !== 'undefined') return global.COLLECTION_ABI;
    if (typeof global.collection_abi !== 'undefined') return global.collection_abi;
    if (typeof global.COLLECTION_ABI !== 'undefined') return global.COLLECTION_ABI;
    try { if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI; }
    catch (_) {}
    return [];
  }

  function resolveControllerAbi(){
    if (typeof global.CONTROLLER_ABI !== 'undefined') return global.CONTROLLER_ABI;
    if (typeof global.controller_abi !== 'undefined') return global.controller_abi;
    try { if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI; }
    catch (_) {}
    return [];
  }

  function getCollectionContractRead(){
    if (collectionRead) return collectionRead;
    const web3 = getWeb3Read();
    if (!web3 || !CFG.COLLECTION_ADDRESS) return null;
    try {
      collectionRead = new web3.eth.Contract(resolveCollectionAbi(), CFG.COLLECTION_ADDRESS);
    } catch (err) {
      console.warn('[terminal] collection read contract failed', err);
      collectionRead = null;
    }
    return collectionRead;
  }

  function getCollectionContractWrite(){
    if (collectionWrite) return collectionWrite;
    const web3 = getWeb3Write();
    if (!web3 || !CFG.COLLECTION_ADDRESS) return null;
    try {
      collectionWrite = new web3.eth.Contract(resolveCollectionAbi(), CFG.COLLECTION_ADDRESS);
    } catch (err) {
      console.warn('[terminal] collection write contract failed', err);
      collectionWrite = null;
    }
    return collectionWrite;
  }

  function getControllerContractRead(){
    if (controllerRead) return controllerRead;
    const web3 = getWeb3Read();
    if (!web3 || !CFG.CONTROLLER_ADDRESS) return null;
    try {
      controllerRead = new web3.eth.Contract(resolveControllerAbi(), CFG.CONTROLLER_ADDRESS);
    } catch (err) {
      console.warn('[terminal] controller read contract failed', err);
      controllerRead = null;
    }
    return controllerRead;
  }

  function ensureRanks(){
    if (state.ranks.length) return Promise.resolve(state.ranks);
    if (state.loadingRanks) return state.loadingRanks;

    write('> fetching rarity rankings…');
    state.loadingRanks = fetch(fullPath(RANKS_PATH)).then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(json){
      const rows = [];
      const map = {};
      if (Array.isArray(json)){
        json.forEach(function(item){
          if (!item) return;
          const id = Number(item.id || item.tokenId || item.token_id);
          const rank = Number(item.ranking != null ? item.ranking : item.rank);
          if (!Number.isFinite(id) || !Number.isFinite(rank)) return;
          const score = item.score != null ? Number(item.score) : null;
          rows.push({ id, ranking: rank, score });
          map[id] = rank;
        });
      }
      rows.sort(function(a, b){ return a.ranking - b.ranking; });
      state.ranks = rows;
      state.rankMap = map;
      state.rarityCursor = 0;
      write('> loaded ' + rows.length + ' frogs from rarity file.');
      return rows;
    }).catch(function(err){
      write('> error loading rarity data: ' + parseError(err));
      state.ranks = [];
      state.rankMap = {};
      throw err;
    }).finally(function(){ state.loadingRanks = null; });

    return state.loadingRanks;
  }

  function traitSummary(meta, max){
    if (!meta || !Array.isArray(meta.attributes)) return '';
    const limit = max || 4;
    const out = [];
    for (let i = 0; i < meta.attributes.length; i += 1){
      const attr = meta.attributes[i] || {};
      const key = attr.key || attr.trait_type || attr.traitType || attr.type;
      const val = attr.value != null ? attr.value : attr.trait_value;
      if (!key || val == null) continue;
      out.push(key + ': ' + val);
      if (out.length >= limit) break;
    }
    return out.join('  |  ');
  }

  function fetchMeta(id){
    if (state.metaCache.has(id)) return state.metaCache.get(id);
    const promise = fetch(fullPath('frog/json/' + id + '.json')).then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(json){
      state.metaCache.set(id, json);
      return json;
    }).catch(function(err){
      console.warn('[terminal] metadata fetch failed', id, err);
      state.metaCache.set(id, null);
      return null;
    });
    state.metaCache.set(id, promise);
    return promise;
  }

  function formatOwnerLine(info){
    if (!info) return 'Owner unknown';
    const labelRaw = info.owner || info.holder || null;
    const label = labelRaw ? shorten(labelRaw) : 'Unknown';
    if (info.staked){
      const days = info.stakedDays != null ? info.stakedDays : (info.sinceMs ? Math.floor(Math.max(0, Date.now() - info.sinceMs) / 86400000) : null);
      return 'Staked ' + (days != null ? (days + 'd ago') : 'recently') + ' by ' + label;
    }
    return 'Owned by ' + label;
  }

  function fetchOwnerDetails(id){
    if (stakeCache.has(id)) return stakeCache.get(id);

    const promise = (async function(){
      const collection = getCollectionContractRead();
      if (!collection) return { owner: null, holder: null, staked: false, staker: null, stakedDays: null, sinceMs: null };

      let holder = null;
      try {
        holder = await collection.methods.ownerOf(String(id)).call();
      } catch (err) {
        console.warn('[terminal] ownerOf failed for', id, err);
        holder = null;
      }

      if (!holder) return { owner: null, holder: null, staked: false, staker: null, stakedDays: null, sinceMs: null };

      const normalizedHolder = String(holder).toLowerCase();
      if (CONTROLLER_ADDR && normalizedHolder === CONTROLLER_ADDR){
        let staker = null;
        const controller = getControllerContractRead();
        if (controller){
          try {
            staker = await controller.methods.stakerAddress(String(id)).call();
            if (staker && /^0x0{40}$/i.test(staker)) staker = null;
          } catch (err2) {
            console.warn('[terminal] stakerAddress failed', err2);
            staker = null;
          }
        }
        let days = null;
        try {
          if (global.FFAPI && typeof global.FFAPI.fetchStakedDaysAgo === 'function'){
            const res = await global.FFAPI.fetchStakedDaysAgo(id);
            if (res != null && Number.isFinite(Number(res))) days = Number(res);
          }
        } catch (err3) {
          console.warn('[terminal] stakedDays lookup failed', err3);
        }
        const sinceMs = days != null ? Date.now() - (days * 86400000) : null;
        return {
          owner: staker || null,
          holder,
          staked: true,
          staker: staker || null,
          stakedDays: days != null ? days : null,
          sinceMs
        };
      }

      return {
        owner: holder,
        holder,
        staked: false,
        staker: null,
        stakedDays: null,
        sinceMs: null
      };
    })().then(function(result){
      stakeCache.set(id, result);
      return result;
    });

    stakeCache.set(id, promise);
    return promise;
  }

  async function commandList(countArg){
    try {
      await ensureRanks();
    } catch (_) {
      return;
    }

    const count = countArg ? parseCount(countArg, 5) : 5;
    if (!state.ranks.length){
      write('> no rarity data available.');
      return;
    }
    if (state.rarityCursor >= state.ranks.length){
      write('> end of rankings reached. use `reset` to restart.');
      return;
    }

    const slice = state.ranks.slice(state.rarityCursor, state.rarityCursor + count);
    state.rarityCursor += slice.length;
    write('> listing ' + slice.length + ' frogs from position ' + (state.rarityCursor - slice.length + 1) + '…');

    const metas = await Promise.all(slice.map(function(entry){ return fetchMeta(entry.id); }));
    slice.forEach(function(entry, idx){
      const meta = metas[idx];
      const name = meta && meta.name ? meta.name : ('Frog #' + entry.id);
      const traits = traitSummary(meta, 4);
      write('  #' + padId(entry.id) + '  ♦ #' + entry.ranking + '  ' + name);
      if (traits) write('     ' + traits);
    });

    if (state.rarityCursor < state.ranks.length){
      write('> more available — run `list` again.');
    } else {
      write('> reached the tail of the rankings.');
    }
  }

  async function commandShow(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: show <tokenId>'); return; }

    try { await ensureRanks(); } catch (_) {}
    const rank = state.rankMap[id] != null ? state.rankMap[id] : null;

    const meta = await fetchMeta(id);
    const ownerInfo = await fetchOwnerDetails(id).catch(function(){ return null; });

    write('> detail for #' + padId(id));
    if (rank != null) write('    rarity rank: ' + rank);
    if (meta && meta.name) write('    name: ' + meta.name);
    if (ownerInfo) write('    ' + formatOwnerLine(ownerInfo));
    if (meta && meta.description) write('    description: ' + meta.description);
    if (meta && Array.isArray(meta.attributes) && meta.attributes.length){
      write('    attributes:');
      meta.attributes.forEach(function(attr){
        if (!attr) return;
        const key = attr.key || attr.trait_type || attr.traitType || attr.type;
        const val = attr.value != null ? attr.value : attr.trait_value;
        if (!key || val == null) return;
        write('      - ' + key + ': ' + val);
      });
    }
  }

  async function fetchOwnedFrogs(address, limit){
    if (!global.FFAPI || typeof global.FFAPI.fetchOwnedFrogs !== 'function'){
      throw new Error('Owned API unavailable');
    }
    const results = [];
    let continuation = null;
    let remaining = limit === Infinity ? Infinity : limit;
    do {
      const pageSize = remaining === Infinity ? 20 : Math.min(20, Math.max(1, remaining));
      const page = await global.FFAPI.fetchOwnedFrogs(address, continuation, pageSize);
      if (page.items && page.items.length) results.push.apply(results, page.items);
      continuation = page.continuation || null;
      if (remaining !== Infinity) remaining -= pageSize;
      if (!continuation) break;
      if (remaining <= 0) break;
    } while (true);
    return results;
  }

  async function commandOwned(args){
    let target = null;
    let limit = 10;
    let fetchAll = false;

    (args || []).forEach(function(arg){
      if (arg === 'all'){ fetchAll = true; limit = Infinity; return; }
      if (isHexAddress(arg)){ target = arg; return; }
      const parsed = parseCount(arg, NaN);
      if (Number.isFinite(parsed)) limit = parsed;
    });

    if (!target) target = ensureWallet();
    if (!target) return;

    if (fetchAll) write('> fetching all frogs currently held by ' + shorten(target) + '…');
    else write('> fetching up to ' + limit + ' frogs owned by ' + shorten(target) + '…');

    let items = [];
    try {
      items = await fetchOwnedFrogs(target, limit === Infinity ? Infinity : limit);
    } catch (err) {
      write('> owned lookup failed: ' + parseError(err));
      return;
    }

    if (!items.length){
      write('> no frogs currently in that wallet.');
    } else {
      try { await ensureRanks(); } catch (_) {}
      const metas = await Promise.all(items.map(function(it){ return fetchMeta(it.id); }));
      write('> wallet holds ' + items.length + ' frog' + (items.length === 1 ? '' : 's') + ':');
      items.forEach(function(item, idx){
        const meta = metas[idx];
        const rank = state.rankMap[item.id] != null ? state.rankMap[item.id] : null;
        const name = meta && meta.name ? meta.name : ('Frog #' + item.id);
        const traits = traitSummary(meta || item, 3);
        const rankText = rank != null ? ('♦ #' + rank) : 'rank ?';
        write('  #' + padId(item.id) + '  ' + rankText + '  ' + name);
        if (traits) write('     ' + traits);
      });
    }

    if (global.FFAPI && typeof global.FFAPI.fetchStakedFrogsDetailed === 'function'){
      try {
        const staked = await global.FFAPI.fetchStakedFrogsDetailed(target);
        if (staked && staked.length){
          await ensureRanks().catch(function(){});
          write('> staked via controller (' + staked.length + '):');
          for (let i = 0; i < staked.length; i += 1){
            const row = staked[i];
            const rank = state.rankMap[row.id] != null ? state.rankMap[row.id] : null;
            const meta = await fetchMeta(row.id);
            const name = meta && meta.name ? meta.name : ('Frog #' + row.id);
            const days = row.stakedDays != null ? row.stakedDays : '??';
            write('  #' + padId(row.id) + '  ' + (rank != null ? ('♦ #' + rank) : 'rank ?') + '  Staked ' + days + 'd ago by ' + shorten(target) + ' :: ' + name);
          }
        }
      } catch (err2) {
        write('> staked detail lookup failed: ' + parseError(err2));
      }
    }
  }

  async function commandStaked(args){
    let target = null;
    let mode = 'time';

    (args || []).forEach(function(arg){
      if (arg === 'rank' || arg === 'time'){ mode = arg; return; }
      if (isHexAddress(arg)){ target = arg; }
    });

    if (!target) target = ensureWallet();
    if (!target) return;

    if (!global.FFAPI || typeof global.FFAPI.fetchStakedFrogsDetailed !== 'function'){
      write('> staked lookup unavailable.');
      return;
    }

    write('> fetching frogs staked by ' + shorten(target) + '…');

    let rows = [];
    try {
      rows = await global.FFAPI.fetchStakedFrogsDetailed(target);
    } catch (err) {
      write('> staked lookup failed: ' + parseError(err));
      return;
    }

    if (!rows.length){
      write('> no frogs currently staked for that wallet.');
      return;
    }

    try { await ensureRanks(); } catch (_) {}

    rows = rows.map(function(row){
      return Object.assign({}, row, {
        rank: state.rankMap[row.id] != null ? state.rankMap[row.id] : null
      });
    });

    if (mode === 'rank'){
      rows.sort(function(a, b){
        const av = a.rank != null ? a.rank : 1e9;
        const bv = b.rank != null ? b.rank : 1e9;
        return av - bv;
      });
    } else {
      rows.sort(function(a, b){
        const av = a.stakedDays != null ? a.stakedDays : -1;
        const bv = b.stakedDays != null ? b.stakedDays : -1;
        return bv - av;
      });
    }

    write('> ' + rows.length + ' frog' + (rows.length === 1 ? '' : 's') + ' currently staked (' + (mode === 'rank' ? 'sorted by rarity' : 'sorted by time staked') + '):');

    for (let i = 0; i < rows.length; i += 1){
      const row = rows[i];
      const meta = await fetchMeta(row.id);
      const name = meta && meta.name ? meta.name : ('Frog #' + row.id);
      const rankLabel = row.rank != null ? ('♦ #' + row.rank) : 'rank ?';
      const days = row.stakedDays != null ? row.stakedDays : '??';
      write('  #' + padId(row.id) + '  ' + rankLabel + '  Staked ' + days + 'd ago by ' + shorten(target) + ' :: ' + name);
    }
  }

  async function commandConnect(){
    if (!global.ethereum){
      write('> no injected wallet detected. Install MetaMask or a compatible provider.');
      return;
    }
    try {
      const accounts = await global.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]){
        setWallet(accounts[0]);
      } else {
        write('> wallet returned no account.');
      }
    } catch (err) {
      write('> connect failed: ' + parseError(err));
    }
  }

  async function commandStatus(){
    if (!state.wallet.address){
      write('> wallet not connected. use `connect`.');
      return;
    }
    write('> wallet address: ' + state.wallet.address + ' (' + state.wallet.short + ')');
    if (global.FFAPI && typeof global.FFAPI.fetchAvailableRewards === 'function'){
      try {
        const rewards = await global.FFAPI.fetchAvailableRewards(state.wallet.address);
        const pretty = rewards && rewards.pretty ? rewards.pretty : null;
        const raw = rewards && rewards.raw != null ? rewards.raw : null;
        if (pretty || raw){
          write('> unclaimed rewards: ' + (pretty || raw));
        }
      } catch (err) {
        write('> rewards lookup failed: ' + parseError(err));
      }
    }
  }

  async function commandApprove(){
    const addr = ensureWallet();
    if (!addr) return;
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.approveIfNeeded !== 'function'){
      write('> staking adapter unavailable.');
      return;
    }
    write('> sending approval transaction to allow staking controller…');
    try {
      const receipt = await staking.approveIfNeeded();
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : (receipt && receipt.tx) ? receipt.tx : '(pending)';
      write('> approval transaction confirmed: ' + hash);
    } catch (err) {
      write('> approval failed: ' + parseError(err));
    }
  }

  async function ensureApproved(addr){
    const staking = global.FF && global.FF.staking;
    if (!staking) return false;
    if (typeof staking.isApproved === 'function'){
      try {
        const ok = await staking.isApproved(addr);
        if (ok) return true;
      } catch (err) {
        console.warn('[terminal] isApproved check failed', err);
      }
    }
    if (typeof staking.approveIfNeeded === 'function'){
      write('> controller approval required — requesting approval…');
      try {
        await staking.approveIfNeeded();
        write('> approval granted.');
        return true;
      } catch (err2) {
        write('> approval request failed: ' + parseError(err2));
        return false;
      }
    }
    write('> unable to verify controller approval.');
    return false;
  }

  async function commandStake(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: stake <tokenId>'); return; }
    const addr = ensureWallet();
    if (!addr) return;
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.stakeToken !== 'function'){
      write('> staking adapter unavailable.');
      return;
    }
    const approved = await ensureApproved(addr);
    if (!approved) return;
    write('> sending stake transaction for #' + id + '…');
    try {
      const receipt = await staking.stakeToken(id);
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> stake confirmed: ' + hash);
    } catch (err) {
      write('> stake failed: ' + parseError(err));
    }
  }

  async function commandUnstake(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: unstake <tokenId>'); return; }
    const addr = ensureWallet();
    if (!addr) return;
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.unstakeToken !== 'function'){
      write('> staking adapter unavailable.');
      return;
    }
    write('> sending unstake transaction for #' + id + '…');
    try {
      const receipt = await staking.unstakeToken(id);
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> unstake confirmed: ' + hash);
    } catch (err) {
      write('> unstake failed: ' + parseError(err));
    }
  }

  async function commandTransfer(idArg, toArg){
    const id = parseTokenId(idArg);
    if (!id || !toArg){ write('> usage: transfer <tokenId> <recipientAddress>'); return; }
    const addr = ensureWallet();
    if (!addr) return;
    if (!isHexAddress(toArg)){ write('> recipient must be a valid Ethereum address.'); return; }
    if (String(toArg).toLowerCase() === String(addr).toLowerCase()){ write('> recipient is your wallet already.'); return; }
    if (CONTROLLER_ADDR && String(toArg).toLowerCase() === CONTROLLER_ADDR){ write('> cannot transfer directly to the controller contract.'); return; }

    const contract = getCollectionContractWrite();
    if (!contract){ write('> NFT contract unavailable (missing provider?).'); return; }

    write('> sending transfer for #' + id + ' to ' + shorten(toArg) + '…');
    try {
      const receipt = await contract.methods.safeTransferFrom(addr, toArg, String(id)).send({ from: addr });
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> transfer confirmed: ' + hash);
    } catch (err) {
      write('> transfer failed: ' + parseError(err));
    }
  }

  async function commandRewards(addrArg){
    const target = addrArg && isHexAddress(addrArg) ? addrArg : ensureWallet();
    if (!target) return;
    if (!global.FFAPI || typeof global.FFAPI.fetchAvailableRewards !== 'function'){
      write('> rewards lookup unavailable.');
      return;
    }
    try {
      const res = await global.FFAPI.fetchAvailableRewards(target);
      if (!res){ write('> rewards unavailable.'); return; }
      const pretty = res.pretty || null;
      const raw = res.raw != null ? res.raw : null;
      write('> rewards for ' + shorten(target) + ': ' + (pretty || raw || '0'));
    } catch (err) {
      write('> rewards lookup failed: ' + parseError(err));
    }
  }

  async function commandClaim(){
    const addr = ensureWallet();
    if (!addr) return;
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.claimRewards !== 'function'){
      write('> staking adapter unavailable.');
      return;
    }
    write('> sending claim transaction…');
    try {
      const receipt = await staking.claimRewards();
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> claim confirmed: ' + hash);
    } catch (err) {
      write('> claim failed: ' + parseError(err));
    }
  }

  function commandReset(){
    state.rarityCursor = 0;
    write('> rarity cursor reset to the top of the rankings.');
  }

  async function commandReload(){
    state.ranks = [];
    state.rankMap = {};
    state.rarityCursor = 0;
    stakeCache.clear();
    await ensureRanks().catch(function(){});
  }

  function commandClear(){
    output.textContent = '';
  }

  function commandHelp(){
    write('> available commands:');
    write('    help                     — show this list');
    write('    connect                  — connect your wallet');
    write('    status                   — show wallet status & rewards');
    write('    list [n]                 — stream the next n rarity entries');
    write('    reset                    — reset the rarity cursor');
    write('    reload                   — refetch rarity data');
    write('    show <id>                — inspect a specific frog');
    write('    owned [n|all] [address]  — list frogs owned by a wallet');
    write('    staked [rank|time] [address] — list staked frogs for a wallet');
    write('    rewards [address]        — show claimable rewards');
    write('    approve                  — grant controller approval to stake');
    write('    stake <id>               — stake a frog');
    write('    unstake <id>             — unstake a frog');
    write('    transfer <id> <address>  — transfer a frog to another wallet');
    write('    claim                    — claim staking rewards');
    write('    clear                    — clear the terminal output');
  }

  const COMMANDS = {
    help: commandHelp,
    list: commandList,
    rarity: commandList,
    show: commandShow,
    frog: commandShow,
    owned: commandOwned,
    staked: commandStaked,
    connect: commandConnect,
    status: commandStatus,
    wallet: commandStatus,
    approve: commandApprove,
    stake: commandStake,
    unstake: commandUnstake,
    transfer: commandTransfer,
    rewards: commandRewards,
    claim: commandClaim,
    reset: commandReset,
    reload: commandReload,
    clear: commandClear
  };

  async function handleCommand(raw){
    const trimmed = raw.trim();
    if (!trimmed){ write('$'); return; }
    promptLine(trimmed);

    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const args = parts.slice(1);

    const fn = COMMANDS[verb];
    if (!fn){
      write('> unknown command. type `help` for options.');
      return;
    }

    try {
      await fn.apply(null, args);
    } catch (err) {
      write('> command failed: ' + parseError(err));
    }
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    if (state.busy) return;
    const value = input.value;
    input.value = '';
    state.busy = true;
    input.disabled = true;
    handleCommand(value).finally(function(){
      state.busy = false;
      input.disabled = false;
      input.focus();
    });
  });

  function boot(){
    write('freshfrogs terminal online. type `help` to explore commands.');
    ensureRanks().catch(function(){});
    if (global.ethereum && typeof global.ethereum.request === 'function'){
      global.ethereum.request({ method: 'eth_accounts' }).then(function(accounts){
        if (accounts && accounts[0]) setWallet(accounts[0], true);
      }).catch(function(){});
      if (typeof global.ethereum.on === 'function'){
        global.ethereum.on('accountsChanged', function(accounts){
          const addr = accounts && accounts[0] ? accounts[0] : null;
          setWallet(addr, false);
        });
        global.ethereum.on('chainChanged', function(chainId){
          if (state.wallet.address){
            write('> chain changed to ' + chainId + '. still connected as ' + state.wallet.short + '.');
          }
        });
      }
    }
    input.focus();
  }

  global.FFTerminal = {
    run: handleCommand
  };

  boot();
})(window);
