/* ========================================================================
   Fresh Frogs — UI module (drop-in)
   - Proper Recent Mints via Reservoir collections activity (types=mint)
   - Tab + button wiring
   - Safe grid rendering (128×128 when .grid-128 is on #grid)
   - Uses window.FF_* globals if available; otherwise falls back
   ======================================================================== */

/* ----------------------- Helpers (safe fallbacks) ---------------------- */
const CFG = (typeof window !== "undefined" && window.FF_CFG) ? window.FF_CFG : {
  SOURCE_PATH: "https://freshfrogs.github.io",
  COLLECTION_ADDRESS: "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b",
  FROG_API_KEY: "YOUR_RESERVOIR_API_KEY_HERE",
  SUPPLY: 4040
};

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

/* Prefer global helpers if your core.js attached them */
const getRankById = (id) =>
  (typeof window !== "undefined" && window.FF_getRankById) ? window.FF_getRankById(id) : null;
const openFrogInfo = (id) =>
  (typeof window !== "undefined" && window.FF_openFrogInfo) ? window.FF_openFrogInfo(id) : null;

/* ----------------------- Spotlight Grid renderer ---------------------- */
export function renderGrid() {
  const wrap = document.getElementById("grid");
  if (!wrap) return;
  wrap.innerHTML = "";
  const N = 9;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    let id;
    // Ensure unique random IDs
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
  const tabs = document.querySelectorAll('#viewTabs .tab');
  tabs.forEach(btn => {
    const sel = btn.dataset.view === view;
    btn.setAttribute("aria-selected", sel ? "true" : "false");
  });

  if (view === "mints") renderMints();
  else if (view === "sales") renderSales();
  else if (view === "rarity") renderRarity();
  else renderPond();

  // Toggle sort controls (only for rarity)
  document.getElementById("sortRankBtn")?.style.setProperty("display", view === "rarity" ? "" : "none");
  document.getElementById("sortScoreBtn")?.style.setProperty("display", view === "rarity" ? "" : "none");
}

export function wireFeatureTabs() {
  const wrap = document.getElementById("viewTabs");
  if (!wrap) return;
  wrap.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      setFeatureView(btn.dataset.view);
    });
  });
  // Default to Mints on first load
  setFeatureView("mints");
}

/* ----------------------- Feature Buttons (Refresh / Live / Sort) ------ */
export function wireFeatureButtons() {
  const refresh = document.getElementById("refreshBtn");
  const live = document.getElementById("fetchLiveBtn");

  refresh?.addEventListener("click", async () => {
    const v = window.currentFeatureView || "mints";
    if (v === "mints") renderMints();
    else if (v === "sales") renderSales();
    else if (v === "rarity") renderRarity();
    else renderPond();
  });

  live?.addEventListener("click", async () => {
    const v = window.currentFeatureView || "mints";
    let ok = false;
    if (v === "mints") ok = await loadMintsLive();
    else if (v === "sales" && typeof window.loadSalesLive === "function") ok = await window.loadSalesLive();
    else if (v === "pond"  && typeof window.loadPond === "function") ok = await window.loadPond(50);

    if (ok) {
      live.textContent = "Live loaded";
      live.disabled = true;
      live.classList.add("btn-ghost");
    }
  });

  // Optional: rarity sort buttons (delegate to your existing handlers if any)
  document.getElementById("sortRankBtn")?.addEventListener("click", () => {
    if (typeof window.sortRarityByRank === "function") window.sortRarityByRank();
    renderRarity();
  });
  document.getElementById("sortScoreBtn")?.addEventListener("click", () => {
    if (typeof window.sortRarityByScore === "function") window.sortRarityByScore();
    renderRarity();
  });
}

/* ----------------------- RECENT MINTS (Reservoir) --------------------- */
// Normalize activity rows into our list item shape
function mapMints(activities) {
  return (activities || []).map(a => {
    // token id
    const t = a.token || a;
    const tokenId = t?.tokenId ?? t?.id;
    const id = tokenId != null ? parseInt(String(tokenId), 10) : null;

    // event time
    const ts =
      (a.eventTimestamp && Date.parse(a.eventTimestamp)) ||
      (a.timestamp ? Number(a.timestamp) * 1000 : null);

    // minter (toAddress / to / maker)
    const minter = a.toAddress || a.to || a.maker || a.buyer || null;

    // price (can be 0 for free mints)
    const amt = a.price?.amount;
    const priceEth =
      amt?.decimal != null
        ? `${Number(amt.decimal).toFixed(4)} ETH`
        : (amt?.native != null
            ? `${Number(amt.native).toFixed(4)} ETH`
            : "—");

    return id
      ? {
          id,
          time: ts ? formatAgo(Date.now() - ts) : "—",
          buyer: minter ? shorten(minter) : "—",
          price: priceEth
        }
      : null;
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
  const res = await fetch(url, {
    headers: {
      accept: "*/*",
      "x-api-key": CFG.FROG_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { activities: [...], continuation?: string }
}

let mintsCache = [];
let mintsContinuation = "";

export function renderMints(list = mintsCache) {
  const ul = document.getElementById("featureList");
  const anchor = document.getElementById("featureMoreAnchor");
  if (!ul) return;
  ul.innerHTML = "";

  const arr = (list && list.length) ? list : [];
  if (!arr.length) {
    ul.innerHTML = `<li class="list-item"><div class="muted">No recent mints yet.</div></li>`;
    anchor && (anchor.innerHTML = "");
    return;
  }

  arr.slice(0).forEach(x => {
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

  // “Load more” handling
  anchor && (anchor.innerHTML = "");
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
  try {
    const data = await fetchMints({
      limit: 50,
      continuation: append ? mintsContinuation : "",
    });
    const mapped = mapMints(data.activities || data.events || []);
    if (append) mintsCache = mintsCache.concat(mapped);
    else mintsCache = mapped;

    mintsContinuation = data.continuation || "";
    if ((window.currentFeatureView || "mints") === "mints") renderMints();
    return true;
  } catch (e) {
    console.warn("Mints fetch failed", e);
    const ul = document.getElementById("featureList");
    if (ul && !ul.children.length) {
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to fetch Recent Mints.</div></li>`;
    }
    return false;
  }
}

/* ----------------------- Sales / Rarity / Pond delegates -------------- */
/* Your existing logic likely lives on window.* from your other modules.
   These thin wrappers let tabs/buttons work without duplicating code. */

function renderSales() {
  if (typeof window.renderSales === "function") return window.renderSales();
  const ul = document.getElementById("featureList");
  ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Sales view not wired.</div></li>`);
}
function renderRarity() {
  if (typeof window.renderRarity === "function") return window.renderRarity();
  const ul = document.getElementById("featureList");
  ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Rarity view not wired.</div></li>`);
}
function renderPond() {
  if (typeof window.renderPond === "function") return window.renderPond();
  const ul = document.getElementById("featureList");
  ul && (ul.innerHTML = `<li class="list-item"><div class="muted">Pond view not wired.</div></li>`);
}

/* ----------------------- Optional public init ------------------------- */
export async function initUI() {
  // Spotlight
  renderGrid();
  document.getElementById("grid")?.classList.add("grid-128"); // lock 128×128

  // Tabs + buttons
  wireFeatureTabs();
  wireFeatureButtons();

  // Prime mints + rarity badges
  await loadMintsLive().catch(() => {});
  if (typeof window.loadRarity === "function") window.loadRarity();
}
