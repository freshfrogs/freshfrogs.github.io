(function () {
  const ALCHEMY_API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
  const OPENSEA_API_KEY = '48ffee972fc245fa965ecfe902b02ab4';
  const CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  const STAKING_CONTRACT_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const DEFAULT_IMAGE = '/assets/blackWhite.png';
  const MAX_PAGES = 50; // hard limit so we do not loop forever if Alchemy returns a bad pageKey

  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const nftApiBase = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  const state = {
    connectedWallet: null,
    pageWallet: null,
    web3: null,
    stakingContract: null,
  };

  document.addEventListener('DOMContentLoaded', () => {
    initWeb3Clients();
    state.pageWallet = detectWalletFromLocation();
    wireConnectButton();
    displayRecentSales();
    if (state.pageWallet) {
      loadWalletExperience(state.pageWallet);
    }
  });

  function initWeb3Clients() {
    if (typeof Web3 === 'undefined') {
      console.warn('Web3 is not available; staking stats will be limited.');
      return;
    }
    try {
      state.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
      if (typeof CONTROLLER_ABI !== 'undefined') {
        state.stakingContract = new state.web3.eth.Contract(CONTROLLER_ABI, STAKING_CONTRACT_ADDRESS);
      }
    } catch (error) {
      console.warn('Unable to initialise Web3 client', error);
    }
  }

  function wireConnectButton() {
    const connectLink = document.getElementById('connect-wallet-link');
    if (!connectLink) {
      return;
    }
    connectLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const wallet = await connectWallet();
      if (!wallet) {
        return;
      }
      state.connectedWallet = wallet;
      state.pageWallet = wallet;
      setWalletLabel(wallet);
      loadWalletExperience(wallet);
    });
  }

  async function connectWallet() {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('A browser wallet like MetaMask is required to connect.');
      return null;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const [primary] = Array.isArray(accounts) ? accounts : [];
      if (!isValidWallet(primary)) {
        return null;
      }
      return primary.toLowerCase();
    } catch (error) {
      console.warn('User rejected wallet connection', error);
      return null;
    }
  }

  function detectWalletFromLocation() {
    const url = new URL(window.location.href);
    const queryWallet = url.searchParams.get('wallet');
    if (isValidWallet(queryWallet)) {
      setWalletLabel(queryWallet);
      return queryWallet.toLowerCase();
    }
    const pathPart = url.pathname.replace(/^\//, '');
    const firstSegment = pathPart.split('/')[0];
    if (isValidWallet(firstSegment)) {
      setWalletLabel(firstSegment);
      return firstSegment.toLowerCase();
    }
    return null;
  }

  function isValidWallet(value) {
    return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function setWalletLabel(address) {
    const label = document.getElementById('wallet-address');
    if (label) {
      label.textContent = address;
      label.classList.remove('wallet_invalid');
    }
    const dashboardWallet = document.getElementById('dashboard-wallet');
    if (dashboardWallet) {
      dashboardWallet.textContent = address;
    }
  }

  async function displayRecentSales() {
    const container = document.getElementById('recent-sales');
    if (!container) {
      return;
    }
    setStatus('recent-sales-status', 'Loading recent sales...');
    try {
      const sales = await fetchRecentSales(8);
      if (!sales.length) {
        setStatus('recent-sales-status', 'No recent sales were found.');
        return;
      }
      const cards = sales.map((sale) => createFrogCard(formatSaleAsFrog(sale)));
      container.innerHTML = '';
      cards.forEach((card) => container.appendChild(card));
    } catch (error) {
      console.error('Unable to load recent sales', error);
      setStatus('recent-sales-status', 'Unable to load recent sales.');
    }
  }

  async function loadWalletExperience(wallet) {
    if (!wallet) {
      return;
    }
    setStatus('wallet-frogs-status', 'Loading wallet activity...');
    setStatus('dashboard-status', 'Loading wallet data...');
    try {
      const [profile, owned, communityStaked, rewards] = await Promise.all([
        fetchOpenSeaProfile(wallet),
        fetchNFTsForOwner(wallet),
        fetchNFTsForOwner(STAKING_CONTRACT_ADDRESS),
        fetchUserRewards(wallet),
      ]);
      const userStaked = communityStaked.filter((nft) => isFrogStakedByUser(nft, wallet));
      updateDashboard(wallet, profile, owned, userStaked, rewards);
      displayWalletFrogs({ owned, userStaked, communityStaked });
      clearStatus('wallet-frogs-status');
      clearStatus('dashboard-status');
    } catch (error) {
      console.error('Unable to load wallet experience', error);
      setStatus('wallet-frogs-status', 'Unable to load wallet data.');
      setStatus('dashboard-status', 'Unable to load wallet data.');
    }
  }

  async function fetchRecentSales(limit = 6) {
    const params = new URLSearchParams({
      contractAddress: CONTRACT_ADDRESS,
      limit: String(limit),
      order: 'desc',
    });
    const url = `${nftApiBase}/getNFTSales?${params.toString()}`;
    const data = await fetchJson(url);
    return data.nftSales || [];
  }

  async function fetchNFTsForOwner(owner) {
    if (!owner) {
      return [];
    }
    const results = [];
    let pageKey = null;
    let page = 0;
    do {
      const searchParams = new URLSearchParams({
        owner,
        'contractAddresses[]': CONTRACT_ADDRESS,
        withMetadata: 'true',
        pageSize: '100',
      });
      if (pageKey) {
        searchParams.set('pageKey', pageKey);
      }
      const url = `${nftApiBase}/getNFTsForOwner?${searchParams.toString()}`;
      const data = await fetchJson(url);
      results.push(...(data.ownedNfts || []));
      pageKey = data.pageKey || null;
      page += 1;
    } while (pageKey && page < MAX_PAGES);
    return results;
  }

  async function fetchOpenSeaProfile(address) {
    if (!address) {
      return null;
    }
    const endpoints = [
      `https://api.opensea.io/api/v2/accounts/${address}`,
      `https://api.opensea.io/api/v2/users/${address}`,
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            accept: 'application/json',
            'x-api-key': OPENSEA_API_KEY,
          },
        });
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        const profile = data.account || data.user || data;
        if (!profile) {
          continue;
        }
        const username = profile.username || profile.profile_name || profile.display_name || null;
        const imageUrl = profile.profile_image_url || profile.image_url || profile.profile_img_url || null;
        if (username || imageUrl) {
          return { username, imageUrl };
        }
      } catch (error) {
        console.warn('OpenSea profile lookup failed for', endpoint, error);
      }
    }
    return null;
  }

  async function fetchUserRewards(address) {
    if (!state.stakingContract || !address) {
      return { available: '0', earned: '0' };
    }
    try {
      const [available, stakerInfo] = await Promise.all([
        state.stakingContract.methods.availableRewards(address).call(),
        state.stakingContract.methods.stakers(address).call(),
      ]);
      return {
        available,
        earned: stakerInfo.unclaimedRewards || '0',
      };
    } catch (error) {
      console.warn('Unable to fetch rewards', error);
      return { available: '0', earned: '0' };
    }
  }

  function isFrogStakedByUser(nft, wallet) {
    if (!nft || !wallet) {
      return false;
    }
    const attributes = nft.rawMetadata?.attributes || nft.metadata?.attributes || [];
    const stakerTrait = attributes.find((attribute) => {
      const label = (attribute?.trait_type || attribute?.type || '').toLowerCase();
      return label.includes('staker') || label.includes('owner');
    });
    if (stakerTrait && typeof stakerTrait.value === 'string') {
      return stakerTrait.value.toLowerCase() === wallet.toLowerCase();
    }
    const owner = nft.owner?.toLowerCase?.() || nft.ownerAddress?.toLowerCase?.() || '';
    return owner === wallet.toLowerCase();
  }

  function updateDashboard(wallet, profile, owned, staked, rewards) {
    const username = document.getElementById('dashboard-username');
    const avatar = document.getElementById('dashboard-avatar');
    const badges = {
      owned: document.getElementById('stat-owned'),
      staked: document.getElementById('stat-staked'),
      rewardsAvailable: document.getElementById('stat-rewards-available'),
      rewardsEarned: document.getElementById('stat-rewards-earned'),
      role: document.getElementById('dashboard-role'),
      rewardsInline: document.getElementById('stat-rewards-available-inline'),
    };

    if (username) {
      username.textContent = profile?.username || `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    }
    if (avatar) {
      avatar.src = profile?.imageUrl || DEFAULT_IMAGE;
    }
    if (badges.owned) {
      badges.owned.textContent = owned.length.toString();
    }
    if (badges.staked) {
      badges.staked.textContent = staked.length.toString();
    }
    const available = formatFlyz(rewards.available);
    const earned = formatFlyz(rewards.earned);
    if (badges.rewardsAvailable) {
      badges.rewardsAvailable.textContent = available;
    }
    if (badges.rewardsInline) {
      badges.rewardsInline.textContent = available;
    }
    if (badges.rewardsEarned) {
      badges.rewardsEarned.textContent = earned;
    }
    if (badges.role) {
      badges.role.textContent = deriveRoleLabel(owned.length, staked.length);
    }
  }

  function displayWalletFrogs(sectionsData) {
    const container = document.getElementById('wallet-frogs');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    const sections = [
      { title: 'Owned Frogs', frogs: sectionsData.owned },
      { title: 'Staked Frogs (You)', frogs: sectionsData.userStaked },
      { title: 'Community Pond', frogs: sectionsData.communityStaked },
    ];
    sections.forEach((section) => {
      const sectionElement = document.createElement('div');
      sectionElement.className = 'wallet_section';
      const header = document.createElement('p');
      header.className = 'recent_sale_header';
      header.textContent = `${section.title} (${section.frogs.length})`;
      sectionElement.appendChild(header);
      const grid = document.createElement('div');
      grid.className = 'recent_sales wallet_frogs_grid';
      if (!section.frogs.length) {
        const empty = document.createElement('p');
        empty.className = 'recent_sales_status';
        empty.textContent = 'No frogs found.';
        grid.appendChild(empty);
      } else {
        section.frogs.forEach((frog) => {
          grid.appendChild(createFrogCard(formatNFTAsFrog(frog)));
        });
      }
      sectionElement.appendChild(grid);
      container.appendChild(sectionElement);
    });
  }

  function formatSaleAsFrog(sale) {
    const nft = sale.nft || sale.token || sale;
    const tokenId = parseTokenId(nft?.tokenId || sale.tokenId);
    const imageUrl = extractImageUrl(nft);
    const price = formatEth(sale.price?.amount?.raw || sale.sellerFee?.amount?.[0]?.raw || sale.totalPrice);
    const buyer = sale.buyerAddress || sale.to || sale.taker;
    return {
      title: `Frog #${tokenId}`,
      subtitle: price ? `${price} ETH` : 'Sale',
      description: buyer ? `Bought by ${shortenAddress(buyer)}` : 'Recent sale',
      imageUrl,
      tokenId,
      rarity: rarityMap[tokenId],
      context: 'Recent Sale',
    };
  }

  function formatNFTAsFrog(nft) {
    const tokenId = parseTokenId(nft.id?.tokenId || nft.tokenId);
    const imageUrl = extractImageUrl(nft);
    const context = nft.ownerAddress === STAKING_CONTRACT_ADDRESS ? 'Staked' : 'Owned';
    return {
      title: nft.title || `Frog #${tokenId}`,
      subtitle: context,
      description: extractPrimaryTrait(nft),
      imageUrl,
      tokenId,
      rarity: rarityMap[tokenId],
      context,
    };
  }

  function createFrogCard(data) {
    const card = document.createElement('div');
    card.className = 'recent_sale_card';

    const header = document.createElement('div');
    header.className = 'recent_sale_header';
    const title = document.createElement('strong');
    title.className = 'sale_card_title';
    title.textContent = data.title || 'Frog';
    const price = document.createElement('strong');
    price.className = 'sale_card_price';
    price.textContent = data.subtitle || '';
    header.appendChild(title);
    header.appendChild(price);
    const clear = document.createElement('div');
    clear.style.clear = 'both';
    header.appendChild(clear);
    card.appendChild(header);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'frog_img_cont';
    const image = document.createElement('img');
    image.className = 'recent_sale_img';
    image.src = data.imageUrl || DEFAULT_IMAGE;
    image.alt = data.title || 'Frog';
    imgWrap.appendChild(image);
    card.appendChild(imgWrap);

    const traits = document.createElement('div');
    traits.className = 'recent_sale_traits';
    const rarity = document.createElement('p');
    rarity.className = `rarity_badge ${getRarityClass(data.rarity)}`;
    rarity.textContent = data.rarity ? `Rank #${data.rarity}` : 'Rank N/A';
    traits.appendChild(rarity);
    const desc = document.createElement('div');
    desc.className = 'recent_sale_properties';
    desc.textContent = data.description || 'Fresh Frog discovery';
    traits.appendChild(desc);
    card.appendChild(traits);

    return card;
  }

  function extractPrimaryTrait(nft) {
    const attributes = nft.rawMetadata?.attributes || nft.metadata?.attributes;
    if (!Array.isArray(attributes) || !attributes.length) {
      return 'Awaiting metadata';
    }
    const topTrait = attributes[0];
    if (!topTrait) {
      return 'Unique trait';
    }
    const label = topTrait.trait_type || topTrait.type || 'Trait';
    return `${label}: ${topTrait.value}`;
  }

  function extractImageUrl(nft) {
    return (
      nft?.rawMetadata?.image ||
      nft?.image?.cachedUrl ||
      nft?.image?.pngUrl ||
      nft?.media?.[0]?.gateway ||
      nft?.media?.[0]?.thumbnail ||
      DEFAULT_IMAGE
    );
  }

  function formatFlyz(value) {
    const wei = typeof value === 'string' ? value : '0';
    if (!/^[0-9]+$/.test(wei)) {
      return '0';
    }
    const amount = Number(BigInt(wei)) / 1e18;
    return amount.toFixed(2);
  }

  function formatEth(raw) {
    if (!raw) {
      return '';
    }
    try {
      const value = Number(BigInt(raw)) / 1e18;
      return value.toFixed(2);
    } catch (error) {
      return '';
    }
  }

  function deriveRoleLabel(owned, staked) {
    if (staked >= 10) {
      return 'Master of the Pond';
    }
    if (owned + staked >= 5) {
      return 'Seasoned Keeper';
    }
    if (owned + staked > 0) {
      return 'Pond Explorer';
    }
    return 'New Explorer';
  }

  function parseTokenId(tokenId) {
    if (!tokenId) {
      return '--';
    }
    if (typeof tokenId === 'string' && tokenId.startsWith('0x')) {
      return parseInt(tokenId, 16).toString();
    }
    return tokenId.toString();
  }

  function buildRarityMap(rankings) {
    return rankings.reduce((map, entry) => {
      if (!entry || typeof entry.id === 'undefined') {
        return map;
      }
      const id = Number(entry.id);
      map[id] = entry.ranking || entry.rank || 'N/A';
      return map;
    }, {});
  }

  function getRarityClass(rank) {
    if (!rank || rank === 'N/A') {
      return 'rarity_unknown';
    }
    if (rank <= 50) {
      return 'rarity_legendary';
    }
    if (rank <= 500) {
      return 'rarity_epic';
    }
    if (rank <= 1500) {
      return 'rarity_rare';
    }
    return 'rarity_common';
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }

  function setStatus(id, message) {
    if (!id) {
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  function clearStatus(id) {
    if (!id) {
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  function shortenAddress(address) {
    if (!address || address.length < 10) {
      return address || 'Unknown';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
})();
