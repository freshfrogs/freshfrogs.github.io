// assets/js/core.js
// Config, helpers, wallet, endpoints, and shared fetchers

// ===================== CONFIG =====================
export const FF_CFG = (() => {
  const def = {
    SOURCE_PATH: "https://freshfrogs.github.io",
    COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
    CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",
    // Leave empty if you don't want to use Reservoir key on GH Pages
    FROG_API_KEY: "3105c552-60b6-5252-bca7-291c724a54bf",

    // Rarity JSON
    RARITY_JSON: "assets/freshfrogs_rarity_rankings.json",

    // Optional endpoint overrides (if you provide your own endpoints).
    // If you set CUSTOM_ENDPOINTS=true below and fill these, they take priority.
    CUSTOM_ENDPOINTS: false,
    ENDPOINTS: {
      // tokens held by a wallet in the collection
      owned:   (wallet, qs) => `https://api.reservoir.tools/users/${wallet}/tokens/v8?${qs}`,
      // all tokens owned by controller (pond)
      pond:    (controller, qs) => `https://api.reservoir.tools/users/${controller}/tokens/v8?${qs}`,
      // sales + mints
      sales:   (qs) => `https://api.reservoir.tools/sales/v6?${qs}`,
      mints:   (qs) => `https://api.reservoir.tools/collections/activity/v6?${qs}`,
    },

    SUPPLY: 4040,
  };
  try { return Object.assign({}, def, window.FF_CFG || {}); }
  catch { return def; }
})();

// ===================== HELPERS =====================
export function shorten(addr) {
  if (!addr || typeof addr !== "string") return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
export function formatAgo(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
export function thumb64(src, alt = "") {
  const escAlt = String(alt).replace(/"/g, "&quot;");
  return `<img class="thumb64" src="${src}" alt="${escAlt}">`;
}
export async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Build headers for Reservoir if key present
function reservoirHeaders() {
  const h = { accept: "*/*" };
  if (FF_CFG.FROG_API_KEY) h["x-api-key"] = FF_CFG.FROG_API_KEY;
  return h;
}
function use(url) { return fetchJSON(url, { headers: reservoirHeaders() }); }

// ===================== WALLET =====================
export async function getUser() {
  if (!window.ethereum) throw new Error("No Ethereum provider found. Install MetaMask.");
  const provider = new window.ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

// ===================== RESERVOIR (or custom) =====================
export async function fetchOwned({ wallet, limit = 50, continuation = "" } = {}) {
  if (!wallet) throw new Error("wallet required");
  const qs = new URLSearchParams({ collection: FF_CFG.COLLECTION_ADDRESS, limit: String(limit) });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.CUSTOM_ENDPOINTS
    ? FF_CFG.ENDPOINTS.owned(wallet, qs.toString())
    : FF_CFG.ENDPOINTS.owned(wallet, qs.toString());
  return use(url);
}

export async function fetchPond({ limit = 50, continuation = "" } = {}) {
  if (!FF_CFG.CONTROLLER_ADDRESS) throw new Error("Missing CONTROLLER_ADDRESS");
  const qs = new URLSearchParams({ collection: FF_CFG.COLLECTION_ADDRESS, limit: String(limit) });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.CUSTOM_ENDPOINTS
    ? FF_CFG.ENDPOINTS.pond(FF_CFG.CONTROLLER_ADDRESS, qs.toString())
    : FF_CFG.ENDPOINTS.pond(FF_CFG.CONTROLLER_ADDRESS, qs.toString());
  return use(url);
}

export async function fetchSales({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: FF_CFG.COLLECTION_ADDRESS,
    limit: String(limit),
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.ENDPOINTS.sales(qs.toString());
  return use(url);
}

export async function fetchMints({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: FF_CFG.COLLECTION_ADDRESS,
    types: "mint",
    limit: String(limit),
    sortBy: "eventTimestamp",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.ENDPOINTS.mints(qs.toString());
  return use(url);
}

// ===================== CONTRACT ADAPTERS =====================
// Ensure ABI files assign to window.COLLECTION_ABI / window.CONTROLLER_ABI
export function getCollectionContract(providerOrSigner) {
  if (!window.COLLECTION_ABI) throw new Error("COLLECTION_ABI not found (ensure assets/abi/collection_abi.js sets window.COLLECTION_ABI)");
  return new window.ethers.Contract(FF_CFG.COLLECTION_ADDRESS, window.COLLECTION_ABI, providerOrSigner);
}
export function getControllerContract(providerOrSigner) {
  if (!window.CONTROLLER_ABI) throw new Error("CONTROLLER_ABI not found (ensure assets/abi/controller_abi.js sets window.CONTROLLER_ABI)");
  return new window.ethers.Contract(FF_CFG.CONTROLLER_ADDRESS, window.CONTROLLER_ABI, providerOrSigner);
}

// Try known stake-data methods; return { staker, sinceMs|null }
export async function readStakeInfo(tokenId, provider) {
  const c = getControllerContract(provider);
  let staker = null, sinceMs = null;
  try { staker = await c.stakerAddress(tokenId); } catch {}
  try {
    // stakingValues(uint256) expected tuple: [start, ..., next, ..., rewards, dateStr?]
    const v = await c.stakingValues(tokenId);
    const start = v?.[0]; // seconds?
    if (start != null) sinceMs = Number(start) * 1000;
  } catch {}
  if (!sinceMs) {
    try {
      const v = await c.getStake(tokenId); // common pattern
      const start = v?.[0] ?? v?.since ?? v?.start;
      if (start != null) sinceMs = Number(start) * 1000;
    } catch {}
  }
  if (!sinceMs) {
    try {
      const v = await c.stakeOf(tokenId);
      const start = v?.[0] ?? v?.since ?? v?.start;
      if (start != null) sinceMs = Number(start) * 1000;
    } catch {}
  }
  return { staker, sinceMs };
}
