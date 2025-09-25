// assets/js/owned-panel.js (v2)
// Reorganized Owned panel with distinct layouts + KPI ribbon + utility bar
(function (FF, CFG) {
  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn', more:'#ownedMore' };
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASE = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const TOKENS_API = (addr)=> BASE + '/users/' + addr + '/tokens/v8';
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;

  // ---------- global queue ----------
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    const apiHeaders=()=> (FF.apiHeaders?.() || { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY });
    async function spacedFetch(url){ const d=Date.now()-lastAt; if(d<RATE_MIN_MS) await sleep(RATE_MIN_MS-d); lastAt=Date.now(); return fetch(url,{headers:apiHeaders()}); }
    async function run(url){ let i=0; while(true){ const r=await spacedFetch(url); if(r.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue;} if(!r.ok){ const t=await r.text().catch(()=> ''); throw new Error(`HTTP ${r.status}${t?' — '+t:''}`);} return r.json(); } }
    window.FF_RES_QUEUE = { fetch:url=> (chain = chain.then(()=> run(url))) };
  }

  // ---------- utils ----------
  const $=(s,r=document)=>r.querySelector(s);
  const shorten=(a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const imgFor=(id)=> (CFG.SOURCE_PATH||'')+'/frog/'+id+'.png';
  const etherscanToken=(id)=>{
    const base = CHAIN_ID===1?'https://etherscan.io/token/': CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/': CHAIN_ID===5?'https://goerli.etherscan.io/token/':'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  };
  const openseaToken=(id)=>`https://opensea.io/assets/ethereum/${COLLECTION}/${id}`;
  function toast(msg){ try{ FF.toast?.(msg);}catch{} console.log('[owned]',msg); }

  // Wallet helpers
  async function getConnectedAddress(){
    try{ if (window.FF_WALLET?.address) return window.FF_WALLET.address;
         if (FF.wallet?.getAddress){ const a=await FF.wallet.getAddress(); if(a) return a; } }catch{}
    return null;
  }
  async function requestConnect(){
    if (FF.wallet?.connect){ const a=await FF.wallet.connect(); return a||null; }
    if (window.ethereum?.request){ const a=await window.ethereum.request({method:'eth_requestAccounts'}); return a?.[0]||null; }
    throw new Error('No wallet provider found.');
  }

  // Staking helpers (best-effort probes)
  const STK = ()=> (FF.staking || window.FF_STAKING || {});
  async function isApproved(addr){
    for (const k of ['isApproved','isApprovedForAll','checkApproval']) if (typeof STK()[k]==='function'){ try{ return !!await STK()[k](addr);}catch{} }
    return null;
  }
  async function requestApproval(){
    for (const k of ['approve','approveIfNeeded','requestApproval','setApproval']) if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Approval helper not found.');
  }
  async function getRewards(addr){
    for (const k of ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards']) if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }
  async function claimRewards(){
    for (const k of ['claimRewards','claim','harvest']) if (typeof STK()[k]==='function') return STK()[k]();
    throw new Error('Claim helper not found.');
  }
  async function getStakedIds(addr){
    if (window.FF_WALLET?.stakedIds?.values) return Array.from(window.FF_WALLET.stakedIds.values());
    for (const k of ['getStakedTokenIds','getUserStakedTokens','stakedTokenIds','stakedIds']) if (typeof STK()[k]==='function'){ try{ return await STK()[k](addr);}catch{} }
    return null;
  }

  // ---------- style (scoped) ----------
  (function injectStyles(){
    if (document.getElementById('owned-v2-styles')) return;
    const css = `
#ownedCard.owned-v2 { --gap:10px; }
#ownedCard.owned-v2 .kpi-ribbon{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gap);margin-bottom:10px}
@media(max-width:900px){#ownedCard.owned-v2 .kpi-ribbon{grid-template-columns:repeat(2,minmax(0,1fr))}}
#ownedCard.owned-v2 .kpi{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:10px}
#ownedCard.owned-v2 .kpi .label{font-size:11px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
#ownedCard.owned-v2 .kpi .value{font-weight:900;font-size:22px;line-height:1.1;margin-top:2px}
#ownedCard.owned-v2 .kpi .sub{font-size:12px;color:var(--muted)}
#ownedCard.owned-v2 .utilbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
#ownedCard.owned-v2 .utilbar .spacer{flex:1}
#ownedCard.owned-v2 .chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:12px}
#ownedCard.owned-v2 .gridA{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gap)}
@media(max-width:980px){#ownedCard.owned-v2 .gridA{grid-template-columns:1fr}}
#ownedCard.owned-v2 .cardA{border:1px solid var(--border);border-radius:14px;background:var(--panel);padding:12px;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}
#ownedCard.owned-v2 .cardA .thumb{width:112px;height:112px;border-radius:12px;background:var(--panel-2);object-fit:contain;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06),0 6px 12px rgba(0,0,0,.25)}
#ownedCard.owned-v2 .title{margin:0;font-weight:900;font-size:18px;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
#ownedCard.owned-v2 .pill{display:inline-block;padding:3px 10px;border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);border:1px solid var(--border);font-size:12px}
#ownedCard.owned-v2 .meta{color:var(--muted);font-size:12px}
#ownedCard.owned-v2 .attrs{list-style:none;margin:6px 0 0 0;padding:0;display:flex;gap:6px;flex-wrap:wrap}
#ownedCard.owned-v2 .attr{border:1px dashed var(--border);border-radius:999px;padding:4px 10px;font-size:12px;background:color-mix(in srgb,var(--panel) 85%,transparent)}
#ownedCard.owned-v2 .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
#ownedCard.owned-v2 .listB .row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:12px}
#ownedCard.owned-v2 .listB .thumb64{width:64px;height:64px;border-radius:10px;background:var(--panel-2);object-fit:contain}
#ownedCard.owned-v2 .listB .actCol{display:flex;flex-direction:column;gap:6px}
#ownedCard.owned-v2 .galC{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--gap)}
#ownedCard.owned-v2 .galC .tile{position:relative;border:1px solid var(--border);border-radius:12px;background:var(--panel);overflow:hidden}
#ownedCard.owned-v2 .galC img{display:block;width:100%;height:150px;object-fit:contain;background:var(--panel-2)}
#ownedCard.owned-v2 .badge{position:absolute;left:8px;top:8px;border-radius:999px;padding:3px 8px;border:1px solid var(--border);background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:11px}
#ownedCard.owned-v2 .badgeR{position:absolute;right:8px;top:8px;border-radius:999px;padding:3px 8px;border:1px solid var(--border);background:color-mix(in srgb,var(--panel) 85%,transparent);font-size:11px}
.btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s ease,border-color .15s ease,color .15s ease,transform .05s ease}
.btn:active{transform:translateY(1px)}
#ownedCard.owned-v2 .actions .btn:hover, #ownedCard.owned-v2 .utilbar .btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
`;
    const el=document.createElement('style'); el.id='owned-v2-styles'; el.textContent=css; document.head.appendChild(el);
  })();

  // ---------- state ----------
  let addr=null, continuation=null, items=[], loading=false, io=null, RANKS=null;
  const getLayout=()=> localStorage.getItem('FF_OWNED_LAYOUT_V2') || 'DASHBOARD';
  const setLayout=(v)=> localStorage.setItem('FF_OWNED_LAYOUT_V2', v);

  // ranks
  async function ensureRanks(){
    if (FF.RANKS){ RANKS=FF.RANKS; return RANKS; }
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    const j = FF.fetchJSON ? await FF.fetchJSON(url) : await (await fetch(url)).json();
    RANKS = Array.isArray(j) ? j.reduce((m,r)=> (m[String(r.id)]=r.ranking, m), {}) : (j||{});
    FF.RANKS=RANKS; return RANKS;
  }

  // data
  function mapRow(row){
    const t=row?.token||{}; const id=Number(t?.tokenId); if(!isFinite(id)) return null;
    const attrs = Array.isArray(t?.attributes) ? t.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value: (a?.value ?? a?.trait_value ?? '') })) : [];
    const staked = !!(window.FF_WALLET?.stakedIds?.has?.(id));
    return { id, attrs, staked };
  }
  async function fetchPage(){
    const qs = new URLSearchParams({ collection: COLLECTION, limit: String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'true' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(TOKENS_API(addr)+'?'+qs.toString());
    const rows = (j?.tokens||[]).map(mapRow).filter(Boolean);
    continuation = j?.continuation || null;
    return rows;
  }

  // ---------- header (KPI ribbon + utility bar) ----------
  function buildHeader(root){
    const card = $(SEL.card); if(!card) return;
    card.classList.add('owned-v2');

    // KPI ribbon
    let rib = card.querySelector('.kpi-ribbon');
    if (!rib){
      rib = document.createElement('div'); rib.className='kpi-ribbon';
      rib.innerHTML = `
        <div class="kpi" data-k="owned"><div class="label">Total Owned</div><div class="value" id="kpiOwned">—</div><div class="sub">In this collection</div></div>
        <div class="kpi" data-k="staked"><div class="label">Staked</div><div class="value" id="kpiStaked">—</div><div class="sub">In staking contract</div></div>
        <div class="kpi" data-k="rewards"><div class="label">Available Rewards</div><div class="value" id="kpiRewards">—</div><div class="sub">Unclaimed FLYZ</div></div>
        <div class="kpi" data-k="wallet"><div class="label">Wallet</div><div class="value" id="kpiWallet">—</div><div class="sub"><a id="kpiWalletOS" href="#" target="_blank" rel="noopener">OpenSea</a></div></div>
      `;
      card.insertBefore(rib, $(SEL.grid));
    }

    // Utility bar
    let ub = card.querySelector('.utilbar');
    if (!ub){
      ub = document.createElement('div'); ub.className='utilbar';
      ub.innerHTML = `
        <button class="btn" id="btnConnect">Connect Wallet</button>
        <button class="btn" id="btnApprove">Approve Staking</button>
        <button class="btn" id="btnClaim">Claim Rewards</button>
        <span class="spacer"></span>
        <span class="chip">View: <b id="viewMode">${getLayout()}</b></span>
        <button class="btn" id="btnCycle">Change View</button>
      `;
      card.insertBefore(ub, $(SEL.grid));
    }

    // Wire the controls
    $('#btnCycle',ub).onclick = ()=> { const next = (getLayout()==='DASHBOARD')?'LIST':(getLayout()==='LIST'?'GALLERY':'DASHBOARD'); setLayout(next); $('#viewMode',ub).textContent=next; renderAll(); };
    $('#btnConnect',ub).onclick = async ()=>{
      try{ $('#btnConnect',ub).disabled=true; addr = await requestConnect(); if(!addr) return; updateWallet(addr); await Promise.all([loadFirstPage(), refreshKpis(addr)]); }
      finally{ $('#btnConnect',ub).disabled=false; }
    };
    $('#btnApprove',ub).onclick = async ()=>{ const b=$('#btnApprove',ub); try{ b.disabled=true; await requestApproval(); toast('Approval submitted.'); } catch(e){ toast('Approve failed'); } finally{ b.disabled=false; } };
    $('#btnClaim',ub).onclick = async ()=>{ const b=$('#btnClaim',ub); try{ b.disabled=true; await claimRewards(); toast('Claim submitted.'); } catch(e){ toast('Claim failed'); } finally{ b.disabled=false; } };
  }

  function updateWallet(a){
    $('#kpiWallet').textContent = a ? shorten(a) : '—';
    const os = $('#kpiWalletOS'); if (os && a) os.href = 'https://opensea.io/'+a+'/collections';
  }
  function setOwned(n){ $('#kpiOwned').textContent = (n==null)?'—': String(n); }
  function setStaked(n){ $('#kpiStaked').textContent = (n==null)?'—': String(n); }
  function setRewards(v){
    if (v==null) return ($('#kpiRewards').textContent='—');
    const s = (typeof v==='object' && v.formatted) ? v.formatted : (typeof v==='bigint' ? v.toString() : String(v));
    $('#kpiRewards').textContent = s;
  }

  async function refreshKpis(a){
    updateWallet(a); setOwned(items.length||0); setStaked('…'); setRewards('…');
    try{ const ids = await getStakedIds(a); setStaked(Array.isArray(ids)? ids.length : '—'); }catch{ setStaked('—'); }
    try{ const r = await getRewards(a); setRewards(r); }catch{ setRewards('—'); }
    try{
      const ok = await isApproved(a);
      const b = $('#btnApprove'); if (b){ if (ok===true){ b.textContent='Approved'; b.disabled=true; } else { b.textContent='Approve Staking'; b.disabled=false; } }
    }catch{}
  }

  // ---------- rendering (3 distinct layouts) ----------
  function rankPill(rank){ return `<span class="pill">${(rank||rank===0)?`Rank #${rank}`:'<span class="muted">Rank N/A</span>'}</span>`; }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const chips=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; chips.push(`<li class="attr">${a.key}: <b>${String(a.value)}</b></li>`); if(chips.length>=max) break; }
    return chips.length? `<ul class="attrs">${chips.join('')}</ul>` : '';
  }
  function wireActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            if (FF.staking?.stakeToken) await FF.staking.stakeToken(it.id);
            else if (FF.staking?.stakeTokens) await FF.staking.stakeTokens([it.id]);
            else return toast('Stake: helper not found');
            it.staked=true; btn.textContent='Unstake'; btn.dataset.act='unstake'; scope.querySelector('.meta')?.replaceChildren(document.createTextNode('Staked • You'));
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; btn.textContent='Stake'; btn.dataset.act='stake'; scope.querySelector('.meta')?.replaceChildren(document.createTextNode('Not staked • You'));
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch(e){ toast('Action failed'); }
      });
    });
  }

  function renderAll(){
    const root = $(SEL.grid); if (!root) return;
    const mode = getLayout();
    root.removeAttribute('style'); root.innerHTML='';

    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; setOwned(0); return; }
    setOwned(items.length);

    if (mode==='DASHBOARD'){
      root.className='gridA';
      items.forEach(it=>{
        const card=document.createElement('div'); card.className='cardA';
        card.innerHTML = `
          <img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">
          <div>
            <h4 class="title">Frog #${it.id} ${rankPill(it.rank)}</h4>
            <div class="meta">${it.staked?'Staked':'Not staked'} • You</div>
            ${attrsHTML(it.attrs,4)}
            <div class="actions">
              <button class="btn" data-act="${it.staked?'unstake':'stake'}">${it.staked?'Unstake':'Stake'}</button>
              <button class="btn" data-act="transfer">Transfer</button>
              <a class="btn" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
              <a class="btn" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
            </div>
          </div>`;
        root.appendChild(card); wireActions(card,it);
      });
      return;
    }

    if (mode==='LIST'){
      const wrap=document.createElement('div'); wrap.className='listB'; wrap.style.display='grid'; wrap.style.gap='10px';
      items.forEach(it=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`
          <img class="thumb64" src="${imgFor(it.id)}" alt="${it.id}">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>Frog #${it.id}</b> ${rankPill(it.rank)}</div>
            <div class="meta">${it.staked?'Staked':'Not staked'} • ${attrsHTML(it.attrs,3)||'—'}</div>
          </div>
          <div class="actCol">
            <button class="btn" data-act="${it.staked?'unstake':'stake'}">${it.staked?'Unstake':'Stake'}</button>
            <button class="btn" data-act="transfer">Transfer</button>
            <a class="btn" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
          </div>`;
        row.addEventListener('dblclick',()=> window.open(openseaToken(it.id),'_blank','noopener'));
        wrap.appendChild(row); wireActions(row,it);
      });
      root.appendChild(wrap);
      return;
    }

    if (mode==='GALLERY'){
      const gal=document.createElement('div'); gal.className='galC';
      items.forEach(it=>{
        const t=document.createElement('a'); t.className='tile'; t.href=openseaToken(it.id); t.target='_blank'; t.rel='noopener';
        t.innerHTML = `
          <span class="badge">#${it.id}</span>
          <span class="badgeR">${(it.rank||it.rank===0)?'R#'+it.rank:'N/A'}</span>
          <img src="${imgFor(it.id)}" alt="${it.id}">
        `;
        gal.appendChild(t);
      });
      root.appendChild(gal);
      return;
    }
  }

  // ---------- paging ----------
  async function loadFirstPage(){
    loading=true;
    try{
      const [rows, ranks] = await Promise.all([ fetchPage(), ensureRanks() ]);
      rows.forEach(r=> r.rank = ranks?.[String(r.id)]);
      items = rows;
      renderAll();
      // sentinel for more
      const root=$(SEL.grid); if (!root) return;
      if (io) io.disconnect();
      if (!continuation) return;
      const s=document.createElement('div'); s.setAttribute('data-sentinel',''); s.style.height='1px'; root.appendChild(s);
      io=new IntersectionObserver(async es=>{
        if (!es[0].isIntersecting || loading) return;
        loading=true;
        try{
          const r=await fetchPage(); r.forEach(x=> x.rank = (RANKS||{})[String(x.id)]);
          items=items.concat(r); renderAll();
        }catch(e){ toast('Could not load more'); }
        finally{ loading=false; }
      },{root,rootMargin:'140px',threshold:0.01});
      io.observe(s);
    }catch(e){
      console.warn('[owned] first page failed',e);
      const root=$(SEL.grid); if(root) root.innerHTML='<div class="pg-muted">Failed to load owned frogs.</div>';
      setOwned('—');
    }finally{ loading=false; }
  }

  // ---------- init ----------
  async function initOwned(){
    const card=$(SEL.card); if(!card) return;
    buildHeader(card);

    addr = await getConnectedAddress();
    updateWallet(addr);

    const grid=$(SEL.grid);
    const btn = $('#btnConnect', card);
    if (!addr){
      if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
      if (btn){ btn.style.display='inline-flex'; btn.onclick = async ()=>{ btn.disabled=true; try{ addr=await requestConnect(); if(!addr) return; updateWallet(addr); grid.innerHTML='<div class="pg-muted">Loading…</div>'; continuation=null; items=[]; await Promise.all([loadFirstPage(), refreshKpis(addr)]);} finally{ btn.disabled=false; } }; }
      return;
    }

    if (btn) btn.style.display='none';
    if (grid) grid.innerHTML='<div class="pg-muted">Loading…</div>';
    continuation=null; items=[];
    await Promise.all([loadFirstPage(), refreshKpis(addr)]);
  }

  window.FF_initOwnedPanel = initOwned;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
