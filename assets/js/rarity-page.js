// assets/js/rarity-page.js — renders rarity cards using the shared frog card
// component, restores owner + staking info, and re-enables attribute hover
// lifts from the layered renderer.

(function(FF = window.FF || {}, CFG = window.FF_CFG || {}) {
  'use strict';

  const GRID = document.getElementById('rarityGrid');
  const BTN_MORE = document.getElementById('btnMore');
  const BTN_RANK = document.getElementById('btnSortRank');
  const BTN_SCORE = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO = document.getElementById('btnGo');
  if (!GRID) return;

  const PRIMARY_RANK_FILE = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
  const LOOKUP_FILE = 'assets/freshfrogs_rank_lookup.json';
  const PAGE = 60;
  const SOURCE_PATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');

  const RESERVOIR = {
    HOST: (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,''),
    KEY:  CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || ''
  };

  let all = [];     // [{id, rank, score}]
  let view = [];
  let offset = 0;
  let sortMode = 'rank';
  let lookupMap = null; // Map(id -> {rank, score})
  let currentUser = null;

  function uiError(msg) {
    GRID.innerHTML = `<div class="pg-muted" style="padding:10px">${msg}</div>`;
  }
  function clearGrid(){
    GRID.innerHTML = '';
    GRID.classList.add('frog-cards');
  }
  function ensureMoreBtn() {
    if (!BTN_MORE) return;
    BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none';
  }
  function asNum(x){ const n = Number(x); return Number.isFinite(n) ? n : NaN; }
  function getRankLike(o){ return asNum(o.rank ?? o.ranking ?? o.position ?? o.place); }

  const shortAddr = (a)=> a && typeof a==='string'
    ? (a.length>10 ? `${a.slice(0,6)}…${a.slice(-4)}` : a)
    : '—';

  const traitKey  = (t)=> (t?.key ?? t?.trait_type ?? t?.traitType ?? t?.trait ?? '').toString().trim();
  const traitVal  = (t)=> (t?.value ?? t?.trait_value ?? '').toString().trim();

  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    const s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    const d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    const h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    const m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }

  const sinceMs = (sec)=> {
    if (sec==null) return null;
    const n = Number(sec);
    if (!Number.isFinite(n)) return null;
    return n > 1e12 ? n : n*1000;
  };

  async function getUserAddress(){
    try{ if (window.FF_WALLET?.address) return window.FF_WALLET.address; }catch{}
    try{ if (window.ethereum?.request){ const a=await window.ethereum.request({method:'eth_accounts'}); return a?.[0]||null; } }
    catch{}
    return null;
  }

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
    } catch {
      lookupMap = null; // optional
    }
  }

  async function loadPrimaryRanks() {
    try {
      const j = await fetchJson(PRIMARY_RANK_FILE);
      if (Array.isArray(j)) {
        let arr = normalizeRankingsArray(j);
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

  function normalizeAttrs(meta){
    const out = [];
    const arr = Array.isArray(meta?.attributes) ? meta.attributes : [];
    for (const a of arr) {
      const key = traitKey(a);
      const val = traitVal(a);
      if (!key || !val) continue;
      out.push({ key, value: val });
    }
    return out;
  }

  // ---- owner + staking helpers ----
  let _web3,_collection;
  function getWeb3(){
    if (_web3) return _web3;
    _web3 = new Web3(window.ethereum || Web3.givenProvider || '');
    return _web3;
  }
  function getCollectionContract(){
    if (_collection) return _collection;
    if (!CFG.COLLECTION_ADDRESS || !window.COLLECTION_ABI) return null;
    _collection = new (getWeb3()).eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
    return _collection;
  }

  async function ownerFromContract(id){
    try{
      const contract = getCollectionContract();
      if (!contract) return null;
      return await contract.methods.ownerOf(String(id)).call();
    }catch{
      return null;
    }
  }

  async function ownerFromReservoir(id){
    if (!RESERVOIR.KEY || !CFG.COLLECTION_ADDRESS) return null;
    const url = `${RESERVOIR.HOST}/owners/v2?tokens=${encodeURIComponent(`${CFG.COLLECTION_ADDRESS}:${id}`)}&limit=1`;
    try {
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'x-api-key': RESERVOIR.KEY
        }
      });
      if (!res.ok) return null;
      const json = await res.json();
      const owner = json?.owners?.[0]?.owner;
      return (typeof owner === 'string' && owner.startsWith('0x')) ? owner : null;
    } catch {
      return null;
    }
  }

  async function fetchOwnerOf(id){
    const onchain = await ownerFromContract(id);
    if (onchain) return onchain;
    const api = await ownerFromReservoir(id);
    return api || null;
  }

  async function fetchStakeInfo(id){
    try {
      if (FF.staking?.getStakeInfo) return await FF.staking.getStakeInfo(id);
    } catch {}
    try {
      if (window.STAKING_ADAPTER?.getStakeInfo) return await window.STAKING_ADAPTER.getStakeInfo(id);
    } catch {}
    return { staked:false, since:null };
  }

  function normalizeStake(info){
    const staked = !!info?.staked;
    const since = info?.since ?? info?.sinceMs ?? info?.since_ms ?? info?.stakedSince ?? null;
    return { staked, sinceMs: sinceMs(since) };
  }

  function metaLineForCard(item){
    const ownerLabel = item.ownerYou ? 'You' : (item.ownerShort || shortAddr(item.owner));
    if (item.staked){
      const ago = item.sinceMs ? fmtAgo(item.sinceMs) : null;
      return `${ago ? `Staked ${ago}` : 'Staked'} • Owned by ${ownerLabel}`;
    }
    return `Not staked • Owned by ${ownerLabel}`;
  }

  function buildCard(rec) {
    if (window.FF?.buildFrogCard) {
      return window.FF.buildFrogCard({
        id: rec.id,
        rank: rec.rank,
        attrs: rec.attrs,
        staked: rec.staked,
        sinceMs: rec.sinceMs,
        metaRaw: rec.metaRaw,
        owner: rec.owner,
        ownerShort: rec.ownerShort,
        ownerYou: rec.ownerYou
      }, {
        showActions: false,
        rarityTiers: CFG.RARITY_TIERS,
        metaLine: metaLineForCard
      });
    }

    // Fallback: minimal card
    const card = document.createElement('article');
    card.className = 'frog-card';
    card.setAttribute('data-token-id', String(rec.id));

    const row = document.createElement('div');
    row.className = 'row';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';
    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = rec.metaRaw?.name || `Frog #${rec.id}`;
    img.loading = 'lazy';
    img.src = rec.metaRaw?.image || `${SOURCE_PATH}/frog/${rec.id}.png`;
    thumbWrap.appendChild(img);

    const right = document.createElement('div');
    const title = document.createElement('h4');
    title.className = 'title';
    title.textContent = rec.metaRaw?.name || `Frog #${rec.id}`;
    if (rec.rank != null) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = `#${rec.rank}`;
      title.appendChild(pill);
    }
    const metaLine = document.createElement('div');
    metaLine.className = 'meta';
    metaLine.textContent = metaLineForCard(rec);

    right.appendChild(title);
    right.appendChild(metaLine);

    if (rec.attrs?.length) {
      const list = document.createElement('ul');
      list.className = 'attr-bullets';
      rec.attrs.forEach(attr => {
        const li = document.createElement('li');
        li.innerHTML = `<b>${attr.key}:</b> ${attr.value}`;
        list.appendChild(li);
      });
      right.appendChild(list);
    }

    row.appendChild(thumbWrap);
    row.appendChild(right);
    card.appendChild(row);
    return card;
  }

  async function loadMore() {
    const slice = view.slice(offset, offset + PAGE);
    if (slice.length === 0) { ensureMoreBtn(); return; }
    const metas = await Promise.all(slice.map(x => fetchMeta(x.id)));
    const owners = await Promise.all(slice.map(x => fetchOwnerOf(x.id)));
    const stakes = await Promise.all(slice.map(x => fetchStakeInfo(x.id)));

    const frag = document.createDocumentFragment();
    for (let i = 0; i < slice.length; i++) {
      const meta = metas[i] || { attributes: [] };
      const owner = owners[i] || null;
      const stake = normalizeStake(stakes[i] || null);
      const attrs = normalizeAttrs(meta);
      const rec = {
        id: slice[i].id,
        rank: slice[i].rank,
        score: slice[i].score,
        metaRaw: meta,
        attrs,
        staked: stake.staked,
        sinceMs: stake.sinceMs,
        owner,
        ownerShort: shortAddr(owner),
        ownerYou: currentUser && owner && currentUser.toLowerCase() === owner.toLowerCase()
      };
      frag.appendChild(buildCard(rec));
    }

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

  async function init() {
    try {
      await loadLookup();
      const primary = await loadPrimaryRanks();
      if (primary.length) {
        all = primary;
      } else if (lookupMap && lookupMap.size) {
        all = Array.from(lookupMap, ([id, v]) => ({ id, rank: v.rank, score: v.score || 0 }))
          .sort((a,b)=>a.rank-b.rank);
      } else {
        uiError(`Could not load rarity data. Check both JSON files' shapes.`);
        return;
      }

      view = all.slice();
      offset = 0;
      clearGrid();

      currentUser = await getUserAddress();
      await loadMore();
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';

      BTN_MORE?.addEventListener('click', () => loadMore());
      BTN_RANK?.addEventListener('click', () => { sortMode = 'rank'; resort(); });
      BTN_SCORE?.addEventListener('click', () => { sortMode = 'score'; resort(); });
      BTN_GO?.addEventListener('click', () => {
        const id = Number(FIND_INPUT.value);
        if (Number.isFinite(id)) jumpToId(id);
      });

      if (window.ethereum?.on) window.ethereum.on('accountsChanged', () => location.reload());
    } catch (e) {
      console.error('[rarity] init error', e);
      uiError('Failed to initialize rarity view. See console for details.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.FF, window.FF_CFG);
