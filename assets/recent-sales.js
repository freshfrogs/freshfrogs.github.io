/*
 * FreshFrogs recent sales + staking helpers.
 * These functions replace the legacy Reservoir implementation with
 * a small Alchemy-based fetcher plus a renderer that reuses the
 * existing frog cards.
 */

const SALES_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function normalizeTokenId(rawTokenId) {
  if (rawTokenId === undefined || rawTokenId === null) { return null; }
  const asString = rawTokenId.toString();
  const parsed = asString.startsWith('0x') ? parseInt(asString, 16) : parseInt(asString, 10);
  if (!Number.isFinite(parsed)) { return null; }
  return parsed.toString();
}

function escapeHtml(value) {
  if (value === undefined || value === null) { return ''; }
  return value.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function feeToEth(fee) {
  if (!fee || fee.amount === undefined || fee.amount === null) { return null; }
  const decimals = typeof fee.decimals === 'number' ? fee.decimals : 18;
  const divisor = Math.pow(10, decimals);
  if (!divisor) { return null; }
  return Number(fee.amount) / divisor;
}

function infoRow(label, valueMarkup) {
  return '<div class="card_info_row">'
    +'<text class="card_text">'+escapeHtml(label)+'</text>'
    +valueMarkup
    +'</div>';
}

function wrapValue(value, id) {
  const safeValue = escapeHtml(value);
  if (id) {
    return '<text id="'+id+'" class="card_bold">'+safeValue+'</text>';
  }
  return '<text class="card_bold">'+safeValue+'</text>';
}

function trackSaleVolumes(ethValue, usdValue, isMint) {
  if (Number.isFinite(ethValue)) {
    if (isMint) { mint_volume_eth = (mint_volume_eth || 0) + Number(ethValue); }
    else { sales_volume_eth = (sales_volume_eth || 0) + Number(ethValue); }
  }

  if (Number.isFinite(usdValue)) {
    if (isMint) {
      mint_volume_usd = (mint_volume_usd || 0) + Number(usdValue);
      net_income_usd = (net_income_usd || 0) + Number(usdValue);
    } else {
      sales_volume_usd = (sales_volume_usd || 0) + Number(usdValue);
      net_income_usd = (net_income_usd || 0) + (Number(usdValue) * 0.025);
    }
  }
}

function formatSalePrice(sale) {
  const ethValue = feeToEth(sale.sellerFee) || feeToEth(sale.buyerFee);
  const usdRate = Number(eth_usd);
  const usdValue = (Number.isFinite(ethValue) && Number.isFinite(usdRate)) ? ethValue * usdRate : null;
  const pricePieces = [];
  if (Number.isFinite(ethValue)) { pricePieces.push(ethValue.toFixed(3)+'Ξ'); }
  if (Number.isFinite(usdValue)) { pricePieces.push('$'+usdValue.toFixed(2)); }
  const display = pricePieces.length ? pricePieces.join(' / ') : 'Unknown';

  const timestamp = sale.blockTimestamp
    ? Math.floor(new Date(sale.blockTimestamp).getTime() / 1000)
    : (sale.timestamp ? Math.floor(new Date(sale.timestamp).getTime() / 1000) : null);
  const date = timestamp ? timestampToDate(timestamp) : '';

  return { ethValue, usdValue, display, date };
}

function applySalesCardLayout(elementId) {
  const cardElement = document.getElementById(elementId);
  if (!cardElement) { return; }
  cardElement.classList.add('sales-card');

  const imageContainer = cardElement.querySelector('.index-card-img-cont');
  const textColumn = cardElement.querySelector('.index-card-text');
  if (!imageContainer || !textColumn) { return; }

  const mediaColumn = document.createElement('div');
  mediaColumn.className = 'sales-card__media';
  mediaColumn.appendChild(imageContainer);

  const buttonBox = textColumn.querySelector('.card_buttonbox');
  if (buttonBox) {
    mediaColumn.appendChild(buttonBox);
  }

  cardElement.insertBefore(mediaColumn, textColumn);
}

async function getFrogStakingSnapshot(tokenId) {
  const snapshot = {
    isStaked: false,
    holder: null,
    staker: null,
    daysStaked: 0,
    level: '--',
    nextLevelDays: '--',
    earned: '0.000',
    since: ''
  };

  if (typeof stakerAddress === 'function') {
    try {
      const staker = await stakerAddress(tokenId);
      if (staker && staker !== false) {
        snapshot.isStaked = true;
        snapshot.holder = staker;
        snapshot.staker = staker;
        if (typeof stakingValues === 'function') {
          try {
            const values = await stakingValues(tokenId);
            if (Array.isArray(values)) {
              snapshot.daysStaked = Number(values[0]) || 0;
              snapshot.level = values[1] || '--';
              snapshot.nextLevelDays = values[2];
              snapshot.earned = values[3];
              snapshot.since = values[4];
            }
          } catch (error) {
            console.warn('Unable to load staking values for Frog #'+tokenId, error);
          }
        }
        return snapshot;
      }
    } catch (error) {
      console.warn('Unable to fetch staking address for Frog #'+tokenId, error);
    }
  }

  if (typeof getCurrentOwner === 'function') {
    try {
      snapshot.holder = await getCurrentOwner(tokenId);
    } catch (error) {
      console.warn('Unable to resolve owner for Frog #'+tokenId, error);
    }
  }

  return snapshot;
}

async function fetch_token_sales(contract, limit, next_string) {
  const targetContract = contract || COLLECTION_ADDRESS;
  const targetLimit = limit || 50;

  const params = new URLSearchParams({
    contractAddress: targetContract,
    order: 'desc',
    limit: targetLimit.toString()
  });

  if (next_string) {
    params.append('pageKey', next_string);
  }

  const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${frog_api}/getNFTSales?${params.toString()}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Alchemy NFT sales request failed: '+response.status);
    }

    const payload = await response.json();
    const sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];
    await render_token_sales(targetContract, sales);

    if (payload.pageKey) {
      sales_load_button('sales', targetContract, targetLimit, payload.pageKey);
    }
  } catch (error) {
    console.error('Failed to fetch token sales', error);
  }
}

async function render_token_sales(contract, sales) {
  const saleList = Array.isArray(sales) ? sales : [];
  if (!saleList.length) { return; }

  const targetContract = contract || COLLECTION_ADDRESS;

  for (const sale of saleList) {
    try {
      const tokenId = normalizeTokenId(sale.tokenId || (sale.token && sale.token.tokenId));
      if (!tokenId) { continue; }

      const price = formatSalePrice(sale);
      const isMint = !sale.sellerAddress || sale.sellerAddress.toLowerCase() === SALES_ZERO_ADDRESS.toLowerCase();
      trackSaleVolumes(price.ethValue, price.usdValue, isMint);

      const staking = await getFrogStakingSnapshot(tokenId);
      const stakingLabel = staking.isStaked
        ? 'Staked · L'+(staking.level || '--')+' · '+(staking.daysStaked || 0)+'d'
        : 'Not Staked';

      const holderAddress = staking.holder || sale.buyerAddress;
      const holderLabel = holderAddress ? truncateAddress(holderAddress) : 'Unknown';
      const saleRowValue = price.date ? price.display+' · '+price.date : price.display;

      const rarityId = parseInt(tokenId, 10);
      const rarityRank = Number.isFinite(rarityId) ? findRankingById(rarityId) : null;
      const rarityLabel = rarityRank ? '#'+rarityRank : '--';

      const elementId = tokenId+':'+(sale.blockTimestamp || sale.transactionHash || Date.now());
      const html_elements =
        '<div class="sales-card__body">'
          +'<div class="sales-card__title-row">'
            +'<h3>Frog #'+tokenId+'</h3>'
            +(staking.since ? '<span>'+escapeHtml(staking.since)+'</span>' : '')
          +'</div>'
          +'<div class="sales-card__details">'
            +infoRow('Staking Status', wrapValue(stakingLabel)+'<span id="'+tokenId+'_frogType" style="display:none;"></span>')
            +infoRow('Current Holder', wrapValue(holderLabel))
            +infoRow(isMint ? 'Minted' : 'Recent Sale', wrapValue(saleRowValue))
            +infoRow('Rarity', wrapValue(rarityLabel, 'rarityRanking_'+tokenId))
          +'</div>'
        +'</div>'
        +'<div class="card_buttonbox">'
          +'<a href="https://etherscan.io/nft/'+targetContract+'/'+tokenId+'" target="_blank" rel="noopener">'
            +'<button class="etherscan_button" style="width: 128px;">Etherscan</button>'
          +'</a>'
        +'</div>';

      await build_token(html_elements, tokenId, elementId, isMint ? 'mint' : 'sale', sale.transactionHash);
      applySalesCardLayout(elementId);
    } catch (error) {
      console.error('Failed to render sale card', error);
    }
  }
}
