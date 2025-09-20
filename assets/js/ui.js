// assets/js/ui.js
// UI-only: grid + tabs + renderers; uses core.js for config + fetchers

import { FF_CFG, shorten, formatAgo, thumb64, fetchJSON, fetchSales, fetchMints, fetchPond } from "./core.js";

// Optional global hooks if you already had them elsewhere:
const getRankById = (id) => (typeof window !== "undefined" && window.FF_getRankById) ? window.FF_getRankById(id) : null;
const openFrogInfo = (id) => (typeof window !== "undefined" && window.FF_openFrogInfo) ? window.FF_openFrogInfo(id) : null;

/* ----------------------- Spotlight Grid (128×128) --------------------- */
export function renderGrid() {
  const wrap = document.getElementById("grid");
  if (!wrap) return;
  wrap.classList.add("grid-128");
  wrap.innerHTML = "";
  const N = 9;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    let id;
    do { id = 1 + Math.floor(Math.random() * (FF_CFG.SUPPLY || 4040)); } while (seen.has(id));
    seen.add(id);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<img src="${FF_CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}">`;
    wrap.appendChild(tile);
  }
}

/* ----------------------- Tabs & Buttons ------------------------------- */
function setFeatureView(view) {
  window.currentFeatureView = view;
  document.querySelectorAll('#viewTabs .tab').forEach(btn => {
    btn.setAttribute("aria-selected", btn.dataset.view === view ? "true" : "false");
  });
  if (view === "mints") renderMints();
  else if (view === "sales") renderSales();
  else if (view === "rarity") renderRarity();
  else renderPond();

  const showRaritySort = view === "rarity";
  document.getElementById("sortRankBtn")?.style.setProperty("display", showRaritySort ? "" : "none");
  document.getElementById("sortScoreBtn")?.style.setProperty("display", showRaritySort ? "" : "none");
}

export function wireFeatureTabs() {
  const wrap = document.getElementById("viewTabs");
  if (!wrap) return;
  wrap.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => setFeatureView(btn.dataset.view));
  });
  setFeatureView("mints"); // default
}

export function wireFeatureButtons() {
  const refresh = document.getElementById("refreshBtn");
  const live = document.getElementById("fetchLiveBtn");

  refresh?.addEventListener("click", () => {
    const v = window.currentFeatureView || "mints";
    if (v === "mints") renderMints();
    else if (v === "sales") renderSales();
    else if (v === "rarity") renderRarity();
    else renderPond();
  });

  live?.addEventListener("click", async () => {
    const v = window.currentFeatureView || "mints";
    let ok = false;
    if (v === "mints")      ok = await loadMintsLive();
    else if (v === "sales") ok = await loadSalesLive();
    else if (v === "pond")  ok = await loadPond({ append: false, limit: 50 });

    if (ok) {
      live.textContent = "Live loaded";
      live.disabled = true;
      live.classList.add("btn-ghost");
    }
  });

  document.getElementById("sortRankBtn")?.addEventListener("click", () => {
    raritySortMode = "rank"; renderRarity();
  });
  document.getElementById("sortScoreBtn")?.addEventListener("click", () => {
    raritySortMode = "score"; renderRarity();
  });
}

/* ======================= Mints ======================================= */
let mintsCache = [];
let mintsContinuation = "";

function mapMints(activities) {
  return (activities || []).map(a => {
    const t = a.token || a;
    const tokenId = t?.tokenId ?? t?.id;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
    const ts = (a.eventTimestamp && Date.parse(a.eventTimestamp)) || (a.timestamp ? Number(a.timestamp) * 1000 : null);
    const minter = a.toAddress || a.to || a.maker || a.buyer || null;
    const amt = a.price?.amount;
    const priceEth = (amt?.decimal != null) ? `${Number(amt.decimal).toFixed(4)} ETH`
                    : (amt?.native != null ? `${Number(amt.native).toFixed(4)} ETH` : "—");
    return id ? { id, time: ts ? formatAgo(Date.now() - ts) : "—", buyer: minter ? shorten(minter) : "—", price: priceEth } : null;
  }).filter(Boolean);
}
function renderMintsError(msg) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = `<li class="list-item"><div class="muted">${msg}</div></li>`;
  anchor && (anchor.innerHTML = "");
}
export function renderMints(list = mintsCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = ""; anchor && (anchor.innerHTML = "");
  const arr = (list && list.length) ? list : [];
  if (!arr.length) { ul.innerHTML = `<li class="list-item"><div class="muted">No recent mints yet.</div></li>`; return; }
  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0) ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill pill-ghost">Rank N/A</span>`;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
      `<div>
         <div class="row gap8"><b>Frog #${x.id}</b> ${badge}</div>
         <div class="muted">${x.time !== "—" ? x.time + " ago" : "—"} • Minter ${x.buyer}</div>
       </div>
       <div class="price">${x.price}</div>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openFrogInfo && openFrogInfo(x.id));
    ul.appendChild(li);
  });
  if (mintsContinuation) {
    const btn = document.createElement("button");
    btn.id = "featureMoreBtn";
    btn.className = "btn btn-outline btn-sm";
    btn.textContent = "Load more";
    btn.onclick = () => loadMintsLive({ append: true });
    anchor?.appendChild(btn);
  }
}
export async function loadMintsLive({ append = false } = {}) {
  if (!FF_CFG.COLLECTION_ADDRESS) { renderMintsError("Missing COLLECTION_ADDRESS in FF_CFG."); return false; }
  try {
    const data = await fetchMints({ limit: 50, continuation: append ? mintsContinuation : "" });
    const mapped = mapMints(data.activities || data.events || []);
    if (append) mintsCache = mintsCache.concat(mapped); else mintsCache = mapped;
    mintsContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "mints") renderMints();
    return true;
  } catch (e) {
    renderMintsError(`Failed to fetch Recent Mints. ${e.message || e}`); return false;
  }
}

/* ======================= Sales ======================================= */
let salesCache = [];
let salesContinuation = "";
function renderSales(list = salesCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = ""; anchor && (anchor.innerHTML = "");
  const arr = (list && list.length) ? list : [];
  if (!arr.length) { ul.innerHTML = `<li class="list-item"><div class="muted">No recent sales yet.</div></li>`; return; }
  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0) ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill pill-ghost">Rank N/A</span>`;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
      `<div>
         <div class="row gap8"><b>Frog #${x.id}</b> ${badge}</div>
         <div class="muted">${x.time !== "—" ? x.time + " ago" : "—"} • Buyer ${x.buyer}</div>
       </div>
       <div class="price">${x.price}</div>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openFrogInfo && openFrogInfo(x.id));
    ul.appendChild(li);
  });
  if (salesContinuation) {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline btn-sm";
    btn.textContent = "Load more";
    btn.onclick = () => loadSalesLive({ append: true });
    anchor?.appendChild(btn);
  }
}
export async function loadSalesLive({ append = false } = {}) {
  try {
    const data = await fetchSales({ limit: 50, continuation: append ? salesContinuation : "" });
    const mapped = (data.sales || []).map(s => ({
      id: parseInt(String(s?.token?.tokenId ?? s.tokenId), 10),
      time: (() => {
        const ts = (s.createdAt && Date.parse(s.createdAt)) || (s.timestamp ? Number(s.timestamp) * 1000 : null);
        return ts ? formatAgo(Date.now() - ts) : "—";
      })(),
      buyer: shorten(s.toAddress || s.to || s.buyer || s.taker || s.maker || ""),
      price: (() => {
        const amt = s.price?.amount;
        return (amt?.decimal != null) ? `${Number(amt.decimal).toFixed(4)} ETH`
             : (amt?.native != null ? `${Number(amt.native).toFixed(4)} ETH` : "—");
      })()
    })).filter(x => Number.isFinite(x.id));
    if (append) salesCache = salesCache.concat(mapped); else salesCache = mapped;
    salesContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "sales") renderSales();
    return true;
  } catch (e) {
    const ul = document.getElementById("featureList");
    ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Failed to fetch Sales: ${e.message || e}</div></li>`);
    return false;
  }
}

/* ======================= Rarity ====================================== */
let rarityCache = []; // [{id, rank, score?}, ...]
let raritySortMode = "rank";
async function loadRarityJSON() {
  if (Array.isArray(window.FF_RARITY_LIST)) return window.FF_RARITY_LIST;
  return fetchJSON(FF_CFG.RARITY_JSON);
}
export async function loadRarity() {
  try {
    const raw = await loadRarityJSON();
    if (Array.isArray(raw)) {
      rarityCache = raw.map(x => ({
        id: Number(x.id ?? x.tokenId ?? x[0]),
        rank: Number(x.rank ?? x[1]),
        score: x.score != null ? Number(x.score) : undefined
      })).filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
    } else if (typeof raw === "object" && raw) {
      rarityCache = Object.entries(raw).map(([k, v]) => ({ id: Number(k), rank: Number(v) }))
        .filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
    } else {
      rarityCache = [];
    }
    if ((window.currentFeatureView || "mints") === "rarity") renderRarity();
  } catch (e) {
    const ul = document.getElementById("featureList");
    ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load rarity data: ${e.message || e}</div></li>`);
    rarityCache = [];
  }
}
function renderRarity() {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = ""; anchor && (anchor.innerHTML = "");
  if (!rarityCache.length) { ul.innerHTML = `<li class="list-item"><div class="muted">No rarity data.</div></li>`; return; }
  const sorted = rarityCache.slice().sort((a, b) => {
    if (raritySortMode === "score" && a.score != null && b.score != null) return b.score - a.score;
    return a.rank - b.rank;
  });
  sorted.forEach(x => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
      `<div>
         <div class="row gap8"><b>Frog #${x.id}</b> <span class="pill">Rank <b>#${x.rank}</b></span></div>
         <div class="muted">${x.score != null ? `Score ${x.score}` : ""}</div>
       </div>
       <div class="price"></div>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openFrogInfo && openFrogInfo(x.id));
    ul.appendChild(li);
  });
}

/* ======================= Pond ======================================== */
let pondCache = [];
let pondContinuation = "";
function mapPond(tokens) {
  return (tokens || []).map(t => {
    const tok = t.token || {};
    const tokenId = tok.tokenId ?? t.tokenId;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
    return id ? { id } : null;
  }).filter(Boolean);
}
function renderPond(list = pondCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = ""; anchor && (anchor.innerHTML = "");
  const arr = (list && list.length) ? list : [];
  if (!arr.length) { ul.innerHTML = `<li class="list-item"><div class="muted">No staked frogs found (Pond empty or controller unset).</div></li>`; return; }
  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0) ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill pill-ghost">Rank N/A</span>`;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
      `<div>
         <div class="row gap8"><b>Frog #${x.id}</b> ${badge}</div>
         <div class="muted">Staked (Controller)</div>
       </div>
       <div class="price"></div>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openFrogInfo && openFrogInfo(x.id));
    ul.appendChild(li);
  });
  if (pondContinuation) {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline btn-sm";
    btn.textContent = "Load more";
    btn.onclick = () => loadPond({ append: true, limit: 50 });
    anchor?.appendChild(btn);
  }
}
export async function loadPond({ append = false, limit = 50 } = {}) {
  try {
    const data = await fetchPond({ limit, continuation: append ? pondContinuation : "" });
    const mapped = mapPond(data.tokens || []);
    if (append) pondCache = pondCache.concat(mapped); else pondCache = mapped;
    pondContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "pond") renderPond();
    return true;
  } catch (e) {
    const ul = document.getElementById("featureList");
    ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load Pond: ${e.message || e}</div></li>`);
    return false;
  }
}

/* ----------------------- Public init ---------------------------------- */
export async function initUI() {
  renderGrid();
  wireFeatureTabs();
  wireFeatureButtons();
  try { await loadMintsLive(); } catch {}
  try { await loadRarity(); } catch {}
}
