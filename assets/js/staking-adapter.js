// assets/js/staking-adapter.js
// Bridge to your staking controller + collection using YOUR ABI & helpers.
// Exposes a stable API on window.FF.staking and window.FF.wallet.
// - Reads staked tokens via controller.getStakedTokens(user) => tuple[] {staker, tokenId}
// - Reads rewards via controller.availableRewards(user) or stakers(user).unclaimedRewards
// - Actions: approve (setApprovalForAll), stake(tokenId), withdraw(tokenId), claimRewards()

(function (FF, CFG) {
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var WEB3 = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);

  // Expect these globals (either already set by your app, or we create them):
  // - window.controller: web3.eth.Contract for the controller
  // - window.collection: web3.eth.Contract for the NFT collection
  // - window.user_address: current wallet address
  var CONTROLLER_ABI = window.CONTROLLER_ABI || window.controller_abi || window.FF_CONTROLLER_ABI;
  var CONTROLLER_ADDRESS = C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || window.FF_CONTROLLER_ADDRESS;
  var COLLECTION_ABI = window.COLLECTION_ABI || window.collection_abi || window.FF_COLLECTION_ABI;
  var COLLECTION_ADDRESS = C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS || window.FF_COLLECTION_ADDRESS;

  // Build contracts if not present but info is available
  if (!WEB3 && window.ethereum && window.Web3) WEB3 = new window.Web3(window.ethereum);

  function ensureContracts() {
    if (WEB3) {
      if (!window.controller && CONTROLLER_ABI && CONTROLLER_ADDRESS) {
        try { window.controller = new WEB3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS); } catch (e) {}
      }
      if (!window.collection && COLLECTION_ABI && COLLECTION_ADDRESS) {
        try { window.collection = new WEB3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS); } catch (e) {}
      }
    }
  }
  ensureContracts();

  // ------- Wallet helpers -------
  async function getAddress() {
    try {
      if (window.FF_WALLET && window.FF_WALLET.address) return window.FF_WALLET.address;
      if (window.user_address) return window.user_address;
      if (window.ethereum && window.ethereum.request) {
        var arr = await window.ethereum.request({ method:'eth_accounts' });
        return (arr && arr[0]) || null;
      }
    } catch(e) {}
    return null;
  }
  async function connect() {
    if (!window.ethereum || !window.ethereum.request) throw new Error('No wallet provider found.');
    var arr = await window.ethereum.request({ method:'eth_requestAccounts' });
    var addr = (arr && arr[0]) || null;
    if (addr) window.user_address = addr;
    return addr;
  }

  // ------- Normalize helpers -------
  function toNum(x){
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); var n=Number(x); return Number.isFinite(n)?n:NaN; }
      if (typeof x==='object'){
        if (typeof x.toString==='function' && x.toString!==Object.prototype.toString){ var s=x.toString(); if(/^\d+$/.test(s)) return Number(s); }
        if ('_hex' in x) return Number(x._hex);
        if ('hex' in x) return Number(x.hex);
      }
    }catch(e){}
    return NaN;
  }
  function extractId(obj){
    var n = toNum(obj); if (Number.isFinite(n)) return n;
    if (!obj || typeof obj!=='object') return NaN;
    if ('tokenId' in obj) { n = toNum(obj.tokenId); if (Number.isFinite(n)) return n; }
    if (Array.isArray(obj)) {
      for (var i=0;i<obj.length;i++){ n = toNum(obj[i]); if (Number.isFinite(n)) return n; }
    }
    for (var k in obj){ if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
      n = extractId(obj[k]); if (Number.isFinite(n)) return n;
    }
    return NaN;
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    var out=[];
    for (var i=0;i<rows.length;i++){
      var v = extractId(rows[i]);
      if (Number.isFinite(v)) out.push(v);
    }
    return out;
  }

  // ------- Read API -------
  async function getStakedTokens(user){
    if (!window.controller || !window.controller.methods) throw new Error('controller not initialized');
    return window.controller.methods.getStakedTokens(user).call();
  }
  async function getUserStakedTokens(user){
    var raw = await getStakedTokens(user);
    var ids = normalizeIds(raw);
    console.log('[staking-adapter] staked IDs:', ids);
    return ids;
  }
  async function availableRewards(user){
    if (!window.controller || !window.controller.methods) throw new Error('controller not initialized');
    // Primary
    try {
      var v = await window.controller.methods.availableRewards(user).call();
      return v;
    } catch(e){}
    // Fallback to stakers[user].unclaimedRewards
    try {
      var s = await window.controller.methods.stakers(user).call();
      return s && s.unclaimedRewards ? s.unclaimedRewards : '0';
    } catch(e){}
    return '0';
  }
  async function isApprovedForAll(user, operator){
    if (!window.collection || !window.collection.methods) return null;
    try { return await window.collection.methods.isApprovedForAll(user, operator || CONTROLLER_ADDRESS).call({ from:user }); }
    catch(e){ return null; }
  }

  // ------- Write API -------
  async function setApprovalForAll(){
    if (typeof window.initiate_setApprovalForAll === 'function') {
      return window.initiate_setApprovalForAll();
    }
    if (!WEB3 || !window.collection || !window.collection.methods) throw new Error('collection not initialized');
    var user = window.user_address || await getAddress();
    var gasprice = await WEB3.eth.getGasPrice(); gasprice = Math.round(gasprice*1.05);
    var est = await window.collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).estimateGas({ from:user });
    est = Math.round(est*1.05);
    return window.collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({
      from: user, gas: WEB3.utils.toHex(est), gasPrice: WEB3.utils.toHex(gasprice)
    });
  }
  async function stake(tokenId){
    if (typeof window.initiate_stake === 'function') return window.initiate_stake(tokenId);
    if (!WEB3 || !window.controller || !window.controller.methods) throw new Error('controller not initialized');
    var user = window.user_address || await getAddress();
    var gasprice = await WEB3.eth.getGasPrice(); gasprice = Math.round(gasprice*1.05);
    var est = await window.controller.methods.stake(tokenId).estimateGas({ from:user });
    est = Math.round(est*1.05);
    return window.controller.methods.stake(tokenId).send({ from:user, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gasprice) });
  }
  async function withdraw(tokenId){
    if (typeof window.initiate_withdraw === 'function') return window.initiate_withdraw(tokenId);
    if (!WEB3 || !window.controller || !window.controller.methods) throw new Error('controller not initialized');
    var user = window.user_address || await getAddress();
    var gasprice = await WEB3.eth.getGasPrice(); gasprice = Math.round(gasprice*1.05);
    var est = await window.controller.methods.withdraw(tokenId).estimateGas({ from:user });
    est = Math.round(est*1.05);
    return window.controller.methods.withdraw(tokenId).send({ from:user, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gasprice) });
  }
  async function claimRewards(){
    if (!WEB3 || !window.controller || !window.controller.methods) throw new Error('controller not initialized');
    var user = window.user_address || await getAddress();
    var gasprice = await WEB3.eth.getGasPrice(); gasprice = Math.round(gasprice*1.05);
    var est = await window.controller.methods.claimRewards().estimateGas({ from:user });
    est = Math.round(est*1.05);
    return window.controller.methods.claimRewards().send({ from:user, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gasprice) });
  }

  // Expose
  FF.wallet = FF.wallet || {};
  if (!FF.wallet.getAddress) FF.wallet.getAddress = getAddress;
  if (!FF.wallet.connect)    FF.wallet.connect    = connect;

  FF.staking = FF.staking || {};
  FF.staking.getStakedTokens      = getStakedTokens;
  FF.staking.getUserStakedTokens  = getUserStakedTokens;
  FF.staking.availableRewards     = availableRewards;
  FF.staking.isApprovedForAll     = isApprovedForAll;
  FF.staking.setApprovalForAll    = setApprovalForAll;
  FF.staking.stakeToken           = stake;
  FF.staking.unstakeToken         = withdraw;
  FF.staking.claimRewards         = claimRewards;

  console.log('[staking-adapter] ready', {
    controller: !!window.controller,
    collection: !!window.collection,
    controllerAddr: CONTROLLER_ADDRESS,
    collectionAddr: COLLECTION_ADDRESS
  });
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
