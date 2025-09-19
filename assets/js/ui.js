import {
  FF_CFG, shorten, thumb64, fetchJSON, isLocal, mapSales, fetchSales
} from "./core.js";

/* ---------------- GRID ---------------- */
export function renderGrid() {
  const g = document.getElementById("grid");
  const L = document.getElementById("lightbox");
  const S = document.getElementById("lightboxStage");
  const ids = (n) => {
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(Math.random() * FF_CFG.SUPPLY));
    return [...s];
  };
  g.innerHTML = "";
  ids(9).forEach((id) => {
    const t = document.createElement("div");
    t.className = "tile";
    t.innerHTML = `<img src="${FF_CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog #${id}" loading="lazy" decoding="async">`;
    t.addEventListener("click", () => {
      S.innerHTML = "";
      const b = document.createElement("img");
      b.src = `${FF_CFG.SOURCE_PATH}/frog/${id}.png`;
      b.alt = `Frog #${id}`;
      Object.assign(b.style, { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" });
      S.appendChild(b);
      L.style.display = "grid";
    });
    g.appendChild(t);
  });
  L.addEventListener("click", () => { L.style.display = "none"; }, { once: true });
}

/* ---------------- SALES ---------------- */
let salesCache = [];
export function renderSales(list = salesCache) {
  const ul = document.getElementById("recentSales") || document.getElementById("featureList");
  if (!ul) return;
  ul.innerHTML = "";
  const arr = (list && list.length) ? list : [{ id: 3250, time: "3m", price: "0.080 ETH", buyer: "0x9a…D1" }];
  arr.forEach((x) => {
    const rank = window.FF_getRankById ? window.FF_getRankById(x.id) : null;
    const badge = (rank || rank === 0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${x.id}.png`, `Frog ${x.id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;"><b>Frog #${x.id}</b> ${badge}</div>
        <div class="muted">${x.time !== "—" ? x.time + " ago" : "—"} • Buyer ${x.buyer}</div>
      </div>
      <div class="price">${x.price}</div>`;
    ul.appendChild(li);
  });
}
export async function loadSalesLive() {
  try {
    if (!FF_CFG.FROG_API_KEY || FF_CFG.FROG_API_KEY === "YOUR_RESERVOIR_API_KEY_HERE") throw new Error("Missing Reservoir API key");
    const f = await fetchSales({ limit: 50 });
    const m = mapSales(f.sales || []);
    if (m.length) { salesCache = m; renderSales(); return true; }
    return false;
  } catch (e) { console.warn("Sales fetch failed", e); return false; }
}

/* ---------------- RARITY ---------------- */
let RARITY_LIST = null;
let RANK_LOOK = null;
let sortBy = "rank";
function setRarityList(arr) {
  RARITY_LIST = arr;
  RANK_LOOK = Object.fromEntries(arr.map(x => [String(x.id), Number(x.ranking ?? x.rank ?? NaN)]).filter(([, v]) => !Number.isNaN(v)));
  window.FF_getRankById = (id) => RANK_LOOK ? (RANK_LOOK[String(id)] ?? null) : null;
}
function sortedRarity() {
  if (!RARITY_LIST?.length) return [];
  const a = [...RARITY_LIST];
  if (sortBy === "score") a.sort((x, y) => Number(y.rarity ?? y.score ?? 0) - Number(x.rarity ?? x.score ?? 0));
  else a.sort((x, y) => Number(x.ranking ?? x.rank ?? 1e9) - Number(y.ranking ?? y.rank ?? 1e9));
  return a;
}
export function renderRarity() {
  const ul = document.getElementById("rarityList") || document.getElementById("featureList");
  if (!ul) return;
  ul.innerHTML = "";
  const data = sortedRarity();
  if (!data.length) { ul.innerHTML = '<li class="list-item"><div class="muted">No data yet</div></li>'; return; }
  data.forEach((it) => {
    const id = it.id, rank = it.ranking ?? it.rank ?? "?", score = (it.rarity ?? it.score ?? "").toString();
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(`${FF_CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
      `<div>
        <div><b>Frog #${id}</b></div>
        <div class="muted">${score ? `Rarity Score: ${score}` : `Rarity Score: N/A`}</div>
      </div>
      <span class="pill">#${rank}</span>`;
    ul.appendChild(li);
  });
}
export async function loadRarity() {
  let ok = false;
  if (!isLocal()) {
    try {
      const arr = await fetchJSON(FF_CFG.JSON_PATH);
      if (Array.isArray(arr)) { setRarityList(arr); ok = true; }
    } catch {}
  }
  if (!ok) {
    const host = document.getElementById("localLoad");
    host.style.display = "block";
    const f = document.getElementById("rarityFile");
    const b = document.getElementById("useLocalBtn");
    b?.addEventListener("click", () => {
      const file = f?.files?.[0];
      if (!file) { alert("Choose assets/freshfrogs_rarity_rankings.json"); return; }
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const arr = JSON.parse(rd.result);
          if (!Array.isArray(arr)) throw 0;
          setRarityList(arr); renderRarity(); host.style.display = "none";
        } catch { alert("Invalid rarity JSON"); }
      };
      rd.readAsText(file);
    });
  }
  renderRarity();
}
export function setRaritySort(mode) { sortBy = mode; renderRarity(); }

/* ---------------- WALLET UI ---------------- */
let currentUser = null;
function setWalletUI(a) {
  const l = document.getElementById("walletLabel");
  const b = document.getElementById("connectBtn");
  if (a) { l.textContent = "Connected: " + shorten(a); l.style.display = ""; b.textContent = "Disconnect"; }
  else { l.style.display = "none"; b.textContent = "Connect Wallet"; }
}
export function getUser() { return currentUser; }
export function initWallet({ onConnect, onDisconnect, onChanged } = {}) {
  async function connect() {
    if (location.protocol === "file:") { alert("Open the site over http(s) to enable wallet."); return; }
    const p = window.ethereum; if (!p) { alert("No Ethereum provider found. Install/enable MetaMask."); return; }
    try {
      const acc = await p.request({ method: "eth_requestAccounts" });
      currentUser = acc?.[0] || null; setWalletUI(currentUser);
      if (currentUser && onConnect) onConnect(currentUser);
    } catch (e) { console.warn(e); }
  }
  function disconnect() { currentUser = null; setWalletUI(null); if (onDisconnect) onDisconnect(); }
  document.getElementById("connectBtn")?.addEventListener("click", () => (currentUser ? disconnect() : connect()));
  if (window.ethereum) {
    window.ethereum.on?.("accountsChanged", (a) => { currentUser = a?.[0] || null; setWalletUI(currentUser); if (onChanged) onChanged(currentUser); });
  }
}

/* ---------------- OWNED (Reservoir) ---------------- */
let heldTokens = [];
let heldContinuation = "";

// local tab getter (staking injects the real one)
let _getTab = () => "owned";
export function setTabGetter(fn) { _getTab = fn; }
function getTab() { return _getTab(); }

export function clearOwned() { heldTokens = []; heldContinuation = ""; if (getTab() === "owned") renderOwned(); }

export function renderOwned() {
  const list = document.getElementById("chipWrap");
  if (!list) return;
  if (getTab() !== "owned") return;
  list.innerHTML = "";
  const user = getUser();
  if (!user) { list.innerHTML = '<li class="list-item"><div class="muted">Connect your wallet to view owned tokens.</div></li>'; return; }
  if (!heldTokens.length) { list.innerHTML = '<li class="list-item"><div class="muted">No tokens loaded yet. Click “Refresh Owned”.</div></li>'; return; }
  heldTokens.forEach(({ id, image }) => {
    const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML =
      thumb64(image || `${FF_CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;">
          <b>Frog #${id}</b>
          ${ (rank || rank === 0) ? `<span class="pill">Rank <b>#${rank}</b></span>` : `<span class="pill"><span class="muted">Rank N/A</span></span>` }
        </div>
        <div class="muted">Owned by <span class="addr">${shorten(getUser())}</span></div>
      </div>
      <div class="row" style="gap:6px;">
        <button class="btn btn-outline btn-sm" disabled title="Stake flow wired later">🔒 Stake</button>
      </div>`;
    list.appendChild(li);
  });
}

export async function fetchOwned(wallet, limit = 50, nextStr) {
  try {
    wallet = wallet || getUser();
    if (!wallet) { document.getElementById("stakeStatus").textContent = "Connect a wallet to load owned tokens."; return; }
    const cont = nextStr || heldContinuation || "";
    const qs = cont ? "&continuation=" + encodeURIComponent(cont) : "";
    const url = `https://api.reservoir.tools/users/${wallet}/tokens/v8?collection=${FF_CFG.COLLECTION_ADDRESS}&limit=${limit}${qs}`;
    const res = await fetch(url, { method: "GET", headers: { accept: "*/*", "x-api-key": FF_CFG.FROG_API_KEY } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const items = (data.tokens || []).map((t) => {
      const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
      const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
      const img = t?.token?.image ?? `${FF_CFG.SOURCE_PATH}/frog/${tokenId}.png`;
      return id ? { id, image: img } : null;
    }).filter(Boolean);

    heldTokens = heldTokens.concat(items);
    heldContinuation = data.continuation || "";
    if (getTab() === "owned") renderOwned();

    const ss = document.getElementById("stakeStatus");
    ss.textContent = `Owned: ${heldTokens.length}` + (heldContinuation ? " • more available" : "");

    let btn = document.getElementById("heldMoreBtn");
    const anchor = document.getElementById("stakeControls");
    if (!heldContinuation) { if (btn) btn.remove(); }
    else {
      if (!btn) {
        btn = document.createElement("button");
        btn.id = "heldMoreBtn"; btn.className = "btn btn-outline btn-sm"; btn.textContent = "Load more Owned";
        anchor?.appendChild(btn);
      }
      btn.onclick = () => fetchOwned(wallet, limit, heldContinuation);
    }
  } catch (e) {
    console.warn(e);
    document.getElementById("stakeStatus").textContent = "Failed to fetch owned tokens.";
  }
}

/* ---------------- Small feature buttons ---------------- */
export function wireFeatureButtons() {
  document.getElementById("refreshBtn")?.addEventListener("click", () => renderSales());
  document.getElementById("fetchLiveBtn")?.addEventListener("click", () => loadSalesLive());
  document.getElementById("sortRankBtn")?.addEventListener("click", () => setRaritySort("rank"));
  document.getElementById("sortScoreBtn")?.addEventListener("click", () => setRaritySort("score"));
  document.getElementById("selectAll")?.addEventListener("click", () => { document.getElementById("stakeStatus").textContent = "Selected all visible tokens (demo)."; });
  document.getElementById("clearSel")?.addEventListener("click", () => { document.getElementById("stakeStatus").textContent = "Cleared selection (demo)."; });
  document.getElementById("refreshOwned")?.addEventListener("click", () => {
    const u = getUser();
    if (!u) { document.getElementById("stakeStatus").textContent = "Connect a wallet first."; return; }
    clearOwned(); fetchOwned(u);
  });
}

/* -------------------------------------------------------
 * Unified Features Panel: view switcher (Sales / Rarity)
 * ----------------------------------------------------- */
let currentFeatureView = "sales";

function applyFeatureControls() {
  const onSales = currentFeatureView === "sales";
  // Sales buttons
  const refreshBtn   = document.getElementById("refreshBtn");
  const fetchLiveBtn = document.getElementById("fetchLiveBtn");
  // Rarity buttons
  const sortRankBtn  = document.getElementById("sortRankBtn");
  const sortScoreBtn = document.getElementById("sortScoreBtn");

  if (refreshBtn)   refreshBtn.style.display   = onSales ? "" : "none";
  if (fetchLiveBtn) fetchLiveBtn.style.display = onSales ? "" : "none";
  if (sortRankBtn)  sortRankBtn.style.display  = onSales ? "none" : "";
  if (sortScoreBtn) sortScoreBtn.style.display = onSales ? "none" : "";
}

export function setFeatureView(view) {
  currentFeatureView = view;

  // Tabs UI
  const tabs     = document.querySelectorAll('#viewTabs .tab');
  const wrap     = document.getElementById('viewTabs');
  const indexMap = { sales: 0, rarity: 1 };
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.view === view ? 'true' : 'false'));
  wrap?.style?.setProperty('--tab-i', indexMap[view] ?? 0);

  // Render
  if (view === "sales") renderSales();
  else renderRarity();

  applyFeatureControls();
}

export function wireFeatureTabs() {
  document.querySelectorAll('#viewTabs .tab')?.forEach(btn => {
    btn.addEventListener('click', () => setFeatureView(btn.dataset.view));
  });
  // initial state
  setFeatureView("sales");
}
