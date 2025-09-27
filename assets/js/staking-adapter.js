// assets/js/staking-adapter.js
// Minimal adapter bound to your exact ABIs & wallet provider.
// Provides FF.staking + legacy globals for other modules.

(function (FF, CFG) {
  'use strict';

  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);

  function getWeb3(){ if (!window.Web3 || !window.ethereum) throw new Error('Wallet not found'); return new Web3(window.ethereum); }

  function resolveCollectionAbi(){
    if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI;
    return (window.COLLECTION_ABI || window.collection_abi || []);
  }
  function resolveControllerAbi(){
    if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI;
    return (window.CONTROLLER_ABI || window.controller_abi || []);
  }

  function nft(){ const w3 = getWeb3(); return new w3.eth.Contract(resolveCollectionAbi(), CFG.COLLECTION_ADDRESS); }
  function ctrl(){ const w3 = getWeb3(); return new w3.eth.Contract(resolveControllerAbi(), CFG.CONTROLLER_ADDRESS); }

  async function ensureCorrectChain(){
    const targetHex = '0x' + CHAIN_ID.toString(16);
    const curHex = await ethereum.request({ method:'eth_chainId' }).catch(()=>null);
    if (!curHex || curHex.toLowerCase() !== targetHex.toLowerCase()){
      await ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: targetHex }] }).catch(()=>{});
    }
  }
  async function addr(){ try{ const a = await ethereum.request({ method:'eth_accounts' }); return a?.[0]||null; }catch{ return null; } }

  const toNumArr = (rows)=> {
    if (!Array.isArray(rows)) return [];
    const pick = (x)=> {
      try{
        if (x==null) return NaN;
        if (typeof x==='number') return Number.isFinite(x)?x:NaN;
        if (typeof x==='bigint') return Number(x);
        if (typeof x==='string') return Number(/^0x/i.test(x) ? BigInt(x) : x);
        if (Array.isArray(x)) return pick(x[x.length-1]);
        if (typeof x==='object'){
          if (typeof x._hex==='string') return Number(BigInt(x._hex));
          if (typeof x.toString==='function'){ const s=x.toString(); if(/^0x/i.test(s)) return Number(BigInt(s)); if(/^\d+$/.test(s)) return Number(s); }
          return pick(x.tokenId ?? x.id ?? x.value ?? x[1] ?? x[0]);
        }
      }catch{}
      return NaN;
    };
    return rows.map(pick).filter(Number.isFinite);
  };

  // Reads
  async function getStakedTokens(owner){
    owner = owner || await addr(); if (!owner) return [];
    await ensureCorrectChain();
    const raw = await ctrl().methods.getStakedTokens(owner).call({ from: owner });
    return toNumArr(raw);
  }
  async function getAvailableRewards(owner){
    owner = owner || await addr(); if (!owner) return '0';
    await ensureCorrectChain();
    return await ctrl().methods.availableRewards(owner).call({ from: owner });
  }

  // Approvals (Collection)
  async function isApproved(owner){
    owner = owner || await addr(); if (!owner) return false;
    await ensureCorrectChain();
    try{ return !!(await nft().methods.isApprovedForAll(owner, CFG.CONTROLLER_ADDRESS).call({ from: owner })); }
    catch{ return false; }
  }
  async function approveIfNeeded(){
    const owner = await addr(); if (!owner) throw new Error('Connect wallet');
    await ensureCorrectChain();
    return nft().methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: owner });
  }

  // Writes (Controller)
  async function stakeToken(tokenId){
    const owner = await addr(); if (!owner) throw new Error('Connect wallet');
    await ensureCorrectChain();
    // caller should have ensured approval; we still attempt
    return ctrl().methods.stake(String(tokenId)).send({ from: owner });
  }
  async function unstakeToken(tokenId){
    const owner = await addr(); if (!owner) throw new Error('Connect wallet');
    await ensureCorrectChain();
    return ctrl().methods.withdraw(String(tokenId)).send({ from: owner });
  }
  async function stakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await stakeToken(id)); return out; }
  async function unstakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await unstakeToken(id)); return out; }
  async function claimRewards(){
    const owner = await addr(); if (!owner) throw new Error('Connect wallet');
    await ensureCorrectChain();
    return ctrl().methods.claimRewards().send({ from: owner });
  }

  const api = {
    isApproved, approveIfNeeded,
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    getStakedTokens, getUserStakedTokens: getStakedTokens,
    getAvailableRewards, claimRewards,
    getStakeSince: async ()=> null
  };

  FF.staking = api;
  window.FF_STAKING = api;

  // Legacy globals some modules probe:
  window.getStakedTokens     = api.getStakedTokens;
  window.getAvailableRewards = api.getAvailableRewards;
  window.claimRewards        = api.claimRewards;
  window.approveIfNeeded     = api.approveIfNeeded;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
