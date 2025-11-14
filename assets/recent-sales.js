const ALCHEMY_API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const ALCHEMY_NFT_BASE_URL = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
const FROG_COLLECTION_ADDRESS =
  typeof COLLECTION_ADDRESS !== 'undefined'
    ? COLLECTION_ADDRESS
    : '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const FROG_SOURCE_PATH =
  typeof SOURCE_PATH !== 'undefined' ? SOURCE_PATH : 'https://freshfrogs.github.io';

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

function formatSalePrice(salePrice) {
  if (!salePrice) return '--';

  const valueRaw = salePrice.value ?? salePrice.amount ?? salePrice.totalPrice ?? salePrice.price;
  if (!valueRaw) return '--';

  const token = salePrice.token ?? salePrice.paymentToken ?? salePrice.unitPrice?.token ?? {};
  const decimals = Number(token.decimals ?? salePrice.decimals ?? 18);
  const symbol = token.symbol ?? salePrice.currency ?? salePrice.unitPrice?.currencySymbol ?? 'Ξ';

  try {
    const valueBigInt = BigInt(valueRaw);
    const base = 10n ** BigInt(decimals);
    const whole = valueBigInt / base;
    const fraction = valueBigInt % base;
    let fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
    fractionStr = fractionStr.replace(/0+$/, '');
    const displayFraction = fractionStr ? `.${fractionStr}` : '';
    return `${whole.toString()}${displayFraction} ${symbol}`;
  } catch (error) {
    console.warn('Unable to format sale price', salePrice, error);
    return `${valueRaw} ${symbol}`;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'recently';
  try {
    const saleDate = new Date(timestamp);
    const now = new Date();
    const diffMs = saleDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 1) {
      return 'just now';
    }

    const ranges = [
      { limit: 60, divisor: 1, unit: 'minute' },
      { limit: 24 * 60, divisor: 60, unit: 'hour' },
      { limit: 30 * 24 * 60, divisor: 60 * 24, unit: 'day' },
      { limit: 12 * 30 * 24 * 60, divisor: 60 * 24 * 30, unit: 'month' },
    ];

    for (const range of ranges) {
      if (Math.abs(diffMinutes) < range.limit) {
        const value = Math.round(diffMinutes / range.divisor);
        return rtf.format(value, range.unit);
      }
    }

    const years = Math.round(diffMinutes / (60 * 24 * 365));
    return rtf.format(years, 'year');
  } catch (error) {
    console.warn('Unable to format relative time', timestamp, error);
    return 'recently';
  }
}

function buildMetaItem(dtText, ddText) {
  const wrapper = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = dtText;
  const dd = document.createElement('dd');
  dd.textContent = ddText;
  wrapper.append(dt, dd);
  return wrapper;
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

function buildActionRow(label, value, href) {
  const item = document.createElement('li');
  const spanLabel = document.createElement('span');
  spanLabel.textContent = label;

  let valueNode;
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = value;
    valueNode = link;
  } else {
    const spanValue = document.createElement('span');
    spanValue.textContent = value;
    valueNode = spanValue;
  }

  item.append(spanLabel, valueNode);
  return item;
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

function createFrogSaleCard(sale) {
  const tokenId = parseTokenId(sale?.nft?.tokenId ?? sale?.tokenId);
  const name = sale?.nft?.metadata?.name || (tokenId !== '--' ? `Frog #${tokenId}` : 'FreshFrog');
  const imageFromMetadata = sale?.nft?.metadata?.image || sale?.nft?.imageUrl || sale?.nft?.rawMetadata?.image;
  const fallbackImageToken = tokenId !== '--' ? tokenId : '1';
  const imageSrc = imageFromMetadata || `${FROG_SOURCE_PATH}/frog/${fallbackImageToken}.png`;
  const salePrice = formatSalePrice(sale?.salePrice);
  const saleMarketplace = sale?.marketplace || sale?.marketplaceInfo?.name || 'Marketplace';
  const saleTypeRaw = sale?.saleType ? sale.saleType.replace(/_/g, ' ') : 'Sale';
  const saleType = toTitleCase(saleTypeRaw);
  const timeAgo = formatRelativeTime(sale?.blockTimestamp);
  const buyer = formatAddress(sale?.buyerAddress);
  const seller = formatAddress(sale?.sellerAddress);
  const txHash = sale?.transactionHash;
  const txShort = txHash ? `${txHash.slice(0, 6)}…${txHash.slice(-4)}` : '—';
  const buyerUrl = sale?.buyerAddress ? `https://etherscan.io/address/${sale.buyerAddress}` : null;
  const sellerUrl = sale?.sellerAddress ? `https://etherscan.io/address/${sale.sellerAddress}` : null;
  const txUrl = txHash ? `https://etherscan.io/tx/${txHash}` : null;

  const card = document.createElement('article');
  card.className = 'frog-card';

  const media = document.createElement('div');
  media.className = 'frog-card__media';

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = name;
  img.loading = 'lazy';

  const badge = document.createElement('span');
  badge.className = 'frog-card__badge';
  badge.textContent = 'Recently Sold';

  media.append(img, badge);

  const body = document.createElement('div');
  body.className = 'frog-card__body';

  const header = document.createElement('header');
  header.className = 'frog-card__header';

  const heading = document.createElement('h2');
  heading.textContent = name;

  const price = document.createElement('span');
  price.className = 'frog-card__price';
  price.textContent = `Last Sale · ${salePrice}`;

  header.append(heading, price);

  const subtitle = document.createElement('p');
  subtitle.className = 'frog-card__subtitle';
  subtitle.textContent = `${saleType} ${timeAgo} on ${saleMarketplace}`;

  const meta = document.createElement('dl');
  meta.className = 'frog-card__meta';
  meta.append(
    buildMetaItem('Token', tokenId !== '--' ? `#${tokenId}` : '—'),
    buildMetaItem('Buyer', buyer),
    buildMetaItem('Seller', seller),
    buildMetaItem('Tx Hash', txShort)
  );

  const stats = document.createElement('div');
  stats.className = 'frog-card__stats';
  stats.append(
    buildStat('Marketplace', saleMarketplace),
    buildStat('Type', saleType),
    buildStat('Block', sale?.blockNumber ? `#${sale.blockNumber}` : '—')
  );

  const actions = document.createElement('ul');
  actions.className = 'frog-card__actions';
  actions.append(
    buildActionRow('Buyer', buyer, buyerUrl),
    buildActionRow('Seller', seller, sellerUrl),
    buildActionRow('Tx', txShort, txUrl)
  );

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

  body.append(header, subtitle, meta, stats, actions, cta);
  card.append(media, body);

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
