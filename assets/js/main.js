(async function(){
  await window.FF_loadRarity();
  const ok = await window.FF_loadSalesLive();
  const b=document.getElementById('fetchLiveBtn');
  if(ok && b){ b.textContent="Live loaded"; b.disabled=true; b.classList.add('btn-ghost'); }
  window.FF_renderSales();
  window.FF_renderGrid();
  window.FF_setTab('owned');
  if(window.ethereum?.selectedAddress){
    window.FF_setWalletUI(window.ethereum.selectedAddress);
    window.FF_fetchOwned(window.ethereum.selectedAddress);
  }
})();