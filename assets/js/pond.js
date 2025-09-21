(function (FF, CFG) {
  // -----------------------------
  // Settings
  // -----------------------------
  const PAGE_SIZE = 10; // 10 per page with numbered pager
  const RANK_JSON = 'assets/freshfrogs_rank_lookup.json';

  // -----------------------------
  // State
  // -----------------------------
  let pages = [];                 // pages[i] = [tokenId,...] (10 per page)
  let continuations = [''];       // reservoir continuation per fetched page
  let hasMore = true;             // if reservoir has more pages available
  let currentPage = 0;            // 0-index
  let rankMap = null;             // {id -> rank}
  const stakerCache = new Map();  // tokenId -> { staker, date } (resolved once)

  // DOM
  const listEl = document.getElementById('pondList');
  const wrapEl = document.getElementById('pondListWrap');

  // -----------------------------
  // Small utils
  // -----------------------------
  function fmtAddr(a) {
    if (!a) return '—';
    const s = String(a);
    return s.slice(0, 6) + '…' + s.slice(-4);
  }
  function ago(date) {
    if (!date) return '—';
    const ms = Date.now() - date.getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    const d = Math.floor(h / 24);
    return d + 'd';
  }

  async function loadRanksOnce() {
    if (rankMap) return;
    try {
      const data = await FF.fetchJSON(RANK_JSON);
      if (Array.isArray(data)) {
        rankMap = Object.fromEntries(
          data.map(r => [String(r.id), Number(r.rank ?? r.ranking ?? NaN)])
              .filter(([, v]) => Number.isFinite(v))
        );
      } else if (data && typeof data === 'object') {
        rankMap = Object.fromEntries(
          Object.entries(data)
            .map(([k, v]) => [String(k), Number(v)])
            .filter(([, v]) => Number.isFinite(v))
        );
      } else {
        rankMap = {};
      }
    } catch (e) {
      console.warn('rank lookup failed', e);
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
    // Tokens currently owned by the controller (i.e., staked)
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

  // Fallback: use Reservoir Activities (transfers) to find last transfer -> controller
  async function fetchStakeMetaViaReservoir(tokenId) {
    try {
      const base = 'https://api.reservoir.tools/activities/v7';
      const qs = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        token: `${CFG.COLLECTION_ADDRESS}:${tokenId}`,
        types: 'transfer',
        limit: '50'
      });
      const res = await fetch(`${base}?${qs.toString()}`, {
        method: 'GET',
        headers: { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const act = (json?.activities || [])
        .filter(a => (a?.toAddress || a?.to?.address) &&
                     String(a.toAddress || a.to?.address).toLowerCase() === CFG.CONTROLLER_ADDRESS.toLowerCase() &&
                     String(a?.token?.tokenId ?? a?.tokenId) === String(tokenId))
        .sort((a, b) => {
          const ta = Date.parse(a?.timestamp ?? a?.createdAt ?? 0) || 0;
          const tb = Date.parse(b?.timestamp ?? b?.createdAt ?? 0) || 0;
          return ta - tb;
        })
        .pop(); // most recent to controller

      if (!act) return { staker: null, date: null };

      const staker = String(act?.fromAddress || act?.from?.address || '').toLowerCase() || null;
      const raw = act?.timestamp ?? act?.createdAt;
      const dt = raw ? new Date((typeof raw === 'number' ? (raw < 1e12 ? raw * 1000 : raw) : Date.parse(raw))) : null;
      return { staker, date: dt };
    } catch (e) {
      console.warn('Reservoir activity fallback failed for token', tokenId, e);
      return { staker: null, date: null };
    }
  }

  // Primary: on-chain logs Transfer → controller
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
        // Fallback to Reservoir activities
        const viaAPI = await fetchStakeMetaViaReservoir(tokenId);
        stakerCache.set(tokenId, viaAPI);
        return viaAPI;
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
      console.warn('on-chain stake meta failed; trying reservoir fallback', e);
      const viaAPI = await fetchStakeMetaViaReservoir(tokenId);
      stakerCache.set(tokenId, viaAPI);
      return viaAPI;
    }
  }

  // -----------------------------
  // Pager model (numbers at bottom)
  // -----------------------------
  async function ensurePage(i) {
    // Fetch sequential pages until page i exists or no more pages.
    while (pages.length <= i && hasMore) {
      const cont = continuations[continuations.length - 1] || '';
      const { ids, continuation } = await fetchTokensPage(cont);
      pages.push(ids);
      if (continuation) continuations.push(continuation);
      else hasMore = false;
    }
  }

  function renderPager() {
    // Remove existing
    const old = wrapEl.querySelector('.pager');
    if (old) old.remove();

    if (!pages.length) return;
    const pager = document.createElement('div');
    pager.className = 'pager';

    // numbered buttons for all loaded pages
    pages.forEach((_, i) => {
      const b = document.createElement('button');
      b.textContent = String(i + 1);
      b.className = 'btn btn-ghost btn-sm';
      if (i === currentPage) { b.classList.add('btn-solid'); b.classList.remove('btn-ghost'); }
      b.addEventListener('click', async () => {
        currentPage = i;
        await renderPage(); // re-render current page
      });
      pager.appendChild(b);
    });

    // show a "Next ›" to fetch one more page & extend numbered list when possible
    if (hasMore) {
      const next = document.createElement('button');
      next.className = 'btn btn-outline btn-sm';
      next.textContent = 'Next ›';
      next.addEventListener('click', async () => {
        // advance to next (yet-unloaded) page
        currentPage = pages.length; // point to the page that doesn't exist yet
        await ensurePage(currentPage); // fetch it
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

    // Render cards for the 10 ids on this page, and fill staker/time once resolved
    for (const id of ids) {
      const rank = getRank(id);
      const li = document.createElement('li'); li.className = 'list-item';
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

      // Resolve staker + when (async) with on-chain, then fallback to Reservoir if needed
      try {
        const meta = await getStakeMetaOnChain(id);
        const when = meta.date ? `${ago(meta.date)} ago` : '—';
        const who = meta.staker ? fmtAddr(meta.staker) : '—';
        const info = li.querySelector('.muted');
        if (info) info.textContent = `Staked ${when} • by ${who}`;
      } catch (_) { /* already logged in helpers */ }
    }

    renderPager();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    try {
      listEl.innerHTML = '<li class="list-item"><div class="muted">Loading pond…</div></li>';
      pages = [];
      continuations = [''];
      hasMore = true;
      currentPage = 0;
      await renderPage();
    } catch (e) {
      console.warn(e);
      listEl.innerHTML = '<li class="list-item"><div class="muted">Failed to load the pond.</div></li>';
    }
  }

  // public refresh if you need it elsewhere
  window.FF_renderPond = boot;

  // auto-run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window.FF, window.FF_CFG);
