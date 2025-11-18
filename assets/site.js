(function () {
  const API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
  const CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  const STAKING_CONTRACT_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();
  const priceCache = new Map();
  const stakingDetailsCache = new Map();
  const browserProvider = detectBrowserProvider();
  const isBrowserWalletProvider = Boolean(browserProvider);
  const web3ProviderUrl = `https://eth-mainnet.g.alchemy.com/v2/${API_KEY}`;
  const web3 = initWeb3(browserProvider);
  const stakingContract = initStakingContract(web3);
  const collectionContract = initCollectionContract(web3);
  let stakingProviderWarningShown = false;

  document.addEventListener('DOMContentLoaded', () => {
    setupWalletConnector();
    if (document.getElementById('recent-sales')) {
      loadRecentSales();
    }
    if (document.getElementById('wallet-frogs')) {
      loadWalletFrogs();
    }
  });

  function setupWalletConnector() {
    const connectLink = document.getElementById('connect-wallet-link');
    if (!connectLink) {
      return;
    }

    connectLink.addEventListener('click', async (event) => {
      event.preventDefault();
      if (!browserProvider || typeof browserProvider.request !== 'function') {
        alert('A Web3 wallet (like MetaMask) is required to connect.');
        return;
      }

      try {
        const accounts = await browserProvider.request({ method: 'eth_requestAccounts' });
        const primaryAccount = Array.isArray(accounts) ? accounts[0] : null;

        if (isValidWalletAddress(primaryAccount)) {
          const normalized = primaryAccount.toLowerCase();
          const targetUrl = `${window.location.origin}/${normalized}`;
          window.location.href = targetUrl;
        }
      } catch (error) {
        console.warn('Wallet connection was not completed', error);
      }
    });
  }

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

  function detectBrowserProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }

  function initWeb3(preferredProvider) {
    if (typeof Web3 === 'undefined') {
      console.warn('Web3 unavailable. Staked frogs will be hidden.');
      return null;
    }

    try {
      if (preferredProvider) {
        return new Web3(preferredProvider);
      }
      const provider = new Web3.providers.HttpProvider(web3ProviderUrl);
      return new Web3(provider);
    } catch (error) {
      console.warn('Unable to initialize Web3', error);
      return null;
    }
  }

  function initStakingContract(web3Instance) {
    if (!web3Instance || typeof CONTROLLER_ABI === 'undefined') {
      console.warn('Staking contract ABI unavailable. Staked frogs will be hidden.');
      return null;
    }

    try {
      return new web3Instance.eth.Contract(CONTROLLER_ABI, STAKING_CONTRACT_ADDRESS);
    } catch (error) {
      console.warn('Unable to initialize staking contract', error);
      return null;
    }
  }

  function initCollectionContract(web3Instance) {
    if (!web3Instance || typeof COLLECTION_ABI === 'undefined') {
      return null;
    }

    try {
      return new web3Instance.eth.Contract(COLLECTION_ABI, CONTRACT_ADDRESS);
    } catch (error) {
      console.warn('Unable to initialize collection contract', error);
      return null;
    }
  }

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');

    try {
      const sales = await fetchRecentSales();

      if (!sales.length) {
        if (statusEl) {
          statusEl.textContent = 'No recent sales found.';
        }
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

    const metadata = sale.metadata || sale.tokenMetadata || (await fetchFrogMetadata(tokenId));
    const owner = formatOwnerAddress(sale.buyerAddress || sale.to || sale.ownerAddress);
    const price = formatPrice(sale);

    return createFrogCard({
      tokenId,
      metadata,
      headerLeft: owner,
      headerRight: price
    });
  }

  async function loadWalletFrogs() {
    const container = document.getElementById('wallet-frogs');
    const statusEl = document.getElementById('wallet-frogs-status');
    const walletLabelEl = document.getElementById('wallet-address');
    const walletAddress = detectWalletAddress();

    if (walletLabelEl) {
      walletLabelEl.textContent = walletAddress || 'No wallet detected';
      walletLabelEl.classList.toggle('wallet_invalid', !walletAddress);
    }

    if (!walletAddress) {
      if (statusEl) {
        statusEl.textContent = 'Add a wallet address to the URL (freshfrogs.github.io/0xabc...) to see owned and staked frogs.';
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Loading frogs...';
    }

    try {
      const [ownedTokens, stakedTokenIds] = await Promise.all([
        fetchOwnedFrogs(walletAddress),
        fetchStakedFrogs(walletAddress)
      ]);

      const walletLabel = formatOwnerAddress(walletAddress);
      const seenTokenIds = new Set();
      let hasCards = false;

      for (const token of ownedTokens) {
        const tokenId = normalizeTokenId(token.tokenId);
        if (!tokenId || seenTokenIds.has(tokenId)) {
          continue;
        }
        seenTokenIds.add(tokenId);
        const priceInfo = await fetchTokenPriceInfo(tokenId);
        const card = await buildWalletCard(
          {
            tokenId,
            metadata: token.metadata,
            priceLabel: priceInfo ? priceInfo.label : ''
          },
          walletLabel
        );
        if (card) {
          container.appendChild(card);
          hasCards = true;
        }
      }

      for (const stakedToken of stakedTokenIds) {
        const tokenId = stakedToken.tokenId;
        if (!tokenId || seenTokenIds.has(tokenId)) {
          continue;
        }
        seenTokenIds.add(tokenId);
        const [priceInfo, stakingDetails] = await Promise.all([
          fetchTokenPriceInfo(tokenId),
          fetchStakingDetails(tokenId)
        ]);
        const card = await buildWalletCard(
          {
            tokenId,
            priceLabel: priceInfo ? priceInfo.label : '',
            isStaked: true,
            stakingDetails
          },
          walletLabel
        );
        if (card) {
          container.appendChild(card);
          hasCards = true;
        }
      }

      if (statusEl) {
        if (hasCards) {
          statusEl.remove();
        } else {
          statusEl.textContent = 'No frogs found for this wallet.';
        }
      }
    } catch (error) {
      console.error('Unable to load wallet frogs', error);
      if (statusEl) {
        statusEl.textContent = 'Unable to load frogs for this wallet.';
      }
    }
  }

  async function buildWalletCard(token, walletLabel) {
    const metadata = token.metadata || (await fetchFrogMetadata(token.tokenId));
    const headerRight = typeof token.priceLabel !== 'undefined' ? token.priceLabel : await derivePriceLabel(token.tokenId);
    const footerHtml = token.isStaked && token.stakingDetails ? buildStakingFooter(token.stakingDetails) : '';
    return createFrogCard({
      tokenId: token.tokenId,
      metadata,
      headerLeft: walletLabel,
      headerRight,
      footerHtml
    });
  }

  function detectWalletAddress() {
    const pathSegments = window.location.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const primarySegment = pathSegments.length && !/404\.html$/i.test(pathSegments[pathSegments.length - 1])
      ? pathSegments[pathSegments.length - 1]
      : pathSegments[0];
    const directCandidate = primarySegment && primarySegment !== '404.html' ? primarySegment : '';
    const searchParams = new URLSearchParams(window.location.search);
    const queryCandidate = searchParams.get('wallet');
    const candidate = directCandidate || queryCandidate || '';

    if (isValidWalletAddress(candidate)) {
      return candidate;
    }
    if (isValidWalletAddress(queryCandidate)) {
      return queryCandidate;
    }
    return null;
  }

  function isValidWalletAddress(value) {
    if (typeof value !== 'string') {
      return false;
    }
    const normalized = value.trim();
    return /^0x[0-9a-fA-F]{40}$/.test(normalized);
  }

  async function fetchOwnedFrogs(walletAddress) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTsForOwner`;
    const owned = [];
    let pageKey;

    do {
      const params = new URLSearchParams({
        owner: walletAddress,
        withMetadata: 'true',
        pageSize: '100'
      });
      params.append('contractAddresses[]', CONTRACT_ADDRESS);

      if (pageKey) {
        params.append('pageKey', pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Alchemy getNFTsForOwner request failed');
      }

      const payload = await response.json();
      owned.push(...(payload.ownedNfts || []));
      pageKey = payload.pageKey;
    } while (pageKey);

    return owned;
  }

  async function fetchStakedFrogs(walletAddress) {
    if (!stakingContract) {
      return [];
    }

    try {
      const tokens = await stakingContract.methods.getStakedTokens(walletAddress).call();
      return tokens
        .map((token) => ({
          tokenId: normalizeTokenId(token.tokenId),
          staker: token.staker
        }))
        .filter((token) => typeof token.tokenId === 'number' && !Number.isNaN(token.tokenId));
    } catch (error) {
      console.warn('Unable to fetch staked frogs', error);
      return [];
    }
  }

  async function fetchFrogMetadata(tokenId) {
    if (metadataCache.has(tokenId)) {
      return metadataCache.get(tokenId);
    }

    try {
      const response = await fetch(`https://freshfrogs.github.io/frog/json/${tokenId}.json`);
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

  function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml }) {
    const frogName = metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const rarityRank = typeof rarityMap[tokenId] !== 'undefined' ? Number(rarityMap[tokenId]) : null;
    const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;
    const rarityText = rarityTier ? rarityTier.label : 'Rarity Unknown';
    const rarityClass = rarityTier ? `rarity_badge ${rarityTier.className}` : 'rarity_badge rarity_unknown';
    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = buildTraitsHtml(metadata);

    const card = document.createElement('div');
    card.className = 'recent_sale_card';
    card.innerHTML = `
      <strong class="sale_card_title">${headerLeft}</strong><strong class="sale_card_price">${headerRight}</strong>
      <div style="clear: both;"></div>
      <div class="frog_img_cont">
        <img src="${imageUrl}" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong><strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
        ${footerHtml || ''}
      </div>
    `;

    return card;
  }

  function buildTraitsHtml(metadata) {
    const traits = [];
    const MAX_TRAITS = 3;

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
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (value && typeof value.tokenId !== 'undefined') {
      return normalizeTokenId(value.tokenId);
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
    const sources = [sale.price, sale.salePrice, sale.sellerFee, sale.protocolFee];
    const priceSource = sources.find((source) => source && (source.value || source.amount));

    if (!priceSource) {
      return 'Unknown';
    }

    const rawValue = priceSource.value || priceSource.amount;
    const decimals = priceSource.decimals || (priceSource.currency && priceSource.currency.decimals) || 18;
    const symbol = (priceSource.currency && priceSource.currency.symbol) || priceSource.symbol || 'ETH';
    const formattedValue = formatTokenValue(rawValue, decimals);

    return formattedValue ? `${formattedValue} ${symbol}` : 'Unknown';
  }

  function formatTokenValue(rawValue, decimals) {
    if (!rawValue && rawValue !== 0) {
      return null;
    }

    try {
      const numericValue = rawValue.toString().startsWith('0x') ? BigInt(rawValue) : BigInt(rawValue);
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = numericValue / divisor;
      const fraction = numericValue % divisor;
      if (fraction === 0n) {
        return whole.toString();
      }
      const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
      const cleanedFraction = fractionStr.replace(/0+$/, '');
      return cleanedFraction ? `${whole.toString()}.${cleanedFraction}` : whole.toString();
    } catch (error) {
      const numeric = Number(rawValue) / Math.pow(10, decimals);
      if (!isFinite(numeric)) {
        return null;
      }
      return numeric.toFixed(3);
    }
  }

  async function fetchTokenPriceInfo(tokenId) {
    if (priceCache.has(tokenId)) {
      return priceCache.get(tokenId);
    }

    const sale = await fetchTokenSaleHistory(tokenId, 'desc');
    let label = sale ? formatPrice(sale) : '';
    let source = 'sale';

    if (!label || label === 'Unknown') {
      const mintSale = await fetchTokenSaleHistory(tokenId, 'asc');
      label = mintSale ? formatPrice(mintSale) : '';
      source = 'mint';
    }

    const normalizedLabel = label && label !== 'Unknown' ? label : '';
    const info = normalizedLabel ? { label: normalizedLabel, source } : null;
    priceCache.set(tokenId, info);
    return info;
  }

  async function derivePriceLabel(tokenId) {
    const info = await fetchTokenPriceInfo(tokenId);
    return info ? info.label : '';
  }

  async function fetchTokenSaleHistory(tokenId, order) {
    const attempts = [tokenId.toString(), `0x${tokenId.toString(16)}`];
    for (const tokenParam of attempts) {
      const sale = await requestTokenSale(tokenParam, order);
      if (sale) {
        return sale;
      }
    }
    return null;
  }

  async function requestTokenSale(tokenIdValue, order) {
    try {
      const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTSales`;
      const params = new URLSearchParams({
        contractAddress: CONTRACT_ADDRESS,
        tokenId: tokenIdValue,
        limit: '1',
        order: order || 'desc',
        withMetadata: 'false'
      });
      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      return Array.isArray(payload.nftSales) && payload.nftSales.length ? payload.nftSales[0] : null;
    } catch (error) {
      console.warn(`Unable to fetch sale history for token ${tokenIdValue}`, error);
      return null;
    }
  }

  async function fetchStakingDetails(tokenId) {
    if (stakingDetailsCache.has(tokenId)) {
      return stakingDetailsCache.get(tokenId);
    }

    const details = await deriveStakingDetails(tokenId);
    stakingDetailsCache.set(tokenId, details);
    return details;
  }

  async function deriveStakingDetails(tokenId) {
    const stakedDate = await timeStaked(tokenId);
    if (!stakedDate) {
      return null;
    }

    const now = Date.now();
    const stakedMs = now - stakedDate.getTime();
    const stakedHours = Math.max(0, Math.floor(stakedMs / (1000 * 60 * 60)));
    const levelInt = Math.floor(stakedHours / 1000) + 1;
    const hoursIntoCurrentLevel = stakedHours % 1000;
    const progress = Math.max(0, Math.min(100, (hoursIntoCurrentLevel / 1000) * 100));
    const daysToNextLevel = Math.max(0, Math.round(((levelInt * 1000) - stakedHours) / 24));

    return {
      level: romanize(levelInt),
      progress,
      daysToNextLevel,
      rewardsEarned: (stakedHours / 1000).toFixed(3),
      stakedDate: formatShortDate(stakedDate)
    };
  }

  async function timeStaked(tokenId) {
    if (!collectionContract) {
      return null;
    }

    if (!isBrowserWalletProvider) {
      if (!stakingProviderWarningShown) {
        console.warn('Connect your wallet on the homepage to load staking progress.');
        stakingProviderWarningShown = true;
      }
      return null;
    }

    try {
      const events = await collectionContract.getPastEvents('Transfer', {
        filter: { to: STAKING_CONTRACT_ADDRESS, tokenId: tokenId.toString() },
        fromBlock: 0,
        toBlock: 'latest'
      });

      if (!events.length) {
        return null;
      }

      const latestEvent = events[events.length - 1];
      const block = await web3.eth.getBlock(latestEvent.blockNumber);
      if (!block || !block.timestamp) {
        return null;
      }
      return new Date(block.timestamp * 1000);
    } catch (error) {
      console.warn(`Unable to determine stake time for token ${tokenId}`, error);
      return null;
    }
  }

  function buildStakingFooter(details) {
    if (!details) {
      return '';
    }

    const stakedDate = details.stakedDate ? `Staked ${details.stakedDate}` : '';
    const rewards = details.rewardsEarned ? `${details.rewardsEarned} Flyz earned` : '';
    const meta = [stakedDate, rewards].filter(Boolean).join(' • ');

    return `
      <div class="staking_footer">
        <div class="staking_level">Staking Level ${details.level}</div>
        <div class="staking_progress_bar">
          <div class="staking_progress_fill" style="width: ${details.progress}%;"></div>
        </div>
        <div class="staking_progress_label">Next level in ${details.daysToNextLevel} days</div>
        ${meta ? `<div class="staking_progress_meta">${meta}</div>` : ''}
      </div>
    `;
  }

  function formatShortDate(date) {
    if (!(date instanceof Date)) {
      return '';
    }
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  function romanize(num) {
    if (!Number.isFinite(num) || num <= 0) {
      return 'I';
    }
    const lookup = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1
    };
    let remaining = Math.floor(num);
    let roman = '';
    Object.keys(lookup).forEach((key) => {
      const value = lookup[key];
      while (remaining >= value) {
        roman += key;
        remaining -= value;
      }
    });
    return roman || 'I';
  }
})();
