// assets/js/ui.js
// Grid + tabs + lists + frog modal (layered render)
// Adds stronger error messages for Sales / Rarity / Pond

import {
  FF_CFG, shorten, formatAgo, thumb64, fetchJSON, absolutePath,
  fetchSales, fetchMints, fetchPond
} from "./core.js";
import { getStakeMetaForModal } from "./staking.js";

/* ================== Spotlight Grid ================== */
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

/* ================== Tabs & Buttons ================== */
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
  setFeatureView("mints");
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
    if (ok) { live.textContent = "Live loaded"; live.disabled = true; live.classList.add("btn-ghost"); }
  });

  document.getElementById("sortRankBtn")?.addEventListener("click", () => { raritySortMode = "rank"; renderRarity(); });
  document.getElementById("sortScoreBtn")?.addEventListener("click", () => { raritySortMode = "score"; renderRarity(); });
}

/* ================== Recent Mints ================== */
let mintsCache = []; let mintsContinuation = "";
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
function featureError(msg) {
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
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
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
    li.addEventListener("click", () => openFrogModal(x.id));
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
  try {
    const data = await fetchMints({ limit: 50, continuation: append ? mintsContinuation : "" });
    const mapped = mapMints(data.activities || data.events || []);
    if (append) mintsCache = mintsCache.concat(mapped); else mintsCache = mapped;
    mintsContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "mints") renderMints();
    return true;
  } catch (e) { featureError(`Failed to fetch Recent Mints. ${e.message || e}`); return false; }
}

/* ================== Sales ================== */
let salesCache = []; let salesContinuation = "";
function renderSales(list = salesCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = ""; anchor && (anchor.innerHTML = "");
  const arr = (list && list.length) ? list : [];
  if (!arr.length) { ul.innerHTML = `<li class="list-item"><div class="muted">No recent sales yet.</div></li>`; return; }
  arr.forEach(x => {
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
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
    li.addEventListener("click", () => openFrogModal(x.id));
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
  } catch (e) { featureError(`Failed to fetch Sales: ${e.message || e}`); return false; }
}

// ---------- RARITY: robust loader + renderer ----------

// Absolute path helper (prevents GH Pages relative-path issues)
function FF_abs(p) {
  return /^https?:\/\//i.test(p) ? p : new URL(p.replace(/^\.\//, "/"), location.origin).toString();
}

// In-memory cache + simple index
window.FF_RARITY_LIST = window.FF_RARITY_LIST || [];
window.FF_getRankById = window.FF_getRankById || null;

async function FF_loadRarity(jsonPath = (window.FF_CFG?.RARITY_JSON || "assets/freshfrogs_rarity_rankings.json")) {
  const url = FF_abs(jsonPath);
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Rarity HTTP ${res.status} @ ${url}`);
  const raw = await res.json();

  let list = [];
  if (Array.isArray(raw)) {
    list = raw.map(x => ({
      id: Number(x.id ?? x.tokenId ?? x[0]),
      rank: Number(x.rank ?? x[1]),
      score: (x.score != null) ? Number(x.score) : undefined,
    })).filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
  } else if (raw && typeof raw === "object") {
    // id -> rank map
    list = Object.entries(raw).map(([k,v]) => ({ id:Number(k), rank:Number(v) }))
           .filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
  } else {
    list = [];
  }

  // cache + quick lookup
  window.FF_RARITY_LIST = list;
  const index = new Map(list.map(o => [o.id, o.rank]));
  window.FF_getRankById = (id) => index.get(Number(id)) ?? null;

  return list;
}

// Minimal time formatter
function FF_ago(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d>0) return `${d}d`; if (h>0) return `${h}h`; if (m>0) return `${m}m`; return `${s}s`;
}

// Small thumb helper (64x64 min)
function FF_thumb64(src, alt="") {
  const esc = String(alt).replace(/"/g,"&quot;");
  return `<img class="thumb64" src="${src}" alt="${esc}">`;
}

// Renders the rarity list into a UL with id="featureList" (change id if yours differs)
function FF_renderRarityList(targetId = "featureList") {
  const ul = document.getElementById(targetId);
  const anchor = document.getElementById("featureMoreAnchor"); // optional “Load more” area
  if (!ul) return;

  const items = (window.FF_RARITY_LIST || []).slice(); // copy
  ul.innerHTML = "";
  if (!items.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No rarity data available.</div></li>`;
    if (anchor) anchor.innerHTML = "";
    return;
  }

  // Default sort by rank asc
  items.sort((a,b) => a.rank - b.rank);

  // Show first 5; allow “Load more”
  const page = Number(ul.dataset.page || 1);
  const pageSize = 25; // render 25 at a time for perf; UI still shows 5 height via CSS scroll
  const upto = page * pageSize;
  const slice = items.slice(0, upto);

  slice.forEach(x => {
    const img = `${(window.FF_CFG?.SOURCE_PATH || "https://freshfrogs.github.io")}/frog/${x.id}.png`;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      FF_thumb64(img, `Frog ${x.id}`) +
      `<div>
         <div class="row gap8"><b>Frog #${x.id}</b> <span class="pill">Rank <b>#${x.rank}</b></span></div>
         <div class="muted">${x.score != null ? `Score ${x.score}` : ""}</div>
       </div>
       <div class="price"></div>`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => window.FF_openFrogInfo?.(x.id));
    ul.appendChild(li);
  });

  if (anchor) {
    anchor.innerHTML = "";
    if (upto < items.length) {
      const btn = document.createElement("button");
      btn.className = "btn btn-outline btn-sm";
      btn.textContent = "Load more";
      btn.onclick = () => { ul.dataset.page = String(page + 1); FF_renderRarityList(targetId); };
      anchor.appendChild(btn);
    }
  }
}

// Convenience: one-call boot for rarity tab
async function FF_bootRarity(targetId = "featureList") {
  try {
    await FF_loadRarity();
    FF_renderRarityList(targetId);
  } catch (e) {
    const ul = document.getElementById(targetId);
    const anchor = document.getElementById("featureMoreAnchor");
    if (ul) ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load rarity: ${e.message || e}</div></li>`;
    if (anchor) anchor.innerHTML = "";
    console.warn("Rarity load failed", e);
  }
}

/* ================== Pond ================== */
let pondCache = []; let pondContinuation = "";
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
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
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
    li.addEventListener("click", () => openFrogModal(x.id));
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
  } catch (e) { featureError(`Failed to load Pond: ${e.message || e}`); return false; }
}

/* ================== Frog Modal ================== */
function modalStage() { return document.getElementById("lightboxStage"); }
function modalRoot()  { return document.getElementById("lightbox"); }

export async function openFrogModal(tokenId) {
  try {
    const metaUrl = `${FF_CFG.SOURCE_PATH}/frog/json/${tokenId}.json`;
    const meta = await (await fetch(metaUrl, { cache: "no-cache" })).json();

    const root = modalRoot(); const stage = modalStage();
    if (!root || !stage) return;
    stage.innerHTML = "";

    // Background: original token image zoomed so only the color fills the bg
    const bgUrl = `${FF_CFG.SOURCE_PATH}/frog/${tokenId}.png`;
    const wrapper = document.createElement("div");
    wrapper.className = "frog-modal-wrap";
    Object.assign(wrapper.style, {
      position: "relative",
      width: "min(512px, 90vw)",
      aspectRatio: "1 / 1",
      backgroundImage: `url("${bgUrl}")`,
      backgroundSize: "900% 900%",
      backgroundPosition: "100% 100%",
      borderRadius: "16px",
      overflow: "hidden",
    });

    const layerHost = document.createElement("div");
    Object.assign(layerHost.style, { position: "absolute", inset: "0", display: "grid", placeItems: "center" });

    const hasNaturalTrait = meta.attributes?.some(a => a.trait_type === "Trait" && /natural/i.test(a.value));
    for (const a of (meta.attributes || [])) {
      const ttype = a.trait_type;
      const name  = a.value;
      let src = `${FF_CFG.SOURCE_PATH}/frog/build_files/${ttype}/${name}.png`;
      const allowAnimation = (ttype === "Frog" && hasNaturalTrait) || (ttype === "SpecialFrog");
      const blockAnimation = (ttype === "Hat" || ttype === "Trait");
      if (allowAnimation && !blockAnimation) {
        const gif = `${FF_CFG.SOURCE_PATH}/frog/build_files/${ttype}/animations/${name}_animation.gif`;
        try {
          await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(true); img.onerror = rej; img.src = gif; });
          src = gif;
        } catch { /* fallback to png */ }
      }
      const img = document.createElement("img");
      img.src = src; img.alt = `${ttype}: ${name}`;
      Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" });
      layerHost.appendChild(img);
    }

    wrapper.appendChild(layerHost);

    // Footer info
    const info = document.createElement("div");
    Object.assign(info.style, {
      position: "absolute", left: 0, right: 0, bottom: 0,
      padding: "10px 12px", background: "rgba(0,0,0,0.35)", color: "white",
      display: "flex", gap: "10px", alignItems: "center", backdropFilter: "blur(4px)"
    });

    const rank = window.FF_getRankById ? window.FF_getRankById(tokenId) : null;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.innerHTML = (rank || rank === 0) ? `Rank <b>#${rank}</b>` : `Rank N/A`;

    const stakeMeta = await getStakeMetaForModal(tokenId);
    const stTxt = stakeMeta.staked ? `Staked ${stakeMeta.sinceMs ? formatAgo(Date.now() - stakeMeta.sinceMs) + " ago" : ""}` : "Not staked";

    const title = document.createElement("div");
    title.innerHTML = `<b>Frog #${tokenId}</b> <span class="muted">• ${stTxt}</span>`;

    const links = document.createElement("div");
    links.style.marginLeft = "auto";
    links.innerHTML = `
      <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://etherscan.io/nft/${FF_CFG.COLLECTION_ADDRESS}/${tokenId}">Etherscan</a>
      <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://opensea.io/assets/ethereum/${FF_CFG.COLLECTION_ADDRESS}/${tokenId}">OpenSea</a>
    `;

    stage.appendChild(wrapper);
    info.appendChild(pill);
    info.appendChild(title);
    info.appendChild(links);
    stage.appendChild(info);

    root.style.display = "grid";
    root.onclick = (e) => { if (e.target === root) { root.style.display = "none"; } };
  } catch (e) {
    console.warn("openFrogModal failed", e);
    alert(`Failed to load frog ${tokenId}: ${e.message || e}`);
  }
}

// expose for other modules
window.FF_openFrogInfo = openFrogModal;

/* ================== Public init ================== */
export async function initUI() {
  renderGrid();
  wireFeatureTabs();
  wireFeatureButtons();
  try { await loadMintsLive(); } catch {}
  try { await loadRarity(); } catch {}
}
