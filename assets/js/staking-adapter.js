// assets/js/staking-adapter.js
// Controller adapter exposing getStakedTokens(user) + getStakedIds(user)

(function (FF, CFG) {
  const CONTROLLER = CFG.CONTROLLER_ADDRESS || CFG.STAKING_CONTROLLER || window.FF_CONTROLLER_ADDRESS;
  const ABI = window.FF_CONTROLLER_ABI || window.controller_abi || window.CONTROLLER_ABI;

  if (!CONTROLLER || !ABI) {
    console.warn('[staking-adapter] Missing controller address or ABI');
    return;
  }

  function getEthers(){ return window.ethers || null; }
  function ethersProvider(){
    const e=getEthers(); if(!e||!window.ethereum) return null;
    try{ if(e.BrowserProvider) return new e.BrowserProvider(window.ethereum); }catch{}
    try{ if(e.providers?.Web3Provider) return new e.providers.Web3Provider(window.ethereum); }catch{}
    return null;
  }
  async function ethersContract(readOnly=true){
    const e=getEthers(), p=ethersProvider(); if(!e||!p) return null;
    try{ // v6
      if (e.Contract && p.getSigner){
        const signer = readOnly ? null : await p.getSigner();
        return new e.Contract(CONTROLLER, ABI, signer || p);
      }
    }catch{}
    try{ // v5
      if (e.Contract && p.getSigner){
        const signer = readOnly ? p : p.getSigner();
        return new e.Contract(CONTROLLER, ABI, signer);
      }
    }catch{}
    return null;
  }
  function web3Contract(){
    const W = window.web3 || (window.Web3 ? new window.Web3(window.ethereum) : null);
    try{ return W ? new W.eth.Contract(ABI, CONTROLLER) : null; }catch{ return null; }
  }

  // Robust -> number
  function toNum(x){
    if (x==null) return NaN;
    if (typeof x==='number') return x;
    if (typeof x==='bigint') return Number(x);
    if (typeof x==='string') return Number(x);
    if (typeof x==='object'){
      // ethers.BigNumber v5 {_hex:"0x..."} or v6 {toString}
      if (typeof x.toString==='function' && x.toString!==Object.prototype.toString) return Number(x.toString());
      if ('_hex' in x) return Number(x._hex);
      if ('hex' in x) return Number(x.hex);
    }
    return NaN;
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    return rows.map(r=>{
      if (r==null) return NaN;
      if (Array.isArray(r)) return toNum(r[0]); // [tokenId, ...]
      if (typeof r==='string' || typeof r==='number' || typeof r==='bigint') return toNum(r);
      if (typeof r==='object'){
        const cand = r.tokenId ?? r.id ?? r.token_id ?? r.tokenID ?? r[0];
        return toNum(cand);
      }
      return NaN;
    }).filter(Number.isFinite);
  }

  async function getStakedTokens(userAddress){
    const ec = await ethersContract(true);
    if (ec?.getStakedTokens) return await ec.getStakedTokens(userAddress);
    const wc = web3Contract();
    if (wc?.methods?.getStakedTokens) return await wc.methods.getStakedTokens(userAddress).call();
    throw new Error('getStakedTokens() not found on controller');
  }
  async function getStakedIds(userAddress){
    return normalizeIds(await getStakedTokens(userAddress));
  }

  // Expose for the UI
  FF.staking = FF.staking || {};
  FF.staking.getStakedTokens = FF.staking.getStakedTokens || getStakedTokens;
  FF.staking.getUserStakedTokens = FF.staking.getUserStakedTokens || getStakedIds;
  window.getStakedTokens = window.getStakedTokens || getStakedTokens;

  console.log('[staking-adapter] ready at', CONTROLLER);
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
