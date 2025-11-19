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

// 'sales' = use getNFTSales
// 'mints' = use alchemy_getAssetTransfers (ERC721 mints)
const FF_ACTIVITY_MODE      = 'sales'; // change to 'mints' if you want recent mints instead

// ------------------------
// Public entrypoint
// ------------------------
async function loadRecentActivity() {
  const container = document.getElementById('recent-sales');
  const statusEl  = document.getElementById('recent-sales-status');

  if (!container) {
    console.warn('loadRecentActivity: #recent-sales container not found');
    return;
  }

  if (statusEl) {
    statusEl.textContent =
      FF_ACTIVITY_MODE === 'mints' ? 'Loading recent mints...' : 'Loading recent sales...';
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
      // tokenId can be hex string ("0x3c7") or decimal string ("967")
      const rawTokenId =
        FF_ACTIVITY_MODE === 'mints' ? (item.erc721TokenId || item.tokenId) : item.tokenId;

      if (!rawTokenId) {
        console.warn('Skipping item with missing tokenId', item);
        continue;
      }

      const tokenId = parseTokenId(rawTokenId);
      if (!tokenId) {
        console.warn('Skipping item with unparseable tokenId', rawTokenId, item);
        continue;
      }

      // Use metadata if present; otherwise fetch it
      let metadata = item.metadata || item.tokenMetadata;
      if (!metadata) {
        metadata = await fetchFrogMetadata(tokenId);
      }

      let ownerAddress;
      let headerRight;

      if (FF_ACTIVITY_MODE === 'mints') {
        // Transfers API shape
        ownerAddress = item.to;
        headerRight  = formatMintPrice(item);
      } else {
        // getNFTSales shape
        ownerAddress =
          item.buyerAddress || item.to || item.ownerAddress || item.sellerAddress;
        headerRight  = formatSalePrice(item);
      }

      const ownerDisplay = formatOwnerAddress(ownerAddress);

      const card = createFrogCard({
        tokenId,
        metadata,
        headerLeft: ownerDisplay,
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

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  loadRecentActivity();
});

// ------------------------
// Token + rarity helpers
// ------------------------
function parseTokenId(raw) {
  if (typeof raw !== 'string') {
    raw = String(raw);
  }
  // Hex from API (e.g. "0x3c7")
  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    const n = parseInt(raw, 16);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  // Decimal string
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getRarityRank(tokenId) {
  if (typeof window === 'undefined') return null;

  const map =
    window.rarityMap ||
    window.rarityRankings ||
    null;

  if (!map) return null;

  const rankRaw = map[tokenId] ?? map[String(tokenId)];
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
  metadat
