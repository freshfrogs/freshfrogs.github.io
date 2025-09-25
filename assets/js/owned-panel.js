// assets/js/owned-panel.js
// Renders the "Owned Frogs" panel on collection.html.
// - Tries your wallet state first (wallet-state.js / wallet.js).
// - Falls back to a Connect button that uses window.ethereum.
// - Uses the same global FF_RES_QUEUE as mints/stakes to avoid 429s.
// - Infinite scroll via Reservoir continuation.

(function (FF, CFG) {
  const GRID_ID   = 'ownedGrid';
  const BTN_ID    = 'ownedConnectBtn';
  const COUNT_ID  = 'ownedCount';
  const WALLET_ID = 'ownedWallet';
  const OS_ID     = 'ownedWalletOS';
  const MORE_ID   = 'ownedMore';

  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));

  // Ensure global queue exists (mints-feed.js usually creates it)
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900, 1700, 3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    async function spacedFetch(url, init){
      const delta = Date.now()-lastAt; if (delta<RATE_MIN_MS) await sleep(RATE_MIN_MS-delta);
      lastAt = Date.now(); return fetch(url, init);
    }
    async function run(url, init){
      const hdrs = Object.assign(
        {},
        (FF.apiHeaders && typeof FF.apiHeaders==='function') ? FF.apiHeaders() : { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY },
        init && init.headers || {}
      );
      let i=0;
      while(true){
        const res = await spacedFetch(url, { headers: hdrs });
        if (res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; }
        if (!res.ok){ const t=await res.text().catch(()=> ''); const e=new Error(`HTTP ${res.status}${t?' — '+t:''}`); e.url=url; throw e; }
        return res.json();
      }
    }
    window.FF_RES_QUEUE = { fetch(url, init){ chain = chain.then(()=> run(url, init)); return chain; } };
  }

  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const imgFor  = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';

  function etherscanTokenUrl(id){
    const base =
      CHAIN_ID === 1        ? 'https://etherscan.io/token/' :
      CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/token/' :
      CHAIN_ID === 5        ? 'https://goerli.etherscan.io/token/' :
                              'https://etherscan.io/token/';
    return base + CFG.COLLECTION_ADDRESS + '?a=' + id;
  }
  function openseaTokenUrl(id){
    return 'https://opensea.io/assets/ethereum/' + CFG.COLLECTION_ADDRESS + '/' + id;
  }

  // ---- Wallet helpers (try your existing code first)
  async function getConnectedAddress(){
    try {
      if (window.FF_WALLET && window.FF_WALLET.address) return window.FF_WALLET.address;
      if (FF.wallet && typeof FF.wallet.getAddress === 'function'){
        const a = await FF.wallet.getAddress(); if (a) return a;
      }
    } catch {}
    return null;
  }

  async function requestConnect(){
    // use your wallet module if present
    if (FF.wallet && typeof FF.wallet.connect === 'function'){
      const a = await FF.wallet.connect(); return a || null;
    }
    // else try window.ethereum
    if (window.ethereum && typeof window.ethereum.request === 'function'){
      const arr = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return Array.isArray(arr) && arr[0] ? arr[0] : null;
    }
    throw new Error('No wallet provider found.');
  }

  // ---- Owned list state
  let addr = null;
  let continuation = null;
  let loading = false;
  let items = [];
  let io = null;

  function grid(){ return document.getElementById(GRID_ID); }
  function moreEl(){ return document.getElementById(MORE_ID); }

  function setStats(){
    const n = items.length;
    const c = document.getElementById(COUNT_ID);
    const w = document.getElementById(WALLET_ID);
    const os= document.getElementById(OS_ID);
    if (c) c.textContent = n ? String(n) : '0';
    if (w) w.textContent = addr ? shorten(addr) : '—';
    if (os && addr){
      os.href = 'https://opensea.io/' + addr + '/collections';
    }
  }

  function renderAll(){
    const root = grid(); if (!root) return;
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      return;
    }
    items.forEach(it=>{
      const a = document.createElement('article');
      a.className = 'frog-card';
      a.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">' +
        '<h4 class="title">Frog #'+it.id+' <span class="pill">'+(it.rank ? 'Rank #'+it.rank : 'Rank N/A')+'</span></h4>' +
        '<div class="meta">Owned by You</div>' +
        '<ul class="attr-list" aria-label="Attributes"></ul>' +
        '<div class="actions">' +
          '<a class="btn btn-outline-gray" href="'+openseaTokenUrl(it.id)+'" target="_blank" rel="noopener">OpenSea</a>' +
          '<a class="btn btn-outline-gray" href="'+etherscanTokenUrl(it.id)+'" target="_blank" rel="noopener">Etherscan</a>' +
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>' +
        '</div>';
      root.appendChild(a);
    });
    setStats();
  }

  function attachObserver(){
    const root = grid(); if (!root) return;
    if (io) io.disconnect();
    io = new IntersectionObserver(entries=>{
      const e = entries[0];
      if (!e || !e.isIntersecting) return;
      if (!continuation || loading) return;
      loadNextPage();
    }, { root, rootMargin: '140px', threshold: 0.01 });
    // create a sentinel div
    const sent = document.createElement('div');
    sent.setAttribute('data-sentinel','');
    sent.style.height = '1px';
    root.appendChild(sent);
    io.observe(sent);
  }

  function ensureRankLookup(){
    if (FF.RANKS) return Promise.resolve(FF.RANKS);
    return (FF.fetchJSON ? FF.fetchJSON(CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json').then(r=> (FF.RANKS=r, r)) : Promise.resolve({}));
  }

  function mapToken(t){
    const tokenId = Number(t?.token?.tokenId);
    if (!isFinite(tokenId)) return null;
    return { id: tokenId };
  }

  async function fetchPage(){
    const qs = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      limit: String(PAGE_SIZE),
      includeTopBid: 'false'
    });
    if (continuation) qs.set('continuation', continuation);
    const json = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr) + '?' + qs.toString());
    const rows = (json?.tokens || []).map(mapToken).filter(Boolean);
    continuation = json?.continuation || null;
    return rows;
  }

  async function loadFirstPage(){
    loading = true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRankLookup().catch(()=> ({})) ]);
      rows.forEach(r => { r.rank = ranks ? ranks[String(r.id)] : undefined; });
      items = rows;
      renderAll();
      if (continuation){
        attachObserver();
        const more = moreEl(); if (more){ more.style.display='block'; more.textContent='Loading more…'; }
      } else {
        const more = moreEl(); if (more){ more.style.display='none'; }
      }
    }catch(e){
      console.warn('[owned] first page failed', e, e.url ? '\nURL: '+e.url : '');
      const root = grid(); if (root) root.innerHTML = '<div class="pg-muted">Failed to load owned frogs.</div>';
    }finally{
      loading = false;
    }
  }

  async function loadNextPage(){
    loading = true;
    try{
      const ranks = (FF.RANKS || {});
      const rows = await fetchPage();
      rows.forEach(r => { r.rank = ranks[String(r.id)]; });
      items = items.concat(rows);
      renderAll();
      const more = moreEl();
      if (more){
        if (!continuation){ more.textContent='End of results'; setTimeout(()=> (more.style.display='none'), 1200); }
        else { more.textContent='Loading more…'; }
      }
    }catch(e){
      console.warn('[owned] next page failed', e);
      const more = moreEl(); if (more){ more.textContent='Could not load more.'; }
    }finally{
      loading = false;
    }
  }

  async function initOwned(){
    const btn = document.getElementById(BTN_ID);
    const root = grid();
    if (!root) return;

    // If your wallet stack already knows the address, use it
    addr = (await getConnectedAddress());
    if (!addr){
      root.innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
      if (btn){
        btn.style.display = 'inline-flex';
        btn.onclick = async ()=>{
          btn.disabled = true;
          try{
            addr = await requestConnect();
            if (!addr) return;
            document.getElementById(WALLET_ID)?.replaceChildren(document.createTextNode(shorten(addr)));
            root.innerHTML = '<div class="pg-muted">Loading…</div>';
            continuation = null; items = [];
            await loadFirstPage();
          } finally { btn.disabled = false; }
        };
      }
      return;
    }

    // Already connected
    if (btn) btn.style.display = 'none';
    document.getElementById(WALLET_ID)?.replaceChildren(document.createTextNode(shorten(addr)));
    continuation = null; items = [];
    root.innerHTML = '<div class="pg-muted">Loading…</div>';
    await loadFirstPage();
  }

  window.FF_initOwnedPanel = initOwned;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
