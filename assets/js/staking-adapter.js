// assets/js/staking-adapter.js
// Adapter that talks to your controller using CONTROLLER_ABI from assets/abi/controller_abi.js.
// Provides the helpers used by your owned-panel.js without touching the UI.

(function (FF, CFG) {
  'use strict';

  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;

  if (!window.Web3) { console.warn('[staking-adapter] Web3 not found'); return; }
  if (!CTRL_ADDR || !window.CONTROLLER_ABI) {
    console.warn('[staking-adapter] Missing controller address or ABI');
    return;
  }

  // -------- provider / web3 ----------
  function getProvider() {
    if (window.ethereum) return window.ethereum;
    if (CFG.RPC_URL) return new window.Web3.providers.HttpProvider(CFG.RPC_URL);
    return null;
  }
  function getWeb3() {
    const p = getProvider();
    if (!p) throw new Error('No RPC provider (ethereum or CFG.RPC_URL)');
    return new window.Web3(p);
  }
  function getAccount() {
    // used for write ops (approve/stake/withdraw/claim)
    return (FF.wallet && FF.wallet.address) || (window.ethereum && window.ethereum.selectedAddress) || null;
  }

  // -------- contracts ----------
  function controller(web3) {
    return new web3.eth.Contract(window.CONTROLLER_ABI || [], CTRL_ADDR);
  }
  function erc721(web3) {
    // Use CFG.COLLECTION_ADDRESS directly (you also have nftCollection() if needed)
    return new web3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ], COLL_ADDR);
  }

  // -------- utils ----------
  function toNumber(x) {
    try {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'bigint') return Number(x);
      if (typeof x === 'string') { if (/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x === 'object') {
        if ('tokenId' in x) return toNumber(x.tokenId);
        if ('id' in x)      return toNumber(x.id);
        if ('_hex' in x)    return Number(x._hex);
        const s = x.toString?.(); if (s && /^\d+$/.test(s)) return Number(s);
      }
    } catch {}
    return NaN;
  }

  // -------- reads your panel calls ----------
  async function getStakedTokens(owner) {
    // ABI: function getStakedTokens(address _user) returns (StakedToken[] {staker, tokenId})
    const web3 = getWeb3();
    const ctrl = controller(web3);
    const rows = await ctrl.methods.getStakedTokens(owner).call();
    // Normalize to [Number tokenId]
    const ids = Array.isArray(rows) ? rows.map(r => toNumber(r && r.tokenId)).filter(Number.isFinite) : [];
    return ids;
  }

  async function getAvailableRewards(owner) {
    const web3 = getWeb3();
    const ctrl = controller(web3);
    // ABI: function availableRewards(address _staker) view returns (uint256)
    return await ctrl.methods.availableRewards(owner).call();
  }

  // You don't have stakeSince in the ABI; panel will gracefully handle null.
  async function getStakeSince(/* tokenId */) {
    return null; // not available in this controller
  }

  async function isApproved(owner) {
    const web3 = getWeb3();
    const nft = erc721(web3);
    try { return !!(await nft.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner })); }
    catch { return null; }
  }

  // -------- writes used by your card buttons ----------
  async function approve() {
    const web3 = getWeb3();
    const from = getAccount();
    if (!from) throw new Error('No connected account for approve()');
    const nft = erc721(web3);
    return nft.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
  }

  async function stakeToken(tokenId) {
    const web3 = getWeb3();
    const from = getAccount();
    if (!from) throw new Error('No connected account for stake');
    const ctrl = controller(web3);
    // ABI: stake(uint256 _tokenId)
    return ctrl.methods.stake(String(tokenId)).send({ from });
  }

  async function unstakeToken(tokenId) {
    const web3 = getWeb3();
    const from = getAccount();
    if (!from) throw new Error('No connected account for withdraw');
    const ctrl = controller(web3);
    // ABI: withdraw(uint256 _tokenId)
    return ctrl.methods.withdraw(String(tokenId)).send({ from });
  }

  async function claimRewards() {
    const web3 = getWeb3();
    const from = getAccount();
    if (!from) throw new Error('No connected account for claimRewards');
    const ctrl = controller(web3);
    return ctrl.methods.claimRewards().send({ from });
  }

  // -------- export under the names your panel tries ----------
  FF.staking = {
    // lists / stats
    getStakedTokens,
    getUserStakedTokens: getStakedTokens,  // alias
    getAvailableRewards,

    // staking timestamps (not available in this ABI -> null)
    getStakeSince,

    // approvals
    isApproved,
    approve,

    // actions
    stakeToken,
    unstakeToken,
    claimRewards
  };
  window.FF_STAKING = FF.staking; // legacy alias some code checks

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
