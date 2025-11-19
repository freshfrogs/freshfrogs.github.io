// assets/site.js

// ------------------------
// Config (namespaced to avoid collisions)
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // reserved for later

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE  = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;

// 'sales' = recent sales (getNFTSales)
// 'mints' = recent mints (alchemy_getAssetTransfers)
const FF_ACTIVITY_MODE      = 'mints'; // bottom grid mode

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadRecentActivity();      // bottom frog cards
  loadCollectionActivity();  // Collection Activity panel inside main card
});

// ------------------------
// Recent activity loader (frog cards grid)
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

      // metadata
      let metadata = normalizeMetadata(item.metadata || item.tokenMetadata);
      if (!hasUsableMetadata(metadata)) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      // address + header right
      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to;
        // Age since mint: "<1d ago", "3d ago", etc.
        headerRight  = formatMintAge(item);
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress); // no "Buyer:" text

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

  // Hex: "0x3c7"
  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    const n = parseInt(raw, 16);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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
      // Fallback to index-based lookup for legacy shapes
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
// Card rendering (bottom grid)
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
      <strong class="sale_card_title">${headerLeft}</strong>
      <strong class="sale_card_price">${headerRight}</strong>
      <div style="clear: both;"></div>
      <div class="frog_img_cont">
        <img src="${imageUrl}"
             class="recent_sale_img"
             alt="Frog #${tokenId}"
             loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong>
        <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
        ${footerHtml || ''}
        ${actionHtml || ''}
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
// Activity fetchers (for cards + events panel)
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

// Best-effort mint price – many mints will not have a non-zero value here
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

// Generic age formatter with "ago"
function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '--';

  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '--';

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '--';

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const diffDays = Math.floor(hours / 24);
  return `${diffDays}d ago`;
}

// Mint age helper (uses generic formatter)
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
// Collection Activity panel (inside main panel)
// Only mints + sales, with sale price and "ago"
// ===================================================

// Build mint events from the same transfers used for the grid
async function ffFetchRecentMintsForActivity(limit = 40) {
  const transfers = await fetchRecentMints(limit);
  const events = [];

  for (const t of transfers) {
    const rawTokenId = t.erc721TokenId || t.tokenId;
    const tokenId    = parseTokenId(rawTokenId);
    if (!tokenId) continue;

    const to = t.to || t.toAddress;
    const ts =
      (t.metadata && t.metadata.blockTimestamp) ||
      t.blockTimestamp;
    const timestampMs = ts ? new Date(ts).getTime() : 0;

    events.push({
      type: 'mint',
      tokenId,
      from: null,
      to,
      price: null,
      timestamp: timestampMs,
      txHash: t.hash || t.txHash || t.transactionHash || null
    });
  }

  return events;
}

// Normalize sales to "activity" events
function ffNormalizeSaleEvents(sales) {
  if (!Array.isArray(sales)) return [];

  return sales
    .map((sale) => {
      const rawTokenId = sale.tokenId;
      const tokenId    = parseTokenId(rawTokenId);
      if (!tokenId) return null;

      const from = sale.sellerAddress || sale.seller || null;
      const to   = sale.buyerAddress  || sale.buyer  || sale.taker || null;

      const ts = sale.blockTimestamp || sale.timestamp || sale.eventTimestamp;
      const timestampMs = ts
        ? (typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime())
        : 0;

      return {
        type:  'sale',
        tokenId,
        from,
        to,
        price: formatSalePrice(sale),
        timestamp: timestampMs,
        txHash: sale.transactionHash || sale.txHash || null
      };
    })
    .filter(e => e && e.timestamp);
}

// Build one badge row for the activity panel
function createActivityBadge(ev) {
  const container = document.createElement('div');
  container.className = 'dashboard_badge';

  const emoji = ev.type === 'mint' ? '✨' : '💰';
  const label = ev.type === 'mint' ? 'Mint' : 'Sale';

  const frogLabel = ev.tokenId ? `Frog #${ev.tokenId}` : 'Collection';
  const ageLabel  = ffFormatAgeFromTimestamp(ev.timestamp);

  const fromShort = ev.from ? truncateAddress(ev.from) : '--';
  const toShort   = ev.to   ? truncateAddress(ev.to)   : '--';

  let descText = '';

  if (ev.type === 'mint') {
    descText = `${label} • Minted to ${toShort} • ${ageLabel}`;
  } else {
    const pricePart = ev.price && ev.price !== '--' ? `${ev.price} • ` : '';
    descText = `${label} • ${pricePart}${fromShort} → ${toShort} • ${ageLabel}`;
  }

  const txUrl = ev.txHash
    ? `https://etherscan.io/tx/${ev.txHash}`
    : null;

  container.innerHTML = `
    <span class="dashboard_badge_icon">${emoji}</span>
    <div>
      <span class="dashboard_badge_title">${frogLabel}</span>
      <span class="dashboard_badge_desc">
        ${txUrl
          ? `<a href="${txUrl}" target="_blank" rel="noopener noreferrer">${descText}</a>`
          : descText}
      </span>
    </div>
  `;

  return container;
}

// Main loader for Collection Activity panel
async function loadCollectionActivity() {
  const row = document.querySelector('#dashboard-badges .dashboard_badges_row');
  if (!row) {
    console.warn('loadCollectionActivity: activity container not found');
    return;
  }

  try {
    const [mintEvents, salesRaw] = await Promise.all([
      ffFetchRecentMintsForActivity(40),
      fetchRecentSales(40).catch(() => [])
    ]);

    const saleEvents = ffNormalizeSaleEvents(salesRaw);

    let allEvents = [...mintEvents, ...saleEvents];

    allEvents = allEvents
      .filter(e => e.timestamp && Number.isFinite(e.timestamp))
      .sort((a, b) => b.timestamp - a.timestamp);

    row.innerHTML = '';

    if (!allEvents.length) {
      const empty = document.createElement('div');
      empty.className = 'dashboard_badge';
      empty.innerHTML = `
        <span class="dashboard_badge_icon">🕓</span>
        <div>
          <span class="dashboard_badge_title">No recent activity</span>
          <span class="dashboard_badge_desc">Check back soon for fresh frog moves.</span>
        </div>
      `;
      row.appendChild(empty);
      return;
    }

    // Render many; CSS limits visible height to ~5 rows, scroll for more
    for (const ev of allEvents) {
      row.appendChild(createActivityBadge(ev));
    }
  } catch (err) {
    console.error('loadCollectionActivity failed:', err);
  }
}

// ===================================================
// Wallet connect + dashboard (still here so Connect Wallet works)
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
  ffSetText('dashboard-wallet', truncateAddress(address));
}

// Apply everything to the wallet dashboard
function ffApplyDashboardUpdates(address, ownedCount, stakingStats, profile) {
  // Basic
  ffUpdateWalletBasicUI(address);

  // Owned frogs
  if (typeof ownedCount === 'number') {
    ffSetText('stat-owned', ownedCount.toString());
  }

  // Staking + rewards
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

  // OpenSea profile
  if (profile) {
    if (profile.username) {
      ffSetText('dashboard-username', profile.username);
    }
    if (profile.avatarUrl) {
      ffSetAvatar('dashboard-avatar', profile.avatarUrl);
    }
  }
}

// ---- ALCHEMY: owned frog count ----
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

  // 🔧 These method names are guesses – adjust to your actual contract
  const stakedRaw = await ffTryContractCall(contract, [
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
  console.log('OpenSea profile data:', data);

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

// ---- CONNECT FUNCTION (main entry) ----
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

    // Update basic status immediately
    ffUpdateWalletBasicUI(address);

    // Fetch all stats in parallel
    const [ownedCount, stakingStats, profile] = await Promise.all([
      ffFetchOwnedFrogCount(address).catch((err) => {
        console.warn('Owned frogs fetch failed:', err);
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
  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet. Check your wallet and try again.');
  }
}

// Expose globally so HTML can call onclick="connectWallet()"
window.connectWallet = connectWallet;

// Init wallet bindings (for any future connect button by id)
document.addEventListener('DOMContentLoaded', async () => {
  if (window.ethereum && window.Web3 && !ffWeb3) {
    ffWeb3 = new Web3(window.ethereum);

    // Try to detect already-connected account
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts[0]) {
        ffCurrentAccount = accounts[0];
        ffUpdateWalletBasicUI(ffCurrentAccount);
      }
    } catch (err) {
      console.warn('eth_accounts request failed:', err);
    }
  }

  const btn = document.getElementById('connect-wallet-button');
  if (btn) {
    btn.addEventListener('click', connectWallet);
  }
});
