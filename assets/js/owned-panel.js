// assets/js/owned-panel.js — Cards unchanged. 10 compact header layouts.
// L1 Chips • L2 Mini row • L3 Toolbar • L4 Grid • L5 Inline pills
// L6 Key/Value bar • L7 Subtle table • L8 Ticker strip • L9 Sidebar (narrow)
// L10 Tabs (summary + actions)
// Uses your wallet/staking helpers if present. Attributes fixed via includeAttributes=true.

(function (FF, CFG) {
  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn', more:'#ownedMore' };
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // ---------- Scoped, minimal CSS (header only; cards untouched) ----------
  (function injectCSS(){
    if (document.getElementById('owned-headers-10')) return;
    const css = `
#ownedCard .oh-wrap{margin-bottom:10px}
#ownedCard .oh-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#ownedCard .oh-spacer{flex:1}
#ownedCard .oh-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:12px}
#ownedCard .oh-k{opacity:.7}
#ownedCard .oh-v{font-weight:800}
#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedCard .oh-btn:active{transform:translateY(1px)}
#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedCard .oh-sm{font-size:12px}
#ownedCard .oh-muted{color:var(--muted)}
#ownedCard .oh-mini{font-size:11px;line-height:1}
#ownedCard .oh-grid{display:grid;gap:8px}
#ownedCard .oh-grid.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
#ownedCard .oh-grid.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
#ownedCard .oh-grid.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:900px){#ownedCard .oh-grid.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
#ownedCard .oh-tile{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:8px}
#ownedCard .oh-tile .t-k{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
#ownedCard .oh-tile .t-v{font-weight:900;font-size:16px}
#ownedCard .oh-pill{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:3px 8px}
#ownedCard .oh-kv{display:flex;gap:16px;flex-wrap:wrap}
#ownedCard .oh-kvi{display:flex;gap:6px;align-items:center}
#ownedCard .oh-table{border:1px solid var(--border);border-radius:10px;overflow:hidden}
#ownedCard .oh-table .r{display:grid;grid-template-columns:120px 1fr;gap:8px;padding:8px;border-top:1px solid var(--border)}
#ownedCard .oh-table .r:first-child{border-top:0}
#ownedCard .oh-ticker{display:flex;gap:10px;overflow:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;padding:2px}
#ownedCard .oh-tick{display:inline-flex;gap:6px;align-items:center;border:1px dashed var(--border);border-radius:8px;padding:6px 10px}
#ownedCard .oh-side{display:grid;grid-template-columns:180px 1fr;gap:10px}
@media (max-width:900px){#ownedCard .oh-side{grid-template-columns:1fr}}
#ownedCard .oh-side .sidebox{border:1px solid var(--border);border-radius:10px;background:var(--panel);padding:8px}
#ownedCard .oh-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:6px}
#ownedCard .oh-tab{padding:6px 10px;border:1px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;background:var(--panel)}
#ownedCard .oh-tab[aria-selected="true"]{font-weight:800}
#ownedCard .oh-slim .oh-btn{padding:5px 8px}
#ownedCard .oh-right{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#ownedCard .oh-select{border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 8px;font-size:12px}
    `;
    const el=document.createElement('style'); el.id='owned-headers-10'; el.textContent=css; document.head.appendChild(el);
  })();

  // ---------- Spaced fetch queue (shared) ----------
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    const headers=()=> (FF.apiHeaders?.() || { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY });
    async function spaced(url){ const d=Date.now()-lastAt; if(d<RATE_MIN_MS) await sleep(RATE_MIN_MS-d); lastAt=Date.now(); return fetch(url,{headers:headers()}); }
    async function run(url){ let i=0; while(true){ const res=await spaced(url); if(res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; } if(!res.ok){ const t=await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status}${t?' — '+t:''}`);} return res.json(); } }
    window.FF_RES_QUEUE={ fetch:(url)=> (chain = chain.then(()=> run(url))) };
  }

  // ---------- Utils ----------
  const $=(s,r=document)=>r.querySelector(s);
  const shorten=(a)=> (FF.shorten?.(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const imgFor=(id)=> (CFG.SOURCE_PATH||'')+'/frog/'+id+'.png';
  const etherscanToken=(id)=>{
    const base =
      CHAIN_ID===1?'https://etherscan.io/token/':
      CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/':
      CHAIN_ID===5?'https://goerli.etherscan.io/token/':
      'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  };
  const openseaToken=(id)=>`https://opensea.io/assets/ethereum/${COLLECTION}/${id}`;
  const toast=(m)=>{ try{FF.toast?.(m);}catch{} console.log('[owned]',m); };

  // Format big token amounts (e.g., 18 decimals → human)
  function toBigIntSafe(v){
    try{
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') return BigInt(Math.trunc(v));
      if (typeof v === 'string'){
        // allow plain integers; if contains '.', strip for simplicity
        const s = v.includes('.') ? v.split('.')[0] : v;
        return BigInt(s);
      }
    }catch{}
    return null;
  }
  function formatAmountWeiLike(v, decimals=18){
    // Accept bigint/number/string; move `decimals` left; smart rounding
    const bi = toBigIntSafe(v);
    if (bi == null) return '—';
    const neg = bi < 0n ? '-' : '';
    const abs = bi < 0n ? -bi : bi;
    const pow = 10n ** BigInt(decimals);
    const whole = abs / pow;
    const frac = abs % pow;

    // If large (>=100), show whole number; if smaller, show up to 2 decimals
    if (whole >= 100n) return neg + whole.toString();

    // two decimals rounded
    const two = 10n ** 2n;
    const rounded = ((frac * two) + (pow/ (2n* (pow/pow)))) / (pow/1n); // avoid zero; simple rounding
    const d2 = Number(rounded) / 100;
    const out = Number(whole) + d2;
    return neg + out.toFixed(out < 1 ? 2 : 2).replace(/\.00$/,'');
  }

  // time ago helper
  function fmtAgo(tsMs){
    if (!tsMs || !isFinite(tsMs)) return null;
    const s = Math.max(0, Math.floor((Date.now() - tsMs)/1000));
    const d = Math.floor(s/86400);
    if (d >= 1) return `${d}d ago`;
    const h = Math.floor((s%86400)/3600);
    if (h >= 1) return `${h}h ago`;
    const m = Math.floor((s%3600)/60);
    if (m >= 1) return `${m}m ago`;
    return `${s}s ago`;
  }

  // Wallet & staking helpers (best-effort)
  async function getConnectedAddress(){
    try{ if (window.FF_WALLET?.address) return window.FF_WALLET.address;
         if (FF.wallet?.getAddress){ const a=await FF.wallet.getAddress(); if(a) return a; } }catch{}
    return null;
  }
  async function requestConnect(){
    if (FF.wallet?.connect){ const a=await FF.wallet.connect(); return a||null; }
    if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_requestAccounts'}); return arr?.[0]||null; }
    throw new Error('No wallet provider found.');
  }
  const STK = ()=> (FF.staking || window.FF_STAKING || {});
  async function isApproved(addr){
    for (const k of ['isApproved','isApprovedForAll','checkApproval'])
      if (typeof STK()[k]==='function'){ try{ return !!await STK()[k](addr);}catch{} }
    return null;
  }
  async function requestApproval(){
    for (const k of ['approve','approveIfNeeded','requestApproval','setApproval'])
      if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Approval helper not found.');
  }
  async function getRewards(addr){
    for (const k of ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards'])
      if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }
  async function claimRewards(){
    for (const k of ['claimRewards','claim','harvest'])
      if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Claim helper not found.');
  }
  async function getStakedIds(addr){
    if (window.FF_WALLET?.stakedIds?.values) return Array.from(window.FF_WALLET.stakedIds.values());
    for (const k of ['getStakedTokenIds','getUserStakedTokens','stakedTokenIds','stakedIds'])
      if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }
  // Try to fetch "staked since" timestamp in ms for a token id
  async function getStakeSinceMs(tokenId){
    const S = STK();
    try{
      if (typeof S.getStakeSince === 'function'){
        const v = await S.getStakeSince(tokenId); // seconds or ms?
        return Number(v) > 1e12 ? Number(v) : Number(v)*1000;
      }
      if (typeof S.getStakeInfo === 'function'){
        const info = await S.getStakeInfo(tokenId);
        const sec = info?.since ?? info?.stakedAt ?? info?.timestamp;
        if (sec != null) return Number(sec) > 1e12 ? Number(sec) : Number(sec)*1000;
      }
      if (typeof S.stakeSince === 'function'){
        const sec = await S.stakeSince(tokenId);
        return Number(sec) > 1e12 ? Number(sec) : Number(sec)*1000;
      }
    }catch{}
    return null;
  }

  // ---------- State ----------
  let addr=null, continuation=null, items=[], loading=false, io=null, RANKS=null;
  const LKEY='FF_OWNED_HEADER_LAYOUT';
  const layouts=['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10'];
  function getLayout(){ const v=localStorage.getItem(LKEY)||'L2'; return layouts.includes(v)?v:'L2'; }
  function setLayout(v){ localStorage.setItem(LKEY, layouts.includes(v)?v:'L2'); }

  // ---------- Ranks ----------
  async function ensureRanks(){
    if (FF.RANKS){ RANKS=FF.RANKS; return RANKS; }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    const j = FF.fetchJSON ? await FF.fetchJSON(url) : await (await fetch(url)).json();
    RANKS = Array.isArray(j) ? j.reduce((m,r)=> (m[String(r.id)]=r.ranking, m), {}) : (j||{});
    FF.RANKS=RANKS; return RANKS;
  }

  // ---------- Data (cards unchanged) ----------
  function mapRow(row){
    const t=row?.token||{}; const id=Number(t?.tokenId); if(!isFinite(id)) return null;
    const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value:(a?.value ?? a?.trait_value ?? '') })) : [];
    const staked = !!(window.FF_WALLET?.stakedIds?.has?.(id));
    return { id, attrs, staked, sinceMs:null };
  }
  async function fetchPage(){
    const qs=new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'true' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr)+'?'+qs.toString());
    const rows = (j?.tokens||[]).map(mapRow).filter(Boolean);
    continuation = j?.continuation || null;
    return rows;
  }

  // ---------- Header Rendering (10 layouts) ----------
  function headerRoot(){
    const card=$(SEL.card); if(!card) return null;
    let wrap = card.querySelector('.oh-wrap');
    if (!wrap){
      wrap = document.createElement('div'); wrap.className='oh-wrap';
      // Put header right above the grid
      card.insertBefore(wrap, $(SEL.grid, card));
    }
    wrap.innerHTML = ''; // clear
    return wrap;
  }

  function asStr(v){
    if (v==null) return '—';
    if (typeof v==='object' && v.formatted) return v.formatted;
    if (typeof v==='bigint') return v.toString();
    return String(v);
  }

  function headerData(){
    const osHref = addr ? ('https://opensea.io/'+addr+'/collections') : '#';
    return {
      owned: items.length || 0,
      staked: _stakedCount == null ? '—' : _stakedCount,
      rewards: _rewardsPretty ?? asStr(_rewards),
      wallet: addr,
      osHref
    };
  }

  function buildLayout(layout, data){
    const w = headerRoot(); if(!w) return;
    const { owned, staked, rewards, wallet, osHref } = data;
    const walletShort = wallet ? shorten(wallet) : '—';

    // Common controls
    const actions = `
      <div class="oh-right">
        <button class="oh-btn" id="ohConnect">Connect</button>
        <button class="oh-btn" id="ohApprove">Approve</button>
        <button class="oh-btn" id="ohClaim">Claim</button>
        <select class="oh-select" id="ohLayout">
          ${layouts.map(l=>`<option value="${l}" ${l===layout?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    `;

    // L1 — Chips row
    if (layout==='L1'){
      w.innerHTML = `
        <div class="oh-row oh-slim">
          <span class="oh-chip"><span class="oh-k">Owned</span><span class="oh-v" id="ohOwned">${owned}</span></span>
          <span class="oh-chip"><span class="oh-k">Staked</span><span class="oh-v" id="ohStaked">${staked}</span></span>
          <span class="oh-chip"><span class="oh-k">Rewards</span><span class="oh-v" id="ohRewards">${rewards}</span></span>
          <a class="oh-chip" id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener"><span class="oh-k">Wallet</span><span class="oh-v" id="ohWallet">${walletShort}</span></a>
          <span class="oh-spacer"></span>
          ${actions}
        </div>`;
    }

    // L2 — Mini row
    if (layout==='L2'){
      w.innerHTML = `
        <div class="oh-row oh-mini">
          <span><span class="oh-muted">Owned:</span> <b id="ohOwned">${owned}</b></span>
          <span>•</span>
          <span><span class="oh-muted">Staked:</span> <b id="ohStaked">${staked}</b></span>
          <span>•</span>
          <span><span class="oh-muted">Rewards:</span> <b id="ohRewards">${rewards}</b></span>
          <span>•</span>
          <a id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener" class="oh-muted">Wallet:</a> <b id="ohWallet">${walletShort}</b>
          <span class="oh-spacer"></span>
          ${actions}
        </div>`;
    }

    // L3 — Slim toolbar
    if (layout==='L3'){
      w.innerHTML = `
        <div class="oh-row oh-slim">
          <span class="oh-chip"><span class="oh-k">Owned</span><span class="oh-v" id="ohOwned">${owned}</span></span>
          <span class="oh-chip"><span class="oh-k">Staked</span><span class="oh-v" id="ohStaked">${staked}</span></span>
          <span class="oh-chip"><span class="oh-k">Rewards</span><span class="oh-v" id="ohRewards">${rewards}</span></span>
          <a class="oh-chip" id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener"><span class="oh-k">Wallet</span><span class="oh-v" id="ohWallet">${walletShort}</span></a>
        </div>
        <div class="oh-row oh-slim" style="margin-top:6px">
          ${actions}
        </div>`;
    }

    // L4 — Grid tiles
    if (layout==='L4'){
      w.innerHTML = `
        <div class="oh-grid cols-4">
          <div class="oh-tile"><div class="t-k">Owned</div><div class="t-v" id="ohOwned">${owned}</div></div>
          <div class="oh-tile"><div class="t-k">Staked</div><div class="t-v" id="ohStaked">${staked}</div></div>
          <div class="oh-tile"><div class="t-k">Rewards</div><div class="t-v" id="ohRewards">${rewards}</div></div>
          <div class="oh-tile"><div class="t-k">Wallet</div><div class="t-v" id="ohWallet">${walletShort}</div></div>
        </div>
        <div class="oh-row" style="margin-top:6px">
          <a class="oh-btn" id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener">OpenSea</a>
          <span class="oh-spacer"></span>
          ${actions}
        </div>`;
    }

    // L5 — Inline pills
    if (layout==='L5'){
      w.innerHTML = `
        <div class="oh-row">
          <span class="oh-pill"><b id="ohOwned">${owned}</b>&nbsp;<span class="oh-muted">owned</span></span>
          <span class="oh-pill"><b id="ohStaked">${staked}</b>&nbsp;<span class="oh-muted">staked</span></span>
          <span class="oh-pill"><b id="ohRewards">${rewards}</b>&nbsp;<span class="oh-muted">rewards</span></span>
          <a class="oh-pill" id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener"><b id="ohWallet">${walletShort}</b>&nbsp;<span class="oh-muted">wallet</span></a>
          <span class="oh-spacer"></span>
          ${actions}
        </div>`;
    }

    // L6 — Key/Value bar
    if (layout==='L6'){
      w.innerHTML = `
        <div class="oh-kv">
          <div class="oh-kvi"><span class="oh-muted">Owned</span> <b id="ohOwned">${owned}</b></div>
          <div class="oh-kvi"><span class="oh-muted">Staked</span> <b id="ohStaked">${staked}</b></div>
          <div class="oh-kvi"><span class="oh-muted">Rewards</span> <b id="ohRewards">${rewards}</b></div>
          <div class="oh-kvi"><a id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener" class="oh-muted">Wallet</a> <b id="ohWallet">${walletShort}</b></div>
          <span class="oh-spacer"></span>
          ${actions}
        </div>`;
    }

    // L7 — Subtle table
    if (layout==='L7'){
      w.innerHTML = `
        <div class="oh-table">
          <div class="r"><div class="oh-muted">Owned</div><div id="ohOwned">${owned}</div></div>
          <div class="r"><div class="oh-muted">Staked</div><div id="ohStaked">${staked}</div></div>
          <div class="r"><div class="oh-muted">Rewards</div><div id="ohRewards">${rewards}</div></div>
          <div class="r"><div class="oh-muted">Wallet</div><div><a id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener"><span id="ohWallet">${walletShort}</span></a></div></div>
        </div>
        <div class="oh-row" style="margin-top:6px">${actions}</div>`;
    }

    // L8 — Ticker strip
    if (layout==='L8'){
      w.innerHTML = `
        <div class="oh-ticker">
          <div class="oh-tick">Owned: <b id="ohOwned">${owned}</b></div>
          <div class="oh-tick">Staked: <b id="ohStaked">${staked}</b></div>
          <div class="oh-tick">Rewards: <b id="ohRewards">${rewards}</b></div>
          <a class="oh-tick" id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener">Wallet: <b id="ohWallet">${walletShort}</b></a>
          <div class="oh-tick">${actions}</div>
        </div>`;
    }

    // L9 — Sidebar
    if (layout==='L9'){
      w.innerHTML = `
        <div class="oh-side">
          <div class="sidebox oh-mini">
            <div><span class="oh-muted">Owned</span> <b id="ohOwned">${owned}</b></div>
            <div><span class="oh-muted">Staked</span> <b id="ohStaked">${staked}</b></div>
            <div><span class="oh-muted">Rewards</span> <b id="ohRewards">${rewards}</b></div>
            <div><span class="oh-muted">Wallet</span> <a id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener"><b id="ohWallet">${walletShort}</b></a></div>
          </div>
          <div class="oh-row">
            ${actions}
          </div>
        </div>`;
    }

    // L10 — Tabs
    if (layout==='L10'){
      w.innerHTML = `
        <div class="oh-tabs">
          <div class="oh-tab" aria-selected="true">Summary</div>
          <div class="oh-spacer"></div>
          ${actions}
        </div>
        <div class="oh-row oh-mini">
          <span>Owned <b id="ohOwned">${owned}</b></span>
          <span>•</span>
          <span>Staked <b id="ohStaked">${staked}</b></span>
          <span>•</span>
          <span>Rewards <b id="ohRewards">${rewards}</b></span>
          <span>•</span>
          <a id="ohWalletOS" href="${osHref}" target="_blank" rel="noopener">Wallet <b id="ohWallet">${walletShort}</b></a>
        </div>`;
    }

    // layout selector + actions
    const sel = $('#ohLayout', w);
    if (sel) sel.addEventListener('change', e=>{ setLayout(e.target.value); renderHeader(); });
    const bC = $('#ohConnect', w), bA = $('#ohApprove', w), bCl = $('#ohClaim', w);
    if (bC) bC.onclick = async ()=>{ bC.disabled=true; try{ addr = await requestConnect(); if(!addr) return; await afterConnect(); } finally{ bC.disabled=false; } };
    if (bA) bA.onclick = async ()=>{ bA.disabled=true; try{ await requestApproval(); toast('Approval submitted'); await refreshHeaderStats(); } catch{ toast('Approve failed'); } finally{ bA.disabled=false; } };
    if (bCl) bCl.onclick = async ()=>{ bCl.disabled=true; try{ await claimRewards(); toast('Claim sent'); await refreshHeaderStats(); } catch{ toast('Claim failed'); } finally{ bCl.disabled=false; } };

    // ensure wallet text/links reflect current addr
    if (addr){
      const ow = document.getElementById('ohWallet'); if (ow) ow.textContent = shorten(addr);
      const os = document.getElementById('ohWalletOS'); if (os) os.href = 'https://opensea.io/'+addr+'/collections';
    }
  }

  async function renderHeader(){
    const layout = getLayout();
    buildLayout(layout, headerData());
  }

  // Live KPI values held here:
  let _stakedCount = null;
  let _rewards = null;
  let _rewardsPretty = null;

  async function refreshHeaderStats(){
    // staked count
    try{
      const ids = addr ? await getStakedIds(addr) : null;
      _stakedCount = Array.isArray(ids) ? ids.length : '—';
    }catch{ _stakedCount = '—'; }
    // rewards (pretty)
    try{
      _rewards = addr ? await getRewards(addr) : null;
      _rewardsPretty = _rewards == null ? '—' : formatAmountWeiLike(_rewards, 18);
    }catch{ _rewards = null; _rewardsPretty = '—'; }
    await renderHeader();
  }

  async function afterConnect(){
    await renderHeader();
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Loading…</div>';
    continuation=null; items=[];
    await Promise.all([ loadFirstPage(), refreshHeaderStats() ]);
  }

  // ---------- Cards (classic) ----------
  function rankPill(rank){ return `<span class="pill">${(rank||rank===0)?`Rank #${rank}`:'<span class="muted">Rank N/A</span>'}</span>`; }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const chips=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; chips.push(`<li class="attr">${a.key}: <b>${String(a.value)}</b></li>`); if(chips.length>=max) break; }
    return chips.length? `<ul class="attr-list">${chips.join('')}</ul>` : '';
  }

  function metaLine(it){
    // Try to show "Staked X ago • Owned by You" if sinceMs available
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return ago ? `Staked ${ago} • Owned by You` : `Staked • Owned by You`;
    }
    return 'Not staked • Owned by You';
  }

  function wireCardActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            if (FF.staking?.stakeToken) await FF.staking.stakeToken(it.id);
            else if (FF.staking?.stakeTokens) await FF.staking.stakeTokens([it.id]);
            else return toast('Stake: helper not found');
            it.staked=true;
            it.sinceMs=Date.now();
            btn.textContent='Unstake'; btn.dataset.act='unstake';
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = metaLine(it);
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; it.sinceMs=null;
            btn.textContent='Stake'; btn.dataset.act='stake';
            const meta = scope.querySelector('.meta'); if (meta) meta.textContent = metaLine(it);
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch(e){ toast('Action failed'); }
      });
    });
  }

  async function hydrateStakedSince(batch){
    // fetch staked-since timestamps (best-effort)
    for (const it of batch){
      if (!it.staked) continue;
      try{ it.sinceMs = await getStakeSinceMs(it.id); }catch{ it.sinceMs=null; }
    }
  }

  function renderCards(){
    const root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; awaitHeaderOwned(0); return; }
    awaitHeaderOwned(items.length);

    items.forEach(it=>{
      const card=document.createElement('article');
      card.className='frog-card';
      card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">
         <h4 class="title">Frog #${it.id} ${rankPill(it.rank)}</h4>
         <div class="meta">${metaLine(it)}</div>
         ${attrsHTML(it.attrs,4)}
         <div class="actions">
           <button class="btn btn-outline-gray" data-act="${it.staked ? 'unstake' : 'stake'}">${it.staked ? 'Unstake' : 'Stake'}</button>
           <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
           <a class="btn btn-outline-gray" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
           <a class="btn btn-outline-gray" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
           <a class="btn btn-outline-gray" href="${imgFor(it.id)}" target="_blank" rel="noopener">Original</a>
         </div>`;
      root.appendChild(card);
      wireCardActions(card,it);
    });
  }

  function awaitHeaderOwned(n){
    const el = document.getElementById('ohOwned'); if (el) el.textContent = String(n);
  }

  // ---------- Paging ----------
  async function loadFirstPage(){
    loading=true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r=> r.rank = ranks?.[String(r.id)]);
      await hydrateStakedSince(rows);
      items = rows;
      renderCards();

      const root=$(SEL.grid); if (!root) return;
      if (io) io.disconnect();
      if (!continuation) return;
      const sentinel=document.createElement('div'); sentinel.setAttribute('data-sentinel',''); sentinel.style.height='1px'; root.appendChild(sentinel);
      io=new IntersectionObserver(async es=>{
        if (!es[0].isIntersecting || loading) return;
        loading=true;
        try{
          const r=await fetchPage(); r.forEach(x=> x.rank=(FF.RANKS||{})[String(x.id)]);
          await hydrateStakedSince(r);
          items=items.concat(r); renderCards();
        }catch(e){ toast('Could not load more'); }
        finally{ loading=false; }
      },{root,rootMargin:'140px',threshold:0.01});
      io.observe(sentinel);
    }catch(e){
      console.warn('[owned] first page failed',e);
      const root=$(SEL.grid); if(root) root.innerHTML='<div class="pg-muted">Failed to load owned frogs.</div>';
      awaitHeaderOwned('—');
    }finally{ loading=false; }
  }

  // ---------- Init ----------
  async function initOwned(){
    // Insert header container and first render with placeholder data
    await renderHeader();

    addr = await getConnectedAddress();
    if (addr){
      // also reflect addr immediately in header
      const ow = document.getElementById('ohWallet'); if (ow) ow.textContent = shorten(addr);
      const os = document.getElementById('ohWalletOS'); if (os) os.href = 'https://opensea.io/'+addr+'/collections';

      await afterConnect();
      return;
    }

    // Not connected yet
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    // Keep inline "Connect Wallet" button working too
    const inlineBtn = document.getElementById('ownedConnectBtn');
    if (inlineBtn){
      inlineBtn.style.display='inline-flex';
      inlineBtn.onclick = async ()=>{
        inlineBtn.disabled=true;
        try{ addr = await requestConnect(); if(!addr) return; await afterConnect(); }
        finally{ inlineBtn.disabled=false; }
      };
    }
  }

  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
