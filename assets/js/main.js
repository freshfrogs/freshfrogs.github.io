import { initTheme, FF_CFG } from "./core.js";
import {
  renderGrid, renderSales, loadSalesLive, loadRarity,
  renderRarity, initWallet, clearOwned, fetchOwned,
  wireFeatureButtons, wireFeatureTabs, loadPond
} from "./ui.js";
import { wireStakingUI, setTab, loadStaked } from "./staking.js";

// Theme + small UI
initTheme();
wireFeatureButtons();
wireFeatureTabs();
wireStakingUI();

(async () => {
  // Rarity first (ranks everywhere)
  await loadRarity();

  // Live sales (ok to fail gracefully without key)
  const ok = await loadSalesLive();
  const b = document.getElementById("fetchLiveBtn");
  if (ok && b) { b.textContent = "Live loaded"; b.disabled = true; b.classList.add("btn-ghost"); }
  renderSales();

  // Pond initial page
  await loadPond(50);

  // Grid (simple static images)
  renderGrid();

  // Default staking tab
  setTab("owned");

  // Wallet
  initWallet({
    onConnect: (addr) => {
      clearOwned(); fetchOwned(addr); loadStaked();
      const s=document.getElementById("stakeStatus"); if(s) s.textContent="Connected. Loading Owned/Staked…";
    },
    onDisconnect: () => {
      clearOwned();
      const s=document.getElementById("stakeStatus"); if(s) s.textContent="Disconnected.";
    },
    onChanged: (addr) => {
      if (addr) { clearOwned(); fetchOwned(addr); loadStaked(); }
      else { clearOwned(); const s=document.getElementById("stakeStatus"); if(s) s.textContent="Disconnected."; }
    }
  });

  // Optional auto-init if a wallet is already selected
  if (FF_CFG.AUTO_INIT && window.ethereum?.selectedAddress) {
    const pre = window.ethereum.selectedAddress;
    const label = document.getElementById("walletLabel");
    if (label) { label.textContent = "Connected: " + pre.slice(0,6) + "…" + pre.slice(-4); label.style.display = ""; }
    const btn = document.getElementById("connectBtn"); if (btn) btn.textContent = "Disconnect";
    clearOwned(); fetchOwned(pre); loadStaked();
  }
})();

// Close modal on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const L = document.getElementById("lightbox");
    if (L && L.style.display !== "none") {
      L.style.display = "none";
      document.body.style.overflow = "";
    }
  }
});
