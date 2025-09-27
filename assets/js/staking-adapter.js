// assets/js/staking-adapter.js
// Provides FF.staking with controller + ERC721 helpers, using Web3.
// Detects method names across different controller ABIs and falls back to stakers(address).

;(function(FF, CFG){
  'use strict';

  if (!window.Web3) { console.warn('[staking-adapter] Web3 missing'); return; }

  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);
  const COLL_ADDR  = CFG.COLLECTION_ADDRESS;
  const CTRL_ADDR  = CFG.CONTROLLER_ADDRESS;

  const COLLECTION_ABI = (window.COLLECTION_ABI || window.collection_abi || []);
  const CONTROLLER_ABI = (window.CONTROLLER_ABI || window.controller_abi || []);

  const provider = window.ethereum || null;
  const web3     = new Web3(provider || (CFG.RPC_URL ? new Web3.providers.HttpProvider(CFG.RPC_URL) : null));
  if (!web3) { console.warn('[staking-adapter] No provider'); return; }

  const ERC721 = COLL_ADDR ? new web3.eth.Contract(COLLECTION_ABI, COLL_ADDR) : null;
  const CTRL   = CTRL_ADDR ? new web3.eth.Contract(CONTROLLER_ABI, CTRL_ADDR) : null;

  // --- utils ---
  async function getAddress(){
    try{
      if (FF.wallet?.getAddress) return await FF.wallet.getAddress();
      if (provider?.request){
        const acc = await provider.request({ method: 'eth_requestAccounts' });
        return acc?.[0] || null;
      }
      const acc2 = await web3.eth.getAccounts();
      return acc2?.[0] || null;
    }catch(e){ console.warn('[staking-adapter] getAddress', e); return null; }
  }
  function pickMethod(contract, names){
    if (!contract?.methods) return null;
    for (const n of names) if (contract.methods[n]) return n;
    return null;
  }
  async function ensureApproval(from){
    if (!ERC721 || !from) throw new Error('ERC721 not ready');
    try{
      const ok = await ERC721.methods.isApprovedForAll(from, CTRL_ADDR).call();
      if (ok) return true;
    }catch(e){ /* some ERC721s throw; keep going to setApproval */ }
    await ERC721.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
    return true;
  }
  function toNums(arr){
    return (arr||[]).map(v => {
      try{
        if (typeof v === 'number') return v;
        if (typeof v === 'bigint') return Number(v);
        if (typeof v === 'string') return Number(/^0x/i.test(v) ? BigInt(v) : v);
      }catch(_){}
      return NaN;
    }).filter(Number.isFinite);
  }

  // --- method discovery ---
  const M = {
    // stake/unstake variants
    stakeOne:    pickMethod(CTRL, ['stake','deposit','stakeToken']),
    stakeMany:   pickMethod(CTRL, ['stakeMany','stakeTokens','depositMany','stakeBatch']),
    unstakeOne:  pickMethod(CTRL, ['unstake','withdraw','withdrawToken']),
    unstakeMany: pickMethod(CTRL, ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']),
    // views
    getUserStaked: pickMethod(CTRL, ['getStakedTokens','tokensOf','getUserStakedTokens','stakedTokens']),
    stakersView:   pickMethod(CTRL, ['stakers']), // struct fallback
    rewardsView:   pickMethod(CTRL, ['availableRewards','getAvailableRewards','claimableRewards','rewards','getRewards']),
    // claim
    claim: pickMethod(CTRL, ['claimRewards','claim','harvest']),
    // since/info
    sinceOne: pickMethod(CTRL, ['stakeSince','stakedAt']),
    infoOne:  pickMethod(CTRL, ['getStakeInfo','stakeInfo'])
  };

  // --- core actions ---
  async function stakeToken(tokenId){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    await ensureApproval(from);
    if (M.stakeMany) return CTRL.methods[M.stakeMany]([String(tokenId)]).send({ from });
    if (M.stakeOne){
      try { return CTRL.methods[M.stakeOne](String(tokenId)).send({ from }); }
      catch(_){ return CTRL.methods[M.stakeOne](from, String(tokenId)).send({ from }); }
    }
    throw new Error('No stake method on controller');
  }
  async function stakeTokens(ids){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    await ensureApproval(from);
    const arr = (ids||[]).map(String);
    if (M.stakeMany) return CTRL.methods[M.stakeMany](arr).send({ from });
    const out=[]; for (const id of arr){ out.push(await stakeToken(id)); } return out;
  }
  async function unstakeToken(tokenId){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    if (M.unstakeMany) return CTRL.methods[M.unstakeMany]([String(tokenId)]).send({ from });
    if (M.unstakeOne){
      try { return CTRL.methods[M.unstakeOne](String(tokenId)).send({ from }); }
      catch(_){ return CTRL.methods[M.unstakeOne](from, String(tokenId)).send({ from }); }
    }
    throw new Error('No unstake/withdraw method on controller');
  }
  async function unstakeTokens(ids){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    const arr = (ids||[]).map(String);
    if (M.unstakeMany) return CTRL.methods[M.unstakeMany](arr).send({ from });
    const out=[]; for (const id of arr){ out.push(await unstakeToken(id)); } return out;
  }

  // --- views ---
  async function getUserStakedTokens(address){
    const addr = address || await getAddress();
    if (!addr) return [];
    // Primary: explicit list function
    if (M.getUserStaked){
      try{
        const res = await CTRL.methods[M.getUserStaked](addr).call();
        return Array.isArray(res) ? toNums(res) : [];
      }catch(e){ console.warn('[staking-adapter] getUserStakedTokens primary failed', e); }
    }
    // Fallback: stakers(address) struct → find any array of uints in return tuple
    if (M.stakersView){
      try{
        const r = await CTRL.methods[M.stakersView](addr).call();
        // r can be an object with numeric keys "0","1",... and/or named fields.
        // Find any array that parses cleanly into numbers.
        for (const k of Object.keys(r)){
          const v = r[k];
          if (Array.isArray(v)){
            const ids = toNums(v);
            if (ids.length) return ids;
          }
        }
      }catch(e){ console.warn('[staking-adapter] stakers() fallback failed', e); }
    }
    return [];
  }

  async function getAvailableRewards(address){
    const addr = address || await getAddress();
    if (!addr || !M.rewardsView) return null;
    try { return await CTRL.methods[M.rewardsView](addr).call(); }
    catch(e){ console.warn('[staking-adapter] rewards', e); return null; }
  }

  async function claimRewards(){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    if (!M.claim) throw new Error('No claim method');
    return CTRL.methods[M.claim]().send({ from });
  }

  async function isApproved(address){
    const from = address || await getAddress(); if (!from) return false;
    try { return await ERC721.methods.isApprovedForAll(from, CTRL_ADDR).call(); }
    catch(e){ console.warn('[staking-adapter] isApproved', e); return false; }
  }

  async function approveIfNeeded(){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    return ensureApproval(from);
  }

  async function getStakeSince(tokenId){
    if (M.sinceOne) {
      const sec = await CTRL.methods[M.sinceOne](String(tokenId)).call();
      const n = Number(sec); return n>1e12 ? n : n*1000;
    }
    if (M.infoOne) {
      const info = await CTRL.methods[M.infoOne](String(tokenId)).call();
      const sec = Number(info?.since || info?.stakedAt || info?.timestamp || 0);
      return sec>1e12 ? sec : sec*1000;
    }
    return null;
  }

  // Expose adapter (without clobbering existing)
  FF.staking = Object.assign({}, FF.staking || {}, {
    isApproved, approveIfNeeded,
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    getUserStakedTokens, getAvailableRewards, claimRewards,
    getStakeSince
  });

  // Signal readiness
  (async ()=> {
    try {
      const addr = await getAddress();
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail:{ address: addr, controller: CTRL_ADDR, collection: COLL_ADDR } }));
    } catch(_){}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
