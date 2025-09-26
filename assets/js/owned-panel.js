// assets/js/owned-panel.js
// Rollback: render ONLY frogs owned by the connected user (Reservoir).
// No HUD, no totals, no rewards, no Web3. Preserves original card layout.

(function(){
  'use strict';

  const C    = window.FF_CFG || {};
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';

  const GRID = document.getElementById('ownedGrid');
  const BTN  = document.getElementById('ownedConnectBtn');
  const MORE = document.getElementById('ownedMore');

  if (!GRID) return;

  // ----- helpers -----
  const headers = { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) };
  const imgSrc  = (id)=> (C.SOURCE_PATH || '') + `/frog/${id}.png`;

  function setLoading(show, text){
    if (!MORE) return;
    MORE.style.display = show ? 'block' : 'none';
    MORE.textContent   = show ? (text || 'Loading more…') : '';
  }

  function renderCard(id){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${imgSrc(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">Owned by You</div>
      <div class="actions"></div>
    `;
    return el;
  }

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

    const url = `${HOST}/users/${owner}/tokens/v8?${qs.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();
    const items = (j.tokens || []).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    return { items, continuation: j.continuation || null };
  }

  // ----- state & flow -----
  let state = { addr:null, cont:null, busy:false };

  async function loadFirst(addr){
    GRID.innerHTML = '';
    setLoading(true, 'Loading…');
    try{
      const page = await fetchOwnedPage(addr, null, 20);
      state.cont = page.continuation || null;
      const frag = document.createDocumentFragment();
      (page.items || []).forEach(id => frag.appendChild(renderCard(id)));
      GRID.innerHTML = '';
      GRID.appendChild(frag);
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
      (page.items || []).forEach(id => frag.appendChild(renderCard(id)));
      GRID.appendChild(frag);
      setLoading(!!state.cont, state.cont ? 'Loading more…' : '');
    }catch(e){
      console.warn('[owned-panel] loadMore failed', e);
      setLoading(false, '');
    }finally{
      state.busy = false;
    }
  }

  // Connect button: use global connect if present; else request accounts
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

  // Wallet event
  window.addEventListener('wallet:connected', (ev)=>{
    const addr = ev?.detail?.address; if (!addr) return;
    state.addr = addr;
    loadFirst(addr);
  });

  // Infinite scroll inside the card container
  const wrap = GRID.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMore();
  });

  // If already connected, bootstrap immediately
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){ state.addr = maybeAddr; loadFirst(maybeAddr); }

  // Compatibility no-op
  window.FF_initOwnedPanel = function(){ /* no-op */ };
})();
