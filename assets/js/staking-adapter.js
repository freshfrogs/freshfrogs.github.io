// assets/js/staking-adapter.js
// Minimal adapter that exposes the helpers expected by owned-panel.js.
// Reads via RPC or injected wallet; writes require window.ethereum + user account.

(function (FF, CFG) {
  'use strict';

  const C = CFG || {};
  const CTRL_ADDR = C.CONTROLLER_ADDRESS;
  const COLL_ADDR = C.COLLECTION_ADDRESS;

  if (!CTRL_ADDR || !window.CONTROLLER_ABI) {
    console.warn('[staking-adapter] Missing controller address or ABI');
    return; // keep page running; panel will just skip staked section
  }

  // ---- web3 helpers ---------------------------------------------------------
  function getProvider() {
    if (window.ethereum) return window.ethereum;
    if (window.Web3 && C.RPC_URL) return new window.Web3.providers.HttpProvider(C.RPC_URL);
    return null;
  }
  function getWeb3() {
    const p = getProvider();
    if (!window.Web3 || !p) throw new Error('Web3 provider not available');
    return new window.Web3(p);
  }
  function getAccount() {
    // For write ops; prefer cached wallet state if your site sets it
    if (FF.wallet?.address) return FF.wallet.address;
    return (window.ethereum && window.ethereum.selectedAddress) || null;
  }

  // ---- contracts ------------------------------------------------------------
  function controller(web3) {
    return new web3.eth.Contract(window.CONTROLLER_ABI || [], CTRL_ADDR);
  }
  function erc721(web3) {
    return new web3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
      {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
    ], COLL_ADDR);
  }

  // ---- normalization --------------------------------------------------------
  function toNumber(x) {
    try {
      if (x == null) return NaN;
      if (typeof x === 'number') return x;
      if (typeof x === 'bigint') return Number(x);
      if (typeof x === 'string') { if (/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if (typeof x === 'object') {
        if ('tokenId' in x) return toNumber(x.tokenId);
        if ('id' in x)      return toNumber(x.id);
        if ('_hex' in x)    return Number(x._hex);
        const s = x.toString?.(); if (s && /^\d+$/.test(s)) return Number(s);
      }
    } catch {}
    return NaN;
  }
  function normIds(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(toNumber).filter(Number.isFinite);
  }

  // ---- core reads expected by owned-panel.js --------------------------------
  async function getStakedTokens(owner) {
    const web3 = getWeb3();
    const ctrl = controller(web3);

    // Try common method names; return first non-empty result
    const candidates = [
      'getStakedTokens',
      'stakedTokensOf',
      'stakedOf',
      'depositsOf',
      'tokensOfOwner',
      'getUserTokens',
      'getUserStakedTokens'
    ];
    for (const m of candidates) {
      if (ctrl.methods[m]) {
        try {
          const out = await ctrl.methods[m](owner).call();
          const ids = normIds(out);
          if (ids.length) return ids;
        } catch {}
      }
    }
    // Nothing matched; return empty (panel will still show owned frogs)
    return [];
  }

  async function getStakeSince(tokenId) {
    const web3 = getWeb3();
    const ctrl = controller(web3);

    // Try common shapes that return "since" timestamp (sec or ms)
    const tryRead = async () => {
      if (ctrl.methods.getStakeSince) {
        try { return await ctrl.methods.getStakeSince(tokenId).call(); } catch {}
      }
      if (ctrl.methods.stakeSince) {
        try { return await ctrl.methods.stakeSince(tokenId).call(); } catch {}
      }
      if (ctrl.methods.getStakeInfo) {
        try {
          const info = await ctrl.methods.getStakeInfo(tokenId).call();
          return info?.since ?? info?.stakedAt ?? info?.timestamp ?? null;
        } catch {}
      }
      if (ctrl.methods.stakes) { // mapping(tokenId => { since })
        try {
          const info = await ctrl.methods.stakes(tokenId).call();
          return info?.since ?? info?.stakedAt ?? info?.timestamp ?? null;
        } catch {}
      }
      return null;
    };

    const v = await tryRead();
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Normalize to ms
    return n < 1e12 ? n * 1000 : n;
  }

  async function isApproved(owner) {
    const web3 = getWeb3();
    const nft = erc721(web3);
    try { return !!(await nft.methods.isApprovedForAll(owner, CTRL_ADDR).call({ from: owner })); }
    catch { return null; }
  }

  async function approve() {
    const web3 = getWeb3();
    const acct = getAccount();
    if (!acct) throw new Error('No connected account for approve()');
    const nft = erc721(web3);
    return nft.methods.setApprovalForAll(CTRL_ADDR, true).send({ from: acct });
  }

  async function getAvailableRewards(owner) {
    const web3 = getWeb3();
    const ctrl = controller(web3);
    // try common names
    const names = ['availableRewards', 'getAvailableRewards', 'claimableRewards', 'pendingRewards'];
    for (const n of names) {
      if (ctrl.methods[n]) {
        try { return await ctrl.methods[n](owner).call(); } catch {}
      }
    }
    return '0';
  }

  async function claimRewards() {
    const web3 = getWeb3();
    const acct = getAccount();
    if (!acct) throw new Error('No connected account for claim');
    const ctrl = controller(web3);
    const names = ['claimRewards', 'claim', 'harvest'];
    for (const n of names) {
      if (ctrl.methods[n]) {
        return ctrl.methods[n]().send({ from: acct });
      }
    }
    throw new Error('No claim method on controller');
  }

  // Optional stake/unstake helpers for your action buttons
  async function stakeToken(tokenId) {
    const web3 = getWeb3();
    const acct = getAccount();
    if (!acct) throw new Error('No connected account for stake');
    const ctrl = controller(web3);
    if (ctrl.methods.stake)        return ctrl.methods.stake(tokenId).send({ from: acct });
    if (ctrl.methods.stakeToken)   return ctrl.methods.stakeToken(tokenId).send({ from: acct });
    if (ctrl.methods.stakeTokens)  return ctrl.methods.stakeTokens([tokenId]).send({ from: acct });
    throw new Error('No stake method');
  }
  async function unstakeToken(tokenId) {
    const web3 = getWeb3();
    const acct = getAccount();
    if (!acct) throw new Error('No connected account for unstake');
    const ctrl = controller(web3);
    if (ctrl.methods.unstake)        return ctrl.methods.unstake(tokenId).send({ from: acct });
    if (ctrl.methods.unstakeToken)   return ctrl.methods.unstakeToken(tokenId).send({ from: acct });
    if (ctrl.methods.unstakeTokens)  return ctrl.methods.unstakeTokens([tokenId]).send({ from: acct });
    throw new Error('No unstake method');
  }

  // ---- export (both names your panel checks) --------------------------------
  FF.staking = {
    getStakedTokens,
    getUserStakedTokens: getStakedTokens, // alias
    getStakeSince,
    getStakeInfo: getStakeSince, // your panel can consume either
    isApproved,
    approve,
    getAvailableRewards,
    claimRewards,
    stakeToken,
    unstakeToken
  };
  window.FF_STAKING = FF.staking; // legacy alias

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
