// Global config/constants
window.FF_CFG = {
  // ── Chain / RPC ──────────────────────────────────────────────────────────────
  CHAIN_ID: 1,                               // 1 = mainnet (change if needed)
  RPC_URL: "https://cloudflare-eth.com",     // fallback RPC so The Pond works before wallet connect

  // ── Addresses ────────────────────────────────────────────────────────────────
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",

  // First controller deployment block (bounds the activity scan if you later use it)
  CONTROLLER_DEPLOY_BLOCK: 15209637,

  // ── Reservoir (Owned list) ───────────────────────────────────────────────────
  RESERVOIR_HOST: "https://api.reservoir.tools",
  // REQUIRED for reliable owned-list paging. You can also set window.frog_api before this file loads.
  FROG_API_KEY: (window.frog_api || "3105c552-60b6-5252-bca7-291c724a54bf"),

  // ── Collection metadata / assets ─────────────────────────────────────────────
  SOURCE_PATH: "https://freshfrogs.github.io",            // where /frog/<id>.png and /frog/json/<id>.json live
  JSON_PATH: "assets/freshfrogs_rarity_rankings.json",    // ranks file
  SUPPLY: 4040,

  // ── UI / paging ──────────────────────────────────────────────────────────────
  PAGE_SIZE: 24,         // general page size
  OWNED_PAGE_SIZE: 24,   // owned-list page size (Reservoir)
  ACTIVITY_BLOCK_WINDOW: 1500, // how many blocks to fetch per window for recent activity

  // ── Rewards display ──────────────────────────────────────────────────────────
  REWARD_TOKEN_SYMBOL: "$FLYZ",
  REWARD_DECIMALS: 18
};
