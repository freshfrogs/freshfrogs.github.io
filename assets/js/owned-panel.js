// assets/js/owned-panel.js
// Shows user's OWNED frogs (always via Reservoir) + STAKED frogs (when Web3+ABI present).
// Also displays HUD with Owned / Staked / Unclaimed rewards (rewards only if Web3 available).
(function(){
  'use strict';

  const C = window.FF_CFG || {};
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const GRID = document.getElementById('ownedGrid');
  const BTN  = document.getElementById('ownedConnectBtn');
  const MORE = document.getElementById('ownedMore');

  if (!GRID) return;

  // ---------- helpers ----------
  const apiHeaders = { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) };
  const img = (id)=> (C.SOURCE_PATH || '') + `/frog/${id}.png`;

  function setLoading(on, msg){
    if (!MORE) return;
    MORE.style.display = on ? 'block' : 'none';
    MORE.textContent = on ? (msg || 'Loading…') : '';
  }

  function renderCard(id, badge){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${img(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">${badge || ''}</div>
      <div class="actions"></div>
    `;
    return el;
  }

  // HUD above the grid
  let HUD = null;
  function ensureHUD(){
    if (HUD) return HUD;
    HUD = document.createElement('div');
    HUD.className = 'pg-muted';
    HUD.style.marginBottom = '8px';
    HUD.id = 'ownedHud';
    GRID.parentElement.insertBefore(HUD, GRID);
    return HUD;
  }
  function setHUD({ owned='—', staked='—', rewards='—' }){
    ensureHUD().innerHTML = `Owned: <b>${owned}</b> &nbsp;•&nbsp; Staked: <b>${staked}</b> &nbsp;•&nbsp; Unclaimed: <b>${rewards}</b>`;
  }

  // ---------- Web3 capability gates ----------
  function hasWeb3(){
    return !!(window.Web3 && (window.ethereum || C.RPC_URL) && window.CONTROLLER_ABI && C.CONTROLLER_ADDRESS && C.COLLECTION_ADDRESS);
  }
  function getWeb3(){
    const provider = window.ethereum || (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : null);
    if (!provider) return null;
    try { return new window.Web3(provider); } catch { return null; }
  }

  // ---------- Reservoir: owned list + owned count ----------
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

    const res = await fetch(`${HOST}/users/${user}/tokens/v8?${qs}`, { headers: apiHeaders });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();
    const items = (j.tokens || []).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    return { items, continuation: j.continuation || null };
  }

  // Better count (no Web3): users/{addr}/collections/v2
  async function fetchOwnedCount(user){
    const qs = new URLSearchParams({ collections: C.COLLECTION_ADDRESS });
    const res = await fetch(`${HOST}/users/${user}/collections/v2?${qs}`, { headers: apiHeaders });
    if (!res.ok) return null;
    const j = await res.json();
    const col = (j?.collections || [])[0];
    const n = Number(col?.ownership?.tokenCount);
    return Number.isFinite(n) ? n : null;
  }

  // ---------- Web3: staked ids + rewards (optional) ----------
  async function fetchStakedIds(user){
    if (!hasWeb3()) return [];
    const web3 = getWeb3(); if (!web3) return [];
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);
    // Try common ABI shapes
    try{
      const arr = await controller.methods.getStakedTokens(user).call();
      return (arr || []).map(x => Number(x.tokenId ?? x)).filter(Number.isFinite);
    }catch(_){
      try{
        const arr = await controller.methods.stakedTokensOf(user).call();
        return (arr || []).map(x => Number(x.tokenId ?? x)).filter(Number.isFinite);
      }catch(e2){
        console.warn('[owned-panel] no staked method', e2);
        return [];
      }
    }
  }

  async function fetchUnclaimed(user){
    if (!hasWeb3()) return { raw:'0', pretty:'—' };
    const web3 = getWeb3(); if (!web3) return { raw:'0', pretty:'—' };
    try{
      const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);
      const raw = await controller.methods.availableRewards(user).call();
      const pretty = (Number(raw)/1e18).toFixed(3) + ' ' + (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
      return { raw, pretty };
    }catch(e){
      console.warn('[owned-panel] availableRewards failed', e);
      return { raw:'0', pretty:'—' };
    }
  }

  // ---------- Flow ----------
  let state = { addr:null, cont:null, loading:false, seen:new Set() };

  async function loadFirst(addr){
    GRID.innerHTML = '';
    setLoading(true);
    state.seen.clear();

    try{
      // 1) Staked (only if Web3 available). Render first.
      let stakedIds = [];
      try { stakedIds = await fetchStakedIds(addr); } catch(_) { stakedIds = []; }
      if (stakedIds.length){
        const frag = document.createDocumentFragment();
        stakedIds.forEach(id => { state.seen.add(id); frag.appendChild(renderCard(id, 'Staked • Owned by You')); });
        GRID.appendChild(frag);
      }

      // 2) Owned page 1 (Reservoir) — always works
      const owned = await fetchOwnedPage(addr, null, 20);
      state.cont = owned.continuation || null;

      const frag2 = document.createDocumentFragment();
      (owned.items || []).forEach(id => {
        if (state.seen.has(id)) return;
        state.seen.add(id);
        frag2.appendChild(renderCard(id, 'Owned by You'));
      });
      GRID.appendChild(frag2);

      // 3) HUD counts
      const [ownedCount, rewards] = await Promise.all([
        fetchOwnedCount(addr),
        fetchUnclaimed(addr)
      ]);
      const hudOwned  = ownedCount != null ? ownedCount : state.seen.size;
      const hudStaked = stakedIds.length || 0;
      setHUD({ owned: hudOwned, staked: hudStaked, rewards: rewards.pretty });

    }catch(e){
      console.warn('[owned-panel] loadFirst failed', e);
      GRID.innerHTML = `<div class="pg-muted">Could not load your frogs.</div>`;
    }finally{
      setLoading(false);
    }
  }

  async function loadMore(){
    if (!state.addr || !state.cont || state.loading) return;
    setLoading(true);
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
    }catch(e){
      console.warn('[owned-panel] loadMore failed', e);
    }finally{
      setLoading(false);
    }
  }

  // Connect button → use global connect if present; else request
  if (BTN){
    BTN.addEventListener('click', async ()=>{
      const mainBtn = document.getElementById('connectBtn');
      if (mainBtn) { mainBtn.click(); return; }
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

  // Infinite scroll within the card
  const wrap = GRID.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMore();
  });

  // If already connected, bootstrap
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){ state.addr = maybeAddr; loadFirst(maybeAddr); }

  // Optional public init (harmless if also auto)
  window.FF_initOwnedPanel = function(){
    if (state.addr) return;
    const addr = window?.FF?.wallet?.address || window?.WALLET_ADDR || null;
    if (addr){ state.addr = addr; loadFirst(addr); }
  };
})();
