import { initTheme, FF_CFG } from "./core.js";
import {
  renderGrid,
  loadSalesLive,
  loadRarity,
  initWallet,
  clearOwned,
  fetchOwned,
  wireFeatureButtons,
  wireFeatureTabs,   // NEW: tabs for Sales/Rarity in the unified panel
} from "./ui.js";
import { wireStakingUI, setTab, loadStaked } from "./staking.js";

// Global UI wiring that doesn't depend on data yet
initTheme();
wireFeatureButtons();
wireFeatureTabs();  // sets up the "Sales / Rarity" tabs and renders the initial "Sales" view
wireStakingUI();

(async () => {
  // Load rarity JSON (needed so rank badges show up in sales and owned/staked lists)
  await loadRarity();

  // Try to fetch live sales (falls back silently if missing API key)
  const ok = await loadSalesLive();
  const b = document.getElementById("fetchLiveBtn");
  if (ok && b) {
    b.textContent = "Live loaded";
    b.disabled = true;
    b.classList.add("btn-ghost");
  }

  // Render the hero grid and set default staking tab
  renderGrid();
  setTab("owned");

  // Wallet wiring: on connect/disconnect/change, refresh data
  initWallet({
    onConnect: (addr) => {
      clearOwned();
      fetchOwned(addr);
      loadStaked();
      const s = document.getElementById("stakeStatus");
      if (s) s.textContent = "Connected. Loading Owned/Staked…";
    },
    onDisconnect: () => {
      clearOwned();
      const s = document.getElementById("stakeStatus");
      if (s) s.textContent = "Disconnected.";
    },
    onChanged: (addr) => {
      if (addr) {
        clearOwned();
        fetchOwned(addr);
        loadStaked();
      } else {
        clearOwned();
        const s = document.getElementById("stakeStatus");
        if (s) s.textContent = "Disconnected.";
      }
    }
  });

  // Optional: auto-init if a wallet is already selected and AUTO_INIT is true
  if (FF_CFG.AUTO_INIT && window.ethereum?.selectedAddress) {
    const pre = window.ethereum.selectedAddress;
    const label = document.getElementById("walletLabel");
    if (label) {
      label.textContent = "Connected: " + pre.slice(0, 6) + "…" + pre.slice(-4);
      label.style.display = "";
    }
    const btn = document.getElementById("connectBtn");
    if (btn) btn.textContent = "Disconnect";
    clearOwned();
    fetchOwned(pre);
    loadStaked();
  }
})();
