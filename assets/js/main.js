// assets/js/main.js
(async function(){
  // Rarity loader still used by other parts of the app; keep if needed.
  if (window.FF_loadRarity) {
    try { await window.FF_loadRarity(); } catch {}
  }

  // Grid (3x3 static PNGs; not clickable)
  if (window.FF_renderGrid) window.FF_renderGrid();

  // Default My Frogs tab to "Owned"
  if (window.FF_setTab) window.FF_setTab('owned');

  // If wallet was already connected (MetaMask remembers), hydrate UI and load data
  const pre = window.ethereum?.selectedAddress;
  if (pre){
    window.FF_setWalletUI?.(pre);
    window.FF_fetchOwned?.(pre);
    window.FF_loadStaked?.();   // auto-load staked for the user
  }

  // Pond loads itself on script load (see pond.js). Expose a pull-to-refresh if desired:
  // document.getElementById('someRefreshBtn')?.addEventListener('click', ()=> window.FF_reloadPond?.());
})();
