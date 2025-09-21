// Pond: load ALL controller-owned tokens, then enrich each with staker + time + rank.
// This version renders the entire list (scrollable) without numbered paging.
(function (FF, CFG) {
  const LIST = document.getElementById('pondList');
  const WRAP = document.getElementById('pondListWrap') || document;
  if (!LIST) return;

  const RES_HEADERS = { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  const TOKENS_URL = 'https://api.reservoir.tools/tokens/v7';

  // optional speed-up for log scan
  const FROM_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 0);

  // state
  let provider = null, iface = null;
  let RANKS = null;
  let items = []; // [{ id, staker, since:Date|null, rank:Number|null }]

  // ---------- helpers ----------
  function formatAgo(ms) {
    const s = Math.floor(ms / 1000); if (s < 60) return s + 's';
    const m = Math.floor(s / 60);    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);    if (h < 24) return h + 'h';
    const d = Math.floor(h / 24);    return d + 'd';
  }

  async function ensureProvider() {
    if (provider) return;
    if (!window.ethereum) return;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    iface = new ethers.utils.Interface([
      'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
    ]);
  }

  async function loadRanks() {
    if (RANKS) return;
    try {
      const arr = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json');
      RANKS = Object.fromEntries((arr || []).map(r => [String(r.id), Number(r.rank)]));
    } catch {
      RANKS = {};
    }
  }

  async function fetchAllControllerTokens() {
    const out = [];
    let continuation = '';
    for (let i = 0; i < 50; i++) { // hard stop just in case
      const qs = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: CFG.CONTROLLER_ADDRESS,
        limit: '200',
        sortBy: 'tokenId'
      });
      if (continuation) qs.set('continuation', continuation);
      const res = await fetch(`${TOKENS_URL}?${qs.toString()}`, { headers: RES_HEADERS });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const ids = (json.tokens || [])
        .map(t => {
          const tid = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
          const id = tid != null ? parseInt(String(tid), 10) : null;
          return Number.isFinite(id) ? id : null;
        })
        .filter(Boolean);
      out.push(...ids);
      continuation = json.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  async function lookupStakeInfo(id) {
    await ensureProvider();
    if (!provider) return { staker: null, since: null };
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
      if (!logs.length) return { staker: null, since: null };
      const last = logs[logs.length - 1];
      const parsed = iface.parseLog(last);
      const staker = parsed.args.from;
      const blk = await provider.getBlock(last.blockNumber);
      const since = new Date(blk.timestamp * 1000);
      return { staker, since };
    } catch {
      return { staker: null, since: null };
    }
  }

  function render() {
    if (!items.length) {
      LIST.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
      return;
    }
    LIST.innerHTML = '';
    items.forEach(it => {
      const badge = (it.rank || it.rank === 0)
        ? `<span class="pill">Rank <b>#${it.rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
      const sinceStr = it.since ? `${formatAgo(Date.now() - it.since.getTime())} ago` : '—';
      const ownerStr = it.staker ? FF.shorten(String(it.staker)) : '—';

      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${it.id}.png`, `Frog ${it.id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${it.id}</b> ${badge}
          </div>
          <div class="muted">Staked ${sinceStr} • Owner ${ownerStr}</div>
        </div>`;
      LIST.appendChild(li);
    });
  }

  // ---------- init ----------
  async function init() {
    try {
      // quick placeholder
      LIST.innerHTML = `<li class="list-item"><div class="muted">Loading staked frogs…</div></li>`;

      await loadRanks();
      const ids = await fetchAllControllerTokens();
      if (!ids.length) { render(); return; }

      // seed items
      items = ids.map(id => ({
        id,
        staker: null,
        since: null,
        rank: (RANKS[String(id)] || RANKS[String(id)] === 0) ? RANKS[String(id)] : null
      }));

      // optimistic render of IDs while we enrich
      render();

      // enrich sequentially (simple & reliable)
      for (let i = 0; i < items.length; i++) {
        const info = await lookupStakeInfo(items[i].id);
        items[i].staker = info.staker;
        items[i].since = info.since;
        // progressive update every few items
        if (i % 8 === 0 || i === items.length - 1) render();
      }
    } catch (e) {
      console.warn('Pond load failed:', e);
      LIST.innerHTML = `<li class="list-item"><div class="muted">Failed to load The Pond.</div></li>`;
    }
  }

  init();
})(window.FF || (window.FF = {}), window.FF_CFG);
