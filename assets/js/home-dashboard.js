// assets/js/home-dashboard.js
// Drives the homepage wallet controls + summary card using the shared Alchemy helper.
(function(FF, CFG){
  'use strict';

  const REWARD_SYMBOL = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
  const REWARD_DECIMALS = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
  const CONTROLLER = CFG.CONTROLLER_ADDRESS || '';
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';

  const els = {
    connectBtn: document.getElementById('homeConnectBtn'),
    approveBtn: document.getElementById('homeApproveBtn'),
    claimBtn: document.getElementById('homeClaimBtn'),
    walletLabel: document.getElementById('homeWalletLabel'),
    ownedTop: document.getElementById('homeOwnedTop'),
    stakedTop: document.getElementById('homeStakedTop'),
    rewardsTop: document.getElementById('homeRewardsTop'),
    rewardsSymbol: document.getElementById('homeRewardSymbol'),
    barStatus: document.getElementById('homeBarStatus'),
    ownedCount: document.getElementById('homeOwnedCount'),
    stakedCount: document.getElementById('homeStakedCount'),
    rewardsAmount: document.getElementById('homeRewardsAmount'),
    summaryStatus: document.getElementById('homeSummaryStatus'),
    summaryNote: document.getElementById('homeSummaryNote')
  };

  const state = {
    addr: null,
    owned: null,
    staked: null,
    rewards: null,
    approved: null,
    loading: false,
    busy: false,
    errorStatus: null
  };

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
    if (els.barStatus) els.barStatus.textContent = message || '';
    if (els.summaryStatus) els.summaryStatus.textContent = message || '';
  }

  function setSummaryNote(message){ if (els.summaryNote) els.summaryNote.textContent = message || ''; }

  function updateUI(){
    const connected = Boolean(state.addr);

    setText(els.walletLabel, connected ? `Wallet: ${shorten(state.addr)}` : 'Wallet: —');
    setText(els.ownedTop, formatCount(state.owned));
    setText(els.ownedCount, formatCount(state.owned));
    setText(els.stakedTop, formatCount(state.staked));
    setText(els.stakedCount, formatCount(state.staked));

    const rewardsDisplay = state.rewards != null ? formatToken(state.rewards, REWARD_DECIMALS) : '—';
    setText(els.rewardsTop, rewardsDisplay);
    if (els.rewardsSymbol) els.rewardsSymbol.textContent = REWARD_SYMBOL ? (' ' + REWARD_SYMBOL) : '';
    setText(els.rewardsAmount, rewardsDisplay);

    if (els.connectBtn){
      els.connectBtn.textContent = connected ? 'Connected' : 'Connect Wallet';
      els.connectBtn.classList.toggle('btn-connected', connected);
      els.connectBtn.disabled = state.busy;
    }

    const canManage = connected && !state.loading && !state.busy;
    if (els.approveBtn){
      const isApproved = state.approved === true;
      els.approveBtn.style.display = isApproved ? 'none' : '';
      els.approveBtn.disabled = !canManage;
    }
    if (els.claimBtn){
      const hasRewards = state.rewards && formatToken(state.rewards, REWARD_DECIMALS) !== '0';
      els.claimBtn.disabled = !canManage || !hasRewards;
    }

    let statusMessage = '';
    let noteMessage = 'Stats refresh automatically after actions.';

    if (!connected){
      statusMessage = state.errorStatus || 'Connect your wallet to manage frogs.';
      noteMessage = state.errorStatus ? 'Try reconnecting and approving via your wallet.' : 'Stats refresh automatically after you connect.';
    } else if (state.loading){
      statusMessage = 'Loading wallet data…';
      noteMessage = 'Fetching owned, staked, and rewards.';
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

  async function writeContract(address, abi){
    const provider = await ethersProvider();
    const signer = provider.getSigner();
    return new window.ethers.Contract(address, abi, signer);
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

  async function checkApproved(addr){
    if (!addr || !COLLECTION || !CONTROLLER) return null;
    try {
      const abi = window.COLLECTION_ABI || [];
      const contract = await readContract(COLLECTION, abi);
      if (!contract.isApprovedForAll) return null;
      return Boolean(await contract.isApprovedForAll(addr, CONTROLLER));
    } catch (err) {
      console.warn('[home] approval check failed', err);
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
      const [owned, staked, rewards, approved] = await Promise.all([
        fetchOwnedCount(state.addr),
        fetchStakedCount(state.addr),
        fetchRewards(state.addr),
        checkApproved(state.addr)
      ]);
      state.owned = owned;
      state.staked = staked;
      state.rewards = rewards;
      state.approved = approved;
      if (!state.loading) state.errorStatus = null;
    } catch (err) {
      console.warn('[home] refresh failed', err);
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

  async function approveStaking(){
    if (!state.addr || !COLLECTION || !CONTROLLER) return;
    try {
      state.busy = true;
      state.errorStatus = null;
      updateUI();
      setStatus('Submitting approval…');
      const contract = await writeContract(COLLECTION, window.COLLECTION_ABI || []);
      const tx = await contract.setApprovalForAll(CONTROLLER, true);
      await tx.wait?.();
      state.approved = true;
      setStatus('Approval confirmed.');
      state.errorStatus = null;
    } catch (err) {
      console.warn('[home] approve failed', err);
      state.errorStatus = 'Approval failed.';
      setStatus(state.errorStatus);
    } finally {
      state.busy = false;
      updateUI();
    }
  }

  async function claimRewards(){
    if (!state.addr || !CONTROLLER) return;
    try {
      state.busy = true;
      state.errorStatus = null;
      updateUI();
      setStatus('Claiming rewards…');
      const contract = await writeContract(CONTROLLER, window.CONTROLLER_ABI || []);
      const tx = await contract.claimRewards();
      await tx.wait?.();
      setStatus('Rewards claimed.');
      state.errorStatus = null;
      await refreshData();
    } catch (err) {
      console.warn('[home] claim failed', err);
      state.errorStatus = 'Claim failed.';
      setStatus(state.errorStatus);
    } finally {
      state.busy = false;
      updateUI();
    }
  }

  async function handleAccountsChanged(accounts){
    const addr = accounts && accounts[0] ? accounts[0] : null;
    if (!addr){
      state.addr = null;
      state.owned = state.staked = state.rewards = state.approved = null;
      state.errorStatus = null;
      emitDisconnected();
      updateUI();
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
    els.approveBtn?.addEventListener('click', approveStaking);
    els.claimBtn?.addEventListener('click', claimRewards);

    if (window.ethereum){
      window.ethereum.on?.('accountsChanged', (acc)=>{ handleAccountsChanged(acc); });
      window.ethereum.on?.('disconnect', ()=>{ handleAccountsChanged([]); });
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
