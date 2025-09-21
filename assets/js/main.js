// assets/js/main.js
// Light bootstrap that kicks off core views after modules load
(function(){
  // Render hero grid
  try { window.FF_renderGrid?.(); } catch(e){ console.warn(e); }

  // Default to OWNED tab for "My Frogs"
  try { window.FF_setTab?.('owned'); } catch(e){}

  // If MetaMask already has a selected address, auto-init UI and load data
  const pre = window.ethereum?.selectedAddress;
  if(pre){
    try { window.FF_setWalletUI?.(pre); } catch(e){}
    try { window.FF_fetchOwned?.(pre); } catch(e){}
    try { window.FF_loadStaked?.(); } catch(e){}
  }

  // Optionally prime Sales & Rarity on first load
  // (Features panel tab driver in index.html will also call these when tabs are opened)
  try { window.FF_loadSalesLive?.().then(()=>window.FF_renderSales?.()); } catch(e){}
  try { window.FF_loadRarity?.(); } catch(e){}
})();
