// assets/js/staking-adapter.js
// Provides FF.staking with controller + ERC721 helpers, using Web3.
// Flexible: detects method names across different controller ABIs.

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
    }catch(e){ /* some ERC721s don’t implement it; we still try setApproval */ }
    await ERC721.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
    return true;
  }

  // --- method discovery ---
  const M = {
    // staking
    stakeOne:  pickMethod(CTRL, ['stake','deposit','stakeToken']),
    stakeMany: pickMethod(CTRL, ['stakeMany','stakeTokens','depositMany','stakeBatch']),
    // unstaking
    unstakeOne:  pickMethod(CTRL, ['unstake','withdraw','withdrawToken']),
    unstakeMany: pickMethod(CTRL, ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']),
    // views
    getUserStaked: pickMethod(CTRL, ['getStakedTokens','tokensOf','getUserStakedTokens','stakedTokens']),
    rewardsView:   pickMethod(CTRL, ['availableRewards','getAvailableRewards','claimableRewards','rewards','getRewards']),
    // claim
    claim: pickMethod(CTRL, ['claimRewards','claim','harvest']),
    // since / info
    sinceOne: pickMethod(CTRL, ['stakeSince','stakedAt']),
    infoOne:  pickMethod(CTRL, ['getStakeInfo','stakeInfo'])
  };

  async function stakeToken(tokenId){
    const from = await getAddress();
    if (!from) throw new Error('No wallet');
    await ensureApproval(from);

    // prefer batch if available (gas-efficient for single too on some controllers)
    if (M.stakeMany) {
      return CTRL.methods[M.stakeMany]([String(tokenId)]).send({ from });
    }
    if (M.stakeOne) {
      // Some ABIs expect uint256, others expect (address,uint256). Try common ones.
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
    // fallback: loop one by one
    const out=[]; for (const id of arr){ out.push(await stakeToken(id)); } return out;
  }

  async function unstakeToken(tokenId){
    const from = await getAddress(); if (!from) throw new Error('No wallet');
    if (M.unstakeMany) return CTRL.methods[M.unstakeMany]([String(tokenId)]).send({ from });
    if (M.unstakeOne) {
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

  async function getUserStakedTokens(address){
    const addr = address || await getAddress();
    if (!addr) return [];
    if (!M.getUserStaked) return [];
    const res = await CTRL.methods[M.getUserStaked](addr).call();
    return Array.isArray(res) ? res.map(x => Number(x)) : [];
  }

  async function getAvailableRewards(address){
    const addr = address || await getAddress();
    if (!addr || !M.rewardsView) return null;
    try {
      const v = await CTRL.methods[M.rewardsView](addr).call();
      return v; // owned-panel will format (decimals) safely
    } catch(e){ console.warn('[staking-adapter] rewards', e); return null; }
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
    // Approvals
    isApproved, approveIfNeeded,
    // Stake/Unstake
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    // Views & actions
    getUserStakedTokens, getAvailableRewards, claimRewards,
    // Since
    getStakeSince
  });

  // Optional: event for other modules
  (async ()=> {
    try {
      const addr = await getAddress();
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail:{ address: addr, controller: CTRL_ADDR, collection: COLL_ADDR } }));
    } catch(_){}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
