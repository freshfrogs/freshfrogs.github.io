/* global StakingAdapter, CONFIG */

// Renders both wallet-owned and staked frogs in the same grid,
// fixes header "Owned" count (wallet only), and shows
// "Staked x d ago • Owned by you" for staked cards.

(() => {
  const state = {
    account: null,
    walletIds: [],     // tokens held in wallet (ERC721 balanceOf / tokenOfOwnerByIndex)
    stakedIds: [],     // tokens staked in controller
    stakeTimestamps: {}// tokenId -> unix seconds (0 if unknown)
  };

  const el = {
    headerOwnedCount: () => document.querySelector('[data-owned-count]'),
    grid: () => document.querySelector('[data-grid]'),
  };

  const log = (...args) => console.log('[owned]', ...args);
  const nowSec = () => Math.floor(Date.now() / 1000);

  function timeAgo(ts) {
    if (!ts || ts <= 0) return 'staked';
    const s = Math.max(1, nowSec() - Number(ts));
    const mins = Math.floor(s / 60);
    const hours = Math.floor(s / 3600);
    const days = Math.floor(s / 86400);
    if (days >= 1) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    if (mins >= 1) return `${mins}m ago`;
    return `${s}s ago`;
    // (kept short & clean)
  }

  // --- Helpers you likely already had; stubbed for completeness -------------
  async function getWalletTokenIds(account) {
    // If your app already has a faster path, use it.
    // Generic (slow) fallback using tokenOfOwnerByIndex if present in CONFIG.NFT_ABI:
    const w3 = StakingAdapter.web3;
    const nft = new w3.eth.Contract(CONFIG.NFT_ABI, CONFIG.NFT_ADDRESS);
    const hasIdx = !!(nft.methods.tokenOfOwnerByIndex);
    const bal = Number(await nft.methods.balanceOf(account).call());
    if (!hasIdx) return []; // your app probably fetches via subgraph/cache elsewhere
    const out = [];
    for (let i = 0; i < bal; i++) {
      const id = await nft.methods.tokenOfOwnerByIndex(account, i).call();
      out.push(id.toString());
    }
    return out;
  }

  function renderCards(allIds, stakedSet) {
    const grid = el.grid();
    if (!grid) return;
    grid.innerHTML = '';

    for (const id of allIds) {
      const isStaked = stakedSet.has(id);
      const card = document.createElement('div');
      card.className = 'frog-card';

      // image
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `Frog #${id}`;
      img.src = `${CONFIG.IMAGE_BASE || ''}/images/${id}.png`;
      card.appendChild(img);

      // title
      const title = document.createElement('div');
      title.className = 'frog-title';
      title.textContent = `#${id}`;
      card.appendChild(title);

      // subtitle / status line
      const status = document.createElement('div');
      status.className = 'frog-subline';
      if (isStaked) {
        const ts = state.stakeTimestamps[id] || 0;
        status.textContent = `Staked ${timeAgo(ts)} • Owned by you`;
      } else {
        status.textContent = 'Owned by you';
      }
      card.appendChild(status);

      grid.appendChild(card);
    }
  }

  function updateHeaderCounts() {
    const ownedEl = el.headerOwnedCount();
    if (ownedEl) {
      // IMPORTANT: this should show ONLY wallet-held count (not including staked)
      ownedEl.textContent = String(state.walletIds.length);
    }
  }

  async function loadAndRender(account) {
    state.account = account;

    // 1) Wallet-held (pure ERC721)
    state.walletIds = await getWalletTokenIds(account);

    // 2) Staked
    state.stakedIds = await StakingAdapter.getStakedTokens(account);
    state.stakeTimestamps = await StakingAdapter.getStakeTimestamps(account);

    // 3) Build merged list without duplicates; show staked + wallet
    const set = new Set([...state.walletIds.map(String), ...state.stakedIds.map(String)]);
    const merged = Array.from(set).sort((a, b) => Number(a) - Number(b));

    // 4) Render
    updateHeaderCounts();
    renderCards(merged, new Set(state.stakedIds.map(String)));
  }

  // Expose a small hook your app can call when the wallet connects/changes
  window.OwnedPanel = {
    refresh: loadAndRender
  };

  log('ready');
})();
