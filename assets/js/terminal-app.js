(function(global){
  'use strict';

  const output = document.getElementById('terminalOutput');
  const form   = document.getElementById('terminalForm');
  const input  = document.getElementById('command');
  const cards       = document.getElementById('terminalCards');
  const cardsEmpty  = document.getElementById('terminalCardsEmpty');
  const cardsTitle  = document.getElementById('cardsTitle');
  const cardsTag    = document.getElementById('cardsTag');
  const connectBtn  = document.getElementById('terminalConnect');
  const walletBadge = document.getElementById('terminalWallet');
  const shortcutButtons = Array.from(document.querySelectorAll('.cmd-button[data-command]'));

  if (!output || !form || !input) return;

  const CFG = global.FF_CFG || {};
  const SOURCE = String(CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  const RANKS_PATH = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
  const CONTROLLER_ADDR = String(CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const LEVEL_SECS = Number(CFG.STAKE_LEVEL_SECONDS || (30 * 86400));

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

  const CARD_OPTIONS = {
    showActions: false,
    rarityTiers: CFG.RARITY_TIERS,
    levelSeconds: LEVEL_SECS
  };

  // ---------- UI helpers ----------
  function scrollToBottom(){ output.scrollTop = output.scrollHeight; }
  function write(line){ output.textContent += String(line || '') + '\n'; scrollToBottom(); }
  function promptLine(cmd){ write('$ ' + cmd); }
  function shorten(addr){
    if (!addr) return '';
    const str = String(addr);
    if (str.length <= 10) return str;
    return str.slice(0,6) + '\u2026' + str.slice(-4);
  }
  function padId(id){ let s = String(id); while(s.length < 4) s = '0' + s; return s; }
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
  function isHexAddress(addr){ return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr); }

  function setFFWallet(addr){
    global.FF = global.FF || {};
    global.FF.wallet = { address: addr || null, connected: !!addr };
    global.FF_WALLET = { address: addr || null, connected: !!addr };
    global.WALLET_ADDR = addr || null;
    global.SELECTED_WALLET = addr || null;
  }

  function updateWalletUI(){
    if (walletBadge){
      if (state.wallet.connected){
        walletBadge.style.display = '';
        walletBadge.textContent = state.wallet.short;
      } else {
        walletBadge.style.display = 'none';
        walletBadge.textContent = '';
      }
    }
    if (connectBtn){
      if (state.wallet.connected){
        connectBtn.textContent = 'Connected';
        connectBtn.classList.add('is-connected');
      } else {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('is-connected');
      }
    }
    updateShortcutStates();
  }

  function setWallet(addr, silent){
    const next = addr ? String(addr) : null;
    state.wallet.address = next;
    state.wallet.connected = !!next;
    state.wallet.short = next ? shorten(next) : '';

    setFFWallet(next);

    if (next){
      if (!silent) write('> wallet connected: ' + state.wallet.short);
      try {
        global.dispatchEvent(new global.CustomEvent('wallet:connected', { detail:{ address: next } }));
        global.dispatchEvent(new global.CustomEvent('FF:walletConnected', { detail:{ address: next } }));
      } catch(_){}
    } else {
      if (!silent) write('> wallet disconnected.');
      try {
        global.dispatchEvent(new global.CustomEvent('wallet:disconnected'));
        global.dispatchEvent(new global.CustomEvent('FF:walletDisconnected'));
      } catch(_){}
    }
    updateWalletUI();
  }

  function updateShortcutStates(){
    const requireWalletDisabled = !state.wallet.connected;
    shortcutButtons.forEach(btn => {
      if (btn.dataset.requiresWallet === '1'){
        btn.disabled = requireWalletDisabled;
      }
    });
  }

  function renderCards(label, tag, frogs){
    if (cardsTitle) cardsTitle.textContent = label || 'Results';
    if (cardsTag){
      if (tag){ cardsTag.textContent = tag; cardsTag.style.display = ''; }
      else cardsTag.style.display = 'none';
    }
    if (!cards) return;
    if (!Array.isArray(frogs) || !frogs.length){
      cards.innerHTML = '';
      if (cardsEmpty) cardsEmpty.style.display = '';
      return;
    }
    if (cardsEmpty) cardsEmpty.style.display = 'none';
    if (global.FF && typeof global.FF.renderFrogCards === 'function'){
      global.FF.renderFrogCards(cards, frogs, CARD_OPTIONS);
    }
  }

  // ---------- Web3 helpers ----------
  function getWeb3Read(){
    if (web3Read) return web3Read;
    if (!global.Web3) return null;
    try {
      if (CFG.RPC_URL){
        web3Read = new global.Web3(new global.Web3.providers.HttpProvider(CFG.RPC_URL));
      } else if (global.ethereum){
        web3Read = new global.Web3(global.ethereum);
      }
    } catch (err){
      console.warn('[terminal] web3 read init failed', err);
      web3Read = null;
    }
    return web3Read;
  }
  function getWeb3Write(){
    if (web3Write) return web3Write;
    if (!global.Web3 || !global.ethereum) return null;
    try { web3Write = new global.Web3(global.ethereum); }
    catch(err){ console.warn('[terminal] web3 write init failed', err); web3Write = null; }
    return web3Write;
  }
  function resolveCollectionAbi(){
    if (typeof global.COLLECTION_ABI !== 'undefined') return global.COLLECTION_ABI;
    if (typeof global.collection_abi !== 'undefined') return global.collection_abi;
    try { if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI; }
    catch(_){}
    return [];
  }
  function resolveControllerAbi(){
    if (typeof global.CONTROLLER_ABI !== 'undefined') return global.CONTROLLER_ABI;
    if (typeof global.controller_abi !== 'undefined') return global.controller_abi;
    try { if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI; }
    catch(_){}
    return [];
  }
  function getCollectionContractRead(){
    if (collectionRead) return collectionRead;
    const w3 = getWeb3Read();
    if (!w3 || !CFG.COLLECTION_ADDRESS) return null;
    const abi = resolveCollectionAbi();
    if (!abi || !abi.length) return null;
    collectionRead = new w3.eth.Contract(abi, CFG.COLLECTION_ADDRESS);
    return collectionRead;
  }
  function getCollectionContractWrite(){
    if (collectionWrite) return collectionWrite;
    const w3 = getWeb3Write();
    if (!w3 || !CFG.COLLECTION_ADDRESS) return null;
    const abi = resolveCollectionAbi();
    if (!abi || !abi.length) return null;
    collectionWrite = new w3.eth.Contract(abi, CFG.COLLECTION_ADDRESS);
    return collectionWrite;
  }
  function getControllerContractRead(){
    if (controllerRead) return controllerRead;
    const w3 = getWeb3Read();
    if (!w3 || !CFG.CONTROLLER_ADDRESS) return null;
    const abi = resolveControllerAbi();
    if (!abi || !abi.length) return null;
    controllerRead = new w3.eth.Contract(abi, CFG.CONTROLLER_ADDRESS);
    return controllerRead;
  }

  // ---------- Rarity + metadata ----------
  async function ensureRanks(){
    if (state.ranks.length) return state.ranks;
    if (state.loadingRanks) return state.loadingRanks;

    const load = fetch(RANKS_PATH, { cache:'no-store' })
      .then(res => { if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); })
      .then(arr => {
        if (!Array.isArray(arr)) throw new Error('Bad rarity file');
        const rows = arr.map(x => ({
          id: Number(x.id ?? x.tokenId ?? x.token_id),
          rank: Number(x.ranking ?? x.rank ?? x.position ?? x.place),
          score: Number(x.score ?? x.rarityScore ?? x.points ?? 0)
        })).filter(r => Number.isFinite(r.id) && Number.isFinite(r.rank) && r.rank > 0)
          .sort((a,b)=> a.rank - b.rank || a.id - b.id);
        state.ranks = rows;
        state.rankMap = Object.fromEntries(rows.map(r => [ String(r.id), r.rank ]));
        return rows;
      }).catch(err => {
        console.warn('[terminal] rarity load failed', err);
        state.ranks = [];
        state.rankMap = {};
        throw err;
      }).finally(() => { state.loadingRanks = null; });

    state.loadingRanks = load;
    return load;
  }

  function getRankFor(id){ return state.rankMap[String(id)] ?? null; }

  function fullPath(rel){
    if (!rel) return '';
    if (/^https?:/i.test(rel)) return rel;
    const clean = String(rel).replace(/^\/+/, '');
    return SOURCE ? SOURCE + '/' + clean : clean;
  }

  function attrsFromMeta(meta){
    const arr = Array.isArray(meta?.attributes) ? meta.attributes : [];
    const out = [];
    for (let i=0;i<arr.length;i+=1){
      const a = arr[i]; if (!a) continue;
      const key = a.key || a.trait_type || a.traitType || a.type;
      const val = a.value != null ? a.value : a.trait_value;
      if (!key || val == null) continue;
      out.push({ key: String(key), value: val });
    }
    return out;
  }

  function fetchMeta(id){
    if (state.metaCache.has(id)) return state.metaCache.get(id);
    const promise = fetch(fullPath('frog/json/' + id + '.json'), { cache:'no-store' })
      .then(res => { if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); })
      .then(json => { state.metaCache.set(id, json); return json; })
      .catch(err => { console.warn('[terminal] metadata fetch failed', id, err); state.metaCache.set(id, null); return null; });
    state.metaCache.set(id, promise);
    return promise;
  }

  function cardFrom(id, rank, meta, ownerInfo){
    const info = ownerInfo || {};
    const ownerAddr = info.owner || info.holder || null;
    const userLower = state.wallet.address ? state.wallet.address.toLowerCase() : '';
    const ownerLower = ownerAddr ? ownerAddr.toLowerCase() : '';
    const isYou = ownerLower && userLower && ownerLower === userLower;
    const ownerLabel = isYou ? 'You' : (ownerAddr ? shorten(ownerAddr) : 'Unknown');
    let sinceMs = null;
    if (info.sinceMs != null) sinceMs = Number(info.sinceMs);
    else if (info.stakedDays != null) sinceMs = Date.now() - Number(info.stakedDays) * 86400000;

    return {
      id,
      rank: rank != null ? rank : getRankFor(id),
      attrs: attrsFromMeta(meta),
      staked: !!info.staked,
      sinceMs: Number.isFinite(sinceMs) ? sinceMs : null,
      owner: ownerAddr,
      ownerLabel,
      ownerShort: ownerLabel,
      metaRaw: meta || null
    };
  }

  // ---------- Owner + staking lookups ----------
  async function fetchOwnerDetails(id){
    if (stakeCache.has(id)) return stakeCache.get(id);

    const promise = (async ()=>{
      const contract = getCollectionContractRead();
      if (!contract) return { owner:null, holder:null, staked:false, sinceMs:null };

      let holder = null;
      try { holder = await contract.methods.ownerOf(String(id)).call(); }
      catch(err){ console.warn('[terminal] ownerOf failed', id, err); holder = null; }
      if (!holder) return { owner:null, holder:null, staked:false, sinceMs:null };

      const normalized = holder.toLowerCase();
      if (CONTROLLER_ADDR && normalized === CONTROLLER_ADDR){
        let staker = null;
        const controller = getControllerContractRead();
        if (controller){
          try {
            staker = await controller.methods.stakerAddress(String(id)).call();
            if (staker && /^0x0{40}$/i.test(staker)) staker = null;
          } catch(err){ console.warn('[terminal] stakerAddress failed', err); staker = null; }
        }
        let days = null;
        try {
          if (global.FFAPI && typeof global.FFAPI.fetchStakedDaysAgo === 'function'){
            const res = await global.FFAPI.fetchStakedDaysAgo(id);
            if (res != null && Number.isFinite(Number(res))) days = Number(res);
          }
        } catch(err){ console.warn('[terminal] stakedDays lookup failed', err); }
        const sinceMs = days != null ? Date.now() - (days * 86400000) : null;
        return { owner: staker || null, holder, staked:true, sinceMs, stakedDays: days != null ? days : null };
      }

      return { owner: holder, holder, staked:false, sinceMs:null };
    })().then(res => { stakeCache.set(id, res); return res; });

    stakeCache.set(id, promise);
    return promise;
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
      if (page.items && page.items.length) results.push(...page.items);
      continuation = page.continuation || null;
      if (remaining !== Infinity) remaining -= pageSize;
      if (!continuation || remaining <= 0) break;
    } while (true);
    return results;
  }

  async function fetchStakedDetailed(address){
    if (!global.FFAPI || typeof global.FFAPI.fetchStakedFrogsDetailed !== 'function') return [];
    try {
      return await global.FFAPI.fetchStakedFrogsDetailed(address);
    } catch(err){
      console.warn('[terminal] staked detail lookup failed', err);
      return [];
    }
  }

  async function fetchAvailableRewards(addr){
    if (!global.FFAPI || typeof global.FFAPI.fetchAvailableRewards !== 'function') return null;
    try { return await global.FFAPI.fetchAvailableRewards(addr); }
    catch(err){ console.warn('[terminal] rewards lookup failed', err); return null; }
  }

  // ---------- Commands ----------
  async function commandConnect(){
    if (!global.ethereum){
      write('> no wallet provider detected.');
      return;
    }
    try {
      const accounts = await global.ethereum.request({ method:'eth_requestAccounts' });
      const addr = accounts && accounts[0] ? accounts[0] : null;
      if (!addr) return;
      setWallet(addr, false);
    } catch(err){ write('> connect failed: ' + parseError(err)); }
  }

  async function commandList(countArg){
    try { await ensureRanks(); }
    catch(err){ write('> rarity data unavailable.'); return; }

    const count = countArg ? parseCount(countArg, 5) : 5;
    if (!state.ranks.length){ write('> no rarity data available.'); return; }
    if (state.rarityCursor >= state.ranks.length){ write('> end of rankings reached. use `reset` to restart.'); return; }

    const slice = state.ranks.slice(state.rarityCursor, state.rarityCursor + count);
    state.rarityCursor += slice.length;
    write('> listing ' + slice.length + ' frogs from position ' + (state.rarityCursor - slice.length + 1) + '…');

    const metas  = await Promise.all(slice.map(entry => fetchMeta(entry.id)));
    const owners = await Promise.all(slice.map(entry => fetchOwnerDetails(entry.id).catch(()=>null)));
    slice.forEach((entry, idx) => {
      const meta = metas[idx];
      const name = meta && meta.name ? meta.name : ('Frog #' + entry.id);
      const traits = attrsFromMeta(meta).slice(0,4).map(a => a.key + ': ' + a.value).join('  |  ');
      write('  #' + padId(entry.id) + '  ♦ #' + entry.rank + '  ' + name);
      if (traits) write('     ' + traits);
    });

    const cardsData = slice.map((entry, idx) => cardFrom(entry.id, entry.rank, metas[idx], owners[idx]));
    const firstRank = slice[0]?.rank;
    const lastRank = slice[slice.length-1]?.rank;
    renderCards('Rarity snapshot', (firstRank && lastRank) ? `Ranks ${firstRank} – ${lastRank}` : 'Rarity feed', cardsData);

    if (state.rarityCursor < state.ranks.length) write('> more available — run `list` again.');
    else write('> reached the tail of the rankings.');
  }

  async function commandShow(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: show <tokenId>'); return; }

    try { await ensureRanks(); } catch(_){}
    const rank = getRankFor(id);
    const meta = await fetchMeta(id);
    const ownerInfo = await fetchOwnerDetails(id).catch(()=>null);

    write('> detail for #' + padId(id));
    if (rank != null) write('    rarity rank: ' + rank);
    if (meta && meta.name) write('    name: ' + meta.name);
    if (ownerInfo){
      const ownerLabel = ownerInfo.staked
        ? ('Staked ' + (ownerInfo.stakedDays != null ? (ownerInfo.stakedDays + 'd ago') : 'recently') + ' by ' + shorten(ownerInfo.owner || ownerInfo.holder))
        : ('Owned by ' + shorten(ownerInfo.owner || ownerInfo.holder));
      write('    ' + ownerLabel);
    }
    if (meta && meta.description) write('    description: ' + meta.description);
    if (meta && Array.isArray(meta.attributes) && meta.attributes.length){
      write('    attributes:');
      meta.attributes.forEach(attr => {
        if (!attr) return;
        const key = attr.key || attr.trait_type || attr.traitType || attr.type;
        const val = attr.value != null ? attr.value : attr.trait_value;
        if (!key || val == null) return;
        write('      - ' + key + ': ' + val);
      });
    }

    renderCards('Frog #' + id, rank != null ? ('Rank ' + rank) : '', [cardFrom(id, rank, meta, ownerInfo)]);
  }

  async function commandOwned(...args){
    let target = null;
    let limit = 10;
    let fetchAll = false;

    (args || []).forEach(arg => {
      if (arg === 'all'){ fetchAll = true; limit = Infinity; return; }
      if (isHexAddress(arg)){ target = arg; return; }
      const parsed = parseCount(arg, NaN);
      if (Number.isFinite(parsed)) limit = parsed;
    });

    if (!target) target = state.wallet.address;
    if (!target){ write('> connect wallet or specify an address.'); return; }

    if (fetchAll) write('> fetching all frogs currently held by ' + shorten(target) + '…');
    else write('> fetching up to ' + limit + ' frogs owned by ' + shorten(target) + '…');

    let items = [];
    try { items = await fetchOwnedFrogs(target, limit === Infinity ? Infinity : limit); }
    catch(err){ write('> owned lookup failed: ' + parseError(err)); return; }

    await ensureRanks().catch(()=>{});
    const metas = await Promise.all(items.map(it => fetchMeta(it.id)));
    if (!items.length){ write('> no frogs currently in that wallet.'); }
    else {
      write('> wallet holds ' + items.length + ' frog' + (items.length === 1 ? '' : 's') + ':');
      items.forEach((item, idx) => {
        const meta = metas[idx];
        const rank = getRankFor(item.id);
        const name = meta && meta.name ? meta.name : ('Frog #' + item.id);
        const traits = attrsFromMeta(meta).slice(0,3).map(a => a.key + ': ' + a.value).join('  |  ');
        write('  #' + padId(item.id) + '  ' + (rank != null ? ('♦ #' + rank) : 'rank ?') + '  ' + name);
        if (traits) write('     ' + traits);
      });
    }

    const cardsOwned = items.map((item, idx) => cardFrom(item.id, null, metas[idx], { owner: target, staked:false }));
    const staked = await fetchStakedDetailed(target);
    if (staked.length){
      write('> staked via controller (' + staked.length + '):');
      staked.forEach(row => {
        const rank = getRankFor(row.id);
        const days = row.stakedDays != null ? row.stakedDays : '??';
        write('  #' + padId(row.id) + '  ' + (rank != null ? ('♦ #' + rank) : 'rank ?') + '  Staked ' + days + 'd ago by ' + shorten(target));
      });
    }
    const stakedMetas = await Promise.all(staked.map(row => fetchMeta(row.id)));
    const cardsStaked = staked.map((row, idx) => cardFrom(row.id, null, stakedMetas[idx], { owner: target, staked:true, stakedDays: row.stakedDays }));
    const combined = cardsOwned.concat(cardsStaked);
    renderCards('Wallet ' + shorten(target), combined.length ? ('Showing ' + combined.length + ' frogs') : 'No frogs found', combined);
  }

  async function commandStaked(...args){
    let target = null;
    let mode = 'time';
    (args || []).forEach(arg => {
      if (arg === 'rank' || arg === 'time'){ mode = arg; return; }
      if (isHexAddress(arg)){ target = arg; }
    });
    if (!target) target = state.wallet.address;
    if (!target){ write('> connect wallet or specify an address.'); return; }

    const rows = await fetchStakedDetailed(target);
    if (!rows.length){ write('> no frogs currently staked by ' + shorten(target) + '.'); renderCards('Staked frogs', 'None', []); return; }

    await ensureRanks().catch(()=>{});
    const metas = await Promise.all(rows.map(row => fetchMeta(row.id)));
    const cardsData = rows.map((row, idx) => cardFrom(row.id, null, metas[idx], { owner: target, staked:true, stakedDays: row.stakedDays }));
    cardsData.forEach(card => { if (card.rank == null) card.rank = getRankFor(card.id); });
    cardsData.sort((a,b) => mode === 'rank'
      ? ((a.rank || 1e9) - (b.rank || 1e9))
      : ((a.sinceMs || 1e16) - (b.sinceMs || 1e16))
    );
    write('> frogs staked by ' + shorten(target) + ': ' + cardsData.length);
    cardsData.forEach(card => {
      const rankText = card.rank != null ? ('♦ #' + card.rank) : 'rank ?';
      const days = card.sinceMs ? Math.floor((Date.now() - card.sinceMs)/86400000) : null;
      write('  #' + padId(card.id) + '  ' + rankText + '  Staked ' + (days != null ? days + 'd ago' : 'recently'));
    });
    renderCards('Staked frogs', mode === 'rank' ? 'Sorted by rarity' : 'Sorted by time staked', cardsData);
  }

  async function commandStatus(){
    const addr = state.wallet.address;
    if (!addr){ write('> connect wallet first.'); return; }
    write('> wallet: ' + shorten(addr));
    const rewards = await fetchAvailableRewards(addr);
    if (rewards){
      write('> rewards: ' + (rewards.pretty || rewards.raw || '0'));
    }
    const staked = await fetchStakedDetailed(addr);
    write('> staked frogs: ' + (staked ? staked.length : 0));
  }

  async function commandApprove(){
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.approveIfNeeded !== 'function'){ write('> staking adapter unavailable.'); return; }
    write('> sending approval transaction…');
    try {
      const receipt = await staking.approveIfNeeded();
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> approval confirmed: ' + hash);
    } catch(err){ write('> approval failed: ' + parseError(err)); }
  }

  async function commandStake(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: stake <tokenId>'); return; }
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.stakeToken !== 'function'){ write('> staking adapter unavailable.'); return; }
    write('> sending stake transaction for #' + id + '…');
    try {
      const receipt = await staking.stakeToken(id);
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> stake confirmed: ' + hash);
    } catch(err){ write('> stake failed: ' + parseError(err)); }
  }

  async function commandUnstake(idArg){
    const id = parseTokenId(idArg);
    if (!id){ write('> usage: unstake <tokenId>'); return; }
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.unstakeToken !== 'function'){ write('> staking adapter unavailable.'); return; }
    write('> sending unstake transaction for #' + id + '…');
    try {
      const receipt = await staking.unstakeToken(id);
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> unstake confirmed: ' + hash);
    } catch(err){ write('> unstake failed: ' + parseError(err)); }
  }

  async function commandTransfer(idArg, toArg){
    const id = parseTokenId(idArg);
    if (!id || !toArg){ write('> usage: transfer <tokenId> <recipientAddress>'); return; }
    const addr = state.wallet.address;
    if (!addr){ write('> connect wallet first.'); return; }
    if (!isHexAddress(toArg)){ write('> recipient must be a valid Ethereum address.'); return; }
    if (toArg.toLowerCase() === addr.toLowerCase()){ write('> recipient is your wallet already.'); return; }
    if (CONTROLLER_ADDR && toArg.toLowerCase() === CONTROLLER_ADDR){ write('> cannot transfer directly to the controller contract.'); return; }
    const contract = getCollectionContractWrite();
    if (!contract){ write('> NFT contract unavailable (missing provider?).'); return; }
    write('> sending transfer for #' + id + ' to ' + shorten(toArg) + '…');
    try {
      const receipt = await contract.methods.safeTransferFrom(addr, toArg, String(id)).send({ from: addr });
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> transfer confirmed: ' + hash);
    } catch(err){ write('> transfer failed: ' + parseError(err)); }
  }

  async function commandRewards(addrArg){
    const target = addrArg && isHexAddress(addrArg) ? addrArg : state.wallet.address;
    if (!target){ write('> connect wallet or provide an address.'); return; }
    const res = await fetchAvailableRewards(target);
    if (!res){ write('> rewards unavailable.'); return; }
    write('> rewards for ' + shorten(target) + ': ' + (res.pretty || res.raw || '0'));
  }

  async function commandClaim(){
    const staking = global.FF && global.FF.staking;
    if (!staking || typeof staking.claimRewards !== 'function'){ write('> staking adapter unavailable.'); return; }
    write('> sending claim transaction…');
    try {
      const receipt = await staking.claimRewards();
      const hash = receipt && receipt.transactionHash ? receipt.transactionHash : '(pending)';
      write('> claim confirmed: ' + hash);
    } catch(err){ write('> claim failed: ' + parseError(err)); }
  }

  function commandReset(){ state.rarityCursor = 0; write('> rarity cursor reset to the top of the rankings.'); }
  async function commandReload(){
    state.ranks = [];
    state.rankMap = {};
    state.rarityCursor = 0;
    stakeCache.clear();
    state.metaCache.clear();
    try { await ensureRanks(); write('> rarity data reloaded.'); }
    catch(err){ write('> reload failed: ' + parseError(err)); }
  }
  function commandClear(){ output.textContent = ''; }
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

  async function executeCommand(verb, args){
    const fn = COMMANDS[verb];
    if (!fn){ write('> unknown command. type `help` for options.'); return; }
    try {
      await fn.apply(null, args);
    } catch(err){ write('> command failed: ' + parseError(err)); }
  }

  function triggerCommand(raw){
    const trimmed = String(raw || '').trim();
    if (!trimmed){ write('$'); return; }
    promptLine(trimmed);
    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (state.busy) return;
    state.busy = true;
    input.disabled = true;
    executeCommand(verb, args).finally(() => {
      state.busy = false;
      input.disabled = false;
      input.focus();
    });
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    const value = input.value;
    input.value = '';
    triggerCommand(value);
  });

  shortcutButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.busy) return;
      const verb = (btn.dataset.command || '').trim();
      if (!verb) return;
      const args = [];
      if (btn.dataset.args){
        btn.dataset.args.split(/\s+/).filter(Boolean).forEach(a => args.push(a));
      }
      if (btn.dataset.prompt){
        const val = global.prompt(btn.dataset.prompt);
        if (!val) return;
        args.push(val.trim());
      }
      if (btn.dataset.prompt2){
        const val2 = global.prompt(btn.dataset.prompt2);
        if (!val2) return;
        args.push(val2.trim());
      }
      triggerCommand([verb].concat(args).join(' '));
    });
  });

  connectBtn?.addEventListener('click', () => {
    if (state.wallet.connected) return;
    triggerCommand('connect');
  });

  function boot(){
    ensureRanks().catch(()=>{});
    updateShortcutStates();
    if (cardsEmpty) cardsEmpty.style.display = '';
    if (global.ethereum && typeof global.ethereum.request === 'function'){
      global.ethereum.request({ method:'eth_accounts' }).then(accounts => {
        if (accounts && accounts[0]) setWallet(accounts[0], true);
      }).catch(()=>{});
      if (typeof global.ethereum.on === 'function'){
        global.ethereum.on('accountsChanged', accounts => {
          const addr = accounts && accounts[0] ? accounts[0] : null;
          setWallet(addr, false);
        });
        global.ethereum.on('chainChanged', chainId => {
          if (state.wallet.address){
            write('> chain changed to ' + chainId + '. still connected as ' + state.wallet.short + '.');
          }
        });
      }
    }
    input.focus();
  }

  global.FFTerminal = { run: triggerCommand };
  boot();
})(window);
