// assets/js/main.js
(function(){
  // ----- Unified panel tabs (Sales / Rarity / Pond) -----
  const tabsEl = document.getElementById('infoTabs');
  const views = {
    sales:  document.getElementById('tab-sales'),
    rarity: document.getElementById('tab-rarity'),
    pond:   document.getElementById('tab-pond'),
  };

  function ensureList(id, container){
    let el = container.querySelector('#'+id);
    if (!el) {
      el = document.createElement('ul');
      el.id = id;
      el.className = 'card-list';
      container.appendChild(el);
    }
    return el;
  }

  async function showTab(name){
    if (!tabsEl) return;
    tabsEl.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    Object.entries(views).forEach(([k,el]) => el.classList.toggle('hidden', k !== name));

    if (name === 'sales' && !views.sales.dataset.ready) {
      ensureList('recentSales', views.sales);
      try { await window.FF_loadSalesLive?.(); } catch(_) {}
      try { window.FF_renderSales?.(); } catch(_) {}
      views.sales.dataset.ready = '1';
    }

    if (name === 'rarity' && !views.rarity.dataset.ready) {
      ensureList('rarityList', views.rarity);
      try { await window.FF_loadRarity?.(); } catch(_) {}
      views.rarity.dataset.ready = '1';
    }

    if (name === 'pond' && !views.pond.dataset.ready) {
      // ✅ Use pond list renderer from staking.js (includes click → modal)
      if (window.FF_renderPondList) {
        await window.FF_renderPondList(views.pond);
      } else {
        views.pond.textContent = 'Loading pond…';
      }
      views.pond.dataset.ready = '1';
    }
  }

  tabsEl?.addEventListener('click', (e)=>{
    const b = e.target.closest('.tab'); if (!b) return;
    showTab(b.dataset.tab);
  });

  // ----- Initial boot -----
  async function boot(){
    try { window.FF_renderGrid?.(); } catch(_) {}
    // default tab
    showTab('sales');

    // default staking sub-tab: Owned (staking.js handles auto-load of staked later)
    try { window.FF_setTab?.('owned'); } catch(_) {}

    // if wallet already selected (e.g., MetaMask preselected), initialize datasets
    const pre = window.ethereum?.selectedAddress;
    if (pre){
      try { window.FF_setWalletUI?.(pre); } catch(_) {}
      try { window.FF_fetchOwned?.(pre); } catch(_) {}
      try { window.FF_loadStaked?.(); } catch(_) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
