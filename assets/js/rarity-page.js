// assets/js/rarity-page.js
// Uses your files:
//   - assets/freshfrogs_rarity_rankings.json
//   - assets/freshfrogs_rank_lookup.json
//
// Renders cards with the same look as the dashboard via frog-cards.js if available.

(function(FF = window.FF || {}, CFG = window.CFG || {}) {
  const GRID = document.getElementById('rarityGrid');
  const BTN_MORE = document.getElementById('btnMore');
  const BTN_RANK = document.getElementById('btnSortRank');
  const BTN_SCORE = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO = document.getElementById('btnGo');

  if (!GRID) return;

  // -------- config (your two files first)
  const PRIMARY_RANK_FILE = 'assets/freshfrogs_rarity_rankings.json';
  const LOOKUP_FILE       = 'assets/freshfrogs_rank_lookup.json';

  // extra fallbacks if needed
  const FALLBACKS = [
    'assets/freshfrogs_rarity_rankings/ranks.json',
    'assets/freshfrogs_rarity_rankings/rarity.json',
    'assets/freshfrogs_rarity_rankings/frogs_ranks.json',
    'assets/freshfrogs_rarity_rankings/ranks.csv'
  ];

  const PAGE = 60;

  // -------- state
  let all = [];     // [{id, rank, score}]
  let view = [];    // sorted list
  let idxById = new Map();
  let offset = 0;
  let sortMode = 'rank'; // 'rank' | 'score'
  let lookupMap = null;  // Map(id -> {rank, score})

  // -------- load helpers
  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  async function loadLookup() {
    try {
      const j = await fetchJson(LOOKUP_FILE);
      // Accept either { "123": {...}, "124": {...} } or {items:[...]} or array
      const items = Array.isArray(j) ? j
                  : Array.isArray(j?.items) ? j.items
                  : (j && typeof j === 'object') ? Object.keys(j).map(k => ({ id: Number(k), ...(j[k]||{}) }))
                  : [];
      lookupMap = new Map(
        items
          .map(x => ({
            id: Number(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
            rank: Number(x.rank ?? x.position ?? x.place),
            score: Number(x.score ?? x.rarityScore ?? x.points ?? 0)
          }))
          .filter(x => Number.isFinite(x.id))
          .map(x => [x.id, { rank: x.rank, score: x.score }])
      );
    } catch(_) {
      lookupMap = null;
    }
  }

  async function loadPrimaryRanks() {
    // Try your primary JSON first
    try {
      const j = await fetchJson(PRIMARY_RANK_FILE);
      return normalizeJson(j);
    } catch(_) {
      // fallbacks
      for (const url of FALLBACKS) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (url.endsWith('.csv') || ct.includes('text/csv')) {
            const text = await res.text();
            return parseCsv(text);
          } else {
            const json = await res.json();
            return normalizeJson(json);
          }
        } catch(_) {}
      }
      throw new Error('No rarity file found.');
    }
  }

  function normalizeJson(j) {
    // Accept: array, {items:[...]}, or object map
    let arr = [];
    if (Array.isArray(j)) arr = j;
    else if (j && Array.isArray(j.items)) arr = j.items;
    else if (j && typeof j === 'object') arr = Object.values(j);

    const out = arr.map(x => ({
      id: Number(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
      rank: Number(x.rank ?? x.position ?? x.place),
      score: Number(x.score ?? x.rarityScore ?? x.points ?? 0)
    })).filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank));

    // If a separate lookup exists, enrich/override missing scores/ranks
    if (lookupMap) {
      for (const r of out) {
        const lk = lookupMap.get(r.id);
        if (lk) {
          if (!Number.isFinite(r.rank) && Number.isFinite(lk.rank)) r.rank = lk.rank;
          if (!Number.isFinite(r.score) && Number.isFinite(lk.score)) r.score = lk.score;
        }
      }
    }
    return out.sort((a,b) => a.rank - b.rank);
  }

  function parseCsv(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const hdr = lines.shift().split(',').map(s => s.trim().toLowerCase());
    const ix = { id: hdr.indexOf('id'), rank: hdr.indexOf('rank'), score: hdr.indexOf('score') };
    const out = [];
    for (const line of lines) {
      const cells = line.split(',').map(s => s.trim());
      const id = Number(cells[ix.id]);
      const rank = Number(cells[ix.rank]);
      const score = Number(cells[ix.score] || 0);
      if (Number.isFinite(id) && Number.isFinite(rank)) out.push({ id, rank, score });
    }
    // Enrich with lookup if available
    if (lookupMap) {
      for (const r of out) {
        const lk = lookupMap.get(r.id);
        if (lk) {
          if (!Number.isFinite(r.rank) && Number.isFinite(lk.rank)) r.rank = lk.rank;
          if (!Number.isFinite(r.score) && Number.isFinite(lk.score)) r.score = lk.score;
        }
      }
    }
    return out.sort((a,b) => a.rank - b.rank);
  }

  // -------- metadata
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
    // fallback
    return { name: `Frog #${id}`, image: `frog/${id}.png`, attributes: [] };
  }

  // -------- render
  function clearGrid(){ GRID.innerHTML = ''; }
  function ensureMoreBtn() {
    const hasMore = offset < view.length;
    if (BTN_MORE) BTN_MORE.style.display = hasMore ? 'inline-flex' : 'none';
  }

  async function loadMore() {
    const slice = view.slice(offset, offset + PAGE);
    if (slice.length === 0){ ensureMoreBtn(); return; }

    // Resolve metas in parallel
    const metas = await Promise.all(slice.map(x => fetchMeta(x.id)));
    for (let i=0;i<slice.length;i++) slice[i].meta = metas[i];

    // Append cards
    const frag = document.createDocumentFragment();
    slice.forEach(rec => frag.appendChild(buildCard(rec)));
    GRID.appendChild(frag);

    offset += slice.length;
    ensureMoreBtn();
  }

  function buildCard(rec) {
    const { id, rank, score, meta } = rec;

    // Prefer your shared card renderer from frog-cards.js if available.
    // Common export in your repo is window.FF_renderFrogCard(meta, opts)
    try {
      if (typeof window.FF_renderFrogCard === 'function') {
        return window.FF_renderFrogCard(meta, {
          rarityRank: rank,
          rarityScore: Number.isFinite(score) ? score : undefined,
          showRarity: true
        });
      }
    } catch(_) {}

    // Fallback: minimal clone of dashboard card
    const card = document.createElement('div');
    card.className = 'frog-card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = meta?.name || `Frog #${id}`;
    img.loading = 'lazy';
    img.src = meta?.image || `frog/${id}.png`;

    // rank badge
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
    btnOS.target = '_blank';
    btnOS.rel = 'noopener';
    btnOS.className = 'btn btn-outline-gray';
    btnOS.textContent = 'OpenSea';
    const btnScan = document.createElement('a');
    btnScan.href = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
    btnScan.target = '_blank';
    btnScan.rel = 'noopener';
    btnScan.className = 'btn btn-outline-gray';
    btnScan.textContent = 'Etherscan';
    actions.appendChild(btnOS);
    actions.appendChild(btnScan);

    card.appendChild(wrap);
    card.appendChild(title);
    card.appendChild(metaLine);
    card.appendChild(actions);
    return card;
  }

  // -------- sorting / navigation
  function resort() {
    if (sortMode === 'rank') {
      view = all.slice().sort((a,b) => a.rank - b.rank);
    } else {
      view = all.slice().sort((a,b) => (b.score - a.score) || (a.rank - b.rank));
    }
    offset = 0;
    clearGrid();
    loadMore();
  }

  function jumpToId(id) {
    // Use lookup for direct jumps if present
    if (lookupMap?.has(id)) {
      const rec = lookupMap.get(id);
      // find index by rank match if all list present
      const ix = all.findIndex(x => x.id === id) >= 0
        ? all.findIndex(x => x.id === id)
        : all.findIndex(x => x.rank === rec.rank);
      if (ix >= 0) {
        sortMode = 'rank';
        view = all.slice().sort((a,b) => a.rank - b.rank);
        offset = Math.floor(ix / PAGE) * PAGE;
        clearGrid();
        loadMore();
        return;
      }
    }
    // fallback: linear search in current view
    const ix2 = view.findIndex(x => x.id === id);
    if (ix2 >= 0) {
      offset = Math.floor(ix2 / PAGE) * PAGE;
      clearGrid();
      loadMore();
    }
  }

  // -------- init
  (async function init() {
    try {
      await loadLookup();          // optional
      all = await loadPrimaryRanks();
      idxById = new Map(all.map(r => [r.id, r]));
      view = all.slice();          // already rank-sorted
      offset = 0;
      clearGrid();
      await loadMore();
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';
    } catch (err) {
      console.error(err);
      GRID.innerHTML = `<div class="pg-muted">
        Could not load rarity data. Ensure
        <code>assets/freshfrogs_rarity_rankings.json</code>
        (and optional <code>assets/freshfrogs_rank_lookup.json</code>)
        exist and are valid JSON.
      </div>`;
    }
  })();

  // -------- UI events
  BTN_MORE?.addEventListener('click', loadMore);
  BTN_RANK?.addEventListener('click', () => { sortMode = 'rank'; resort(); });
  BTN_SCORE?.addEventListener('click', () => { sortMode = 'score'; resort(); });
  BTN_GO?.addEventListener('click', () => {
    const id = Number(FIND_INPUT.value);
    if (Number.isFinite(id)) jumpToId(id);
  });
})(window.FF, window.CFG);
