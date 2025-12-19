const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const ALCHEMY_API_KEY = 'C71cZZLIIjuEeWwP4s8zut6O3OGJGyoJ';
const OPENSEA_API_KEY = '48ffee972fc245fa965ecfe902b02ab4';

async function loadRecentSales() {
    var container = document.getElementById('recent-sales');
    try {
        const sales = await fetchRecentSales();
        for (const sale of sales) {
            console.log(sale);
            const tokenId = parseInt(sale.tokenId); // change to a number?
            const metadata = sale.metadata || sale.tokenMetadata || (await fetchFrogMetadata(tokenId));
            const owner = formatOwnerAddress(sale.buyerAddress || sale.to || sale.ownerAddress);
            const price = formatPrice(sale);
            const card = createFrogCard({
                tokenId,
                metadata,
                headerLeft: owner,
                headerRight: price
            });
            container.appendChild(card);
        }
    } catch (error) {
      console.error('Unable to load recent sales', error);
    }
  }


function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml }) {
    const frogName = `Frog #${tokenId}`;
    const rarityRank = typeof rarityMap[tokenId] !== 'undefined' ? Number(rarityMap[tokenId]) : null;
    const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;
    const rarityText = rarityTier ? rarityTier.label : 'Rarity Unknown';
    const rarityClass = rarityTier ? `rarity_badge ${rarityTier.className}` : 'rarity_badge rarity_unknown';
    const imageUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    const traitsHtml = buildTraitsHtml(metadata);
    const card = document.createElement('div');
    card.className = 'recent_sale_card';
    card.innerHTML = `
      <strong class="sale_card_title">${headerLeft}</strong><strong class="sale_card_price">${headerRight}</strong>
      <div style="clear: both;"></div>
      <div class="frog_img_cont">
        <img src="${imageUrl}" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />
      </div>
      <div class="recent_sale_traits">
        <strong class="sale_card_title">${frogName}</strong><strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
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
    if (!rank) { return null; }
    if (rank <= 41) { return { label: 'Legendary', className: 'rarity_legendary' }; }
    if (rank <= 404) { return { label: 'Epic', className: 'rarity_epic' }; }
    if (rank <= 1010) { return { label: 'Rare', className: 'rarity_rare' }; }
    return { label: 'Common', className: 'rarity_common' };
}

function buildTraitsHtml(metadata) {
    const attributes = Array.isArray(metadata && metadata.attributes) ? metadata.attributes : [];
    const frogTrait = attributes.find((attr) => attr.trait_type === 'Frog' || attr.trait_type === 'SpecialFrog');
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

async function fetchRecentSales() {
    const sales = [];
    let pageKey;
    do {
        const params = new URLSearchParams({
            contractAddress: COLLECTION_ADDRESS,
            order: 'desc',
            withMetadata: 'true'
        });
        if (pageKey) { params.append('pageKey', pageKey); }
        const response = await fetch(`https://eth-mainnet.g.alchemy.com/nft/v3/${API_KEY}/getNFTSales?${params.toString()}`);
        if (!response.ok) { throw new Error('Alchemy NFT sales request failed'); }
        const payload = await response.json();
        sales.push(...(payload.nftSales || []));
        pageKey = payload.pageKey;
    } while (pageKey);
    return sales;
}