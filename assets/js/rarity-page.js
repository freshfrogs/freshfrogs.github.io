// assets/js/rarity-page.js
// Renders a rarity-ranked grid using the SAME frog "info card" look as dashboard.
// - Tries to reuse an existing render function if available (e.g., FF.renderFrogCard / OWNED.renderCard)
// - Otherwise uses a pixel-perfect fallback that matches dashboard styles.

(function (FF = window.FF || {}, CFG = window.CFG || {}) {
  const grid = document.getElementById('rarityGrid');
  if (!grid) return;

  // ---------- config ----------
  const RANK_SOURCES = [
    'assets/freshfrogs_rarity_rankings/ranks.json',
    'assets/freshfrogs_rarity_rankings/rarity.json',
    'assets/freshfrogs_rarity_rankings/frogs_ranks.json',
    'assets/freshfrogs_rarity_rankings/ranks.csv'
  ];
  const PAGE_SIZE = 60;

  // state
  let ranks = [];  // [{id, rank, score}]
  let view = [];   // subset for pagination
  let offset = 0;
  let sortMode = 'rank'; // 'rank' | 'score'
  let idIndex = new Map();

  // ---------- loading ----------
  async function loadFirstAvailable(urls) {
    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json') || u.endsWith('.json')) {
          const j = await res.json();
          return normalizeRanksFromJson(j);
        }
        const txt = await res.text();
        if (u.endsWith('.csv') || ct.includes('text/csv') || txt.includes(',')) {
          return normalizeRanksFromCsv(txt);
        }
      } catch (e) { /* try next */ }
    }
    throw new Error('No rarity file found in assets/freshfrogs_rarity_rankings/');
  }

  function normalizeRanksFromJson(j) {
    // Support several shapes
    // 1) { "1": {"id":123,"rank":1,"score":999}, ... }
    // 2) [{id, rank, score}, ...]
    // 3) { items: [...] }
    let arr = [];
    if (Array.isArray(j)) arr = j;
    else if (j && Array.isArray(j.items)) arr = j.items;
    else if (j && typeof j === 'object') {
      arr = Object.values(j);
    }
    return arr
      .map(x => ({
        id: Number(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
        rank: Number(x.rank ?? x.position ?? x.place),
        score: Number(x.score ?? x.rarityScore ?? x.points ?? 0)
      }))
      .filter(x => Number.isFinite(x.id) && Number.isFinite(x.rank))
      .sort((a,b) => a.rank - b.rank);
  }

  function normalizeRanksFromCsv(csv) {
    // Expect headers like: id,rank,score
    const lines = csv.trim().split(/\r?\n/);
    const hdr = lines.shift().split(',').map(h => h.trim().toLowerCase());
    const idx = {
      id: hdr.indexOf('id'),
      rank: hdr.indexOf('rank'),
      score: hdr.indexOf('score')
    };
    const out = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      const id = Number(parts[idx.id]);
      const rank = Number(parts[idx.rank]);
      const score = Number(parts[idx.score] || 0);
      if (Number.isFinite(id) && Number.isFinite(rank)) out.push({ id, rank, score });
    }
    return out.sort((a,b) => a.rank - b.rank);
  }

  // ---------- metadata ----------
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
      } catch (e) { /* next */ }
    }
    // minimal fallback
    return { name: `Frog #${id}`, image: `frog/${id}.png`, attributes: [] };
  }

  // ---------- render ----------
  function clearGrid() { grid.innerHTML = ''; }

  function renderBatch(items) {
    const frag = document.createDocumentFragment();
    items.forEach(rec => frag.appendChild(renderCard(rec)));
    grid.appendChild(frag);
  }

  function renderCard(rec) {
    const { id, rank, score, meta } = rec;

    // If project exposes a shared renderer similar to dashboard cards, use it:
    // 1) FF.renderFrogCard(meta, extra)
    // 2) window.OWNED?.renderCard(meta, extra)
    try {
      if (typeof FF.renderFrogCard === 'function') {
        return FF.renderFrogCard(meta, { rank, rankScore: score, showRank: true });
      }
    } catch(e) {}
    try {
      if (window.OWNED && typeof window.OWNED.renderCard === 'function') {
        return window.OWNED.renderCard(meta, { rank, rankScore: score, showRank: true });
      }
    } catch(e){}

    // Fallback: build a card that matches dashboard styling
    const card = document.createElement('div');
    card.className = 'frog-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'img-wrap';
    const img = document.createElement('img');
    img.alt = `Frog #${id}`;
    img.loading = 'lazy';
    img.src = meta?.image || `frog/${id}.png`;
    imgWrap.appendChild(img);

    const badge = document.createElement('div');
    badge.className = 'rank-badge';
    badge.textContent = `#${rank}${Number.isFinite(score) ? ` • ${score.toFixed(2)}` : ''}`;
    imgWrap.appendChild(badge);

    const body = document.createElement('div');
    body.className = 'body';

    const title = document.createElement('div');
    title.className = 'title';
    const tLeft = document.createElement('div');
    tLeft.textContent = meta?.name || `Frog #${id}`;
    const tRight = document.createElement('div');
    tRight.style.opacity = '.7';
    tRight.style.fontSize = '12px';
    tRight.textContent = `ID ${id}`;
    title.appendChild(tLeft);
    title.appendChild(tRight);

    const metaLine = document.createElement('div');
    metaLine.className = 'meta';
    metaLine.textContent = `Rarity Rank #${rank}${Number.isFinite(score) ? ` • Score ${score.toFixed(2)}` : ''}`;

    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnOS = document.createElement('button');
    btnOS.className = 'btn';
    btnOS.textContent = 'OpenSea';
    btnOS.onclick = () => {
      const col = CFG.COLLECTION_SLUG || 'freshfrogs';
      window.open(`https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`, '_blank');
    };
    const btnScan = document.createElement('button');
    btnScan.className = 'btn';
    btnScan.textContent = 'Etherscan';
    btnScan.onclick = () => {
      window.open(`https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`, '_blank');
    };
    actions.appendChild(btnOS);
    actions.appendChild(btnScan);

    body.appendChild(title);
    body.appendChild(metaLine);
    body.appendChild(actions);

    card.appendChild(imgWrap);
    card.appendChild(body);
    return card;
  }

  // ---------- paging / sorting ----------
  function applySort() {
    if (sortMode === 'rank') {
      view = ranks.slice().sort((a,b) => a.rank - b.rank);
    } else {
      // score desc, tiebreak rank
      view = ranks.slice().sort((a,b) => (b.score - a.score) || (a.rank - b.rank));
    }
    offset = 0;
  }

  async function loadMore() {
    const slice = view.slice(offset, offset + PAGE_SIZE);
    if (slice.length === 0) {
      document.getElementById('moreWrap')?.style && (document.getElementById('moreWrap').style.display = 'none');
      return;
    }
    // fetch metas in parallel
    const metas = await Promise.all(slice.map(x => fetchMeta(x.id)));
    slice.forEach((x, i) => x.meta = metas[i]);
    renderBatch(slice);
    offset += slice.length;
  }

  // ---------- UI hooks ----------
  function wireUi() {
    const btnRank = document.getElementById('btnSortRank');
    const btnScore = document.getElementById('btnSortScore');
    const btnMore = document.getElementById('btnMore');
    const btnGo = document.getElementById('btnGo');
    const searchId = document.getElementById('searchId');

    btnRank?.addEventListener('click', () => {
      sortMode = 'rank';
      clearGrid(); applySort(); loadMore();
    });
    btnScore?.addEventListener('click', () => {
      sortMode = 'score';
      clearGrid(); applySort(); loadMore();
    });
    btnMore?.addEventListener('click', loadMore);
    btnGo?.addEventListener('click', () => {
      const id = Number(searchId.value);
      if (!Number.isFinite(id)) return;
      const rec = idIndex.get(id);
      if (!rec) return;
      // Rebuild view to center around this frog’s rank page
      sortMode = 'rank';
      applySort();
      const idx = view.findIndex(x => x.id === id);
      if (idx >= 0) {
        clearGrid();
        offset = idx - (idx % PAGE_SIZE);
        loadMore();
      }
    });
  }

  // ---------- bootstrap ----------
  (async function init(){
    try {
      const loaded = await loadFirstAvailable(RANK_SOURCES);
      ranks = loaded;
      idIndex = new Map(ranks.map(r => [r.id, r]));
      applySort();
      wireUi();
      await loadMore();
    } catch (err) {
      console.error('Rarity init failed:', err);
      grid.innerHTML = `<div style="opacity:.8">Could not load rarity rankings. Ensure a file exists in <code>assets/freshfrogs_rarity_rankings/</code> (ranks.json/rarity.json/ranks.csv).</div>`;
    }
  })();

})(window.FF, window.CFG);
