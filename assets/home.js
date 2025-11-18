// assets/home.js
// Homepage + wallet view + staked frogs, using the same card layout.

(function () {
  const API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
  const CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  const MAX_TRAITS = 3;

  // Optional: set a default mint price fallback (in WEI) for frogs with no sales
  // Example: 0.025 ETH => "25000000000000000"
  const DEFAULT_MINT_PRICE_WEI = '';

  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();

  // Decide: homepage vs wallet view
  document.addEventListener('DOMContentLoaded', () => {
    const ownerFromPath = getOwnerAddressFromPath();
    if (ownerFromPath) {
      loadWalletFrogs(ownerFromPath);
    } else {
      loadRecentSales();
    }
  });

  // ---------------- ROUTING ----------------

  function getOwnerAddressFromPath() {
    const path = window.location.pathname || '/';
    // matches "/0xabc123...def456" or "/0xabc.../"
    const match = path.match(/^\/(0x[a-fA-F0-9]{40})\/?$/);
    return match ? match[1] : null;
  }

  // ---------------- RARITY MAP ----------------

  function buildRarityMap(rankings) {
    return rankings.reduce((acc, frog) => {
      if (frog && typeof frog.id !== 'undefined') {
        const frogId = Number(frog.id);
        const rankingValue = frog.ranking || frog.rank;
        acc[frogId] = typeof rankingValue !== 'undefined' ? rankingValue : 'N/A';
      }
      return acc;
    }, {});
  }

  // ================= SHARED CARD BUILDER =================

  function createFrogCard(options) {
    const {
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      stakeProgressPercent
    } = options;

    const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;
    const rarityText = rarityTier ? rarityTier.label : 'Rarity Unknown';
    const rarityClass = rarityTier
      ? `rarity_badge ${rarityTier.className}`
      : 'rarity_badge rarity_unknown';

    const stakeHtml =
      typeof stakeProgressPercent === 'number'
        ? `
        <div class="stake_progress">
          <div class="stake_progress_label">Staking progress</div>
          <div class="stake_progress_bar">
            <div class="stake_progress_fill" style="width: ${Math.max(
              0,
              Math.min(100, stakeProgressPercent)
            )}%;"></div>
          </div>
        </div>
      `
        : '';

    const card = document.createElement('div');
    card.className = 'recent_sale_card';
    card.innerHTML = `
      <strong class="sale_card_title">${ownerLabel}</strong><strong class="sale_card_price">${priceLabel}</strong>
      <div style="clear: both;"></div>
      <div class="frog_img_cont">
        <img src="${imageUrl}" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong><strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
        ${stakeHtml}
      </div>
    `;
    return card;
  }

  // ================= RECENT SALES (HOMEPAGE) =================

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');

    try {
      const sales = await fetchRecentSales();

      if (!sales.length) {
        if (statusEl) statusEl.textContent = 'No recent sales found.';
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }

      for (const sale of sales) {
        const card = await buildSaleCard(sale);
        if (card) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error('Unable to load recent sales', error);
      if (statusEl) {
        statusEl.textContent = 'Unable to load recent sales.';
      }
    }
  }

  async function fetchRecentSales() {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTSales`;
    const sales = [];
    let pageKey;

    do {
      const params = new URLSearchParams({
        contractAddress: CONTRACT_ADDRESS,
        order: 'desc',
        withMetadata: 'true'
      });

      if (pageKey) {
        params.append('pageKey', pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Alchemy NFT sales request failed');
      }

      const payload = await response.json();
      sales.push(...(payload.nftSales || []));
      pageKey = payload.pageKey;
    } while (pageKey);

    return sales;
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

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;

    const ownerLabel = formatOwnerAddress(
      sale.buyerAddress || sale.to || sale.ownerAddress
    );

    const priceLabel = formatPrice(sale);

    const rarityRank =
      typeof rarityMap[tokenId] !== 'undefined'
        ? Number(rarityMap[tokenId])
        : null;

    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = buildTraitsHtml(metadata);

    return createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      stakeProgressPercent: null
    });
  }

  // ================= WALLET VIEW (INCLUDING STAKED) =================

  async function loadWalletFrogs(ownerAddress) {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');

    if (statusEl) {
      statusEl.textContent = `Loading frogs owned by ${formatOwnerAddress(
        ownerAddress
      )}...`;
    }

    try {
      const [ownedNfts, stakedInfos] = await Promise.all([
        fetchFrogsForOwner(ownerAddress),
        fetchStakedTokensForOwner(ownerAddress)
      ]);

      const totalCount =
        ((ownedNfts && ownedNfts.length) || 0) +
        ((stakedInfos && stakedInfos.length) || 0);

      if (!totalCount) {
        if (statusEl) {
          statusEl.textContent = `No Fresh Frogs found for ${formatOwnerAddress(
            ownerAddress
          )}.`;
        }
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }

      const rendered = new Set();
      const stakedMap = new Map();
      stakedInfos.forEach((info) => {
        stakedMap.set(info.tokenId, info);
      });

      // 1) Owned NFTs from Alchemy
      for (const nft of ownedNfts) {
        const card = await buildWalletCardFromNft(nft, ownerAddress, stakedMap);
        if (card) {
          container.appendChild(card);
          const tokenIdStr = card.dataset.tokenId;
          if (tokenIdStr) rendered.add(Number(tokenIdStr));
        }
      }

      // 2) Extra staked frogs (held in controller contract, not in wallet)
      for (const stakeInfo of stakedInfos) {
        if (rendered.has(stakeInfo.tokenId)) continue;
        const card = await buildStakedOnlyWalletCard(stakeInfo, ownerAddress);
        if (card) {
          container.appendChild(card);
          rendered.add(stakeInfo.tokenId);
        }
      }
    } catch (error) {
      console.error('Unable to load wallet frogs', error);
      if (statusEl) {
        statusEl.textContent = 'Unable to load frogs for this wallet.';
      }
    }
  }

  async function fetchFrogsForOwner(ownerAddress) {
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
      frogs.push(...(payload.ownedNfts || payload.nfts || []));
      pageKey = payload.pageKey;
    } while (pageKey);

    return frogs;
  }

  async function fetchLastSaleForToken(tokenId) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTSales`;
    const params = new URLSearchParams({
      contractAddress: CONTRACT_ADDRESS,
      tokenId: String(tokenId),
      order: 'desc',
      limit: '1'
    });

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      console.warn(
        'Alchemy getNFTSales (per-token) request failed for token',
        tokenId
      );
      return null;
    }

    const payload = await response.json();
    const sales = payload.nftSales || [];
    if (!sales.length) {
      return null;
    }
    return sales[0];
  }

  // ---- staking integration, based on your old function ----

  async function fetchStakedTokensForOwner(wallet) {
    const results = [];
    const getStakedTokensFn = window.getStakedTokens;
    const stakingValuesFn = window.stakingValues;
    const stakerAddressFn = window.stakerAddress;

    if (!getStakedTokensFn || !stakingValuesFn || !stakerAddressFn) {
      console.warn(
        '[WalletView] Staking functions not available; skipping staked frogs.'
      );
      return results;
    }

    try {
      const tokens = await getStakedTokensFn(wallet);
      if (!Array.isArray(tokens)) return results;

      for (const token of tokens) {
        const tokenIdRaw = token.tokenId || token.token_id || token;
        const tokenId = normalizeTokenId(tokenIdRaw);
        if (!tokenId) continue;

        const ownerOnChain = await stakerAddressFn(tokenId);
        if (
          !ownerOnChain ||
          ownerOnChain.toLowerCase() !== wallet.toLowerCase()
        ) {
          continue;
        }

        const stakedValues = await stakingValuesFn(tokenId);
        // Original logic: progress = ((41.7 - staked_values[2]) / 41.7) * 100
        let progressPercent = null;
        try {
          const nextLvl = Number(stakedValues[2]);
          progressPercent = ((41.7 - nextLvl) / 41.7) * 100;
        } catch (e) {
          progressPercent = null;
        }

        if (typeof progressPercent === 'number' && !isFinite(progressPercent)) {
          progressPercent = null;
        }

        results.push({
          tokenId,
          progressPercent
        });
      }
    } catch (err) {
      console.error(
        '[WalletView] Error fetching staked tokens for wallet',
        wallet,
        err
      );
    }

    return results;
  }

  async function buildWalletCardFromNft(nft, ownerAddress, stakedMap) {
    const tokenId = normalizeTokenId(
      nft.tokenId || (nft.id && nft.id.tokenId)
    );
    if (!tokenId) return null;

    const metadata =
      nft.rawMetadata ||
      nft.metadata ||
      (await fetchFrogMetadata(tokenId));

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;

    const ownerLabel = formatOwnerAddress(ownerAddress);

    // price: last sale → mint fallback → blank
    let priceLabel = '';
    try {
      const lastSale = await fetchLastSaleForToken(tokenId);
      if (lastSale) {
        priceLabel = formatPrice(lastSale);
      } else if (DEFAULT_MINT_PRICE_WEI) {
        const mintFormatted = formatTokenValue(DEFAULT_MINT_PRICE_WEI, 18);
        priceLabel = mintFormatted ? `${mintFormatted} ETH` : '';
      }
    } catch (e) {
      console.warn(
        'Failed to fetch last sale for wallet frog',
        tokenId,
        e
      );
    }
    if (priceLabel === 'Unknown') {
      priceLabel = '';
    }

    const rarityRank =
      typeof rarityMap[tokenId] !== 'undefined'
        ? Number(rarityMap[tokenId])
        : null;

    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = buildTraitsHtml(metadata);

    const stakeInfo = stakedMap.get(tokenId);
    const stakeProgressPercent = stakeInfo ? stakeInfo.progressPercent : null;

    const card = createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      stakeProgressPercent
    });

    card.dataset.tokenId = String(tokenId);
    return card;
  }

  async function buildStakedOnlyWalletCard(stakeInfo, ownerAddress) {
    const tokenId = stakeInfo.tokenId;
    const metadata = await fetchFrogMetadata(tokenId);

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;

    const ownerLabel = formatOwnerAddress(ownerAddress);

    let priceLabel = '';
    try {
      const lastSale = await fetchLastSaleForToken(tokenId);
      if (lastSale) {
        priceLabel = formatPrice(lastSale);
      } else if (DEFAULT_MINT_PRICE_WEI) {
        const mintFormatted = formatTokenValue(DEFAULT_MINT_PRICE_WEI, 18);
        priceLabel = mintFormatted ? `${mintFormatted} ETH` : '';
      }
    } catch (e) {
      console.warn(
        'Failed to fetch last sale for staked-only frog',
        tokenId,
        e
      );
    }
    if (priceLabel === 'Unknown') {
      priceLabel = '';
    }

    const rarityRank =
      typeof rarityMap[tokenId] !== 'undefined'
        ? Number(rarityMap[tokenId])
        : null;

    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = buildTraitsHtml(metadata);

    const card = createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      stakeProgressPercent: stakeInfo.progressPercent
    });

    card.dataset.tokenId = String(tokenId);
    return card;
  }

  // ================= SHARED HELPERS (from your original script) =================

  async function fetchFrogMetadata(tokenId) {
    if (metadataCache.has(tokenId)) {
      return metadataCache.get(tokenId);
    }

    try {
      const response = await fetch(
        `https://freshfrogs.github.io/frog/json/${tokenId}.json`
      );
      if (!response.ok) {
        throw new Error('Metadata fetch failed');
      }
      const data = await response.json();
      metadataCache.set(tokenId, data);
      return data;
    } catch (error) {
      console.warn(`Metadata unavailable for Frog #${tokenId}`, error);
      metadataCache.set(tokenId, null);
      return null;
    }
  }

  function buildTraitsHtml(metadata) {
    const traits = [];
    if (metadata && Array.isArray(metadata.attributes)) {
      const frogTrait = metadata.attributes.find(
        (attr) => attr.trait_type === 'Frog' || attr.trait_type === 'SpecialFrog'
      );
      if (frogTrait) {
        traits.push(`Frog: ${frogTrait.value}`);
      }

      metadata.attributes
        .filter((attr) => attr !== frogTrait)
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

  function normalizeTokenId(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return parseInt(value, 16);
      }
      return parseInt(value, 10);
    }
    return null;
  }

  function formatOwnerAddress(address) {
    if (!address) {
      return 'Unknown';
    }
    const normalized = address.startsWith('0x') ? address : `0x${address}`;
    const shortened = `${normalized.slice(0, 6)}..${normalized.slice(-4)}`;
    return shortened.toLowerCase();
  }

  function formatPrice(sale) {
    const sources = [
      sale.price,
      sale.salePrice,
      sale.sellerFee,
      sale.protocolFee
    ];
    const priceSource = sources.find(
      (source) => source && (source.value || source.amount)
    );

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
      const fractionStr = fraction
        .toString()
        .padStart(decimals, '0')
        .slice(0, 3);
      const cleanedFraction = fractionStr.replace(/0+$/, '');
      return cleanedFraction
        ? `${whole.toString()}.${cleanedFraction}`
        : whole.toString();
    } catch (error) {
      const numeric = Number(rawValue) / Math.pow(10, decimals);
      if (!isFinite(numeric)) {
        return null;
      }
      return numeric.toFixed(3);
    }
  }
})();
