// ff-cards.js
// Pure card renderers + layered image builders + stake meta attach

const {
  FF_COLLECTION_ADDRESS,
  FF_SHOW_STAKING_STATS_ON_CARDS,
  ZERO_ADDRESS,
  parseTokenId,
  getRarityRank,
  getRarityTier,
  ffEscapeHtml,
  fetchFrogMetadata,
  normalizeMetadata,
  hasUsableMetadata,
  ffInitReadContractsOnLoad,
  ffEnsureReadContracts,
  ffCachedStakerAddress,
  ffCachedStakingValues,
  ffRomanToArabic,
  FF_PENDING_STAKE_CARDS
} = window.FF;

function buildTraitsHtml(metadata) {
  const attributes = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
  if (!attributes.length) return '<p class="frog-attr-text">Metadata unavailable</p>';

  return attributes.map((attr) => {
    if (!attr?.trait_type) return '';
    const type  = String(attr.trait_type);
    const value = attr.value != null ? String(attr.value) : '';
    return `
      <p class="frog-attr-text"
         data-trait-type="${ffEscapeHtml(type)}"
         data-trait-value="${ffEscapeHtml(value)}">
        ${ffEscapeHtml(type)}: ${ffEscapeHtml(value)}
      </p>`;
  }).filter(Boolean).join('');
}

function ffActionButtonsHTML(tokenId) {
  const osUrl = `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`;
  const esUrl = `https://etherscan.io/token/${FF_COLLECTION_ADDRESS}?a=${tokenId}`;
  const cls = "frog_action_btn";

  return `
    <div class="frog-actions">
      <button class="${cls}" type="button"
        onclick="window.open('${osUrl}', '_blank', 'noopener,noreferrer')">
        OpenSea
      </button>
      <button class="${cls}" type="button" style="background: antiquewhite; color: #333;"
        onclick="window.open('${esUrl}', '_blank', 'noopener,noreferrer')">
        EtherScan
      </button>
    </div>
  `;
}

// PURE render card (no image builds inside)
function createFrogCard({ tokenId, metadata, headerLeft, headerRight, footerHtml, actionHtml }) {
  const frogName   = `Frog #${tokenId}`;
  const osLink     = `https://opensea.io/assets/ethereum/${FF_COLLECTION_ADDRESS}/${tokenId}`;

  const rarityRank = getRarityRank(tokenId);
  const rarityTier = rarityRank ? getRarityTier(rarityRank) : null;

  const rarityText  = rarityTier ? rarityTier.label : 'RARITY UNKNOWN';
  const rarityClass = rarityTier ? `rarity_badge ${rarityTier.className}` : 'rarity_badge rarity_unknown';

  const traitsHtml = buildTraitsHtml(metadata);
  const imgContainerId = `frog-img-${tokenId}-${Math.random().toString(16).slice(2)}`;

  const card = document.createElement('div');
  card.className = 'recent_sale_card';
  card.dataset.tokenId = tokenId;
  card.dataset.imgContainerId = imgContainerId;

  card.innerHTML = `
    <strong class="sale_card_title">${headerLeft || ''}</strong>
    <strong class="sale_card_price">${headerRight || ''}</strong>
    <div style="clear: both;"></div>

    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="https://freshfrogs.github.io/frog/${tokenId}.png"
        class="recent_sale_img"
        alt="Frog #${tokenId}"
        loading="lazy"
      />
    </div>

    <div class="recent_sale_traits">
      <strong class="sale_card_title">
        <a class="frog-name-link" href="${osLink}" target="_blank" rel="noopener noreferrer">${frogName}</a>
      </strong>
      <strong class="sale_card_price ${rarityClass}">${rarityText}</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
      ${footerHtml || ''}
      ${actionHtml || ''}
    </div>

    ${ffActionButtonsHTML(tokenId)}
  `;

  return card;
}

function createMorphedFrogCard({ metadata, ownerAddress }) {
  const frogA = parseTokenId(metadata?.frogA ?? metadata?.tokenA ?? null);
  const frogB = parseTokenId(metadata?.frogB ?? metadata?.tokenB ?? null);

  const name =
    (frogA != null && frogB != null)
      ? `Frog #${frogA} / #${frogB}`
      : (metadata?.name || "Morphed Frog");

  if (!metadata.attributes && Array.isArray(metadata.traits)) {
    metadata.attributes = metadata.traits;
  }

  const traitsHtml = buildTraitsHtml(metadata);
  const imgContainerId = `morph-img-${Math.random().toString(16).slice(2)}`;
  const baseTokenId = parseTokenId(metadata?.frogA ?? metadata?.tokenA ?? null);

  const card = document.createElement("div");
  card.className = "recent_sale_card morphed_frog_card";
  card.dataset.imgContainerId = imgContainerId;
  if (baseTokenId != null) card.dataset.morphBaseTokenId = baseTokenId;

  const fallbackImg =
    metadata?.image ||
    metadata?.image_url ||
    "https://freshfrogs.github.io/assets/blackWhite.png";

  card.innerHTML = `
    <strong class="sale_card_title">--</strong>
    <strong class="sale_card_price">Morphed</strong>
    <div style="clear: both;"></div>

    <div id="${imgContainerId}" class="frog_img_cont">
      <img
        src="${fallbackImg}"
        class="recent_sale_img"
        alt="${ffEscapeHtml(name)}"
        loading="lazy"
      />
    </div>

    <div class="recent_sale_traits">
      <strong class="sale_card_title">
        <span class="frog-name-link">${ffEscapeHtml(name)}</span>
      </strong>
      <strong class="sale_card_price rarity_badge rarity_unknown">MORPH TEST</strong><br>
      <div class="recent_sale_properties">
        ${traitsHtml}
      </div>
    </div>
  `;

  if (ownerAddress) window.ffSetOwnerLabel(card, ownerAddress);
  return card;
}

// Build layered normal frog AFTER append
async function ffBuildLayeredFrogImage(tokenId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const baseUrl = `https://freshfrogs.github.io/frog/${tokenId}.png`;
    container.style.backgroundImage    = `url("${baseUrl}")`;
    container.style.backgroundRepeat   = 'no-repeat';
    container.style.backgroundSize     = '1000%';
    container.style.backgroundPosition = 'bottom right';
    container.innerHTML = '';

    if (typeof SOURCE_PATH === 'undefined' || typeof build_trait !== 'function') {
      const img = document.createElement('img');
      img.src = baseUrl;
      img.alt = `Frog #${tokenId}`;
      img.className = 'recent_sale_img';
      img.loading = 'lazy';
      container.appendChild(img);
      return;
    }

    const metadataUrl = `${SOURCE_PATH}/frog/json/${tokenId}.json`;
    const metadata = await (await fetch(metadataUrl)).json();
    const attrs = Array.isArray(metadata.attributes) ? metadata.attributes : [];

    for (const attr of attrs) {
      if (!attr?.trait_type || !attr?.value) continue;
      build_trait(attr.trait_type, attr.value, containerId);
    }
  } catch {
    container.innerHTML =
      `<img src="https://freshfrogs.github.io/frog/${tokenId}.png" class="recent_sale_img" alt="Frog #${tokenId}" loading="lazy" />`;
  }
}

async function ffBuildLayeredMorphedImage(metadata, containerId, baseTokenId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const attrs = Array.isArray(metadata?.attributes) ? metadata.attributes : [];
    const baseId = parseTokenId(baseTokenId ?? metadata?.frogA ?? metadata?.tokenA ?? null);
    const baseUrl = baseId != null
      ? `https://freshfrogs.github.io/frog/${baseId}.png`
      : null;

    container.innerHTML = '';

    if (baseUrl) {
      container.style.backgroundImage    = `url("${baseUrl}")`;
      container.style.backgroundRepeat   = 'no-repeat';
      container.style.backgroundSize     = '1000%';
      container.style.backgroundPosition = 'bottom right';
      container.style.backgroundColor    = 'transparent';
    }

    if (typeof build_trait === 'function' && attrs.length) {
      for (const attr of attrs) {
        if (!attr?.trait_type || !attr?.value) continue;
        build_trait(attr.trait_type, attr.value, containerId);
      }
      return;
    }

    const fallbackImg =
      metadata?.image ||
      metadata?.image_url ||
      (baseUrl || "https://freshfrogs.github.io/assets/blackWhite.png");

    const img = document.createElement('img');
    img.src = fallbackImg;
    img.alt = metadata?.name || "Morphed Frog";
    img.className = 'recent_sale_img';
    img.loading = 'lazy';
    container.appendChild(img);

  } catch (err) {
    console.warn('ffBuildLayeredMorphedImage failed:', err);
  }
}

// Attach staking meta (uses caches + pending queue)
async function ffAttachStakeMetaIfStaked(card, tokenId) {
  if (!FF_SHOW_STAKING_STATS_ON_CARDS || !card) return;

  ffInitReadContractsOnLoad();

  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) {
    FF_PENDING_STAKE_CARDS.push({ card, tokenId });
    return;
  }

  try {
    const staker = await ffCachedStakerAddress(tokenId);
    if (!staker) return;

    const values = await ffCachedStakingValues(tokenId);
    if (!Array.isArray(values) || values.length < 5) return;

    const [stakedDays, rawLevel, daysToNext, , stakedDate] = values;
    const levelNum = ffRomanToArabic(rawLevel) ?? rawLevel;

    const MAX_DAYS  = 41.7;
    const remaining = Math.max(0, Math.min(MAX_DAYS, Number(daysToNext)));
    const pct       = Math.max(0, Math.min(100, ((MAX_DAYS - remaining) / MAX_DAYS) * 100));

    const propsBlock =
      card.querySelector('.recent_sale_properties') ||
      card.querySelector('.recent_sale_traits') ||
      card;

    const parent = propsBlock.parentElement || card;
    parent.querySelectorAll('.stake-meta, .staking-sale-stats').forEach((el) => el.remove());

    const wrapper = document.createElement('div');
    wrapper.className = 'stake-meta';
    wrapper.innerHTML = `
      <div class="stake-meta-row">
        <span class="stake-level-label">Staked Lvl. ${levelNum}</span>
      </div>
      <div class="stake-meta-row stake-meta-subrow">
        <span>Staked: ${stakedDate} (${stakedDays}d)</span>
      </div>
      <div class="stake-progress">
        <div class="stake-progress-bar" style="width:${pct}%;"></div>
      </div>
    `;

    parent.appendChild(wrapper);
  } catch (err) {
    console.warn('ffAttachStakeMetaIfStaked failed for token', tokenId, err);
  }
}

function ffProcessPendingStakeMeta() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) return;

  const pending = FF_PENDING_STAKE_CARDS.splice(0, FF_PENDING_STAKE_CARDS.length);
  for (const { card, tokenId } of pending) {
    ffAttachStakeMetaIfStaked(card, tokenId);
  }
}

function ffRefreshStakeMetaForAllCards() {
  if (
    typeof window.stakerAddress !== 'function' ||
    typeof window.stakingValues !== 'function' ||
    !window.controller
  ) return;

  document.querySelectorAll('.recent_sale_card').forEach((card) => {
    const tokenId = parseTokenId(card.dataset.tokenId);
    if (tokenId != null) ffAttachStakeMetaIfStaked(card, tokenId);
  });
}

// Export
window.createFrogCard = createFrogCard;
window.createMorphedFrogCard = createMorphedFrogCard;
window.ffBuildLayeredFrogImage = ffBuildLayeredFrogImage;
window.ffBuildLayeredMorphedImage = ffBuildLayeredMorphedImage;
window.ffAttachStakeMetaIfStaked = ffAttachStakeMetaIfStaked;
window.ffProcessPendingStakeMeta = ffProcessPendingStakeMeta;
window.ffRefreshStakeMetaForAllCards = ffRefreshStakeMetaForAllCards;
