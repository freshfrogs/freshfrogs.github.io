// assets/js/owned-panel.js
// Shows frogs owned by the user + staked by the user (same card style).
// Also displays totals (owned/staked) and unclaimed rewards.

(function(){
  'use strict';

  const C = window.FF_CFG || {};
  const HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const GRID = document.getElementById('ownedGrid');
  const BTN  = document.getElementById('ownedConnectBtn');
  const MORE = document.getElementById('ownedMore');

  if (!GRID) return;

  // Small HUD (totals + rewards) injected at the top of the card (keeps look)
  let HUD = null;
  function ensureHUD(){
    if (HUD) return HUD;
    HUD = document.createElement('div');
    HUD.className = 'pg-muted';
    HUD.style.marginBottom = '8px';
    HUD.id = 'ownedHud';
    // Insert just before the grid
    GRID.parentElement.insertBefore(HUD, GRID);
    return HUD;
  }
  function setHUD({ owned=0, staked=0, rewards='—' }){
    ensureHUD().innerHTML = `Owned: <b>${owned}</b> &nbsp;•&nbsp; Staked: <b>${staked}</b> &nbsp;•&nbsp; Unclaimed: <b>${rewards}</b>`;
  }

  // Helpers
  function imgSrc(id){ return (C.SOURCE_PATH || '') + `/frog/${id}.png`; }
  function setLoading(on){ if (MORE){ MORE.style.display = on ? 'block' : 'none'; MORE.textContent = on ? 'Loading…' : ''; } }

  function renderCard(id, badge){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${imgSrc(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">${badge || ''}</div>
      <div class="actions"></div>
    `;
    return el;
  }

  // ---------- Web3 (read-only) -----------
  function getWeb3(){
    if (!window.Web3) throw new Error('Web3 missing');
    const provider =
      window.ethereum ||
      (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : null);
    if (!provider) throw new Error('No RPC provider');
    return new window.Web3(provider);
  }

  // Counts (fast): ERC-721 balanceOf(user) and staked length
  async function getOwnedCount(user){
    const web3 = getWeb3();
    const erc721 = new web3.eth.Contract([
      {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],
       "name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],
       "stateMutability":"view","type":"function"}
    ], C.COLLECTION_ADDRESS);
    const n = await erc721.methods.balanceOf(user).call();
    return Number(n);
  }

  async function getStakedIds(user){
    const web3 = getWeb3();
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);
    // Try a couple of common method names
    try{
      const arr = await controller.methods.getStakedTokens(user).call();
      return (arr || []).map(x => Number(x.tokenId ?? x)).filter(Number.isFinite);
    }catch(_){
      try{
        const arr = await controller.methods.stakedTokensOf(user).call();
        return (arr || []).map(x => Number(x.tokenId ?? x)).filter(Number.isFinite);
      }catch(e2){
        console.warn('[owned-panel] no staked method found', e2);
        return [];
      }
    }
  }

  async function getUnclaimed(user){
    const web3 = getWeb3();
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI || [], C.CONTROLLER_ADDRESS);
    try{
      const raw = await controller.methods.availableRewards(user).call();
      const pretty = (Number(raw)/1e18).toFixed(3) + ' ' + (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
      return { raw, pretty };
    }catch(e){ console.warn('[owned-panel] availableRewards failed', e); return { raw:'0', pretty: `0.000 ${C.REWARD_TOKEN_SYMBOL||'$FLYZ'}`}; }
  }

  // Reservoir: owned page
  async function fetchOwnedPage(user, continuation=null, limit=20){
    const qs = new URLSearchParams({
      collection: C.COLLECTION_ADDRESS,
      limit: String(limit),
      includeTopBid: 'false',
      includeAttributes: 'false',
      sortBy: 'acquiredAt',
      sortDirection: 'desc'
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${HOST}/users/${user}/tokens/v8?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) }
    });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();
    const items = (j.tokens || []).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    return { items, continuation: j.continuation || null };
  }

  // ---------- Flow ----------
  let state = { addr:null, cont:null, loading:false, seen:new Set(), stakedIds:[] };

  async function loadFirst(addr){
    setLoading(true);
    GRID.innerHTML = '';
    state.seen.clear();

    try{
      // Fetch staked ids (+ badge)
      const stakedIds = await getStakedIds(addr);
      state.stakedIds = stakedIds.slice();
      const stakedFrag = document.createDocumentFragment();
      stakedIds.forEach(id => {
        state.seen.add(id);
        stakedFrag.appendChild(renderCard(id, 'Staked • Owned by You'));
      });
      GRID.appendChild(stakedFrag);

      // Fetch first owned page (skip staked duplicates)
      const owned = await fetchOwnedPage(addr, null, 20);
      state.cont = owned.continuation || null;

      const ownFrag = document.createDocumentFragment();
      (owned.items || []).forEach(id => {
        if (state.seen.has(id)) return;
        state.seen.add(id);
        ownFrag.appendChild(renderCard(id, 'Owned by You'));
      });
      GRID.appendChild(ownFrag);

      // HUD (counts + rewards)
      const [ownedCount, rewards] = await Promise.all([ getOwnedCount(addr), getUnclaimed(addr) ]);
      setHUD({ owned: ownedCount, staked: stakedIds.length, rewards: rewards.pretty });

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

  // Connect button: prefer your global wallet flow
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

  // Infinite scroll inside the owned card container
  const wrap = GRID.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMore();
  });

  // If already connected, bootstrap immediately (common pattern in your site)
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){ state.addr = maybeAddr; loadFirst(maybeAddr); }
})();
