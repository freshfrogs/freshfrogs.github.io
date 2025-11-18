(function () {
  'use strict';

  const Eth = window.FreshFrogsEth;
  if (!Eth) {
    console.error('[FreshFrogs] ethereum helpers not initialised.');
    return;
  }

  const API_KEY = Eth.config.apiKey;
  const CONTRACT_ADDRESS = Eth.config.collectionAddress;
  const IMAGE_BASE = 'https://freshfrogs.github.io/frog';
  const METADATA_BASE = 'https://freshfrogs.github.io/frog/json';
  const WALLET_REGEX = /0x[a-fA-F0-9]{40}/;
  const RECENT_SALES_LIMIT = 16;
  const MAX_TRAITS = 4;

  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();
  let activeWalletRequest = null;

  document.addEventListener('DOMContentLoaded', () => {
    initWalletLookupForm();
    const page = document.body.dataset.page || 'home';
    if (page === 'wallet') {
      initWalletPage();
    } else {
      initHomePage();
    }
  });

  function initHomePage() {
    loadRecentSales();
  }

  function initWalletPage() {
    const walletFromUrl = detectWalletAddressInUrl();
    if (walletFromUrl) {
      setWalletInputValue(walletFromUrl);
      navigateToWallet(walletFromUrl);
      loadWalletFrogs(walletFromUrl);
    } else {
      updateWalletKpis({ pendingRewards: null, stakedCount: 0 });
    }
  }

  function initWalletLookupForm() {
    const form = document.getElementById('wallet-lookup-form');
    if (!form) {
      return;
    }

    const input = document.getElementById('wallet-address-input');
    const errorEl = document.getElementById('wallet-lookup-error');
    const useWalletButton = document.getElementById('wallet-use-metamask');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input) {
        return;
      }
      const normalized = checksumAddress(input.value.trim());
      if (!normalized) {
        showWalletError('Please enter a valid wallet address.', errorEl);
        return;
      }
      hideWalletError(errorEl);
      navigateToWallet(normalized);
      loadWalletFrogs(normalized);
    });

    if (useWalletButton) {
      if (!Eth.hasBrowserWallet) {
        useWalletButton.disabled = true;
        useWalletButton.textContent = 'Browser wallet unavailable';
      } else {
        useWalletButton.addEventListener('click', async () => {
          try {
            useWalletButton.disabled = true;
            useWalletButton.textContent = 'Connecting...';
            const signer = await Eth.getSigner();
            const address = await signer.getAddress();
            if (input) {
              input.value = address;
            }
            hideWalletError(errorEl);
            navigateToWallet(address);
            loadWalletFrogs(address);
          } catch (err) {
            console.error('[FreshFrogs] Unable to connect wallet', err);
            showWalletError('Unable to connect to your wallet.', errorEl);
          } finally {
            useWalletButton.disabled = false;
            useWalletButton.textContent = 'Use My Wallet';
          }
        });
      }
    }
  }

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');
    if (!container) {
      return;
    }

    setStatus(statusEl, 'Loading recent sales...');

    try {
      const sales = await fetchRecentSales(RECENT_SALES_LIMIT);
      if (!sales.length) {
        setStatus(statusEl, 'No recent sales found.');
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }
      container.innerHTML = '';

      for (const sale of sales) {
        const card = await buildSaleCard(sale);
        if (card) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error('[FreshFrogs] Unable to load recent sales', error);
      setStatus(statusEl, 'Unable to load recent sales.');
    }
  }

  async function loadWalletFrogs(walletAddress) {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');
    if (!container) {
      return;
    }

    const formattedOwner = formatOwnerAddress(walletAddress);
    setStatus(statusEl, `Loading frogs for ${formattedOwner}...`);
    container.innerHTML = '';

    const requestKey = walletAddress.toLowerCase();
    activeWalletRequest = requestKey;

    try {
      const [owned, staked, pendingRewards] = await Promise.all([
        fetchOwnedFrogs(walletAddress),
        fetchStakedFrogs(walletAddress),
        fetchPendingRewards(walletAddress)
      ]);

      if (activeWalletRequest !== requestKey) {
        return;
      }

      updateWalletKpis({ pendingRewards, stakedCount: staked.length });

      const frogs = mergeFrogLists(owned, staked);
      if (!frogs.length) {
        setStatus(statusEl, `No Fresh Frogs found for ${formattedOwner}.`);
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }

      for (const frog of frogs) {
        const card = await buildWalletCard(frog, walletAddress);
        if (card && activeWalletRequest === requestKey) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error('[FreshFrogs] Unable to load wallet frogs', walletAddress, error);
      setStatus(statusEl, 'Unable to load frogs for this wallet.');
      updateWalletKpis({ pendingRewards: null, stakedCount: 0 });
    }
  }

  async function fetchRecentSales(limit) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTSales`;
    const params = new URLSearchParams({
      contractAddress: CONTRACT_ADDRESS,
      order: 'desc',
      withMetadata: 'true',
      limit: String(limit)
    });

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Alchemy NFT sales request failed');
    }

    const payload = await response.json();
    const sales = payload.nftSales || [];
    return sales.slice(0, limit);
  }

  async function fetchOwnedFrogs(ownerAddress) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTsForOwner`;
    const frogs = [];
    let pageKey;

    do {
      const params = new URLSearchParams({
        owner: ownerAddress,
        'contractAddresses[]': CONTRACT_ADDRESS,
        withMetadata: 'true',
        pageSize: '100'
      });

      if (pageKey) {
        params.append('pageKey', pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Alchemy getNFTsForOwner request failed');
      }

      const payload = await response.json();
      const owned = payload.ownedNfts || payload.nfts || [];
      for (const nft of owned) {
        const tokenId = normalizeTokenId(nft.tokenId || (nft.id && nft.id.tokenId));
        if (!tokenId) {
          continue;
        }
        frogs.push({ tokenId, metadata: nft.rawMetadata || nft.metadata || null });
      }

      pageKey = payload.pageKey;
    } while (pageKey);

    return frogs;
  }

  async function fetchStakedFrogs(ownerAddress) {
    if (!Eth.contracts.controller) {
      return [];
    }

    try {
      const stakedTokens = await Eth.contracts.controller.getStakedTokens(
        ownerAddress
      );
      return stakedTokens
        .map((token) => {
          const tokenId = normalizeTokenId(token.tokenId);
          return {
            tokenId,
            staker: token.staker,
            isStaked: true
          };
        })
        .filter((token) => token.tokenId);
    } catch (error) {
      console.error('[FreshFrogs] Unable to load staked frogs', error);
      return [];
    }
  }

  async function fetchPendingRewards(ownerAddress) {
    if (!Eth.contracts.controller) {
      return null;
    }

    try {
      return await Eth.contracts.controller.availableRewards(ownerAddress);
    } catch (error) {
      console.error('[FreshFrogs] Unable to load pending rewards', error);
      return null;
    }
  }

  function mergeFrogLists(owned, staked) {
    const frogsById = new Map();

    for (const frog of owned) {
      if (!frog.tokenId) {
        continue;
      }
      frogsById.set(frog.tokenId, {
        tokenId: frog.tokenId,
        metadata: frog.metadata || null,
        isStaked: false
      });
    }

    for (const frog of staked) {
      if (!frog.tokenId) {
        continue;
      }
      const existing = frogsById.get(frog.tokenId) || {};
      frogsById.set(frog.tokenId, {
        tokenId: frog.tokenId,
        metadata: existing.metadata || frog.metadata || null,
        isStaked: true
      });
    }

    return Array.from(frogsById.values()).sort((a, b) => a.tokenId - b.tokenId);
  }

  async function buildSaleCard(sale) {
    const tokenId = normalizeTokenId(
      sale.tokenId ||
        sale.tokenIdDecimal ||
        (sale.nft && sale.nft.tokenId) ||
        (sale.token && sale.token.tokenId)
    );

    if (!tokenId) {
      return null;
    }

    const metadata =
      sale.metadata ||
      sale.tokenMetadata ||
      (await fetchFrogMetadata(tokenId));

    const frogName = metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const ownerLabel = formatOwnerAddress(
      sale.buyerAddress || sale.to || sale.ownerAddress
    );
    const priceLabel = formatPrice(sale);
    const rarityRank = rarityMap.get(tokenId) || null;
    const traitsHtml = buildTraitsHtml(metadata);

    return createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl: `${IMAGE_BASE}/${tokenId}.png`,
      traitsHtml,
      badge: ''
    });
  }

  async function buildWalletCard(frog, ownerAddress) {
    const tokenId = frog.tokenId;
    if (!tokenId) {
      return null;
    }

    const metadata = frog.metadata || (await fetchFrogMetadata(tokenId));
    const frogName = metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const rarityRank = rarityMap.get(tokenId) || null;
    const traitsHtml = buildTraitsHtml(metadata);

    return createFrogCard({
      ownerLabel: formatOwnerAddress(ownerAddress),
      priceLabel: frog.isStaked ? 'Staked' : 'Owned',
      frogName,
      tokenId,
      rarityRank,
      imageUrl: `${IMAGE_BASE}/${tokenId}.png`,
      traitsHtml,
      badge: frog.isStaked ? 'Earning Flyz' : ''
    });
  }

  function createFrogCard(options) {
    const {
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      badge
    } = options;

    const rarityTier = getRarityTier(rarityRank);
    const rarityText = rarityTier ? rarityTier.label : 'Rarity Unknown';
    const rarityClass = rarityTier
      ? `rarity_badge ${rarityTier.className}`
      : 'rarity_badge rarity_unknown';

    const card = document.createElement('div');
    card.className = 'recent_sale_card';
    card.innerHTML = `
      <div class="frog_card_header">
        <strong class="sale_card_title">${ownerLabel}</strong>
        <strong class="sale_card_price">${priceLabel || ''}</strong>
      </div>
      <div class="frog_img_cont">
        <img src="${imageUrl}" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <div class="frog_card_title_row">
          <strong class="sale_card_title">${frogName}</strong>
          <strong class="sale_card_price ${rarityClass}">${rarityText}</strong>
        </div>
        ${badge ? `<span class="frog_badge">${badge}</span>` : ''}
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
      </div>
    `;

    return card;
  }

  function buildTraitsHtml(metadata) {
    const traits = [];

    if (metadata && Array.isArray(metadata.attributes)) {
      const frogTrait = metadata.attributes.find(
        (attr) => attr && (attr.trait_type === 'Frog' || attr.trait_type === 'SpecialFrog')
      );

      if (frogTrait) {
        traits.push(`Frog: ${frogTrait.value}`);
      }

      metadata.attributes
        .filter((attr) => attr && attr !== frogTrait)
        .slice(0, MAX_TRAITS - traits.length)
        .forEach((attr) => {
          traits.push(`${attr.trait_type}: ${attr.value}`);
        });
    }

    if (!traits.length) {
      traits.push('Metadata unavailable');
    }

    return traits.map((trait) => `<p>${trait}</p>`).join('');
  }

  function getRarityTier(rank) {
    if (!rank) {
      return null;
    }

    if (rank <= 41) {
      return { label: 'Legendary', className: 'rarity_legendary' };
    }
    if (rank <= 404) {
      return { label: 'Epic', className: 'rarity_epic' };
    }
    if (rank <= 1010) {
      return { label: 'Rare', className: 'rarity_rare' };
    }
    return { label: 'Common', className: 'rarity_common' };
  }

  function buildRarityMap(rankings) {
    const map = new Map();
    rankings.forEach((entry) => {
      if (!entry) {
        return;
      }
      const tokenId = normalizeTokenId(
        entry.id || entry.tokenId || entry.token_id || entry.frogId || entry.frog_id
      );
      const rank = Number(entry.ranking || entry.rank || entry.position);
      if (tokenId && Number.isFinite(rank)) {
        map.set(tokenId, rank);
      }
    });
    return map;
  }

  async function fetchFrogMetadata(tokenId) {
    if (metadataCache.has(tokenId)) {
      return metadataCache.get(tokenId);
    }

    try {
      const response = await fetch(`${METADATA_BASE}/${tokenId}.json`);
      if (!response.ok) {
        throw new Error('Metadata request failed');
      }
      const data = await response.json();
      metadataCache.set(tokenId, data);
      return data;
    } catch (error) {
      console.warn(`[FreshFrogs] Metadata unavailable for frog #${tokenId}`, error);
      metadataCache.set(tokenId, null);
      return null;
    }
  }

  function detectWalletAddressInUrl() {
    const pathnameMatch = (window.location.pathname || '').match(WALLET_REGEX);
    if (pathnameMatch) {
      return pathnameMatch[0];
    }

    const params = new URLSearchParams(window.location.search || '');
    const queryWallet = params.get('wallet');
    if (queryWallet) {
      const match = queryWallet.match(WALLET_REGEX);
      if (match) {
        return match[0];
      }
    }

    const hashMatch = (window.location.hash || '').match(WALLET_REGEX);
    return hashMatch ? hashMatch[0] : null;
  }

  function normalizeTokenId(value) {
    if (value == null) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    const asString = value.toString();
    if (asString.startsWith('0x')) {
      const parsed = parseInt(asString, 16);
      return Number.isNaN(parsed) ? null : parsed;
    }
    const parsed = parseInt(asString, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function formatOwnerAddress(address) {
    if (!address) {
      return 'Unknown';
    }
    const normalized = address.startsWith('0x') ? address : `0x${address}`;
    return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`.toLowerCase();
  }

  function formatPrice(sale) {
    const sources = [sale.price, sale.salePrice, sale.sellerFee, sale.protocolFee];
    const priceSource = sources.find((source) => source && (source.value || source.amount));
    if (!priceSource) {
      return 'Unknown';
    }
    const rawValue = priceSource.value || priceSource.amount;
    const decimals =
      priceSource.decimals ||
      (priceSource.currency && priceSource.currency.decimals) ||
      18;
    const symbol =
      (priceSource.currency && priceSource.currency.symbol) ||
      priceSource.symbol ||
      'ETH';
    const formattedValue = formatTokenValue(rawValue, decimals);
    return formattedValue ? `${formattedValue} ${symbol}` : 'Unknown';
  }

  function formatTokenValue(rawValue, decimals) {
    if (!rawValue && rawValue !== 0) {
      return null;
    }

    try {
      const numericValue = rawValue.toString().startsWith('0x')
        ? BigInt(rawValue)
        : BigInt(rawValue);
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = numericValue / divisor;
      const fraction = numericValue % divisor;
      if (fraction === 0n) {
        return whole.toString();
      }
      const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
      return `${whole.toString()}.${fractionStr.replace(/0+$/, '')}`;
    } catch (error) {
      const numeric = Number(rawValue) / Math.pow(10, decimals);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      return numeric.toFixed(4);
    }
  }

  function checksumAddress(address) {
    if (!address) {
      return null;
    }
    try {
      if (ethers.utils && typeof ethers.utils.getAddress === 'function') {
        return ethers.utils.getAddress(address);
      }
      if (typeof ethers.getAddress === 'function') {
        return ethers.getAddress(address);
      }
      return address;
    } catch (error) {
      return null;
    }
  }

  function navigateToWallet(address) {
    const normalized = checksumAddress(address);
    if (!normalized || document.body.dataset.page !== 'wallet') {
      return;
    }
    const url = new URL(window.location.href);
    url.pathname = `/${normalized}`;
    url.searchParams.delete('wallet');
    window.history.replaceState({}, '', url.toString());
    setWalletInputValue(normalized);
  }

  function setWalletInputValue(address) {
    const input = document.getElementById('wallet-address-input');
    if (input) {
      input.value = address;
    }
  }

  function showWalletError(message, target) {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.hidden = false;
  }

  function hideWalletError(target) {
    if (target) {
      target.hidden = true;
    }
  }

  function setStatus(statusEl, text) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text;
  }

  function updateWalletKpis({ pendingRewards, stakedCount }) {
    const rewardsEl = document.getElementById('wallet-pending-rewards');
    const stakedEl = document.getElementById('wallet-staked-count');

    if (rewardsEl) {
      if (pendingRewards == null) {
        rewardsEl.textContent = '--';
      } else {
        const formatted = Eth.formatUnits
          ? Eth.formatUnits(pendingRewards, 18)
          : formatTokenValue(pendingRewards, 18) || '0';
        const numericValue = Number(formatted);
        rewardsEl.textContent = Number.isFinite(numericValue)
          ? numericValue.toFixed(4)
          : formatted;
      }
    }

    if (stakedEl) {
      stakedEl.textContent = typeof stakedCount === 'number' ? stakedCount : 0;
    }
  }
})();
