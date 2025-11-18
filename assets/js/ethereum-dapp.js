(function () {
  'use strict';

  if (typeof window === 'undefined') {
    return;
  }

  if (typeof ethers === 'undefined') {
    console.error('[FreshFrogs] ethers.js must be loaded before ethereum.dapp.js');
    return;
  }

  if (typeof COLLECTION_ABI === 'undefined' || typeof CONTROLLER_ABI === 'undefined') {
    console.error('[FreshFrogs] Missing contract ABIs. Ensure assets/abi scripts load first.');
    return;
  }

  const CONFIG = {
    apiKey: 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ',
    collectionAddress: '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b',
    controllerAddress: '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199',
    imageBaseUrl: 'https://freshfrogs.github.io/frog',
    metadataBaseUrl: 'https://freshfrogs.github.io/frog/json',
    maxTraits: 5
  };

  const RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${CONFIG.apiKey}`;

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

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

  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();

  async function fetchFrogMetadata(tokenId) {
    if (metadataCache.has(tokenId)) {
      return metadataCache.get(tokenId);
    }

    try {
      const response = await fetch(`${CONFIG.metadataBaseUrl}/${tokenId}.json`);
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
        <strong class="sale_card_title">${ownerLabel || ''}</strong>
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
        .slice(0, CONFIG.maxTraits - traits.length)
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
      const value = rawValue.toString().startsWith('0x') ? BigInt(rawValue) : BigInt(rawValue);
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = value / divisor;
      const fraction = value % divisor;
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

  function formatUnits(value, decimals = 18) {
    if (ethers.utils && typeof ethers.utils.formatUnits === 'function') {
      return ethers.utils.formatUnits(value, decimals);
    }
    if (typeof ethers.formatUnits === 'function') {
      return ethers.formatUnits(value, decimals);
    }
    return formatTokenValue(value, decimals) || '0';
  }

  window.FreshFrogs = {
    config: CONFIG,
    provider,
    contracts,
    rarityMap,
    fetchFrogMetadata,
    buildTraitsHtml,
    getRarityTier,
    createFrogCard,
    normalizeTokenId,
    formatOwnerAddress,
    formatPrice,
    formatTokenValue,
    formatUnits
  };
})();
