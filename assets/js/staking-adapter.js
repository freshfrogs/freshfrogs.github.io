// assets/js/staking-adapter.js
// Uses wallet provider or FF_CFG.RPC_URL. Exposes both modern and legacy APIs
// so the Dashboard can always read staked frogs via controller.getStakedTokens.

(function (FF = (window.FF = window.FF || {}), CFG = (window.FF_CFG = window.FF_CFG || {})) {
  'use strict';

  const log  = (...a) => console.log('[staking-adapter]', ...a);
  const warn = (...a) => console.warn('[staking-adapter]', ...a);

  const CONTROLLER_ADDR = CFG.CONTROLLER_ADDRESS;
  const COLLECTION_ADDR = CFG.COLLECTION_ADDRESS;
  const CONTROLLER_ABI  = window.CONTROLLER_ABI || [];

  const ERC721_MIN_ABI  = [
    {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],"stateMutability":"view","type":"function"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"}
  ];

  function getWeb3() {
    if (!window.Web3) throw new Error('Web3 library not loaded');
    const provider = window.ethereum || (CFG.RPC_URL ? new Web3.providers.HttpProvider(CFG.RPC_URL) : null);
    if (!provider) throw new Error('No provider (wallet or FF_CFG.RPC_URL)');
    return new Web3(provider);
  }

  function ensureContracts() {
    if (!CONTROLLER_ADDR || !CONTROLLER_ABI.length) throw new Error('Missing controller address/ABI');
    if (!COLLECTION_ADDR) throw new Error('Missing collection address');
    const web3 = getWeb3();
    const controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDR);
    const erc721     = new web3.eth.Contract(ERC721_MIN_ABI, COLLECTION_ADDR);
    return { web3, controller, erc721 };
  }

  // ---- Reads ---------------------------------------------------------------

  async function getStakedTokens(userAddress) {
    try {
      const { controller } = ensureContracts();
      const rows = await controller.methods.getStakedTokens(userAddress).call();
      return (rows || []).map(r => Number(r.tokenId)).filter(Number.isFinite);
    } catch (e) {
      warn('getStakedTokens', e);
      return [];
    }
  }

  async function getAvailableRewards(userAddress) {
    try {
      const { controller } = ensureContracts();
      return await controller.methods.availableRewards(userAddress).call();
    } catch (e) {
      warn('availableRewards', e);
      return '0';
    }
  }

  async function isApproved(userAddress) {
    try {
      const { erc721 } = ensureContracts();
      return await erc721.methods.isApprovedForAll(userAddress, CONTROLLER_ADDR).call({ from: userAddress });
    } catch (e) {
      warn('isApproved', e);
      return false;
    }
  }

  async function getTotalStaked() {
    try {
      const { erc721 } = ensureContracts();
      const n = await erc721.methods.balanceOf(CONTROLLER_ADDR).call();
      return Number(n) || 0;
    } catch (e) {
      warn('total staked failed', e);
      return null;
    }
  }

  // infer stake timestamp via Transfer(to=controller, tokenId)
  async function getStakeSince(tokenId) {
    try {
      const { web3 } = ensureContracts();
      const erc721 = new web3.eth.Contract(ERC721_MIN_ABI, COLLECTION_ADDR);
      const evs = await erc721.getPastEvents('Transfer', {
        filter: { to: CONTROLLER_ADDR, tokenId: tokenId },
        fromBlock: 0, toBlock: 'latest'
      });
      if (!evs.length) return null;
      const last = evs[evs.length - 1];
      const b = await web3.eth.getBlock(last.blockNumber);
      return Number(b?.timestamp) || null; // seconds
    } catch (e) {
      warn('getStakeSince', e);
      return null;
    }
  }

  // Modern API
  window.StakingAdapter = {
    getStakedTokens,
    getAvailableRewards,
    isApprovedForAll: isApproved,
    getTotalStaked,
    getStakeSince
  };

  // Legacy shim
  const legacy = {
    getStakedTokens,
    getAvailableRewards,
    isApproved,
    getStakeSince,
    getRewards: getAvailableRewards,
    checkApproval: isApproved
  };
  window.FF_STAKING = legacy;
  FF.staking = legacy;

  log('ready');
})();
