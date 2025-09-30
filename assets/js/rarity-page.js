// assets/js/rarity-page.js — supports:
// - rankings file: [{ id, ranking, score }, ...]  (your shape)
// - lookup file: { "rank": id, ... }              (your shape: rank -> id)

(function(FF = window.FF || {}, CFG = window.CFG || {}) {
  const GRID = document.getElementById('rarityGrid');
  const BTN_MORE = document.getElementById('btnMore');
  const BTN_RANK = document.getElementById('btnSortRank');
  const BTN_SCORE = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO = document.getElementById('btnGo');
  if (!GRID) return;

  const PRIMARY_RANK_FILE = 'assets/freshfrogs_rarity_rankings.json';
  const LOOKUP_FILE       = 'assets/freshfrogs_rank_lookup.json';
  const PAGE = 60;

  let all = [];     // [{id, rank, score}]
  let view = [];
  let offset = 0;
  let sortMode = 'rank';
  let lookupMap = null; // Map(id -> {rank, score})

  function uiError(msg) {
    GRID.innerHTML = `<div class="pg-muted" style="padding:10px">${msg}</div>`;
  }
  function clearGrid(){ GRID.innerHTML = ''; }
  function ensureMoreBtn() {
    if (!BTN_MORE) return;
    BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none';
  }
  function asNum(x){ const n = Number(x); return Number.isFinite(n) ? n : NaN; }
  function getRankLike(o){ return asNum(o.rank ?? o.ranking ?? o.position ?? o.place); }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.json();
  }

  // Parse rank->id map into Map(id -> {rank})
  function parseRankToIdMap(obj) {
    const m = new Map();
    const keys = Object.keys(obj);
    for (const k of keys) {
      const rank = asNum(k);
      const id   = asNum(obj[k]);
      if (Number.isFinite(rank) && Number.isFinite(id)) {
        m.set(id, { rank, score: 0 });
      }
    }
    return m.size ? m : null;
  }

  // Normalize the main rankings array (array of objects)
  function normalizeRankingsArray(arr) {
    return arr.map(x => ({
      id:   asNum(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
      rank: getRankLike(x),
      score: asNum(x.score ?? x.rarityScore ?? x.points ?? 0)
    }))
    .filter(r => Number.isFinite(r.id) && Number.isFinite(r.rank) && r.rank > 0)
    .sort((a,b) => a.rank - b.rank);
  }

  async function loadLookup() {
    try {
      const j = await fetchJson(LOOKUP_FILE);
      if (Array.isArray(j)) {
        // array of ids ordered by rank
        const m = new Map();
        for (let i=0;i<j.length;i++){
          const id = asNum(j[i]);
          if (Number.isFinite(id)) m.set(id, { rank: i+1, score: 0 });
        }
        lookupMap = m.size ? m : null;
      } else if (j && typeof j === 'object') {
        // your shape: rank -> id
        lookupMap = parseRankToIdMap(j);
      } else {
        lookupMap = null;
      }
      // console.log('[rarity] lookup entries:', lookupMap?.size ?? 0);
    } catch {
      lookupMap = null; // optional
    }
  }

  async function loadPrimaryRanks() {
    // Your primary file is an array
    try {
      const j = await fetchJson(PRIMARY_RANK_FILE);
      if (Array.isArray(j)) {
        let arr = normalizeRankingsArray(j);
        // enrich with lookup rank/score if missing (not expected here, but safe)
        if (lookupMap) {
          for (const r of arr) {
            const lk = lookupMap.get(r.id);
            if (lk) {
              if (!Number.isFinite(r.rank) && Number.isFinite(lk.rank)) r.rank = lk.rank;
              if (!Number.isFinite(r.score) && Number.isFinite(lk.score)) r.score = lk.score;
            }
          }
          arr.sort((a,b)=>a.rank-b.rank);
        }
        return arr;
      }
      // If someone ever swaps it to an object map or other structure, fail gracefully:
      return [];
    } catch {
      return [];
    }
  }

  // ---- metadata fetch
  async function fetchMeta(id) {
    const tries = [
      `frog/json/${id}.json`,
      `frog/${id}.json`,
      `assets/frogs/${id}.json`
    ];
    for (const u of tries) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch(_) {}
    }
    return { name: `Frog #${id}`, image: `frog/${id}.png`, attributes: [] };
  }

  // ---- render
  function buildCard(rec) {
    const { id, rank, score, meta } = rec;
    try {
      if (typeof window.FF_renderFrogCard === 'function') {
        return window.FF_renderFrogCard(meta, {
          rarityRank: rank,
          rarityScore: Number.isFinite(score) ? score : undefined,
          showRarity: true
        });
      }
    } catch (_) {}

    // Fallback: minimal clone matching dashboard look
    const card = document.createElement('div');
    card.className = 'frog-card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = meta?.name || `Frog #${id}`;
    img.loading = 'lazy';
    img.src = meta?.image || `frog/${id}.png`;

    const wrap = document.createElement('div');
    wrap.className = 'img-wrap';
    wrap.style.width = '128px';
    wrap.style.height = '128px';
    wrap.style.gridRow = 'span 3';
    wrap.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'rank-badge';
    badge.textContent = `#${rank}${Number.isFinite(score) ? ` • ${score.toFixed(2)}` : ''}`;
    wrap.appendChild(badge);

    const title = document.createElement('h4');
    title.className = 'title';
    title.textContent = meta?.name || `Frog #${id}`;

    const metaLine = document.createElement('div');
    metaLine.className = 'meta';
    metaLine.textContent = `Rarity Rank #${rank}${Number.isFinite(score) ? ` • Score ${score.toFixed(2)}` : ''}`;

    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnOS = document.createElement('a');
    btnOS.href = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
    btnOS.target = '_blank'; btnOS.rel = 'noopener';
    btnOS.className = 'btn btn-outline-gray'; btnOS.textContent = 'OpenSea';
    const btnScan = document.createElement('a');
    btnScan.href = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
    btnScan.target = '_blank'; btnScan.rel = 'noopener';
    btnScan.className = 'btn btn-outline-gray'; btnScan.textContent = 'Etherscan';
    actions.appendChild(btnOS); actions.appendChild(btnScan);

    card.appendChild(wrap);
    card.appendChild(title);
    card.appendChild(metaLine);
    card.appendChild(actions);
    return card;
  }

  async function loadMore() {
    const slice = view.slice(offset, offset + PAGE);
    if (slice.length === 0) { ensureMoreBtn(); return; }
    const metas = await Promise.all(slice.map(x => fetchMeta(x.id)));
    slice.forEach((x, i) => x.meta = metas[i]);
    const frag = document.createDocumentFragment();
    slice.forEach(rec => frag.appendChild(buildCard(rec)));
    GRID.appendChild(frag);
    offset += slice.length;
    ensureMoreBtn();
  }

  function resort() {
    view.sort((a,b) => sortMode === 'rank'
      ? (a.rank - b.rank)
      : ((b.score - a.score) || (a.rank - b.rank))
    );
    offset = 0; clearGrid(); loadMore();
  }

  function jumpToId(id) {
    const ix = view.findIndex(x => x.id === id);
    if (ix < 0) return;
    offset = Math.floor(ix / PAGE) * PAGE;
    clearGrid(); loadMore();
  }

  // ---- init
  (async function init() {
    try {
      await loadLookup();                     // build id->rank from your rank->id map
      const primary = await loadPrimaryRanks(); // uses {id, ranking, score}
      if (primary.length) {
        all = primary;
      } else if (lookupMap && lookupMap.size) {
        // If primary missing/invalid, fall back to lookup only
        all = Array.from(lookupMap, ([id, v]) => ({ id, rank: v.rank, score: v.score||0 }))
              .sort((a,b)=>a.rank-b.rank);
      } else {
        uiError(`Could not load rarity data. Check both JSON files' shapes.`);
        return;
      }

      view = all.slice();
      offset = 0;
      clearGrid();
      await loadMore();
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';

      // Wire UI
      BTN_MORE?.addEventListener('click', loadMore);
      BTN_RANK?.addEventListener('click', () => { sortMode = 'rank'; resort(); });
      BTN_SCORE?.addEventListener('click', () => { sortMode = 'score'; resort(); });
      BTN_GO?.addEventListener('click', () => {
        const id = Number(FIND_INPUT.value);
        if (Number.isFinite(id)) jumpToId(id);
      });
    } catch (e) {
      console.error('[rarity] init error', e);
      uiError('Failed to initialize rarity view. See console for details.');
    }
  })();
})(window.FF, window.CFG);
