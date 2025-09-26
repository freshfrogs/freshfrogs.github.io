// assets/js/owned-panel.js
// Reverted: show ONLY frogs owned by the connected user (Reservoir).
// No Web3, no HUD, no extra badges beyond "Owned by You". Keeps the original card look.

(function(){
  'use strict';

  const C = window.FF_CFG || {};
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';

  const GRID = document.getElementById('ownedGrid');
  const BTN  = document.getElementById('ownedConnectBtn');
  const MORE = document.getElementById('ownedMore');

  if (!GRID) return;

  // Basic helpers
  const apiHeaders = { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) };
  const img = (id)=> (C.SOURCE_PATH || '') + `/frog/${id}.png`;
  function setLoading(on, msg){
    if (!MORE) return;
    MORE.style.display = on ? 'block' : 'none';
    MORE.textContent   = on ? (msg || 'Loading more…') : '';
  }

  function renderCard(id){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${img(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">Owned by You</div>
      <div class="actions"></div>
    `;
    return el;
  }

  // Reservoir: owned page
  async function fetchOwnedPage(user, continuation=null, limit=20){
    const qs = new URLSearchParams({
      collection: C.COLLECTION_ADDRESS,
      limit: String(limit),
      includeAttributes: 'false',
      includeTopBid: 'false',
      sortBy: 'acquiredAt',
      sortDirection: 'desc'
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${HOST}/users/${user}/tokens/v8?${qs.toString()}`, { headers: apiHeaders });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();
    const items = (j.tokens || []).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    return { items, continuation: j.continuation || null };
  }

  // State + flow
  let state = { addr:null, cont:null, loading:false };

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
    if (!state.addr || !state.cont || state.loading) return;
    state.loading = true;
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
      state.loading = false;
    }
  }

  // Connect button: use your main connect if present; else request accounts
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

  // Wallet event from your wallet.js
  window.addEventListener('wallet:connected', (ev)=>{
    const addr = ev?.detail?.address; if (!addr) return;
    state.addr = addr;
    loadFirst(addr);
  });

  // Infinite scroll within the card
  const wrap = GRID.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMore();
  });

  // Bootstrap if already connected
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){ state.addr = maybeAddr; loadFirst(maybeAddr); }

  // Public noop (for compatibility with your inline call)
  window.FF_initOwnedPanel = function(){ /* no-op in reverted build */ };
})();
