// assets/js/owned-panel.js — Header redesign only; cards stay classic.
// - KPI header: Owned / Staked / Rewards / Wallet (+ OS link)
// - Utility bar: Connect / Approve Staking / Claim Rewards
// - Uses your wallet-state.js / wallet.js / staking.js if present.
// - Attributes fixed via includeAttributes=true.
// - Leaves the card rendering style as before (classic cards).

(function (FF, CFG) {
  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn', more:'#ownedMore' };

  // ---- minimal scoped styles (header only) ----
  (function injectCSS(){
    if (document.getElementById('owned-kpi-styles')) return;
    const css = `
#ownedCard .owned-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}
@media(max-width:900px){#ownedCard .owned-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
#ownedCard .owned-kpi{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:10px}
#ownedCard .owned-kpi .k{font-size:11px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
#ownedCard .owned-kpi .v{font-weight:900;font-size:22px;line-height:1.1;margin-top:2px}
#ownedCard .owned-kpi .n{font-size:12px;color:var(--muted)}
#ownedCard .owned-util{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
#ownedCard .owned-util .spacer{flex:1}
#ownedCard .chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:12px}
#ownedCard .btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedCard .btn:active{transform:translateY(1px)}
#ownedCard .btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedCard .pill{display:inline-block;padding:3px 10px;border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);border:1px solid var(--border);font-size:12px}
#ownedCard .attrs{list-style:none;margin:6px 0 0 0;padding:0;display:flex;gap:6px;flex-wrap:wrap}
#ownedCard .attr{border:1px dashed var(--border);border-radius:999px;padding:4px 10px;font-size:12px;background:color-mix(in srgb,var(--panel) 85%,transparent)}
`;
    const el=document.createElement('style'); el.id='owned-kpi-styles'; el.textContent=css; document.head.appendChild(el);
  })();

  // ---- config / endpoints ----
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // ---- global spaced queue (shared) ----
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

  // ---- utils ----
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

  // Wallet
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

  // Staking helpers
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

  // ---- state ----
  let addr=null, continuation=null, items=[], loading=false, io=null, RANKS=null;

  // ranks
  async function ensureRanks(){
    if (FF.RANKS){ RANKS=FF.RANKS; return RANKS; }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    const j = FF.fetchJSON ? await FF.fetchJSON(url) : await (await fetch(url)).json();
    RANKS = Array.isArray(j) ? j.reduce((m,r)=> (m[String(r.id)]=r.ranking, m), {}) : (j||{});
    FF.RANKS=RANKS; return RANKS;
  }

  // data mapping (cards unchanged)
  function mapRow(row){
    const t=row?.token||{}; const id=Number(t?.tokenId); if(!isFinite(id)) return null;
    const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value:(a?.value ?? a?.trait_value ?? '') })) : [];
    const staked = !!(window.FF_WALLET?.stakedIds?.has?.(id));
    return { id, attrs, staked };
  }
  async function fetchPage(){
    const qs=new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'true' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr)+'?'+qs.toString());
    const rows = (j?.tokens||[]).map(mapRow).filter(Boolean);
    continuation = j?.continuation || null;
    return rows;
  }

  // ---- header UI (KPI + utility bar) ----
  function ensureHeader(){
    const card=$(SEL.card); if(!card) return;

    // KPI row
    if (!card.querySelector('.owned-kpis')){
      const k = document.createElement('div');
      k.className='owned-kpis';
      k.innerHTML = `
        <div class="owned-kpi"><div class="k">Total Owned</div><div class="v" id="kpiOwned">—</div><div class="n">In this collection</div></div>
        <div class="owned-kpi"><div class="k">Staked</div><div class="v" id="kpiStaked">—</div><div class="n">In staking contract</div></div>
        <div class="owned-kpi"><div class="k">Available Rewards</div><div class="v" id="kpiRewards">—</div><div class="n">Unclaimed FLYZ</div></div>
        <div class="owned-kpi"><div class="k">Wallet</div><div class="v" id="kpiWallet">—</div><div class="n"><a id="kpiWalletOS" href="#" target="_blank" rel="noopener">OpenSea</a></div></div>
      `;
      card.insertBefore(k, $(SEL.grid));
    }

    // Utility bar
    if (!card.querySelector('.owned-util')){
      const u = document.createElement('div');
      u.className = 'owned-util';
      u.innerHTML = `
        <button class="btn" id="btnConnect">Connect Wallet</button>
        <button class="btn" id="btnApprove">Approve Staking</button>
        <button class="btn" id="btnClaim">Claim Rewards</button>
        <span class="spacer"></span>
        <span class="chip" id="statusChip">Ready</span>
      `;
      card.insertBefore(u, $(SEL.grid));

      // wire buttons
      $('#btnConnect', u).onclick = async ()=>{
        const b=$('#btnConnect',u); b.disabled=true;
        try{ addr = await requestConnect(); if(!addr) return;
             updateWallet(addr); setStatus('Loading…'); continuation=null; items=[];
             await Promise.all([loadFirstPage(), refreshKpis(addr)]); setStatus('Ready'); }
        finally{ b.disabled=false; }
      };
      $('#btnApprove', u).onclick = async ()=>{
        const b=$('#btnApprove',u); b.disabled=true; setStatus('Approving…');
        try{ await requestApproval(); setStatus('Approved'); } catch{ setStatus('Approve failed'); } finally{ b.disabled=false; }
      };
      $('#btnClaim', u).onclick = async ()=>{
        const b=$('#btnClaim',u); b.disabled=true; setStatus('Claiming…');
        try{ await claimRewards(); setStatus('Claim sent'); } catch{ setStatus('Claim failed'); } finally{ b.disabled=false; }
      };
    }
  }

  function setStatus(s){ const el=$('#statusChip'); if (el) el.textContent = s; }
  function updateWallet(a){
    const w=$('#kpiWallet'); if (w) w.textContent = a ? shorten(a) : '—';
    const os=$('#kpiWalletOS'); if (os && a) os.href = 'https://opensea.io/' + a + '/collections';
  }
  function setOwned(n){ const el=$('#kpiOwned'); if (el) el.textContent = (n==null)?'—':String(n); }
  function setStaked(n){ const el=$('#kpiStaked'); if (el) el.textContent = (n==null)?'—':String(n); }
  function setRewards(v){
    const el=$('#kpiRewards'); if(!el) return;
    if (v==null){ el.textContent='—'; return; }
    const s = (typeof v==='object' && v.formatted) ? v.formatted : (typeof v==='bigint' ? v.toString() : String(v));
    el.textContent = s;
  }

  async function refreshKpis(a){
    updateWallet(a); setOwned(items.length||0); setStaked('…'); setRewards('…');
    try{ const ids=await getStakedIds(a); setStaked(Array.isArray(ids)? ids.length : '—'); }catch{ setStaked('—'); }
    try{ const r=await getRewards(a); setRewards(r); }catch{ setRewards('—'); }
    try{
      const ok = await isApproved(a);
      const b = $('#btnApprove'); if (b){ if (ok===true){ b.textContent='Approved'; b.disabled=true; } else { b.textContent='Approve Staking'; b.disabled=false; } }
    }catch{}
  }

  // ---- cards (classic) ----
  function rankPill(rank){ return `<span class="pill">${(rank||rank===0)?`Rank #${rank}`:'<span class="muted">Rank N/A</span>'}</span>`; }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const chips=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; chips.push(`<li class="attr">${a.key}: <b>${String(a.value)}</b></li>`); if(chips.length>=max) break; }
    return chips.length? `<ul class="attrs">${chips.join('')}</ul>` : '';
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
            it.staked=true; btn.textContent='Unstake'; btn.dataset.act='unstake'; scope.querySelector('.meta')?.replaceChildren(document.createTextNode('Staked • Owned by You'));
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; btn.textContent='Stake'; btn.dataset.act='stake'; scope.querySelector('.meta')?.replaceChildren(document.createTextNode('Not staked • Owned by You'));
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch(e){ toast('Action failed'); }
      });
    });
  }

  function renderCards(){
    const root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; setOwned(0); return; }
    setOwned(items.length);

    items.forEach(it=>{
      const card=document.createElement('article');
      card.className='frog-card';
      card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">
         <h4 class="title">Frog #${it.id} ${rankPill(it.rank)}</h4>
         <div class="meta">${it.staked ? 'Staked' : 'Not staked'} • Owned by You</div>
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

  // ---- paging ----
  async function loadFirstPage(){
    loading=true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r=> r.rank = ranks?.[String(r.id)]);
      items = rows;
      renderCards();

      // infinite scroll sentinel
      const root=$(SEL.grid); if (!root) return;
      if (io) io.disconnect();
      if (!continuation) return;
      const sentinel=document.createElement('div'); sentinel.setAttribute('data-sentinel',''); sentinel.style.height='1px'; root.appendChild(sentinel);
      io=new IntersectionObserver(async es=>{
        if (!es[0].isIntersecting || loading) return;
        loading=true;
        try{
          const r=await fetchPage(); r.forEach(x=> x.rank=(FF.RANKS||{})[String(x.id)]);
          items=items.concat(r); renderCards();
        }catch(e){ toast('Could not load more'); }
        finally{ loading=false; }
      },{root,rootMargin:'140px',threshold:0.01});
      io.observe(sentinel);
    }catch(e){
      console.warn('[owned] first page failed',e);
      const root=$(SEL.grid); if(root) root.innerHTML='<div class="pg-muted">Failed to load owned frogs.</div>';
      setOwned('—');
    }finally{ loading=false; }
  }

  // ---- init ----
  async function initOwned(){
    ensureHeader();
    const grid=$(SEL.grid); if (!grid) return;

    addr = await getConnectedAddress();
    updateWallet(addr);

    if (!addr){
      grid.innerHTML = '<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
      // If the panel has a header connect button from your markup, keep it working
      const inlineBtn = document.getElementById('ownedConnectBtn');
      if (inlineBtn){
        inlineBtn.style.display='inline-flex';
        inlineBtn.onclick = async ()=>{
          inlineBtn.disabled = true;
          try{
            addr = await requestConnect();
            if (!addr) return;
            updateWallet(addr);
            grid.innerHTML = '<div class="pg-muted">Loading…</div>';
            continuation=null; items=[];
            await Promise.all([ loadFirstPage(), refreshKpis(addr) ]);
          } finally { inlineBtn.disabled=false; }
        };
      }
      // Also wire the new header Connect button if present
      const hdrBtn = document.getElementById('btnConnect');
      if (hdrBtn) hdrBtn.onclick = async ()=>{
        hdrBtn.disabled = true;
        try{
          addr = await requestConnect();
          if (!addr) return;
          updateWallet(addr);
          grid.innerHTML = '<div class="pg-muted">Loading…</div>';
          continuation=null; items=[];
          await Promise.all([ loadFirstPage(), refreshKpis(addr) ]);
        } finally { hdrBtn.disabled=false; }
      };
      return;
    }

    // already connected
    const inlineBtn = document.getElementById('ownedConnectBtn'); if (inlineBtn) inlineBtn.style.display='none';
    grid.innerHTML = '<div class="pg-muted">Loading…</div>';
    continuation=null; items=[];
    await Promise.all([ loadFirstPage(), refreshKpis(addr) ]);
  }

  function updateWallet(a){
    const w=$('#kpiWallet'); if (w) w.textContent = a ? shorten(a) : '—';
    const os=$('#kpiWalletOS'); if (os && a) os.href = 'https://opensea.io/' + a + '/collections';
  }

  window.FF_initOwnedPanel = initOwned;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
