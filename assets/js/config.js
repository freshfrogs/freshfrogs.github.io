// Global configuration (edit in one place)
window.FF_CFG = {
  SOURCE_PATH: "https://freshfrogs.github.io",
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  CONTROLLER_ADDRESS: "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199",
  JSON_PATH: "assets/freshfrogs_rarity_rankings.json",
  AUTO_INIT: false,
  FROG_API_KEY: "3105c552-60b6-5252-bca7-291c724a54bf"
};

// Allow runtime injection without editing files
if (typeof window.FROG_API_KEY === 'string' && window.FROG_API_KEY.trim()) {
  window.FF_CFG.FROG_API_KEY = window.FROG_API_KEY.trim();
}

// Theme restore from localStorage
(function(){
  const saved = localStorage.getItem('ff_theme');
  if(saved === 'pastel' || saved === 'noir'){
    document.documentElement.setAttribute('data-theme', saved);
  }
})();