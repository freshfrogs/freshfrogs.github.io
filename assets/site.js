(function () {
  const CONFIG = {
    alchemyKey: 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ',
    openseaKey: '48ffee972fc245fa965ecfe902b02ab4',
    collection: '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b',
    stakingContract: '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199',
    defaultImage: '/assets/blackWhite.png',
  };

  const state = {
    viewingWallet: null,
    connectedWallet: null,
    stakingContract: null,
    rarity: buildRarityMap(window.freshfrogs_rarity_rankings || []),
  };

  const nftApiBase = `https://eth-mainnet.g.alchemy.com/nft/v3/${CONFIG.alchemyKey}`;
  const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${CONFIG.alchemyKey}`;

  document.addEventListener('DOMContentLoaded', () => {
    state.viewingWallet = readWalletFromUrl();
    initWeb3();
    wireConnectButton();
    loadRecentSales();
    if (state.viewingWallet) {
      hydrateWallet(state.viewingWallet);
    }
  });

  function wireConnectButton() {
    const link = document.getElementById('connect-wallet-link');
    if (!link) {
      return;
    }
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const wallet = await connectWallet();
      if (!wallet) {
        return;
      }
      state.connectedWallet = wallet;
      state.viewingWallet = wallet;
      setWalletLabels(wallet);
      hydrateWallet(wallet);
    });
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Install MetaMask or another wallet to continue.');
      return null;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = (accounts && accounts[0]) || null;
      return isWallet(wallet) ? wallet.toLowerCase() : null;
    } catch (error) {
      console.warn('Wallet connection rejected', error);
      return null;
    }
  }

  function readWalletFromUrl() {
    const url = new URL(window.location.href);
    const searchWallet = url.searchParams.get('wallet');
    if (isWallet(searchWallet)) {
      setWalletLabels(searchWallet);
      return searchWallet.toLowerCase();
    }
    const path = url.pathname.replace(/^\//, '').split('/')[0];
    if (isWallet(path)) {
      setWalletLabels(path);
      return path.toLowerCase();
    }
    return null;
  }

  function isWallet(value) {
    return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function setWalletLabels(wallet) {
    const el = document.getElementById('wallet-address');
    if (el) {
      el.textContent = wallet;
      el.classList.remove('wallet_invalid');
    }
    const dashboardWallet = document.getElementById('dashboard-wallet');
    if (dashboardWallet) {
      dashboardWallet.textContent = wallet;
    }
  }

  function initWeb3() {
    if (typeof Web3 === 'undefined') {
      return;
    }
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
      if (typeof CONTROLLER_ABI !== 'undefined') {
        state.stakingContract = new web3.eth.Contract(CONTROLLER_ABI, CONFIG.stakingContract);
      }
    } catch (error) {
      console.warn('Web3 unavailable', error);
    }
  }

  async function hydrateWallet(wallet) {
    if (!wallet) {
      return;
    }
    setStatus('wallet-frogs-status', 'Loading wallet frogs...');
    setStatus('dashboard-status', 'Loading wallet data...');
    try {
      const [profile, owned, contractHoldings, rewards] = await Promise.all([
        fetchOpenSeaProfile(wallet),
        fetchOwnerFrogs(wallet),
        fetchOwnerFrogs(CONFIG.stakingContract),
        fetchUserRewards(wallet),
      ]);
      const userStaked = contractHoldings.filter((nft) => isUserStake(nft, wallet));
      updateDashboard(wallet, profile, owned, userStaked, rewards);
      renderWalletSections({
        owned,
        userStaked,
        community: contractHoldings,
      });
      clearStatus('wallet-frogs-status');
      clearStatus('dashboard-status');
    } catch (error) {
      console.error('Unable to hydrate wallet', error);
      setStatus('wallet-frogs-status', 'Unable to load wallet frogs.');
      setStatus('dashboard-status', 'Unable to load wallet data.');
    }
  }

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    if (!container) {
      return;
    }
    setStatus('recent-sales-status', 'Loading recent sales...');
    try {
      const sales = await fetchRecentSales(8);
      container.innerHTML = '';
      if (!sales.length) {
        const empty = document.createElement('p');
        empty.className = 'recent_sales_status';
        empty.textContent = 'No recent sales yet.';
        container.appendChild(empty);
        return;
      }
      sales.map(formatSale).map(createFrogCard).forEach((card) => container.appendChild(card));
    } catch (error) {
      console.error('Unable to load sales', error);
      setStatus('recent-sales-status', 'Unable to load recent sales.');
    }
  }

  async function fetchRecentSales(limit) {
    const params = new URLSearchParams({
      contractAddress: CONFIG.collection,
      limit: String(limit || 6),
      order: 'desc',
    });
    const url = `${nftApiBase}/getNFTSales?${params.toString()}`;
    const data = await fetchJson(url);
    return data.nftSales || [];
  }

  async function fetchOwnerFrogs(owner) {
    if (!owner) {
      return [];
    }
    const frogs = [];
    let pageKey = null;
    let loop = 0;
    do {
      const params = new URLSearchParams({
        owner,
        'contractAddresses[]': CONFIG.collection,
        withMetadata: 'true',
        pageSize: '100',
      });
      if (pageKey) {
        params.set('pageKey', pageKey);
      }
      const url = `${nftApiBase}/getNFTsForOwner?${params.toString()}`;
      const data = await fetchJson(url);
      frogs.push(...(data.ownedNfts || []));
      pageKey = data.pageKey || null;
      loop += 1;
    } while (pageKey && loop < 25);
    return frogs;
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
            'x-api-key': CONFIG.openseaKey,
          },
        });
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        const profile = data.account || data.user || data;
        const username = profile?.username || profile?.display_name || profile?.profile_name || null;
        const imageUrl = profile?.profile_image_url || profile?.image_url || profile?.profile_img_url || null;
        if (username || imageUrl) {
          return { username, imageUrl };
        }
      } catch (error) {
        console.warn('OpenSea lookup failed', error);
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
        earned: stakerInfo?.unclaimedRewards || '0',
      };
    } catch (error) {
      console.warn('Reward lookup failed', error);
      return { available: '0', earned: '0' };
    }
  }

  function isUserStake(nft, wallet) {
    if (!wallet) {
      return false;
    }
    const attributeList = nft.rawMetadata?.attributes || nft.metadata?.attributes || [];
    const attributes = Array.isArray(attributeList) ? attributeList : [];
    const staker = attributes.find((attr) => {
      const label = (attr && (attr.trait_type || attr.type || '')) || '';
      return /owner|staker/i.test(label);
    });
    if (staker && typeof staker.value === 'string') {
      return staker.value.toLowerCase() === wallet.toLowerCase();
    }
    const owner = nft.owner?.toLowerCase?.() || nft.ownerAddress?.toLowerCase?.() || '';
    return owner === wallet.toLowerCase();
  }

  function updateDashboard(wallet, profile, owned, staked, rewards) {
    const username = document.getElementById('dashboard-username');
    if (username) {
      username.textContent = profile?.username || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    }
    const avatar = document.getElementById('dashboard-avatar');
    if (avatar) {
      avatar.src = profile?.imageUrl || CONFIG.defaultImage;
    }
    const stats = {
      owned: document.getElementById('stat-owned'),
      staked: document.getElementById('stat-staked'),
      available: document.getElementById('stat-rewards-available'),
      availableInline: document.getElementById('stat-rewards-available-inline'),
      earned: document.getElementById('stat-rewards-earned'),
      role: document.getElementById('dashboard-role'),
    };
    const ownedCount = owned.length;
    const stakedCount = staked.length;
    const available = formatFlyz(rewards.available);
    const earned = formatFlyz(rewards.earned);
    if (stats.owned) stats.owned.textContent = ownedCount.toString();
    if (stats.staked) stats.staked.textContent = stakedCount.toString();
    if (stats.available) stats.available.textContent = available;
    if (stats.availableInline) stats.availableInline.textContent = available;
    if (stats.earned) stats.earned.textContent = earned;
    if (stats.role) stats.role.textContent = deriveRole(ownedCount, stakedCount);
  }

  function renderWalletSections(sections) {
    const wrapper = document.getElementById('wallet-frogs');
    if (!wrapper) {
      return;
    }
    wrapper.innerHTML = '';
    const blocks = [
      { title: 'Owned Frogs', frogs: sections.owned },
      { title: 'Staked Frogs (You)', frogs: sections.userStaked },
      { title: 'Community Pond', frogs: sections.community },
    ];
    blocks.forEach((block) => {
      const section = document.createElement('div');
      section.className = 'wallet_section';
      const header = document.createElement('p');
      header.className = 'recent_sale_header';
      header.textContent = `${block.title} (${block.frogs.length})`;
      const grid = document.createElement('div');
      grid.className = 'recent_sales wallet_frogs_grid';
      if (!block.frogs.length) {
        const empty = document.createElement('p');
        empty.className = 'recent_sales_status';
        empty.textContent = 'No frogs found.';
        grid.appendChild(empty);
      } else {
        block.frogs.map(formatNFT).map(createFrogCard).forEach((card) => grid.appendChild(card));
      }
      section.appendChild(header);
      section.appendChild(grid);
      wrapper.appendChild(section);
    });
  }

  function formatSale(sale) {
    const nft = sale.nft || sale.token || sale;
    const tokenId = parseTokenId(nft?.tokenId || sale.tokenId);
    const price = formatEth(sale.price?.amount?.raw || sale.sellerFee?.amount?.[0]?.raw || sale.totalPrice);
    const buyer = sale.buyerAddress || sale.to || sale.taker;
    return {
      title: `Frog #${tokenId}`,
      subtitle: price ? `${price} ETH` : 'Sale',
      description: buyer ? `Bought by ${shortenAddress(buyer)}` : 'Recent sale',
      imageUrl: extractImage(nft),
      tokenId,
      rarity: state.rarity[tokenId],
    };
  }

  function formatNFT(nft) {
    const tokenId = parseTokenId(nft.id?.tokenId || nft.tokenId);
    return {
      title: nft.title || `Frog #${tokenId}`,
      subtitle: nft.ownerAddress === CONFIG.stakingContract ? 'Staked' : 'Owned',
      description: primaryTrait(nft),
      imageUrl: extractImage(nft),
      tokenId,
      rarity: state.rarity[tokenId],
    };
  }

  function createFrogCard(data) {
    const card = document.createElement('div');
    card.className = 'recent_sale_card';

    const header = document.createElement('div');
    header.className = 'recent_sale_header';
    const title = document.createElement('strong');
    title.className = 'sale_card_title';
    title.textContent = data.title;
    const subtitle = document.createElement('strong');
    subtitle.className = 'sale_card_price';
    subtitle.textContent = data.subtitle || '';
    header.appendChild(title);
    header.appendChild(subtitle);
    header.appendChild(clearNode());
    card.appendChild(header);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'frog_img_cont';
    const img = document.createElement('img');
    img.className = 'recent_sale_img';
    img.src = data.imageUrl || CONFIG.defaultImage;
    img.alt = data.title;
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    const traitWrap = document.createElement('div');
    traitWrap.className = 'recent_sale_traits';
    const rarity = document.createElement('p');
    rarity.className = `rarity_badge ${rarityClass(data.rarity)}`;
    rarity.textContent = data.rarity ? `Rank #${data.rarity}` : 'Rank N/A';
    const props = document.createElement('div');
    props.className = 'recent_sale_properties';
    props.textContent = data.description || 'Fresh Frog';
    traitWrap.appendChild(rarity);
    traitWrap.appendChild(props);
    card.appendChild(traitWrap);

    return card;
  }

  function clearNode() {
    const node = document.createElement('div');
    node.style.clear = 'both';
    return node;
  }

  function primaryTrait(nft) {
    const attributes = nft.rawMetadata?.attributes || nft.metadata?.attributes;
    if (!Array.isArray(attributes) || !attributes.length) {
      return 'Awaiting metadata';
    }
    const trait = attributes[0];
    const label = trait?.trait_type || trait?.type || 'Trait';
    return `${label}: ${trait?.value || 'Unique'}`;
  }

  function extractImage(nft) {
    return (
      nft?.rawMetadata?.image ||
      nft?.image?.cachedUrl ||
      nft?.image?.pngUrl ||
      nft?.media?.[0]?.gateway ||
      nft?.media?.[0]?.thumbnail ||
      CONFIG.defaultImage
    );
  }

  function formatEth(raw) {
    if (!raw) {
      return '';
    }
    try {
      return (Number(BigInt(raw)) / 1e18).toFixed(2);
    } catch (error) {
      return '';
    }
  }

  function formatFlyz(value) {
    if (!/^[0-9]+$/.test(value || '0')) {
      return '0';
    }
    return (Number(BigInt(value || '0')) / 1e18).toFixed(2);
  }

  function deriveRole(owned, staked) {
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

  function parseTokenId(value) {
    if (!value) {
      return '--';
    }
    if (typeof value === 'string' && value.startsWith('0x')) {
      return parseInt(value, 16).toString();
    }
    return value.toString();
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

  function rarityClass(rank) {
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
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.textContent = message;
    el.style.display = 'block';
  }

  function clearStatus(id) {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.textContent = '';
    el.style.display = 'none';
  }

  function shortenAddress(address) {
    if (!address || address.length < 10) {
      return address || 'Unknown';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
})();
