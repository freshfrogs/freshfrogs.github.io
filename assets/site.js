// assets/site.js

// ------------------------
// Config
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // optional

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE  = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;

const FF_ACTIVITY_MODE      = 'sales'; // 'mints' or 'sales' for the bottom grid
const ZERO_ADDRESS          = '0x0000000000000000000000000000000000000000';

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadRecentActivity();   // bottom recent cards
  ffInitWalletOnLoad();   // auto-detect wallet + wire buttons
});

// ------------------------
// Recent activity loader (bottom grid)
// ------------------------
async function loadRecentActivity() {
  const container = document.getElementById('recent-sales');
  const statusEl  = document.getElementById('recent-sales-status');

  if (!container) {
    console.warn('loadRecentActivity: #recent-sales not found');
    return;
  }

  if (statusEl) {
    statusEl.textContent =
      FF_ACTIVITY_MODE === 'mints'
        ? 'Loading recent mints...'
        : 'Loading recent sales...';
  }

  try {
    const items =
      FF_ACTIVITY_MODE === 'mints'
        ? await fetchRecentMints(24)
        : await fetchRecentSales(24);

    if (!items.length) {
      if (statusEl) {
        statusEl.textContent =
          FF_ACTIVITY_MODE === 'mints'
            ? 'No recent mints found.'
            : 'No recent sales found.';
      }
      return;
    }

    if (statusEl) statusEl.textContent = '';

    for (const item of items) {
      const rawTokenId =
        FF_ACTIVITY_MODE === 'mints'
          ? (item.erc721TokenId || item.tokenId)
          : item.tokenId;

      if (!rawTokenId) {
        console.warn('Skipping item with missing tokenId', item);
        continue;
      }

      const tokenId = parseTokenId(rawTokenId);
      if (!tokenId) {
        console.warn('Skipping item with unparseable tokenId', rawTokenId, item);
        continue;
      }

      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to;
        headerRight  = formatMintAge(item);   // e.g. "3d ago"
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft,
        headerRight
      });

      container.appendChild(card);
    }
  } catch (err) {
    console.error('Unable to load recent activity', err);
    const status = FF_ACTIVITY_MODE === 'mints'
      ? 'Unable to load recent mints right now.'
      : 'Unable to load recent sales right now.';
    if (statusEl) statusEl.textContent = status;
  }
}

// ------------------------
// Token / rarity helpers
// ------------------------
function parseTokenId(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'string') raw = String(raw);

  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    const n = parseInt(raw, 16);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function getRarityRank(tokenId) {
  if (typeof window === 'undefined') return null;

  const map = window.freshfrogs_rarity_rankings;
  if (!map) {
    if (!getRarityRank._warned) {
      console.warn('[FreshFrogs] freshfrogs_rarity_rankings not found on window');
      getRarityRank._warned = true;
    }
    return null;
  }

  let rankRaw;

  if (Array.isArray(map)) {
    const lookup = buildRarityLookup(map);
    rankRaw = lookup[tokenId];

    if (rankRaw === undefined) {
      rankRaw = map[tokenId] ?? map[tokenId - 1];
    }
  } else if (typeof map === 'object') {
    rankRaw =
      map[tokenId] ??
      map[String(tokenId)] ??
      map[`Frog #${tokenId}`];
  }

  if (rankRaw === undefined || rankRaw === null || rankRaw === '') return null;

  const n = Number(rankRaw);
  if (!Number.isFinite(n) || n <= 0) return null;

  return n;
}

function buildRarityLookup(rankings) {
  if (!Array.isArray(rankings)) return {};

  if (buildRarityLookup._cache && buildRarityLookup._cache.source === rankings) {
    return buildRarityLookup._cache.lookup;
  }

  const lookup = rankings.reduce((acc, frog) => {
    if (frog && typeof frog.id !== 'undefined') {
      const frogId = Number(frog.id);
      const rankingValue = frog.ranking ?? frog.rank;
      if (Number.isFinite(frogId) && rankingValue !== undefined) {
        acc[frogId] = rankingValue;
      }
    }
    return acc;
  }, {});

  buildRarityLookup._cache = { source: rankings, lookup };
  return lookup;
}

// ------------------------
// Card rendering (shared for all grids)
// ------------------------
function createFrogCard({
  tokenId,
  metadata,
  headerLeft,
  headerRight,
  footerHtml,
  actionHtml
}) {
  const frogName   = `Frog #${tokenId}`;
  const rarityRank = getRarityRank(tokenId);
  const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;

  const rarityText  = rarityTier ? rarityTier.label : 'RARITY UNKNOWN';
  const rarityClass = rarityTier
    ? `rarity_badge ${rarityTier.className}`
    : 'rarity_badge rarity_unknown';

  const imageUrl   = `https://freshfrogs.github.io/frog/${tokenId}.png`;
  const traitsHtml = buildTraitsHtml(metadata);

  const card = document.createElement('div');
  card.className = 'recent_sale_card';
  card.innerHTML = `
    <div class="recent_sale_header">
      <span class="sale_card_title">Frog #${tokenId}</span>
      <span class="sale_card_price">${priceEth} ETH</span>
    </div>

    <div class="frog_img_cont">
      <img class="recent_sale_img" src="${imageUrl}" alt="Frog #${tokenId}" />
    </div>

    <div class="recent_sale_properties">
      <p>Rarity:
        <span class="rarity_badge ${rarityClass}">${rarityLabel}</span>
      </p>
      <p>Buyer: ${shortBuyer}</p>
      <p>Seller: ${shortSeller}</p>
    </div>

    <div class="recent_sale_links">
      <a
        class="sale_link_btn opensea"
        href="https://opensea.io/assets/ethereum/${COLLECTION_ADDRESS}/${tokenId}"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenSea
      </a>
      <a
        class="sale_link_btn etherscan"
        href="https://etherscan.io/tx/${sale.transaction}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Etherscan
      </a>
    </div>
  `;

  return card;
}

function getRarityTier(rank) {
  if (!rank) return null;
  if (rank <= 41)   return { label: 'Legendary', className: 'rarity_legendary' };
  if (rank <= 404)  return { label: 'Epic',      className: 'rarity_epic' };
  if (rank <= 1010) return { label: 'Rare',      className: 'rarity_rare' };
  return { label: 'Common', className: 'rarity_common' };
}

function buildTraitsHtml(metadata) {
  const attributes = Array.isArray(metadata && metadata.attributes)
    ? metadata.attributes
    : [];

  const frogTrait = attributes.find(
    (attr) => attr.trait_type === 'Frog' || attr.trait_type === 'SpecialFrog'
  );

  const traitText = [
    frogTrait ? `Frog: ${frogTrait.value}` : null,
    ...attributes
      .filter((attr) => attr !== frogTrait)
      .slice(0, 2)
      .map((attr) => `${attr.trait_type}: ${attr.value}`)
  ].filter(Boolean);

  const traits = traitText.length ? traitText : ['Metadata unavailable'];
  return traits.map((trait) => `<p>${trait}</p>`).join('');
}

// ------------------------
// Activity fetchers (mints/sales)
// ------------------------
async function fetchRecentSales(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'desc',
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy NFT sales request failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.nftSales) ? payload.nftSales : [];
}

async function fetchRecentMints(limit = 24) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromAddress: ZERO_ADDRESS,
        contractAddresses: [FF_COLLECTION_ADDRESS],
        category: ['erc721'],
        order: 'desc',
        maxCount: '0x' + limit.toString(16),
        withMetadata: true
      }
    ]
  };

  const response = await fetch(FF_ALCHEMY_CORE_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Alchemy transfers (mints) request failed: ${response.status}`);
  }

  const payload = await response.json();
  const transfers =
    payload.result && Array.isArray(payload.result.transfers)
      ? payload.result.transfers
      : [];

  return transfers;
}

async function fetchFrogMetadata(tokenId) {
  try {
    const url      = `https://freshfrogs.github.io/frog/json/${tokenId}.json`;
    const response = await fetch(url, { cache: 'force-cache' });

    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const json = await response.json();
    return normalizeMetadata(json) || {};
  } catch (err) {
    console.error(`Failed to fetch metadata for token ${tokenId}`, err);
    return {};
  }
}

// ------------------------
// Formatting helpers
// ------------------------
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '--';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatSalePrice(sale) {
  if (!sale) return '--';

  const fee =
    sale.sellerFee || sale.protocolFee || sale.royaltyFee || sale.price;

  if (!fee || !fee.amount) {
    return '--';
  }

  const decimals = typeof fee.decimals === 'number' ? fee.decimals : 18;

  let amountNum;
  try {
    amountNum = Number(fee.amount) / Math.pow(10, decimals);
  } catch {
    return `${fee.amount} ${fee.symbol || ''}`.trim();
  }

  if (!isFinite(amountNum)) {
    return `${fee.amount} ${fee.symbol || ''}`.trim();
  }

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${fee.symbol || 'ETH'}`;
}

// Best-effort mint price – not used in header right now but kept if you want it later
function formatMintPrice(transfer) {
  if (!transfer) return '--';

  const raw = transfer.rawContract && transfer.rawContract.value;
  if (!raw) return '--';

  const valueNum = parseInt(raw, 16);
  if (!Number.isFinite(valueNum) || valueNum <= 0) return '--';

  const eth = valueNum / 1e18;
  const rounded =
    eth >= 1
      ? eth.toFixed(3).replace(/\.?0+$/, '')
      : eth.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ETH`;
}

// Generic age formatter used for mints
function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '--';

  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '--';

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '--';

  if (diffSeconds < 86400) {
    return '<1d ago';
  }

  const diffDays = Math.floor(diffSeconds / 86400);
  return `${diffDays}d ago`;
}

// Mint age helper
function formatMintAge(transfer) {
  if (!transfer) return '--';

  const timestamp =
    (transfer.metadata && transfer.metadata.blockTimestamp) ||
    transfer.blockTimestamp;

  return ffFormatAgeFromTimestamp(timestamp);
}

function normalizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object') return metadata;
  return null;
}

function hasUsableMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
  const attributes = Array.isArray(metadata.attributes)
    ? metadata.attributes
    : [];
  return attributes.length > 0;
}

// ===================================================
// Owned / Staked frogs rendering
// ===================================================

// Get all owned frogs (NFTs of this collection in the wallet)
async function ffFetchOwnedFrogs(address) {
  if (!FF_ALCHEMY_NFT_BASE) return [];

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getNFTsForOwner failed:', res.status);
    return [];
  }

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => {
    const addr = nft.contract && nft.contract.address;
    return addr && addr.toLowerCase() === target;
  });

  return frogs;
}

// Get token IDs staked by this address (method names are best guesses)
async function ffFetchStakedTokenIds(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staked frogs fetch disabled.');
    return [];
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

  if (!stakedRaw) return [];

  // Expect array-like of IDs
  const result = [];
  if (Array.isArray(stakedRaw)) {
    for (const v of stakedRaw) {
      const id = parseTokenId(v);
      if (id != null) result.push(id);
    }
  } else {
    // If it's a single numeric value, not ideal but include it
    const id = parseTokenId(stakedRaw);
    if (id != null) result.push(id);
  }

  return result;
}

// Render owned + staked frogs into their grids
async function renderOwnedAndStakedFrogs(address) {
  const ownedGrid   = document.getElementById('owned-frogs-grid');
  const ownedStatus = document.getElementById('owned-frogs-status');
  const stakedGrid   = document.getElementById('staked-frogs-grid');
  const stakedStatus = document.getElementById('staked-frogs-status');

  if (ownedGrid)  ownedGrid.innerHTML = '';
  if (stakedGrid) stakedGrid.innerHTML = '';

  if (ownedStatus)  ownedStatus.textContent  = 'Loading owned frogs...';
  if (stakedStatus) stakedStatus.textContent = 'Loading staked frogs...';

  try {
    const [ownedNfts, stakedIds] = await Promise.all([
      ffFetchOwnedFrogs(address),
      ffFetchStakedTokenIds(address).catch((err) => {
        console.warn('ffFetchStakedTokenIds failed:', err);
        return [];
      })
    ]);

    // ---- Owned frogs ----
    if (ownedStatus) {
      ownedStatus.textContent = ownedNfts.length
        ? ''
        : 'No frogs found in this wallet.';
    }

    if (ownedGrid && ownedNfts.length) {
      for (const nft of ownedNfts) {
        const rawTokenId = nft.tokenId || (nft.id && nft.id.tokenId);
        const tokenId = parseTokenId(rawTokenId);
        if (tokenId == null) continue;

        let metadata = normalizeMetadata(
          nft.rawMetadata || nft.metadata || nft.tokenMetadata
        );
        if (!hasUsableMetadata(metadata)) {
          metadata = await fetchFrogMetadata(tokenId);
        }

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: truncateAddress(address),
          headerRight: 'Owned'
        });

        ownedGrid.appendChild(card);
      }
    }

    // ---- Staked frogs ----
    if (stakedStatus) {
      stakedStatus.textContent = stakedIds.length
        ? ''
        : 'No staked frogs found for this wallet.';
    }

    if (stakedGrid && stakedIds.length) {
      for (const tokenId of stakedIds) {
        let metadata = await fetchFrogMetadata(tokenId);

        const card = createFrogCard({
          tokenId,
          metadata,
          headerLeft: 'Pond',
          headerRight: 'Staked'
        });

        stakedGrid.appendChild(card);
      }
    }
  } catch (err) {
    console.error('renderOwnedAndStakedFrogs failed:', err);
    if (ownedStatus)  ownedStatus.textContent  = 'Unable to load owned frogs.';
    if (stakedStatus) stakedStatus.textContent = 'Unable to load staked frogs.';
  }
}

// ===================================================
// Wallet connect + dashboard
// ===================================================

let ffWeb3 = null;
let ffCurrentAccount = null;

// DOM helpers
function ffSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function ffSetAvatar(id, url) {
  const el = document.getElementById(id);
  if (el && url) {
    el.src = url;
  }
}

function ffUpdateWalletBasicUI(address) {
  ffSetText('wallet-status-label', 'Connected');
  ffSetText('dashboard-wallet', `Wallet: ${truncateAddress(address)}`);
}

// Apply everything to the wallet dashboard
function ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile) {
  ffUpdateWalletBasicUI(address);

  if (typeof ownedCount === 'number') {
    ffSetText('stat-owned', ownedCount.toString());
  }

  if (stakingStats) {
    if (typeof stakingStats.staked === 'number') {
      ffSetText('stat-staked', stakingStats.staked.toString());
    }

    if (stakingStats.rewardsAvailable != null) {
      ffSetText('stat-rewards-available', stakingStats.rewardsAvailable.toString());
    }

    if (stakingStats.rewardsEarned != null) {
      ffSetText('stat-rewards-earned', stakingStats.rewardsEarned.toString());
    }
  }

  if (profile) {
    if (profile.username) {
      ffSetText('dashboard-username', profile.username);
    }
    if (profile.avatarUrl) {
      ffSetAvatar('dashboard-avatar', profile.avatarUrl);
    }
  }
}

// ---- ALCHEMY: owned frog count (quick stat) ----
async function ffFetchOwnedFrogCount(address) {
  if (!FF_ALCHEMY_NFT_BASE) {
    console.warn('Alchemy NFT base URL missing; owned frog count disabled.');
    return null;
  }

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Alchemy getNFTsForOwner failed:', res.status);
    return null;
  }

  const data = await res.json();
  const all = Array.isArray(data.ownedNfts) ? data.ownedNfts : [];
  const target = FF_COLLECTION_ADDRESS.toLowerCase();

  const frogs = all.filter((nft) => {
    const addr = nft.contract && nft.contract.address;
    return addr && addr.toLowerCase() === target;
  });

  return frogs.length;
}

// ---- STAKING: staked frogs + rewards ----
async function ffTryContractCall(contract, names, args = []) {
  if (!contract || !contract.methods) return null;
  for (const name of names) {
    if (contract.methods[name]) {
      try {
        return await contract.methods[name](...args).call();
      } catch (err) {
        console.warn(`Call to ${name} failed:`, err);
      }
    }
  }
  return null;
}

async function ffFetchStakingStats(address) {
  if (!ffWeb3 || typeof CONTROLLER_ABI === 'undefined') {
    console.warn('Web3 or CONTROLLER_ABI missing; staking stats disabled.');
    return null;
  }

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf',
    'getStakedTokens',
    'getUserStakedTokens',
    'stakedTokensOf'
  ], [address]);

  const rewardsAvailableRaw = await ffTryContractCall(contract, [
    'getRewardsAvailable',
    'rewardsAvailable',
    'pendingRewards'
  ], [address]);

  const rewardsEarnedRaw = await ffTryContractCall(contract, [
    'getTotalRewardsEarned',
    'rewardsEarned',
    'claimedRewards'
  ], [address]);

  const stats = {
    staked: null,
    rewardsAvailable: null,
    rewardsEarned: null
  };

  if (Array.isArray(stakedRaw)) {
    stats.staked = stakedRaw.length;
  } else if (stakedRaw != null && !isNaN(stakedRaw)) {
    stats.staked = Number(stakedRaw);
  }

  if (rewardsAvailableRaw != null) {
    stats.rewardsAvailable = rewardsAvailableRaw;
  }

  if (rewardsEarnedRaw != null) {
    stats.rewardsEarned = rewardsEarnedRaw;
  }

  return stats;
}

// ---- OpenSea profile: username + avatar ----
async function ffFetchOpenSeaProfile(address) {
  if (!FF_OPENSEA_API_KEY) {
    console.warn('OpenSea API key missing; profile fetch disabled.');
    return null;
  }

  const url = `https://api.opensea.io/api/v2/accounts/${address}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': FF_OPENSEA_API_KEY
    }
  });

  if (!res.ok) {
    console.warn('OpenSea profile request failed:', res.status);
    return null;
  }

  const data = await res.json();

  const username =
    data.username ||
    (data.account && data.account.username) ||
    (data.account && data.account.address) ||
    null;

  const avatarUrl =
    data.profile_image_url ||
    data.profileImageUrl ||
    (data.account && data.account.profile_image_url) ||
    (data.account && data.account.image_url) ||
    null;

  return { username, avatarUrl };
}

// ---- CONNECT FUNCTION ----
async function connectWallet() {
  if (!window.ethereum) {
    alert('No Ethereum wallet detected. Please install MetaMask or a compatible wallet.');
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || !accounts.length) return;

    const address = accounts[0];
    ffCurrentAccount = address;

    if (!ffWeb3) {
      ffWeb3 = new Web3(window.ethereum);
    }

    ffUpdateWalletBasicUI(address);

    const [ownedCount, stakingStats, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch((err) => {
        console.warn('Owned frogs count fetch failed:', err);
        return null;
      }),
      ffFetchStakingStats(address).catch((err) => {
        console.warn('Staking stats fetch failed:', err);
        return null;
      }),
      ffFetchOpenSeaProfile(address).catch((err) => {
        console.warn('OpenSea profile fetch failed:', err);
        return null;
      })
    ]);

    ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile);

    // 🐸 Render owned & staked frogs in the grids
    await renderOwnedAndStakedFrogs(address);
  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet. Check your wallet and try again.');
  }
}

// Make connectWallet callable from HTML onclick
window.connectWallet = connectWallet;

// Init wallet on page load (already-connected accounts)
async function ffInitWalletOnLoad() {
  if (window.ethereum && window.Web3 && !ffWeb3) {
    ffWeb3 = new Web3(window.ethereum);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts[0]) {
        ffCurrentAccount = accounts[0];
        ffUpdateWalletBasicUI(ffCurrentAccount);

        // Preload stats + frogs if wallet already connected
        const [ownedCount, stakingStats, profile] = await Promise.all([
          ffFetchOwnedFrogCount(ffCurrentAccount).catch(() => null),
          ffFetchStakingStats(ffCurrentAccount).catch(() => null),
          ffFetchOpenSeaProfile(ffCurrentAccount).catch(() => null)
        ]);

        ffApplyDashboardUpdates(ffCurrentAccount, ownedCount, stakingStats, profile);
        await renderOwnedAndStakedFrogs(ffCurrentAccount);
      }
    } catch (err) {
      console.warn('eth_accounts request failed:', err);
    }
  }

  // optional: if you ever add a button with id="connect-wallet-button"
  const btn = document.getElementById('connect-wallet-button');
  if (btn) {
    btn.addEventListener('click', connectWallet);
  }
}
