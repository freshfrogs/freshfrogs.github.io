// assets/js/staking-adapter.js
// FreshFrogs staking adapter — robust reads + writes for varied controller ABIs.
// Exposes: FF.staking (isApproved, approveIfNeeded, stakeToken(s), unstakeToken(s),
//           getUserStakedTokens/getStakedTokens, getAvailableRewards, claimRewards, getStakeSince)
// Works with Web3 OR Ethers. Reads can use RPC_URL without wallet; writes need wallet.
// Load this BEFORE owned-panel.js.

(function (FF, CFG) {
  'use strict';

  // ----- Config / ABIs -----
  const CTRL_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLL_ADDR = CFG.COLLECTION_ADDRESS;
  const CONTROLLER_ABI = (window.CONTROLLER_ABI || window.controller_abi || []);
  const COLLECTION_ABI = (window.COLLECTION_ABI || window.collection_abi || []); // optional; we polyfill ERC721 if missing
  const RPC_URL = CFG.RPC_URL || null;

  if (!CTRL_ADDR || !COLL_ADDR) {
    console.warn('[staking-adapter] Missing CONTROLLER_ADDRESS or COLLECTION_ADDRESS in FF_CFG');
  }

  // ----- Env helpers -----
  const haveEthers = () => !!window.ethers;
  const haveWeb3   = () => !!window.Web3;

  function getReadProvider() {
    if (window.ethereum) return window.ethereum; // wallet (read ok)
    if (RPC_URL && haveWeb3())  return new Web3.providers.HttpProvider(RPC_URL);
    if (RPC_URL && haveEthers()) return new ethers.providers.JsonRpcProvider(RPC_URL);
    throw new Error('[staking-adapter] No provider: connect a wallet or set FF_CFG.RPC_URL');
  }

  function getWriteSigner() {
    if (!window.ethereum) throw new Error('Connect wallet');
    if (haveEthers()) return (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
    // Web3 write doesn't need signer object
    return null;
  }

  // ----- Contract factories (dual-stack) -----
  function ctrlW3() {
    if (!haveWeb3()) throw new Error('Web3 not loaded');
    const w3 = new Web3(getReadProvider());
    return new w3.eth.Contract(CONTROLLER_ABI, CTRL_ADDR);
  }
  function nftW3() {
    if (!haveWeb3()) throw new Error('Web3 not loaded');
    const w3 = new Web3(getReadProvider());
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

  // ----- Address helper -----
  async function getAddress() {
    try {
      if (FF.wallet?.getAddress) {
        const a = await FF.wallet.getAddress();
        if (a) return a;
      }
    } catch(_) {}
    try {
      if (window.ethereum?.request) {
        const acc = await window.ethereum.request({ method: 'eth_accounts' });
        return acc?.[0] || null;
      }
    } catch(_) {}
    return null;
  }

  // ----- Generic utils -----
  const toNumArr = (arr) => (arr || []).map(v => {
    try {
      if (typeof v === 'number') return v;
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'string') return Number(/^0x/i.test(v) ? BigInt(v) : v);
    } catch(_) {}
    return NaN;
  }).filter(Number.isFinite);

  function hasW3Method(c, name) { return !!(c && c.methods && c.methods[name]); }
  function hasEthMethod(c, name) { return !!(c && typeof c[name] === 'function'); }

  // ----- Reads: staked tokens (robust) -----
  async function _getStakedTokens(owner) {
    owner = owner || await getAddress();
    if (!owner) return [];

    // Preferred explicit list getters
    const candidates = ['getStakedTokens', 'tokensOf', 'getUserStakedTokens', 'stakedTokens'];
    // Fallback struct getter
    const structGetter = 'stakers';

    // Try Web3 first if present (any read provider is fine)
    if (haveWeb3()) {
      const c = ctrlW3();
      for (const name of candidates) {
        if (!hasW3Method(c, name)) continue;
        try {
          const res = await c.methods[name](owner).call();
          const arr = Array.isArray(res) ? res : (Array.isArray(res?.[0]) ? res[0] : []);
          const out = toNumArr(arr);
          if (out.length) return out;
        } catch(_) {}
      }
      // Fallback: stakers(address) → scan any numeric arrays in tuple/object
      if (hasW3Method(c, structGetter)) {
        try {
          const rr = await c.methods[structGetter](owner).call();
          const found = [];
          for (const k of Object.keys(rr || {})) {
            if (Array.isArray(rr[k])) {
              const ids = toNumArr(rr[k]);
              if (ids.length) found.push(...ids);
            }
          }
          if (found.length) return found;
        } catch(e) { console.warn('[staking-adapter] stakers() fallback (web3)', e); }
      }
    }

    // Ethers path
    if (haveEthers()) {
      const c = ctrlEth(true); // read-only provider OK
      for (const name of candidates) {
        if (!hasEthMethod(c, name)) continue;
        try {
          const res = await c[name](owner);
          const arr = Array.isArray(res) ? res : (Array.isArray(res?.[0]) ? res[0] : []);
          const out = toNumArr(arr);
          if (out.length) return out;
        } catch(_) {}
      }
      if (hasEthMethod(c, structGetter)) {
        try {
          const rr = await c[structGetter](owner);
          const found = [];
          // Ethers returns arrays/objects; iterate values
          for (const v of Object.values(rr || {})) {
            if (Array.isArray(v)) {
              const ids = toNumArr(v);
              if (ids.length) found.push(...ids);
            }
          }
          if (found.length) return found;
        } catch(e) { console.warn('[staking-adapter] stakers() fallback (ethers)', e); }
      }
    }

    // Nothing found
    return [];
  }

  // ----- Reads: rewards -----
  async function _getAvailableRewards(owner) {
    owner = owner || await getAddress();
    if (!owner) return '0';

    const candidates = ['availableRewards','getAvailableRewards','claimableRewards','rewards','getRewards'];

    if (haveWeb3()) {
      const c = ctrlW3();
      for (const name of candidates) {
        if (!hasW3Method(c, name)) continue;
        try { return await c.methods[name](owner).call(); } catch(_) {}
      }
    }
    if (haveEthers()) {
      const c = ctrlEth(true);
      for (const name of candidates) {
        if (!hasEthMethod(c, name)) continue;
        try { return await c[name](owner); } catch(_) {}
      }
    }
    return '0';
  }

  // ----- Reads: since -----
  async function _getStakeSince(tokenId) {
    const candidates = ['stakeSince','stakedAt'];
    const infos = ['getStakeInfo','stakeInfo'];

    if (haveWeb3()) {
      const c = ctrlW3();
      for (const name of candidates) {
        if (!hasW3Method(c, name)) continue;
        try {
          const sec = Number(await c.methods[name](String(tokenId)).call());
          return sec > 1e12 ? sec : sec * 1000;
        } catch(_) {}
      }
      for (const name of infos) {
        if (!hasW3Method(c, name)) continue;
        try {
          const info = await c.methods[name](String(tokenId)).call();
          const sec = Number(info?.since || info?.stakedAt || info?.timestamp || 0);
          return sec > 1e12 ? sec : sec * 1000;
        } catch(_) {}
      }
    }
    if (haveEthers()) {
      const c = ctrlEth(true);
      for (const name of candidates) {
        if (!hasEthMethod(c, name)) continue;
        try {
          const sec = Number(await c[name](String(tokenId)));
          return sec > 1e12 ? sec : sec * 1000;
        } catch(_) {}
      }
      for (const name of infos) {
        if (!hasEthMethod(c, name)) continue;
        try {
          const info = await c[name](String(tokenId));
          const sec = Number(info?.since || info?.stakedAt || info?.timestamp || 0);
          return sec > 1e12 ? sec : sec * 1000;
        } catch(_) {}
      }
    }
    return null;
  }

  // ----- Approval (defensive) -----
  async function _isApproved(owner) {
    owner = owner || await getAddress();
    if (!owner) return false;

    if (haveWeb3()) {
      try {
        const n = nftW3();
        if (!n?.methods?.isApprovedForAll) return false;
        return !!(await n.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner }));
      } catch(e) { console.warn('[staking-adapter] isApproved(web3)', e); return false; }
    }
    if (haveEthers()) {
      try {
        const n = nftEth(true);
        return !!(await n.isApprovedForAll(owner, CTRL_ADDR));
      } catch(e) { console.warn('[staking-adapter] isApproved(ethers)', e); return false; }
    }
    return false;
  }

  async function _approve() {
    // We deliberately call setApprovalForAll; on many ERC721s it’s a cheap no-op if already approved.
    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const n = nftW3();
      return n.methods.setApprovalForAll(CTRL_ADDR, true).send({ from });
    }
    if (haveEthers()) {
      const signer = getWriteSigner();
      const n = nftEth(false).connect(signer);
      const tx = await n.setApprovalForAll(CTRL_ADDR, true);
      return tx.wait?.() ?? tx;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ----- Writes: stake/unstake/claim -----
  async function _stakeOne(id) {
    id = String(id);
    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const c = ctrlW3();
      // Try batch first (many controllers accept single-item arrays)
      if (hasW3Method(c, 'stakeMany') || hasW3Method(c, 'stakeTokens') || hasW3Method(c,'depositMany') || hasW3Method(c,'stakeBatch')) {
        const name = hasW3Method(c,'stakeMany') ? 'stakeMany'
          : hasW3Method(c,'stakeTokens') ? 'stakeTokens'
          : hasW3Method(c,'depositMany') ? 'depositMany'
          : 'stakeBatch';
        return c.methods[name]([id]).send({ from });
      }
      // Single
      for (const nm of ['stake','deposit','stakeToken']) {
        if (!hasW3Method(c, nm)) continue;
        try { return c.methods[nm](id).send({ from }); } catch(_) {}
        try { return c.methods[nm](from, id).send({ from }); } catch(_) {}
      }
      throw new Error('No stake method on controller');
    }
    if (haveEthers()) {
      const s = getWriteSigner();
      const c = ctrlEth(false).connect(s);
      if (hasEthMethod(c,'stakeMany') || hasEthMethod(c,'stakeTokens') || hasEthMethod(c,'depositMany') || hasEthMethod(c,'stakeBatch')) {
        const name = hasEthMethod(c,'stakeMany') ? 'stakeMany'
          : hasEthMethod(c,'stakeTokens') ? 'stakeTokens'
          : hasEthMethod(c,'depositMany') ? 'depositMany'
          : 'stakeBatch';
        const tx = await c[name]([id]); return tx.wait?.() ?? tx;
      }
      for (const nm of ['stake','deposit','stakeToken']) {
        if (!hasEthMethod(c, nm)) continue;
        try { const tx = await c[nm](id); return tx.wait?.() ?? tx; } catch(_) {}
        try { const tx = await c[nm](await s.getAddress(), id); return tx.wait?.() ?? tx; } catch(_) {}
      }
      throw new Error('No stake method on controller');
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _stakeMany(ids) {
    const arr = (ids||[]).map(String);
    if (arr.length === 1) return _stakeOne(arr[0]);

    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const c = ctrlW3();
      for (const nm of ['stakeMany','stakeTokens','depositMany','stakeBatch']) {
        if (!hasW3Method(c, nm)) continue;
        return c.methods[nm](arr).send({ from });
      }
      // fallback: loop
      const out=[]; for (const id of arr) out.push(await _stakeOne(id)); return out;
    }
    if (haveEthers()) {
      const s = getWriteSigner();
      const c = ctrlEth(false).connect(s);
      for (const nm of ['stakeMany','stakeTokens','depositMany','stakeBatch']) {
        if (!hasEthMethod(c, nm)) continue;
        const tx = await c[nm](arr); return tx.wait?.() ?? tx;
      }
      const out=[]; for (const id of arr) out.push(await _stakeOne(id)); return out;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _unstakeOne(id) {
    id = String(id);
    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const c = ctrlW3();
      for (const nm of ['unstake','withdraw','withdrawToken']) {
        if (!hasW3Method(c, nm)) continue;
        try { return c.methods[nm](id).send({ from }); } catch(_) {}
        try { return c.methods[nm](from, id).send({ from }); } catch(_) {}
      }
      // batch-unstake fallback with single id
      for (const nm of ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']) {
        if (!hasW3Method(c, nm)) continue;
        return c.methods[nm]([id]).send({ from });
      }
      throw new Error('No unstake/withdraw method on controller');
    }
    if (haveEthers()) {
      const s = getWriteSigner();
      const c = ctrlEth(false).connect(s);
      for (const nm of ['unstake','withdraw','withdrawToken']) {
        if (!hasEthMethod(c, nm)) continue;
        try { const tx = await c[nm](id); return tx.wait?.() ?? tx; } catch(_) {}
        try { const tx = await c[nm](await s.getAddress(), id); return tx.wait?.() ?? tx; } catch(_) {}
      }
      for (const nm of ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']) {
        if (!hasEthMethod(c, nm)) continue;
        const tx = await c[nm]([id]); return tx.wait?.() ?? tx;
      }
      throw new Error('No unstake/withdraw method on controller');
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _unstakeMany(ids) {
    const arr = (ids||[]).map(String);
    if (arr.length === 1) return _unstakeOne(arr[0]);

    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const c = ctrlW3();
      for (const nm of ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']) {
        if (!hasW3Method(c, nm)) continue;
        return c.methods[nm](arr).send({ from });
      }
      const out=[]; for (const id of arr) out.push(await _unstakeOne(id)); return out;
    }
    if (haveEthers()) {
      const s = getWriteSigner();
      const c = ctrlEth(false).connect(s);
      for (const nm of ['unstakeMany','withdrawMany','unstakeTokens','withdrawTokens','unstakeBatch']) {
        if (!hasEthMethod(c, nm)) continue;
        const tx = await c[nm](arr); return tx.wait?.() ?? tx;
      }
      const out=[]; for (const id of arr) out.push(await _unstakeOne(id)); return out;
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  async function _claim() {
    if (haveWeb3()) {
      const from = (window.ethereum && window.ethereum.selectedAddress);
      if (!from) throw new Error('Connect wallet');
      const c = ctrlW3();
      for (const nm of ['claimRewards','claim','harvest']) {
        if (!hasW3Method(c, nm)) continue;
        return c.methods[nm]().send({ from });
      }
      throw new Error('No claim method on controller');
    }
    if (haveEthers()) {
      const s = getWriteSigner();
      const c = ctrlEth(false).connect(s);
      for (const nm of ['claimRewards','claim','harvest']) {
        if (!hasEthMethod(c, nm)) continue;
        const tx = await c[nm](); return tx.wait?.() ?? tx;
      }
      throw new Error('No claim method on controller');
    }
    throw new Error('No Web3 or Ethers library loaded');
  }

  // ----- Public API -----
  const api = {
    // Approvals
    async isApproved(owner){ try { return await _isApproved(owner); } catch(e){ console.warn('[staking-adapter] isApproved', e); return false; } },
    async approveIfNeeded(){ return _approve(); },

    // Stake/Unstake
    async stakeToken(id){ return _stakeOne(id); },
    async stakeTokens(ids){ return _stakeMany(ids); },
    async unstakeToken(id){ return _unstakeOne(id); },
    async unstakeTokens(ids){ return _unstakeMany(ids); },

    // Views & actions
    async getStakedTokens(owner){ try { return await _getStakedTokens(owner); } catch(e){ console.warn('[staking-adapter] getStakedTokens', e); return []; } },
    async getUserStakedTokens(owner){ return api.getStakedTokens(owner); }, // alias
    async getAvailableRewards(owner){ try { return await _getAvailableRewards(owner); } catch(e){ console.warn('[staking-adapter] rewards', e); return '0'; } },
    async claimRewards(){ return _claim(); },

    // Since (ms) for a token, if ABI supports it
    async getStakeSince(tokenId){ try { return await _getStakeSince(tokenId); } catch(_){ return null; } }
  };

  // Expose
  FF.staking = api;
  window.FF_STAKING = api;

  // Signal ready (for any listeners)
  (async ()=> {
    try {
      const a = await getAddress();
      document.dispatchEvent(new CustomEvent('ff:staking:ready', { detail: { address: a, controller: CTRL_ADDR, collection: COLL_ADDR } }));
    } catch(_) {}
  })();

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
