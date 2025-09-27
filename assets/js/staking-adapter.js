// assets/js/staking-adapter.js
// FreshFrogs staking adapter — ABI-driven discovery for staked IDs.
// Finds the staked-IDs getter by SHAPE (address -> uint256[]) from CONTROLLER_ABI.
// Exact wires (no heuristics) for: stake(uint256), withdraw(uint256), availableRewards(address), claimRewards().
// Works with Web3 OR Ethers. Load BEFORE owned-panel.js.

(function (FF, CFG) {
  'use strict';

  const DEBUG = !!CFG.DEBUG; // set FF_CFG.DEBUG=true to see logs
  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;
  const RPC_URL   = CFG.RPC_URL || null;

  const CONTROLLER_ABI = (window.CONTROLLER_ABI || window.controller_abi || []);
  const COLLECTION_ABI = (window.COLLECTION_ABI || window.collection_abi || []); // optional for approvals

  if (!CTRL_ADDR || !COLL_ADDR) {
    console.warn('[staking-adapter] Missing CONTROLLER_ADDRESS or COLLECTION_ADDRESS in FF_CFG');
  }

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
    return null;
  }

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

  async function getAddress() {
    try { if (FF.wallet?.getAddress) { const a = await FF.wallet.getAddress(); if (a) return a; } } catch(_){}
    try { if (window.ethereum?.request) { const arr = await window.ethereum.request({ method:'eth_accounts' }); return arr?.[0] || null; } } catch(_){}
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

  // ------------ ABI SHAPE DISCOVERY ------------
  function pickStakedGetterFromAbi() {
    // Look for: function NAME(address) view returns (uint256[])
    const fns = CONTROLLER_ABI.filter(x => x?.type === 'function' && x.stateMutability === 'view');
    const candidates = fns.filter(fn => {
      const ins = fn.inputs || [];
      const outs = fn.outputs || [];
      const oneAddr = (ins.length === 1 && /address/i.test(ins[0]?.type || ''));
      const hasUintArray = outs.some(o => /\[\]$/.test(o?.type||'') && /uint/i.test(o.type));
      return oneAddr && hasUintArray;
    });
    // Prefer familiar names if multiple match
    const preferredOrder = ['getStakedTokens','stakedTokens','tokensOf','tokensOfOwner','stakedTokensOfOwner'];
    for (const name of preferredOrder) {
      const hit = candidates.find(c => c.name === name);
      if (hit) return hit.name;
    }
    // Otherwise first match by shape
    return candidates[0]?.name || null;
  }
  const STAKED_FN = pickStakedGetterFromAbi();
  if (DEBUG) console.log('[staking-adapter] staked getter via ABI:', STAKED_FN || '(none)');

  // ------------ READS ------------
  async function getStakedTokens(owner) {
    owner = owner || await getAddress();
    if (!owner) return [];
    if (!STAKED_FN) { if (DEBUG) console.warn('[staking-adapter] No (address)->uint[] view found'); return []; }

    if (haveWeb3()) {
      try {
        const res = await ctrlW3().methods[STAKED_FN](owner).call();
        const out = toNumArr(Array.isArray(res) ? res : (Array.isArray(res?.[0]) ? res[0] : []));
        if (DEBUG) console.log('[staking-adapter] staked (web3)', STAKED_FN, out.length);
        return out;
      } catch(e){ if (DEBUG) console.warn('[staking-adapter] web3 staked call failed', e); }
    }
    if (haveEthers()) {
      try {
        const c = ctrlEth(true);
        const res = await c[STAKED_FN](owner);
        const out = toNumArr(Array.isArray(res) ? res : (Array.isArray(res?.[0]) ? res[0] : []));
        if (DEBUG) console.log('[staking-adapter] staked (ethers)', STAKED_FN, out.length);
        return out;
      } catch(e){ if (DEBUG) console.warn('[staking-adapter] ethers staked call failed', e); }
    }
    return [];
  }

  async function getAvailableRewards(owner) {
    owner = owner || await getAddress();
    if (!owner) return '0';
    // Exact wire to your typical ABI names
    if (haveWeb3())  { try { return await ctrlW3().methods.availableRewards(owner).call(); } catch(_){} }
    if (haveEthers()){ try { return await ctrlEth(true).availableRewards(owner); } catch(_){} }
    return '0';
  }

  async function getStakeSince(){ return null; } // not exposed in your ABI; owned-panel has an events fallback

  // ------------ APPROVALS (defensive) ------------
  async function isApproved(address) {
    const owner = address || await getAddress();
    if (!owner) return false;
    // If isApprovedForAll is missing, just report false (we’ll set approval on stake)
    if (haveWeb3())  {
      try {
        const n = nftW3();
        if (!n?.methods?.isApprovedForAll) return false;
        return !!(await n.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner }));
      } catch(e){ if (DEBUG) console.warn('[staking-adapter] isApproved(web3)', e); return false; }
    }
    if (haveEthers()){
      try { return !!(await nftEth(true).isApprovedForAll(owner, CTRL_ADDR)); }
      catch(e){ if (DEBUG) console.warn('[staking-adapter] isApproved(ethers)', e); return false; }
    }
    return false;
  }

  async function approveIfNeeded() {
    // Call setApprovalForAll unconditionally; cheap no-op if already approved
    if (haveWeb3())  {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return nftW3().methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
    }
    if (haveEthers()){
      const s = writeSigner();
      const tx = await nftEth(false).connect(s).setApprovalForAll(CTRL_ADDR, true);
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ------------ WRITES (exact common names) ------------
  async function stakeToken(tokenId) {
    const id = String(tokenId);
    if (haveWeb3())  {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      await approveIfNeeded();
      return ctrlW3().methods.stake(id).send({ from });
    }
    if (haveEthers()){
      const s = writeSigner(); await approveIfNeeded();
      const tx = await ctrlEth(false).connect(s).stake(id);
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }
  async function stakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await stakeToken(id)); return out; }

  async function unstakeToken(tokenId) {
    const id = String(tokenId);
    if (haveWeb3())  {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return ctrlW3().methods.withdraw(id).send({ from });
    }
    if (haveEthers()){
      const s = writeSigner();
      const tx = await ctrlEth(false).connect(s).withdraw(id);
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }
  async function unstakeTokens(ids){ const out=[]; for (const id of (ids||[])) out.push(await unstakeToken(id)); return out; }

  async function claimRewards() {
    if (haveWeb3())  {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return ctrlW3().methods.claimRewards().send({ from });
    }
    if (haveEthers()){
      const s = writeSigner();
      const tx = await ctrlEth(false).connect(s).claimRewards();
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ------------ Public API ------------
  const api = {
    isApproved, approveIfNeeded,
    stakeToken, stakeTokens, unstakeToken, unstakeTokens,
    getStakedTokens, getUserStakedTokens: getStakedTokens,
    getAvailableRewards, claimRewards,
    getStakeSince
  };

  FF.staking = api;
  window.FF_STAKING = api;

  (async ()=> {
    try {
      const a = await getAddress();
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail:{ address:a, controller:CTRL_ADDR, collection:COLL_ADDR, stakedGetter:STAKED_FN } }));
    } catch(_){}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
