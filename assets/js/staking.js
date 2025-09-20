// assets/js/staking.js
// Owned & Staked panel + staking actions + hooks for modal

import {
  FF_CFG, fetchOwned,
  getUser, getCollectionContract, getControllerContract, readStakeInfo
} from "./core.js";

let CURRENT_WALLET = null;
let STAKE_TAB = "owned"; // 'owned' | 'staked'

// =============== UI helpers ===============
function chipHTML(id) {
  const img = `${FF_CFG.SOURCE_PATH}/frog/${id}.png`;
  return `<li class="chip" data-id="${id}">
    <img class="thumb64" src="${img}" alt="Frog #${id}">
    <div class="meta"><b>#${id}</b></div>
  </li>`;
}
function setStakeStatus(msg) {
  const p = document.getElementById("stakeStatus");
  if (p) p.textContent = msg;
}
function renderChipList(ids) {
  const ul = document.getElementById("chipWrap");
  if (!ul) return;
  ul.innerHTML = "";
  if (!ids || !ids.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No frogs found.</div></li>`;
    return;
  }
  ids.forEach(id => ul.insertAdjacentHTML("beforeend", chipHTML(id)));

  // click → open modal
  ul.querySelectorAll(".chip").forEach(el => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.id);
      window.FF_openFrogInfo?.(id);
    });
  });
}

// =============== Owned ====================
export async function loadOwned({ wallet }) {
  if (!wallet) { setStakeStatus("No wallet connected."); return; }
  try {
    setStakeStatus("Loading owned…");
    const data = await fetchOwned({ wallet, limit: 200 });
    const ids = (data.tokens || []).map(t => {
      const tok = t.token || {};
      const tokenId = tok.tokenId ?? t.tokenId;
      return tokenId != null ? parseInt(String(tokenId), 10) : null;
    }).filter(n => Number.isFinite(n));
    if (STAKE_TAB === "owned") renderChipList(ids);
    setStakeStatus(ids.length ? `Owned: ${ids.length}` : "No owned frogs.");
  } catch (e) {
    setStakeStatus(`Failed to load owned: ${e.message || e}`);
  }
}

// =============== Staked ===================
export async function loadStaked({ wallet }) {
  if (!wallet) { setStakeStatus("No wallet connected."); return; }
  if (!FF_CFG.CONTROLLER_ADDRESS) {
    setStakeStatus("Set CONTROLLER_ADDRESS to enable staked view.");
    return;
  }
  try {
    setStakeStatus("Loading staked…");
    const provider = new window.ethers.providers.Web3Provider(window.ethereum, "any");
    const controller = getControllerContract(provider);
    const rows = await controller.getStakedTokens(wallet); // [{staker, tokenId}]
    const ids = (rows || []).map(r => {
      const tokenId = r?.tokenId ?? (Array.isArray(r) ? r[1] : null);
      return tokenId != null ? parseInt(String(tokenId), 10) : null;
    }).filter(n => Number.isFinite(n));
    if (STAKE_TAB === "staked") renderChipList(ids);
    setStakeStatus(ids.length ? `Staked: ${ids.length}` : "No staked frogs.");
  } catch (e) {
    setStakeStatus(`Failed to load staked: ${e.message || e}`);
  }
}

// =============== Actions ==================
// Wire these to buttons when you add action UI
export async function stakeToken(tokenId) {
  const { signer, address } = await getUser();
  const coll = getCollectionContract(signer);
  const ctrl = getControllerContract(signer);
  // need approval
  const isApproved = await coll.isApprovedForAll(address, FF_CFG.CONTROLLER_ADDRESS).catch(()=>false);
  if (!isApproved) {
    const txA = await coll.setApprovalForAll(FF_CFG.CONTROLLER_ADDRESS, true);
    await txA.wait();
  }
  const tx = await ctrl.stake(tokenId);
  await tx.wait();
}
export async function unstakeToken(tokenId) {
  const { signer } = await getUser();
  const ctrl = getControllerContract(signer);
  const tx = await ctrl.withdraw(tokenId);
  await tx.wait();
}
export async function claimRewards() {
  const { signer } = await getUser();
  const ctrl = getControllerContract(signer);
  const tx = await ctrl.claimRewards();
  await tx.wait();
}

// =============== Tabs & boot ==============
export function wireOwnedStakedPanel() {
  const btnOwned = document.getElementById("tabOwned");
  const btnStaked = document.getElementById("tabStaked");
  const refreshOwned = document.getElementById("refreshOwned");
  const loadStakedBtn = document.getElementById("loadStakedBtn");

  btnOwned?.addEventListener("click", async () => {
    STAKE_TAB = "owned";
    btnOwned.setAttribute("aria-selected", "true");
    btnStaked?.setAttribute("aria-selected", "false");
    await loadOwned({ wallet: CURRENT_WALLET });
  });
  btnStaked?.addEventListener("click", async () => {
    STAKE_TAB = "staked";
    btnOwned?.setAttribute("aria-selected", "false");
    btnStaked.setAttribute("aria-selected", "true");
    await loadStaked({ wallet: CURRENT_WALLET });
  });

  refreshOwned?.addEventListener("click", async () => {
    await loadOwned({ wallet: CURRENT_WALLET });
  });
  loadStakedBtn?.addEventListener("click", async () => {
    STAKE_TAB = "staked";
    btnOwned?.setAttribute("aria-selected", "false");
    btnStaked?.setAttribute("aria-selected", "true");
    await loadStaked({ wallet: CURRENT_WALLET });
  });
}

export function onWalletConnected(address) {
  CURRENT_WALLET = address;
  STAKE_TAB = "owned";
  document.getElementById("tabOwned")?.setAttribute("aria-selected", "true");
  document.getElementById("tabStaked")?.setAttribute("aria-selected", "false");
  loadOwned({ wallet: CURRENT_WALLET });
}

// =============== Modal helpers used by ui.js ===============
export async function getStakeMetaForModal(tokenId) {
  // returns { staked: boolean, sinceMs: number|null, staker: address|null }
  try {
    const provider = new window.ethers.providers.Web3Provider(window.ethereum, "any");
    const { staker, sinceMs } = await readStakeInfo(tokenId, provider);
    return { staked: !!(staker && staker !== "0x0000000000000000000000000000000000000000"), sinceMs: sinceMs || null, staker: staker || null };
  } catch {
    return { staked: false, sinceMs: null, staker: null };
  }
}
