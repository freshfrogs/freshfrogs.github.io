// assets/js/home.js
// Fresh Frogs wallet / pond view
// This version DOES NOT call the Alchemy JSON-RPC endpoint from the browser,
// so you will not get CORS errors from https://eth-mainnet.g.alchemy.com/...

// ---------------- CONFIG ----------------

const FF_CONFIG = {
  // TODO: put your actual contract addresses here
  nftContractAddress: "0xYOUR_FROG_NFT_CONTRACT",        // e.g. FreshFrogs NFT
  stakingContractAddress: "0xYOUR_STAKING_OR_CONTROLLER", // e.g. FreshFrogs Controller

  // Where frog images live: https://freshfrogs.github.io/frog/{id}.png by default
  imageBaseUrl: "https://freshfrogs.github.io/frog/",
};

// Minimal ABI fragments – only the functions we actually call.
// Adjust if your function names are different.

const NFT_ABI = [
  "function walletOfOwner(address owner) view returns (uint256[])",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external"
];

const STAKING_ABI = [
  "function getStakedTokens(address owner) view returns (uint256[])",
  "function stake(uint256[] tokenIds) external",
  "function withdraw(uint256[] tokenIds) external",
  "function claimRewards() external",
  "function pendingRewards(address owner) view returns (uint256)"
];

// ---------------- STATE ----------------

let ffProvider = null;
let ffSigner = null;
let ffNft = null;
let ffStaking = null;
let ffAccount = null;
let ffInitialized = false;

// ---------------- INIT ----------------

document.addEventListener("DOMContentLoaded", () => {
  if (typeof ethers === "undefined") {
    console.error("[FreshFrogs] ethers.js is not loaded. Make sure the <script> for ethers comes BEFORE home.js.");
    return;
  }

  setupWalletUi();

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
  }
});

function setupWalletUi() {
  const connectBtn = document.getElementById("wallet-connect-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", connectWallet);
  }
}

// ---------------- WALLET ----------------

async function connectWallet() {
  if (!window.ethereum) {
    alert("No Ethereum wallet found. Please install MetaMask or another browser wallet.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || !accounts.length) {
      console.warn("[FreshFrogs] No accounts returned from wallet.");
      return;
    }

    ffAccount = ethers.getAddress(accounts[0]);

    const label = document.getElementById("wallet-address-label");
    if (label) {
      label.textContent = shortenAddress(ffAccount);
    }

    await initProviderAndContracts();
    await refreshWalletView();
  } catch (err) {
    console.error("[FreshFrogs] connectWallet error:", err);
    alert("Failed to connect wallet. Check console for details.");
  }
}

async function initProviderAndContracts() {
  if (ffInitialized) return;

  if (!window.ethereum) {
    console.error("[FreshFrogs] window.ethereum not found.");
    return;
  }

  // Support ethers v5 and v6 style providers
  if (ethers.BrowserProvider) {
    // ethers v6
    ffProvider = new ethers.BrowserProvider(window.ethereum);
    ffSigner = await ffProvider.getSigner();
  } else if (ethers.providers && ethers.providers.Web3Provider) {
    // ethers v5
    ffProvider = new ethers.providers.Web3Provider(window.ethereum);
    ffSigner = ffProvider.getSigner();
  } else {
    console.error("[FreshFrogs] Could not determine ethers provider type.");
    return;
  }

  if (!FF_CONFIG.nftContractAddress || !FF_CONFIG.stakingContractAddress) {
    console.error("[FreshFrogs] Contract addresses not configured. Edit FF_CONFIG at the top of home.js.");
    return;
  }

  ffNft = new ethers.Contract(
    FF_CONFIG.nftContractAddress,
    NFT_ABI,
    ffSigner
  );

  ffStaking = new ethers.Contract(
    FF_CONFIG.stakingContractAddress,
    STAKING_ABI,
    ffSigner
  );

  ffInitialized = true;
}

function handleAccountsChanged(accounts) {
  if (!accounts || !accounts.length) {
    ffAccount = null;
    updateWalletDisconnectedUi();
    return;
  }
  ffAccount = ethers.getAddress(accounts[0]);
  const label = document.getElementById("wallet-address-label");
  if (label) {
    label.textContent = shortenAddress(ffAccount);
  }
  refreshWalletView().catch((err) =>
    console.error("[FreshFrogs] refreshWalletView after accountsChanged failed:", err)
  );
}

function updateWalletDisconnectedUi() {
  const label = document.getElementById("wallet-address-label");
  if (label) {
    label.textContent = "Not connected";
  }
  const ownedGrid = document.getElementById("owned-frogs-grid");
  const stakedGrid = document.getElementById("staked-frogs-grid");
  const kpiEl = document.getElementById("pond-kpis");

  if (ownedGrid) ownedGrid.innerHTML = "";
  if (stakedGrid) stakedGrid.innerHTML = "";
  if (kpiEl) kpiEl.innerHTML = "<div class='pond-kpi-empty'>Connect your wallet to view your frogs.</div>";
}

// ---------------- MAIN REFRESH ----------------

async function refreshWalletView() {
  if (!ffAccount) return;
  if (!ffInitialized) {
    await initProviderAndContracts();
  }
  if (!ffNft || !ffStaking) return;

  try {
    await Promise.all([
      loadOwnedFrogs(),
      loadStakedFrogs(),
      updatePondKpis()
    ]);
  } catch (err) {
    console.error("[FreshFrogs] Error refreshing wallet view:", err);
  }
}

// ---------------- LOAD OWNED FROGS ----------------

async function loadOwnedFrogs() {
  const grid = document.getElementById("owned-frogs-grid");
  if (!grid) return;

  grid.innerHTML = "<div class='pond-loading'>Loading owned frogs...</div>";

  try {
    const tokenIds = await ffNft.walletOfOwner(ffAccount);
    const normalized = tokenIds.map((id) => Number(id));

    grid.innerHTML = "";

    if (!normalized.length) {
      grid.innerHTML = "<div class='pond-empty'>You don’t own any unstaked frogs.</div>";
      return;
    }

    normalized.forEach((tokenId) => {
      const card = buildFrogCard({
        tokenId,
        staked: false
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("[FreshFrogs] loadOwnedFrogs error:", err);
    grid.innerHTML = "<div class='pond-error'>Could not load owned frogs.</div>";
  }
}

// ---------------- LOAD STAKED FROGS ----------------

async function loadStakedFrogs() {
  const grid = document.getElementById("staked-frogs-grid");
  if (!grid) return;

  grid.innerHTML = "<div class='pond-loading'>Loading staked frogs...</div>";

  try {
    const tokenIds = await ffStaking.getStakedTokens(ffAccount);
    const normalized = tokenIds.map((id) => Number(id));

    grid.innerHTML = "";

    if (!normalized.length) {
      grid.innerHTML = "<div class='pond-empty'>No frogs are staked in the pond.</div>";
      return;
    }

    normalized.forEach((tokenId) => {
      const card = buildFrogCard({
        tokenId,
        staked: true
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("[FreshFrogs] loadStakedFrogs error:", err);
    grid.innerHTML = "<div class='pond-error'>Could not load staked frogs.</div>";
  }
}

// ---------------- KPI / REWARDS ----------------

async function updatePondKpis() {
  const kpiEl = document.getElementById("pond-kpis");
  if (!kpiEl) return;

  kpiEl.innerHTML = "<div class='pond-loading'>Loading rewards...</div>";

  try {
    const pending = await ffStaking.pendingRewards(ffAccount);
    // Assume FLYZ has 18 decimals – adjust if different
    const pendingHuman = Number(ethers.formatUnits(pending, 18)).toFixed(4);

    kpiEl.innerHTML = `
      <div class="pond-kpi-row">
        <div class="pond-kpi-label">Pending FLYZ</div>
        <div class="pond-kpi-value">${pendingHuman}</div>
      </div>
    `;
  } catch (err) {
    console.error("[FreshFrogs] updatePondKpis error:", err);
    kpiEl.innerHTML = "<div class='pond-error'>Could not load rewards.</div>";
  }
}

// ---------------- FROG CARD RENDERING ----------------

function buildFrogCard({ tokenId, staked }) {
  const card = document.createElement("div");
  card.className = "frog-card";

  const img = document.createElement("img");
  img.className = "frog-card-image";
  img.alt = `Frog #${tokenId}`;
  img.loading = "lazy";
  img.src = `${FF_CONFIG.imageBaseUrl}${tokenId}.png`;

  const title = document.createElement("div");
  title.className = "frog-card-title";
  title.textContent = `Frog #${tokenId}`;

  const badge = document.createElement("div");
  badge.className = "frog-card-badge";
  badge.textContent = staked ? "Staked" : "Unstaked";

  const body = document.createElement("div");
  body.className = "frog-card-body";

  body.appendChild(title);
  body.appendChild(badge);

  card.appendChild(img);
  card.appendChild(body);

  return card;
}

// ---------------- HELPERS ----------------

function shortenAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
