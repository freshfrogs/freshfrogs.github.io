(function () {
  'use strict';

  if (typeof window === 'undefined') {
    return;
  }

  if (typeof ethers === 'undefined') {
    console.error('[FreshFrogs] ethers.js is required before ethereum-dapp.js');
    return;
  }

  if (typeof COLLECTION_ABI === 'undefined' || typeof CONTROLLER_ABI === 'undefined') {
    console.error('[FreshFrogs] Missing contract ABIs. Ensure collection_abi.js and controller_abi.js are loaded first.');
    return;
  }

  const CONFIG = {
    apiKey: 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ',
    network: 'mainnet',
    collectionAddress: '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b',
    controllerAddress: '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199',
    metadataBaseUrl: 'https://freshfrogs.github.io/frog'
  };

  const rpcUrl = `https://eth-${CONFIG.network}.g.alchemy.com/v2/${CONFIG.apiKey}`;

  function createRpcProvider(url) {
    if (ethers.providers && typeof ethers.providers.JsonRpcProvider === 'function') {
      return new ethers.providers.JsonRpcProvider(url);
    }
    if (typeof ethers.JsonRpcProvider === 'function') {
      return new ethers.JsonRpcProvider(url);
    }
    throw new Error('No compatible JsonRpcProvider found in ethers.js');
  }

  const provider = createRpcProvider(rpcUrl);

  const contracts = {
    collection: new ethers.Contract(
      CONFIG.collectionAddress,
      typeof COLLECTION_ABI !== 'undefined' ? COLLECTION_ABI : [],
      provider
    ),
    controller: new ethers.Contract(
      CONFIG.controllerAddress,
      typeof CONTROLLER_ABI !== 'undefined' ? CONTROLLER_ABI : [],
      provider
    )
  };

  function hasBrowserWallet() {
    return typeof window.ethereum !== 'undefined';
  }

  async function getBrowserProvider() {
    if (!hasBrowserWallet()) {
      throw new Error('Browser wallet not available');
    }

    if (typeof ethers.BrowserProvider === 'function') {
      return new ethers.BrowserProvider(window.ethereum);
    }

    if (
      ethers.providers &&
      typeof ethers.providers.Web3Provider === 'function'
    ) {
      return new ethers.providers.Web3Provider(window.ethereum);
    }

    throw new Error('Unable to find a compatible browser provider in ethers.js');
  }

  async function getSigner() {
    const browserProvider = await getBrowserProvider();
    if (window.ethereum && typeof window.ethereum.request === 'function') {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    }
    return browserProvider.getSigner();
  }

  function formatUnits(value, decimals = 18) {
    if (ethers.utils && typeof ethers.utils.formatUnits === 'function') {
      return ethers.utils.formatUnits(value, decimals);
    }
    if (typeof ethers.formatUnits === 'function') {
      return ethers.formatUnits(value, decimals);
    }

    try {
      const bigValue =
        typeof value === 'bigint' ? value : BigInt(value.toString());
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = bigValue / divisor;
      const fraction = bigValue % divisor;
      if (fraction === 0n) {
        return whole.toString();
      }
      return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
    } catch (err) {
      console.warn('[FreshFrogs] Unable to format value', err);
      return '0';
    }
  }

  window.FreshFrogsEth = {
    rpcUrl,
    provider,
    config: CONFIG,
    contracts,
    hasBrowserWallet: hasBrowserWallet(),
    getBrowserProvider,
    getSigner,
    formatUnits
  };
})();
