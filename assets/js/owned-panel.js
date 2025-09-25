// assets/js/owned-panel.js
// Owned Frogs panel with: attributes fix, stats header, staking hooks, and 5 switchable layouts.
// Works with your wallet-state.js / wallet.js / staking.js when present, falls back gracefully.
//
// Layouts (cycle with the "Layout" button in the header):
//  A — Cards (classic)
//  B — Compact list
//  C — Media rows
//  D — Dashboard grid
//  E — Gallery

(function (FF, CFG) {
  const SEL = {
    card:   '#ownedCard',
    grid:   '#ownedGrid',
    btnConn:'#ownedConnectBtn',
    more:   '#ownedMore',
    stats:  '.info-grid-2'
  };

  // IDs we populate (some will be injected if missing)
  const IDS = {
    ownedCount: 'ownedCount',
    ownedWallet: 'ownedWallet',
    ownedWalletOS: 'ownedWalletOS',
    ownedStaked: 'ownedStaked',
    ownedRewards: 'ownedRewards',
    approveBtn: 'ownedApproveBtn',
    layoutBtn: 'ownedLayoutBtn'
  };

  // Config / endpoints
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);
  const BASE       = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE  = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // ---------- global queue (shared with feeds) ----------
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

  // ---------- utils ----------
  const $  = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> [].slice.call(root.querySelectorAll(sel));
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
  function toast(msg){ try{ FF.toast && FF.toast(msg); }catch{}; console.log('[owned]', msg); }

  // Wallet helpers (prefer your stack)
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

  // Staking helpers (probe multiple common names)
  async function isApproved(addr){
    const s = FF.staking || window.FF_STAKING || {};
    const cands = ['isApproved','isApprovedForAll','checkApproval'];
    for (const k of cands){ if (typeof s[k] === 'function'){ try{ return !!(await s[k](addr)); }catch{} } }
    return null; // unknown
  }
  async function requestApproval(){
    const s = FF.staking || window.FF_STAKING || {};
    const cands = ['approve','approveIfNeeded','requestApproval','setApproval'];
    for (const k of cands){ if (typeof s[k] === 'function'){ return s[k](); } }
    throw new Error('Approval helper not found.');
  }
  async function getRewards(addr){
    const s = FF.staking || window.FF_STAKING || {};
    const cands = ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards'];
    for (const k of cands){ if (typeof s[k] === 'function'){ try{ return await s[k](addr); }catch{} } }
    return null;
  }
  async function getStakedIds(addr){
    // prefer a live list if your wallet/state exposes it
    if (window.FF_WALLET && window.FF_WALLET.stakedIds && window.FF_WALLET.stakedIds.values){
      return Array.from(window.FF_WALLET.stakedIds.values());
    }
    const s = FF.staking || window.FF_STAKING || {};
    const cands = ['getStakedTokenIds','getUserStakedTokens','stakedTokenIds','stakedIds'];
    for (const k of cands){ if (typeof s[k] === 'function'){ try{ return await s[k](addr); }catch{} } }
    return null;
  }

  // ---------- DOM scaffolding (stats + layout toggle) ----------
  function ensureStatsAndControls(){
    const card = $(SEL.card); if (!card) return;
    let grid = $(SEL.stats, card);
    if (!grid){
      grid = document.createElement('div');
      grid.className = 'info-grid-2';
      grid.style.marginBottom = '10px';
      card.insertBefore(grid, $(SEL.grid, card));
    }

    function ensureBlock(id, label, sub, htmlValue='—'){
      let blk = $('#'+id, grid);
      if (!blk){
        blk = document.createElement('div');
        blk.id = id;
        blk.className = 'info-block';
        blk.innerHTML = `<div class="ik">${label}</div><div class="iv">—</div><div class="in">${sub||''}</div>`;
        grid.appendChild(blk);
      }
      return blk;
    }

    // Required blocks:
    ensureBlock(IDS.ownedCount,   'Total Owned', 'In this collection');
    ensureBlock(IDS.ownedStaked,  'Staked',      'In staking contract');
    ensureBlock(IDS.ownedRewards, 'Available Rewards', 'Unclaimed FLYZ');
    // Wallet block (uses existing if present)
    let walletBlk = $('#'+IDS.ownedWallet, grid)?.closest('.info-block');
    if (!walletBlk){
      walletBlk = document.createElement('div');
      walletBlk.className = 'info-block';
      walletBlk.innerHTML = `<div class="ik">Wallet</div><div class="iv" id="${IDS.ownedWallet}">—</div><div class="in"><a id="${IDS.ownedWalletOS}" href="#" target="_blank" rel="noopener">OpenSea</a></div>`;
      grid.appendChild(walletBlk);
    }

    // Approve button (insert to header actions area)
    const head = card.querySelector('.pg-card-head');
    if (head && !$('#'+IDS.approveBtn, head)){
      const btn = document.createElement('button');
      btn.id = IDS.approveBtn;
      btn.className = 'btn';
      btn.textContent = 'Approve Staking';
      head.appendChild(btn);
      btn.addEventListener('click', async ()=>{
        btn.disabled = true;
        try{ await requestApproval(); toast('Approval submitted.'); }
        catch(e){ console.warn('[approve] failed', e); toast('Approve failed'); }
        finally{ btn.disabled = false; }
      });
    }

    // Layout toggle
    if (head && !$('#'+IDS.layoutBtn, head)){
      const lb = document.createElement('button');
      lb.id = IDS.layoutBtn;
      lb.className = 'btn';
      lb.title = 'Cycle owned panel layout';
      head.appendChild(lb);
      lb.addEventListener('click', ()=> {
        setLayout(nextLayout(getLayout()));
        renderAll(); // re-render in new layout
      });
      // initial label
      updateLayoutButton();
    }
  }

  // ---------- stats updating ----------
  function setText(id, txt){
    const el = document.getElementById(id);
    if (el){
      if (el.tagName === 'DIV' && el.classList.contains('info-block')){
        const v = el.querySelector('.iv'); if (v) v.textContent = String(txt);
      } else { el.textContent = String(txt); }
    }
  }

  function setWallet(addr){
    setText(IDS.ownedWallet, addr ? shorten(addr) : '—');
    const os = document.getElementById(IDS.ownedWalletOS);
    if (os && addr) os.href = 'https://opensea.io/' + addr + '/collections';
  }

  function setOwnedCount(n){ setText(IDS.ownedCount, (n==null) ? '—' : String(n)); }
  function setStakedCount(n){ setText(IDS.ownedStaked, (n==null) ? '—' : String(n)); }
  function setRewards(v){
    if (v==null) return setText(IDS.ownedRewards, '—');
    // pretty: allow number, bigint, or wei-like; we leave units as provided by your helper
    const s = (typeof v === 'object' && v.formatted) ? v.formatted
            : (typeof v === 'bigint') ? v.toString()
            : String(v);
    setText(IDS.ownedRewards, s);
  }

  async function refreshHeaderStats(addr){
    setWallet(addr);
    // Owned == items.length after we load; prefill spinner-ish
    setOwnedCount('…');
    setStakedCount('…');
    setRewards('…');

    // Staked (from helpers if possible)
    try{
      const ids = await getStakedIds(addr);
      if (Array.isArray(ids)) setStakedCount(ids.length); else setStakedCount('—');
    }catch{ setStakedCount('—'); }

    // Rewards
    try{
      const r = await getRewards(addr);
      setRewards(r);
    }catch{ setRewards('—'); }

    // Approval state
    try{
      const ok = await isApproved(addr);
      const btn = document.getElementById(IDS.approveBtn);
      if (btn && ok === true){ btn.textContent = 'Approved'; btn.disabled = true; }
      else if (btn && ok === false){ btn.textContent = 'Approve Staking'; btn.disabled = false; }
    }catch{}
  }

  // ---------- data state ----------
  let addr = null;
  let continuation = null;
  let items = [];   // [{ id, attrs[], rank, staked }]
  let loading = false;
  let io = null;
  let RANKS = null;

  function grid(){ return $(SEL.grid); }
  function moreEl(){ return $(SEL.more); }

  function ensureRanks(){
    if (FF.RANKS) { RANKS = FF.RANKS; return Promise.resolve(RANKS); }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    return (FF.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
      .then(map=>{
        if (Array.isArray(map)){ const o={}; for (const r of map){ o[String(r.id)] = r.ranking; } RANKS=o; }
        else { RANKS = map || {}; }
        FF.RANKS = RANKS;
        return RANKS;
      })
      .catch(()=> (RANKS = {}));
  }

  function mapTokenRow(row){
    // Reservoir users/{addr}/tokens/v8 -> row.token.{tokenId, attributes[]}
    const t = row?.token || {};
    const tokenId = Number(t?.tokenId);
    if (!isFinite(tokenId)) return null;

    // Attributes fix: includeAttributes=true in fetch; fields are typically {key,value}
    const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a => ({
      key: a?.key || a?.trait_type || a?.type || '',
      value: (a?.value ?? a?.trait_value ?? a?.value_string ?? '')
    })) : [];

    const isStaked = !!(window.FF_WALLET && window.FF_WALLET.stakedIds && window.FF_WALLET.stakedIds.has && window.FF_WALLET.stakedIds.has(tokenId));
    return { id: tokenId, attrs, staked: isStaked };
  }

  async function fetchPage(){
    const qs = new URLSearchParams({
      collection: COLLECTION,
      limit: String(PAGE_SIZE),
      includeTopBid: 'false',
      includeAttributes: 'true' // <-- crucial for attributes
    });
    if (continuation) qs.set('continuation', continuation);
    const json = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr) + '?' + qs.toString());
    const rows = (json?.tokens || []).map(mapTokenRow).filter(Boolean);
    continuation = json?.continuation || null;
    return rows;
  }

  // ---------- LAYOUTS ----------
  const LAYOUTS = ['A','B','C','D','E'];
  function getLayout(){ return localStorage.getItem('FF_OWNED_LAYOUT') || 'A'; }
  function setLayout(code){ localStorage.setItem('FF_OWNED_LAYOUT', LAYOUTS.includes(code)?code:'A'); updateLayoutButton(); }
  function nextLayout(code){ const i = LAYOUTS.indexOf(code); return LAYOUTS[(i+1)%LAYOUTS.length]; }
  function updateLayoutButton(){
    const btn = document.getElementById(IDS.layoutBtn);
    if (btn){ btn.textContent = 'Layout: ' + getLayout(); }
  }

  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs) || !attrs.length) return '';
    const chips = [];
    for (const a of attrs){
      if (!a.key || a.value==null) continue;
      chips.push(`<li class="attr">${a.key}: <b>${String(a.value)}</b></li>`);
      if (chips.length >= max) break;
    }
    return chips.length ? `<ul class="attr-list" aria-label="Attributes">${chips.join('')}</ul>` : '';
  }

  function rankPill(rank){
    return `<span class="pill">${(rank||rank===0) ? `Rank #${rank}` : '<span class="muted">Rank N/A</span>'}</span>`;
  }

  function actionButtonsHTML(id, staked){
    return (
      `<div class="actions">
         <button class="btn btn-outline-gray" data-act="${staked ? 'unstake' : 'stake'}">${staked ? 'Unstake' : 'Stake'}</button>
         <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
         <a class="btn btn-outline-gray" href="${openseaToken(id)}" target="_blank" rel="noopener">OpenSea</a>
         <a class="btn btn-outline-gray" href="${etherscanToken(id)}" target="_blank" rel="noopener">Etherscan</a>
         <a class="btn btn-outline-gray" href="${imgFor(id)}" target="_blank" rel="noopener">Original</a>
       </div>`
    );
  }

  function wireCardActions(container, it){
    $$('.actions .btn[data-act]', container).forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act === 'stake'){
            if (FF.staking?.stakeToken) await FF.staking.stakeToken(it.id);
            else if (FF.staking?.stakeTokens) await FF.staking.stakeTokens([it.id]);
            else return toast('Stake: helper not found');
            it.staked = true; btn.textContent='Unstake'; btn.setAttribute('data-act','unstake');
            const m = container.querySelector('.meta'); if (m) m.textContent = 'Staked • Owned by You';
          } else if (act === 'unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked = false; btn.textContent='Stake'; btn.setAttribute('data-act','stake');
            const m = container.querySelector('.meta'); if (m) m.textContent = 'Not staked • Owned by You';
          } else if (act === 'transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch(e){ console.warn('[owned action] failed', e); toast('Action failed'); }
      });
    });
  }

  function renderAll(){
    const root = grid(); if (!root) return;
    const lay = getLayout();
    root.innerHTML = '';

    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      setOwnedCount(0);
      return;
    }

    // Update counts
    setOwnedCount(items.length);

    if (lay === 'A'){ // Cards (classic)
      items.forEach(it=>{
        const card = document.createElement('article');
        card.className = 'frog-card';
        card.innerHTML =
          `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">
           <h4 class="title">Frog #${it.id} ${rankPill(it.rank)}</h4>
           <div class="meta">${it.staked ? 'Staked' : 'Not staked'} • Owned by You</div>
           ${attrsHTML(it.attrs, 4)}
           ${actionButtonsHTML(it.id, it.staked)}`;
        root.appendChild(card);
        wireCardActions(card, it);
      });
      return;
    }

    if (lay === 'B'){ // Compact list
      const ul = document.createElement('ul'); ul.className = 'list';
      items.forEach(it=>{
        const li = document.createElement('li'); li.className='row';
        li.innerHTML =
          `<img class="thumb64" src="${imgFor(it.id)}" alt="${it.id}">
           <div>
             <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
               <b>Frog #${it.id}</b> ${rankPill(it.rank)}
             </div>
             <div class="pg-muted">${it.staked ? 'Staked' : 'Not staked'} • ${attrsHTML(it.attrs,2) || '—'}</div>
           </div>`;
        ul.appendChild(li);
        // Click opens OpenSea
        li.addEventListener('click', ()=> window.open(openseaToken(it.id),'_blank','noopener'));
      });
      root.appendChild(ul);
      return;
    }

    if (lay === 'C'){ // Media rows (actions right)
      const ul = document.createElement('ul'); ul.className = 'list';
      items.forEach(it=>{
        const li = document.createElement('li'); li.className='row'; li.style.gridTemplateColumns='auto 1fr auto';
        li.innerHTML =
          `<img class="thumb64" src="${imgFor(it.id)}" alt="${it.id}">
           <div>
             <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
               <b>Frog #${it.id}</b> ${rankPill(it.rank)}
             </div>
             <div class="pg-muted">${it.staked ? 'Staked' : 'Not staked'} • Owned by You</div>
             ${attrsHTML(it.attrs,3)}
           </div>
           <div class="actions" style="flex-direction:column;gap:6px;">
             <button class="btn btn-outline-gray" data-act="${it.staked ? 'unstake' : 'stake'}">${it.staked ? 'Unstake' : 'Stake'}</button>
             <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
             <a class="btn btn-outline-gray" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OS</a>
           </div>`;
        ul.appendChild(li);
        wireCardActions(li, it);
      });
      root.appendChild(ul);
      return;
    }

    if (lay === 'D'){ // Dashboard grid (tight)
      root.style.display = 'grid';
      root.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
      root.style.gap = '10px';
      items.forEach(it=>{
        const card = document.createElement('article');
        card.className = 'frog-card';
        card.style.gridTemplateColumns = 'auto 1fr';
        card.innerHTML =
          `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}" style="width:112px;height:112px;">
           <div>
             <h4 class="title" style="margin-bottom:4px;">Frog #${it.id} ${rankPill(it.rank)}</h4>
             <div class="meta" style="margin-bottom:6px;">${it.staked ? 'Staked' : 'Not staked'} • You</div>
             ${attrsHTML(it.attrs,3)}
             <div class="actions" style="margin-top:8px;">
               <button class="btn btn-outline-gray" data-act="${it.staked ? 'unstake' : 'stake'}">${it.staked ? 'Unstake' : 'Stake'}</button>
               <a class="btn btn-outline-gray" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
               <a class="btn btn-outline-gray" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
             </div>
           </div>`;
        root.appendChild(card);
        wireCardActions(card, it);
      });
      return;
    }

    if (lay === 'E'){ // Gallery (visual)
      root.style.display = 'grid';
      root.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
      root.style.gap = '10px';
      items.forEach(it=>{
        const a = document.createElement('a');
        a.className='frog-card';
        a.style.gridTemplateColumns='1fr';
        a.style.textAlign='center';
        a.href = openseaToken(it.id); a.target='_blank'; a.rel='noopener';
        a.innerHTML =
          `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}" style="width:160px;height:160px;margin:0 auto;">
           <div style="margin-top:6px;font-weight:800;">#${it.id}</div>
           <div class="pg-muted" style="font-size:12px;">${(it.rank||it.rank===0) ? 'Rank #'+it.rank : 'Rank N/A'}</div>`;
        root.appendChild(a);
      });
      return;
    }
  }

  function attachObserver(){
    const root = grid(); if (!root) return;
    const more = moreEl(); if (more){ more.style.display = continuation ? 'block' : 'none'; more.textContent = continuation ? 'Loading more…' : ''; }
    if (io) io.disconnect();
    if (!continuation) return;
    const sentinel = document.createElement('div');
    sentinel.setAttribute('data-sentinel',''); sentinel.style.height='1px';
    root.appendChild(sentinel);
    io = new IntersectionObserver(entries=>{
      const e = entries[0];
      if (!e || !e.isIntersecting) return;
      loadNextPage();
    }, { root, rootMargin:'140px', threshold:0.01 });
    io.observe(sentinel);
  }

  async function loadFirstPage(){
    loading = true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r => { r.rank = ranks ? ranks[String(r.id)] : undefined; });
      items = rows;
      renderAll();
      attachObserver();
    }catch(e){
      console.warn('[owned] first page failed', e, e.url ? '\nURL: '+e.url : '');
      const root = grid(); if (root) root.innerHTML = '<div class="pg-muted">Failed to load owned frogs.</div>';
      setOwnedCount('—');
    }finally{ loading = false; }
  }

  async function loadNextPage(){
    if (loading || !continuation) return;
    loading = true;
    try{
      const ranks = RANKS || {};
      const rows = await fetchPage();
      rows.forEach(r => { r.rank = ranks[String(r.id)]; });
      items = items.concat(rows);
      renderAll();
      const more = moreEl(); if (more){ if (!continuation) { more.textContent='End of results'; setTimeout(()=> (more.style.display='none'), 1200); } }
    }catch(e){
      console.warn('[owned] next page failed', e);
      const more = moreEl(); if (more) more.textContent = 'Could not load more.';
    }finally{ loading = false; }
  }

  // ---------- init ----------
  async function initOwned(){
    ensureStatsAndControls();

    const btn = $(SEL.btnConn);
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
            setWallet(addr);
            root.innerHTML = '<div class="pg-muted">Loading…</div>';
            continuation = null; items = [];
            await Promise.all([ loadFirstPage(), refreshHeaderStats(addr) ]);
          } finally { btn.disabled = false; }
        };
      }
      return;
    }

    // Already connected
    if (btn) btn.style.display = 'none';
    setWallet(addr);
    continuation = null; items = [];
    root.innerHTML = '<div class="pg-muted">Loading…</div>';
    await Promise.all([ loadFirstPage(), refreshHeaderStats(addr) ]);
  }

  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
