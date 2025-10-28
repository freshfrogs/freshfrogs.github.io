// assets/js/pond-kpis.js
// Pond KPIs (read-only): total staked, controller link, rewards symbol.

(function () {
  'use strict';
  const C = window.FF_CFG || {};

  // Write helpers
  const $ = (id) => document.getElementById(id);
  function setText(id, v){ const el = $(id); if (el) el.textContent = v; }
  function setHref(id, href, text){
    const el = $(id); if (!el) return;
    if (href) el.href = href;
    if (text) el.textContent = text;
  }

  // Rewards symbol
  setText('pondRewardsSymbol', C.REWARD_TOKEN_SYMBOL || '$FLYZ');

  // Controller link
  (function(){
    const a = (C.CONTROLLER_ADDRESS || '').trim();
    if (!a) return;
    const chainId = Number(C.CHAIN_ID || 1);
    const base = chainId === 1 ? 'https://etherscan.io/address/' :
                 chainId === 11155111 ? 'https://sepolia.etherscan.io/address/' :
                 'https://etherscan.io/address/';
    setHref('stakedController', base + a, a.slice(0,6) + '…' + a.slice(-4));
  })();

  // Total Frogs Staked = ERC-721 balanceOf(controller)
  (async function(){
    try{
      if (!window.Web3 || !C.COLLECTION_ADDRESS || !C.CONTROLLER_ADDRESS) return;
      const provider =
        window.ethereum ||
        (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : null);
      if (!provider) return;
      const web3 = new window.Web3(provider);
      const erc721 = new web3.eth.Contract([
        {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],
         "name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],
         "stateMutability":"view","type":"function"}
      ], C.COLLECTION_ADDRESS);
      const n = await erc721.methods.balanceOf(C.CONTROLLER_ADDRESS).call();
      setText('stakedTotal', String(n));
      // refresh timestamp for display if present
      const stamp = document.getElementById('stakedUpdated');
      if (stamp) stamp.textContent = new Date().toLocaleTimeString();
    }catch(e){
      console.warn('[pond-kpis] total staked failed', e);
    }
  })();
})();
