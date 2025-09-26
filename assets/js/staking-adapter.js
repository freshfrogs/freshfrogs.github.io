/* global Web3, CONFIG */

// Lightweight staking adapter that works off the user's wallet provider.
// No RPC URL needed — we use window.ethereum / current provider.
(() => {
  const log = (...args) => console.log('[staking-adapter]', ...args);
  const warn = (...args) => console.warn('[staking-adapter]', ...args);
  const err = (...args) => console.error('[staking-adapter]', ...args);

  // ---- Config resolution ----------------------------------------------------
  function getCfg() {
    // Expected in CONFIG:
    // - NFT_ADDRESS
    // - NFT_ABI
    // - STAKING_CONTROLLER_ADDRESS
    // - STAKING_CONTROLLER_ABI
    const c = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
    const must = ['NFT_ADDRESS','NFT_ABI','STAKING_CONTROLLER_ADDRESS','STAKING_CONTROLLER_ABI'];
    for (const k of must) {
      if (!c[k]) {
        throw new Error(`Missing ${k} in CONFIG`);
      }
    }
    return c;
  }

  const web3 = new Web3(window.ethereum || Web3.givenProvider);

  // Safe method check for web3 contract instances
  const hasMethod = (contract, name) => {
    try {
      return !!(contract && contract.methods && contract.methods[name]);
    } catch {
      return false;
    }
  };

  // ---- Contracts ------------------------------------------------------------
  let nft, staking;

  function ensureContracts() {
    const CFG = getCfg();
    if (!nft) {
      nft = new web3.eth.Contract(CFG.NFT_ABI, CFG.NFT_ADDRESS);
    }
    if (!staking) {
      staking = new web3.eth.Contract(CFG.STAKING_CONTROLLER_ABI, CFG.STAKING_CONTROLLER_ADDRESS);
    }
  }

  // ---- Public API -----------------------------------------------------------

  // Get token IDs staked by an account
  async function getStakedTokens(account) {
    try {
      ensureContracts();

      // Support several common method names:
      // - tokensOf(address)          -> uint256[]
      // - getStakedTokens(address)   -> uint256[]
      // - stakedTokensOf(address)    -> uint256[]
      const candidates = ['tokensOf', 'getStakedTokens', 'stakedTokensOf'];
      for (const m of candidates) {
        if (hasMethod(staking, m)) {
          const ids = await staking.methods[m](account).call();
          // Ensure array of strings (web3 can return BN)
          return (ids || []).map(x => x.toString());
        }
      }

      // Some controllers keep per-token owner mappings and expose balanceOf(address)
      // plus tokenOfOwnerByIndex-like function
      if (hasMethod(staking, 'balanceOf') && hasMethod(staking, 'tokenOfOwnerByIndex')) {
        const bal = await staking.methods.balanceOf(account).call();
        const out = [];
        for (let i = 0; i < Number(bal); i++) {
          const id = await staking.methods.tokenOfOwnerByIndex(account, i).call();
          out.push(id.toString());
        }
        return out;
      }

      throw new Error('No supported staking read method was found on controller');
    } catch (e) {
      err('getStakedTokens Error:', e);
      return [];
    }
  }

  // Optional: per-token stake timestamp (for "xd ago")
  async function getStakeTimestamps(account) {
    try {
      ensureContracts();

      // Common patterns:
      // - stakeStarted(tokenId) -> uint256 timestamp
      // - stakes(tokenId) -> struct { owner, startedAt, ... }
      // - stakeInfo(tokenId) -> (startedAt, …) or struct
      const ids = await getStakedTokens(account);
      const map = {};

      // Helper to safely call and coerce to number
      const callTs = async (method, tokenId) => {
        try {
          const v = await staking.methods[method](tokenId).call();
          if (v && typeof v === 'object' && ('startedAt' in v)) {
            return Number(v.startedAt);
          }
          if (Array.isArray(v) && v.length > 0) {
            // first value often startedAt
            return Number(v[0]);
          }
          return Number(v);
        } catch {
          return 0;
        }
      };

      const hasStakeStarted = hasMethod(staking, 'stakeStarted');
      const hasStakes = hasMethod(staking, 'stakes');
      const hasStakeInfo = hasMethod(staking, 'stakeInfo');

      for (const id of ids) {
        let ts = 0;
        if (hasStakeStarted) ts ||= await callTs('stakeStarted', id);
        if (!ts && hasStakes) ts ||= await callTs('stakes', id);
        if (!ts && hasStakeInfo) ts ||= await callTs('stakeInfo', id);
        map[id] = ts; // 0 if unknown
      }
      return map;
    } catch (e) {
      warn('getStakeTimestamps Error:', e);
      return {};
    }
  }

  // Is controller approved to transfer user's tokens?
  async function isApprovedForAll(account) {
    try {
      ensureContracts();
      const CFG = getCfg();
      if (!hasMethod(nft, 'isApprovedForAll')) return false;
      return await nft.methods.isApprovedForAll(account, CFG.STAKING_CONTROLLER_ADDRESS).call();
    } catch (e) {
      err('isApproved', e);
      return false;
    }
  }

  // Available rewards (best-effort; returns string number, "0" if unsupported)
  async function getAvailableRewards(account) {
    try {
      ensureContracts();
      const candidates = ['availableRewards', 'rewards', 'pendingRewards', 'earned'];
      for (const m of candidates) {
        if (hasMethod(staking, m)) {
          const v = await staking.methods[m](account).call();
          return (typeof v === 'object' && v._hex) ? web3.utils.toBN(v._hex).toString() : v.toString();
        }
      }
      return '0';
    } catch (e) {
      err('rewards', e);
      return '0';
    }
  }

  // Total currently staked across the pond (for KPIs / pond panel)
  async function getTotalStaked() {
    try {
      ensureContracts();
      const candidates = [
        'totalStaked',
        'totalCurrentlyStaked',
        'stakedSupply',
        'totalSupplyStaked',
        'getTotalStaked'
      ];
      for (const m of candidates) {
        if (hasMethod(staking, m)) {
          const v = await staking.methods[m]().call();
          return Number(v);
        }
      }

      // Fallback: sum of staked by all? Not feasible without an indexer — return null.
      return null;
    } catch (e) {
      warn('total staked failed', e);
      return null;
    }
  }

  // Pure ERC721 balance (wallet-held only; staked not included)
  async function getWalletOwnedCount(account) {
    try {
      ensureContracts();
      if (!hasMethod(nft, 'balanceOf')) return 0;
      const v = await nft.methods.balanceOf(account).call();
      return Number(v);
    } catch {
      return 0;
    }
  }

  // Expose globally
  window.StakingAdapter = {
    getStakedTokens,
    getStakeTimestamps,
    isApprovedForAll,
    getAvailableRewards,
    getTotalStaked,
    getWalletOwnedCount,
    web3
  };

  log('ready');
})();
