
// Overlay config (ensures AUTO_INIT=false by default; preserves window.FF_CFG if present)
(function(){
  const C = (window.FF_CFG = window.FF_CFG || {});
  C.SOURCE_PATH = C.SOURCE_PATH || "https://freshfrogs.github.io";
  C.COLLECTION_ADDRESS = C.COLLECTION_ADDRESS || "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b";
  C.CONTROLLER_ADDRESS = C.CONTROLLER_ADDRESS || "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199";
  C.JSON_PATH = C.JSON_PATH || "assets/freshfrogs_rarity_rankings.json";
  C.AUTO_INIT = false; // force-off
  C.FROG_API_KEY = C.FROG_API_KEY || "3105c552-60b6-5252-bca7-291c724a54bf";
  if (typeof window.FROG_API_KEY === 'string' && window.FROG_API_KEY.trim()) {
    C.FROG_API_KEY = window.FROG_API_KEY.trim();
  }
})();
