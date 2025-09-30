// assets/js/rarity-page.js — robust version
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
  const FALLBACKS = [
    'assets/freshfrogs_rarity_rankings/ranks.json',
    'assets/freshfrogs_rarity_rankings/rarity.json',
    'assets/freshfrogs_rarity_rankings/frogs_ranks.json',
    'assets/freshfrogs_rarity_rankings/ranks.csv'
  ];
  const PAGE = 60;

  let all = [];
  let view = [];
  let offset = 0;
  let sortMode = 'rank';
  let lookupMap = null;

  function uiError(msg) {
    GRID.innerHTML = `<div class="pg-muted" style="padding:10px">${msg}</div>`;
  }
  function clearGrid(){ GRID.innerHTML = ''; }
  function ensureMoreBtn() {
    if (!BTN_MORE) return;
    BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none';
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.json();
  }

  async function tryLoadJson(url) {
    try {
      const j = await fetchJson(url);
      console.log('[rarity] loaded', url, j);
      return j;
    } catch (e) {
      console.warn('[rarity] failed', url, e);
      return null;
    }
  }

  function asNumber(x) { return Number.isFinite(Number(x)) ? Number(x) : NaN; }

  function normalizeFromAnyShape(data, label='primary') {
    // Returns [{id, rank, score}]
    let out = [];

    if (!data) return out;

    // 1) Array case
    if (Array.isArray(data)) {
      if (data.length && typeof data[0] === 'number') {
        // array of ids ordered by rank
        out = data.map((id, i) => ({ id: asNumber(id), rank: i+1, score: 0 }));
        console.log(`[rarity] parsed ${label}: array of ids -> ${out.length} entries`);
      } else if (data.length && typeof data[0] === 'object') {
        // array of objects
        out = data.map(x => ({
          id: asNumber(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
          rank: asNumber(x.rank ?? x.position ?? x.place),
          score: asNumber(x.score ?? x.rarityScore ?? x.points ?? x.total ?? 0)
        }));
        console.log(`[rarity] parsed ${label}: array of objects -> ${out.length} entries`);
      }
    }
    // 2) {items:[...]}
    else if (Array.isArray(data?.items)) {
      out = normalizeFromAnyShape(data.items, `${label}.items`);
    }
    // 3) Object map
    else if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length) {
        const sample = data[keys[0]];
        if (typeof sample === 'number') {
          // map id -> rank number
          out = keys.map(k => ({ id: asNumber(k), rank: asNumber(data[k]), score: 0 }));
          console.log(`[rarity] parsed ${label}: map id->rank -> ${out.length} entries`);
        } else if (typeof sample === 'object') {
          out = keys.map(k => {
            const v = data[k] || {};
            return {
              id: asNumber(k),
              rank: asNumber(v.rank ?? v.position ?? v.place),
              score: asNumber(v.score ?? v.rarityScore ?? v.points ?? 0)
            };
          });
          console.log(`[rarity] parsed ${label}: map id->{rank,score} -> ${out.length} entries`);
        }
      }
    }

    // Final filter/sort
    out = out.filter(r => Number.isFinite(r.id) && Number.isFinite(r.rank) && r.rank > 0)
             .sort((a,b) => a.rank - b.rank);
    return out;
  }

  async function loadLookup() {
    const j = await tryLoadJson(LOOKUP_FILE);
    if (!j) { lookupMap = null; return; }

    const arr = normalizeFromAnyShape(j, 'lookup');
    lookupMap = new Map(arr.map(r => [r.id, { rank: r.rank, score: Number.isFinite(r.score) ? r.score : 0 }]));
    console.log('[rarity] lookup entries:', lookupMap.size);
  }

  async function loadPrimaryRanks() {
    // Prefer your explicit file; then fallbacks (incl. CSV)
    const j = await tryLoadJson(PRIMARY_RANK_FILE);
    if (j) {
      const arr = normalizeFromAnyShape(j, 'primary');
      if (arr.length) return enrichWithLookup(arr);
    }
    // Try fallbacks
    for (const url of FALLBACKS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (url.endsWith('.csv') || ct.includes('text/csv')) {
          const text = await res.text();
          const arr = parseCsv(text);
          if (arr.length) return enrichWithLookup(arr);
        } else {
          const json = await res.json();
          const arr = normalizeFromAnyShape(json, url.split('/').pop());
          if (arr.length) return enrichWithLookup(arr);
        }
      } catch (e) {
        console.warn('[rarity] fallback load failed', url, e);
      }
    }
    return [];
  }

  function enrichWithLookup(arr) {
    if (!lookupMap) return arr;
    for (const r of arr) {
      const lk = lookupMap.get(r.id);
      if (lk) {
        if (!Number.isFinite(r.rank) && Number.isFinite(lk.rank)) r.rank = lk.rank;
        if (!Number.isFinite(r.score) && Number.isFinite(lk.score)) r.score = lk.score;
      }
    }
    return arr.sort((a,b) => a.rank - b.rank);
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
    // Minimal fallback (matches your dashboard style)
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

  // init
  (async function init() {
    try {
      await loadLookup();
      const ranks = await loadPrimaryRanks();
      if (!ranks.length) {
        uiError(`Could not load rarity data. Check that <code>${PRIMARY_RANK_FILE}</code> exists and has a supported shape.
          Open the browser console for details.`);
        console.error('[rarity] No parsed entries from ranks.');
        return;
      }
      all = ranks.slice();
      view = all.slice();
      offset = 0;
      clearGrid();
      await loadMore();
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';
    } catch (e) {
      console.error('[rarity] init error', e);
      uiError('Failed to initialize rarity view. See console for details.');
    }
  })();

  // UI events
  BTN_MORE?.addEventListener('click', loadMore);
  BTN_RANK?.addEventListener('click', () => { sortMode = 'rank'; resort(); });
  BTN_SCORE?.addEventListener('click', () => { sortMode = 'score'; resort(); });
  BTN_GO?.addEventListener('click', () => {
    const id = Number(FIND_INPUT.value);
    if (Number.isFinite(id)) jumpToId(id);
  });
})(window.FF, window.CFG);
