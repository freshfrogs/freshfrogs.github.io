const ALCHEMY_API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const ALCHEMY_NFT_BASE_URL = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
const FROG_COLLECTION_ADDRESS =
  typeof COLLECTION_ADDRESS !== 'undefined'
    ? COLLECTION_ADDRESS
    : '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FROG_SOURCE_PATH =
  typeof SOURCE_PATH !== 'undefined' ? SOURCE_PATH : 'https://freshfrogs.github.io';
const CONTROLLER_ADDRESS_FOR_SALES =
  typeof CONTROLLER_ADDRESS !== 'undefined'
    ? CONTROLLER_ADDRESS
    : '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const CONTROLLER_ABI_FOR_SALES = typeof CONTROLLER_ABI !== 'undefined' ? CONTROLLER_ABI : null;
const ALCHEMY_MAINNET_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

let readOnlyWeb3ForSales = null;
let readOnlyControllerForSales = null;

async function fetchRecentFrogSales({ limit = 6, contractAddress = FROG_COLLECTION_ADDRESS } = {}) {
  const params = new URLSearchParams({
    contractAddress,
    limit: String(limit),
    order: 'desc',
    withMetadata: 'true'
  });

  const response = await fetch(`${ALCHEMY_NFT_BASE_URL}/getNFTSales?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Alchemy getNFTSales failed: ${response.status} ${message}`);
  }

  const payload = await response.json();
  return payload.nftSales ?? [];
}

function parseTokenId(tokenId) {
  if (!tokenId) return '--';
  if (tokenId.startsWith('0x')) {
    try {
      return BigInt(tokenId).toString(10);
    } catch (error) {
      console.warn('Unable to parse token id', tokenId, error);
      return tokenId;
    }
  }
  return tokenId;
}

function formatAddress(address) {
  if (!address) return '—';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatPriceValue(valueBigInt, decimals, symbol, { includeSign = false } = {}) {
  if (typeof decimals !== 'number' || Number.isNaN(decimals)) {
    decimals = 18;
  }

  try {
    const base = 10n ** BigInt(decimals);
    const absoluteValue = valueBigInt < 0n ? -valueBigInt : valueBigInt;
    const whole = absoluteValue / base;
    const fraction = absoluteValue % base;
    let fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
    fractionStr = fractionStr.replace(/0+$/, '');
    const displayFraction = fractionStr ? `.${fractionStr}` : '';
    let prefix = '';
    if (includeSign) {
      if (valueBigInt > 0n) {
        prefix = '+';
      } else if (valueBigInt < 0n) {
        prefix = '-';
      }
    }

    return `${prefix}${whole.toString()}${displayFraction} ${symbol}`;
  } catch (error) {
    console.warn('Unable to format price value', valueBigInt, decimals, symbol, error);
    return `${valueBigInt} ${symbol}`;
  }
}

function extractPriceInfo(priceLike) {
  if (!priceLike && priceLike !== 0) return null;

  if (typeof priceLike === 'string' || typeof priceLike === 'number' || typeof priceLike === 'bigint') {
    try {
      const valueBigInt = BigInt(priceLike);
      const decimals = 18;
      const symbol = 'Ξ';
      return {
        valueBigInt,
        decimals,
        symbol,
        formatted: formatPriceValue(valueBigInt, decimals, symbol)
      };
    } catch (error) {
      console.warn('Unable to parse primitive price info', priceLike, error);
      return null;
    }
  }

  const token = priceLike.token ?? priceLike.paymentToken ?? priceLike.unitPrice?.token ?? {};
  const decimals = Number(token.decimals ?? priceLike.decimals ?? priceLike.tokenDecimals ?? 18);
  const symbol = token.symbol ?? priceLike.currency ?? priceLike.unitPrice?.currencySymbol ?? priceLike.symbol ?? 'Ξ';
  const valueRaw =
    priceLike.value ??
    priceLike.amount ??
    priceLike.totalPrice ??
    priceLike.price ??
    priceLike.basePrice ??
    priceLike.quantity ??
    priceLike.netAmount;

  if (valueRaw === undefined || valueRaw === null) {
    return null;
  }

  try {
    const valueBigInt = BigInt(valueRaw);
    return {
      valueBigInt,
      decimals,
      symbol,
      formatted: formatPriceValue(valueBigInt, decimals, symbol)
    };
  } catch (error) {
    console.warn('Unable to parse price info', priceLike, error);
    return null;
  }
}

function deriveSalePriceInfo(sale) {
  const direct =
    extractPriceInfo(sale?.salePrice) ||
    extractPriceInfo(sale?.price) ||
    extractPriceInfo(sale?.totalPrice) ||
    extractPriceInfo(sale?.buyerPrice);

  if (direct) {
    return direct;
  }

  const sellerInfo = extractPriceInfo(sale?.sellerFee);
  const protocolInfo = extractPriceInfo(sale?.protocolFee);
  const royaltyInfo = extractPriceInfo(sale?.royaltyFee);

  const components = [sellerInfo, protocolInfo, royaltyInfo].filter(Boolean);
  if (!components.length) {
    return null;
  }

  const base = components[0];
  const mixedSymbols = components.some(
    (info) => info.symbol !== base.symbol || info.decimals !== base.decimals
  );

  if (mixedSymbols) {
    return base;
  }

  const total = components.reduce((sum, info) => sum + info.valueBigInt, 0n);
  return {
    valueBigInt: total,
    decimals: base.decimals,
    symbol: base.symbol,
    formatted: formatPriceValue(total, base.decimals, base.symbol)
  };
}

function buildStat(label, value) {
  const wrapper = document.createElement('div');
  const spanLabel = document.createElement('span');
  spanLabel.className = 'frog-card__label';
  spanLabel.textContent = label;
  const spanValue = document.createElement('span');
  spanValue.className = 'frog-card__value';
  spanValue.textContent = value;
  wrapper.append(spanLabel, spanValue);
  return wrapper;
}

function buildActionRow(icon, label, value, href) {
  const item = document.createElement('li');
  const spanLabel = document.createElement('span');
  spanLabel.className = 'frog-card__actions-label';
  spanLabel.textContent = `${icon ? `${icon} ` : ''}${label}`;

  let valueNode;
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = value;
    link.className = 'frog-card__actions-value';
    valueNode = link;
  } else {
    const spanValue = document.createElement('span');
    spanValue.className = 'frog-card__actions-value';
    spanValue.textContent = value;
    valueNode = spanValue;
  }

  item.append(spanLabel, valueNode);
  return { item, valueNode };
}

function updateActionRow(row, value, href) {
  if (!row || !row.item || !row.valueNode) {
    return;
  }

  const displayValue = value || '—';

  if (href) {
    if (row.valueNode.tagName !== 'A') {
      const link = document.createElement('a');
      link.className = 'frog-card__actions-value';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = displayValue;
      link.href = href;
      row.item.replaceChild(link, row.valueNode);
      row.valueNode = link;
    } else {
      row.valueNode.href = href;
      row.valueNode.target = '_blank';
      row.valueNode.rel = 'noopener noreferrer';
      row.valueNode.textContent = displayValue;
    }
  } else if (row.valueNode.tagName === 'A') {
    const span = document.createElement('span');
    span.className = 'frog-card__actions-value';
    span.textContent = displayValue;
    row.item.replaceChild(span, row.valueNode);
    row.valueNode = span;
  } else {
    row.valueNode.textContent = displayValue;
  }
}

function toTitleCase(value) {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function findAttributeValue(attributes, traitNames) {
  if (!Array.isArray(attributes)) return null;
  const targets = Array.isArray(traitNames) ? traitNames : [traitNames];
  const loweredTargets = targets.map((name) => String(name).toLowerCase());

  for (const attribute of attributes) {
    const traitRaw =
      attribute?.trait_type ?? attribute?.traitType ?? attribute?.type ?? attribute?.label ?? '';
    const trait = String(traitRaw).toLowerCase();

    if (loweredTargets.includes(trait)) {
      const value = attribute?.value ?? attribute?.display_value ?? attribute?.displayValue;
      if (value === undefined || value === null || value === '') {
        continue;
      }
      return String(value);
    }
  }

  return null;
}

async function getControllerContractForSales() {
  if (typeof controller !== 'undefined' && controller?.methods?.stakerAddress) {
    return controller;
  }

  if (readOnlyControllerForSales) {
    return readOnlyControllerForSales;
  }

  if (!CONTROLLER_ABI_FOR_SALES) {
    return null;
  }

  const Web3Constructor = typeof Web3 !== 'undefined' ? Web3 : window?.Web3;
  if (!Web3Constructor) {
    return null;
  }

  if (!readOnlyWeb3ForSales) {
    readOnlyWeb3ForSales = new Web3Constructor(ALCHEMY_MAINNET_RPC_URL);
  }

  readOnlyControllerForSales = new readOnlyWeb3ForSales.eth.Contract(
    CONTROLLER_ABI_FOR_SALES,
    CONTROLLER_ADDRESS_FOR_SALES
  );

  return readOnlyControllerForSales;
}

async function resolveCurrentHolderAddress(tokenId, fallbackAddress) {
  const normalizedTokenId = Number.parseInt(tokenId, 10);
  if (!Number.isFinite(normalizedTokenId)) {
    return fallbackAddress;
  }

  try {
    const contract = await getControllerContractForSales();
    if (!contract || !contract.methods?.stakerAddress) {
      return fallbackAddress;
    }

    const holder = await contract.methods.stakerAddress(normalizedTokenId).call();
    if (!holder || /^0x0{40}$/i.test(holder)) {
      return fallbackAddress;
    }

    return holder;
  } catch (error) {
    console.warn('Unable to resolve staker address', tokenId, error);
    return fallbackAddress;
  }
}

function createFrogSaleCard(sale) {
  const tokenId = parseTokenId(sale?.nft?.tokenId ?? sale?.tokenId);
  const name = sale?.nft?.metadata?.name || (tokenId !== '--' ? `Frog #${tokenId}` : 'FreshFrog');
  const imageFromMetadata = sale?.nft?.metadata?.image || sale?.nft?.imageUrl || sale?.nft?.rawMetadata?.image;
  const fallbackImageToken = tokenId !== '--' ? tokenId : '1';
  const imageSrc = imageFromMetadata || `${FROG_SOURCE_PATH}/frog/${fallbackImageToken}.png`;
  const salePriceInfo = deriveSalePriceInfo(sale);
  const salePrice = salePriceInfo?.formatted ?? '--';
  const purchasePriceDisplay = salePrice === '--' ? '—' : salePrice;
  const txHash = sale?.transactionHash;

  const attributes =
    sale?.nft?.metadata?.attributes || sale?.nft?.rawMetadata?.attributes || sale?.nft?.traits || [];

  const rarityRank =
    findAttributeValue(attributes, ['rarity', 'rank', 'ranking', 'rarity rank']) ||
    sale?.nft?.rarity?.rank?.toString();
  const rarityPercentileRaw = findAttributeValue(attributes, [
    'rarity percentile',
    'rarity percent',
    'rarity_percentile',
    'percentile'
  ]);
  const rarityTier = findAttributeValue(attributes, ['rarity tier', 'tier']);
  const rewardsRaw = findAttributeValue(attributes, ['rewards', '$fly earned', 'rewards earned']);
  const levelRaw = findAttributeValue(attributes, ['level']);

  const rewardsDisplay = rewardsRaw ? (isNaN(Number(rewardsRaw)) ? rewardsRaw : `${rewardsRaw} $FLY`) : '—';
  const levelDisplay = levelRaw || '—';

  let rarityDisplay = '—';
  if (rarityPercentileRaw) {
    const numeric = Number(String(rarityPercentileRaw).replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) {
      const hasPercentSymbol = String(rarityPercentileRaw).includes('%');
      const numericDisplay = Number.isInteger(numeric)
        ? numeric.toString()
        : Number(numeric.toFixed(2))
            .toString()
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');
      rarityDisplay = `Top ${numericDisplay}${hasPercentSymbol ? '' : '%'}`;
    } else {
      rarityDisplay = rarityPercentileRaw;
    }
  } else if (rarityRank) {
    rarityDisplay = rarityRank.startsWith('#') ? rarityRank : `#${rarityRank}`;
  } else if (rarityTier) {
    rarityDisplay = toTitleCase(rarityTier);
  } else if (sale?.nft?.rarity?.rank) {
    rarityDisplay = `#${sale.nft.rarity.rank}`;
  }

  const fallbackHolderAddress =
    sale?.buyerAddress ||
    sale?.nft?.owner?.address ||
    sale?.ownerAddress ||
    sale?.sellerAddress ||
    null;
  const fallbackHolderDisplay = formatAddress(fallbackHolderAddress);
  const fallbackHolderUrl = fallbackHolderAddress
    ? `https://etherscan.io/address/${fallbackHolderAddress}`
    : null;

  const card = document.createElement('article');
  card.className = 'frog-card';

  const media = document.createElement('div');
  media.className = 'frog-card__media';

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = name;
  img.loading = 'lazy';

  media.append(img);

  const body = document.createElement('div');
  body.className = 'frog-card__body';

  const header = document.createElement('header');
  header.className = 'frog-card__header';

  const heading = document.createElement('h2');
  heading.textContent = name;
  header.append(heading);

  const stats = document.createElement('div');
  stats.className = 'frog-card__stats';
  stats.append(
    buildStat('Rewards', rewardsDisplay),
    buildStat('Level', levelDisplay),
    buildStat('Rarity', rarityDisplay)
  );

  const actions = document.createElement('ul');
  actions.className = 'frog-card__actions';

  const holderRow = buildActionRow('👑', 'Current Holder', fallbackHolderDisplay || '—', fallbackHolderUrl);
  const priceRow = buildActionRow('🪙', 'Purchase Price', purchasePriceDisplay);
  actions.append(holderRow.item, priceRow.item);

  const cta = document.createElement('a');
  cta.className = 'frog-card__cta';
  cta.textContent = '🐸 View on OpenSea';
  cta.target = '_blank';
  const tokenUrl = tokenId !== '--' ? `https://opensea.io/assets/ethereum/${FROG_COLLECTION_ADDRESS}/${tokenId}` : '#';
  cta.href = tokenUrl;
  cta.rel = 'noopener noreferrer';

  if (txHash) {
    cta.dataset.tx = txHash;
  }

  body.append(header, stats, actions, cta);
  card.append(media, body);

  const fallbackHolderNormalized = fallbackHolderAddress ? fallbackHolderAddress.toLowerCase() : null;
  resolveCurrentHolderAddress(tokenId, fallbackHolderAddress)
    .then((holderAddress) => {
      if (!holderAddress) {
        return;
      }

      const normalized = holderAddress.toLowerCase();
      if (fallbackHolderNormalized && normalized === fallbackHolderNormalized) {
        return;
      }

      updateActionRow(
        holderRow,
        formatAddress(holderAddress),
        `https://etherscan.io/address/${holderAddress}`
      );
    })
    .catch((error) => {
      console.warn('Unable to update holder for frog', tokenId, error);
    });

  return card;
}

async function populateRecentFrogSales({
  containerId = 'recentSales',
  limit = 6,
  contractAddress = FROG_COLLECTION_ADDRESS
} = {}) {
  const host = document.getElementById(containerId);
  if (!host) {
    console.warn(`populateRecentFrogSales: container #${containerId} not found.`);
    return;
  }

  host.innerHTML = '<p class="recent-sales__status">Loading recent sales…</p>';

  try {
    const sales = await fetchRecentFrogSales({ limit, contractAddress });

    if (!Array.isArray(sales) || sales.length === 0) {
      host.innerHTML = '<p class="recent-sales__status">No recent sales detected.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'recent-sales__grid';

    sales.slice(0, limit).forEach((sale) => {
      const card = createFrogSaleCard(sale);
      grid.append(card);
    });

    host.innerHTML = '';
    host.append(grid);
  } catch (error) {
    console.error('Unable to load recent sales', error);
    host.innerHTML = '<p class="recent-sales__status recent-sales__status--error">Unable to load recent sales. Please try again later.</p>';
  }
}

window.fetchRecentFrogSales = fetchRecentFrogSales;
window.populateRecentFrogSales = populateRecentFrogSales;
window.createFrogSaleCard = createFrogSaleCard;
