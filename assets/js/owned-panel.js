// assets/js/owned-panel.js
// Owned Frogs panel (old rich card style) with ranks, attributes, and action buttons.
// - Uses wallet-state/wallet.js if present; otherwise offers a Connect button.
// - Uses shared FF_RES_QUEUE (spaced + retried) to avoid 429s.
// - Tries to call your staking/transfer helpers if they exist; otherwise shows a toast/alert.

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
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // Ensure global queue exists
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    function apiHeaders(){
      if (FF.apiHeaders && typeof FF.apiHeaders==='function') return FF.apiHeaders();
      return { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY };
    }
    async function spacedFetch(url, init){
      const delta = Date.now()-lastAt; if (delta<RATE_MIN_MS) await sleep(RATE_MIN_MS-delta);
      lastAt = Date.now(); return fetch(url, init);
    }
    async function run(url, init){
      const hdrs = Object.assign({}, apiHeaders(), init && init.headers || {});
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

  // Utils
  const shorten = (a)=> (FF.shorten && FF.shorten(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const imgFor  = (id)=> (CFG.SOURCE_PATH || '') + '/frog/' + id + '.png';
  const etherscanToken = (id)=>{
    const base =
      CHAIN_ID === 1        ? 'https://etherscan.io/token/' :
      CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/token/' :
      CHAIN_ID === 5        ? 'https://goerli.etherscan.io/token/' :
                              'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  };
  const openseaToken = (id)=> `https://opensea.io/assets/ethereum/${COLLECTION}/${id}`;

  function toast(msg){ try{ FF.toast && FF.toast(msg); }catch{}; console.log('[owned]', msg); alert(msg); }

  // Wallet helpers (prefer your code)
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
    if (FF.wallet && typeof FF.wallet.connect === 'function'){
      const a = await FF.wallet.connect(); return a || null;
    }
    if (window.ethereum && typeof window.ethereum.request === 'function'){
      const arr = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return Array.isArray(arr) && arr[0] ? arr[0] : null;
    }
    throw new Error('No wallet provider found.');
  }

  // Data state
  let addr = null;
  let continuation = null;
  let items = [];
  let loading = false;
  let io = null;
  let RANKS = null;

  function grid(){ return document.getElementById(GRID_ID); }
  function moreEl(){ return document.getElementById(MORE_ID); }
  function setStats(){
    const c = document.getElementById(COUNT_ID);
    const w = document.getElementById(WALLET_ID);
    const os= document.getElementById(OS_ID);
    if (c) c.textContent = String(items.length || 0);
    if (w) w.textContent = addr ? shorten(addr) : '—';
    if (os && addr) os.href = 'https://opensea.io/' + addr + '/collections';
  }

  function ensureRanks(){
    if (FF.RANKS) { RANKS = FF.RANKS; return Promise.resolve(RANKS); }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    return (FF.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
      .then(map=>{
        // If file is array of {id,ranking}, normalize to object
        if (Array.isArray(map)){
          const o={}; for (const r of map){ o[String(r.id)] = r.ranking; } RANKS = o;
        } else { RANKS = map || {}; }
        FF.RANKS = RANKS;
        return RANKS;
      })
      .catch(()=> (RANKS = {}));
  }

  function attrListHTML(attrs){
    if (!Array.isArray(attrs) || !attrs.length) return '';
    // Pick up to 4 attributes that look meaningful
    const nice = [];
    for (const a of attrs){
      const k = a?.key || a?.trait_type || a?.type || '';
      const v = a?.value || a?.trait_value || a?.value_string || '';
      if (!k || v==null) continue;
      nice.push(`<li class="attr">${k}: <b>${String(v).toString()}</b></li>`);
      if (nice.length >= 4) break;
    }
    return nice.length ? `<ul class="attr-list" aria-label="Attributes">${nice.join('')}</ul>` : '';
  }

  function renderAll(){
    const root = grid(); if (!root) return;
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      setStats(); return;
    }

    for (const it of items){
      const rankPill = `<span class="pill">${(it.rank||it.rank===0) ? `Rank #${it.rank}` : '<span class="muted">Rank N/A</span>'}</span>`;
      const stakedMeta = it.staked ? `Staked • Owned by You` : `Not staked • Owned by You`;
      const attrsHTML = attrListHTML(it.attrs);

      const card = document.createElement('article');
      card.className = 'frog-card';
      card.setAttribute('data-token-id', String(it.id));

      card.innerHTML =
        `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">
         <h4 class="title">Frog #${it.id} ${rankPill}</h4>
         <div class="meta">${stakedMeta}</div>
         ${attrsHTML}
         <div class="actions">
           <button class="btn btn-outline-gray" data-act="${it.staked ? 'unstake' : 'stake'}">${it.staked ? 'Unstake' : 'Stake'}</button>
           <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
           <a class="btn btn-outline-gray" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
           <a class="btn btn-outline-gray" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
           <a class="btn btn-outline-gray" href="${imgFor(it.id)}" target="_blank" rel="noopener">Original</a>
         </div>`;

      // Actions wiring (call your helpers if available)
      card.querySelectorAll('button[data-act]').forEach(btn=>{
        btn.addEventListener('click', async (ev)=>{
          const act = btn.getAttribute('data-act');
          try{
            if (act === 'stake'){
              if (FF.staking && typeof FF.staking.stakeToken === 'function') {
                await FF.staking.stakeToken(it.id);
              } else if (FF.staking && typeof FF.staking.stakeTokens === 'function') {
                await FF.staking.stakeTokens([it.id]);
              } else { toast('Stake: helper not found'); return; }
              btn.textContent = 'Unstake'; btn.setAttribute('data-act','unstake'); it.staked = true;
            } else if (act === 'unstake'){
              if (FF.staking && typeof FF.staking.unstakeToken === 'function') {
                await FF.staking.unstakeToken(it.id);
              } else if (FF.staking && typeof FF.staking.unstakeTokens === 'function') {
                await FF.staking.unstakeTokens([it.id]);
              } else { toast('Unstake: helper not found'); return; }
              btn.textContent = 'Stake'; btn.setAttribute('data-act','stake'); it.staked = false;
            } else if (act === 'transfer'){
              if (FF.wallet && typeof FF.wallet.promptTransfer === 'function') {
                await FF.wallet.promptTransfer(it.id);
              } else { toast('Transfer: helper not found'); }
            }
            // Update meta line
            const meta = card.querySelector('.meta');
            if (meta) meta.textContent = (it.staked ? 'Staked' : 'Not staked') + ' • Owned by You';
          }catch(e){
            console.warn('[owned action] failed', e);
            toast('Action failed');
          }
        });
      });

      root.appendChild(card);
    }

    setStats();
  }

  function mapTokenRow(row){
    // Reservoir users/{addr}/tokens/v8 shape:
    // { token: { tokenId, attributes:[{key,value},...], ... }, ownership: { tokenCount, acquiredAt, ... } }
    const t = row?.token || {};
    const tokenId = Number(t?.tokenId);
    if (!isFinite(tokenId)) return null;
    const attrs = Array.isArray(t?.attributes) ? t.attributes : [];
    // Staked heuristic: owned by user, not controller; we can’t know staked state unless you provide it.
    // If you expose a map in wallet-state (FF_WALLET.stakedIds), we’ll read it.
    const staked = !!(window.FF_WALLET && window.FF_WALLET.stakedIds && window.FF_WALLET.stakedIds.has && window.FF_WALLET.stakedIds.has(tokenId));
    return { id: tokenId, attrs, staked };
  }

  async function fetchPage(addr, cont){
    const qs = new URLSearchParams({
      collection: COLLECTION,
      limit: String(PAGE_SIZE),
      includeTopBid: 'false'
    });
    if (cont) qs.set('continuation', cont);
    const json = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr) + '?' + qs.toString());
    const rows = (json?.tokens || []).map(mapTokenRow).filter(Boolean);
    continuation = json?.continuation || null;
    return rows;
  }

  async function loadFirstPage(){
    loading = true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(addr, null), ensureRanks() ]);
      rows.forEach(r => { r.rank = ranks ? ranks[String(r.id)] : undefined; });
      items = rows;
      renderAll();
      const more = moreEl();
      if (more){ more.style.display = continuation ? 'block' : 'none'; more.textContent = continuation ? 'Loading more…' : ''; }
      if (continuation) attachObserver();
    }catch(e){
      console.warn('[owned] first page failed', e, e.url ? '\nURL: '+e.url : '');
      const root = grid(); if (root) root.innerHTML = '<div class="pg-muted">Failed to load owned frogs.</div>';
    }finally{ loading = false; }
  }

  async function loadNextPage(){
    if (loading || !continuation) return;
    loading = true;
    try{
      const ranks = RANKS || {};
      const rows = await fetchPage(addr, continuation);
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
      const more = moreEl(); if (more) more.textContent = 'Could not load more.';
    }finally{ loading = false; }
  }

  function attachObserver(){
    const root = grid(); if (!root) return;
    if (io) io.disconnect();
    const sentinel = document.createElement('div');
    sentinel.setAttribute('data-sentinel','');
    sentinel.style.height = '1px';
    root.appendChild(sentinel);
    io = new IntersectionObserver(entries=>{
      const e = entries[0];
      if (!e || !e.isIntersecting) return;
      loadNextPage();
    }, { root, rootMargin: '140px', threshold: 0.01 });
    io.observe(sentinel);
  }

  async function initOwned(){
    const btn = document.getElementById(BTN_ID);
    const root = grid(); if (!root) return;

    addr = await getConnectedAddress();
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
