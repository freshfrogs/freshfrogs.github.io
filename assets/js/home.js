(function () {
  'use strict';

  const App = window.FreshFrogs;
  if (!App) {
    console.error('[FreshFrogs] ethereum helpers missing.');
    return;
  }

  const RECENT_SALES_LIMIT = 16;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body && document.body.dataset.page && document.body.dataset.page !== 'home') {
      return;
    }
    loadRecentSales();
  });

  async function loadRecentSales() {
    const container = document.getElementById('recent-sales');
    const statusEl = document.getElementById('recent-sales-status');
    if (!container) {
      return;
    }

    setStatus(statusEl, 'Loading recent sales...');

    try {
      const sales = await fetchRecentSales(RECENT_SALES_LIMIT);
      if (!sales.length) {
        setStatus(statusEl, 'No recent sales found.');
        return;
      }

      setStatus(statusEl, '');
      container.querySelectorAll('.recent_sale_card').forEach((card) => card.remove());

      for (const sale of sales) {
        const card = await buildSaleCard(sale);
        if (card) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error('[FreshFrogs] Unable to load recent sales', error);
      setStatus(statusEl, 'Unable to load recent sales.');
    }
  }

  async function fetchRecentSales(limit) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${App.config.apiKey}/getNFTSales`;
    const params = new URLSearchParams({
      contractAddress: App.config.collectionAddress,
      order: 'desc',
      withMetadata: 'true',
      limit: String(limit)
    });

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Alchemy NFT sales request failed');
    }

    const payload = await response.json();
    const sales = Array.isArray(payload.nftSales) ? payload.nftSales : [];
    return sales.slice(0, limit);
  }

  async function buildSaleCard(sale) {
    const tokenId = App.normalizeTokenId(
      sale.tokenId ||
        sale.tokenIdDecimal ||
        (sale.nft && sale.nft.tokenId) ||
        (sale.token && sale.token.tokenId)
    );

    if (!tokenId) {
      return null;
    }

    const metadata =
      sale.metadata ||
      (sale.nft && (sale.nft.metadata || sale.nft.rawMetadata)) ||
      sale.tokenMetadata ||
      (await App.fetchFrogMetadata(tokenId));

    const frogName = metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const ownerLabel = App.formatOwnerAddress(sale.buyerAddress || sale.to || sale.ownerAddress);
    const priceLabel = App.formatPrice(sale);
    const rarityRank = App.rarityMap.get(tokenId) || null;
    const traitsHtml = App.buildTraitsHtml(metadata);

    return App.createFrogCard({
      ownerLabel,
      priceLabel,
      frogName,
      tokenId,
      rarityRank,
      imageUrl: `${App.config.imageBaseUrl}/${tokenId}.png`,
      traitsHtml,
      badge: ''
    });
  }

  function setStatus(target, text) {
    if (!target) {
      return;
    }
    if (!text) {
      target.textContent = '';
      target.style.display = 'none';
    } else {
      target.textContent = text;
      target.style.display = 'block';
    }
  }
})();
