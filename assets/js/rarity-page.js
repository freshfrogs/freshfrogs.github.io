// assets/js/rarity-page.js
// Rarity list that matches dashboard card visuals (rank pill tiers, staked line),
// and uses the same 128×128 DOM layering from frog-renderer.js

(function(){
  'use strict';

  const FF = window.FF || (window.FF = {});
  const CFG = window.FF_CFG || {};

  // ---------- DOM ----------
  const GRID        = document.getElementById('rarityGrid');
  const BTN_MORE    = document.getElementById('btnMore');
  const BTN_RANK    = document.getElementById('btnSortRank');
  const BTN_SCORE   = document.getElementById('btnSortScore');
  const FIND_INPUT  = document.getElementById('raritySearchId');
  const BTN_GO      = document.getElementById('btnGo');
  if (!GRID) return;

  // ---------- Config ----------
  const JSON_RANKS  = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json'; // [{id, ranking, score}]
  const LOOKUP_FILE = 'assets/freshfrogs_rank_lookup.json';                      // optional
  const PAGE_SIZE   = 60;
  const SIZE        = 128;

  const RESERVOIR = {
    HOST: (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,''),
    KEY:  (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '')
  };
  const RPC_URL = CFG.RPC_URL || '';
  const CONTROLLER_ADDR = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  const HOVER_IMAGE_SKIP = new Set(['Frog','Trait','SpecialFrog']);

  // ---------- CSS (rank pill + green staked like dashboard) ----------
  (function injectCSS(){
    if (document.getElementById('rarity-cards-css')) return;
    const css = `
.frog-cards{ display:grid; gap:10px; }
.frog-card{
  border:1px solid var(--border);
  background:var(--panel);
  border-radius:14px;
  padding:12px;
  display:flex;
  flex-direction:column;
  gap:10px;
  color:inherit;
}
.frog-card .card-body{
  display:grid;
  grid-template-columns:auto 1fr;
  column-gap:12px;
  row-gap:6px;
  align-items:start;
}
.frog-card .thumb-wrap{ width:${SIZE}px; min-width:${SIZE}px; position:relative; border-radius:12px; overflow:hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), 0 6px 12px rgba(0,0,0,.25); background:var(--panel-2); }
.frog-card canvas.frog-canvas{ width:${SIZE}px; height:${SIZE}px; border-radius:12px; display:block; }
.frog-card .title{ margin:0; font-weight:900; font-size:18px; letter-spacing:-.01em; display:flex; align-items:center; gap:8px; }
.frog-card .meta{ color:var(--muted); font-size:12px; }
.frog-card .attr-bullets{ list-style:disc; margin:6px 0 0 18px; padding:0; color:var(--muted); font:400 12px/1.4 var(--font-ui); }
.frog-card .attr-bullets li{ display:list-item; font:inherit; color:inherit; margin:2px 0; transition:color .15s ease, transform .18s ease; }
.frog-card .attr-bullets li[data-hoverable="1"]{ cursor:pointer; }
.frog-card .attr-bullets li[data-hoverable="1"]:hover{ color:var(--fg, #fff); transform:translate3d(4px,-2px,0); }

.rank-pill{
  display:inline-flex; align-items:center; gap:6px;
  border:1px solid var(--border); border-radius:999px; padding:3px 8px;
  font-size:11px; font-weight:700; letter-spacing:.01em;
  background:color-mix(in srgb, var(--panel) 35%, transparent);
}
.rank-pill::before{ content:'◆'; font-size:12px; line-height:1; }
.rank-legendary{ color:#f59e0b; border-color: color-mix(in srgb, #f59e0b 70%, var(--border)); }
.rank-legendary::before{ color:#f59e0b; }
.rank-epic{ color:#a855f7; border-color: color-mix(in srgb, #a855f7 70%, var(--border)); }
.rank-epic::before{ color:#a855f7; }
.rank-rare{ color:#38bdf8; border-color: color-mix(in srgb, #38bdf8 70%, var(--border)); }
.rank-rare::before{ color:#38bdf8; }
.rank-common{ color:inherit; border-color:var(--border); }
.rank-common::before{ color:var(--muted); }

.meta .staked-flag{ color:#22c55e; font-weight:700; }
    `;
    const s=document.createElement('style'); s.id='rarity-cards-css'; s.textContent=css; document.head.appendChild(s);
  })();

  // ---------- Utils ----------
  const asNum = (x)=> { const n = Number(x); return Number.isFinite(n)?n:NaN; };
  const getRankLike = (o)=> asNum(o.rank ?? o.ranking ?? o.position ?? o.place);
  const shortAddr = (a)=> a && typeof a==='string' ? (a.length>10 ? (a.slice(0,6)+'…'+a.slice(-4)) : a) : '—';
  const ownerLabel = (addr, you)=> {
    if (!addr) return '—';
    if (you && addr && you.toLowerCase() === addr.toLowerCase()) return 'You';
    if (typeof addr === 'string' && addr.startsWith('0x')) return shortAddr(addr);
    return addr;
  };
  const traitKey  = (t)=> (t?.key ?? t?.trait_type ?? t?.traitType ?? t?.trait ?? '').toString().trim();
  const traitVal  = (t)=> (t?.value ?? t?.trait_value ?? '').toString().trim();

  // Same thresholds as dashboard (owned-panel.js)
  function rankTier(rank){
    const r = Number(rank);
    if (!Number.isFinite(r)) return 'common';
    const T = (CFG.RARITY_TIERS) || { legendary: 50, epic: 250, rare: 800 };
    if (r <= T.legendary) return 'legendary';
    if (r <= T.epic)      return 'epic';
    if (r <= T.rare)      return 'rare';
    return 'common';
  }
  function rankPill(rank){
    const tier = rankTier(rank);
    const span = document.createElement('span');
    span.className = `rank-pill rank-${tier}`;
    span.textContent = `#${rank}`;
    return span;
  }
  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    const s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    const d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    const h=Math.floor((s%86400)/3600);  if(h>=1) return h+'h ago';
    const m=Math.floor((s%3600)/60);     if(m>=1) return m+'m ago';
    return s+'s ago';
  }

  // owner logic
  async function getUserAddress(){
    try{ if (window.FF_WALLET?.address) return window.FF_WALLET.address; }catch{}
    try{ if (window.ethereum?.request){ const a=await window.ethereum.request({method:'eth_accounts'}); return a?.[0]||null; } }catch{}
    return null;
  }

  // On-chain owner (fallback to Reservoir)
  let _web3,_col,_ctrl,_transfer;
  function getWeb3(){
    if (_web3) return _web3;
    let provider = null;
    if (window.ethereum) provider = window.ethereum;
    else if (Web3.givenProvider) provider = Web3.givenProvider;
    else if (RPC_URL) provider = new Web3.providers.HttpProvider(RPC_URL);
    if (!provider) throw new Error('No web3 provider');
    _web3 = new Web3(provider);
    return _web3;
  }
  function getCollectionContract(){
    if (_col) return _col;
    if (!CFG.COLLECTION_ADDRESS || !window.COLLECTION_ABI) return null;
    _col = new (getWeb3()).eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
    return _col;
  }
  function getControllerContract(){
    if (_ctrl) return _ctrl;
    if (!CFG.CONTROLLER_ADDRESS) return null;
    const abi = Array.isArray(window.CONTROLLER_ABI) ? window.CONTROLLER_ABI : [
      {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
    ];
    _ctrl = new (getWeb3()).eth.Contract(abi, CFG.CONTROLLER_ADDRESS);
    return _ctrl;
  }
  function getTransferContract(){
    if (_transfer) return _transfer;
    if (!CFG.COLLECTION_ADDRESS) return null;
    const abi = [
      {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"}
    ];
    _transfer = new (getWeb3()).eth.Contract(abi, CFG.COLLECTION_ADDRESS);
    return _transfer;
  }
  async function ownerFromContract(id){
    try{ const c=getCollectionContract(); if (!c) return null; return await c.methods.ownerOf(String(id)).call(); }
    catch{ return null; }
  }
  async function ownerFromReservoir(id){
    if (!RESERVOIR.KEY || !CFG.COLLECTION_ADDRESS) return null;
    const url = `${RESERVOIR.HOST}/owners/v2?tokens=${encodeURIComponent(`${CFG.COLLECTION_ADDRESS}:${id}`)}&limit=1`;
    try{
      const r = await fetch(url, { headers: { accept:'application/json', 'x-api-key': RESERVOIR.KEY } });
      if (!r.ok) return null;
      const j = await r.json();
      const own = j?.owners?.[0]?.owner;
      return (typeof own==='string' && own.startsWith('0x')) ? own : null;
    }catch{ return null; }
  }
  function toMs(value){
    if (value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n > 1e12 ? n : n * 1000;
  }

  const stakerCache = new Map();
  async function stakerAddressFromContract(id){
    const numId = Number(id);
    if (!Number.isFinite(numId)) return null;
    const cached = stakerCache.get(numId);
    if (cached !== undefined) return cached instanceof Promise ? await cached : cached;
    const prom = (async()=>{
      try{
        const ctrl = getControllerContract();
        if (!ctrl) return null;
        const who = await ctrl.methods.stakerAddress(String(numId)).call();
        if (!who || who === ZERO_ADDR) return null;
        return who;
      }catch{ return null; }
    })();
    stakerCache.set(numId, prom);
    const res = await prom;
    stakerCache.set(numId, res ?? null);
    return res;
  }

  async function stakeSinceFromAdapters(id){
    const S = window.FF?.staking || window.FF_STAKING || window.STAKING_ADAPTER || {};
    try{
      if (typeof S.getStakeSince === 'function'){
        return toMs(await S.getStakeSince(id));
      }
      if (typeof S.getStakeInfo === 'function'){
        const info = await S.getStakeInfo(id);
        const sec = info?.since ?? info?.stakedAt ?? info?.timestamp ?? info?.sinceSeconds;
        return toMs(sec);
      }
      if (typeof S.stakeSince === 'function'){
        return toMs(await S.stakeSince(id));
      }
    }catch{}
    return null;
  }

  const stakeEventCache = new Map();
  async function stakeSinceViaEvents(id){
    const numId = Number(id);
    if (!Number.isFinite(numId)) return null;
    const cached = stakeEventCache.get(numId);
    if (cached !== undefined) return cached instanceof Promise ? await cached : cached;
    const prom = (async()=>{
      try{
        const contract = getTransferContract();
        if (!contract || !CFG.CONTROLLER_ADDRESS) return null;
        const fromBlock = Number(CFG.CONTROLLER_DEPLOY_BLOCK) || 0;
        const events = await contract.getPastEvents('Transfer', {
          filter: { to: CFG.CONTROLLER_ADDRESS, tokenId: String(numId) },
          fromBlock,
          toBlock: 'latest'
        });
        if (!events.length) return null;
        const last = events[events.length - 1];
        const block = await getWeb3().eth.getBlock(last.blockNumber);
        const ts = Number(block?.timestamp);
        return Number.isFinite(ts) ? ts * 1000 : null;
      }catch{ return null; }
    })();
    stakeEventCache.set(numId, prom);
    const res = await prom;
    stakeEventCache.set(numId, res ?? null);
    return res;
  }

  // staking info (reuses any adapter if present)
  async function fetchStakeInfo(id, onchainOwner){
    const out = { staked:false, sinceMs:null, owner:null };

    const stakingApi = window.FF?.staking || window.FF_STAKING || window.STAKING_ADAPTER || {};
    try{
      if (typeof stakingApi.getStakeInfo === 'function'){
        const info = await stakingApi.getStakeInfo(id);
        if (info && typeof info === 'object'){
          if (info.staked != null) out.staked = !!info.staked;
          const owner = info.owner ?? info.staker ?? info.wallet ?? info.account ?? info.address;
          if (owner && owner !== ZERO_ADDR) out.owner = owner;
          const ms = toMs(info.since ?? info.stakedAt ?? info.timestamp ?? info.sinceSeconds);
          if (ms) out.sinceMs = ms;
        }
      }
    }catch{}

    if (!out.sinceMs){
      const ms = await stakeSinceFromAdapters(id);
      if (ms) out.sinceMs = ms;
    }

    if (!out.owner){
      const staker = await stakerAddressFromContract(id);
      if (staker) out.owner = staker;
    }

    if (!out.staked){
      if (out.owner) out.staked = true;
      else if (onchainOwner && CONTROLLER_ADDR && String(onchainOwner).toLowerCase() === CONTROLLER_ADDR) out.staked = true;
    }

    if (out.staked && !out.sinceMs){
      const viaEvents = await stakeSinceViaEvents(id);
      if (viaEvents) out.sinceMs = viaEvents;
    }

    return out;
  }

  // metadata
  async function fetchMeta(id){
    const tries = [
      `frog/json/${id}.json`,
      `frog/${id}.json`,
      `assets/frogs/${id}.json`
    ];
    for (const u of tries){
      try{ const r=await fetch(u,{cache:'no-store'}); if (r.ok) return await r.json(); }catch{}
    }
    return { name:`Frog #${id}`, attributes:[] };
  }

  // ---------- Rankings ----------
  async function fetchJSON(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(r.status); return r.json(); }
  function normalizeRankingsArray(arr){
    return arr.map(x => ({
      id:   asNum(x.id ?? x.tokenId ?? x.token_id ?? x.frogId ?? x.frog_id),
      rank: getRankLike(x),
      score: asNum(x.score ?? x.rarityScore ?? x.points ?? 0)
    }))
    .filter(r => Number.isFinite(r.id) && Number.isFinite(r.rank) && r.rank>0)
    .sort((a,b)=>a.rank-b.rank);
  }
  async function loadRankings(){
    const primary = await fetchJSON(JSON_RANKS).catch(()=>[]);
    let rows = Array.isArray(primary) ? normalizeRankingsArray(primary) : [];
    if (!rows.length){
      // optional lookup fallback
      try{
        const j = await fetchJSON(LOOKUP_FILE);
        if (j && typeof j === 'object'){
          rows = Object.entries(j).map(([rk,id])=>({ id: asNum(id), rank: asNum(rk), score: 0 }))
                  .filter(r=>Number.isFinite(r.id)&&Number.isFinite(r.rank))
                  .sort((a,b)=>a.rank-b.rank);
        }
      }catch{}
    }
    return rows;
  }

  // ---------- Card ----------
  function buildCard(rec, userAddr){
    const { id, rank, meta, owner, stake } = rec;

    const card = document.createElement('article');
    card.className = 'frog-card';
    card.setAttribute('data-token-id', String(id));

    const body = document.createElement('div');
    body.className = 'card-body';

    const media = document.createElement('div');
    media.className = 'thumb-wrap';
    const cv = document.createElement('canvas');
    cv.className = 'frog-canvas'; cv.width = SIZE; cv.height = SIZE;
    media.appendChild(cv);

    const info = document.createElement('div');

    const title = document.createElement('h4');
    title.className = 'title';
    title.textContent = meta?.name || `Frog #${id}`;
    const pill = rankPill(rank);
    title.appendChild(pill);

    const metaLine = document.createElement('div');
    metaLine.className = 'meta';
    const stakeInfo = Object.assign({ staked:false, sinceMs:null, owner:null }, stake);
    const fallbackOwner = (typeof owner === 'string' && owner) ? owner : '';
    if (!stakeInfo.owner && fallbackOwner) stakeInfo.owner = fallbackOwner;
    const resolvedOwner = (typeof stakeInfo.owner === 'string' && stakeInfo.owner) ? stakeInfo.owner : fallbackOwner;
    const ownerText = ownerLabel(resolvedOwner, userAddr);

    const stakeSpan = document.createElement('span');
    if (stakeInfo.staked) {
      const ago = stakeInfo.sinceMs ? fmtAgo(stakeInfo.sinceMs) : null;
      stakeSpan.className = 'staked-flag';
      stakeSpan.textContent = ago ? `Staked ${ago}` : 'Staked';
    } else {
      stakeSpan.textContent = 'Not staked';
    }
    const sep = document.createElement('span'); sep.textContent = ' • ';
    const ownerSpan = document.createElement('span');
    ownerSpan.textContent = `Owned by ${ownerText}`;

    metaLine.appendChild(stakeSpan);
    metaLine.appendChild(sep);
    metaLine.appendChild(ownerSpan);

    const list = document.createElement('ul');
    list.className = 'attr-bullets';
    const attrs = Array.isArray(meta?.attributes) ? meta.attributes.slice() : [];
    attrs.forEach(a => {
      const k = traitKey(a), v = traitVal(a);
      if (!k || !v) return;
      const li = document.createElement('li');
      li.innerHTML = `<b>${k}:</b> ${v}`;
      li.setAttribute('data-attr-key', k);
      const allowLift = HOVER_IMAGE_SKIP.has(k) ? '0' : '1';
      li.setAttribute('data-hoverable', '1');
      li.setAttribute('data-hover-image', allowLift);
      list.appendChild(li);
    });

    info.appendChild(title);
    info.appendChild(metaLine);
    if (list.childNodes.length) info.appendChild(list);

    body.appendChild(media);
    body.appendChild(info);
    card.appendChild(body);

    const metaSource = rec.metaRaw || meta;
    let rendererReady = typeof FF.renderFrog === 'function';
    let currentHover = '';
    let renderToken = 0;

    function mountFallback(){
      if (media.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = `frog/${id}.png`;
      img.alt = String(id);
      img.className = 'frog-canvas';
      media.innerHTML = '';
      media.appendChild(img);
    }

    async function render(hoverKey){
      const token = ++renderToken;
      if (!rendererReady){
        mountFallback();
        return;
      }
      try{
        await FF.renderFrog(cv, metaSource, { size: SIZE, tokenId: id, hoverKey });
        if (token !== renderToken) return;
      }catch{
        rendererReady = false;
        mountFallback();
      }
    }

    render('');

    if (rendererReady && list.childNodes.length){
      list.addEventListener('mousemove', (e)=>{
        const li = e.target.closest('li[data-attr-key]'); if(!li) return;
        const hoverable = li.getAttribute('data-hoverable') === '1';
        const allowImage = li.getAttribute('data-hover-image') !== '0';
        const key = (hoverable && allowImage) ? (li.getAttribute('data-attr-key') || '') : '';
        if (key !== currentHover){
          currentHover = key;
          render(key);
        }
      });
      list.addEventListener('mouseleave', ()=>{
        if (currentHover){
          currentHover = '';
          render('');
        }
      });
    }

    return card;
  }

  // ---------- Paging / render ----------
  let rows=[], view=[], offset=0, sortMode='rank';
  function ensureMoreBtn(){ if (BTN_MORE) BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none'; }
  function clearGrid(){ GRID.innerHTML=''; GRID.classList.add('frog-cards'); }

  async function loadMore(userAddr){
    const slice = view.slice(offset, offset + PAGE_SIZE);
    if (!slice.length) { ensureMoreBtn(); return; }

    const metas  = await Promise.all(slice.map(x => fetchMeta(x.id)));
    const onchainOwners = await Promise.all(slice.map(x => ownerFromContract(x.id)));
    const owners = await Promise.all(slice.map((x, idx) => {
      const onchain = onchainOwners[idx];
      if (onchain && CONTROLLER_ADDR && String(onchain).toLowerCase() === CONTROLLER_ADDR) {
        return ownerFromReservoir(x.id);
      }
      return onchain || ownerFromReservoir(x.id);
    }));
    const stakes = await Promise.all(slice.map((x, idx) => fetchStakeInfo(x.id, onchainOwners[idx])));

    for (let i=0;i<slice.length;i++){
      slice[i].meta = metas[i];
      slice[i].metaRaw = metas[i]; // pass through for renderer
      const stakeInfo = Object.assign({ staked:false, sinceMs:null, owner:null }, stakes[i]);
      const fallbackOwner = owners[i] || onchainOwners[i] || null;
      if (!stakeInfo.owner && fallbackOwner) stakeInfo.owner = fallbackOwner;
      const resolvedOwner = stakeInfo.owner || fallbackOwner || null;
      slice[i].owner = resolvedOwner;
      slice[i].stake = stakeInfo;
    }

    const frag=document.createDocumentFragment();
    slice.forEach(rec => frag.appendChild(buildCard(rec, userAddr)));
    GRID.appendChild(frag);

    offset += slice.length;
    ensureMoreBtn();
  }

  function resort(userAddr){
    view.sort((a,b)=> sortMode==='rank'
      ? (a.rank - b.rank)
      : ((b.score - a.score) || (a.rank - b.rank))
    );
    offset = 0; clearGrid(); loadMore(userAddr);
  }

  function jumpToId(id, userAddr){
    const ix = view.findIndex(x => x.id === id);
    if (ix < 0) return;
    offset = Math.floor(ix / PAGE_SIZE) * PAGE_SIZE;
    clearGrid(); loadMore(userAddr);
  }

  // ---------- Init ----------
  (async function init(){
    try{
      rows = await loadRankings();
      if (!rows.length){
        GRID.innerHTML = `<div class="pg-muted" style="padding:10px">Could not load rarity data. Check JSON files and try a hard refresh.</div>`;
        return;
      }
      view = rows.slice();
      offset = 0; clearGrid();

      const userAddr = await getUserAddress();
      await loadMore(userAddr);
      BTN_MORE && (BTN_MORE.style.display = 'inline-flex');

      BTN_MORE?.addEventListener('click', () => loadMore(userAddr));
      BTN_RANK?.addEventListener('click', ()=>{ sortMode='rank'; resort(userAddr); });
      BTN_SCORE?.addEventListener('click', ()=>{ sortMode='score'; resort(userAddr); });
      BTN_GO?.addEventListener('click', ()=>{
        const id = Number(FIND_INPUT.value);
        if (Number.isFinite(id)) jumpToId(id, userAddr);
      });

      if (window.ethereum?.on) window.ethereum.on('accountsChanged', ()=> location.reload());
    }catch(e){
      console.error('[rarity] init failed', e);
      GRID.innerHTML = `<div class="pg-muted" style="padding:10px">Failed to initialize rarity view.</div>`;
    }
  })();

})();
