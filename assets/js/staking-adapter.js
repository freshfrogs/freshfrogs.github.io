// assets/js/staking-adapter.js
// Bridge to your staking controller. Finds an existing `controller` (web3),
// or builds one via ethers/web3 from ABI+address. Exposes normalized staked IDs.

(function (FF, CFG) {
  'use strict';

  const ADDR = CFG.CONTROLLER_ADDRESS || CFG.STAKING_CONTROLLER || window.FF_CONTROLLER_ADDRESS;
  const ABI  = window.FF_CONTROLLER_ABI || window.controller_abi || window.CONTROLLER_ABI;

  function existingController() {
    const c = window.controller;
    return (c && c.methods) ? c : null;
  }

  function getEthers(){ return window.ethers || null; }
  function ethersProvider(){
    const e = getEthers(); if (!e || !window.ethereum) return null;
    try { if (e.BrowserProvider) return new e.BrowserProvider(window.ethereum); } catch {}
    try { if (e.providers?.Web3Provider) return new e.providers.Web3Provider(window.ethereum); } catch {}
    return null;
  }
  async function ethersContract(readOnly = true){
    const e = getEthers(), p = ethersProvider(); if (!e || !p || !ABI || !ADDR) return null;
    try { const signer = readOnly ? null : await p.getSigner(); return new e.Contract(ADDR, ABI, signer || p); } catch {}
    return null;
  }
  function web3Contract(){
    if (!ABI || !ADDR) return null;
    const W = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
    try { return W ? new W.eth.Contract(ABI, ADDR) : null; } catch { return null; }
  }

  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    const toNum = (x) => { try {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'bigint') return Number(x);
      if (typeof x === 'string'){ if (/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x === 'object'){
        if (typeof x.toString === 'function' && x.toString !== Object.prototype.toString){
          const s = x.toString(); if (/^\d+$/.test(s)) return Number(s);
        }
        if ('_hex' in x) return Number(x._hex);
        if ('hex'  in x) return Number(x.hex);
      }
      return NaN;
    } catch { return NaN; }};

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
    const ex = existingController();
    if (ex?.methods?.getStakedTokens) return ex.methods.getStakedTokens(user).call();

    const ec = await ethersContract(true);
    if (ec?.getStakedTokens) return ec.getStakedTokens(user);

    const wc = web3Contract();
    if (wc?.methods?.getStakedTokens) return wc.methods.getStakedTokens(user).call();

    throw new Error('getStakedTokens() not found on controller');
  }

  async function getStakedIds(user){
    const raw = await getStakedTokens(user);
    const ids = normalizeIds(raw);
    console.log('[staking-adapter] staked IDs:', ids.length, ids.slice(0, 10));
    return ids;
  }

  // Expose
  FF.staking = FF.staking || {};
  if (!FF.staking.getStakedTokens)      FF.staking.getStakedTokens      = getStakedTokens;
  if (!FF.staking.getUserStakedTokens)  FF.staking.getUserStakedTokens  = getStakedIds;
  if (!window.getStakedTokens)          window.getStakedTokens          = getStakedTokens;

  console.log('[staking-adapter] ready', ADDR ? ADDR : '(using existing controller)');
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
