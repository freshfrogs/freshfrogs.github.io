// assets/js/core.js
// Single source of truth: config, helpers, and Reservoir fetchers

// ---- Config ------------------------------------------------------------
export const FF_CFG = (() => {
  // Pull from window.FF_CFG if present (set elsewhere), else defaults:
  const def = {
    SOURCE_PATH: "https://freshfrogs.github.io",
    COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
    CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199", // set if you want Pond to list staked
    FROG_API_KEY: "3105c552-60b6-5252-bca7-291c724a54bf",
    SUPPLY: 4040,
    RARITY_JSON: "assets/freshfrogs_rarity_rankings.json"
  };
  try {
    return Object.assign({}, def, window.FF_CFG || {});
  } catch { return def; }
})();

// ---- Helpers -----------------------------------------------------------
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

// ---- Wallet (MetaMask) -------------------------------------------------
export async function getUser() {
  // Returns { provider, signer, address } or throws
  if (!window.ethereum) throw new Error("No Ethereum provider found. Install MetaMask.");
  // ethers v5 UMD: window.ethers
  const provider = new window.ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

// ---- Reservoir helpers -------------------------------------------------
function reservoirHeaders() {
  const h = { accept: "*/*" };
  if (FF_CFG.FROG_API_KEY && FF_CFG.FROG_API_KEY !== "YOUR_RESERVOIR_API_KEY_HERE") {
    h["x-api-key"] = FF_CFG.FROG_API_KEY;
  }
  return h;
}

// SALES
export async function fetchSales({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: FF_CFG.COLLECTION_ADDRESS,
    limit: String(limit),
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/sales/v6?${qs.toString()}`;
  return fetchJSON(url, { headers: reservoirHeaders() });
}

// MINTS
export async function fetchMints({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: FF_CFG.COLLECTION_ADDRESS,
    types: "mint",
    limit: String(limit),
    sortBy: "eventTimestamp",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/collections/activity/v6?${qs.toString()}`;
  return fetchJSON(url, { headers: reservoirHeaders() });
}

// POND (controller holdings)
export async function fetchPond({ limit = 50, continuation = "" } = {}) {
  if (!FF_CFG.CONTROLLER_ADDRESS) throw new Error("Missing CONTROLLER_ADDRESS");
  const qs = new URLSearchParams({ collection: FF_CFG.COLLECTION_ADDRESS, limit: String(limit) });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/users/${FF_CFG.CONTROLLER_ADDRESS}/tokens/v8?${qs.toString()}`;
  return fetchJSON(url, { headers: reservoirHeaders() });
}
