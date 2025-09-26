// assets/js/staking-adapter.js
// Adapter used by owned-panel.js. NO UI code.
// Reads from controller via getStakedTokens(_user) & availableRewards(_staker).
// Requires: window.CONTROLLER_ABI (assets/abi/controller_abi.js),
//           FF_CFG.CONTROLLER_ADDRESS, FF_CFG.COLLECTION_ADDRESS.
// Reads work with window.ethereum OR FF_CFG.RPC_URL; writes need a wallet.

(function (FF, CFG) {
  'use strict';

  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;

  // Export a stable API immediately so the panel can call it any time.
  const api = {
    // ---- reads expected by owned-panel.js ----
    async getStakedTokens(owner){ try { return await _getStakedTokens(owner); } catch { return []; } },
    async getUserStakedTokens(owner){ try { return await _getStakedTokens(owner); } catch { return []; } }, // alias
    async getAvailableRewards(owner){ try { return await _getAvailableRewards(owner); } catch { return '0'; } },
    async isApproved(owner){ try { return await _isApproved(owner); } catch { return null; } },

    // ---- actions (used by the card buttons / header) ----
    async approve(){ return _approve(); },
    async claimRewards(){ return _claim(); },
    async stakeToken(id){ return _stake(id); },
    async unstakeToken(id){ return _withdraw(id); },

    // Not present in this ABI; panel handles null.
    async getStakeSince(/*id*/){ return null; },
    async getStakeInfo(/*id*/){ return null; }
  };
  FF.staking = api;
  window.FF_STAKING = api; // legacy alias some code checks

  // ---------------- internals ----------------
  function _provider() {
    if (window.ethereum) return window.ethereum;                       // wallet (reads+writes)
    if (window.Web3 && CFG.RPC_URL) return new window.Web3.providers.HttpProvider(CFG.RPC_URL); // read-only
    throw new Error('No provider: connect a wallet or set FF_CFG.RPC_URL');
  }
  function _web3() {
    if (!window.Web3) throw new Error('Web3 library not loaded');
    return new window.Web3(_provider());
  }
  function _account() {
    return (FF.wallet && FF.wallet.address) ||
           (window.ethereum && window.ethereum.selectedAddress) || null;
  }
  function _controller(w3) {
    if (!CTRL_ADDR || !window.CONTROLLER_ABI) throw new Error('Missing controller address/ABI');
    return new w3.eth.Contract(window.CONTROLLER_ABI || [], CTRL_ADDR);
  }
  function _erc721(w3) {
    if (!COLL_ADDR) throw new Error('Missing collection address');
    return new w3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ], COLL_ADDR);
  }
  const _toNum = (x)=> {
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string') { if (/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x==='object') {
        if ('tokenId' in x) return _toNum(x.tokenId);
        if ('id' in x)      return _toNum(x.id);
        if ('_hex' in x)    return Number(x._hex);
        const s = x.toString?.(); if (s && /^\d+$/.test(s)) return Number(s);
      }
    }catch{}
    return NaN;
  };

  // ---- controller reads ----
  async function _getStakedTokens(owner){
    const w3 = _web3();
    const ctrl = _controller(w3);
    // ABI: getStakedTokens(address) returns tuple[] { staker, tokenId }
    const rows = await ctrl.methods.getStakedTokens(owner).call();
    return Array.isArray(rows) ? rows.map(r => _toNum(r && r.tokenId)).filter(Number.isFinite) : [];
  }
  async function _getAvailableRewards(owner){
    const w3 = _web3();
    const ctrl = _controller(w3);
    // ABI: availableRewards(address) -> uint256 (raw wei string expected by panel)
    return await ctrl.methods.availableRewards(owner).call();
  }

  // ---- approval (ERC-721 over the collection contract) ----
  async function _isApproved(owner){
    const w3 = _web3();
    const nft = _erc721(w3);
    return !!(await nft.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner }));
  }
  async function _approve(){
    const w3 = _web3();
    const from = _account();
    if (!from) throw new Error('Connect wallet to approve');
    const nft = _erc721(w3);
    return nft.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
  }

  // ---- actions on controller ----
  async function _stake(id){
    const w3 = _web3();
    const from = _account();
    if (!from) throw new Error('Connect wallet to stake');
    const ctrl = _controller(w3);
    return ctrl.methods.stake(String(id)).send({ from });
  }
  async function _withdraw(id){
    const w3 = _web3();
    const from = _account();
    if (!from) throw new Error('Connect wallet to withdraw');
    const ctrl = _controller(w3);
    return ctrl.methods.withdraw(String(id)).send({ from });
  }
  async function _claim(){
    const w3 = _web3();
    const from = _account();
    if (!from) throw new Error('Connect wallet to claim');
    const ctrl = _controller(w3);
    return ctrl.methods.claimRewards().send({ from });
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
