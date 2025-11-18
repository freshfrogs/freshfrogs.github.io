// assets/site.js

// ------------------------
// Config (namespaced to avoid collisions)
// ------------------------
const FF_COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FF_CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const FF_ALCHEMY_API_KEY    = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const FF_OPENSEA_API_KEY    = '48ffee972fc245fa965ecfe902b02ab4'; // reserved for later

const FF_ALCHEMY_NFT_BASE   = `https://eth-mainnet.g.alchemy.com/nft/v3/${FF_ALCHEMY_API_KEY}`;

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
    const sales = await fetchRecentSales(200); // latest 24 sales

    if (!sales.length) {
      if (statusEl) statusEl.textContent = 'No recent sales found.';
      return;
    }

    // Clear loading text
    if (statusEl) statusEl.textContent = '';

    for (const sale of sales) {
      const rawTokenId = sale.tokenId;
      const tokenId = parseInt(rawTokenId, 10);

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

  // ---- RARITY LOOKUP (more flexible) ----
  let rarityRank = null;

  try {
    if (typeof window !== 'undefined' && window.rarityMap) {
      const map = window.rarityMap;

      // Try a few possible key shapes
      const k1 = rarityKey;               // raw tokenId from API (string)
      const k2 = String(rarityKey);       // explicit string
      const k3 = tokenId;                 // numeric ID
      const k4 = String(tokenId);         // string numeric
      const k5 = `Frog #${tokenId}`;      // in case your map keys use the full label

      const rankRaw =
        map[k1] ?? map[k2] ?? map[k3] ?? map[k4] ?? map[k5];

      if (rankRaw !== undefined && rankRaw !== null && rankRaw !== '') {
        const n = Number(rankRaw);
        if (!Number.isNaN(n) && n > 0) {
          rarityRank = n;
        }
      }
    }
  } catch (e) {
    console.warn('Error while reading rarityMap', e);
  }

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
    return 'Unknown';
  }
  const short =
    address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  return `${short}`;
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
