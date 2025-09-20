/* ========================================================================
   Fresh Frogs — UI (complete, self-contained)
   Wires: Recent Mints / Sales / Rarity / Pond + Tabs/Buttons + Grid
   ======================================================================== */

/* ----------------------- Config & Safe Defaults ----------------------- */
const CFG = (typeof window !== "undefined" && window.FF_CFG) ? window.FF_CFG : {
  SOURCE_PATH: "https://freshfrogs.github.io",
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  CONTROLLER_ADDRESS: "", // fill with controller if you want Pond
  FROG_API_KEY: "YOUR_RESERVOIR_API_KEY_HERE",
  SUPPLY: 4040
};

/* ----------------------- Small Utilities ------------------------------ */
function shorten(addr) {
  if (!addr || typeof addr !== "string") return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
function formatAgo(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
function thumb64(src, alt = "") {
  const escAlt = String(alt).replace(/"/g, "&quot;");
  return `<img class="thumb64" src="${src}" alt="${escAlt}">`;
}
const getRankById = (id) =>
  (typeof window !== "undefined" && window.FF_getRankById) ? window.FF_getRankById(id) : null;
const openFrogInfo = (id) =>
  (typeof window !== "undefined" && window.FF_openFrogInfo) ? window.FF_openFrogInfo(id) : null;

/* ----------------------- Spotlight Grid (128×128) --------------------- */
export function renderGrid() {
  const wrap = document.getElementById("grid");
  if (!wrap) return;
  wrap.classList.add("grid-128"); // lock tiles to 128×128
  wrap.innerHTML = "";
  const N = 9;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    let id;
    do {
      id = 1 + Math.floor(Math.random() * (CFG.SUPPLY || 4040));
    } while (seen.has(id));
    seen.add(id);
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<img src="${CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}">`;
    wrap.appendChild(tile);
  }
}

/* ----------------------- Tabs (Mints / Sales / Rarity / Pond) --------- */
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

/* ----------------------- Feature Buttons ------------------------------ */
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

  // Optional rarity sorting if you add handlers later
  document.getElementById("sortRankBtn")?.addEventListener("click", () => {
    raritySortMode = "rank";
    renderRarity();
  });
  document.getElementById("sortScoreBtn")?.addEventListener("click", () => {
    raritySortMode = "score";
    renderRarity();
  });
}

/* ======================= Recent Mints (Reservoir) ===================== */
function mapMints(activities) {
  return (activities || []).map(a => {
    const t = a.token || a;
    const tokenId = t?.tokenId ?? t?.id;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;

    const ts =
      (a.eventTimestamp && Date.parse(a.eventTimestamp)) ||
      (a.timestamp ? Number(a.timestamp) * 1000 : null);

    const minter = a.toAddress || a.to || a.maker || a.buyer || null;

    const amt = a.price?.amount;
    const priceEth =
      (amt?.decimal != null)
        ? `${Number(amt.decimal).toFixed(4)} ETH`
        : (amt?.native != null ? `${Number(amt.native).toFixed(4)} ETH` : "—");

    return id ? {
      id,
      time: ts ? formatAgo(Date.now() - ts) : "—",
      buyer: minter ? shorten(minter) : "—",
      price: priceEth
    } : null;
  }).filter(Boolean);
}

async function fetchMints({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: CFG.COLLECTION_ADDRESS,
    types: "mint",
    limit: String(limit),
    sortBy: "eventTimestamp",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/collections/activity/v6?${qs.toString()}`;
  const res = await fetch(url, { headers: { accept: "*/*", "x-api-key": CFG.FROG_API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { activities, continuation? }
}

let mintsCache = [];
let mintsContinuation = "";

export function renderMints(list = mintsCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = "";
  anchor && (anchor.innerHTML = "");

  const arr = (list && list.length) ? list : [];
  if (!arr.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No recent mints yet.</div></li>`;
    return;
  }

  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill pill-ghost">Rank N/A</span>`;

    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
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
  if (!CFG.FROG_API_KEY || CFG.FROG_API_KEY === "YOUR_RESERVOIR_API_KEY_HERE") {
    console.warn("Missing Reservoir API key for mints.");
    return false;
  }
  const data = await fetchMints({ limit: 50, continuation: append ? mintsContinuation : "" });
  const mapped = mapMints(data.activities || data.events || []);
  if (append) mintsCache = mintsCache.concat(mapped); else mintsCache = mapped;
  mintsContinuation = data.continuation || "";
  if ((window.currentFeatureView || "mints") === "mints") renderMints();
  return true;
}

/* ======================= Recent Sales (Reservoir) ===================== */
function mapSales(sales) {
  return (sales || []).map(s => {
    const t = s.token || {};
    const tokenId = t.tokenId ?? s.tokenId;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;

    const ts =
      (s.createdAt && Date.parse(s.createdAt)) ||
      (s.timestamp ? Number(s.timestamp) * 1000 : null);

    // buyer/taker fields vary; try common keys
    const buyer = s.toAddress || s.to || s.buyer || s.taker || s.maker || null;

    const amt = s.price?.amount;
    const priceEth =
      (amt?.decimal != null)
        ? `${Number(amt.decimal).toFixed(4)} ETH`
        : (amt?.native != null ? `${Number(amt.native).toFixed(4)} ETH` : "—");

    return id ? {
      id,
      time: ts ? formatAgo(Date.now() - ts) : "—",
      buyer: buyer ? shorten(buyer) : "—",
      price: priceEth
    } : null;
  }).filter(Boolean);
}

async function fetchSales({ limit = 50, continuation = "" } = {}) {
  const qs = new URLSearchParams({
    collection: CFG.COLLECTION_ADDRESS,
    limit: String(limit),
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/sales/v6?${qs.toString()}`;
  const res = await fetch(url, { headers: { accept: "*/*", "x-api-key": CFG.FROG_API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { sales, continuation? }
}

let salesCache = [];
let salesContinuation = "";

function renderSales(list = salesCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = "";
  anchor && (anchor.innerHTML = "");

  const arr = (list && list.length) ? list : [];
  if (!arr.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No recent sales yet.</div></li>`;
    return;
  }

  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill pill-ghost">Rank N/A</span>`;

    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
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
  if (!CFG.FROG_API_KEY || CFG.FROG_API_KEY === "YOUR_RESERVOIR_API_KEY_HERE") {
    console.warn("Missing Reservoir API key for sales.");
    return false;
  }
  const data = await fetchSales({ limit: 50, continuation: append ? salesContinuation : "" });
  const mapped = mapSales(data.sales || []);
  if (append) salesCache = salesCache.concat(mapped); else salesCache = mapped;
  salesContinuation = data.continuation || "";
  if ((window.currentFeatureView || "mints") === "sales") renderSales();
  return true;
}

/* ======================= Rarity (local JSON) ========================== */
// supports either a map { "123":"456", ... } or array of {id,rank} objects
let rarityCache = []; // [{id, rank, score?}, ...]

async function loadRarityJSON() {
  // Try global first:
  if (Array.isArray(window.FF_RARITY_LIST)) {
    return window.FF_RARITY_LIST;
  }
  // Fallback: fetch local JSON
  const url = "assets/freshfrogs_rarity_rankings.json";
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Rarity JSON ${res.status}`);
  return res.json();
}

let raritySortMode = "rank"; // or "score"

export async function loadRarity() {
  try {
    const raw = await loadRarityJSON();
    // Normalize
    if (Array.isArray(raw)) {
      rarityCache = raw.map(x => ({
        id: Number(x.id ?? x.tokenId ?? x[0]),
        rank: Number(x.rank ?? x[1]),
        score: x.score != null ? Number(x.score) : undefined
      })).filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
    } else if (typeof raw === "object" && raw) {
      rarityCache = Object.entries(raw).map(([k, v]) => ({
        id: Number(k), rank: Number(v)
      })).filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));
    } else {
      rarityCache = [];
    }
    if ((window.currentFeatureView || "mints") === "rarity") renderRarity();
  } catch (e) {
    console.warn("Failed to load rarity", e);
    rarityCache = [];
    if ((window.currentFeatureView || "mints") === "rarity") {
      const ul = document.getElementById("featureList");
      ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load rarity data.</div></li>`);
    }
  }
}

function renderRarity() {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = "";
  anchor && (anchor.innerHTML = "");

  if (!rarityCache.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No rarity data.</div></li>`;
    return;
  }

  const sorted = rarityCache.slice().sort((a, b) => {
    if (raritySortMode === "score" && a.score != null && b.score != null) {
      return b.score - a.score; // high to low
    }
    return a.rank - b.rank; // low rank first
  });

  sorted.forEach(x => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
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

/* ======================= Pond (controller holdings) =================== */
function mapPond(tokens) {
  return (tokens || []).map(t => {
    const tok = t.token || {};
    const tokenId = tok.tokenId ?? t.tokenId;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
    return id ? { id } : null;
  }).filter(Boolean);
}

async function fetchPond({ limit = 50, continuation = "" } = {}) {
  if (!CFG.CONTROLLER_ADDRESS) throw new Error("Missing CONTROLLER_ADDRESS");
  const qs = new URLSearchParams({
    collection: CFG.COLLECTION_ADDRESS,
    limit: String(limit),
  });
  if (continuation) qs.set("continuation", continuation);
  const url = `https://api.reservoir.tools/users/${CFG.CONTROLLER_ADDRESS}/tokens/v8?${qs.toString()}`;
  const res = await fetch(url, { headers: { accept: "*/*", "x-api-key": CFG.FROG_API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { tokens, continuation? }
}

let pondCache = [];
let pondContinuation = "";

function renderPond(list = pondCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = "";
  anchor && (anchor.innerHTML = "");

  const arr = (list && list.length) ? list : [];
  if (!arr.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No staked frogs found (Pond empty or controller unset).</div></li>`;
    return;
  }

  arr.forEach(x => {
    const rank = getRankById ? getRankById(x.id) : null;
    const badge = (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill pill-ghost">Rank N/A</span>`;

    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
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
  if (!CFG.FROG_API_KEY || CFG.FROG_API_KEY === "YOUR_RESERVOIR_API_KEY_HERE") {
    console.warn("Missing Reservoir API key for pond.");
    return false;
  }
  try {
    const data = await fetchPond({ limit, continuation: append ? pondContinuation : "" });
    const mapped = mapPond(data.tokens || []);
    if (append) pondCache = pondCache.concat(mapped); else pondCache = mapped;
    pondContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "pond") renderPond();
    return true;
  } catch (e) {
    console.warn("Pond fetch failed", e);
    const ul = document.getElementById("featureList");
    if (ul && !ul.children.length) {
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load Pond. Check CONTROLLER_ADDRESS & API key.</div></li>`;
    }
    return false;
  }
}

/* ----------------------- Public init (optional) ----------------------- */
export async function initUI() {
  // Spotlight
  renderGrid();

  // Tabs + Buttons
  wireFeatureTabs();
  wireFeatureButtons();

  // Prime
  try { await loadMintsLive(); } catch {}
  try { await loadRarity(); } catch {}
}
