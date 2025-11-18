// assets/home.js
// - Homepage: Recent sales
// - Wallet view: /0x... (owned + staked frogs)
// Uses the same card layout for everything.

(function () {
  'use strict';

  const API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ'; // you already have this
  const CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  const MAX_TRAITS = 4;

  // NEW: staking contract + RPC
  const STAKING_CONTRACT_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const ALCHEMY_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${API_KEY}`;

  let stakingWeb3 = null;
  let stakingContract = null;

  function getStakingContract() {
    // Need Web3 and controller_abi loaded from <head>
    if (typeof Web3 === 'undefined' || typeof window.controller_abi === 'undefined') {
      console.warn('[WalletView] Web3 or controller_abi not available; cannot load staked frogs.');
      return null;
    }

    if (!stakingWeb3) {
      stakingWeb3 = new Web3(new Web3.providers.HttpProvider(ALCHEMY_RPC_URL));
    }
    if (!stakingContract) {
      stakingContract = new stakingWeb3.eth.Contract(
        window.controller_abi,
        STAKING_CONTRACT_ADDRESS
      );
    }
    return stakingContract;
  }


  // If you want a global mint price fallback, put the WEI amount here (string).
  // Example: 0.01 ETH => "10000000000000000"
  const DEFAULT_MINT_PRICE_WEI = '';

  // Build rarity map once from the rankings script
  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const walletAddress = findWalletAddressInUrl();

    if (walletAddress) {
      loadWalletFrogs(walletAddress);
    } else {
      loadRecentSales();
    }
  }

  // ------------------------------------------------------------
  // URL / routing helpers
  // ------------------------------------------------------------

  // Works for:
  // - https://freshfrogs.github.io/0xabc...
  // - 404.html?path=/0xabc...
  // - Any URL containing a 0x + 40 hex chars
  function findWalletAddressInUrl() {
    const match = window.location.href.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  }

  // ------------------------------------------------------------
  // Rarity map
  // ------------------------------------------------------------

  function buildRarityMap(rankings) {
    const map = {};

    rankings.forEach((frog) => {
      if (!frog) return;

      // Try multiple possible key names just in case
      const id =
        frog.id ??
        frog.tokenId ??
        frog.token_id ??
        frog.frogId ??
        frog.frog_id;

      const rank = frog.ranking ?? frog.rank ?? frog.position;

      if (id != null && rank != null) {
        const frogId = Number(id);
        if (!Number.isNaN(frogId)) {
          map[frogId] = Number(rank);
        }
      }
    });

    return map;
  }

  // ------------------------------------------------------------
  // Shared card builder
  // ------------------------------------------------------------

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
    card.dataset.tokenId = String(tokenId);
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

  // ------------------------------------------------------------
  // HOMEPAGE: Recent sales
  // ------------------------------------------------------------

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');

    try {
      const sales = await fetchRecentSales();

      if (!sales.length) {
        if (statusEl) statusEl.textContent = 'No recent sales found.';
        return;
      }

      if (statusEl) statusEl.remove();

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

    if (!tokenId) return null;

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

  // ------------------------------------------------------------
  // WALLET VIEW: Owned + Staked
  // ------------------------------------------------------------

  async function loadWalletFrogs(ownerAddress) {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');

    if (statusEl) {
      statusEl.textContent = `Loading frogs for ${formatOwnerAddress(
        ownerAddress
      )}...`;
    }

    try {
      const [ownedNfts, stakedInfos] = await Promise.all([
        fetchFrogsForOwner(ownerAddress),
        fetchStakedTokensForOwner(ownerAddress)
      ]);

      // Deduplicate and merge here
      const frogsById = new Map();

      // 1) Owned NFTs (direct owner = wallet)
      for (const nft of ownedNfts) {
        const tokenId = normalizeTokenId(
          nft.tokenId || (nft.id && nft.id.tokenId)
        );
        if (!tokenId) continue;

        const existing = frogsById.get(tokenId) || {};
        frogsById.set(tokenId, {
          ...existing,
          tokenId,
          fromOwned: true,
          metadata: nft.rawMetadata || nft.metadata || existing.metadata || null
        });
      }

      // 2) Staked NFTs (owned via staking contract, but stakerAddress == wallet)
      for (const info of stakedInfos) {
        const tokenId = info.tokenId;
        if (!tokenId) continue;

        const existing = frogsById.get(tokenId) || {};
        frogsById.set(tokenId, {
          ...existing,
          tokenId,
          isStaked: true,
          stakeProgressPercent: info.progressPercent
        });
      }

      if (!frogsById.size) {
        if (statusEl) {
          statusEl.textContent = `No Fresh Frogs found for ${formatOwnerAddress(
            ownerAddress
          )}.`;
        }
        return;
      }

      if (statusEl) statusEl.remove();

      // Build a card once per token
      for (const frog of frogsById.values()) {
        const card = await buildWalletCard(ownerAddress, frog);
        if (card) container.appendChild(card);
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
    if (!sales.length) return null;
    return sales[0];
  }

  // Staking integration (needs ethereum-dapp.js to expose these)
  async function fetchStakedTokensForOwner(wallet) {
    const results = [];
    const contract = getStakingContract();
    if (!contract) {
      return results;
    }

    const normalizedWallet = wallet.toLowerCase();

    // There are 4,040 frogs; we’ll scan token IDs 1..4040
    const MAX_TOKEN_ID = 4040;
    const BATCH_SIZE = 80; // tune this up or down if you want

    try {
      for (let start = 1; start <= MAX_TOKEN_ID; start += BATCH_SIZE) {
        const end = Math.min(MAX_TOKEN_ID, start + BATCH_SIZE - 1);

        // 1) batch call stakerAddress for this slice of IDs
        const ownerCalls = [];
        for (let tokenId = start; tokenId <= end; tokenId++) {
          ownerCalls.push(contract.methods.stakerAddress(tokenId).call());
        }

        let owners;
        try {
          owners = await Promise.all(ownerCalls);
        } catch (batchErr) {
          console.error('[WalletView] Error in stakerAddress batch', batchErr);
          continue; // skip this batch, keep going
        }

        // 2) For the IDs where stakerAddress == wallet, fetch stakingValues
        const stakingCalls = [];
        const tokenIdsForWallet = [];

        for (let i = 0; i < owners.length; i++) {
          const tokenId = start + i;
          const ownerOnChain = (owners[i] || '').toLowerCase();
          if (ownerOnChain === normalizedWallet) {
            tokenIdsForWallet.push(tokenId);
            stakingCalls.push(contract.methods.stakingValues(tokenId).call());
          }
        }

        if (!stakingCalls.length) {
          continue;
        }

        let stakingValuesList;
        try {
          stakingValuesList = await Promise.all(stakingCalls);
        } catch (stakeErr) {
          console.error('[WalletView] Error in stakingValues batch', stakeErr);
          continue;
        }

        // 3) Convert stakingValues → progressPercent (same formula as your old code)
        for (let i = 0; i < tokenIdsForWallet.length; i++) {
          const tokenId = tokenIdsForWallet[i];
          const stakedValues = stakingValuesList[i];

          let progressPercent = null;
          try {
            // original: progress = ((41.7 - staked_values[2]) / 41.7) * 100
            const nextLvl = Number(stakedValues[2]);
            if (Number.isFinite(nextLvl)) {
              progressPercent = ((41.7 - nextLvl) / 41.7) * 100;
            }
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
      }
    } catch (err) {
      console.error('[WalletView] Error fetching staked tokens for wallet', wallet, err);
    }

    return results;
  }


  async function buildWalletCard(ownerAddress, frog) {
    const tokenId = frog.tokenId;
    if (!tokenId) return null;

    let metadata = frog.metadata || null;
    if (!metadata) {
      metadata = await fetchFrogMetadata(tokenId);
    }

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const ownerLabel = formatOwnerAddress(ownerAddress);

    // Price: last sale → mint fallback → blank
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
      console.warn('Failed to fetch last sale for token', tokenId, e);
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

    const stakeProgressPercent = frog.isStaked
      ? frog.stakeProgressPercent
      : null;

    return createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl,
      traitsHtml,
      stakeProgressPercent
    });
  }

  // ------------------------------------------------------------
  // Shared helpers
  // ------------------------------------------------------------

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
        (attr) =>
          attr.trait_type === 'Frog' || attr.trait_type === 'SpecialFrog'
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
        const parsed = parseInt(value, 16);
        return Number.isNaN(parsed) ? null : parsed;
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
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
