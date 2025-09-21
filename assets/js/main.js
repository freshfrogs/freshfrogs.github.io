(function(){
  async function init(){
    // 3x3 grid (static PNGs, non-clickable)
    window.FF_renderGrid?.();

    // Make sure rarity is available before others need rank badges
    await window.FF.ensureRarity?.();
    await window.FF_renderRarityList?.();

    // Sales: fetch + render
    await window.FF_loadSalesLive?.();
    window.FF_renderSales?.();

    // Pond: paged render (if pond.js is present)
    const pondEl = document.getElementById('pondList');
    if(pondEl && window.FF_renderPondPaged){ window.FF_renderPondPaged(pondEl); }

    // Default staking tab to OWNED
    if(window.FF_setTab) window.FF_setTab('owned');

    // If MetaMask already has an account selected, auto-wire wallet UI and load
    const pre = window.ethereum?.selectedAddress;
    if(pre){
      window.FF_setWalletUI?.(pre);
      window.FF_fetchOwned?.(pre);
      window.FF_loadStaked?.(); // should auto-load staked on connect
    }

    // Theme buttons
    document.querySelectorAll(".theme-dock .swatch").forEach(s=>{
      s.addEventListener("click", ()=>{
        document.documentElement.setAttribute("data-theme", s.dataset.theme);
        document.querySelectorAll(".theme-dock .swatch")
          .forEach(x=>x.setAttribute("aria-current", x===s ? "true" : "false"));
        localStorage.setItem("ff_theme", s.dataset.theme);
      });
    });
    const saved = localStorage.getItem("ff_theme") || document.documentElement.getAttribute("data-theme") || "noir";
    document.documentElement.setAttribute("data-theme", saved);
    document.querySelectorAll(".theme-dock .swatch")
      .forEach(x=>x.setAttribute("aria-current", x.dataset.theme===saved ? "true":"false"));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
