// assets/js/staking-adapter.js
(function(FF, CFG){
  'use strict';
  const C = window.FF_CFG || CFG || {};
  const Web3 = window.Web3;

  if (!Web3) { console.warn('[staking] Web3 missing'); return; }

  const provider = window.ethereum || (C.RPC_URL ? new Web3.providers.HttpProvider(C.RPC_URL) : null);
  const web3 = new Web3(provider);
  const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);
  const erc721 = new web3.eth.Contract([
    {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
  ], C.COLLECTION_ADDRESS);

  async function connect(){
    let addr=null;
    if (window.ethereum?.request){
      const acc = await window.ethereum.request({ method:'eth_requestAccounts' });
      addr = acc?.[0] || null;
    }
    return { web3, controller, erc721, address: addr };
  }

  async function isApproved(addr){
    try{ return await erc721.methods.isApprovedForAll(addr, C.CONTROLLER_ADDRESS).call({from:addr}); }
    catch{ return false; }
  }
  async function approve(addr){
    const gas = await erc721.methods.setApprovalForAll(C.CONTROLLER_ADDRESS, true).estimateGas({ from:addr });
    return erc721.methods.setApprovalForAll(C.CONTROLLER_ADDRESS, true).send({ from: addr, gas });
  }

  async function getStakedIds(addr){
    const arr = await controller.methods.getStakedTokens(addr).call();
    return (arr||[]).map(x=> Number(x.tokenId)).filter(Number.isFinite);
  }
  async function availableRewards(addr){
    const raw = await controller.methods.availableRewards(addr).call();
    const pretty = (Number(raw)/1e18).toFixed(3) + ' ' + (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
    return { raw, pretty };
  }

  async function stake(addr, id){
    const gas = await controller.methods.stake(id).estimateGas({ from: addr });
    return controller.methods.stake(id).send({ from: addr, gas });
  }
  async function unstake(addr, id){
    const gas = await controller.methods.withdraw(id).estimateGas({ from: addr });
    return controller.methods.withdraw(id).send({ from: addr, gas });
  }
  async function claim(addr){
    const gas = await controller.methods.claimRewards().estimateGas({ from: addr });
    return controller.methods.claimRewards().send({ from: addr, gas });
  }

  // compute "staked Xd ago": look at last Transfer to controller for this token
  async function stakedAgoDays(tokenId){
    try{
      const events = await erc721.getPastEvents('Transfer', {
        filter: { to: C.CONTROLLER_ADDRESS, tokenId },
        fromBlock: C.CONTROLLER_DEPLOY_BLOCK || 0, toBlock:'latest'
      });
      if (!events.length) return null;
      const last = events[events.length-1];
      const block = await web3.eth.getBlock(last.blockNumber);
      const days = Math.max(0, Math.floor( (Date.now()/1000 - Number(block.timestamp)) / 86400 ));
      return days;
    }catch{ return null; }
  }

  window.FF_STAKING = {
    connect, isApproved, approve,
    getStakedIds, availableRewards,
    stake, unstake, claim, stakedAgoDays
  };
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
