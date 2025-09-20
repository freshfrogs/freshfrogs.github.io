// assets/js/core.js
// Config, helpers, wallet, endpoints, shared fetchers + stronger diagnostics

// ===================== CONFIG =====================
export const FF_CFG = (() => {
  const def = {
    SOURCE_PATH: "https://freshfrogs.github.io",
    COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
    CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",
    FROG_API_KEY: "3105c552-60b6-5252-bca7-291c724a54bf",                     // leave blank if you don’t want a key in GH Pages
    RARITY_JSON: "assets/freshfrogs_rarity_rankings.json",
    SUPPLY: 4040,
    DEBUG: false,                         // set true to see console debug
    CUSTOM_ENDPOINTS: false,
    ENDPOINTS: {
      owned: (wallet, qs) => `https://api.reservoir.tools/users/${wallet}/tokens/v8?${qs}`,
      pond:  (controller, qs) => `https://api.reservoir.tools/users/${controller}/tokens/v8?${qs}`,
      sales: (qs) => `https://api.reservoir.tools/sales/v6?${qs}`,
      mints: (qs) => `https://api.reservoir.tools/collections/activity/v6?${qs}`,
    },
    REQUIRED_CHAIN_ID: 1,                 // Ethereum mainnet
  };
  try { return Object.assign({}, def, window.FF_CFG || {}); }
  catch { return def; }
})();

function log(...a){ if(FF_CFG.DEBUG) console.log("[FF]",...a); }

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
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${txt.slice(0,200)}`);
  }
  return res.json();
}
export function absolutePath(p) {
  // ensure /assets/... loads from site root (GH Pages)
  if (/^https?:\/\//i.test(p)) return p;
  return new URL(p.replace(/^\.\//,"/"), location.origin).toString();
}

// ===================== WALLET =====================
export async function getUser() {
  if (!window.ethereum) throw new Error("No Ethereum provider found. Install MetaMask.");
  const provider = new window.ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const net = await provider.getNetwork();
  if (FF_CFG.REQUIRED_CHAIN_ID && net.chainId !== FF_CFG.REQUIRED_CHAIN_ID) {
    throw new Error(`Please switch to Ethereum Mainnet (chainId ${FF_CFG.REQUIRED_CHAIN_ID}).`);
  }
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

// ===================== RESERVOIR (or custom) =====================
function reservoirHeaders() {
  const h = { accept: "*/*" };
  if (FF_CFG.FROG_API_KEY) h["x-api-key"] = FF_CFG.FROG_API_KEY;
  return h;
}
function use(url) {
  log("GET", url);
  return fetchJSON(url, { headers: reservoirHeaders() });
}

export async function fetchOwned({ wallet, limit = 50, continuation = "" } = {}) {
  if (!wallet) throw new Error("wallet required");
  const qs = new URLSearchParams({ collection: FF_CFG.COLLECTION_ADDRESS, limit: String(limit) });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.ENDPOINTS.owned(wallet, qs.toString());
  return use(url);
}

export async function fetchPond({ limit = 50, continuation = "" } = {}) {
  if (!FF_CFG.CONTROLLER_ADDRESS) throw new Error("Missing CONTROLLER_ADDRESS");
  const qs = new URLSearchParams({ collection: FF_CFG.COLLECTION_ADDRESS, limit: String(limit) });
  if (continuation) qs.set("continuation", continuation);
  const url = FF_CFG.ENDPOINTS.pond(FF_CFG.CONTROLLER_ADDRESS, qs.toString());
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

  try { staker = await c.stakerAddress(tokenId); } catch(e){ log("stakerAddress fail", e.message); }

  // Try common “since” accessors in priority order
  const tryRead = async (fn) => {
    try {
      const v = await c[fn](tokenId);
      const start = (v?.since ?? v?.start ?? v?.[0]);
      if (start != null) return Number(start) * 1000;
    } catch(e){/* ignore */ }
    return null;
  };
  sinceMs = sinceMs || await tryRead("stakingValues");
  sinceMs = sinceMs || await tryRead("getStake");
  sinceMs = sinceMs || await tryRead("stakeOf");

  return { staker, sinceMs };
}
