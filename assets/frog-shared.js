// assets/frog-shared.js
// Shared config + helper functions for Fresh Frogs homepage & wallet view.

(function () {
  const API_KEY = "C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ";
  const CONTRACT_ADDRESS = "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b";
  const MAX_TRAITS = 3;

  // Optional: mint price fallback in wallet view (in WEI). Leave '' if you don't want this.
  // Example: 0.025 ETH → "25000000000000000"
  const DEFAULT_MINT_PRICE_WEI = "";

  const rarityMap = buildRarityMap(window.freshfrogs_rarity_rankings || []);
  const metadataCache = new Map();

  // ---------------- helpers used internally ----------------

  function buildRarityMap(rankings) {
    return rankings.reduce((acc, frog) => {
      if (frog && typeof frog.id !== "undefined") {
        const frogId = Number(frog.id);
        const rankingValue = frog.ranking || frog.rank;
        acc[frogId] =
          typeof rankingValue !== "undefined" ? rankingValue : "N/A";
      }
      return acc;
    }, {});
  }

  async function fetchFrogMetadata(tokenId) {
    if (metadataCache.has(tokenId)) {
      return metadataCache.get(tokenId);
    }

    try {
      const response = await fetch(
        `https://freshfrogs.github.io/frog/json/${tokenId}.json`
      );
      if (!response.ok) {
        throw new Error("Metadata fetch failed");
      }
      const data = await response.json();
      metadataCache.set(tokenId, data);
      return data;
    } catch (error) {
      console.warn(`Metadata unavailable for Frog #${tokenId}`, error);
      metadataCache.set(tokenId, null);
      return null;
    }
  }

  function buildTraitsHtml(metadata) {
    const traits = [];

    if (metadata && Array.isArray(metadata.attributes)) {
      const frogTrait = metadata.attributes.find(
        (attr) =>
          attr.trait_type === "Frog" || attr.trait_type === "SpecialFrog"
      );

      if (frogTrait) {
        traits.push(`Frog: ${frogTrait.value}`);
      }

      metadata.attributes
        .filter((attr) => attr !== frogTrait)
        .slice(0, MAX_TRAITS - traits.length)
        .forEach((attr) => {
          traits.push(`${attr.trait_type}: ${attr.value}`);
        });
    }

    if (!traits.length) {
      traits.push("Metadata unavailable");
    }

    return traits.map((trait) => `<p>${trait}</p>`).join("");
  }

  function getRarityInfo(rank) {
    if (!rank) {
      return {
        rank: null,
        label: "Rarity Unknown",
        className: "rarity_unknown",
      };
    }

    if (rank <= 41) {
      return { rank, label: "Legendary", className: "rarity_legendary" };
    }
    if (rank <= 404) {
      return { rank, label: "Epic", className: "rarity_epic" };
    }
    if (rank <= 1010) {
      return { rank, label: "Rare", className: "rarity_rare" };
    }

    return { rank, label: "Common", className: "rarity_common" };
  }

  function normalizeTokenId(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      if (value.startsWith("0x")) {
        return parseInt(value, 16);
      }
      return parseInt(value, 10);
    }
    return null;
  }

  function formatOwnerAddress(address) {
    if (!address) {
      return "Unknown";
    }
    const normalized = address.startsWith("0x") ? address : `0x${address}`;
    const shortened = `${normalized.slice(0, 6)}..${normalized.slice(-4)}`;
    return shortened.toLowerCase();
  }

  function formatPrice(sale) {
    const sources = [sale.price, sale.salePrice, sale.sellerFee, sale.protocolFee];
    const priceSource = sources.find(
      (source) => source && (source.value || source.amount)
    );

    if (!priceSource) {
      return "Unknown";
    }

    const rawValue = priceSource.value || priceSource.amount;
    const decimals =
      priceSource.decimals ||
      (priceSource.currency && priceSource.currency.decimals) ||
      18;
    const symbol =
      (priceSource.currency && priceSource.currency.symbol) ||
      priceSource.symbol ||
      "ETH";

    const formattedValue = formatTokenValue(rawValue, decimals);
    return formattedValue ? `${formattedValue} ${symbol}` : "Unknown";
  }

  function formatTokenValue(rawValue, decimals) {
    if (!rawValue && rawValue !== 0) {
      return null;
    }

    try {
      const numericValue = rawValue.toString().startsWith("0x")
        ? BigInt(rawValue)
        : BigInt(rawValue);
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = numericValue / divisor;
      const fraction = numericValue % divisor;

      if (fraction === 0n) {
        return whole.toString();
      }

      const fractionStr = fraction
        .toString()
        .padStart(decimals, "0")
        .slice(0, 3);
      const cleanedFraction = fractionStr.replace(/0+$/, "");
      return cleanedFraction
        ? `${whole.toString()}.${cleanedFraction}`
        : whole.toString();
    } catch (error) {
      const numeric = Number(rawValue) / Math.pow(10, decimals);
      if (!isFinite(numeric)) {
        return null;
      }
      return numeric.toFixed(3);
    }
  }

  // ---------------- export shared API on window ----------------

  window.FreshFrogsShared = {
    API_KEY,
    CONTRACT_ADDRESS,
    DEFAULT_MINT_PRICE_WEI,
    fetchFrogMetadata,
    buildTraitsHtml,
    getRarityInfo,
    normalizeTokenId,
    formatOwnerAddress,
    formatPrice,
    formatTokenValue,
  };
})();
