(function () {
  const API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
  const OPENSEA_API_KEY = '48ffee972fc245fa965ecfe902b02ab4';
  const DEFAULT_PROFILE_IMAGE = '/assets/blackWhite.png';
  const CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  const STAKING_CONTRACT_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const STAKING_CONTRACT_LOWER = STAKING_CONTRACT_ADDRESS.toLowerCase();
  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();
  const priceCache = new Map();
  const stakingDetailsCache = new Map();
  const web3ProviderUrl = `https://eth-mainnet.g.alchemy.com/v2/${API_KEY}`;
  let browserProvider = detectBrowserProvider();
  let isBrowserWalletProvider = Boolean(browserProvider);
  let web3 = initWeb3(browserProvider);
  let stakingContract = initStakingContract(web3);
  let collectionContract = initCollectionContract(web3);
  let stakingProviderWarningShown = false;
  let providerEventsBound = false;
  let walletViewsRefreshScheduled = false;
  let dashboardWalletPrompted = false;

  document.addEventListener('DOMContentLoaded', () => {
    setupWalletConnector();
    setupFrogActionHandler();
    monitorBrowserProvider();
    if (document.getElementById('recent-sales')) {
      loadRecentSales();
    }
    if (document.getElementById('wallet-frogs')) {
      loadWalletFrogs();
    }
    if (document.getElementById('wallet-dashboard')) {
      loadWalletDashboard();
    }
  });

  let frogActionHandlerInitialized = false;

  function setupWalletConnector() {
    const connectLink = document.getElementById('connect-wallet-link');
    if (!connectLink) {
      return;
    }

    connectLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const provider = getBrowserProvider();
      if (!provider || typeof provider.request !== 'function') {
        alert('A Web3 wallet (like MetaMask) is required to connect.');
        return;
      }

      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const primaryAccount = Array.isArray(accounts) ? accounts[0] : null;

        if (isValidWalletAddress(primaryAccount)) {
          dashboardWalletPrompted = true;
          const normalized = primaryAccount.toLowerCase();
          const targetUrl = deriveWalletRedirect(normalized);
          window.location.href = targetUrl;
        }
      } catch (error) {
        console.warn('Wallet connection was not completed', error);
      }
    });
  }

  function deriveWalletRedirect(walletAddress) {
    const destination =
      (document.body && document.body.dataset && document.body.dataset.connectDestination) || 'wallet';

    if (destination === 'dashboard') {
      const params = new URLSearchParams({ wallet: walletAddress });
      return `${window.location.origin}/dashboard/?${params.toString()}`;
    }

    return `${window.location.origin}/${walletAddress}`;
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

  function getBrowserProvider() {
    if (browserProvider && typeof browserProvider.request === 'function') {
      return browserProvider;
    }
    const detected = detectBrowserProvider();
    if (detected) {
      handleBrowserProviderDetected(detected);
    }
    return browserProvider;
  }

  function handleBrowserProviderDetected(provider) {
    if (!provider) {
      return;
    }
    browserProvider = provider;
    isBrowserWalletProvider = true;
    refreshContractsWithProvider(provider);
    bindProviderEvents(provider);
    if (document.readyState !== 'loading') {
      scheduleWalletViewsRefresh();
    }
  }

  function monitorBrowserProvider() {
    const provider = getBrowserProvider();
    if (provider) {
      if (!providerEventsBound) {
        handleBrowserProviderDetected(provider);
      }
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const handleInitialization = () => {
      const detected = getBrowserProvider();
      if (detected) {
        scheduleWalletViewsRefresh();
      }
    };

    window.addEventListener('ethereum#initialized', handleInitialization, { once: true });
    setTimeout(handleInitialization, 1500);
  }

  function refreshContractsWithProvider(provider) {
    web3 = initWeb3(provider || null);
    stakingContract = initStakingContract(web3);
    collectionContract = initCollectionContract(web3);
  }

  function bindProviderEvents(provider) {
    if (!provider || providerEventsBound || typeof provider.on !== 'function') {
      return;
    }
    providerEventsBound = true;
    provider.on('connect', handleProviderConnect);
    provider.on('disconnect', handleProviderDisconnect);
    provider.on('accountsChanged', handleAccountsChanged);
  }

  function handleProviderConnect() {
    isBrowserWalletProvider = true;
    dashboardWalletPrompted = false;
    scheduleWalletViewsRefresh();
  }

  function handleProviderDisconnect() {
    browserProvider = null;
    isBrowserWalletProvider = false;
    providerEventsBound = false;
    dashboardWalletPrompted = false;
    refreshContractsWithProvider(null);
    scheduleWalletViewsRefresh();
    monitorBrowserProvider();
  }

  function handleAccountsChanged() {
    dashboardWalletPrompted = false;
    scheduleWalletViewsRefresh();
  }

  function scheduleWalletViewsRefresh() {
    if (walletViewsRefreshScheduled) {
      return;
    }
    walletViewsRefreshScheduled = true;
    setTimeout(() => {
      walletViewsRefreshScheduled = false;
      if (document.getElementById('wallet-frogs')) {
        clearWalletFrogsContent();
        loadWalletFrogs();
      }
      if (document.getElementById('wallet-dashboard')) {
        loadWalletDashboard();
      }
    }, 100);
  }

  function clearWalletFrogsContent() {
    const container = document.getElementById('wallet-frogs');
    if (!container) {
      return;
    }
    const cards = container.querySelectorAll('.frog_card');
    cards.forEach((card) => card.remove());
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
    clearWalletFrogsContent();
    let walletAddress = detectWalletAddress();
    const providerWallet = await detectProviderWallet();

    if (!walletAddress && providerWallet) {
      walletAddress = providerWallet;
    }

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

      const normalizedWallet = walletAddress.toLowerCase();
      const normalizedProvider = providerWallet ? providerWallet.toLowerCase() : null;
      const walletLabel = formatOwnerAddress(walletAddress);
      const canManage = normalizedProvider && normalizedProvider === normalizedWallet;
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
            priceLabel: priceInfo ? priceInfo.label : '',
            actionContext: canManage
              ? { tokenId, isStaked: false, canManage: true }
              : null
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
            stakingDetails,
            actionContext: canManage
              ? { tokenId, isStaked: true, canManage: true }
              : null
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

  async function loadWalletDashboard() {
    const usernameEl = document.getElementById('dashboard-username');
    const walletLabelEl = document.getElementById('dashboard-wallet');
    const avatarEl = document.getElementById('dashboard-avatar');
    const statusEl = document.getElementById('dashboard-status');
    const ownedEl = document.getElementById('stat-owned');
    const stakedEl = document.getElementById('stat-staked');
    const rewardsEarnedEl = document.getElementById('stat-rewards-earned');
    const rewardsAvailableEl = document.getElementById('stat-rewards-available');
    const rewardsAvailableInlineEl = document.getElementById('stat-rewards-available-inline');

    if (!usernameEl || !walletLabelEl || !avatarEl || !statusEl || !ownedEl || !stakedEl || !rewardsEarnedEl || !rewardsAvailableEl) {
      return;
    }

    let walletAddress = detectWalletAddress();

    if (!walletAddress) {
      const providerWallet = await detectProviderWallet();
      if (providerWallet) {
        walletAddress = providerWallet;
      }
    }

    if (!walletAddress && shouldPromptForDashboardWallet() && !dashboardWalletPrompted) {
      dashboardWalletPrompted = true;
      try {
        walletAddress = await requestProviderWallet();
      } catch (error) {
        console.warn('User dismissed wallet connection request', error);
      }
    }

    if (!walletAddress) {
      walletLabelEl.textContent = 'No wallet detected';
      walletLabelEl.classList.add('wallet_invalid');
      statusEl.textContent = 'Connect your wallet above to load your dashboard.';
      ownedEl.textContent = '--';
      stakedEl.textContent = '--';
      rewardsEarnedEl.textContent = '--';
      rewardsAvailableEl.textContent = '--';
      if (rewardsAvailableInlineEl) {
        rewardsAvailableInlineEl.textContent = '--';
      }
      updateDashboardVisuals({ totalFrogs: 0, stakedCount: 0, rewardsEarned: null, rewardsAvailable: null });
      return;
    }

    const normalizedWallet = walletAddress.toLowerCase();
    walletLabelEl.textContent = normalizedWallet;
    walletLabelEl.classList.remove('wallet_invalid');
    const fallbackName = formatOwnerAddress(normalizedWallet);
    usernameEl.textContent = fallbackName;
    statusEl.textContent = 'Loading dashboard...';
    statusEl.classList.remove('dashboard_status_success');

    try {
      const [profile, ownedTokens, stakedTokens, rewardsAvailable, stakerSnapshot] = await Promise.all([
        fetchOpenSeaProfile(normalizedWallet),
        fetchOwnedFrogs(normalizedWallet),
        fetchStakedFrogs(normalizedWallet),
        fetchAvailableRewards(normalizedWallet),
        fetchStakerSnapshot(normalizedWallet)
      ]);

      const profileImage = profile && profile.imageUrl ? profile.imageUrl : getDefaultProfileImage();
      const profileName = profile && profile.username ? profile.username : fallbackName;
      const ownedCount = ownedTokens ? ownedTokens.length : 0;
      const stakedCount = stakedTokens ? stakedTokens.length : 0;
      const totalFrogs = ownedCount + stakedCount;
      const rewardsEarnedNumber = stakerSnapshot && typeof stakerSnapshot.unclaimedRewards === 'number'
        ? stakerSnapshot.unclaimedRewards
        : null;
      const rewardsAvailableNumber = typeof rewardsAvailable === 'number' ? rewardsAvailable : null;

      avatarEl.src = profileImage;
      usernameEl.textContent = profileName;

      ownedEl.textContent = ownedCount;
      stakedEl.textContent = stakedCount;

      const formattedEarned = formatFlyzValue(rewardsEarnedNumber);
      const formattedAvailable = formatFlyzValue(rewardsAvailableNumber);
      rewardsEarnedEl.textContent = formattedEarned;
      rewardsAvailableEl.textContent = formattedAvailable;
      if (rewardsAvailableInlineEl) {
        rewardsAvailableInlineEl.textContent = formattedAvailable;
      }

      updateDashboardVisuals({
        totalFrogs,
        stakedCount,
        rewardsEarned: rewardsEarnedNumber,
        rewardsAvailable: rewardsAvailableNumber
      });

      statusEl.textContent = 'Dashboard updated with your latest stats.';
      statusEl.classList.add('dashboard_status_success');
    } catch (error) {
      console.error('Unable to load dashboard data', error);
      statusEl.textContent = 'Unable to load dashboard data. Please refresh and make sure your wallet is connected.';
      updateDashboardVisuals({ totalFrogs: 0, stakedCount: 0, rewardsEarned: null, rewardsAvailable: null });
    }
  }

  function updateDashboardVisuals(metrics) {
    const totalFrogs = Number.isFinite(metrics.totalFrogs) ? metrics.totalFrogs : 0;
    const stakedCount = Number.isFinite(metrics.stakedCount) ? metrics.stakedCount : 0;
    const rewardsEarned = Number.isFinite(metrics.rewardsEarned) ? metrics.rewardsEarned : null;
    const rewardsAvailable = Number.isFinite(metrics.rewardsAvailable) ? metrics.rewardsAvailable : null;
    const progressPercent = totalFrogs > 0 ? Math.min(100, Math.round((stakedCount / totalFrogs) * 100)) : 0;
    const roleLabel = deriveDashboardRole(totalFrogs, stakedCount);

    const roleEl = document.getElementById('dashboard-role');
    if (roleEl) {
      roleEl.textContent = roleLabel;
    }

    const badgesEl = document.getElementById('dashboard-badges');
    if (badgesEl) {
      badgesEl.innerHTML = buildDashboardBadges(totalFrogs, stakedCount, rewardsEarned, rewardsAvailable, roleLabel);
    }

    const progressFillEl = document.getElementById('dashboard-progress-fill');
    if (progressFillEl) {
      progressFillEl.style.width = `${progressPercent}%`;
      progressFillEl.setAttribute('aria-valuenow', progressPercent.toString());
    }

    const progressLabelEl = document.getElementById('dashboard-progress-label');
    if (progressLabelEl) {
      progressLabelEl.textContent = totalFrogs
        ? `${stakedCount} of ${totalFrogs} frogs are staking`
        : 'Connect your wallet to start staking.';
    }

    const progressValueEl = document.getElementById('dashboard-progress-value');
    if (progressValueEl) {
      progressValueEl.textContent = `${progressPercent}%`;
    }
  }

  function deriveDashboardRole(totalFrogs, stakedCount) {
    const total = Number.isFinite(totalFrogs) ? totalFrogs : 0;
    const staked = Number.isFinite(stakedCount) ? stakedCount : 0;

    if (staked >= 25) {
      return 'Pond Guardian';
    }
    if (staked >= 10) {
      return 'Flyz Farmer';
    }
    if (staked >= 5) {
      return 'Tadpole Trainer';
    }
    if (total >= 5) {
      return 'Frog Wrangler';
    }
    if (total >= 1) {
      return 'Frog Keeper';
    }
    return 'New Explorer';
  }

  function buildDashboardBadges(totalFrogs, stakedCount, rewardsEarned, rewardsAvailable, roleLabel) {
    const normalizedTotal = Number.isFinite(totalFrogs) ? totalFrogs : 0;
    const normalizedStaked = Number.isFinite(stakedCount) ? stakedCount : 0;
    const idleFrogs = Math.max(0, normalizedTotal - normalizedStaked);
    const hasRewards = (typeof rewardsAvailable === 'number' && rewardsAvailable > 0) || (typeof rewardsEarned === 'number' && rewardsEarned > 0);
    const earnedDesc = describeFlyzValue(rewardsEarned, 'No Flyz earned yet');
    const availableDesc = describeFlyzValue(rewardsAvailable, 'No Flyz available');
    const rewardDesc = hasRewards ? `${availableDesc} ready • ${earnedDesc} total` : 'Stake frogs to earn Flyz';
    const role = roleLabel || deriveDashboardRole(normalizedTotal, normalizedStaked);

    const badges = [
      {
        icon: '🐸',
        title: 'Collection',
        desc: normalizedTotal ? `${normalizedTotal} frogs discovered` : 'No frogs detected yet'
      },
      {
        icon: '🌿',
        title: 'Staking',
        desc: normalizedStaked ? `${normalizedStaked} frogs earning Flyz` : 'Stake frogs to boost Flyz'
      },
      {
        icon: '💰',
        title: 'Rewards',
        desc: rewardDesc
      },
      {
        icon: '⭐',
        title: 'Status',
        desc: idleFrogs ? `${idleFrogs} frogs idle • ${role}` : role
      }
    ];

    return badges
      .map(
        (badge) => `
        <div class="dashboard_badge">
          <span class="dashboard_badge_icon">${badge.icon}</span>
          <div>
            <span class="dashboard_badge_title">${badge.title}</span>
            <span class="dashboard_badge_desc">${badge.desc}</span>
          </div>
        </div>
      `
      )
      .join('');
  }

  function describeFlyzValue(value, fallbackText) {
    if (typeof value === 'number' && value > 0) {
      return `${value.toFixed(2)} Flyz`;
    }
    return fallbackText || '0 Flyz';
  }

  async function buildWalletCard(token, walletLabel) {
    const metadata = token.metadata || (await fetchFrogMetadata(token.tokenId));
    const headerRight = typeof token.priceLabel !== 'undefined' ? token.priceLabel : await derivePriceLabel(token.tokenId);
    const footerHtml = token.isStaked && token.stakingDetails ? buildStakingFooter(token.stakingDetails) : '';
    const actionHtml = token.actionContext ? buildActionButtons(token.actionContext) : '';
    return createFrogCard({
      tokenId: token.tokenId,
      metadata,
      headerLeft: walletLabel,
      headerRight,
      footerHtml,
      actionHtml
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

  async function detectProviderWallet() {
    const provider = getBrowserProvider();
    if (!provider || typeof provider.request !== 'function') {
      return null;
    }

    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (Array.isArray(accounts) && accounts.length) {
        const candidate = accounts[0];
        if (isValidWalletAddress(candidate)) {
          return candidate;
        }
      }
      return null;
    } catch (error) {
      console.warn('Unable to detect wallet from provider', error);
      return null;
    }
  }

  function shouldPromptForDashboardWallet() {
    const provider = getBrowserProvider();
    return Boolean(document.getElementById('wallet-dashboard')) && !!provider && typeof provider.request === 'function';
  }

  async function requestProviderWallet() {
    const provider = getBrowserProvider();
    if (!provider || typeof provider.request !== 'function') {
      return null;
    }

    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (Array.isArray(accounts) && accounts.length) {
      const candidate = accounts[0];
      if (isValidWalletAddress(candidate)) {
        return candidate;
      }
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

  async function fetchAvailableRewards(walletAddress) {
    if (!stakingContract || !walletAddress) {
      return null;
    }

    try {
      const rawRewards = await stakingContract.methods.availableRewards(walletAddress).call();
      return weiToFloat(rawRewards);
    } catch (error) {
      console.warn('Unable to fetch available rewards', error);
      return null;
    }
  }

  async function fetchStakerSnapshot(walletAddress) {
    if (!stakingContract || !walletAddress || typeof stakingContract.methods.stakers !== 'function') {
      return null;
    }

    try {
      const snapshot = await stakingContract.methods.stakers(walletAddress).call();
      const unclaimed = snapshot && (snapshot.unclaimedRewards || snapshot[2] || '0');
      const amountStaked = snapshot && (snapshot.amountStaked || snapshot[0] || '0');
      return {
        amountStaked: Number(amountStaked) || 0,
        unclaimedRewards: weiToFloat(unclaimed)
      };
    } catch (error) {
      console.warn('Unable to fetch staker snapshot', error);
      return null;
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

  function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml }) {
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
        ${actionHtml || ''}
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

  function buildActionButtons(context) {
    if (!context || !context.canManage || !context.tokenId) {
      return '';
    }

    const containerClass = context.isStaked
      ? 'frog_card_actions frog_card_actions--staked'
      : 'frog_card_actions frog_card_actions--owned';

    const actions = context.isStaked
      ? [
          { key: 'unstake', label: 'Unstake', className: 'frog_action_button--unstake' }
        ]
      : [
          { key: 'stake', label: 'Stake', className: 'frog_action_button--stake' },
          { key: 'transfer', label: 'Transfer', className: 'frog_action_button--transfer' },
          { key: 'list', label: 'Listing', className: 'frog_action_button--list' }
        ];

    const buttons = actions
      .map(
        (action) => `
        <button
          class="frog_action_button ${action.className}"
          data-frog-action="${action.key}"
          data-token-id="${context.tokenId}"
          type="button"
        >
          ${action.label}
        </button>
      `
      )
      .join('');

    return `<div class="${containerClass}">${buttons}</div>`;
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

  async function fetchOpenSeaProfile(walletAddress) {
    if (!walletAddress) {
      return null;
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const headers = { Accept: 'application/json' };
    if (OPENSEA_API_KEY) {
      headers['X-API-KEY'] = OPENSEA_API_KEY;
    }

    const endpoints = [
      `https://api.opensea.io/api/v2/accounts/ethereum/${normalizedWallet}`,
      `https://api.opensea.io/api/v2/accounts/${normalizedWallet}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers });
        if (response.status === 404) {
          continue;
        }
        if (!response.ok) {
          throw new Error('OpenSea profile request failed');
        }
        const payload = await response.json();
        const account = payload && (payload.account || payload.data || payload);
        const profile = account && (account.profile || account.user || account);
        const username = deriveOpenSeaUsername(profile);
        const imageUrl = deriveOpenSeaImage(profile, account);
        return {
          username: username ? username : null,
          imageUrl: imageUrl ? imageUrl : null
        };
      } catch (error) {
        console.warn('OpenSea profile lookup failed via', endpoint, error);
      }
    }

    return null;
  }

  function deriveOpenSeaUsername(profile) {
    if (!profile) {
      return null;
    }
    if (profile.username) {
      return profile.username;
    }
    if (profile.display_name) {
      return profile.display_name;
    }
    if (profile.user && profile.user.username) {
      return profile.user.username;
    }
    if (profile.metadata && profile.metadata.username) {
      return profile.metadata.username;
    }
    return null;
  }

  function deriveOpenSeaImage(profile, fallback) {
    if (profile) {
      if (profile.profile_image_url) {
        return profile.profile_image_url;
      }
      if (profile.profile_img_url) {
        return profile.profile_img_url;
      }
      if (profile.image_url) {
        return profile.image_url;
      }
      if (profile.avatar) {
        return profile.avatar;
      }
      if (profile.metadata && profile.metadata.profile_image_url) {
        return profile.metadata.profile_image_url;
      }
    }

    if (fallback && fallback.profile_image_url) {
      return fallback.profile_image_url;
    }
    if (fallback && fallback.profile_img_url) {
      return fallback.profile_img_url;
    }
    return null;
  }

  function getDefaultProfileImage() {
    return DEFAULT_PROFILE_IMAGE;
  }

  function formatFlyzValue(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '--';
    }
    return `${value.toFixed(2)} Flyz`;
  }

  function weiToFloat(value) {
    if (value === null || typeof value === 'undefined') {
      return 0;
    }
    try {
      const stringValue = typeof value === 'string' ? value : value.toString();
      if (web3 && web3.utils && typeof web3.utils.fromWei === 'function') {
        const formatted = web3.utils.fromWei(stringValue, 'ether');
        return Number.parseFloat(formatted);
      }
      const bigValue = BigInt(stringValue);
      const divisor = 10n ** 18n;
      const whole = Number(bigValue / divisor);
      const fraction = Number(bigValue % divisor) / 1e18;
      return whole + fraction;
    } catch (error) {
      console.warn('Unable to convert wei value', error);
      return 0;
    }
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
        <div class="staking_progress_label">Next level in ${typeof details.daysToNextLevel === 'number' ? details.daysToNextLevel : '?'} days</div>
        ${meta ? `<div class="staking_progress_meta">${meta}</div>` : ''}
      </div>
    `;
  }

  function setupFrogActionHandler() {
    if (frogActionHandlerInitialized) {
      return;
    }
    document.addEventListener('click', handleFrogActionClick);
    frogActionHandlerInitialized = true;
  }

  function handleFrogActionClick(event) {
    const actionButton = event.target.closest('[data-frog-action]');
    if (!actionButton) {
      return;
    }
    event.preventDefault();
    const action = actionButton.getAttribute('data-frog-action');
    const tokenIdValue = actionButton.getAttribute('data-token-id');
    const tokenId = Number(tokenIdValue);
    if (!action || !Number.isInteger(tokenId) || tokenId <= 0) {
      return;
    }
    handleFrogAction(action, tokenId);
  }

  async function handleFrogAction(action, tokenId) {
    try {
      switch (action) {
        case 'stake':
          await stakeFrog(tokenId);
          break;
        case 'unstake':
          await unstakeFrog(tokenId);
          break;
        case 'transfer':
          await transferFrog(tokenId);
          break;
        case 'list':
          openListingOnOpenSea(tokenId);
          break;
        default:
          break;
      }
    } catch (error) {
      if (error && error.code === 4001) {
        console.warn('User rejected the transaction request');
        return;
      }
      alert('Unable to complete this action. Please try again.');
      console.warn('Unable to process frog action', action, error);
    }
  }

  async function stakeFrog(tokenId) {
    const provider = getBrowserProvider();
    if (!stakingContract || !collectionContract || !provider) {
      alert('A connected Web3 wallet is required to stake frogs.');
      return;
    }

    const wallet = await requireWalletAccount();
    const normalizedWallet = wallet.toLowerCase();

    const owner = await collectionContract.methods.ownerOf(tokenId).call();
    const normalizedOwner = owner.toLowerCase();

    if (normalizedOwner === STAKING_CONTRACT_LOWER) {
      alert(`Frog #${tokenId} is already staked.`);
      return;
    }

    if (normalizedOwner !== normalizedWallet) {
      alert('You must own this frog before staking it.');
      return;
    }

    const approved = await collectionContract.methods
      .isApprovedForAll(normalizedWallet, STAKING_CONTRACT_ADDRESS)
      .call({ from: normalizedWallet });

    if (!approved) {
      const shouldApprove = confirm('Approve the staking contract to manage your frogs? This is required before staking.');
      if (!shouldApprove) {
        alert('Approval is required before staking.');
        return;
      }
      await collectionContract.methods
        .setApprovalForAll(STAKING_CONTRACT_ADDRESS, true)
        .send({ from: normalizedWallet });
    }

    await stakingContract.methods.stake(tokenId).send({ from: normalizedWallet });
    alert(`Stake transaction submitted for Frog #${tokenId}. Check your wallet for status.`);
  }

  async function unstakeFrog(tokenId) {
    const provider = getBrowserProvider();
    if (!stakingContract || !provider) {
      alert('A connected Web3 wallet is required to unstake frogs.');
      return;
    }

    const wallet = await requireWalletAccount();
    const normalizedWallet = wallet.toLowerCase();

    let staker = null;
    try {
      staker = await stakingContract.methods.stakerAddress(tokenId).call();
    } catch (error) {
      console.warn('Unable to determine staker address', error);
    }

    if (!staker || staker.toLowerCase() !== normalizedWallet) {
      alert('This frog is not currently staked by your wallet.');
      return;
    }

    await stakingContract.methods.withdraw(tokenId).send({ from: normalizedWallet });
    alert(`Withdrawal transaction submitted for Frog #${tokenId}. Check your wallet for status.`);
  }

  async function transferFrog(tokenId) {
    const provider = getBrowserProvider();
    if (!collectionContract || !provider) {
      alert('A connected Web3 wallet is required to transfer frogs.');
      return;
    }

    const wallet = await requireWalletAccount();
    const normalizedWallet = wallet.toLowerCase();
    const owner = await collectionContract.methods.ownerOf(tokenId).call();

    if (owner.toLowerCase() !== normalizedWallet) {
      alert('You must own this frog before transferring it.');
      return;
    }

    const destination = prompt(`Enter the wallet address to receive Frog #${tokenId}:`);
    if (!destination) {
      alert('Transfer cancelled.');
      return;
    }

    const trimmedDestination = destination.trim();
    if (!isValidWalletAddress(trimmedDestination)) {
      alert('Transfer cancelled: invalid wallet address.');
      return;
    }

    await collectionContract.methods
      .safeTransferFrom(normalizedWallet, trimmedDestination, tokenId)
      .send({ from: normalizedWallet });
    alert(`Transfer transaction submitted for Frog #${tokenId}.`);
  }

  function openListingOnOpenSea(tokenId) {
    const url = `https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${tokenId}/sell`;
    window.open(url, '_blank', 'noopener');
  }

  async function requireWalletAccount() {
    const provider = getBrowserProvider();
    if (!provider || typeof provider.request !== 'function') {
      throw new Error('Wallet provider unavailable');
    }

    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const candidate = Array.isArray(accounts) && accounts.length ? accounts[0] : null;
    if (!isValidWalletAddress(candidate)) {
      throw new Error('Wallet account unavailable');
    }
    return candidate;
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

