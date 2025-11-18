// assets/recent-sales.js
// Load and render recent sales on the homepage.

(function () {
  const Shared = window.FreshFrogsShared;
  if (!Shared) {
    console.warn("[RecentSales] FreshFrogsShared not found.");
    return;
  }

  const WALLET_ROUTE_REGEX = /^\/0x[a-fA-F0-9]{40}\/?$/;

  document.addEventListener("DOMContentLoaded", initRecentSales);

  async function initRecentSales() {
    // If we're on a wallet route, wallet-view.js will handle it.
    if (WALLET_ROUTE_REGEX.test(window.location.pathname)) {
      return;
    }
    await loadRecentSales();
  }

  async function loadRecentSales() {
    const container = document.getElementById("recent-sales");
    const statusEl = document.getElementById("recent-sales-status");

    try {
      const sales = await fetchRecentSales();

      if (!sales.length) {
        if (statusEl) statusEl.textContent = "No recent sales found.";
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }

      for (const sale of sales) {
        const card = await buildSaleCard(sale);
        if (card) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error("Unable to load recent sales", error);
      if (statusEl) {
        statusEl.textContent = "Unable to load recent sales.";
      }
    }
  }

  async function fetchRecentSales() {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${Shared.API_KEY}/getNFTSales`;
    const sales = [];
    let pageKey;

    do {
      const params = new URLSearchParams({
        contractAddress: Shared.CONTRACT_ADDRESS,
        order: "desc",
        withMetadata: "true",
      });

      if (pageKey) {
        params.append("pageKey", pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Alchemy NFT sales request failed");
      }

      const payload = await response.json();
      sales.push(...(payload.nftSales || []));
      pageKey = payload.pageKey;
    } while (pageKey);

    return sales;
  }

  async function buildSaleCard(sale) {
    const tokenId = Shared.normalizeTokenId(
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
      sale.tokenMetadata ||
      (await Shared.fetchFrogMetadata(tokenId));

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;

    const owner = Shared.formatOwnerAddress(
      sale.buyerAddress || sale.to || sale.ownerAddress
    );

    const price = Shared.formatPrice(sale);

    const rarityRankRaw = window.freshfrogs_rarity_rankings
      ? Shared.normalizeTokenId(tokenId)
      : null;

    const rarityRank =
      typeof rarityRankRaw !== "undefined" ? Number(rarityRankRaw) : null;

    const rarityInfo = Shared.getRarityInfo(
      typeof window.freshfrogs_rarity_rankings !== "undefined"
        ? window.freshfrogs_rarity_rankings[tokenId]?.ranking ||
            window.freshfrogs_rarity_rankings[tokenId]?.rank ||
            null
        : null
    );

    // If that got confusing, we can instead directly look into the rarityMap
    // but we kept the label/class via Shared.getRarityInfo.

    const rarityFromMap =
      window.freshfrogs_rarity_rankings &&
      window.freshfrogs_rarity_rankings[tokenId]
        ? window.freshfrogs_rarity_rankings[tokenId].ranking ||
          window.freshfrogs_rarity_rankings[tokenId].rank
        : null;

    const rarityData = Shared.getRarityInfo(
      rarityFromMap ? Number(rarityFromMap) : null
    );

    const rarityText = rarityData.label;
    const rarityClass = `rarity_badge ${rarityData.className}`;

    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = Shared.buildTraitsHtml(metadata);

    const card = document.createElement("div");
    card.className = "recent_sale_card";
    card.innerHTML = `
      <strong class="sale_card_title">${owner}</strong><strong class="sale_card_price">${price}</strong>
      <div style="clear: both;"></div>
      <div class="frog_img_cont">
        <img src="${imageUrl}" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong><strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
        <div class="recent_sale_properties">
          ${traitsHtml}
        </div>
      </div>
    `;

    return card;
  }
})();
