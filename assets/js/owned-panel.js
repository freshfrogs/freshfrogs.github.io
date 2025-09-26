// assets/js/owned-panel.js
// Shows owned frogs (Reservoir) + staked frogs (if Web3+controller ABI are available).
// Visuals are identical to your original cards. No HUD, no extra chrome.

(function(){
  'use strict';

  const C    = window.FF_CFG || {};
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';

  const GRID = document.getElementById('ownedGrid');
  const BTN  = document.getElementById('ownedConnectBtn');
  const MORE = document.getElementById('ownedMore');
  if (!GRID) return;

  // ---------- Small helpers ----------
  const headers = { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) };
  const imgSrc  = (id)=> (C.SOURCE_PATH || '') + `/frog/${id}.png`;

  function setLoading(show, text){
    if (!MORE) return;
    MORE.style.display = show ? 'block' : 'none';
    MORE.textContent   = show ? (text || 'Loading more…') : '';
  }

  function renderCard(id, metaText){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${imgSrc(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">${metaText || 'Owned by You'}</div>
      <div class="actions"></div>
    `;
    return el;
  }

  // ---------- Owned (Reservoir) ----------
  async function fetchOwnedPage(owner, continuation=null, limit=20){
    const qs = new URLSearchParams({
      collection: C.COLLECTION_ADDRESS,
      limit: String(limit),
      includeAttributes: 'false',
      includeTopBid: 'false',
      sortBy: 'acquiredAt',
      sortDirection: 'desc'
    });
    if (continuation) qs.set('continuation', continuation);
    const url = `${HOST}/users/${owner}/tokens/v8?${qs}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();
    const items = (j.tokens || []).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    return { items, continuation: j.continuation || null };
  }

  // ---------- Staked (on-chain, optional) ----------
  function canUseWeb3(){
    return !!(window.Web3 && (window.ethereum || C.RPC_URL) && window.CONTROLLER_ABI && C.CONTROLLER_ADDRESS);
  }
  function getWeb3(){
    try{
      const provider = window.ethereum || (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : null);
      if (!provider) return null;
      return new window.Web3(provider);
    }catch{ return null; }
  }
  function normalizeIds(arr){
    if (!Array.isArray(arr)) return [];
    if (arr.length && typeof arr[0] === 'object'){
      if ('tokenId' in arr[0]) return arr.map(x => Number(x.tokenId));
      if ('id' in arr[0])      return arr.map(x => Number(x.id));
    }
    return arr.map(x => Number(x));
  }
  async function tryCallStaked(contract, method, addr){
    if (!contract.methods[method]) return null;
    try{ return normalizeIds(await contract.methods[method](addr).call()); }
    catch{ return null; }
  }
  async function fetchStakedIds(owner){
    if (!canUseWeb3()) return [];
    const web3 = getWeb3(); if (!web3) return [];
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);

    // Try common/readable method names in order
    const candidates = [
      'getStakedTokens',
      'stakedTokensOf',
      'stakedOf',
      'depositsOf',
      'tokensOfOwner',
      'getUserTokens',
      'getUserStakedTokens'
    ];
    for (const m of candidates){
      const out = await tryCallStaked(controller, m, owner);
      if (out && out.length) return out.filter(Number.isFinite);
    }

    // Fallback: nothing found
    return [];
  }

  // ---------- Flow ----------
  let state = { addr:null, cont:null, busy:false, seen:new Set() };

  async function loadFirst(addr){
    GRID.innerHTML = '';
    setLoading(true, 'Loading…');
    state.seen.clear();

    try{
      // 1) Staked first (if available)
      let stakedIds = [];
      try { stakedIds = await fetchStakedIds(addr); } catch { stakedIds = []; }
      if (stakedIds.length){
        const fragS = document.createDocumentFragment();
        stakedIds.forEach(id => {
          if (state.seen.has(id)) return;
          state.seen.add(id);
          fragS.appendChild(renderCard(id, 'Staked • Owned by You'));
        });
        GRID.appendChild(fragS);
      }

      // 2) Owned page 1
      const page = await fetchOwnedPage(addr, null, 20);
      state.cont = page.continuation || null;

      const fragO = document.createDocumentFragment();
      (page.items || []).forEach(id => {
        if (state.seen.has(id)) return;
        state.seen.add(id);
        fragO.appendChild(renderCard(id, 'Owned by You'));
      });
      GRID.appendChild(fragO);

      setLoading(!!state.cont, state.cont ? 'Loading more…' : '');
    }catch(e){
      console.warn('[owned-panel] loadFirst failed', e);
      GRID.innerHTML = `<div class="pg-muted">Could not load your frogs.</div>`;
      setLoading(false, '');
    }
  }

  async function loadMore(){
    if (!state.addr || !state.cont || state.busy) return;
    state.busy = true;
    setLoading(true, 'Loading more…');
    try{
      const page = await fetchOwnedPage(state.addr, state.cont, 20);
      state.cont = page.continuation || null;

      const frag = document.createDocumentFragment();
      (page.items || []).forEach(id => {
        if (state.seen.has(id)) return;
        state.seen.add(id);
        frag.appendChild(renderCard(id, 'Owned by You'));
      });
      GRID.appendChild(frag);

      setLoading(!!state.cont, state.cont ? 'Loading more…' : '');
    }catch(e){
      console.warn('[owned-panel] loadMore failed', e);
      setLoading(false, '');
    }finally{
      state.busy = false;
    }
  }

  // Connect button → use your main connect if present; else request accounts
  if (BTN){
    BTN.addEventListener('click', async ()=>{
      const mainBtn = document.getElementById('connectBtn');
      if (mainBtn){ mainBtn.click(); return; }
      if (window.ethereum?.request){
        try{
          const accs = await window.ethereum.request({ method:'eth_requestAccounts' });
          const addr = (accs && accs[0]) || null;
          if (addr) window.dispatchEvent(new CustomEvent('wallet:connected', { detail:{ address: addr }}));
        }catch(_){}
      }
    });
  }

  // Wallet events from your wallet.js
  window.addEventListener('wallet:connected', (ev)=>{
    const addr = ev?.detail?.address; if (!addr) return;
    state.addr = addr;
    loadFirst(addr);
  });

  // Infinite scroll inside the card
  const wrap = GRID.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMore();
  });

  // If already connected, bootstrap immediately
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){ state.addr = maybeAddr; loadFirst(maybeAddr); }

  // Public init (harmless if also auto)
  window.FF_initOwnedPanel = function(){
    if (state.addr) return;
    const addr = window?.FF?.wallet?.address || window?.WALLET_ADDR || null;
    if (addr){ state.addr = addr; loadFirst(addr); }
  };
})();
