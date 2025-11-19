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
const FF_ACTIVITY_MODE      = 'sales'; // change to 'mints' if you want mints instead

// ------------------------
// Entry
// ------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadRecentActivity();
});

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
      // tokenId shapes:
      //  - sales: item.tokenId (often hex like "0x3c7")
      //  - mints: item.erc721TokenId or tokenId (also hex)
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
      let metadata = item.metadata || item.tokenMetadata;
      if (!metadata) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      // address + price
      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        ownerAddress = item.to;
        headerRight  = formatMintPrice(item); // may be "--" if value not present
      } else {
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const headerLeft = truncateAddress(ownerAddress); // <–– no "Buyer:" text

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
    if (statusEl) {
      statusEl.textContent =
        FF_ACTIVITY_MODE === 'mints'
          ? 'Unable to load recent mints right now.'
          : 'Unable to load recent sales right now.';
    }
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

  // Most likely exports from rarityrankings.js – adjust here if your file uses a different name
  const map =
    window.rarityMap ||
    window.rarityRankings ||
    null;

  if (!map) {
    // First load only; avoid spamming logs
    if (!getRarityRank._warned) {
      console.warn('[FreshFrogs] No rarity map found (expected window.rarityMap or window.rarityRankings)');
      getRarityRank._warned = true;
    }
    return null;
  }

  let rankRaw;
  if (Array.isArray(map)) {
    // If it's an array, try tokenId and tokenId-1 (depending on indexing)
    rankRaw = map[tokenId] ?? map[tokenId - 1];
  } else {
    rankRaw = map[tokenId] ?? map[String(tokenId)];
  }

  if (rankRaw === undefined || rankRaw === null || rankRaw === '') return null;

  const n = Number(rankRaw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// ------------------------
// Card rendering
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
// Activity fetchers
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
        fromAddress: '0x0000000000000000000000000000000000000000',
        contractAddresses: [FF_COLLECTION_ADDRESS],
        category: ['erc721'],
        order: 'desc',
        maxCount: '0x' + limit.toString(16),
        withMetadata: false
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
