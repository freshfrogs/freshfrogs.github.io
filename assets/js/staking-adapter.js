// assets/js/staking-adapter.js
// Minimal, safe glue for your staking + collection contracts.
// Uses your globals if present, otherwise builds contracts from FF_CFG + ABI files.

(function (FF, CFG) {
  'use strict';

  var C = window.FF_CFG || CFG || {};
  var WEB3 = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);

  var CONTROLLER_ABI   = window.CONTROLLER_ABI || window.controller_abi || window.FF_CONTROLLER_ABI;
  var CONTROLLER_ADDR  = C.CONTROLLER_ADDRESS || window.CONTROLLER_ADDRESS || window.FF_CONTROLLER_ADDRESS;
  var COLLECTION_ABI   = window.COLLECTION_ABI || window.collection_abi || window.FF_COLLECTION_ABI;
  var COLLECTION_ADDR  = C.COLLECTION_ADDRESS || window.COLLECTION_ADDRESS || window.FF_COLLECTION_ADDRESS;

  if (!WEB3 && window.ethereum && window.Web3) WEB3 = new window.Web3(window.ethereum);

  function ensureContracts() {
    try {
      if (!window.controller && WEB3 && CONTROLLER_ABI && CONTROLLER_ADDR)
        window.controller = new WEB3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDR);
    } catch(e){}
    try {
      if (!window.collection && WEB3 && COLLECTION_ABI && COLLECTION_ADDR)
        window.collection = new WEB3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDR);
    } catch(e){}
  }
  ensureContracts();

  // wallet helpers
  async function getAddress(){
    try {
      if (window.FF_WALLET?.address) return window.FF_WALLET.address;
      if (window.user_address) return window.user_address;
      if (window.ethereum?.request){
        var arr = await window.ethereum.request({ method:'eth_accounts' });
        return arr?.[0] || null;
      }
    } catch {}
    return null;
  }
  async function connect(){
    if (!window.ethereum?.request) throw new Error('No wallet provider.');
    var arr = await window.ethereum.request({ method:'eth_requestAccounts' });
    var a = arr?.[0] || null; if (a) window.user_address = a; return a;
  }

  // normalization
  function toNum(x){
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); var n=Number(x); return Number.isFinite(n)?n:NaN; }
      if (typeof x==='object'){
        if (typeof x.toString==='function' && x.toString!==Object.prototype.toString){
          var s=x.toString(); if (/^\d+$/.test(s)) return Number(s);
        }
        if ('_hex' in x) return Number(x._hex);
      }
    }catch{}
    return NaN;
  }
  function extractId(obj){
    var n=toNum(obj); if (Number.isFinite(n)) return n;
    if (!obj || typeof obj!=='object') return NaN;
    if ('tokenId' in obj){ n=toNum(obj.tokenId); if (Number.isFinite(n)) return n; }
    if (Array.isArray(obj)){ for (var i=0;i<obj.length;i++){ n=toNum(obj[i]); if (Number.isFinite(n)) return n; } }
    for (var k in obj){ if (!Object.prototype.hasOwnProperty.call(obj,k)) continue;
      n = extractId(obj[k]); if (Number.isFinite(n)) return n;
    }
    return NaN;
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    var out=[]; for (var i=0;i<rows.length;i++){ var v=extractId(rows[i]); if (Number.isFinite(v)) out.push(v); }
    return out;
  }

  // reads
  async function getStakedTokens(user){
    if (!window.controller?.methods) throw new Error('controller not ready');
    return window.controller.methods.getStakedTokens(user).call();
  }
  async function getUserStakedTokens(user){
    var raw = await getStakedTokens(user);
    var ids = normalizeIds(raw);
    return ids;
  }
  async function availableRewards(user){
    if (!window.controller?.methods) throw new Error('controller not ready');
    try { return await window.controller.methods.availableRewards(user).call(); }
    catch(e){}
    try { var s=await window.controller.methods.stakers(user).call(); return s?.unclaimedRewards ?? '0'; }
    catch(e){}
    return '0';
  }
  async function isApprovedForAll(user, operator){
    if (!window.collection?.methods) return null;
    try { return await window.collection.methods.isApprovedForAll(user, operator || CONTROLLER_ADDR).call({ from:user }); }
    catch(e){ return null; }
  }

  // writes (use your helper functions if present)
  async function setApprovalForAll(){
    if (typeof window.initiate_setApprovalForAll === 'function') return window.initiate_setApprovalForAll();
    if (!WEB3 || !window.collection?.methods) throw new Error('collection not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
    var est = await window.collection.methods.setApprovalForAll(CONTROLLER_ADDR, true).estimateGas({ from:a });
    est = Math.round(est*1.05);
    return window.collection.methods.setApprovalForAll(CONTROLLER_ADDR, true).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
  }
  async function stake(tokenId){
    if (typeof window.initiate_stake === 'function') return window.initiate_stake(tokenId);
    if (!WEB3 || !window.controller?.methods) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
    var est = await window.controller.methods.stake(tokenId).estimateGas({ from:a });
    est = Math.round(est*1.05);
    return window.controller.methods.stake(tokenId).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
  }
  async function withdraw(tokenId){
    if (typeof window.initiate_withdraw === 'function') return window.initiate_withdraw(tokenId);
    if (!WEB3 || !window.controller?.methods) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
    var est = await window.controller.methods.withdraw(tokenId).estimateGas({ from:a });
    est = Math.round(est*1.05);
    return window.controller.methods.withdraw(tokenId).send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
  }
  async function claimRewards(){
    if (!WEB3 || !window.controller?.methods) throw new Error('controller not ready');
    var a = window.user_address || await getAddress();
    var gp = await WEB3.eth.getGasPrice(); gp = Math.round(gp*1.05);
    var est = await window.controller.methods.claimRewards().estimateGas({ from:a });
    est = Math.round(est*1.05);
    return window.controller.methods.claimRewards().send({ from:a, gas:WEB3.utils.toHex(est), gasPrice:WEB3.utils.toHex(gp) });
  }

  // expose
  FF.wallet  = FF.wallet || {};
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
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
