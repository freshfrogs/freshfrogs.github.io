// assets/js/rarity-page.js
// Rarity page that matches dashboard cards + layered frog rendering.
//
// Data files (your shapes):
//   - assets/freshfrogs_rarity_rankings.json   => [{ id, ranking, score }, ...]
//   - assets/freshfrogs_rank_lookup.json       => { "rank": id, ... }  (rank -> id)
//
// Rendering:
//   - Title:  "Frog #123  [Rank #XYZ]"
//   - Subtitle: "Staked Xd ago / Not staked • Owned by 0x…"
//   - Attributes list visible
//   - Image: original frog PNG used only as background color;
//            frog rebuilt by layering trait PNGs from frog/build_files/{TRAIT}/{VALUE}.png
//
// Dependencies expected (already used in your project):
//   - web3
//   - window.COLLECTION_ABI
//   - CFG.{COLLECTION_ADDRESS, ...}
//   - optional: window.STAKING_ADAPTER (getStakeInfo)
//   - optional: window.FF_renderFrogCard (ignored for image because we custom layer here)

(function(FF = window.FF || {}, CFG = window.CFG || {}) {
  const GRID = document.getElementById('rarityGrid');
  const BTN_MORE  = document.getElementById('btnMore');
  const BTN_RANK  = document.getElementById('btnSortRank');
  const BTN_SCORE = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO = document.getElementById('btnGo');
  if (!GRID) return;

  // ---- Config ----
  const PRIMARY_RANK_FILE = 'assets/freshfrogs_rarity_rankings.json';
  const LOOKUP_FILE       = 'assets/freshfrogs_rank_lookup.json';
  const PAGE = 60;

  // where trait layer PNGs live; adjust if needed
  const LAYER_BASE = (CFG.LAYER_BASE || 'frog/build_files'); // ex: frog/build_files/{TRAIT}/{VALUE}.png
  const CANVAS_SIZE = 128; // matches dashboard thumb

  // sensible default z-order; unknown traits go last but before FX
  const LAYER_ORDER = [
    'Body','Base','Skin','Torso','Belly',
    'Mouth','Eyes','Nose','Ears',
    'Clothes','Shirt','Jacket','Hoodie','Armor',
    'Accessory','Glasses','Mask',
    'Hat','Headwear','Crown',
    'Held','Hand','Weapon',
    'BackgroundFX','FX'
  ];

  // ---- State ----
  let all = [];     // [{id, rank, score}]
  let view = [];
  let offset = 0;
  let sortMode = 'rank';
  let lookupMap = null; // Map(id -> {rank, score})

  // ---- Utils ----
  function uiError(msg){ GRID.innerHTML = `<div class="pg-muted" style="padding:10px">${msg}</div>`; }
  function clearGrid(){ GRID.innerHTML = ''; }
  function ensureMoreBtn(){ if (BTN_MORE) BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none'; }
  function asNum(x){ const n = Number(x); return Number.isFinite(n) ? n : NaN; }
  function getRankLike(o){ return asNum(o.rank ?? o.ranking ?? o.position ?? o.place); }
  function shortAddr(a){ if (!a || typeof a!=='string') return '—'; return a.length>10 ? (a.slice(0,6)+'…'+a.slice(-4)) : a; }

  function sanitizePart(s){
    // keep your filenames happy: trim, collapse spaces, replace spaces & slashes
    return String(s || '')
      .trim()
      .replaceAll('/', '-')
      .replace(/\s+/g, '_');
  }

  function traitKey(t){ return (t?.trait_type ?? t?.traitType ?? t?.trait ?? '').trim(); }
  function traitVal(t){ return (t?.value ?? t?.trait_value ?? '').toString().trim(); }

  function layerPath(traitType, value){
    // frog/build_files/{TRAIT}/{VALUE}.png
    return `${LAYER_BASE}/${sanitizePart(traitType)}/${sanitizePart(value)}.png`;
  }

  function sortByLayerOrder(attributes){
    const orderIndex = new Map(LAYER_ORDER.map((k,i)=>[k.toLowerCase(), i]));
    return attributes.slice().sort((a,b)=>{
      const ak = traitKey(a).toLowerCase(), bk = traitKey(b).toLowerCase();
      const ai = orderIndex.has(ak) ? orderIndex.get(ak) : 999;
      const bi = orderIndex.has(bk) ? orderIndex.get(bk) : 999;
      if (ai !== bi) return ai - bi;
      // tie-breaker: stable by trait name then value
      const an = ak.localeCompare(bk); if (an) return an;
      return traitVal(a).localeCompare(traitVal(b));
    });
  }

  // ---- Web3 helpers ----
  let _web3, _col;
  function getWeb3(){
    if (_web3) return _web3;
    _web3 = new Web3(window.ethereum || Web3.givenProvider || "");
    return _web3;
  }
  function getCollectionContract(){
    if (_col) return _col;
    if (!CFG.COLLECTION_ADDRESS || !window.COLLECTION_ABI) return null;
    _col = new (getWeb3()).eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
    return _col;
  }
  async function fetchOwnerOf(id){
    try { const c = getCollectionContract(); if (!c) return null; return await c.methods.ownerOf(String(id)).call(); }
    catch { return null; }
  }
  async function fetchStakeInfo(id){
    try {
      if (window.FF_getStakeInfo) return await window.FF_getStakeInfo(id);
      if (window.STAKING_ADAPTER?.getStakeInfo) return await window.STAKING_ADAPTER.getStakeInfo(id);
    } catch {}
    return { staked:false, since:null };
  }
  function daysAgoFromUnix(since){
    if (!since) return null;
    const ms = Number(since) * 1000; if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.floor((Date.now() - ms) / 86400e3));
  }

  // ---- Fetches ----
  async function fetchJson(url){
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }
  async function fetchMeta(id){
    const tries = [
      `frog/json/${id}.json`,
      `frog/${id}.json`,
      `assets/frogs/${id}.json`
    ];
    for (const u of tries){
      try { const r = await fetch(u, {cache:'no-store'}); if (r.ok) return await r.json(); } catch {}
    }
    return { name:`Frog #${id}`, image:`frog/${id}.png`, attributes:[] };
  }

  // ---- Rankings loaders ----
  function parseRankToIdMap(obj){
    const m = new Map();
    for (const k of Object.keys(obj||{})){
      const rank = asNum(k), id = asNum(obj[k]);
      if (Number.isFinite(rank) && Number.isFinite(id)) m.set(id, {rank, score:0});
    }
    return m.size ? m : null;
  }
  async function loadLookup(){
    try {
      const j = await fetchJson(LOOKUP_FILE);
      if (Array.isArray(j)){
        const m = new Map();
        for (let i=0;i<j.length;i++){
          const id = asNum(j[i]);
          if (Number.isFinite(id)) m.set(id, {rank: i+1, score:0});
        }
        lookupMap = m.size ? m : null;
      } else if (j && typeof j === 'object'){
        lookupMap = parseRankToIdMap(j);
      } else lookupMap = null;
    } catch { lookupMap = null; }
  }

  function normalizeRankingsArray(arr){
    return arr.map(x => ({
      id:   asNum(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
      rank: getRankLike(x),
      score: asNum(x.score ?? x.rarityScore ?? x.points ?? 0)
    }))
    .filter(r => Number.isFinite(r.id) && Number.isFinite(r.rank) && r.rank>0)
    .sort((a,b)=>a.rank-b.rank);
  }
  async function loadPrimaryRanks(){
    try {
      const j = await fetchJson(PRIMARY_RANK_FILE);
      if (Array.isArray(j)) {
        let arr = normalizeRankingsArray(j);
        if (lookupMap){
          for (const r of arr){
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
    } catch { return []; }
  }

  // ---- Layered Frog Renderer ----
  function buildLayeredFrog(meta, id){
    // Outer wrap matches 128x128 thumb footprint
    const wrap = document.createElement('div');
    wrap.style.width = `${CANVAS_SIZE}px`;
    wrap.style.height = `${CANVAS_SIZE}px`;
    wrap.style.position = 'relative';
    wrap.style.gridRow = 'span 3';
    wrap.className = 'img-wrap';

    // 1) Use full PNG as CSS background, but scaled & offset so only bg color shows
    //    We assume frog/{id}.png has a solid background area.
    wrap.style.backgroundImage = `url(frog/${id}.png)`;
    wrap.style.backgroundRepeat = 'no-repeat';
    wrap.style.backgroundSize = '280% 280%';       // scale up
    wrap.style.backgroundPosition = '120% 120%';   // push down/right

    // 2) Layer each trait image as <img>, absolutely positioned
    const attrs = Array.isArray(meta?.attributes) ? sortByLayerOrder(meta.attributes) : [];
    for (const a of attrs){
      const t = traitKey(a), v = traitVal(a);
      if (!t || !v) continue;

      const src = layerPath(t, v);
      const img = new Image();
      img.alt = `${t}: ${v}`;
      img.src = src;
      img.loading = 'lazy';
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top = '0';
      img.style.width = `${CANVAS_SIZE}px`;
      img.style.height = `${CANVAS_SIZE}px`;
      img.style.imageRendering = 'pixelated';
      img.decoding = 'async';
      img.onerror = () => { img.remove(); }; // if a layer is missing, just skip

      wrap.appendChild(img);
    }

    return wrap;
  }

  // ---- Card Builder (dashboard-style, with our layered image) ----
  function buildCard(rec){
    const { id, rank, score, meta, owner, stake } = rec;
    const stakedDays = daysAgoFromUnix(stake?.since);
    const ownerLine = `${stake?.staked && stakedDays!=null ? `Staked ${stakedDays}d ago` : 'Not staked'} • Owned by ${shortAddr(owner)}`;

    // Build card (matching your dashboard markup & tone)
    const card = document.createElement('div');
    card.className = 'frog-card';

    // Layered image block
    const layered = buildLayeredFrog(meta, id);

    // Title with rank pill
    const title = document.createElement('h4');
    title.className = 'title';
    const tName = document.createElement('span');
    tName.textContent = meta?.name || `Frog #${id}`;
    const tRank = document.createElement('span');
    tRank.className = 'pill';
    tRank.textContent = `Rank #${rank}`;
    title.appendChild(tName);
    title.appendChild(tRank);

    // Subtitle line (staking/owner)
    const sub = document.createElement('div');
    sub.className = 'meta';
    sub.textContent = ownerLine;

    // Attributes inline list
    const attrsLine = document.createElement('div');
    attrsLine.className = 'meta';
    if (Array.isArray(meta?.attributes) && meta.attributes.length){
      const parts = meta.attributes.map(a => {
        const k = traitKey(a), v = traitVal(a);
        return (k && v) ? `${k}: ${v}` : '';
      }).filter(Boolean);
      attrsLine.textContent = parts.join(' • ');
    } else {
      attrsLine.textContent = '';
    }

    // Actions
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

    // Compose card
    card.appendChild(layered);
    card.appendChild(title);
    card.appendChild(sub);
    if (attrsLine.textContent) card.appendChild(attrsLine);
    card.appendChild(actions);
    return card;
  }

  // ---- Paging / render loop ----
  async function loadMore(){
    const slice = view.slice(offset, offset + PAGE);
    if (!slice.length){ ensureMoreBtn(); return; }

    // fetch meta, owner, staking in parallel
    const metas  = await Promise.all(slice.map(x => fetchMeta(x.id)));
    const owners = await Promise.all(slice.map(x => fetchOwnerOf(x.id)));
    const stakes = await Promise.all(slice.map(x => fetchStakeInfo(x.id)));
    for (let i=0;i<slice.length;i++){
      slice[i].meta  = metas[i];
      slice[i].owner = owners[i] || null;
      slice[i].stake = stakes[i] || {staked:false, since:null};
    }

    const frag = document.createDocumentFragment();
    slice.forEach(rec => frag.appendChild(buildCard(rec)));
    GRID.appendChild(frag);
    offset += slice.length;
    ensureMoreBtn();
  }

  function resort(){
    view.sort((a,b)=> sortMode==='rank'
      ? (a.rank - b.rank)
      : ((b.score - a.score) || (a.rank - b.rank))
    );
    offset = 0; clearGrid(); loadMore();
  }

  function jumpToId(id){
    const ix = view.findIndex(x => x.id === id);
    if (ix < 0) return;
    offset = Math.floor(ix / PAGE) * PAGE;
    clearGrid(); loadMore();
  }

  // ---- Init ----
  (async function init(){
    try {
      // Build lookup (rank->id -> id->rank)
      await loadLookup();

      // Primary rankings
      let primary = await loadPrimaryRanks(); // expects array with {id, ranking, score}
      if (!primary.length && lookupMap?.size){
        // fallback to lookup only
        primary = Array.from(lookupMap, ([id,v])=>({id, rank:v.rank, score:v.score||0}))
                   .sort((a,b)=>a.rank-b.rank);
      }
      if (!primary.length){
        uiError('Could not load rarity data. Check JSON files and try a hard refresh.');
        return;
      }

      all = primary.slice();
      view = all.slice();
      offset = 0;
      clearGrid();
      await loadMore();
      if (BTN_MORE) BTN_MORE.style.display = 'inline-flex';

      // UI
      BTN_MORE?.addEventListener('click', loadMore);
      BTN_RANK?.addEventListener('click', ()=>{ sortMode='rank'; resort(); });
      BTN_SCORE?.addEventListener('click', ()=>{ sortMode='score'; resort(); });
      BTN_GO?.addEventListener('click', ()=>{
        const id = Number(FIND_INPUT.value);
        if (Number.isFinite(id)) jumpToId(id);
      });
    } catch (e) {
      console.error('[rarity] init error', e);
      uiError('Failed to initialize rarity view.');
    }
  })();
})(window.FF, window.CFG);
