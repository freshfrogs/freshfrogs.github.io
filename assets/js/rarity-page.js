// assets/js/rarity-page.js
// Loads rarity rankings and renders frogs using the SAME dashboard card renderer.
// Looks for common ranking files inside /assets/freshfrogs_rarity_rankings/.

(function(FF = window.FF || {}, CFG = window.CFG || {}) {
  const GRID = document.getElementById('rarityGrid');
  const BTN_MORE = document.getElementById('btnMore');
  const BTN_RANK = document.getElementById('btnSortRank');
  const BTN_SCORE = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO = document.getElementById('btnGo');

  if (!GRID) return;

  // -------- config
  const RANK_FILES = [
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

  // -------- load rankings
  async function loadFirst() {
    for (const url of RANK_FILES) {
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
      } catch(_) { /* try next */ }
    }
    throw new Error('No rarity file found in /assets/freshfrogs_rarity_rankings/');
  }

  function normalizeJson(j) {
    // Accept: array, {items:[...]}, or object map
    let arr = [];
    if (Array.isArray(j)) arr = j;
    else if (j && Array.isArray(j.items)) arr = j.items;
    else if (j && typeof j === 'object') arr = Object.values(j);

    return arr.map(x => ({
      id: Number(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
      rank: Number(x.rank ?? x.position ?? x.place),
      score: Number(x.score ?? x.rarityScore ?? x.points ?? 0)
    }))
    .filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank))
    .sort((a,b) => a.rank - b.rank);
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
    BTN_MORE.style.display = hasMore ? 'inline-flex' : 'none';
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

    // Prefer your shared card renderer if available (frog-cards.js)
    // It commonly exposes window.FF_renderFrogCard(meta, opts)
    try {
      if (typeof window.FF_renderFrogCard === 'function') {
        return window.FF_renderFrogCard(meta, {
          // extra badges/info
          rarityRank: rank,
          rarityScore: Number.isFinite(score) ? score : undefined,
          showRarity: true
        });
      }
    } catch(_) {}

    // Fallback: minimal clone of your dashboard card
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
  function applySort() {
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
    const rec = idxById.get(id);
    if (!rec) return;
    sortMode = 'rank';
    view = all; // already sorted by rank initially
    // paginate to the page that contains this id
    const ix = view.findIndex(x => x.id === id);
    if (ix >= 0) {
      offset = Math.floor(ix / PAGE) * PAGE;
      clearGrid();
      loadMore();
    }
  }

  // -------- init
  (async function init() {
    try {
      all = await loadFirst();
      idxById = new Map(all.map(r => [r.id, r]));
      // default rank sort
      view = all.slice();
      offset = 0;
      clearGrid();
      await loadMore();
      BTN_MORE.style.display = 'inline-flex';
    } catch (err) {
      console.error(err);
      GRID.innerHTML = `<div class="pg-muted">Could not load rarity rankings. Put a file in <code>assets/freshfrogs_rarity_rankings/</code> named <code>ranks.json</code> (or <code>rarity.json</code>/<code>ranks.csv</code>).</div>`;
    }
  })();

  // -------- UI
  BTN_MORE?.addEventListener('click', loadMore);
  BTN_RANK?.addEventListener('click', () => { sortMode = 'rank'; applySort(); });
  BTN_SCORE?.addEventListener('click', () => { sortMode = 'score'; applySort(); });
  BTN_GO?.addEventListener('click', () => {
    const id = Number(FIND_INPUT.value);
    if (Number.isFinite(id)) jumpToId(id);
  });
})(window.FF, window.CFG);
