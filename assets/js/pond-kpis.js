// assets/js/pond-kpis.js
// Updates the Pond KPIs: Total Frogs Staked, Controller link, Rewards symbol.
// NO UI changes. Safe if wallet not connected; uses wallet or optional RPC_URL.

(function (FF, CFG) {
  'use strict';

  const COLLECTION = CFG.COLLECTION_ADDRESS;
  const CONTROLLER = CFG.CONTROLLER_ADDRESS;
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  // Minimal ERC-721 ABI: balanceOf(address)
  const ERC721_MIN_ABI = [
    {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"}
  ];

  // Etherscan base by chain
  function etherscanBase() {
    if (CHAIN_ID === 1) return 'https://etherscan.io';
    if (CHAIN_ID === 11155111) return 'https://sepolia.etherscan.io';
    if (CHAIN_ID === 5) return 'https://goerli.etherscan.io';
    return 'https://etherscan.io';
  }

  function $(sel){ return document.querySelector(sel); }

  function getWeb3() {
    if (!window.Web3) throw new Error('Web3 library not loaded');
    const provider = window.ethereum || (CFG.RPC_URL ? new Web3.providers.HttpProvider(CFG.RPC_URL) : null);
    if (!provider) throw new Error('No provider (wallet or FF_CFG.RPC_URL)');
    return new Web3(provider);
  }

  async function fetchTotalStaked() {
    try {
      if (!COLLECTION || !CONTROLLER) throw new Error('Missing addresses');
      const web3 = getWeb3();
      const nft  = new web3.eth.Contract(ERC721_MIN_ABI, COLLECTION);
      const n    = await nft.methods.balanceOf(CONTROLLER).call();
      return Number(n) || 0;
    } catch (e) {
      console.warn('[pond-kpis] total staked failed', e);
      return null;
    }
  }

  function setControllerLink() {
    const el = $('#stakedController');
    if (!el || !CONTROLLER) return;
    el.textContent = CONTROLLER.slice(0, 6) + '…' + CONTROLLER.slice(-4);
    el.href = etherscanBase() + '/address/' + CONTROLLER;
  }

  function setRewardsSymbol() {
    const sym = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
    const el  = $('#pondRewardsSymbol');
    if (el) el.textContent = sym;
  }

  async function refreshPondKPIs() {
    setControllerLink();
    setRewardsSymbol();

    const el = $('#stakedTotal');
    if (!el) return;

    const val = await fetchTotalStaked();
    el.textContent = (val == null) ? '—' : String(val);
  }

  // Public init
  window.FF_initPondKPIs = function(){
    refreshPondKPIs();
    // Optional: refresh every 60s (comment out if not desired)
    // setInterval(refreshPondKPIs, 60000);
  };

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
