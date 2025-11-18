// assets/wallet-view.js
// Show frogs owned by a wallet at URLs like /0x1234... using the same cards as recent sales.

(function () {
  const Shared = window.FreshFrogsShared;
  if (!Shared) {
    console.warn("[WalletView] FreshFrogsShared not found.");
    return;
  }

  const WALLET_ROUTE_REGEX = /^\/(0x[a-fA-F0-9]{40})\/?$/;

  document.addEventListener("DOMContentLoaded", initWalletView);

  async function initWalletView() {
    const path = window.location.pathname || "/";
    const match = path.match(WALLET_ROUTE_REGEX);
    if (!match) {
      return; // not a wallet route
    }

    const ownerAddress = match[1];
    await loadWalletFrogs(ownerAddress);
  }

  async function loadWalletFrogs(ownerAddress) {
    const container = document.getElementById("recent-sales");
    const statusEl = document.getElementById("recent-sales-status");

    if (statusEl) {
      statusEl.textContent = `Loading frogs owned by ${Shared.formatOwnerAddress(
        ownerAddress
      )}...`;
    }

    try {
      const nfts = await fetchFrogsForOwner(ownerAddress);

      if (!nfts.length) {
        if (statusEl) {
          statusEl.textContent = `No Fresh Frogs found for ${Shared.formatOwnerAddress(
            ownerAddress
          )}.`;
        }
        return;
      }

      if (statusEl) {
        statusEl.remove();
      }

      for (const nft of nfts) {
        const card = await buildOwnedFrogCard(nft, ownerAddress);
        if (card) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error("Unable to load wallet frogs", error);
      if (statusEl) {
        statusEl.textContent = "Unable to load frogs for this wallet.";
      }
    }
  }

  async function fetchFrogsForOwner(ownerAddress) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${Shared.API_KEY}/getNFTsForOwner`;
    const frogs = [];
    let pageKey;

    do {
      const params = new URLSearchParams({
        owner: ownerAddress,
        "contractAddresses[]": Shared.CONTRACT_ADDRESS,
        withMetadata: "true",
        pageSize: "100",
      });

      if (pageKey) {
        params.append("pageKey", pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Alchemy getNFTsForOwner request failed");
      }

      const payload = await response.json();
      frogs.push(...(payload.ownedNfts || payload.nfts || []));
      pageKey = payload.pageKey;
    } while (pageKey);

    return frogs;
  }

  async function fetchLastSaleForToken(tokenId) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${Shared.API_KEY}/getNFTSales`;
    const params = new URLSearchParams({
      contractAddress: Shared.CONTRACT_ADDRESS,
      tokenId: String(tokenId),
      order: "desc",
      limit: "1",
    });

    const response = await fetch(`${endpoint}?${params.toString()}`);
    if (!response.ok) {
      console.warn(
        "Alchemy getNFTSales (per-token) request failed for token",
        tokenId
      );
      return null;
    }

    const payload = await response.json();
    const sales = payload.nftSales || [];
    if (!sales.length) {
      return null;
    }
    return sales[0];
  }

  async function buildOwnedFrogCard(nft, ownerAddress) {
    const tokenId = Shared.normalizeTokenId(
      nft.tokenId || (nft.id && nft.id.tokenId)
    );
    if (!tokenId) {
      return null;
    }

    const metadata =
      nft.rawMetadata ||
      nft.metadata ||
      (await Shared.fetchFrogMetadata(tokenId));

    const frogName =
      metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;

    const owner = Shared.formatOwnerAddress(ownerAddress);

    // Price priority: last sale price → mint price (if set) → blank
    let price = "";

    try {
      const lastSale = await fetchLastSaleForToken(tokenId);
      if (lastSale) {
        price = Shared.formatPrice(lastSale);
      } else if (Shared.DEFAULT_MINT_PRICE_WEI) {
        const mintFormatted = Shared.formatTokenValue(
          Shared.DEFAULT_MINT_PRICE_WEI,
          18
        );
        price = mintFormatted ? `${mintFormatted} ETH` : "";
      }
    } catch (e) {
      console.warn(
        "Failed to fetch last sale for wallet frog",
        tokenId,
        e
      );
    }

    // Treat "Unknown" from formatPrice as blank for wallet view
    if (price === "Unknown") {
      price = "";
    }

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
