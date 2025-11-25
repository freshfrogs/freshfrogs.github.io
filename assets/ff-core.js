// ff-core.js
// Config + shared state + helpers + network/contracts

// ------------------------
// Config
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';

const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // optional

const FF_RECENT_SALES_SOURCE = 'opensea'; // 'opensea' or 'alchemy'
const FF_OPENSEA_COLLECTION_SLUG = 'fresh-frogs';

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;
const FF_ALCHEMY_CORE_BASE  = `https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`;

const FF_MORPH_WORKER_URL = 'https://freshfrogs-morphs.danielssouthworth.workers.dev';
const FF_MORPH_ADMIN_KEY  = "ff_admin_9f3k2j";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const FF_WALLET_STORAGE_KEY = 'ffLastConnectedWallet';

// UI toggles
const FF_SHOW_STAKING_STATS_ON_CARDS = true;

// ------------------------
// Global state (shared)
// ------------------------
let ffWeb3 = null;
let ffCurrentAccount = null;
let FF_CONNECTED_ADDRESS = null;

let FF_ACTIVITY_MODE = 'sales';
let FF_RECENT_LIMIT  = 24;

let FF_RARITY_INDEX = 0;
const FF_RARITY_BATCH = 24;
let FF_RARITY_LOADING = false;

let FF_POND_PAGE_KEY = null;

let FF_WALLET_RENDER_TOKEN = 0;
let FF_WALLET_RENDER_INFLIGHT = false;
let FF_LAST_WALLET_RENDERED_FOR = null;

// Queue for late staking decoration
const FF_PENDING_STAKE_CARDS = [];
let FF_READ_READY_PROMISE = null;

// Sale price cache only (removed unused FF_RECENT_SALES_CACHE)
const FF_SALE_PRICE_CACHE = new Map(); // tokenId -> "0.23 ETH"

// OpenSea account caching (username + avatar)
const FF_OS_ACCOUNT_CACHE   = new Map();    // addrLower -> {username, avatarUrl} | null
const FF_OS_ACCOUNT_INFLIGHT= new Map();    // addrLower -> Promise

// Staking per-token caching (cuts contract reads a lot)
const FF_STAKER_CACHE  = new Map(); // tokenId -> address|null
const FF_STAKEVAL_CACHE= new Map(); // tokenId -> values|null

// ------------------------
// Small utils
// ------------------------
function parseTokenId(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw.tokenId != null) raw = raw.tokenId;
  let s = String(raw).trim();

  if (/^0x[0-9a-fA-F]+$/.test(s)) {
    const n = parseInt(s, 16);
    return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
  }

  if (/e\+/i.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null;
}

function dedupeByTokenId(items, idExtractor) {
  const seen = new Set();
  const out  = [];
  for (const item of items) {
    const tokenId = parseTokenId(idExtractor(item));
    if (tokenId == null || seen.has(tokenId)) continue;
    seen.add(tokenId);
    out.push(item);
  }
  return out;
}

function truncateAddress(address) {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ffEscapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function normalizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try { const parsed = JSON.parse(metadata); return typeof parsed === 'object' ? parsed : null; }
    catch { return null; }
  }
  return typeof metadata === 'object' ? metadata : null;
}

function hasUsableMetadata(metadata) {
  const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
  return attributes.length > 0;
}

function ffPickAddress(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string' && /^0x[a-fA-F0-9]{40}$/.test(c)) return c;
    if (typeof c === 'object') {
      const addr =
        c.address ||
        c.walletAddress ||
        c.wallet_address ||
        c.user?.address ||
        c.account?.address;
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;
    }
  }
  return null;
}

// ------------------------
// Rarity helpers
// ------------------------
function buildRarityLookup(rankings) {
  if (!Array.isArray(rankings)) return {};
  if (buildRarityLookup._cache?.source === rankings) return buildRarityLookup._cache.lookup;

  const lookup = rankings.reduce((acc, frog) => {
    const frogId = Number(frog?.id);
    const rankingValue = frog?.ranking ?? frog?.rank;
    if (Number.isFinite(frogId) && rankingValue !== undefined) acc[frogId] = rankingValue;
    return acc;
  }, {});

  buildRarityLookup._cache = { source: rankings, lookup };
  return lookup;
}

function getRarityRank(tokenId) {
  const map = window.freshfrogs_rarity_rankings;
  if (!map) return null;

  let rankRaw;
  if (Array.isArray(map)) {
    rankRaw = buildRarityLookup(map)[tokenId];
  } else if (typeof map === 'object') {
    rankRaw = map[tokenId] ?? map[String(tokenId)] ?? map[`Frog #${tokenId}`];
  }

  const n = Number(rankRaw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getRarityTier(rank) {
  if (!rank) return null;
  if (rank <= 41)   return { label: 'Legendary', className: 'rarity_legendary' };
  if (rank <= 404)  return { label: 'Epic',      className: 'rarity_epic' };
  if (rank <= 1010) return { label: 'Rare',      className: 'rarity_rare' };
  return { label: 'Common', className: 'rarity_common' };
}

// ------------------------
// Formatting
// ------------------------
function formatSalePrice(sale) {
  const fee = sale?.sellerFee || sale?.protocolFee || sale?.royaltyFee || sale?.price || sale?.payment;
  if (!fee?.amount) return sale?.priceText || '';

  const decimals = typeof fee.decimals === 'number' ? fee.decimals : 18;

  let amountNum;
  try { amountNum = Number(fee.amount) / Math.pow(10, decimals); }
  catch { return `${fee.amount} ${fee.symbol || ''}`.trim(); }

  if (!isFinite(amountNum)) return `${fee.amount} ${fee.symbol || ''}`.trim();

  const rounded =
    amountNum >= 1
      ? amountNum.toFixed(3).replace(/\.?0+$/, '')
      : amountNum.toFixed(4).replace(/\.?0+$/, '');

  return `${rounded} ${fee.symbol || 'ETH'}`;
}

function ffFormatAgeFromTimestamp(timestamp) {
  if (!timestamp) return '';
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return '';
  if (diffSeconds < 86400) return '<1d ago';
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function formatMintAge(transfer) {
  const timestamp = transfer?.metadata?.blockTimestamp || transfer?.blockTimestamp || transfer?.eventTimestamp;
  return ffFormatAgeFromTimestamp(timestamp);
}

function formatOwnerLink(address, text) {
  const safeAddr = ffEscapeHtml(address);
  const label = ffEscapeHtml(text || truncateAddress(address));
  const osProfile = `https://opensea.io/${safeAddr}`;
  return `<a class="frog-owner-link" href="${osProfile}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

// ------------------------
// OpenSea account (cached)
// ------------------------
async function ffFetchOpenSeaAccount(address) {
  if (!address) return null;
  const key = String(address).toLowerCase();

  if (FF_OS_ACCOUNT_CACHE.has(key)) return FF_OS_ACCOUNT_CACHE.get(key);
  if (FF_OS_ACCOUNT_INFLIGHT.has(key)) return FF_OS_ACCOUNT_INFLIGHT.get(key);

  const p = (async () => {
    try {
      if (!FF_OPENSEA_API_KEY) {
        FF_OS_ACCOUNT_CACHE.set(key, null);
        return null;
      }

      const url = `https://api.opensea.io/api/v2/accounts/${address}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-API-KEY': FF_OPENSEA_API_KEY }
      });

      if (!res.ok) {
        FF_OS_ACCOUNT_CACHE.set(key, null);
        return null;
      }

      const data = await res.json();
      const username =
        data.username || data?.account?.username || null;
      const avatarUrl =
        data.profile_image_url ||
        data.profileImageUrl ||
        data?.account?.profile_image_url ||
        null;

      const acct = {
        username: username && String(username).trim() ? String(username).trim() : null,
        avatarUrl: avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null
      };

      FF_OS_ACCOUNT_CACHE.set(key, acct);
      return acct;

    } catch {
      FF_OS_ACCOUNT_CACHE.set(key, null);
      return null;
    } finally {
      FF_OS_ACCOUNT_INFLIGHT.delete(key);
    }
  })();

  FF_OS_ACCOUNT_INFLIGHT.set(key, p);
  return p;
}

// ------------------------
// Alchemy/OpenSea fetchers
// ------------------------
async function fetchRecentSalesOpenSea(limit = 24) {
  const url =
    `https://api.opensea.io/api/v2/events/collection/${FF_OPENSEA_COLLECTION_SLUG}` +
    `?event_type=sale&limit=${limit}`;

  const headers = { 'Accept': 'application/json' };
  if (FF_OPENSEA_API_KEY) headers['X-API-KEY'] = FF_OPENSEA_API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenSea events request failed: ${res.status}`);

  const data = await res.json();
  const events = data.asset_events || data.events || data.collection_events || [];

  const simplified = [];

  for (const e of events) {
    const nft = e.nft || e.asset || {};
    const tokenId = parseTokenId(nft.identifier || nft.token_id || e.tokenId);
    if (tokenId == null) continue;

    const buyerAddress = ffPickAddress(
      e.buyer, e.taker, e.to_account, e.toAccount, e.to, e.buyer_address, e.winner_account
    );
    const sellerAddress = ffPickAddress(
      e.seller, e.maker, e.from_account, e.fromAccount, e.from, e.seller_address, e.loser_account
    );

    const paymentToken = e.payment_token || e.payment?.payment_token || {};
    const decimals = paymentToken.decimals != null ? Number(paymentToken.decimals) : 18;
    const symbol = paymentToken.symbol || 'ETH';

    let priceText = '';
    const quantityRaw =
      e.payment?.quantity ||
      e.sale_price?.amount ||
      e.total_price ||
      e.totalPrice ||
      null;

    try {
      if (quantityRaw != null) {
        const q = Number(quantityRaw);
        const amountNum = q / Math.pow(10, decimals);
        if (isFinite(amountNum)) {
          const rounded =
            amountNum >= 1
              ? amountNum.toFixed(3).replace(/\.?0+$/, '')
              : amountNum.toFixed(4).replace(/\.?0+$/, '');
          priceText = `${rounded} ${symbol}`;
        }
      }
    } catch {}

    simplified.push({
      tokenId,
      buyerAddress,
      sellerAddress,
      priceText,
      eventTimestamp: e.event_timestamp || e.created_date || null,
      metadata: nft.metadata || nft.raw_metadata || null
    });
  }

  return dedupeByTokenId(simplified, (x) => x.tokenId);
}

async function fetchRecentSalesAlchemy(limit = 24) {
  const params = new URLSearchParams({
    contractAddress: FF_COLLECTION_ADDRESS,
    order: 'desc',
    limit: String(limit)
  });

  const url = `${FF_ALCHEMY_NFT_BASE}/getNFTSales?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alchemy NFT sales request failed: ${response.status}`);

  const payload = await response.json();
  let sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];
  sales = dedupeByTokenId(sales, (sale) => sale.tokenId);

  return sales.map((sale) => ({
    ...sale,
    tokenId: parseTokenId(sale.tokenId),
    priceText: formatSalePrice(sale)
  })).filter((x) => x.tokenId != null);
}

async function fetchRecentSales(limit = 24) {
  if (FF_RECENT_SALES_SOURCE === 'opensea') {
    try { return await fetchRecentSalesOpenSea(limit); }
    catch (err) {
      console.warn('[RecentSales] OpenSea failed, falling back to Alchemy:', err);
      return await fetchRecentSalesAlchemy(limit);
    }
  }
  return await fetchRecentSalesAlchemy(limit);
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

  if (!response.ok) throw new Error(`Alchemy transfers request failed: ${response.status}`);

  const payload = await response.json();
  let transfers = payload.result?.transfers || [];
  return dedupeByTokenId(transfers, (t) => t.erc721TokenId || t.tokenId);
}

async function fetchFrogMetadata(tokenId) {
  try {
    const url = `https://freshfrogs.github.io/frog/json/${tokenId}.json`;
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
    return normalizeMetadata(await response.json()) || {};
  } catch (err) {
    console.error(`Failed metadata for token ${tokenId}`, err);
    return {};
  }
}

// ------------------------
// Contracts + staking
// ------------------------
async function ffTryContractCall(contract, names, args = []) {
  if (!contract?.methods) return null;
  for (const name of names) {
    if (contract.methods[name]) {
      try { return await contract.methods[name](...args).call(); }
      catch (err) { console.warn(`Call to ${name} failed:`, err); }
    }
  }
  return null;
}

async function ffEnsureReadContracts() {
  if (window.controller && typeof stakingValues === 'function' && typeof stakerAddress === 'function') return true;

  try {
    if (!ffWeb3) {
      if (window.ethereum) ffWeb3 = new Web3(window.ethereum);
      else ffWeb3 = new Web3(`https://eth-mainnet.g.alchemy.com/v2/${FF_ALCHEMY_API_KEY}`);
      window.web3 = ffWeb3;
    }

    if (!window.collection && typeof COLLECTION_ABI !== 'undefined') {
      window.collection = new ffWeb3.eth.Contract(COLLECTION_ABI, FF_COLLECTION_ADDRESS);
    }
    if (!window.controller && typeof CONTROLLER_ABI !== 'undefined') {
      window.controller = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);
    }

    return !!window.controller;
  } catch (err) {
    console.warn('ffEnsureReadContracts failed:', err);
    return false;
  }
}

function ffInitReadContractsOnLoad() {
  if (!FF_READ_READY_PROMISE) {
    FF_READ_READY_PROMISE = ffEnsureReadContracts()
      .then((ok) => {
        if (ok) {
          ffProcessPendingStakeMeta();
          ffRefreshStakeMetaForAllCards();
        }
        return ok;
      })
      .catch((err) => {
        console.warn('ffInitReadContractsOnLoad failed', err);
        return false;
      });
  }
  return FF_READ_READY_PROMISE;
}

// Unified staking fetch
async function ffGetStakingData(address) {
  const ok = await ffEnsureReadContracts();
  if (!ok) return { stakedIds: [], rewardsAvailable: null, rewardsEarned: null };

  const contract = new ffWeb3.eth.Contract(CONTROLLER_ABI, FF_CONTROLLER_ADDRESS);

  const stakedRaw = await ffTryContractCall(contract, [
    'getStakedTokensOf','getStakedTokens','getUserStakedTokens','stakedTokensOf'
  ], [address]);

  const rewardsAvailableRaw = await ffTryContractCall(contract, [
    'getRewardsAvailable','availableRewards','rewardsAvailable','pendingRewards'
  ], [address]);

  const rewardsEarnedRaw = await ffTryContractCall(contract, [
    'getTotalRewardsEarned','rewardsEarned','claimedRewards'
  ], [address]);

  const ids = [];
  const seen = new Set();
  const addId = (v) => {
    const id = parseTokenId(v?.tokenId ?? v);
    if (id != null && !seen.has(id)) { seen.add(id); ids.push(id); }
  };

  if (Array.isArray(stakedRaw)) stakedRaw.forEach(addId);
  else if (stakedRaw != null) addId(stakedRaw);

  return {
    stakedIds: ids,
    rewardsAvailable: rewardsAvailableRaw ?? null,
    rewardsEarned: rewardsEarnedRaw ?? null
  };
}

async function ffCachedStakerAddress(tokenId) {
  if (FF_STAKER_CACHE.has(tokenId)) return FF_STAKER_CACHE.get(tokenId);
  const staker = await stakerAddress(tokenId);
  const val = (staker && staker !== ZERO_ADDRESS) ? staker : null;
  FF_STAKER_CACHE.set(tokenId, val);
  return val;
}

async function ffCachedStakingValues(tokenId) {
  if (FF_STAKEVAL_CACHE.has(tokenId)) return FF_STAKEVAL_CACHE.get(tokenId);
  const values = await stakingValues(tokenId);
  const val = Array.isArray(values) ? values : null;
  FF_STAKEVAL_CACHE.set(tokenId, val);
  return val;
}

// Roman helper stays shared
function ffRomanToArabic(roman) {
  if (!roman) return null;
  roman = String(roman).toUpperCase();
  const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0, prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const val = map[roman[i]] || 0;
    total += val < prev ? -val : val;
    prev = Math.max(prev, val);
  }
  return total || null;
}

// Export globals other files need
window.FF = {
  // state
  get ffWeb3(){ return ffWeb3; },
  set ffWeb3(v){ ffWeb3=v; },
  get ffCurrentAccount(){ return ffCurrentAccount; },
  set ffCurrentAccount(v){ ffCurrentAccount=v; },
  get FF_CONNECTED_ADDRESS(){ return FF_CONNECTED_ADDRESS; },
  set FF_CONNECTED_ADDRESS(v){ FF_CONNECTED_ADDRESS=v; },

  // config
  FF_COLLECTION_ADDRESS,
  FF_CONTROLLER_ADDRESS,
  FF_ALCHEMY_NFT_BASE,
  FF_MORPH_WORKER_URL,
  FF_MORPH_ADMIN_KEY,
  ZERO_ADDRESS,
  FF_SHOW_STAKING_STATS_ON_CARDS,

  // view state
  get FF_ACTIVITY_MODE(){ return FF_ACTIVITY_MODE; },
  set FF_ACTIVITY_MODE(v){ FF_ACTIVITY_MODE=v; },
  get FF_RECENT_LIMIT(){ return FF_RECENT_LIMIT; },
  set FF_RECENT_LIMIT(v){ FF_RECENT_LIMIT=v; },
  get FF_RARITY_INDEX(){ return FF_RARITY_INDEX; },
  set FF_RARITY_INDEX(v){ FF_RARITY_INDEX=v; },
  FF_RARITY_BATCH,
  get FF_RARITY_LOADING(){ return FF_RARITY_LOADING; },
  set FF_RARITY_LOADING(v){ FF_RARITY_LOADING=v; },
  get FF_POND_PAGE_KEY(){ return FF_POND_PAGE_KEY; },
  set FF_POND_PAGE_KEY(v){ FF_POND_PAGE_KEY=v; },

  // wallet render concurrency
  get FF_WALLET_RENDER_TOKEN(){ return FF_WALLET_RENDER_TOKEN; },
  set FF_WALLET_RENDER_TOKEN(v){ FF_WALLET_RENDER_TOKEN=v; },
  get FF_WALLET_RENDER_INFLIGHT(){ return FF_WALLET_RENDER_INFLIGHT; },
  set FF_WALLET_RENDER_INFLIGHT(v){ FF_WALLET_RENDER_INFLIGHT=v; },
  get FF_LAST_WALLET_RENDERED_FOR(){ return FF_LAST_WALLET_RENDERED_FOR; },
  set FF_LAST_WALLET_RENDERED_FOR(v){ FF_LAST_WALLET_RENDERED_FOR=v; },

  // caches
  FF_SALE_PRICE_CACHE,

  // helpers
  parseTokenId,
  dedupeByTokenId,
  truncateAddress,
  ffEscapeHtml,
  normalizeMetadata,
  hasUsableMetadata,
  getRarityRank,
  getRarityTier,
  formatSalePrice,
  formatMintAge,
  formatOwnerLink,
  ffFetchOpenSeaAccount,

  // network
  fetchRecentSales,
  fetchRecentMints,
  fetchFrogMetadata,

  // contracts/staking
  ffEnsureReadContracts,
  ffInitReadContractsOnLoad,
  ffGetStakingData,
  ffCachedStakerAddress,
  ffCachedStakingValues,
  ffTryContractCall,
  ffRomanToArabic,

  // pending stake queue shared with views
  FF_PENDING_STAKE_CARDS
};
