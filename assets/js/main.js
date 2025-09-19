(async function(){
  // Rarity first (so badges show)
  await window.FF_loadRarity();

  // Sales (live auto-try)
  const liveOk = await window.FF_loadSalesLive();
  const liveBtn = document.getElementById('fetchLiveBtn');
  if(liveOk && liveBtn){ liveBtn.textContent="Live loaded"; liveBtn.disabled=true; liveBtn.classList.add('btn-ghost'); }
  window.FF_renderSales();

  // Grid
  window.FF_renderGrid();

  // Tabs default
  window.FF_setTab('owned');

  // If wallet already connected (some wallets expose selectedAddress)
  if (window.ethereum?.selectedAddress){
    window.FF_setWalletUI(window.ethereum.selectedAddress);
    window.FF_fetchOwned(window.ethereum.selectedAddress);
  }
})();
