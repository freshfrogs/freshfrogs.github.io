// assets/js/staking-adapter.js
// Uses CONTROLLER_ABI (assets/abi/controller_abi.js) + FF_CFG.{CONTROLLER_ADDRESS,COLLECTION_ADDRESS}.
// Works with either Web3 OR Ethers if present. Reads require wallet or FF_CFG.RPC_URL; writes need a wallet.

(function (FF, CFG) {
  'use strict';

  const CTRL = CFG.CONTROLLER_ADDRESS;
  const COLL = CFG.COLLECTION_ADDRESS;

  // Export API immediately so owned-panel.js can call it anytime.
  const api = {
    // READS
    async getStakedTokens(owner){ try { return await _getStakedTokens(owner); } catch (e){ console.warn('[staking-adapter] getStakedTokens', e); return []; } },
    async getUserStakedTokens(owner){ return api.getStakedTokens(owner); }, // alias
    async getAvailableRewards(owner){ try { return await _getAvailableRewards(owner); } catch(e){ console.warn('[staking-adapter] rewards', e); return '0'; } },
    async isApproved(owner){ try { return await _isApproved(owner); } catch(e){ console.warn('[staking-adapter] isApproved', e); return null; } },

    // ACTIONS
    async approve(){ return _approve(); },
    async claimRewards(){ return _claim(); },
    async stakeToken(id){ return _stake(id); },
    async unstakeToken(id){ return _withdraw(id); },

    // Not in this ABI
    async getStakeSince(){ return null; },
    async getStakeInfo(){ return null; }
  };
  FF.staking = api;
  window.FF_STAKING = api;

  // ---------- provider factories ----------
  function haveEthers(){ return !!window.ethers; }
  function haveWeb3(){ return !!window.Web3; }

  function readProvider(){
    if (window.ethereum) return window.ethereum; // wallet
    if (CFG.RPC_URL && haveWeb3()) return new Web3.providers.HttpProvider(CFG.RPC_URL); // web3 http
    if (CFG.RPC_URL && haveEthers()) return new ethers.providers.JsonRpcProvider(CFG.RPC_URL); // ethers http
    throw new Error('No provider: connect a wallet or set FF_CFG.RPC_URL');
  }

  // ---------- contract helpers (dual stack) ----------
  function ctrlW3(){
    if (!haveWeb3()) throw new Error('Web3 library not loaded');
    const w3 = new Web3(readProvider());
    return new w3.eth.Contract(window.CONTROLLER_ABI || [], CTRL);
  }
  function nftW3(){
    if (!haveWeb3()) throw new Error('Web3 library not loaded');
    const w3 = new Web3(readProvider());
    return new w3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ], COLL);
  }
  function ctrlEth(){
    if (!haveEthers()) throw new Error('Ethers library not loaded');
    const provider = window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : new ethers.providers.JsonRpcProvider(CFG.RPC_URL);
    return new ethers.Contract(CTRL, window.CONTROLLER_ABI || [], provider);
  }
  function signerEth(){
    if (!haveEthers() || !window.ethereum) throw new Error('No wallet for writes');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner();
  }
  function nftEth(){
    const s = signerEth();
    return new ethers.Contract(COLL, [
      "function isApprovedForAll(address owner,address operator) view returns (bool)",
      "function setApprovalForAll(address operator,bool approved)"
    ], s);
  }

  // ---------- utils ----------
  const toNum = (x)=> {
    try{
      if (x==null) return NaN;
      if (typeof x==='number') return x;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string') { if (/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x==='object') {
        if ('tokenId' in x) return toNum(x.tokenId);
        if ('id' in x)      return toNum(x.id);
        if ('_hex' in x)    return Number(x._hex);
        const s = x.toString?.(); if (s && /^\d+$/.test(s)) return Number(s);
      }
    }catch{}
    return NaN;
  };

  // ---------- READS ----------
  async function _getStakedTokens(owner){
    if (!CTRL || !window.CONTROLLER_ABI) throw new Error('Missing controller address/ABI');
    // Prefer Web3 if present; else Ethers
    if (haveWeb3()){
      const c = ctrlW3();
      const rows = await c.methods.getStakedTokens(owner).call();
      return Array.isArray(rows) ? rows.map(r => toNum(r && r.tokenId)).filter(Number.isFinite) : [];
    } else if (haveEthers()){
      const c = ctrlEth();
      const rows = await c.getStakedTokens(owner);
      return Array.isArray(rows) ? rows.map(r => toNum(r && r.tokenId)).filter(Number.isFinite) : [];
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _getAvailableRewards(owner){
    if (haveWeb3()){
      const c = ctrlW3();
      return await c.methods.availableRewards(owner).call();
    } else if (haveEthers()){
      const c = ctrlEth();
      const v = await c.availableRewards(owner);
      return v?.toString?.() ?? String(v);
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _isApproved(owner){
    if (haveWeb3()){
      const n = nftW3();
      return !!(await n.methods.isApprovedForAll(owner, CTRL).call({ from: owner }));
    } else if (haveEthers()){
      const provider = window.ethereum
        ? new ethers.providers.Web3Provider(window.ethereum)
        : new ethers.providers.JsonRpcProvider(CFG.RPC_URL);
      const c = new ethers.Contract(COLL, ["function isApprovedForAll(address,address) view returns (bool)"], provider);
      return !!(await c.isApprovedForAll(owner, CTRL));
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ---------- WRITES (wallet required) ----------
  async function _approve(){
    if (haveWeb3()){
      const n = nftW3();
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return n.methods.setApprovalForAll(CTRL, true).send({ from });
    } else if (haveEthers()){
      const n = nftEth();
      const tx = await n.setApprovalForAll(CTRL, true);
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _stake(id){
    if (haveWeb3()){
      const c = ctrlW3();
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return c.methods.stake(String(id)).send({ from });
    } else if (haveEthers()){
      const s = signerEth();
      const c = new ethers.Contract(CTRL, window.CONTROLLER_ABI || [], s);
      const tx = await c.stake(String(id)); return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _withdraw(id){
    if (haveWeb3()){
      const c = ctrlW3();
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return c.methods.withdraw(String(id)).send({ from });
    } else if (haveEthers()){
      const s = signerEth();
      const c = new ethers.Contract(CTRL, window.CONTROLLER_ABI || [], s);
      const tx = await c.withdraw(String(id)); return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _claim(){
    if (haveWeb3()){
      const c = ctrlW3();
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      return c.methods.claimRewards().send({ from });
    } else if (haveEthers()){
      const s = signerEth();
      const c = new ethers.Contract(CTRL, window.CONTROLLER_ABI || [], s);
      const tx = await c.claimRewards(); return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
