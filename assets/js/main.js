// assets/js/main.js
// central boot: theme, mint UI, wallet connect, then initUI

import { initUI } from "./ui.js";
import { getUser } from "./core.js";

// ---------- Theme switcher ----------
function applyTheme(theme) {
  if (!theme) return;
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("ff_theme", theme); } catch {}
}
function restoreTheme() {
  try {
    const saved = localStorage.getItem("ff_theme");
    if (saved) applyTheme(saved);
  } catch {}
}
function wireThemeDock() {
  restoreTheme();
  document.querySelectorAll(".theme-dock .swatch").forEach(btn => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
  });
}

// ---------- Mint panel (UI-only demo) ----------
const MINT_PRICE_ETH = 0.01;
function updateMintUI(qty) {
  const total = (qty * MINT_PRICE_ETH).toFixed(2);
  const qtyEl = document.getElementById("mintQty");
  const totEl = document.getElementById("mintTotal");
  const btn = document.getElementById("mintBtn");
  qtyEl && (qtyEl.textContent = String(qty));
  totEl && (totEl.textContent = total);
  if (btn) {
    const u = btn.querySelector("u");
    if (u) u.textContent = String(qty);
  }
}
function wireMintPanel() {
  const down = document.getElementById("mintDown");
  const up   = document.getElementById("mintUp");
  const slider = document.getElementById("mintSlider");
  const presets = document.querySelectorAll('[data-preset]');
  const gasEst = document.getElementById("gasEst");

  const getQty = () => Number(slider?.value || 1);
  const setQty = (v) => {
    const q = Math.max(1, Math.min(20, Number(v) || 1));
    if (slider) slider.value = String(q);
    updateMintUI(q);
  };

  down?.addEventListener("click", () => setQty(getQty() - 1));
  up?.addEventListener("click", () => setQty(getQty() + 1));
  slider?.addEventListener("input", () => updateMintUI(getQty()));
  presets.forEach(p => p.addEventListener("click", () => setQty(p.dataset.preset)));

  if (gasEst) gasEst.textContent = (Math.random() * 0.003 + 0.001).toFixed(3);
  setQty(Number(slider?.value || 1));
}

// ---------- Wallet connect ----------
function wireWallet() {
  const btn = document.getElementById("connectBtn");
  const lbl = document.getElementById("walletLabel");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const { address } = await getUser();
      if (lbl) { lbl.textContent = address; lbl.style.display = ""; }
      btn.textContent = "Connected";
      btn.disabled = true;
      // could trigger owned/staked refresh here if desired
    } catch (e) {
      alert(e.message || String(e));
    }
  });
}

// ---------- Boot ----------
window.addEventListener("DOMContentLoaded", async () => {
  wireThemeDock();
  wireMintPanel();
  wireWallet();
  await initUI();
});
