// assets/js/staking-adapter.js
// FreshFrogs staking adapter wired to your ABI (no guessing).
// Controller functions used: stake(uint256), withdraw(uint256), getStakedTokens(address),
// availableRewards(address), claimRewards()  (+ stakers(address) fallback for read-only stats).
// Works with Web3 OR Ethers. Load BEFORE owned-panel.js.

(function (FF, CFG) {
  'use strict';

  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;
  const RPC_URL   = CFG.RPC_URL || null;

  // ABIs from your uploaded files
  const CONTROLLER_ABI = (window.CONTROLLER_ABI || window.controller_abi || []);
  const COLLECTION_ABI = (window.COLLECTION_ABI || window.collection_abi || []); // optional; we polyfill ERC721 if missing

  // ---- env helpers ----
  const haveEthers = () => !!window.ethers;
  const haveWeb3   = () => !!window.Web3;

  function readProvider() {
    if (window.ethereum) return window.ethereum;
    if (RPC_URL && haveWeb3())  return new Web3.providers.HttpProvider(RPC_URL);
    if (RPC_URL && haveEthers()) return new ethers.providers.JsonRpcProvider(RPC_URL);
    throw new Error('[staking-adapter] No provider: connect wallet or set FF_CFG.RPC_URL');
  }

  function writeSigner() {
    if (!window.ethereum) throw new Error('Connect wallet');
    if (haveEthers()) return (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
    return null; // web3 writes don’t use a signer object
  }

  // ---- contracts (dual) ----
  function ctrlW3() {
    if (!haveWeb3()) throw new Error('Web3 not loaded');
    const w3 = new Web3(readProvider());
    return new w3.eth.Contract(CONTROLLER_ABI, CTRL_ADDR);
  }
  function nftW3() {
    if (!haveWeb3()) throw new Error('Web3 not loaded');
    const w3 = new Web3(readProvider());
    const abi = (COLLECTION_ABI && COLLECTION_ABI.length)
      ? COLLECTION_ABI
      : [
          {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
          {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ];
    return new w3.eth.Contract(abi, COLL_ADDR);
  }
  function ctrlEth(readOnly=false) {
    if (!haveEthers()) throw new Error('Ethers not loaded');
    const provider = window.ethereum && !readOnly
      ? new ethers.providers.Web3Provider(window.ethereum)
      : new ethers.providers.JsonRpcProvider(RPC_URL || window.ethereum);
    return new ethers.Contract(CTRL_ADDR, CONTROLLER_ABI, provider);
  }
  function nftEth(readOnly=false) {
    if (!haveEthers()) throw new Error('Ethers not loaded');
    const provider = window.ethereum && !readOnly
      ? new ethers.providers.Web3Provider(window.ethereum)
      : new ethers.providers.JsonRpcProvider(RPC_URL || window.ethereum);
    const abi = (COLLECTION_ABI && COLLECTION_ABI.length)
      ? COLLECTION_ABI
      : [
          "function isApprovedForAll(address,address) view returns (bool)",
          "function setApprovalForAll(address,bool)"
        ];
    return new ethers.Contract(COLL_ADDR, abi, provider);
  }

  // ---- utils ----
  async function getAddress() {
    try { if (FF.wallet?.getAddress) { const a = await FF.wallet.getAddress(); if (a) return a; } } catch(_){}
    try { if (window.ethereum?.request) { const a=await window.ethereum.request({method:'eth_accounts'}); return a?.[0]||null; } } catch(_){}
    return null;
  }
  const toNumArr = (arr) => (arr||[]).map(v=>{
    try{
      if (typeof v === 'number') return v;
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'string') return Number(/^0x/i.test(v) ? BigInt(v) : v);
    }catch(_){}
    return NaN;
  }).filter(Number.isFinite);

  // ---- reads (EXACT to your ABI) ----
  async function getStakedTokens(owner) {
    owner = owner || await getAddress();
    if (!owner) return [];

    // getStakedTokens(address _user) -> uint256[]
    if (haveWeb3()) {
      try { return toNumArr(await ctrlW3().methods.getStakedTokens(owner).call()); } catch(e){}
    }
    if (haveEthers()) {
      try { const r = await ctrlEth(true).getStakedTokens(owner); return toNumArr(r); } catch(e){}
    }

    // Fallback: stakers(address) struct (no IDs in your ABI, but kept for completeness)
    try {
      if (haveWeb3() && ctrlW3().methods.stakers) { await ctrlW3().methods.stakers(owner).call(); }
      else if (haveEthers() && ctrlEth(true).stakers) { await ctrlEth(true).stakers(owner); }
    } catch(_){}
    return [];
  }

  async function getAvailableRewards(owner) {
    owner = owner || await getAddress();
    if (!owner) return '0';
    if (haveWeb3())  { try { return await ctrlW3().methods.availableRewards(owner).call(); } catch(e){} }
    if (haveEthers()){ try { return await ctrlEth(true).availableRewards(owner); } catch(e){} }
    return '0';
  }

  // Optional: stake since (not in your ABI). Return null.
  async function getStakeSince(){ return null; }

  // ---- approvals (defensive) ----
  async function isApproved(address) {
    const owner = address || await getAddress();
    if (!owner) return false;
    if (haveWeb3())  { try { const n=nftW3(); if (!n?.methods?.isApprovedForAll) return false; return !!(await n.methods.isApprovedForAll(owner, CTRL_ADDR).call({from:owner})); } catch(e){ return false; } }
    if (haveEthers()){ try { return !!(await nftEth(true).isApprovedForAll(owner, CTRL_ADDR)); } catch(e){ return false; } }
    return false;
  }

  async function approveIfNeeded() {
    // We just call setApprovalForAll; on most ERC721s it’s a cheap no-op if already approved
    if (haveWeb3())  { const from = (window.ethereum && window.ethereum.selectedAddress); if (!from) throw new Error('Connect wallet'); return nftW3().methods.setApprovalForAll(CTRL_ADDR, true).send({ from }); }
    if (haveEthers()){ const s = writeSigner(); const tx = await nftEth(false).connect(s).setApprovalForAll(CTRL_ADDR, true); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ---- writes (EXACT to your ABI) ----
  async function stakeToken(tokenId) {
    const id = String(tokenId);
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); await approveIfNeeded(); return ctrlW3().methods.stake(id).send({ from }); }
    if (haveEthers()){ const s = writeSigner(); await approveIfNeeded(); const tx = await ctrlEth(false).connect(s).stake(id); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function stakeTokens(ids){
    // No batch in your ABI; loop single-stake
    const out=[]; for (const id of (ids||[])) out.push(await stakeToken(id)); return out;
  }

  async function unstakeToken(tokenId) {
    const id = String(tokenId);
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); return ctrlW3().methods.withdraw(id).send({ from }); }
    if (haveEthers()){ const s = writeSigner(); const tx = await ctrlEth(false).connect(s).withdraw(id); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function unstakeTokens(ids){
    const out=[]; for (const id of (ids||[])) out.push(await unstakeToken(id)); return out;
  }

  async function claimRewards() {
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); return ctrlW3().methods.claimRewards().send({ from }); }
    if (haveEthers()){ const s = writeSigner(); const tx = await ctrlEth(false).connect(s).claimRewards(); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ---- public API ----
  const api = {
    isApproved, approveIfNeeded,
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    getStakedTokens, getUserStakedTokens: getStakedTokens,
    getAvailableRewards, claimRewards,
    getStakeSince
  };

  FF.staking = api;
  window.FF_STAKING = api;

  // signal ready
  (async ()=> {
    try {
      const a = await getAddress();
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail:{ address:a, controller:CTRL_ADDR, collection:COLL_ADDR } }));
    } catch(_){}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
