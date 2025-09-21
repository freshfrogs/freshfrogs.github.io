(function (FF, CFG) {
  // -----------------------------
  // Settings
  // -----------------------------
  const PAGE_SIZE = 10;                 // show 10 per page (numbered pager)
  const RANK_JSON = 'assets/freshfrogs_rank_lookup.json'; // { "1": 123, "2": 456, ... }

  // -----------------------------
  // State
  // -----------------------------
  let pages = [];          // array of arrays: pages[i] = [tokenId,...] (10 ids)
  let continuations = ['']; // continuation token per page index; [0] is empty (start)
  let hasMore = true;      // whether reservoir has more results
  let currentPage = 0;     // 0-indexed page
  let rankMap = null;      // {id -> rank}
  const stakerCache = new Map(); // tokenId -> { staker, date }

  // Shared DOM
  const listEl = document.getElementById('pondList');
  const wrapEl = document.getElementById('pondListWrap');

  // -----------------------------
  // Utils
  // -----------------------------
  function fmtAddr(a) {
    if (!a) return '—';
    const s = String(a);
    return s.slice(0, 6) + '…' + s.slice(-4);
  }
  function ago(d) {
    if (!d) return '—';
    const ms = Date.now() - d.getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    const dd = Math.floor(h / 24);
    return dd + 'd';
  }

  async function loadRanksOnce() {
    if (rankMap) return;
    try {
      const j = await FF.fetchJSON(RANK_JSON);
      // supports either array of {id, rank} or a plain {id:rank} map
      if (Array.isArray(j)) {
        rankMap = Object.fromEntries(
          j.map(r => [String(r.id), Number(r.rank ?? r.ranking ?? r.score ?? NaN)])
            .filter(([, v]) => Number.isFinite(v))
        );
      } else if (j && typeof j === 'object') {
        rankMap = Object.fromEntries(
          Object.entries(j).map(([k, v]) => [String(k), Number(v)])
            .filter(([, v]) => Number.isFinite(v))
        );
      }
    } catch (e) {
      console.warn('rank lookup load failed', e);
      rankMap = {};
    }
  }
  function getRank(id) {
    if (!rankMap) return null;
    const r = rankMap[String(id)];
    return (r || r === 0) ? r : null;
  }

  // -----------------------------
  // Reservoir fetchers
  // -----------------------------
  async function fetchTokensPage(continuation = '') {
    // Tokens currently OWNED by the controller (i.e., staked)
    const base = 'https://api.reservoir.tools/tokens/v7';
    const qs = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      owner: CFG.CONTROLLER_ADDRESS,
      limit: String(PAGE_SIZE),
      includeTopBid: 'false'
    });
    if (continuation) qs.set('continuation', continuation);
    const res = await fetch(`${base}?${qs.toString()}`, {
      method: 'GET',
      headers: { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const ids = (json.tokens || [])
      .map(t => t?.token?.tokenId ?? t?.tokenId ?? t?.id)
      .map(x => (x != null ? parseInt(String(x), 10) : null))
      .filter(Number.isFinite);
    return { ids, continuation: json.continuation || '' };
  }

  // For staker & stakedSince, query on-chain logs (10 tokens per page -> OK).
  // Uses window.ethereum if present; falls back to default provider.
  async function getStakeMetaOnChain(tokenId) {
    if (stakerCache.has(tokenId)) return stakerCache.get(tokenId);
    try {
      const provider =
        (window.ethereum
          ? new ethers.providers.Web3Provider(window.ethereum)
          : ethers.getDefaultProvider());
      const iface = new ethers.utils.Interface([
        'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
      ]);
      const topicTransfer = iface.getEventTopic('Transfer');
      const toTopic = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
      const idTopic = ethers.utils.hexZeroPad(
        ethers.BigNumber.from(String(tokenId)).toHexString(), 32
      );

      const fromBlock = Number(CFG.CONTROLLER_DEPLOY_BLOCK || 0);
      const logs = await provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: [topicTransfer, null, toTopic, idTopic]
      });

      if (!logs.length) {
        const meta = { staker: null, date: null };
        stakerCache.set(tokenId, meta);
        return meta;
      }

      const last = logs[logs.length - 1];
      const parsed = iface.parseLog(last);
      const staker = parsed.args?.from ? String(parsed.args.from) : null;
      const blk = await provider.getBlock(last.blockNumber);
      const date = new Date(blk.timestamp * 1000);

      const meta = { staker, date };
      stakerCache.set(tokenId, meta);
      return meta;
    } catch (e) {
      console.warn('stake meta failed', tokenId, e);
      const meta = { staker: null, date: null };
      stakerCache.set(tokenId, meta);
      return meta;
    }
  }

  // -----------------------------
  // Paging model (numbered)
  // -----------------------------
  async function ensurePage(index) {
    // Fetch sequential reservoir pages until we have index
    while (pages.length <= index && hasMore) {
      const cont = continuations[continuations.length - 1] || '';
      const { ids, continuation } = await fetchTokensPage(cont);
      pages.push(ids);
      if (continuation) continuations.push(continuation);
      else hasMore = false;
    }
  }

  function renderPager() {
    // Remove old pager
    const old = wrapEl.querySelector('.pager');
    if (old) old.remove();

    // Build pager with known page count (may grow as user goes forward)
    const pager = document.createElement('div');
    pager.className = 'pager';
    const total = pages.length;
    if (!total) return;

    for (let i = 0; i < total; i++) {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = String(i + 1);
      if (i === currentPage) {
        b.classList.add('btn-solid');
        b.classList.remove('btn-ghost');
      }
      b.addEventListener('click', async () => {
        currentPage = i;
        await renderPage();
      });
      pager.appendChild(b);
    }

    // "Next" button if we think there are more server pages
    if (hasMore) {
      const next = document.createElement('button');
      next.className = 'btn btn-outline btn-sm';
      next.textContent = 'Next ›';
      next.addEventListener('click', async () => {
        currentPage = pages.length;      // go to yet-unloaded page
        await ensurePage(currentPage);   // fetch it
        await renderPage();
      });
      pager.appendChild(next);
    }

    wrapEl.appendChild(pager);
  }

  // -----------------------------
  // Render
  // -----------------------------
  async function renderPage() {
    await loadRanksOnce();
    await ensurePage(currentPage);

    const ids = pages[currentPage] || [];
    listEl.innerHTML = '';

    if (!ids.length) {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      listEl.appendChild(li);
      renderPager();
      return;
    }

    // Render each card; fetch staker meta lazily for just these 10 ids
    for (const id of ids) {
      const rank = getRank(id);
      const li = document.createElement('li');
      li.className = 'list-item';

      // placeholder while we fetch staker meta
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;">
             <b>Frog #${id}</b>
             ${(rank || rank === 0)
               ? `<span class="pill">Rank <b>#${rank}</b></span>`
               : `<span class="pill"><span class="muted">Rank N/A</span></span>`}
           </div>
           <div class="muted">Staked — • by —</div>
         </div>`;

      listEl.appendChild(li);

      // Now fill in staker + time
      try {
        const meta = await getStakeMetaOnChain(id);
        const when = meta.date ? `${ago(meta.date)} ago` : '—';
        const who = meta.staker ? fmtAddr(meta.staker) : '—';
        const info = li.querySelector('.muted');
        if (info) info.textContent = `Staked ${when} • by ${who}`;
      } catch {}
    }

    renderPager();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    try {
      listEl.innerHTML = '<li class="list-item"><div class="muted">Loading pond…</div></li>';
      currentPage = 0;
      pages = [];
      continuations = [''];
      hasMore = true;
      await renderPage();
    } catch (e) {
      console.warn(e);
      listEl.innerHTML = '<li class="list-item"><div class="muted">Failed to load the pond.</div></li>';
    }
  }

  // Public hook (if you want to refresh from elsewhere)
  window.FF_renderPond = boot;

  // Auto-run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window.FF, window.FF_CFG);
