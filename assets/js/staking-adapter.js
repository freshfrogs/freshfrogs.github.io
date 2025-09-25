// assets/js/staking-adapter.js
// Robust bridge to your staking controller.
// - Uses existing `window.controller` if present (web3 Contract with .methods).
// - Else tries ethers/web3 from (FF_CFG.CONTROLLER_ADDRESS, FF_CONTROLLER_ADDRESS) + ABI.
// - Normalizes staked token IDs from ANY shape.
// - Exposes:
//     FF.staking.getStakedTokens(address)      -> raw result from contract
//     FF.staking.getUserStakedTokens(address)  -> [numeric tokenIds]
// - Config overrides (optional via FF_CFG):
//     STAKED_METHOD: name of method on contract to fetch staked tokens (default "getStakedTokens")

(function (FF, CFG) {
  'use strict';

  const A = CFG || window.FF_CFG || {};
  const ADDR = A.CONTROLLER_ADDRESS || A.STAKING_CONTROLLER || window.FF_CONTROLLER_ADDRESS;
  const ABI  = window.FF_CONTROLLER_ABI || window.controller_abi || window.CONTROLLER_ABI;
  const STAKED_METHOD = A.STAKED_METHOD || 'getStakedTokens';

  function existingController() {
    const c = window.controller;
    return (c && c.methods) ? c : null;
  }

  function getEthers(){ return window.ethers || null; }
  function ethersProvider(){
    const e=getEthers(); if (!e || !window.ethereum) return null;
    try { if (e.BrowserProvider) return new e.BrowserProvider(window.ethereum); } catch {}
    try { if (e.providers?.Web3Provider) return new e.providers.Web3Provider(window.ethereum); } catch {}
    return null;
  }
  async function ethersContract(readOnly=true){
    const e=getEthers(), p=ethersProvider(); if(!e||!p||!ABI||!ADDR) return null;
    try { const signer = readOnly ? null : await p.getSigner(); return new e.Contract(ADDR, ABI, signer || p); } catch {}
    return null;
  }
  function web3Contract(){
    if (!ABI || !ADDR) return null;
    const W = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
    try{ return W ? new W.eth.Contract(ABI, ADDR) : null; }catch{ return null; }
  }

  // Deep tokenId extractor (handles tuples, arrays, objects, BN/hex/strings)
  function toNum(x){
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); const n=Number(x); return Number.isFinite(n)?n:NaN; }
      if (typeof x==='object'){
        // BN-like
        if (typeof x.toString==='function' && x.toString!==Object.prototype.toString){
          const s=x.toString(); if (/^\d+$/.test(s)) return Number(s);
        }
        if ('_hex' in x) return Number(x._hex);
        if ('hex'  in x) return Number(x.hex);
      }
    }catch{}
    return NaN;
  }
  function extractId(any){
    // direct numberish
    const n = toNum(any); if (Number.isFinite(n)) return n;

    // common object keys
    if (any && typeof any==='object'){
      const keys = ['tokenId','id','token_id','tokenID','value','_value','0'];
      for (const k of keys){ if (k in any){ const v=toNum(any[k]); if (Number.isFinite(v)) return v; } }
      // array-like objects
      if (Array.isArray(any)){ for (const it of any){ const v=toNum(it); if (Number.isFinite(v)) return v; } }
      // nested objects
      for (const k in any){ if (!Object.prototype.hasOwnProperty.call(any,k)) continue;
        const v = extractId(any[k]); if (Number.isFinite(v)) return v;
      }
    }
    return NaN;
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) {
      // Some contracts return { tokenIds: [] }
      if (rows && typeof rows==='object' && Array.isArray(rows.tokenIds)) return normalizeIds(rows.tokenIds);
      return [];
    }
    const out=[];
    for (const r of rows){
      const v = extractId(r);
      if (Number.isFinite(v)) out.push(v);
    }
    return out;
  }

  async function callStaked(controller, user){
    // try the configured method first
    if (controller?.methods?.[STAKED_METHOD]) {
      return controller.methods[STAKED_METHOD](user).call();
    }
    // common alternates
    const alts = ['getUserStakedTokens','stakedTokenIds','stakedIds','tokensOfStaker','tokensStakedBy'];
    for (const name of alts){
      if (controller?.methods?.[name]) return controller.methods[name](user).call();
    }
    throw new Error('No staked-tokens method found on controller');
  }

  async function getStakedTokens(user){
    // 1) Use existing controller if present
    const ex = existingController();
    if (ex) { console.log('[adapter] using existing controller'); return callStaked(ex, user); }

    // 2) ethers
    const ec = await ethersContract(true);
    if (ec) {
      console.log('[adapter] using ethers contract');
      // ethers methods are direct funcs (no .methods)
      if (typeof ec[STAKED_METHOD]==='function') return ec[STAKED_METHOD](user);
      for (const name of ['getUserStakedTokens','stakedTokenIds','stakedIds','tokensOfStaker','tokensStakedBy']){
        if (typeof ec[name]==='function') return ec[name](user);
      }
    }

    // 3) web3 constructed
    const wc = web3Contract();
    if (wc) { console.log('[adapter] using web3 contract'); return callStaked(wc, user); }

    throw new Error('Controller not available (no controller, no ABI+address, or no provider).');
  }

  async function getStakedIds(user){
    const raw = await getStakedTokens(user);
    const ids = normalizeIds(raw);
    console.log('[adapter] staked IDs →', ids.length, ids.slice(0, 12));
    return ids;
  }

  // Expose
  FF.staking = FF.staking || {};
  if (!FF.staking.getStakedTokens)      FF.staking.getStakedTokens      = getStakedTokens;
  if (!FF.staking.getUserStakedTokens)  FF.staking.getUserStakedTokens  = getStakedIds;
  if (!window.getStakedTokens)          window.getStakedTokens          = getStakedTokens;

  console.log('[adapter] ready', { address: ADDR || '(existing controller)', method: STAKED_METHOD });
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
