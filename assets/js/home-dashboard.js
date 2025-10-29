// assets/js/home-dashboard.js
// Drives the homepage wallet controls + summary card using the shared Alchemy helper.
(function(FF, CFG){
  'use strict';

  const REWARD_SYMBOL = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
  const REWARD_DECIMALS = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
  const CONTROLLER = CFG.CONTROLLER_ADDRESS || '';

  const els = {
    connectBtn: document.getElementById('homeConnectBtn'),
    disconnectBtn: document.getElementById('homeDisconnectBtn'),
    walletAddress: document.getElementById('homeWalletAddress'),
    ownedCount: document.getElementById('homeOwnedCount'),
    stakedCount: document.getElementById('homeStakedCount'),
    flyzBalance: document.getElementById('homeFlyzBalance'),
    rewardsAvailable: document.getElementById('homeRewardsAvailable'),
    rewardsAmount: document.getElementById('homeRewardsAmount'),
    rewardsSymbol: document.getElementById('homeRewardsSymbol'),
    summaryStatus: document.getElementById('homeSummaryStatus'),
    summaryNote: document.getElementById('homeSummaryNote')
  };

  const state = {
    addr: null,
    owned: null,
    staked: null,
    rewards: null,
    flyzBalance: null,
    rewardSymbol: REWARD_SYMBOL,
    rewardDecimals: REWARD_DECIMALS,
    loading: false,
    busy: false,
    errorStatus: null
  };

  const cfgRewardAddr = typeof CFG.REWARD_TOKEN_ADDRESS === 'string' ? CFG.REWARD_TOKEN_ADDRESS.trim() : '';
  const tokenMeta = {
    address: cfgRewardAddr ? cfgRewardAddr : null,
    symbol: REWARD_SYMBOL,
    decimals: REWARD_DECIMALS,
    loaded: false
  };

  const ERC20_META_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ];
  const ERC20_BALANCE_ABI = [
    'function balanceOf(address) view returns (uint256)'
  ];

  function shorten(addr){
    if (!addr) return '—';
    return (FF.shorten && FF.shorten(addr)) || (addr.slice(0, 6) + '…' + addr.slice(-4));
  }

  function formatCount(value){
    return Number.isFinite(value) ? String(value) : '—';
  }

  function formatToken(raw, decimals){
    try {
      if (raw == null) return '—';
      if (typeof raw === 'string' && raw.includes('.')) return raw;
      const ethers = window.ethers;
      if (!ethers) return '—';
      const bn = ethers.BigNumber.from(raw);
      const formatted = ethers.utils.formatUnits(bn, decimals);
      if (!formatted) return '—';
      const num = Number(formatted);
      if (!Number.isFinite(num)) return formatted;
      if (num === 0) return '0';
      if (num >= 100) return Math.round(num).toString();
      if (num >= 1) return num.toFixed(2).replace(/\.00$/, '');
      return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    } catch (err) {
      return '—';
    }
  }

  function setText(el, value){ if (el) el.textContent = value; }

  function setStatus(message){
    if (els.summaryStatus) els.summaryStatus.textContent = message || '';
  }

  function setSummaryNote(message){ if (els.summaryNote) els.summaryNote.textContent = message || ''; }

  function setWalletAddress(addr){
    if (!els.walletAddress) return;
    if (addr){
      els.walletAddress.textContent = addr;
      els.walletAddress.setAttribute('title', addr);
    } else {
      els.walletAddress.textContent = '—';
      els.walletAddress.removeAttribute('title');
    }
  }

  function updateUI(){
    const connected = Boolean(state.addr);
    const decimals = Number.isFinite(Number(state.rewardDecimals)) ? Number(state.rewardDecimals) : REWARD_DECIMALS;
    const rewardSymbol = state.rewardSymbol || REWARD_SYMBOL;

    setWalletAddress(connected ? state.addr : null);
    setText(els.ownedCount, formatCount(state.owned));
    setText(els.stakedCount, formatCount(state.staked));

    const rewardsDisplay = state.rewards != null ? formatToken(state.rewards, decimals) : '—';
    setText(els.rewardsAmount, rewardsDisplay);
    if (els.rewardsSymbol) els.rewardsSymbol.textContent = rewardSymbol || '';

    const flyzDisplay = state.flyzBalance != null ? formatToken(state.flyzBalance, decimals) : '—';
    setText(els.flyzBalance, flyzDisplay);

    if (els.rewardsAvailable){
      if (!connected){
        setText(els.rewardsAvailable, '—');
      } else {
        if (rewardsDisplay === '—'){
          setText(els.rewardsAvailable, '—');
        } else {
          const hasRewards = rewardsDisplay !== '0';
          setText(els.rewardsAvailable, hasRewards ? 'Yes' : 'No');
        }
      }
    }

    if (els.connectBtn){
      els.connectBtn.textContent = connected ? 'Connected' : 'Connect Wallet';
      els.connectBtn.classList.toggle('btn-connected', connected);
      els.connectBtn.disabled = state.busy || connected;
    }
    if (els.disconnectBtn){
      els.disconnectBtn.disabled = !connected || state.busy;
    }

    let statusMessage = '';
    let noteMessage = 'Stats refresh automatically after actions.';

    if (!connected){
      statusMessage = state.errorStatus || 'Connect your wallet to view holdings.';
      noteMessage = state.errorStatus ? 'Try reconnecting and approving via your wallet.' : 'Stats refresh automatically after you connect.';
    } else if (state.loading){
      statusMessage = 'Loading wallet data…';
      noteMessage = 'Fetching owned, staked, FLYZ, and rewards.';
    } else if (state.errorStatus){
      statusMessage = state.errorStatus;
    }

    setStatus(statusMessage);
    setSummaryNote(noteMessage);
  }

  function ensureAlchemy(){
    if (!window.FF_ALCH) throw new Error('Missing FF_ALCH helper');
    return window.FF_ALCH;
  }

  async function fetchOwnedCount(addr){
    try {
      const { totalCount } = await ensureAlchemy().getOwnerTokens(addr, { pageSize: 1, withMetadata: false });
      return Number(totalCount) || 0;
    } catch (err) {
      console.warn('[home] owned count failed', err);
      return null;
    }
  }

  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    const out = [];
    for (const row of rows){
      if (row == null) continue;
      if (typeof row === 'number' && Number.isFinite(row)) { out.push(row); continue; }
      if (typeof row === 'string'){ try { const n = Number(row); if (Number.isFinite(n)) out.push(n); } catch {} continue; }
      if (typeof row === 'object'){
        const cand = row.tokenId ?? row.token_id ?? row.id ?? row.tokenID ?? (Array.isArray(row) ? row[0] : undefined);
        try {
          if (cand != null){
            const n = typeof cand === 'string' ? Number(cand) : Number(cand);
            if (Number.isFinite(n)) out.push(n);
          }
        } catch {}
      }
    }
    return out;
  }

  async function ethersProvider(){
    if (!window.ethereum || !window.ethers) throw new Error('No Ethereum provider');
    const { ethers } = window;
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  async function readContract(address, abi){
    const provider = await ethersProvider();
    return new window.ethers.Contract(address, abi, provider);
  }

  async function fetchStakedCount(addr){
    if (!addr || !CONTROLLER) return null;
    try {
      const abi = window.CONTROLLER_ABI || [];
      const contract = await readContract(CONTROLLER, abi);
      if (!contract.getStakedTokens) return null;
      const raw = await contract.getStakedTokens(addr);
      const ids = normalizeIds(raw);
      return ids.length;
    } catch (err) {
      console.warn('[home] staked count failed', err);
      return null;
    }
  }

  async function fetchRewards(addr){
    if (!addr || !CONTROLLER) return null;
    try {
      const abi = window.CONTROLLER_ABI || [];
      const contract = await readContract(CONTROLLER, abi);
      if (!contract.availableRewards) return null;
      return await contract.availableRewards(addr);
    } catch (err) {
      console.warn('[home] rewards fetch failed', err);
      return null;
    }
  }

  async function ensureRewardsToken(){
    if (tokenMeta.loaded) return tokenMeta;
    try {
      if (!tokenMeta.address && CONTROLLER){
        const abi = window.CONTROLLER_ABI || [];
        const contract = await readContract(CONTROLLER, abi);
        if (contract.rewardsToken){
          const addr = await contract.rewardsToken();
          if (addr && window.ethers && addr !== window.ethers.constants.AddressZero){
            tokenMeta.address = addr;
          }
        }
      }
      if (tokenMeta.address && window.ethers){
        const provider = await ethersProvider();
        const erc20 = new window.ethers.Contract(tokenMeta.address, ERC20_META_ABI, provider);
        const [symbol, decimals] = await Promise.all([
          erc20.symbol().catch(()=>null),
          erc20.decimals().catch(()=>null)
        ]);
        if (symbol) tokenMeta.symbol = symbol;
        if (decimals != null && Number.isFinite(Number(decimals))) tokenMeta.decimals = Number(decimals);
      }
    } catch (err) {
      console.warn('[home] rewards token lookup failed', err);
    } finally {
      tokenMeta.loaded = true;
    }
    return tokenMeta;
  }

  async function fetchFlyzBalance(addr){
    if (!addr) return null;
    try {
      const meta = await ensureRewardsToken();
      if (!meta.address || !window.ethers) return null;
      const provider = await ethersProvider();
      const erc20 = new window.ethers.Contract(meta.address, ERC20_BALANCE_ABI, provider);
      return await erc20.balanceOf(addr);
    } catch (err) {
      console.warn('[home] FLYZ balance fetch failed', err);
      return null;
    }
  }

  function setFFWallet(addr){
    FF.wallet = FF.wallet || {};
    FF.wallet.address = addr || null;
    FF.wallet.connected = !!addr;
    window.FF_WALLET = { address: addr || null, connected: !!addr };
    window.WALLET_ADDR = addr || null;
    window.SELECTED_WALLET = addr || null;
    window.user_address = addr || null;
  }

  function emitConnected(addr){
    setFFWallet(addr);
    window.dispatchEvent(new CustomEvent('wallet:connected', { detail:{ address: addr } }));
    window.dispatchEvent(new CustomEvent('FF:walletConnected', { detail:{ address: addr } }));
  }

  function emitDisconnected(){
    setFFWallet(null);
    window.dispatchEvent(new Event('wallet:disconnected'));
    window.dispatchEvent(new Event('FF:walletDisconnected'));
  }

  async function refreshData(){
    if (!state.addr) return;
    state.loading = true;
    updateUI();
    try {
      state.errorStatus = null;
      const [owned, staked, rewards, flyz, meta] = await Promise.all([
        fetchOwnedCount(state.addr),
        fetchStakedCount(state.addr),
        fetchRewards(state.addr),
        fetchFlyzBalance(state.addr),
        ensureRewardsToken()
      ]);
      state.owned = owned;
      state.staked = staked;
      state.rewards = rewards;
      state.flyzBalance = flyz;
      if (meta){
        state.rewardSymbol = meta.symbol || REWARD_SYMBOL;
        state.rewardDecimals = Number.isFinite(Number(meta.decimals)) ? Number(meta.decimals) : REWARD_DECIMALS;
      } else {
        state.rewardSymbol = REWARD_SYMBOL;
        state.rewardDecimals = REWARD_DECIMALS;
      }
    } catch (err) {
      console.warn('[home] refresh failed', err);
      state.errorStatus = 'Could not refresh wallet data.';
    } finally {
      state.loading = false;
      updateUI();
    }
  }

  async function requestAccounts(method){
    if (!window.ethereum) throw new Error('No wallet provider found.');
    const accounts = await window.ethereum.request({ method });
    return Array.isArray(accounts) && accounts[0] ? accounts[0] : null;
  }

  function disconnectWallet(){
    const wasConnected = !!state.addr;
    state.addr = null;
    state.owned = null;
    state.staked = null;
    state.rewards = null;
    state.flyzBalance = null;
    state.loading = false;
    state.busy = false;
    state.errorStatus = null;
    state.rewardSymbol = REWARD_SYMBOL;
    state.rewardDecimals = REWARD_DECIMALS;
    if (wasConnected) emitDisconnected();
    else setFFWallet(null);
    updateUI();
  }

  async function connectWallet(){
    try {
      state.busy = true;
      state.errorStatus = null;
      updateUI();
      const addr = await requestAccounts('eth_requestAccounts');
      if (!addr) return;
      state.addr = addr;
      emitConnected(addr);
      await refreshData();
    } catch (err) {
      console.warn('[home] connect failed', err);
      state.errorStatus = 'Wallet connect failed.';
      setStatus(state.errorStatus);
    } finally {
      state.busy = false;
      updateUI();
    }
  }

  async function handleAccountsChanged(accounts){
    const addr = accounts && accounts[0] ? accounts[0] : null;
    if (!addr){
      disconnectWallet();
      return;
    }
    state.addr = addr;
    state.errorStatus = null;
    emitConnected(addr);
    await refreshData();
  }

  async function init(){
    updateUI();

    els.connectBtn?.addEventListener('click', connectWallet);
    els.disconnectBtn?.addEventListener('click', disconnectWallet);

    if (window.ethereum){
      window.ethereum.on?.('accountsChanged', (acc)=>{ Promise.resolve(handleAccountsChanged(acc)).catch(()=>{}); });
      window.ethereum.on?.('disconnect', ()=>{ disconnectWallet(); });
      window.ethereum.on?.('chainChanged', ()=>{ if (state.addr) refreshData(); });
      try {
        const addr = await requestAccounts('eth_accounts');
        if (addr){
          state.addr = addr;
          emitConnected(addr);
          await refreshData();
        }
      } catch {}
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
