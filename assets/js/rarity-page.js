// assets/js/rarity-page.js
// Rarity list that matches dashboard card visuals (rank pill tiers, staked line),
// and uses the same 128×128 DOM layering from frog-renderer.js

(function(FF = window.FF || {}, CFG = window.FF_CFG || {}) {
  'use strict';

  // ---------- DOM ----------
  const GRID       = document.getElementById('rarityGrid');
  const BTN_MORE   = document.getElementById('btnMore');
  const BTN_RANK   = document.getElementById('btnSortRank');
  const BTN_SCORE  = document.getElementById('btnSortScore');
  const FIND_INPUT = document.getElementById('raritySearchId');
  const BTN_GO     = document.getElementById('btnGo');
  if (!GRID) return;

  // ---------- Config ----------
  const JSON_RANKS  = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json'; // [{id, ranking, score}]
  const LOOKUP_FILE = 'assets/freshfrogs_rank_lookup.json';                      // optional
  const PAGE_SIZE   = 60;

  const RESERVOIR = {
    HOST: (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,''),
    KEY:  (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '')
  };

  // ---------- CSS (rank pill + green staked like dashboard) ----------
  (function injectCSS(){
    if (document.getElementById('rarity-cards-css')) return;
    const css = `
.frog-cards{ display:grid; gap:10px; }
.meta .staked-flag{ color:#22c55e; font-weight:700; }
.rank-pill{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:999px; padding:3px 8px; font-size:11px; font-weight:700; letter-spacing:.01em; background:color-mix(in srgb, var(--panel) 35%, transparent); }
.rank-pill::before{ content:'◆'; font-size:12px; line-height:1; }
.rank-legendary{ color:#f59e0b; border-color: color-mix(in srgb, #f59e0b 70%, var(--border)); }
.rank-legendary::before{ color:#f59e0b; }
.rank-epic{ color:#a855f7; border-color: color-mix(in srgb, #a855f7 70%, var(--border)); }
.rank-epic::before{ color:#a855f7; }
.rank-rare{ color:#38bdf8; border-color: color-mix(in srgb, #38bdf8 70%, var(--border)); }
.rank-rare::before{ color:#38bdf8; }
.rank-common{ color:inherit; border-color:var(--border); }
.rank-common::before{ color:var(--muted); }
    `;
    const s=document.createElement('style'); s.id='rarity-cards-css'; s.textContent=css; document.head.appendChild(s);
  })();

  // ---------- Utils ----------
  const asNum = (x)=> { const n = Number(x); return Number.isFinite(n)?n:NaN; };
  const getRankLike = (o)=> asNum(o.rank ?? o.ranking ?? o.position ?? o.place);
  const shortAddr = (a)=> a && typeof a==='string' ? (a.length>10 ? (a.slice(0,6)+'…'+a.slice(-4)) : a) : '—';
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
  let _web3,_col;
  function getWeb3(){ if (_web3) return _web3; _web3 = new Web3(window.ethereum || Web3.givenProvider || ""); return _web3; }
  function getCollectionContract(){
    if (_col) return _col;
    if (!CFG.COLLECTION_ADDRESS || !window.COLLECTION_ABI) return null;
    _col = new (getWeb3()).eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
    return _col;
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
  async function fetchOwnerOf(id){
    const onchain = await ownerFromContract(id);
    if (onchain) return onchain;
    const api = await ownerFromReservoir(id);
    return api || null;
  }

  // staking info (reuses any adapter if present)
  async function fetchStakeInfo(id){
    try {
      if (FF.staking?.getStakeInfo) return await FF.staking.getStakeInfo(id);
      if (window.STAKING_ADAPTER?.getStakeInfo) return await window.STAKING_ADAPTER.getStakeInfo(id);
    } catch {}
    return { staked:false, since:null };
  }
  const sinceMs = (sec)=> {
    if (sec==null) return null;
    const n = Number(sec); if (!Number.isFinite(n)) return null;
    return n > 1e12 ? n : n*1000;
  };

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
  function attrsForCard(meta){
    const src = Array.isArray(meta?.attributes) ? meta.attributes : [];
    return src.map(a => ({ key: traitKey(a), value: traitVal(a) }))
      .filter(a => a.key && a.value != null);
  }

  function metaLineForCard(it){
    const owner = it.ownerLabel || it.ownerShort || (it.owner ? shortAddr(it.owner) : 'Unknown');
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return `<span class="staked-flag">Staked</span>${ago ? ` ${ago}` : ''} by ${owner}`;
    }
    return `Owned by ${owner}`;
  }

  function buildCard(rec, userAddr){
    const meta = rec.metaRaw || rec.meta || {};
    const ownerAddr = rec.owner || null;
    const me = userAddr && ownerAddr && userAddr.toLowerCase() === ownerAddr.toLowerCase();
    const ownerLabel = me ? 'You' : (ownerAddr ? shortAddr(ownerAddr) : 'Unknown');

    const item = {
      id: rec.id,
      rank: rec.rank,
      attrs: attrsForCard(meta),
      staked: !!(rec.stake && rec.stake.staked),
      sinceMs: sinceMs(rec.stake?.since),
      owner: ownerAddr,
      ownerLabel,
      ownerShort: ownerLabel,
      metaRaw: meta
    };

    if (window.FF && typeof window.FF.buildFrogCard === 'function'){
      return window.FF.buildFrogCard(item, {
        showActions: false,
        rarityTiers: CFG.RARITY_TIERS,
        levelSeconds: Number(CFG.STAKE_LEVEL_SECONDS || (30 * 86400)),
        metaLine: metaLineForCard
      });
    }

    const fallback = document.createElement('article');
    fallback.className = 'frog-card';
    fallback.textContent = `Frog #${rec.id}`;
    return fallback;
  }

  // ---------- Paging / render ----------
  let rows=[], view=[], offset=0, sortMode='rank';
  function ensureMoreBtn(){ if (BTN_MORE) BTN_MORE.style.display = offset < view.length ? 'inline-flex' : 'none'; }
  function clearGrid(){ GRID.innerHTML=''; GRID.classList.add('frog-cards'); }

  async function loadMore(userAddr){
    const slice = view.slice(offset, offset + PAGE_SIZE);
    if (!slice.length) { ensureMoreBtn(); return; }

    const metas  = await Promise.all(slice.map(x => fetchMeta(x.id)));
    const owners = await Promise.all(slice.map(x => fetchOwnerOf(x.id)));
    const stakes = await Promise.all(slice.map(x => fetchStakeInfo(x.id)));

    for (let i=0;i<slice.length;i++){
      slice[i].meta = metas[i];
      slice[i].metaRaw = metas[i]; // pass through for renderer
      slice[i].owner = owners[i] || null;
      slice[i].stake = stakes[i] || {staked:false, since:null};
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

})(window.FF, window.FF_CFG);
