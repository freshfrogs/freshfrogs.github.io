// assets/mint.js
// Mint page logic — uses F0/Factoria SDK with invite-code pricing

(function () {

  // Admin wallets that get the free invite (NF7UOS / C7AR addresses)
  const ADMIN_WALLETS = [
    '0x97648bb89f2c5335fdece9edeebb8d88fa3d0a38',
    '0xceed98bf7f53f87e6ba701b8fd9d426a2d28b359',
    '0xf01e067d442f4254cd7c89a5d42d90ad554616e8',
    '0x8fe45d16694c0c780f4c3aaa6fca2ddb6e252b25',
  ];

  // Invite key for admin/free mints
  const ADMIN_INVITE  = '0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064';
  // Public invite (0.01 ETH per frog)
  const PUBLIC_INVITE = '0x0000000000000000000000000000000000000000000000000000000000000000';

  let f0Instance    = null;
  let userInvite    = null;
  let mintReady     = false;

  // -------------------------------------------------
  // Boot
  // -------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    // Try silent wallet restore (already connected from another page this session)
    if (typeof ffGetConnectedAddressAsync === 'function') {
      const addr = await ffGetConnectedAddressAsync();
      if (addr) ffInitMintUI(addr);
    }

    // React to fresh connect (header button, landing button, etc.)
    document.addEventListener('ff:wallet-connected', ({ detail }) => {
      ffInitMintUI(detail?.address);
    });
  });

  // -------------------------------------------------
  // Init mint UI after wallet is confirmed connected
  // -------------------------------------------------
  async function ffInitMintUI(address) {
    if (mintReady || !address) return;
    mintReady = true;

    const ui        = document.getElementById('mint-ui');
    const prompt    = document.getElementById('mint-connect-prompt');
    const statusEl  = document.getElementById('mint-status');

    if (prompt) prompt.style.display = 'none';
    if (ui)     ui.style.display     = '';
    setStatus('Initialising...');

    try {
      // Use web3 instance created by site.js after wallet connect
      const w3 = window.web3;
      if (!w3) throw new Error('No web3 instance — connect your wallet first.');

      // Init F0 with the FreshFrogs collection address
      f0Instance = new F0();
      await f0Instance.init({
        web3:     w3,
        contract: COLLECTION_ADDRESS,   // from ethereum-dapp.js globals
        network:  'main'
      });

      // Get supply stats
      const nextIdRaw = await f0Instance.api.nextId().call();
      const nextId    = parseInt(nextIdRaw);
      const minted    = nextId - 1;
      const remaining = 4040 - minted;

      setText('mint-minted',    minted);
      setText('mint-remaining', remaining > 0 ? remaining : 'Sold Out');

      if (remaining <= 0) {
        setStatus('The collection is fully minted — nothing left to mint.');
        document.getElementById('mint-btn')?.setAttribute('disabled', true);
        return;
      }

      // Fetch this wallet's available invites
      const invites = await f0Instance.myInvites();

      // Choose best invite for this wallet
      const addrLower = address.toLowerCase();
      if (ADMIN_WALLETS.includes(addrLower) && invites[ADMIN_INVITE]) {
        userInvite = ADMIN_INVITE;
        setText('mint-invite-label', 'Admin (free)');
      } else if (invites[PUBLIC_INVITE]) {
        userInvite = PUBLIC_INVITE;
        setText('mint-invite-label', 'Public');
      } else {
        // Wallet has a custom invite — use first available key
        const firstKey = Object.keys(invites)[0];
        if (!firstKey) throw new Error('No valid invite found for this wallet.');
        userInvite = firstKey;
        setText('mint-invite-label', 'Custom');
      }

      const inv   = invites[userInvite];
      const price = inv?.condition?.converted?.eth  ?? '0';
      const limit = inv?.condition?.converted?.limit ?? '1';

      setText('mint-price', price);
      setText('mint-limit', limit);

      // Cap quantity input at the mint limit
      const qtyInput = document.getElementById('mint-quantity');
      if (qtyInput && Number.isFinite(Number(limit))) {
        qtyInput.max = limit;
      }

      setStatus('Ready to mint!');

      // Wire mint button
      const mintBtn = document.getElementById('mint-btn');
      if (mintBtn) {
        mintBtn.addEventListener('click', () => ffExecuteMint(address));
      }

    } catch (err) {
      console.error('[mint.js] ffInitMintUI failed:', err);
      mintReady = false; // allow retry
      setStatus('Could not load mint options: ' + (err.message || err));
    }
  }

  // -------------------------------------------------
  // Execute mint transaction
  // -------------------------------------------------
  async function ffExecuteMint(address) {
    const mintBtn  = document.getElementById('mint-btn');
    const qtyInput = document.getElementById('mint-quantity');

    if (!f0Instance || !userInvite) {
      setStatus('Mint not ready — please refresh and reconnect.');
      return;
    }

    const quantity = parseInt(qtyInput?.value || '1');
    if (!Number.isFinite(quantity) || quantity < 1) {
      setStatus('Enter a valid quantity (1 or more).');
      return;
    }

    if (mintBtn) mintBtn.disabled = true;
    setStatus(`Minting ${quantity} Frog${quantity !== 1 ? 's' : ''}... check your wallet for the transaction.`);

    try {
      const result = await f0Instance.mint(userInvite, quantity);

      // result may be a tx hash string, a receipt object, or an array of minted token data
      const txHash =
        (typeof result === 'string' && result.startsWith('0x'))
          ? result
          : result?.transactionHash || null;

      const txLink = txHash
        ? `<a href="https://etherscan.io/tx/${txHash}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;">View on Etherscan</a>`
        : '';

      document.getElementById('mint-status').innerHTML =
        `Minted successfully! ${txLink}`;

      // Refresh supply numbers
      const nextIdRaw = await f0Instance.api.nextId().call();
      const nextId    = parseInt(nextIdRaw);
      const minted    = nextId - 1;
      const remaining = Math.max(0, 4040 - minted);
      setText('mint-minted',    minted);
      setText('mint-remaining', remaining || 'Sold Out');

    } catch (err) {
      console.error('[mint.js] ffExecuteMint failed:', err);
      setStatus('Mint failed: ' + (err.message || err));
    } finally {
      if (mintBtn) mintBtn.disabled = false;
    }
  }

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setStatus(msg) {
    const el = document.getElementById('mint-status');
    if (el) el.textContent = msg;
  }

})();
