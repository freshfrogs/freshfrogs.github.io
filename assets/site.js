// assets/site.js

// ------------------------
// Config (namespaced to avoid collisions)
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // reserved for later

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;

// cache for rarity source once we find it
let FF_RARITY_SOURCE = null;

// ------------------------
// Public entrypoint
// ------------------------
async function loadRecentSales() {
  const container = document.getElementById('recent-sales');
  const statusEl  = document.getElementById('recent-sales-status');

  if (!container) {
    console.warn('loadRecentSales: #recent-sales container not found');
    return;
  }

  if (statusEl) statusEl.textContent = 'Loading recent sales...';

  try {
    const sales = await fetchRecentSales(24); // latest 24 sales

    if (!sales.length) {
      if (statusEl) statusEl.textContent = 'No recent sales found.';
      return;
    }

    // Clear loading text
    if (statusEl) statusEl.textContent = '';

    for (const sale of sales) {
      const rawTokenId = sale.tokenId;
      const tokenId    = parseInt(rawTokenId, 10);

      if (!rawTokenId || Number.isNaN(tokenId)) {
        console.warn('Skipping sale with invalid tokenId', sale);
        continue;
      }

      // Use metadata if present; otherwise fetch it
      let metadata = sale.metadata || sale.tokenMetadata;
      if (!metadata) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      const ownerAddress =
        sale.buyerAddress || sale.to || sale.ownerAddress || sale.sellerAddress;
      const ownerDisplay = formatOwnerAddress(ownerAddress);
      const priceDisplay = formatPrice(sale);

      const card = createFrogCard({
        tokenId,
        rarityKey: rawTokenId,
        metadata,
        headerLeft: ownerDisplay,
        headerRight: priceDisplay
      });

      container.appendChild(card);
    }
  } catch (error) {
    console.error('Unable to load recent sales', error);
    if (statusEl) {
      statusEl.textContent = 'Unable to load recent sales right now.';
    }
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  loadRecentSales();
});

// ------------------------
// Rarity discovery helpers
// ------------------------
function resolveRaritySource() {
  if (FF_RARITY_SOURCE) return FF_RARITY_SOURCE;
  if (typeof window === 'undefined') return null;

  // likely names
  const candidateNames = [
    'rarityMap',
    'rarityRankings',
    'rarityRanks',
    'rarity',
    'frogRarity',
    'frogRarities'
  ];

  for (const name of candidateNames) {
    if (window[name] && (Array.isArray(window[name]) || typeof window[name] === 'object')) {
      FF_RARITY_SOURCE = { name, map: window[name] };
      console.log('[FreshFrogs] Using rarity source:', name);
      return FF_RARITY_SOURCE;
    }
  }

  // fallback: scan window for a big object/array that *might* be rankings
  for (const key in window) {
    if (!Object.prototype.hasOwnProperty.call(window, key)) continue;
    if (!/rarity/i.test(key)) continue;

    const val = window[key];
    if (val && (Array.isArray(val) || typeof val === 'object')) {
      FF_RARITY_SOURCE = { name: key, map: val };
      console.log('[FreshFrogs] Using fallback rarity source:', key);
      return FF_RARITY_SOURCE;
    }
  }

  console.warn('[FreshFrogs] No rarity source found on window');
  return null;
}

function resolveRarityRank(tokenId, rarityKey) {
  const source = resolveRaritySource();
  if (!source || !source.map) return null;

  const map = source.map;
  let rankRaw = null;

  // If it's an array, try index-based lookup
  if (Array.isArray(map)) {
    // some files might be 0-based, some 1-based
    rankRaw = map[tokenId] ?? map[tokenId - 1];
  } else if (typeof map === 'object') {
    // Try a bunch of key shapes
    const k1 = rarityKey;               // raw tokenId from API (string)
    const k2 = String(rarityKey);       // explicit string
    const k3 = tokenId;                 // numeric ID
    const k4 = String(tokenId);         // "123"
    const k5 = `Frog #${tokenId}`;      // "Frog #123"

    rankRaw =
      map[k1] ?? map[k2] ?? map[k3] ?? map[k4] ?? map[k5];
  }

  if (rankRaw === undefined || rankRaw === null || rankRaw === '') return null;

  const n = Number(rankRaw);
  if (Number.isNaN(n) || n <= 0) return null;

  return n;
}

// ------------------------
// Card + rarity helpers
// ------------------------
function createFrogCard({
  tokenId,
  rarityKey,
  metadata,
  headerLeft,
  headerRight,
  footerHtml,
  actionHtml
}) {
  const frogName = `Frog #${tokenId}`;

  const rarityRank = resolveRarityRank(tokenId, rarityKey);
  const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;

  const rarityText  = rarityTier ? rarityTier.label : 'Rarity Unknown';
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
// Alchemy fetchers
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
  const sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];

  return sales;
}

async function fetchFrogMetadata(tokenId) {
  try {
    const params = new URLSearchParams({
      contractAddress: FF_COLLECTION_ADDRESS,
      tokenId: String(tokenId)
    });

    const url      = `${FF_ALCHEMY_NFT_BASE}/getNFTMetadata?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }

    const json = await response.json();
    // Prefer raw.metadata (Alchemy shape), fall back to top-level
    const meta = (json.raw && json.raw.metadata) || {
      name: json.name,
      description: json.description,
      attributes: json.attributes || []
    };

    return meta || {};
  } catch (err) {
    console.error(`Failed to fetch metadata for token ${tokenId}`, err);
    return {};
  }
}

// ------------------------
// Formatting helpers
// ------------------------
function formatOwnerAddress(address) {
  if (!address || typeof address !== 'string') {
    return 'Buyer: Unknown';
  }
  const short =
    address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  return `Buyer: ${short}`;
}

function formatPrice(sale) {
  if (!sale) return '--';

  // Alchemy getNFTSales v3 shape includes sellerFee / protocolFee / royaltyFee / price
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
