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
// ------- Unified Info Panel Tabs -------
(function(){
  const tabsEl = document.getElementById('infoTabs');
  const views = {
    sales:  document.getElementById('tab-sales'),
    rarity: document.getElementById('tab-rarity'),
    pond:   document.getElementById('tab-pond'),
  };

  async function showTab(name){
    // toggle tab buttons
    tabsEl.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    // toggle views
    Object.entries(views).forEach(([k,el]) => el.classList.toggle('hidden', k !== name));

    // lazy render each tab the first time it’s shown
    if (name === 'sales' && !views.sales.dataset.ready) {
      try { await window.FF_renderSalesList(views.sales); } catch(_) {}
      views.sales.dataset.ready = "1";
    }
    if (name === 'rarity' && !views.rarity.dataset.ready) {
      try { await window.FF_renderRarityList(views.rarity); } catch(_) {}
      views.rarity.dataset.ready = "1";
    }
    if (name === 'pond' && !views.pond.dataset.ready) {
      try { await window.FF_renderPondList(views.pond); } catch(_) {}
      views.pond.dataset.ready = "1";
    }
  }

  tabsEl?.addEventListener('click', (e)=>{
    const b = e.target.closest('.tab'); if (!b) return;
    showTab(b.dataset.tab);
  });

  // default tab on load
  showTab('sales');
})();
