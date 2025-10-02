// assets/js/terminal-app.js
// Landing → wallet connect → full-featured terminal for Fresh Frogs.

(function(window, document){
  'use strict';

  const CFG = window.FF_CFG || {};

  const landing    = document.getElementById('landingScreen');
  const connectBtn = document.getElementById('connectBtn');
  const shell      = document.getElementById('terminalShell');
  const logEl      = document.getElementById('terminalLog');
  const previewEl  = document.getElementById('terminalPreview');
  const form       = document.getElementById('terminalForm');
  const input      = document.getElementById('terminalInput');
  const subtitle   = document.getElementById('terminalSubtitle');
  const statusChip = document.getElementById('terminalStatus');
  const shortcuts  = document.getElementById('terminalShortcuts');
  const bodyEl     = document.body;

  if (!landing || !connectBtn || !shell || !logEl || !previewEl || !form || !input) {
    return;
  }

  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();

  let account = null;
  let networkLabel = '—';
  let welcomeShown = false;
  let busy = false;
  let lastPreview = null;

  const metaCache  = new Map();
  const ownerCache = new Map();
  const stakeCache = new Map();

  const history = [];
  let historyPos = 0;

  let ranksPromise = null;
  let rankList = null;
  let rankIndex = null;

  let web3Read = null;
  let collectionRead = null;
  let controllerRead = null;

  function nowStamp(){
    const now = new Date();
    return now.toLocaleTimeString([], { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  function escapeHtml(str){
    return (str==null?'':String(str)).replace(/[&<>"']/g, (ch)=>({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[ch]);
  }

  function shorten(addr){
    if (!addr || typeof addr !== 'string') return '—';
    return addr.length > 10 ? `${addr.slice(0,6)}…${addr.slice(-4)}` : addr;
  }

  function setFFWallet(addr){
    window.FF = window.FF || {};
    window.FF.wallet = { address: addr || null, connected: !!addr };
    window.FF_WALLET = { address: addr || null, connected: !!addr };
    window.WALLET_ADDR = addr || null;
    window.SELECTED_WALLET = addr || null;
  }

  function emitWalletConnected(addr){
    setFFWallet(addr);
    window.user_address = addr || null;
    window.dispatchEvent(new CustomEvent('wallet:connected',   { detail:{ address: addr }}));
    window.dispatchEvent(new CustomEvent('FF:walletConnected', { detail:{ address: addr }}));
  }

  function emitWalletDisconnected(){
    setFFWallet(null);
    window.user_address = null;
    window.dispatchEvent(new CustomEvent('wallet:disconnected'));
    window.dispatchEvent(new CustomEvent('FF:walletDisconnected'));
  }

  function updateStatus(){
    if (statusChip){
      const strong = statusChip.querySelector('strong');
      if (strong) strong.textContent = account ? shorten(account) : '—';
    }
    if (subtitle){
      subtitle.textContent = account ? `Connected on ${networkLabel}` : 'Wallet disconnected';
    }
  }

  function showLanding(){
    bodyEl.classList.remove('show-terminal');
    landing.style.display = 'flex';
    landing.removeAttribute('aria-hidden');
    shell.hidden = true;
    shell.style.display = 'none';
  }

  function showTerminal(){
    bodyEl.classList.add('show-terminal');
    landing.style.display = 'none';
    landing.setAttribute('aria-hidden', 'true');
    shell.hidden = false;
    shell.style.display = 'block';
    input.focus();
  }

  function appendLog(text, kind='info', allowHTML=false){
    const row = document.createElement('div');
    row.className = `log-line log-${kind}`;
    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = nowStamp();
    const msg = document.createElement('span');
    msg.className = `log-${kind}`;
    if (allowHTML) msg.innerHTML = text;
    else msg.textContent = text;
    row.appendChild(time);
    row.appendChild(msg);
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  const log = {
    command: (txt)=> appendLog(`> ${txt}`, 'command'),
    info:    (txt)=> appendLog(txt, 'info'),
    muted:   (txt)=> appendLog(txt, 'muted'),
    success: (txt)=> appendLog(txt, 'success'),
    error:   (txt)=> appendLog(txt, 'error'),
    html:    (htmlTxt)=> appendLog(htmlTxt, 'info', true)
  };

  async function updateNetworkLabel(){
    if (!window.ethereum){
      networkLabel = 'No wallet';
      return;
    }
    try{
      const chainHex = await window.ethereum.request({ method:'eth_chainId' });
      const chainId = chainHex ? parseInt(chainHex, 16) : NaN;
      const pretty = ({
        1: 'Ethereum',
        5: 'Goerli',
        10: 'Optimism',
        137: 'Polygon',
        8453: 'Base',
        11155111: 'Sepolia'
      })[chainId];
      networkLabel = pretty || (Number.isFinite(chainId) ? `Chain #${chainId}` : 'Unknown network');
    }catch{
      networkLabel = 'Unknown network';
    }
  }

  async function setAccount(addr){
    if (addr){
      const normalized = String(addr);
      const changed = !account || account.toLowerCase() !== normalized.toLowerCase();
      account = normalized;
      emitWalletConnected(account);
      await updateNetworkLabel();
      updateStatus();
      showTerminal();
      if (changed){
        log.success(`Connected as ${shorten(account)}.`);
        if (!welcomeShown){
          log.muted('Type “help” to see available commands.');
          welcomeShown = true;
        }
      }
    } else {
      if (account){
        log.muted('Wallet disconnected.');
      }
      account = null;
      emitWalletDisconnected();
      networkLabel = '—';
      updateStatus();
      showLanding();
      lastPreview = null;
    }
  }

  async function connectWallet(){
    if (!window.ethereum){
      log.error('No Ethereum wallet detected. Install MetaMask or a compatible provider.');
      return;
    }
    try{
      const accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
      const addr = accounts && accounts[0];
      if (!addr){
        log.muted('Wallet connection cancelled.');
        return;
      }
      await setAccount(addr);
    }catch(err){
      const msg = err && err.message ? err.message : 'Wallet connection failed.';
      log.error(msg);
    }
  }

  function handleAccountsChanged(accounts){
    if (accounts && accounts[0]){
      setAccount(accounts[0]);
    } else {
      setAccount(null);
    }
  }

  function addToHistory(cmd){
    if (!cmd) return;
    if (!history.length || history[history.length-1] !== cmd){
      history.push(cmd);
    }
    historyPos = history.length;
  }

  input.addEventListener('keydown', (evt)=>{
    if (!history.length) return;
    if (evt.key === 'ArrowUp'){
      evt.preventDefault();
      historyPos = Math.max(0, historyPos - 1);
      input.value = history[historyPos] || '';
      setTimeout(()=> input.setSelectionRange(input.value.length, input.value.length), 0);
    } else if (evt.key === 'ArrowDown'){
      evt.preventDefault();
      historyPos = Math.min(history.length, historyPos + 1);
      input.value = historyPos === history.length ? '' : (history[historyPos] || '');
      setTimeout(()=> input.setSelectionRange(input.value.length, input.value.length), 0);
    }
  });

  const aliasMap = new Map([
    ['help', 'help'], ['h', 'help'], ['?', 'help'],
    ['clear', 'clear'], ['cls', 'clear'],
    ['connect', 'connect'], ['login', 'connect'],
    ['my', 'my-frogs'], ['myfrogs', 'my-frogs'], ['owned', 'my-frogs'], ['inventory', 'my-frogs'],
    ['staked', 'staked'], ['stake', 'stake'], ['unstake', 'unstake'],
    ['rarity', 'rarity'], ['rank', 'rarity'],
    ['view', 'view'], ['show', 'view'],
    ['rewards', 'rewards'], ['claim', 'claim'],
    ['approve', 'approve'],
    ['transfer', 'transfer'],
    ['mint', 'mint'],
    ['refresh', 'refresh']
  ]);

  function parseCommand(raw){
    const line = raw.trim();
    if (!line) return { cmd:'', args:[] };
    const lower = line.toLowerCase();
    const multi = [
      ['my frogs', 'my-frogs'],
      ['staked frogs', 'staked'],
      ['show frogs', 'my-frogs'],
      ['show staked', 'staked']
    ];
    for (const [phrase, name] of multi){
      if (lower === phrase) return { cmd:name, args:[] };
      if (lower.startsWith(phrase + ' ')){
        const rest = line.slice(phrase.length).trim();
        return { cmd:name, args: rest ? rest.split(/\s+/) : [] };
      }
    }
    const parts = line.split(/\s+/);
    const head = parts[0].toLowerCase();
    const cmd = aliasMap.get(head) || head;
    return { cmd, args: parts.slice(1) };
  }

  async function ensureConnected(){
    if (account) return account;
    throw new Error('Connect your wallet first.');
  }

  function getWeb3Read(){
    if (web3Read) return web3Read;
    if (!window.Web3) return null;
    try {
      const provider = CFG.RPC_URL
        ? new window.Web3.providers.HttpProvider(CFG.RPC_URL)
        : (window.ethereum || window.Web3.givenProvider || null);
      if (!provider) return null;
      web3Read = new window.Web3(provider);
      return web3Read;
    } catch (err) {
      console.warn('[terminal] web3 provider error', err);
      return null;
    }
  }

  function getCollectionRead(){
    if (collectionRead) return collectionRead;
    const w3 = getWeb3Read();
    if (!w3 || !CFG.COLLECTION_ADDRESS || !window.COLLECTION_ABI) return null;
    collectionRead = new w3.eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
    return collectionRead;
  }

  function getControllerRead(){
    if (controllerRead) return controllerRead;
    const w3 = getWeb3Read();
    if (!w3 || !CFG.CONTROLLER_ADDRESS || !window.CONTROLLER_ABI) return null;
    controllerRead = new w3.eth.Contract(window.CONTROLLER_ABI, CFG.CONTROLLER_ADDRESS);
    return controllerRead;
  }

  async function ensureRankData(){
    if (rankList) return rankList;
    if (ranksPromise) return ranksPromise;
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    ranksPromise = (async ()=>{
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error(`Failed to load rarity data (HTTP ${res.status})`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : [];
      const mapped = rows.map((row)=>({
        id: Number(row.id ?? row.tokenId ?? row.token_id ?? row.frogId ?? row.frog_id),
        rank: Number(row.rank ?? row.ranking ?? row.position ?? row.place),
        score: Number(row.score ?? row.rarityScore ?? row.points ?? 0)
      })).filter((row)=> Number.isFinite(row.id) && Number.isFinite(row.rank) && row.rank > 0)
        .sort((a,b)=> a.rank - b.rank);
      rankList = mapped;
      rankIndex = new Map();
      mapped.forEach((row)=> rankIndex.set(row.id, row));
      return mapped;
    })().catch((err)=>{ ranksPromise = null; throw err; });
    return ranksPromise;
  }

  async function fetchMeta(id){
    const key = Number(id);
    if (metaCache.has(key)) return metaCache.get(key);
    const paths = [
      `frog/json/${key}.json`,
      `frog/${key}.json`,
      `assets/frogs/${key}.json`
    ];
    for (const path of paths){
      try{
        const res = await fetch(path, { cache:'no-store' });
        if (res.ok){
          const json = await res.json();
          metaCache.set(key, json);
          return json;
        }
      }catch{/* ignore */}
    }
    const fallback = { name: `Frog #${key}`, attributes: [] };
    metaCache.set(key, fallback);
    return fallback;
  }

  function attrsFromMeta(meta){
    const arr = Array.isArray(meta?.attributes) ? meta.attributes : [];
    return arr.map((a)=>({
      key: (a?.trait_type ?? a?.key ?? '').toString(),
      value: (a?.value ?? a?.trait_value ?? '').toString()
    })).filter((a)=> a.key && a.value !== undefined);
  }

  async function ownerFromContract(id){
    try{
      const contract = getCollectionRead();
      if (!contract) return null;
      const owner = await contract.methods.ownerOf(String(id)).call();
      return owner || null;
    }catch{
      return null;
    }
  }

  async function ownerFromReservoir(id){
    if (!CFG.COLLECTION_ADDRESS) return null;
    const host = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/, '');
    const qs = new URLSearchParams({ tokens: `${CFG.COLLECTION_ADDRESS}:${id}`, limit:'1' });
    try{
      const res = await fetch(`${host}/owners/v2?${qs.toString()}`, {
        headers: {
          accept: 'application/json',
          ...(CFG.FROG_API_KEY ? { 'x-api-key': CFG.FROG_API_KEY } : {})
        }
      });
      if (!res.ok) return null;
      const json = await res.json();
      const owner = json?.owners?.[0]?.owner;
      return (typeof owner === 'string' && owner.startsWith('0x')) ? owner : null;
    }catch{
      return null;
    }
  }

  async function controllerStakerAddress(id){
    try{
      const contract = getControllerRead();
      if (!contract) return null;
      const who = await contract.methods.stakerAddress(String(id)).call();
      if (!who || who === ZERO_ADDR) return null;
      return who;
    }catch{
      return null;
    }
  }

  async function fetchStakeInfo(id){
    const key = Number(id);
    if (stakeCache.has(key)) return stakeCache.get(key);
    const info = { staked:false, staker:null, sinceMs:null };
    try{
      const staker = await controllerStakerAddress(key);
      if (staker){
        info.staked = true;
        info.staker = staker;
        if (window.FFAPI?.fetchStakedDaysAgo){
          try{
            const days = await window.FFAPI.fetchStakedDaysAgo(key);
            if (days != null && !Number.isNaN(days)){
              info.sinceMs = Date.now() - Number(days) * 86400000;
            }
          }catch{/* ignore */}
        }
      }
    }catch{/* ignore */}
    stakeCache.set(key, info);
    return info;
  }

  async function fetchOwnerFor(id, hint){
    const key = Number(id);
    if (hint && hint.staker) return hint.staker;
    if (ownerCache.has(key)) return ownerCache.get(key);

    let owner = await ownerFromContract(key);
    const lower = owner ? owner.toLowerCase() : '';
    if (owner && CONTROLLER && lower === CONTROLLER){
      owner = hint?.staker || await controllerStakerAddress(key) || await ownerFromReservoir(key) || owner;
    } else if (!owner){
      owner = await ownerFromReservoir(key);
    }
    ownerCache.set(key, owner || null);
    return owner || null;
  }

  async function buildCardModel(id, override){
    const key = Number(id);
    const extra = override || {};
    const meta = extra.meta || await fetchMeta(key);
    let stakeInfo = extra.stake;
    if (!stakeInfo){
      stakeInfo = await fetchStakeInfo(key);
    } else {
      stakeCache.set(key, stakeInfo);
    }
    const owner = extra.owner || await fetchOwnerFor(key, stakeInfo);
    const ranks = await ensureRankData().catch(()=> null);
    const rankRow = ranks && rankIndex ? rankIndex.get(key) : null;
    const ownerLabel = owner
      ? (account && owner.toLowerCase() === account.toLowerCase() ? 'You' : shorten(owner))
      : 'Unknown';

    return {
      id: key,
      rank: rankRow ? rankRow.rank : null,
      attrs: attrsFromMeta(meta),
      staked: !!stakeInfo?.staked,
      sinceMs: stakeInfo?.sinceMs || null,
      owner,
      ownerLabel,
      ownerShort: ownerLabel,
      metaRaw: meta
    };
  }

  function fallbackCard(model){
    const article = document.createElement('article');
    article.className = 'frog-card';
    article.style.border = '1px solid var(--border)';
    article.style.borderRadius = '14px';
    article.style.padding = '12px';
    const ownerText = model.staked ? `Staked by ${model.ownerLabel || 'Unknown'}` : `Owned by ${model.ownerLabel || 'Unknown'}`;
    article.innerHTML = `<h4 style="margin:0 0 6px 0">Frog #${model.id}</h4><p class="meta">${escapeHtml(ownerText)}</p>`;
    return article;
  }

  function promptTransfer(id){
    const to = window.prompt(`Transfer Frog #${id} to address:`);
    if (!to) return null;
    return to.trim();
  }

  async function renderFrogs(ids, options){
    const opts = options || {};
    const overrides = opts.overrides || new Map();
    previewEl.innerHTML = '';
    if (!ids || !ids.length) return;
    const tasks = ids.map((tokenId)=> buildCardModel(tokenId, overrides.get(tokenId)));
    const models = await Promise.all(tasks);
    const frag = document.createDocumentFragment();
    for (const model of models){
      let card;
      if (window.FF && typeof window.FF.buildFrogCard === 'function'){
        card = window.FF.buildFrogCard(model, {
          showActions: !!opts.actions,
          rarityTiers: CFG.RARITY_TIERS,
          levelSeconds: Number(CFG.STAKE_LEVEL_SECONDS || (30 * 86400)),
          onStake: async (tokenId)=>{ await stakeToken(tokenId); },
          onUnstake: async (tokenId)=>{ await unstakeToken(tokenId); },
          onTransfer: async (tokenId)=>{
            const addr = promptTransfer(tokenId);
            if (addr) await transferToken(tokenId, addr);
          }
        });
      } else {
        card = fallbackCard(model);
      }
      frag.appendChild(card);
    }
    previewEl.appendChild(frag);
    previewEl.scrollTop = 0;
  }

  async function loadOwnedFrogIds(addr, max=12){
    const out = [];
    if (!window.FFAPI?.fetchOwnedFrogs) return out;
    let continuation = null;
    for (let guard=0; guard<20 && out.length < max; guard++){
      try{
        const page = await window.FFAPI.fetchOwnedFrogs(addr, continuation, Math.min(20, max - out.length));
        const items = page?.items || [];
        for (const item of items){
          if (Number.isFinite(item.id) && !out.includes(item.id)) out.push(item.id);
        }
        continuation = page?.continuation || null;
        if (!continuation) break;
      }catch(err){
        console.warn('[terminal] owned frogs fetch failed', err);
        break;
      }
    }
    return out;
  }

  async function loadUserStakedDetails(addr){
    const out = [];
    if (window.FFAPI?.fetchStakedFrogsDetailed){
      try{
        const rows = await window.FFAPI.fetchStakedFrogsDetailed(addr);
        for (const row of rows){
          if (!Number.isFinite(row.id)) continue;
          const sinceMs = row.stakedDays != null ? Date.now() - Number(row.stakedDays) * 86400000 : null;
          out.push({ id: row.id, owner: addr, stake:{ staked:true, staker: addr, sinceMs } });
        }
        return out;
      }catch(err){
        console.warn('[terminal] staked detail fetch failed', err);
      }
    }
    if (window.FFAPI?.fetchStakedIds){
      try{
        const ids = await window.FFAPI.fetchStakedIds(addr);
        ids.forEach((id)=>{ if (Number.isFinite(id)) out.push({ id, owner: addr, stake:{ staked:true, staker: addr, sinceMs:null } }); });
      }catch(err){ console.warn('[terminal] staked ids fetch failed', err); }
    }
    return out;
  }

  function invalidateCaches(ids){
    (ids || []).forEach((id)=>{
      const key = Number(id);
      ownerCache.delete(key);
      stakeCache.delete(key);
    });
  }

  function shortTx(hash){
    if (!hash || typeof hash !== 'string') return '';
    return hash.length > 12 ? `${hash.slice(0,10)}…${hash.slice(-4)}` : hash;
  }

  async function monitorPromi(promi, label){
    if (!promi) return;
    await new Promise((resolve, reject)=>{
      let resolved = false;
      if (typeof promi.on === 'function'){
        promi.on('transactionHash', (hash)=>{
          if (hash) log.muted(`${label} tx ${shortTx(hash)}`);
        });
        promi.on('receipt', (receipt)=>{
          resolved = true;
          resolve(receipt);
        });
        promi.on('error', (err)=>{
          if (!resolved) reject(err);
        });
      }
      if (typeof promi.then === 'function'){
        promi.then((val)=>{ if (!resolved) resolve(val); }).catch((err)=>{ if (!resolved) reject(err); });
      }
    });
  }

  async function stakeToken(id){
    await ensureConnected();
    const S = window.FF?.staking;
    if (!S || typeof S.stakeToken !== 'function') throw new Error('Staking adapter unavailable.');
    log.muted(`Staking Frog #${id}…`);
    try{
      const promi = S.stakeToken(String(id));
      await monitorPromi(promi, `stake ${id}`);
      log.success(`Frog #${id} staked.`);
      invalidateCaches([id]);
      await refreshAfterAction();
    }catch(err){
      throw new Error(err?.message || `Failed to stake Frog #${id}.`);
    }
  }

  async function unstakeToken(id){
    await ensureConnected();
    const S = window.FF?.staking;
    if (!S || typeof S.unstakeToken !== 'function') throw new Error('Staking adapter unavailable.');
    log.muted(`Unstaking Frog #${id}…`);
    try{
      const promi = S.unstakeToken(String(id));
      await monitorPromi(promi, `unstake ${id}`);
      log.success(`Frog #${id} unstaked.`);
      invalidateCaches([id]);
      await refreshAfterAction();
    }catch(err){
      throw new Error(err?.message || `Failed to unstake Frog #${id}.`);
    }
  }

  async function approveController(){
    await ensureConnected();
    const S = window.FF?.staking;
    if (!S || typeof S.approveIfNeeded !== 'function') throw new Error('Staking adapter unavailable.');
    log.muted('Granting staking approval to the controller…');
    try{
      const promi = S.approveIfNeeded();
      await monitorPromi(promi, 'approval');
      log.success('Approval transaction confirmed.');
    }catch(err){
      throw new Error(err?.message || 'Approval transaction failed.');
    }
  }

  async function claimRewards(){
    await ensureConnected();
    const S = window.FF?.staking;
    if (!S || typeof S.claimRewards !== 'function') throw new Error('Staking adapter unavailable.');
    log.muted('Claiming staking rewards…');
    try{
      const promi = S.claimRewards();
      await monitorPromi(promi, 'claimRewards');
      log.success('Rewards claimed.');
    }catch(err){
      throw new Error(err?.message || 'Failed to claim rewards.');
    }
  }

  async function transferToken(id, to){
    await ensureConnected();
    const addr = to.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error('Enter a valid Ethereum address.');
    if (!window.Web3 || !window.ethereum) throw new Error('Web3 provider unavailable.');
    const web3 = new window.Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
    const from = accounts && accounts[0];
    if (!from) throw new Error('Wallet not connected.');
    const contract = new web3.eth.Contract(window.COLLECTION_ABI || [], CFG.COLLECTION_ADDRESS);
    log.muted(`Transferring Frog #${id} to ${shorten(addr)}…`);
    try{
      const promi = contract.methods.transferFrom(from, addr, String(id)).send({ from });
      await monitorPromi(promi, `transfer ${id}`);
      log.success(`Frog #${id} transferred.`);
      invalidateCaches([id]);
      await refreshAfterAction();
    }catch(err){
      throw new Error(err?.message || 'Transfer failed.');
    }
  }

  async function refreshAfterAction(){
    if (typeof lastPreview === 'function'){
      try{ await lastPreview(); }
      catch(err){ log.error(err?.message || 'Failed to refresh view.'); }
    }
  }

  function parseIds(args){
    const joined = args.join(' ');
    return Array.from(new Set(joined.split(/[\s,]+/)
      .map((part)=> part.replace(/[^0-9]/g, ''))
      .map((part)=> Number(part))
      .filter((n)=> Number.isFinite(n) && n > 0)));
  }

  const handlers = {
    help: async ()=>{
      const lines = [
        '<strong>Available commands</strong>',
        'help — show this menu',
        'connect — connect your wallet',
        'my frogs — list frogs owned by your wallet',
        'staked — list frogs you currently have staked',
        'rarity [count] — show top rarity ranks (default 9)',
        'view &lt;id…&gt; — preview specific frogs',
        'stake &lt;id&gt; — stake a frog by token ID',
        'unstake &lt;id&gt; — unstake a frog by token ID',
        'approve — grant the controller staking approval',
        'transfer &lt;id&gt; &lt;address&gt; — transfer a frog',
        'rewards — show available staking rewards',
        'claim — claim earned staking rewards',
        'mint [qty] — trigger the mint flow if available',
        'refresh — rerun the last preview command',
        'clear — clear the terminal output'
      ];
      log.html(lines.join('<br>'));
    },

    clear: async ()=>{
      logEl.innerHTML = '';
      previewEl.innerHTML = '';
      lastPreview = null;
    },

    connect: async ()=>{
      await connectWallet();
    },

    'my-frogs': async (args, ctx={})=>{
      await ensureConnected();
      if (!ctx.silent) log.muted('Loading frogs owned by your wallet…');
      const ids = await loadOwnedFrogIds(account, 12);
      if (!ids.length){
        previewEl.innerHTML = '';
        if (!ctx.silent) log.info('No frogs found for this wallet.');
        lastPreview = null;
        return;
      }
      await renderFrogs(ids, { actions:true });
      if (!ctx.silent) log.success(`Showing ${ids.length} owned frog${ids.length === 1 ? '' : 's'}.`);
      if (ctx.remember !== false) lastPreview = ()=> handlers['my-frogs'](args, { silent:true, remember:false });
    },

    staked: async (args, ctx={})=>{
      await ensureConnected();
      if (!ctx.silent) log.muted('Loading staked frogs…');
      const details = await loadUserStakedDetails(account);
      if (!details.length){
        previewEl.innerHTML = '';
        if (!ctx.silent) log.info('No frogs from this wallet are currently staked.');
        lastPreview = null;
        return;
      }
      const overrides = new Map(details.map((row)=> [row.id, row] ));
      await renderFrogs(details.map((row)=> row.id), { actions:true, overrides });
      if (!ctx.silent) log.success(`Showing ${details.length} staked frog${details.length === 1 ? '' : 's'}.`);
      if (ctx.remember !== false) lastPreview = ()=> handlers.staked(args, { silent:true, remember:false });
    },

    rarity: async (args, ctx={})=>{
      const count = Math.max(1, Math.min(30, Number(args?.[0]) || 9));
      if (!ctx.silent) log.muted(`Loading top ${count} rarity ranks…`);
      const ranks = await ensureRankData();
      const slice = ranks.slice(0, count);
      const overrides = new Map(slice.map((row)=> [row.id, {}]));
      await renderFrogs(slice.map((row)=> row.id), { actions: !!account, overrides });
      if (!ctx.silent) log.success(`Showing top ${slice.length} frogs by rarity.`);
      if (ctx.remember !== false) lastPreview = ()=> handlers.rarity([String(count)], { silent:true, remember:false });
    },

    view: async (args, ctx={})=>{
      const ids = parseIds(args);
      if (!ids.length) throw new Error('Usage: view <tokenId …>');
      if (!ctx.silent) log.muted(`Rendering ${ids.length} frog${ids.length===1?'':'s'}…`);
      await renderFrogs(ids, { actions: !!account });
      if (!ctx.silent) log.success('Preview ready.');
      if (ctx.remember !== false) lastPreview = ()=> handlers.view(ids.map(String), { silent:true, remember:false });
    },

    stake: async (args)=>{
      const ids = parseIds(args);
      if (!ids.length) throw new Error('Usage: stake <tokenId>');
      await stakeToken(ids[0]);
    },

    unstake: async (args)=>{
      const ids = parseIds(args);
      if (!ids.length) throw new Error('Usage: unstake <tokenId>');
      await unstakeToken(ids[0]);
    },

    approve: async ()=>{
      await approveController();
    },

    transfer: async (args)=>{
      if (args.length < 2) throw new Error('Usage: transfer <tokenId> <address>');
      const ids = parseIds([args[0]]);
      if (!ids.length) throw new Error('Provide a valid token ID.');
      await transferToken(ids[0], args[1]);
    },

    rewards: async ()=>{
      await ensureConnected();
      if (window.FFAPI?.fetchAvailableRewards){
        try{
          const res = await window.FFAPI.fetchAvailableRewards(account);
          const pretty = res?.pretty || `${Number(res?.raw || 0)/1e18} ${(CFG.REWARD_TOKEN_SYMBOL || '$FLYZ')}`;
          log.success(`Available rewards: ${pretty}`);
        }catch(err){
          throw new Error(err?.message || 'Failed to fetch rewards.');
        }
      } else if (window.FF?.staking?.getAvailableRewards){
        try{
          const raw = await window.FF.staking.getAvailableRewards(account);
          log.success(`Available rewards: ${raw}`);
        }catch(err){
          throw new Error(err?.message || 'Failed to fetch rewards.');
        }
      } else {
        log.muted('Rewards API is not available in this build.');
      }
    },

    claim: async ()=>{
      await claimRewards();
    },

    mint: async (args)=>{
      if (typeof window.initiate_mint === 'function'){
        const qty = args.length ? Number(args[0]) : undefined;
        try{
          const res = await window.initiate_mint(qty);
          if (res) log.info(String(res));
        }catch(err){
          throw new Error(err?.message || 'Mint failed.');
        }
      } else {
        log.muted('Minting is not wired in the terminal yet. Use the collection dashboard to mint.');
      }
    },

    refresh: async ()=>{
      if (typeof lastPreview === 'function'){
        await lastPreview();
      } else {
        log.muted('Nothing to refresh yet. Run a preview command first.');
      }
    }
  };

  async function runCommand(raw){
    const line = raw.trim();
    if (!line) return;
    if (busy){
      log.muted('A command is already running.');
      return;
    }
    const { cmd, args } = parseCommand(line);
    if (!cmd){
      return;
    }
    const handler = handlers[cmd];
    log.command(line);
    addToHistory(line);
    historyPos = history.length;
    if (!handler){
      log.error(`Unknown command: ${cmd}`);
      return;
    }
    busy = true;
    try{
      await handler(args || []);
    }catch(err){
      log.error(err?.message || 'Command failed.');
    } finally {
      busy = false;
    }
  }

  form.addEventListener('submit', (evt)=>{
    evt.preventDefault();
    const value = input.value;
    input.value = '';
    runCommand(value);
  });

  shortcuts?.addEventListener('click', (evt)=>{
    const btn = evt.target.closest('button[data-run]');
    if (!btn) return;
    const cmd = btn.getAttribute('data-run') || '';
    input.value = '';
    runCommand(cmd);
  });

  connectBtn.addEventListener('click', ()=>{
    connectWallet();
  });

  async function boot(){
    showLanding();
    updateStatus();
    if (window.ethereum){
      window.ethereum.request({ method:'eth_accounts' }).then((accounts)=>{
        if (accounts && accounts[0]){
          setAccount(accounts[0]);
        }
      }).catch(()=>{});
      window.ethereum.on?.('accountsChanged', handleAccountsChanged);
      window.ethereum.on?.('chainChanged', async ()=>{
        await updateNetworkLabel();
        updateStatus();
        if (account){
          log.muted(`Network changed to ${networkLabel}.`);
        }
      });
    }
  }

  boot();

})(window, document);

