const ALCHEMY_API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const ALCHEMY_NFT_BASE = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
const ALCHEMY_BASE = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(`${key}[]`, entry));
    } else {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
}

async function alchemyFetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alchemy request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function hexToDecimalId(hexId) {
  if (!hexId) {
    return null;
  }
  try {
    const normalized = hexId.startsWith('0x') ? hexId : `0x${hexId}`;
    return BigInt(normalized).toString();
  } catch (error) {
    console.error('Unable to parse token id', hexId, error);
    return null;
  }
}

function parseSalePrice(sale) {
  const price = sale?.price || {};
  const rawAmount = price.amount || price.value || price.totalPrice || price.eth || price.wei;
  let decimal = 0;
  if (rawAmount) {
    const numeric = Number(rawAmount);
    if (!Number.isNaN(numeric) && numeric > 1e12) {
      decimal = numeric / 1e18;
    } else if (!Number.isNaN(numeric)) {
      decimal = numeric;
    }
  } else if (price.wei) {
    const wei = Number(price.wei);
    if (!Number.isNaN(wei)) {
      decimal = wei / 1e18;
    }
  }

  const usd = Number(price.usd ?? price.usdPrice ?? price.usdValue ?? 0);

  return {
    decimal: Number.isFinite(decimal) ? decimal : 0,
    usd: Number.isFinite(usd) ? usd : 0,
  };
}

async function alchemyFetchContractStats(contractAddress) {
  try {
    const contractMetadataUrl = `${ALCHEMY_NFT_BASE}/getContractMetadata?${buildQuery({ contractAddress })}`;
    const ownersUrl = `${ALCHEMY_NFT_BASE}/getOwnersForCollection?${buildQuery({ contractAddress, withTokenBalances: 'false' })}`;

    const [metadata, owners] = await Promise.all([
      alchemyFetchJson(contractMetadataUrl),
      alchemyFetchJson(ownersUrl),
    ]);

    const totalSupplyCandidate = metadata?.contractMetadata?.totalSupply
      ?? metadata?.contractMetadata?.openSea?.collectionStats?.totalSupply
      ?? metadata?.contractMetadata?.openSea?.collectionStats?.count
      ?? null;

    const totalSupply = totalSupplyCandidate !== null && totalSupplyCandidate !== undefined
      ? Number(totalSupplyCandidate)
      : null;

    const ownerCountCandidate = owners?.totalCount ?? owners?.owners?.length ?? null;
    const ownerCount = ownerCountCandidate !== null && ownerCountCandidate !== undefined
      ? Number(ownerCountCandidate)
      : null;

    return {
      totalSupply,
      ownerCount,
    };
  } catch (error) {
    console.error('Failed to fetch Alchemy contract stats', error);
    return {
      totalSupply: null,
      ownerCount: null,
    };
  }
}

async function alchemyFetchNFTsForOwner(owner, contractAddress, pageKey, pageSize) {
  try {
    const normalizedPageSize = pageSize ? Number(pageSize) : undefined;
    const query = buildQuery({
      owner,
      withMetadata: 'false',
      pageSize: normalizedPageSize,
      pageKey,
    });
    const url = `${ALCHEMY_NFT_BASE}/getNFTsForOwner?${query}&contractAddresses[]=${contractAddress}`;
    const data = await alchemyFetchJson(url);
    const tokens = (data?.ownedNfts || []).map((nft) => ({
      token: {
        tokenId: hexToDecimalId(nft?.id?.tokenId),
      },
      raw: nft,
    })).filter((entry) => entry.token.tokenId !== null);

    return {
      tokens,
      continuation: data?.pageKey ?? null,
      totalCount: data?.totalCount ?? tokens.length,
    };
  } catch (error) {
    console.error('Failed to fetch NFTs for owner from Alchemy', error);
    return {
      tokens: [],
      continuation: null,
      totalCount: 0,
    };
  }
}

async function alchemyFetchNFTSales(contractAddress, limit, pageKey) {
  try {
    const normalizedLimit = limit ? Number(limit) : undefined;
    const query = buildQuery({
      contractAddress,
      order: 'desc',
      limit: normalizedLimit,
      pageKey,
    });
    const url = `${ALCHEMY_NFT_BASE}/getNFTSales?${query}`;
    const data = await alchemyFetchJson(url);

    const sales = (data?.nftSales || []).map((sale) => {
      const tokenId = hexToDecimalId(sale?.tokenId);
      const timestampIso = sale?.timestamp ?? sale?.blockTimestamp ?? null;
      const timestamp = timestampIso ? Math.floor(new Date(timestampIso).getTime() / 1000) : null;
      const price = parseSalePrice(sale);

      return {
        createdAt: timestampIso ?? '',
        timestamp,
        from: sale?.sellerAddress ?? ZERO_ADDRESS,
        to: sale?.buyerAddress ?? ZERO_ADDRESS,
        token: {
          tokenId,
        },
        price: {
          amount: {
            decimal: price.decimal,
            usd: price.usd,
          },
        },
        txHash: sale?.transactionHash ?? '',
      };
    }).filter((sale) => sale.token.tokenId !== null);

    return {
      sales,
      continuation: data?.pageKey ?? null,
    };
  } catch (error) {
    console.error('Failed to fetch NFT sales from Alchemy', error);
    return {
      sales: [],
      continuation: null,
    };
  }
}

async function alchemyFetchNFTMints(contractAddress, limit, pageKey) {
  try {
    const normalizedLimit = limit ? Number(limit) : undefined;
    const queryObject = {
      fromBlock: '0x0',
      toBlock: 'latest',
      category: 'erc721',
      maxCount: normalizedLimit,
      pageKey,
      fromAddress: ZERO_ADDRESS,
      withMetadata: 'true',
    };
    const query = buildQuery(queryObject);
    const url = `${ALCHEMY_BASE}/getNFTTransfers?${query}&contractAddresses[]=${contractAddress}`;
    const data = await alchemyFetchJson(url);

    const mints = (data?.nftTransfers || data?.transfers || []).map((transfer) => {
      const tokenId = hexToDecimalId(transfer?.erc721TokenId ?? transfer?.tokenId);
      const timestampIso = transfer?.metadata?.blockTimestamp ?? transfer?.blockTimestamp ?? null;
      const timestamp = timestampIso ? Math.floor(new Date(timestampIso).getTime() / 1000) : null;
      return {
        createdAt: timestampIso ?? '',
        timestamp,
        fromAddress: transfer?.from ?? ZERO_ADDRESS,
        toAddress: transfer?.to ?? ZERO_ADDRESS,
        token: {
          tokenId,
          rarityScore: null,
        },
        price: {
          amount: {
            decimal: 0,
            usd: 0,
          },
        },
        txHash: transfer?.hash ?? transfer?.transactionHash ?? '',
      };
    }).filter((mint) => mint.token.tokenId !== null);

    return {
      mints,
      continuation: data?.pageKey ?? null,
    };
  } catch (error) {
    console.error('Failed to fetch NFT mints from Alchemy', error);
    return {
      mints: [],
      continuation: null,
    };
  }
}

async function alchemyFetchOwnerTokenCount(owner, contractAddress) {
  const result = await alchemyFetchNFTsForOwner(owner, contractAddress, null, 1);
  return result.totalCount ?? 0;
}
