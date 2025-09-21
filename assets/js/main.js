// assets/js/main.js
(function(){
  // Ensure containers exist (the new layout already includes them)
  const salesWrap  = document.getElementById('tab-sales');
  const rarityWrap = document.getElementById('tab-rarity');
  const pondWrap   = document.getElementById('pondList');

  function ensureList(id, container){
    let el = container?.querySelector('#'+id);
    if (!el && container) {
      el = document.createElement('ul');
      el.id = id;
      el.className = 'card-list';
      container.appendChild(el);
    }
    return el;
  }

  async function bootPanels(){
    // Recent Sales
    if (salesWrap){
      ensureList('recentSales', salesWrap);
      try { await window.FF_loadSalesLive?.(); } catch(_) {}
      try { window.FF_renderSales?.(); } catch(_) {}
    }

    // Rarity
    if (rarityWrap){
      ensureList('rarityList', rarityWrap);
      try { await window.FF_loadRarity?.(); } catch(_) {}
    }

    // Pond (controller-owned)
    if (pondWrap && window.FF_renderPondList){
      try { await window.FF_renderPondList(pondWrap); } catch(_) {}
    }
  }

  async function boot(){
    try { window.FF_renderGrid?.(); } catch(_) {}
    try { window.FF_setTab?.('owned'); } catch(_) {}

    // If a wallet address is already selected (e.g. MetaMask remembered it)
    const pre = window.ethereum?.selectedAddress;
    if (pre){
      try { window.FF_setWalletUI?.(pre); } catch(_) {}
      try { window.FF_fetchOwned?.(pre); } catch(_) {}
      try { window.FF_loadStaked?.(); } catch(_) {}
    }

    await bootPanels();

    // Optional manual pond refresh hook if you added a button
    const pondRefresh = document.getElementById('refreshPond');
    pondRefresh?.addEventListener('click', async ()=>{
      pondWrap.innerHTML = '';
      try { await window.FF_renderPondList(pondWrap); } catch(_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
