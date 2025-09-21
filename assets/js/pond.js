(function (FF, CFG) {
  // ---------- Config ----------
  const PAGE_SIZE = 10;
  const RES_HEADERS = { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  const TOKENS_URL = 'https://api.reservoir.tools/tokens/v7';
  const LIST_EL = document.getElementById('pondList');
  const WRAP_EL = document.getElementById('pondListWrap');
  if (!LIST_EL || !WRAP_EL) return;

  // Optional: where to start log search (speeds up stake-time lookup)
  const FROM_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 0);

  // ---------- State ----------
  let provider = null;
  let iface = null;
  let rankMap = null; // id -> rank
  const pages = [];   // [{ items:[{id}], continuation:"" }]
  let pageIndex = 0;  // current page (0-based)
  let fetching = false;

  // Cursors for reservoir pagination
  // pages[i].continuation is the cursor that produced page i.
  // nextCursor keeps the cursor for the page AFTER the last loaded page.
  let nextCursor = '';

  // ---------- Utils ----------
  function formatAgo(ms) {
    const s = Math.floor(ms / 1000); if (s < 60) return s + 's';
    const m = Math.floor(s / 60);    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);    if (h < 24) return h + 'h';
    const d = Math.floor(h / 24);    return d + 'd';
  }

  async function ensureProvider() {
    if (provider) return provider;
    if (!window.ethereum) return null;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    iface = new ethers.utils.Interface([
      'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
    ]);
    return provider;
  }

  async function getRankMap() {
    if (rankMap) return rankMap;
    try {
      // Small lookup JSON: [{ "id": 1, "rank": 123 }, ...]
      const arr = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
      rankMap = Object.fromEntries(
        (arr || []).map(r => [String(r.id), Number(r.rank)])
      );
    } catch {
      rankMap = {};
    }
    return rankMap;
  }

  async function reservoirFetch(owner, limit, continuation) {
    const qs = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      owner,
      limit: String(limit),
      sortBy: 'tokenId' // stable paging
    });
    if (continuation) qs.set('continuation', continuation);
    const res = await fetch(`${TOKENS_URL}?${qs.toString()}`, { headers: RES_HEADERS });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // Only for the visible page (10 items)
  async function enrichVisible(items) {
    await ensureProvider();
    await getRankMap();

    // For each token, find the last Transfer → controller (the stake event)
    // We do this one-by-one to keep RPC request size small and avoid timeouts.
    async function getStakeInfo(id) {
      if (!provider) return { who: null, since: null };

      try {
        const topicTransfer = iface.getEventTopic('Transfer');
        const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
        const idTopic = ethers.utils.hexZeroPad(
          ethers.BigNumber.from(String(id)).toHexString(), 32
        );

        const logs = await provider.getLogs({
          fromBlock: FROM_BLOCK,
          toBlock: 'latest',
          address: CFG.COLLECTION_ADDRESS,
          topics: [topicTransfer, null, toTopic, idTopic]
        });
        if (!logs.length) return { who: null, since: null };

        const last = logs[logs.length - 1];
        // decode to get the staker (from)
        const parsed = iface.parseLog(last);
        const who = parsed.args.from; // the user who transferred to controller
        const blk = await provider.getBlock(last.blockNumber);
        const since = new Date(blk.timestamp * 1000);
        return { who, since };
      } catch (e) {
        // console.debug('stake lookup fail', id, e);
        return { who: null, since: null };
      }
    }

    // Resolve sequentially to reduce RPC pressure
    for (const it of items) {
      const info = await getStakeInfo(it.id);
      it.staker = info.who;
      it.since = info.since;
      const r = rankMap[String(it.id)];
      it.rank = (r || r === 0) ? r : null;
    }
  }

  function renderEmpty(msg) {
    LIST_EL.innerHTML = `<li class="list-item"><div class="muted">${msg}</div></li>`;
    renderPager(); // still show pager if we have >1 loaded pages
  }

  function renderPage(i) {
    pageIndex = i;
    const page = pages[i];
    if (!page || !page.items?.length) { renderEmpty('No frogs are currently staked.'); return; }

    LIST_EL.innerHTML = '';
    page.items.forEach(it => {
      const badge = (it.rank || it.rank === 0)
        ? `<span class="pill">Rank <b>#${it.rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

      const sinceStr = it.since ? `${formatAgo(Date.now() - it.since.getTime())} ago` : '—';
      const whoStr = it.staker ? FF.shorten(String(it.staker)) : '—';

      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${it.id}.png`, `Frog ${it.id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${it.id}</b> ${badge}
          </div>
          <div class="muted">Staked ${sinceStr} • Owner ${whoStr}</div>
        </div>`;
      LIST_EL.appendChild(li);
    });

    renderPager();
  }

  function renderPager() {
    let bar = document.getElementById('pondPager');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pondPager';
      bar.className = 'row';
      bar.style.marginTop = '10px';
      WRAP_EL.appendChild(bar);
    }
    bar.innerHTML = '';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'btn btn-ghost btn-sm';
    btnPrev.textContent = 'Prev';
    btnPrev.disabled = pageIndex === 0;
    btnPrev.onclick = () => showPage(pageIndex - 1);
    bar.appendChild(btnPrev);

    // numeric buttons for loaded pages
    pages.forEach((_, idx) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (idx === pageIndex ? 'btn-solid btn-sm' : 'btn-ghost btn-sm');
      b.textContent = String(idx + 1);
      b.onclick = () => showPage(idx);
      bar.appendChild(b);
    });

    // "Next" (enabled if we either know there's another page via nextCursor,
    // or we simply allow fetching on demand)
    const btnNext = document.createElement('button');
    btnNext.className = 'btn btn-outline btn-sm';
    btnNext.textContent = 'Next';
    btnNext.disabled = !nextCursor && pageIndex === pages.length - 1;
    btnNext.onclick = () => showPage(pageIndex + 1);
    bar.appendChild(btnNext);
  }

  async function loadNextPage() {
    if (fetching) return null;
    fetching = true;
    try {
      const json = await reservoirFetch(CFG.CONTROLLER_ADDRESS, PAGE_SIZE, nextCursor);
      const items = (json?.tokens || []).map(t => {
        const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
        return id ? { id } : null;
      }).filter(Boolean);

      // Track page
      pages.push({ items, continuation: nextCursor });
      nextCursor = json?.continuation || '';
      return items;
    } finally {
      fetching = false;
    }
  }

  async function ensurePageLoaded(targetPage) {
    while (pages.length <= targetPage) {
      const got = await loadNextPage();
      if (!got || !got.length) break; // nothing more
    }
    return !!pages[targetPage];
  }

  async function showPage(i) {
    if (i < 0) i = 0;

    // If asking for a page beyond what we have, try to fetch it
    const ok = await ensurePageLoaded(i);
    if (!ok) {
      // no such page; clamp to last available
      if (pages.length === 0) { renderEmpty('No frogs are currently staked.'); return; }
      i = Math.max(0, pages.length - 1);
    }

    // If the page hasn't been enriched yet, do it now (and show placeholders)
    const page = pages[i];
    const needsEnrich = !page.items[0]?.staker; // first item is a proxy
    if (needsEnrich) {
      // show quick placeholders while enriching
      LIST_EL.innerHTML = page.items.map(it =>
        `<li class="list-item">
          ${FF.thumb64(`${CFG.SOURCE_PATH}/frog/${it.id}.png`, `Frog ${it.id}`)}
          <div><div><b>Frog #${it.id}</b></div><div class="muted">Loading stake info…</div></div>
        </li>`
      ).join('');
      await enrichVisible(page.items);
    }

    renderPage(i);
  }

  // ---------- Init ----------
  async function init() {
    // first page
    await ensurePageLoaded(0);
    if (!pages.length || !pages[0].items.length) {
      renderEmpty('No frogs are currently staked.');
      return;
    }
    await enrichVisible(pages[0].items);
    renderPage(0);
  }

  init();

  // expose for debugging
  window.FF_showPondPage = showPage;
})(window.FF || (window.FF = {}), window.FF_CFG);
