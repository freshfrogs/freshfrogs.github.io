// assets/js/staking-adapter.js
// Minimal controller adapter used by owned-panel.js. NO UI CHANGES.
//
// Exposes:
//   FF.staking.getStakedTokens(address)      -> [tokenId,...]
//   FF.staking.getAvailableRewards(address)  -> string (raw uint256 as string)
//   FF.staking.isApproved(address)           -> true | false | null
//   FF.staking.approve()                     -> tx
//   FF.staking.stakeToken(id)                -> tx
//   FF.staking.unstakeToken(id)              -> tx (withdraw)
//   FF.staking.claimRewards()                -> tx
//   FF.staking.getStakeSince(id)             -> null (not in this ABI)
//   FF.staking.getStakeInfo(id)              -> null (not in this ABI)
//
// Requires:
//   window.Web3 (library)  — add <script src="https://cdn.jsdelivr.net/npm/web3@1.10.4/dist/web3.min.js"></script>
//   window.CONTROLLER_ABI  — from assets/abi/controller_abi.js (must assign to window.CONTROLLER_ABI)
//   FF_CFG.CONTROLLER_ADDRESS
//   FF_CFG.COLLECTION_ADDRESS
//
// Reads work with wallet provider OR FF_CFG.RPC_URL (optional). Writes require wallet.

(function (FF, CFG) {
  'use strict';

  const CTRL_ADDR = CFG && CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG && CFG.COLLECTION_ADDRESS;

  // Public API (export first so callers can reference even if libs load slowly)
  const api = {
    // Reads
    async getStakedTokens(owner){ try { return await _getStakedTokens(owner); } catch(e){ console.warn('[staking-adapter] getStakedTokens', e); return []; } },
    async getUserStakedTokens(owner){ return api.getStakedTokens(owner); }, // alias
    async getAvailableRewards(owner){ try { return await _getAvailableRewards(owner); } catch(e){ console.warn('[staking-adapter] rewards', e); return '0'; } },
    async isApproved(owner){ try { return await _isApproved(owner); } catch(e){ console.warn('[staking-adapter] isApproved', e); return null; } },

    // Actions (write)
    async approve(){ return _approve(); },
    async claimRewards(){ return _claim(); },
    async stakeToken(id){ return _stake(id); },
    async unstakeToken(id){ return _withdraw(id); },

    // Not in this ABI; keep surface compatible with panel
    async getStakeSince(){ return null; },
    async getStakeInfo(){ return null; }
  };
  FF.staking = api;
  window.FF_STAKING = api;

  // ---------- internals ----------
  function _hasWeb3(){ return !!window.Web3; }
  function _provider(){
    // Wallet first; else optional read-only RPC if provided.
    if (window.ethereum) return window.ethereum;
    if (CFG && CFG.RPC_URL && _hasWeb3()) return new window.Web3.providers.HttpProvider(CFG.RPC_URL);
    throw new Error('No provider: wallet not available (and no FF_CFG.RPC_URL).');
  }
  function _web3(){
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    return new window.Web3(_provider());
  }
  function _acct(){
    // Use cached wallet if your site sets it; else selectedAddress.
    return (FF.wallet && FF.wallet.address) || (window.ethereum && window.ethereum.selectedAddress) || null;
  }
  function _needABI(){
    if (!window.CONTROLLER_ABI || !Array.isArray(window.CONTROLLER_ABI)) throw new Error('Missing controller ABI (window.CONTROLLER_ABI)');
    if (!CTRL_ADDR) throw new Error('Missing controller address (FF_CFG.CONTROLLER_ADDRESS)');
  }
  function _needColl(){
    if (!COLL_ADDR) throw new Error('Missing collection address (FF_CFG.COLLECTION_ADDRESS)');
  }
  function _ctrl(w3){
    return new w3.eth.Contract(window.CONTROLLER_ABI || [], CTRL_ADDR);
  }
  function _erc721(w3){
    // Minimal ABI: approval methods only
    return new w3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ], COLL_ADDR);
  }
  const _toNum = (x)=>{
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

  // ---------- READS ----------
  async function _getStakedTokens(owner){
    // Guards: if no owner yet, return empty; if missing ABI/address, return empty (don’t throw)
    if (!owner) return [];
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    if (!window.CONTROLLER_ABI || !CTRL_ADDR) return [];

    const w3 = _web3();
    _needABI();
    const ctrl = _ctrl(w3);

    // ABI: getStakedTokens(address) -> tuple[] { staker, tokenId }
    const rows = await ctrl.methods.getStakedTokens(owner).call();
    return Array.isArray(rows) ? rows.map(r => _toNum(r && r.tokenId)).filter(Number.isFinite) : [];
  }

  async function _getAvailableRewards(owner){
    if (!owner) return '0';
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    if (!window.CONTROLLER_ABI || !CTRL_ADDR) return '0';

    const w3 = _web3();
    _needABI();
    const ctrl = _ctrl(w3);
    if (!ctrl.methods || !ctrl.methods.availableRewards) return '0';
    const v = await ctrl.methods.availableRewards(owner).call();
    // return raw string; owned-panel.js formats it
    return (v != null && v.toString) ? v.toString() : String(v ?? '0');
  }

  async function _isApproved(owner){
    if (!owner) return null;                  // no wallet yet
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    if (!COLL_ADDR) return null;

    const w3 = _web3();
    _needColl();
    const nft = _erc721(w3);
    const ok = await nft.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner });
    return !!ok;
  }

  // ---------- WRITES (wallet required) ----------
  async function _approve(){
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    const from = _acct(); if (!from) throw new Error('Connect wallet to approve');
    _needColl();
    const w3 = _web3();
    const nft = _erc721(w3);
    return nft.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
  }

  async function _stake(id){
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    const from = _acct(); if (!from) throw new Error('Connect wallet to stake');
    _needABI();
    const w3 = _web3();
    const ctrl = _ctrl(w3);
    return ctrl.methods.stake(String(id)).send({ from });
  }

  async function _withdraw(id){
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    const from = _acct(); if (!from) throw new Error('Connect wallet to withdraw');
    _needABI();
    const w3 = _web3();
    const ctrl = _ctrl(w3);
    return ctrl.methods.withdraw(String(id)).send({ from });
  }

  async function _claim(){
    if (!_hasWeb3()) throw new Error('Web3 library not loaded');
    const from = _acct(); if (!from) throw new Error('Connect wallet to claim');
    _needABI();
    const w3 = _web3();
    const ctrl = _ctrl(w3);
    return ctrl.methods.claimRewards().send({ from });
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
