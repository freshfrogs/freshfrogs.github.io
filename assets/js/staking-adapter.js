// assets/js/staking-adapter.js
// FreshFrogs staking adapter wired to your ABI.
// Exposes both FF.staking and legacy globals used by owned-panel.js.

(function (FF, CFG) {
  'use strict';

  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;
  const RPC_URL   = CFG.RPC_URL || null;
  const DEBUG     = !!CFG.DEBUG;

  const CONTROLLER_ABI = (window.CONTROLLER_ABI || window.controller_abi || []);
  const COLLECTION_ABI = (window.COLLECTION_ABI || window.collection_abi || []); // optional; we polyfill ERC721 if needed

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
    return null; // web3 write path doesn’t use signer object
  }

  // Contracts (both stacks)
  function ctrlW3() {
    if (!haveWeb3()) throw new Error('Web3 not loaded');
    const w3 = new Web3(readProvider());
    return new w3.eth.Contract(CONTROLLER_ABI, CTRL_ADDR);
  }
  function ctrlEth(readOnly=false) {
    if (!haveEthers()) throw new Error('Ethers not loaded');
    const provider = window.ethereum && !readOnly
      ? new ethers.providers.Web3Provider(window.ethereum)
      : new ethers.providers.JsonRpcProvider(RPC_URL || window.ethereum);
    return new ethers.Contract(CTRL_ADDR, CONTROLLER_ABI, provider);
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

  // Utils
  async function getAddress() {
    try { if (FF.wallet?.getAddress) { const a=await FF.wallet.getAddress(); if (a) return a; } } catch(_){}
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

  // ---- Reads (exact to your ABI) ----
  async function getStakedTokens(owner) {
    owner = owner || await getAddress();
    if (!owner) return [];
    if (haveWeb3())  { try { const arr = await ctrlW3().methods.getStakedTokens(owner).call(); const out=toNumArr(arr); if(DEBUG) console.log('[FF] staked IDs (web3):', out); return out; } catch(e){ if(DEBUG) console.warn('[FF] web3 getStakedTokens failed', e); } }
    if (haveEthers()){ try { const arr = await ctrlEth(true).getStakedTokens(owner); const out=toNumArr(arr); if(DEBUG) console.log('[FF] staked IDs (ethers):', out); return out; } catch(e){ if(DEBUG) console.warn('[FF] ethers getStakedTokens failed', e); } }
    return [];
  }
  async function getAvailableRewards(owner) {
    owner = owner || await getAddress();
    if (!owner) return '0';
    if (haveWeb3())  { try { return await ctrlW3().methods.availableRewards(owner).call(); } catch(_){ } }
    if (haveEthers()){ try { return await ctrlEth(true).availableRewards(owner); } catch(_){ } }
    return '0';
  }
  async function getStakeSince(){ return null; } // not in your ABI

  // ---- Approvals (defensive) ----
  async function isApproved(address) {
    const owner = address || await getAddress();
    if (!owner) return false;
    if (haveWeb3())  { try { const n=nftW3(); if (!n?.methods?.isApprovedForAll) return false; return !!(await n.methods.isApprovedForAll(owner, CTRL_ADDR).call({from:owner})); } catch(e){ if(DEBUG) console.warn('[FF] isApproved(web3)', e); return false; } }
    if (haveEthers()){ try { return !!(await nftEth(true).isApprovedForAll(owner, CTRL_ADDR)); } catch(e){ if(DEBUG) console.warn('[FF] isApproved(ethers)', e); return false; } }
    return false;
  }
  async function approveIfNeeded() {
    // Unconditional setApprovalForAll; cheap no-op if already approved
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); return nftW3().methods.setApprovalForAll(CTRL_ADDR,true).send({ from }); }
    if (haveEthers()){ const s=writeSigner(); const tx=await nftEth(false).connect(s).setApprovalForAll(CTRL_ADDR,true); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ---- Writes (exact to your ABI) ----
  async function stakeToken(tokenId) {
    const id=String(tokenId);
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); await approveIfNeeded(); return ctrlW3().methods.stake(id).send({ from }); }
    if (haveEthers()){ const s=writeSigner(); await approveIfNeeded(); const tx=await ctrlEth(false).connect(s).stake(id); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }
  async function stakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await stakeToken(id)); return out; }

  async function unstakeToken(tokenId) {
    const id=String(tokenId);
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); return ctrlW3().methods.withdraw(id).send({ from }); }
    if (haveEthers()){ const s=writeSigner(); const tx=await ctrlEth(false).connect(s).withdraw(id); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }
  async function unstakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await unstakeToken(id)); return out; }

  async function claimRewards() {
    if (haveWeb3())  { const from=(window.ethereum && window.ethereum.selectedAddress); if(!from) throw new Error('Connect wallet'); return ctrlW3().methods.claimRewards().send({ from }); }
    if (haveEthers()){ const s=writeSigner(); const tx=await ctrlEth(false).connect(s).claimRewards(); return tx.wait?.() ?? tx; }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ---- API + legacy shims ----
  const api = {
    isApproved, approveIfNeeded,
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    getStakedTokens, getUserStakedTokens: getStakedTokens,
    getAvailableRewards, claimRewards,
    getStakeSince
  };
  FF.staking = api;
  window.FF_STAKING = api;

  // Legacy globals so owned-panel.js can call them if it prefers window.*
  window.getStakedTokens      = api.getStakedTokens;
  window.getAvailableRewards  = api.getAvailableRewards;
  window.claimRewards         = api.claimRewards;
  window.approveIfNeeded      = api.approveIfNeeded;

  (async ()=> {
    try {
      const a = await getAddress();
      if (DEBUG) console.log('[FF] staking-adapter ready', { address: a, controller: CTRL_ADDR, collection: COLL_ADDR });
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail:{ address:a, controller:CTRL_ADDR, collection:COLL_ADDR } }));
    } catch(_){}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
