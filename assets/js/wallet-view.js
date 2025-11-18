(function () {
  'use strict';

  const App = window.FreshFrogs;
  if (!App) {
    console.error('[FreshFrogs] ethereum helpers missing.');
    return;
  }

  const WALLET_REGEX = /0x[a-fA-F0-9]{40}/;
  let activeWalletRequest = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body || document.body.dataset.page !== 'wallet') {
      return;
    }

    initWalletLookupForm();

    const walletFromUrl = detectWalletAddressInUrl();
    if (walletFromUrl) {
      setWalletInputValue(walletFromUrl);
      loadWalletFrogs(walletFromUrl);
    }
  });

  function initWalletLookupForm() {
    const form = document.getElementById('wallet-lookup-form');
    if (!form) {
      return;
    }

    const input = document.getElementById('wallet-address-input');
    const errorEl = document.getElementById('wallet-lookup-error');
    const useWalletButton = document.getElementById('wallet-use-metamask');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input) {
        return;
      }

      const normalized = checksumAddress(input.value.trim());
      if (!normalized) {
        showWalletError('Please enter a valid wallet address.', errorEl);
        return;
      }

      hideWalletError(errorEl);
      navigateToWallet(normalized);
      loadWalletFrogs(normalized);
    });

    if (useWalletButton) {
      if (!window.ethereum || typeof window.ethereum.request !== 'function') {
        useWalletButton.disabled = true;
        useWalletButton.textContent = 'Browser wallet unavailable';
      } else {
        useWalletButton.addEventListener('click', async () => {
          try {
            useWalletButton.disabled = true;
            useWalletButton.textContent = 'Connecting...';
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = Array.isArray(accounts) && accounts.length ? accounts[0] : null;
            if (!account) {
              showWalletError('Unable to detect wallet address.', errorEl);
              return;
            }
            const normalized = checksumAddress(account);
            if (!normalized) {
              showWalletError('Invalid wallet address returned.', errorEl);
              return;
            }
            if (input) {
              input.value = normalized;
            }
            hideWalletError(errorEl);
            navigateToWallet(normalized);
            loadWalletFrogs(normalized);
          } catch (err) {
            console.error('[FreshFrogs] Unable to connect wallet', err);
            showWalletError('Unable to connect to your wallet.', errorEl);
          } finally {
            useWalletButton.disabled = false;
            useWalletButton.textContent = 'Use My Wallet';
          }
        });
      }
    }
  }

  async function loadWalletFrogs(walletAddress) {
    const container = document.getElementById('recent-sales');
    const statusEl = ensureStatusElement(container);
    if (!container || !statusEl) {
      return;
    }

    const normalizedAddress = checksumAddress(walletAddress) || walletAddress;
    const formattedOwner = App.formatOwnerAddress(normalizedAddress);
    setStatus(statusEl, `Loading frogs for ${formattedOwner}...`);
    container.querySelectorAll('.recent_sale_card').forEach((card) => card.remove());

    const requestKey = normalizedAddress.toLowerCase();
    activeWalletRequest = requestKey;

    try {
      const [owned, staked, pendingRewards] = await Promise.all([
        fetchOwnedFrogs(normalizedAddress),
        fetchStakedFrogs(normalizedAddress),
        fetchPendingRewards(normalizedAddress)
      ]);

      if (activeWalletRequest !== requestKey) {
        return;
      }

      updateWalletKpis({ pendingRewards, stakedCount: staked.length });

      const frogs = mergeFrogLists(owned, staked);
      if (!frogs.length) {
        setStatus(statusEl, `No Fresh Frogs found for ${formattedOwner}.`);
        return;
      }

      setStatus(statusEl, '');

      for (const frog of frogs) {
        const card = await buildWalletCard(frog, normalizedAddress);
        if (card && activeWalletRequest === requestKey) {
          container.appendChild(card);
        }
      }
    } catch (error) {
      console.error('[FreshFrogs] Unable to load wallet frogs', walletAddress, error);
      setStatus(statusEl, 'Unable to load frogs for this wallet.');
      updateWalletKpis({ pendingRewards: null, stakedCount: 0 });
    }
  }

  async function fetchOwnedFrogs(ownerAddress) {
    const endpoint = `https://eth-mainnet.g.alchemy.com/nft/v3/${App.config.apiKey}/getNFTsForOwner`;
    const results = [];
    let pageKey;
    let safety = 0;

    do {
      const params = new URLSearchParams({
        owner: ownerAddress,
        withMetadata: 'true',
        pageSize: '100'
      });
      params.append('contractAddresses[]', App.config.collectionAddress);
      if (pageKey) {
        params.append('pageKey', pageKey);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Alchemy getNFTsForOwner request failed');
      }

      const payload = await response.json();
      const owned = Array.isArray(payload.ownedNfts) ? payload.ownedNfts : [];
      owned.forEach((nft) => {
        const tokenId = App.normalizeTokenId(
          nft.tokenId ||
            (nft.id && nft.id.tokenId) ||
            (nft.tokenIdHex ? nft.tokenIdHex : null)
        );
        if (tokenId == null) {
          return;
        }
        results.push({
          tokenId,
          metadata: nft.rawMetadata || nft.metadata || null,
          isStaked: false
        });
      });

      pageKey = payload.pageKey;
      safety += 1;
    } while (pageKey && safety < 10);

    return results;
  }

  async function fetchStakedFrogs(ownerAddress) {
    if (!App.contracts.controller) {
      return [];
    }

    try {
      const stakedTokens = await App.contracts.controller.getStakedTokens(ownerAddress);
      return stakedTokens
        .map((token) => {
          const rawTokenId = token && token.tokenId != null ? token.tokenId : token;
          const normalized =
            rawTokenId && typeof rawTokenId.toString === 'function'
              ? App.normalizeTokenId(rawTokenId.toString())
              : App.normalizeTokenId(rawTokenId);
          return normalized != null
            ? {
                tokenId: normalized,
                metadata: null,
                isStaked: true
              }
            : null;
        })
        .filter(Boolean);
    } catch (error) {
      console.error('[FreshFrogs] Unable to load staked frogs', error);
      return [];
    }
  }

  async function fetchPendingRewards(ownerAddress) {
    if (!App.contracts.controller || typeof App.contracts.controller.availableRewards !== 'function') {
      return null;
    }

    try {
      return await App.contracts.controller.availableRewards(ownerAddress);
    } catch (error) {
      console.error('[FreshFrogs] Unable to load pending rewards', error);
      return null;
    }
  }

  function mergeFrogLists(owned, staked) {
    const frogsById = new Map();

    owned.forEach((frog) => {
      frogsById.set(frog.tokenId, {
        tokenId: frog.tokenId,
        metadata: frog.metadata || null,
        isStaked: false
      });
    });

    staked.forEach((frog) => {
      const existing = frogsById.get(frog.tokenId) || {};
      frogsById.set(frog.tokenId, {
        tokenId: frog.tokenId,
        metadata: existing.metadata || frog.metadata || null,
        isStaked: true
      });
    });

    return Array.from(frogsById.values()).sort((a, b) => a.tokenId - b.tokenId);
  }

  async function buildWalletCard(frog, ownerAddress) {
    const tokenId = frog.tokenId;
    if (tokenId == null) {
      return null;
    }

    const metadata = frog.metadata || (await App.fetchFrogMetadata(tokenId));
    const frogName = metadata && metadata.name ? metadata.name : `Frog #${tokenId}`;
    const rarityRank = App.rarityMap.get(tokenId) || null;
    const traitsHtml = App.buildTraitsHtml(metadata);

    return App.createFrogCard({
      ownerLabel: App.formatOwnerAddress(ownerAddress),
      priceLabel: frog.isStaked ? 'Staked' : 'Owned',
      frogName,
      tokenId,
      rarityRank,
      imageUrl: `${App.config.imageBaseUrl}/${tokenId}.png`,
      traitsHtml,
      badge: frog.isStaked ? 'STAKED' : ''
    });
  }

  function detectWalletAddressInUrl() {
    const pathnameMatch = (window.location.pathname || '').match(WALLET_REGEX);
    if (pathnameMatch) {
      return pathnameMatch[0];
    }

    const params = new URLSearchParams(window.location.search || '');
    const queryWallet = params.get('wallet');
    if (queryWallet) {
      const match = queryWallet.match(WALLET_REGEX);
      if (match) {
        return match[0];
      }
    }

    const hashMatch = (window.location.hash || '').match(WALLET_REGEX);
    return hashMatch ? hashMatch[0] : null;
  }

  function checksumAddress(address) {
    if (!address) {
      return null;
    }
    try {
      if (ethers.utils && typeof ethers.utils.getAddress === 'function') {
        return ethers.utils.getAddress(address);
      }
      if (typeof ethers.getAddress === 'function') {
        return ethers.getAddress(address);
      }
      return address;
    } catch (error) {
      return null;
    }
  }

  function navigateToWallet(address) {
    if (!address) {
      return;
    }
    const url = new URL(window.location.href);
    url.pathname = `/${address}`;
    url.searchParams.delete('wallet');
    window.history.replaceState({}, '', url.toString());
    setWalletInputValue(address);
  }

  function setWalletInputValue(address) {
    const input = document.getElementById('wallet-address-input');
    if (input) {
      input.value = address;
    }
  }

  function showWalletError(message, target) {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.hidden = false;
  }

  function hideWalletError(target) {
    if (target) {
      target.hidden = true;
    }
  }

  function ensureStatusElement(container) {
    if (!container) {
      return null;
    }
    let statusEl = document.getElementById('recent-sales-status');
    if (!statusEl) {
      statusEl = document.createElement('p');
      statusEl.id = 'recent-sales-status';
      statusEl.className = 'recent_sales_status';
      container.insertAdjacentElement('afterbegin', statusEl);
    }
    statusEl.style.display = 'block';
    return statusEl;
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

  function updateWalletKpis({ pendingRewards, stakedCount }) {
    const rewardsEl = document.getElementById('wallet-pending-rewards');
    const stakedEl = document.getElementById('wallet-staked-count');

    if (rewardsEl) {
      if (pendingRewards == null) {
        rewardsEl.textContent = '--';
      } else {
        const formatted = App.formatUnits(pendingRewards, 18);
        const numericValue = Number(formatted);
        rewardsEl.textContent = Number.isFinite(numericValue)
          ? numericValue.toFixed(4)
          : formatted;
      }
    }

    if (stakedEl) {
      stakedEl.textContent = typeof stakedCount === 'number' ? stakedCount : 0;
    }
  }
})();
