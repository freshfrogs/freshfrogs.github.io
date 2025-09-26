// assets/js/staking-adapter.js
// Wires controller.getStakedTokens(user) and exposes numeric ID helpers.

(function (FF, CFG) {
  'use strict';

  const ADDR = CFG.CONTROLLER_ADDRESS || CFG.STAKING_CONTROLLER || window.FF_CONTROLLER_ADDRESS;
  const ABI  = window.FF_CONTROLLER_ABI || window.controller_abi || window.CONTROLLER_ABI;

  if (!ADDR || !ABI) {
    console.warn('[staking-adapter] Missing controller address or ABI');
    return;
  }

  function getEthers(){ return window.ethers || null; }
  function ethersProvider(){
    const e=getEthers(); if(!e || !window.ethereum) return null;
    try{ if (e.BrowserProvider) return new e.BrowserProvider(window.ethereum); }catch{}
    try{ if (e.providers?.Web3Provider) return new e.providers.Web3Provider(window.ethereum); }catch{}
    return null;
  }
  async function ethersContract(readOnly=true){
    const e=getEthers(), p=ethersProvider(); if(!e || !p) return null;
    try{ // v6
      if (e.Contract && p.getSigner){
        const signer = readOnly ? null : await p.getSigner();
        return new e.Contract(ADDR, ABI, signer || p);
      }
    }catch{}
    try{ // v5
      if (e.Contract && p.getSigner){
        const signer = readOnly ? p : p.getSigner();
        return new e.Contract(ADDR, ABI, signer);
      }
    }catch{}
    return null;
  }
  function web3Contract(){
    const W = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
    try{ return W ? new W.eth.Contract(ABI, ADDR) : null; }catch{ return null; }
  }

  // Normalize many tuple/BN/hex shapes → number
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    const toNum=(x)=>{ try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x==='object'){
        if (typeof x.toString==='function' && x.toString!==Object.prototype.toString){
          const s=x.toString(); if(/^\d+$/.test(s)) return Number(s);
        }
        if ('_hex' in x) return Number(x._hex);
        if ('hex'  in x) return Number(x.hex);
      }
      return NaN;
    }catch{ return NaN; }};
    return rows.map(r=>{
      if (Array.isArray(r)) return toNum(r[0]);
      if (typeof r==='string' || typeof r==='number' || typeof r==='bigint') return toNum(r);
      if (typeof r==='object'){
        const cand = r.tokenId ?? r.id ?? r.token_id ?? r.tokenID ?? r[0];
        return toNum(cand);
      }
      return NaN;
    }).filter(Number.isFinite);
  }

  async function getStakedTokens(user){
    const ec = await ethersContract(true);
    if (ec?.getStakedTokens) return await ec.getStakedTokens(user);
    const wc = web3Contract();
    if (wc?.methods?.getStakedTokens) return await wc.methods.getStakedTokens(user).call();
    throw new Error('getStakedTokens() not found on controller');
  }
  async function getStakedIds(user){
    const raw = await getStakedTokens(user);
    return normalizeIds(raw);
  }

  // Expose
  FF.staking = FF.staking || {};
  if (!FF.staking.getStakedTokens)      FF.staking.getStakedTokens      = getStakedTokens;
  if (!FF.staking.getUserStakedTokens)  FF.staking.getUserStakedTokens  = getStakedIds;
  if (!window.getStakedTokens)          window.getStakedTokens          = getStakedTokens;

  console.log('[staking-adapter] ready', ADDR);
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
