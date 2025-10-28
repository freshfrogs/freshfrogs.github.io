// assets/js/owned-panel.js
// Renders: Owned + Staked. Owned IDs from Reservoir; Staked IDs from controller.
// Metadata always from frog/json/{id}.json. No OpenSea button. Attribute chips → bullets.
// Header: Owned • Staked • Unclaimed Rewards (+ Approve/Claim). Connect btn stays green.

(function (FF, CFG) {
  'use strict';

  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn' };
  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;
  const REWARD_SYMBOL   = (CFG.REWARD_TOKEN_SYMBOL || '$FLYZ');
  const REWARD_DECIMALS = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
  const BASEPATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,''); // prefix for /frog assets if any

  // Paths
  const imgFor  = (id)=> `${BASEPATH}/frog/${id}.png`;
  const jsonFor = (id)=> `${BASEPATH}/frog/json/${id}.json`;
  const etherscanToken=(id)=>{
    const base =
      CHAIN_ID===1?'https://etherscan.io/token/':
      CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/':
      CHAIN_ID===5?'https://goerli.etherscan.io/token/':
      'https://etherscan.io/token/';
    return base + COLLECTION + '?a=' + id;
  };

  // --- CSS (scoped) ---
  (function injectCSS(){
    if (document.getElementById('owned-clean-css')) return;
    const css = `
#ownedCard .oh-wrap{margin-bottom:10px}
#ownedCard .oh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#ownedCard .oh-mini{font-size:11px;line-height:1}
#ownedCard .oh-spacer{flex:1}
#ownedCard .oh-muted{color:var(--muted)}
#ownedCard .oh-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedCard .oh-btn:active{transform:translateY(1px)}
#ownedCard .oh-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedCard .pg-card-head .btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedCard .pg-card-head .btn.btn-connected{background: color-mix(in srgb,#22c55e 18%,var(--panel));border-color: color-mix(in srgb,#22c55e 85%,var(--border));color: color-mix(in srgb,#ffffff 90%,#22c55e)}
#ownedCard{display:flex;flex-direction:column}
#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}
@media (hover:hover){
  #ownedGrid::-webkit-scrollbar{width:8px}
  #ownedGrid::-webkit-scrollbar-thumb{background: color-mix(in srgb,var(--muted) 35%, transparent); border-radius:8px}
}
#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}
#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}
    `;
    const el=document.createElement('style'); el.id='owned-clean-css'; el.textContent=css; document.head.appendChild(el);
  })();

  // --- Utils ---
  const $=(s,r=document)=>r.querySelector(s);
  const shorten=(a)=> (FF.shorten?.(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const toast=(m)=>{ try{FF.toast?.(m);}catch{} console.log('[owned]',m); };

  function formatToken(raw,dec=REWARD_DECIMALS){
    // Accept: bigint/number/hex; {formatted}; {value|amount,decimals}; or human string.
    const toBigInt=(v)=>{ try{
      if(typeof v==='bigint') return v;
      if(typeof v==='number') return BigInt(Math.trunc(v));
      if(typeof v==='string'){ if(/^0x/i.test(v)) return BigInt(v); if(/^-?\d+/.test(v)) return BigInt(v.split('.')[0]); }
      if(v && typeof v.toString==='function' && v.toString!==Object.prototype.toString){ const s=v.toString(); if(/^\d+$/.test(s)) return BigInt(s); }
      if(v && typeof v._hex==='string') return BigInt(v._hex);
    }catch{} return null; };
    if (raw && typeof raw==='object'){
      if ('formatted' in raw) return String(raw.formatted);
      if ('value' in raw && 'decimals' in raw) return formatToken(raw.value, Number(raw.decimals));
      if ('amount' in raw && 'decimals' in raw) return formatToken(raw.amount, Number(raw.decimals));
    }
    if (typeof raw==='string' && raw.includes('.')) return raw;
    const bi = toBigInt(raw); if (bi==null) return '—';
    const sign = bi<0n?'-':''; const abs=sign?-bi:bi;
    const base=10n**BigInt(dec);
    const whole=abs/base, frac=abs%base;
    if (whole>=100n) return sign+whole.toString();
    const cents=Number((frac*100n)/base);
    const out=Number(whole)+cents/100;
    return (sign+out.toFixed(2)).replace(/\.00$/,'');
  }

  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    const s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    const d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    const h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    const m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }

  // --- Wallet & staking helpers ---
  async function getConnectedAddress(){
    try{
      if (window.FF_WALLET?.address) return window.FF_WALLET.address;
      if (FF.wallet?.getAddress){ const a=await FF.wallet.getAddress(); if(a) return a; }
      if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_accounts'}); return arr?.[0]||null; }
    }catch{} return null;
  }
  async function requestConnect(){
    try{
      if (FF.wallet?.connect){ const a=await FF.wallet.connect(); if(a) return a; }
      if (window.ethereum?.request){ const arr=await window.ethereum.request({method:'eth_requestAccounts'}); return arr?.[0]||null; }
    }catch(e){ toast('Connect failed'); }
    throw new Error('No wallet provider found.');
  }
  const STK = ()=> (FF.staking || window.FF_STAKING || {});
  async function getStakedIds(addr){
    try{
      if (typeof window.getStakedTokens === 'function'){ const raw=await window.getStakedTokens(addr); return normalizeIds(raw); }
      if (typeof STK().getStakedTokens === 'function'){ const raw=await STK().getStakedTokens(addr); return normalizeIds(raw); }
      if (typeof STK().getUserStakedTokens === 'function'){ const ids=await STK().getUserStakedTokens(addr); return normalizeIds(ids); }
    }catch(e){ console.warn('[owned] getStakedIds failed',e); }
    return [];
  }
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    const toNum=(x)=>{ try{
      if(x==null) return NaN;
      if(typeof x==='number') return x;
      if(typeof x==='bigint') return Number(x);
      if(typeof x==='string'){ if(/^0x/i.test(x)) return Number(BigInt(x)); return Number(x); }
      if(typeof x==='object'){
        if(typeof x.toString==='function' && x.toString!==Object.prototype.toString){ const s=x.toString(); if(/^\d+$/.test(s)) return Number(s); }
        if('_hex' in x) return Number(x._hex);
        if('hex'  in x) return Number(x.hex);
      }
      return NaN;
    }catch{ return NaN; }};
    return rows.map(r=>{
      if (Array.isArray(r)) return toNum(r[0]);
      if (typeof r==='string' || typeof r==='number' || typeof r==='bigint') return toNum(r);
      if (typeof r==='object'){ const cand=r.tokenId ?? r.id ?? r.token_id ?? r.tokenID ?? r[0]; return toNum(cand); }
      return NaN;
    }).filter(Number.isFinite);
  }
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
  async function getStakeSinceMs(tokenId){
    const S=STK();
    try{
      if (typeof S.getStakeSince==='function'){ const v=await S.getStakeSince(tokenId); return Number(v)>1e12?Number(v):Number(v)*1000; }
      if (typeof S.getStakeInfo==='function'){ const i=await S.getStakeInfo(tokenId); const sec=i?.since??i?.stakedAt??i?.timestamp; if (sec!=null) return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
      if (typeof S.stakeSince==='function'){ const sec=await S.stakeSince(tokenId); return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
    }catch{} return null;
  }

  // --- NEW: fallback to infer stake time via Transfer(to=controller) events ---
  // Returns ms epoch or null
  async function stakeSinceViaEvents(tokenId){
    try{
      if (!window.Web3) return null;
      const provider = window.ethereum || (CFG?.RPC_URL ? new Web3.providers.HttpProvider(CFG.RPC_URL) : null);
      if (!provider) return null;
      const web3 = new Web3(provider);
      const erc721 = new web3.eth.Contract([
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"}
      ], CFG.COLLECTION_ADDRESS);

      const evs = await erc721.getPastEvents('Transfer', {
        filter: { to: CFG.CONTROLLER_ADDRESS, tokenId: tokenId },
        fromBlock: 0, toBlock: 'latest'
      });
      if (!evs.length) return null;
      const last = evs[evs.length - 1];
      const b = await web3.eth.getBlock(last.blockNumber);
      return Number(b.timestamp) * 1000;
    }catch(_){ return null; }
  }

  // --- State ---
  let addr=null, continuation=null, items=[], io=null;
  let _stakedCount=null, _rewardsPretty='—', _approved=null;

  // --- Local metadata cache ---
  const META = new Map();
  async function fetchMeta(id){
    if (META.has(id)) return META.get(id);
    try{
      const r = await fetch(jsonFor(id));
      const j = r.ok ? await r.json() : null;
      const attrs = Array.isArray(j?.attributes)
        ? j.attributes.map(a=>({ key:a?.key||a?.trait_type||'', value:(a?.value ?? a?.trait_value ?? '') }))
        : [];
      const out = { id, attrs };
      META.set(id,out); return out;
    }catch{
      const out={ id, attrs:[] }; META.set(id,out); return out;
    }
  }
  async function loadMetaBatch(ids){
    const out=[]; for (const id of ids){ out.push(await fetchMeta(id)); } return out;
  }

  // --- Header ---
  function headerRoot(){ const card=$(SEL.card); if(!card) return null; let w=card.querySelector('.oh-wrap'); if(!w){ w=document.createElement('div'); w.className='oh-wrap'; card.insertBefore(w,$(SEL.grid,card)); } w.innerHTML=''; return w; }
  function headerData(){
    const ownedOnly = Array.isArray(items) ? items.filter(x => !x.staked).length : 0;
    return { owned: ownedOnly, staked:(_stakedCount==null?'—':_stakedCount), rewards:_rewardsPretty, approved:_approved };
  }
  function buildHeader(){
    const w=headerRoot(); if(!w) return; const d=headerData();
    w.innerHTML =
      '<div class="oh-row oh-mini">'+
        '<span class="oh-muted">Owned</span> <b id="ohOwned">'+d.owned+'</b>'+
        '<span>•</span><span class="oh-muted">Staked</span> <b id="ohStaked">'+d.staked+'</b>'+
        '<span>•</span><span class="oh-muted">Unclaimed Rewards</span> <b id="ohRewards">'+d.rewards+' '+REWARD_SYMBOL+'</b>'+
        '<span class="oh-spacer"></span>'+
        (d.approved===true ? '' : '<button class="oh-btn" id="ohApprove">Approve Staking</button>')+
        '<button class="oh-btn" id="ohClaim">Claim Rewards</button>'+
      '</div>';
    const bA=w.querySelector('#ohApprove'), bCl=w.querySelector('#ohClaim');
    if (bA) bA.addEventListener('click', async ()=>{ bA.disabled=true; try{ await requestApproval(); toast('Approval submitted'); await refreshHeaderStats(); }catch{ toast('Approve failed'); }finally{ bA.disabled=false; } });
    if (bCl) bCl.addEventListener('click', async ()=>{ bCl.disabled=true; try{ await claimRewards(); toast('Claim sent'); await refreshHeaderStats(); }catch{ toast('Claim failed'); }finally{ bCl.disabled=false; } });
  }
  async function renderHeader(){ buildHeader(); }

  // --- Height sync with left panel ---
  function syncHeights(){
    if (window.matchMedia('(max-width: 960px)').matches){ $('#ownedCard').style.height=''; $('#ownedGrid').style.maxHeight=''; return; }
    const cards=document.querySelectorAll('.page-grid > .pg-card'); if(cards.length<2) return;
    const left=cards[0], right=$('#ownedCard'); if(!left||!right) return;
    right.style.height=left.offsetHeight+'px';
    const header=right.querySelector('.oh-wrap'); const headerH=header?header.offsetHeight+10:0;
    const pad=20; const maxH=left.offsetHeight-headerH-pad;
    const grid=$('#ownedGrid'); if(grid) grid.style.maxHeight=Math.max(160,maxH)+'px';
  }
  window.addEventListener('resize',()=> setTimeout(syncHeights,50));

  // --- KPIs ---
  async function refreshHeaderStats(){
    try{ _approved = addr ? await isApproved(addr) : null; }catch{ _approved=null; }
    try{ const ids = addr ? await getStakedIds(addr) : []; _stakedCount = Array.isArray(ids)?ids.length:'—'; }catch{ _stakedCount='—'; }
    try{ const raw = addr ? await getRewards(addr) : null; _rewardsPretty = formatToken(raw, REWARD_DECIMALS); }catch{ _rewardsPretty='—'; }
    await renderHeader(); syncHeights();
  }

  // --- Cards ---
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const rows=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; rows.push('<li><b>'+a.key+':</b> '+String(a.value)+'</li>'); if(rows.length>=max) break; }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }
  function fmtMeta(it){
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return ago ? ('Staked '+ago+' • Owned by You') : 'Staked • Owned by You';
    }
    return 'Not staked • Owned by You';
  }
  function wireCardActions(scope,it){
    scope.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){
            if (FF.staking?.stakeToken) await FF.staking.stakeToken(it.id);
            else if (FF.staking?.stakeTokens) await FF.staking.stakeTokens([it.id]);
            else return toast('Stake: helper not found');
            it.staked=true; it.sinceMs=Date.now();
            btn.textContent='Unstake'; btn.dataset.act='unstake';
            const m=scope.querySelector('.meta'); if (m) m.textContent=fmtMeta(it);
            await refreshHeaderStats();
          }else if (act==='unstake'){
            if (FF.staking?.unstakeToken) await FF.staking.unstakeToken(it.id);
            else if (FF.staking?.unstakeTokens) await FF.staking.unstakeTokens([it.id]);
            else return toast('Unstake: helper not found');
            it.staked=false; it.sinceMs=null;
            btn.textContent='Stake'; btn.dataset.act='stake';
            const m=scope.querySelector('.meta'); if (m) m.textContent=fmtMeta(it);
            await refreshHeaderStats();
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else return toast('Transfer: helper not found');
          }
        }catch{ toast('Action failed'); }
      });
    });
  }

  function renderCards(){
    const root=$(SEL.grid); if (!root) return;
    root.innerHTML='';
    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; updateHeaderOwned(); syncHeights(); return; }
    updateHeaderOwned();
    items.forEach(it=>{
      const card=document.createElement('article');
      card.className='frog-card';
      card.setAttribute('data-token-id', String(it.id));
      card.innerHTML =
        '<img class="thumb" src="'+imgFor(it.id)+'" alt="'+it.id+'">'+
        '<h4 class="title">Frog #'+it.id+(it.rank||it.rank===0?' <span class="pill">Rank #'+it.rank+'</span>':'')+'</h4>'+
        '<div class="meta">'+fmtMeta(it)+'</div>'+
        (attrsHTML(it.attrs,4))+
        '<div class="actions">'+
          '<button class="btn btn-outline-gray" data-act="'+(it.staked ? 'unstake' : 'stake')+'">'+(it.staked ? 'Unstake' : 'Stake')+'</button>'+
          '<button class="btn btn-outline-gray" data-act="transfer">Transfer</button>'+
          '<a class="btn btn-outline-gray" href="'+etherscanToken(it.id)+'" target="_blank" rel="noopener">Etherscan</a>'+
          '<a class="btn btn-outline-gray" href="'+imgFor(it.id)+'" target="_blank" rel="noopener">Original</a>'+
        '</div>';
      root.appendChild(card);
      wireCardActions(card,it);
    });
    syncHeights();
  }
  function updateHeaderOwned(){
    const el=document.getElementById('ohOwned'); if (!el) return;
    const ownedOnly = Array.isArray(items) ? items.filter(x => !x.staked).length : 0;
    el.textContent = String(ownedOnly);
  }

  // Owned IDs page from Reservoir (metadata comes from local JSON)
  async function fetchOwnedIdsPage(){
    if (!window.FF_ALCH) throw new Error('Alchemy helper not loaded');
    const { tokens, pageKey } = await window.FF_ALCH.getOwnerTokens(addr, {
      pageKey: continuation || undefined,
      pageSize: PAGE_SIZE,
      withMetadata: false
    });
    continuation = pageKey || null;
    return tokens.map(t => Number(t.id)).filter(Number.isFinite);
  }

  // Optional: ranks JSON if available
  async function ensureRanks(){
    if (FF.RANKS) return FF.RANKS;
    const url = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
    try{
      const r = await fetch(url); if (!r.ok) throw new Error('no ranks');
      const j = await r.json();
      FF.RANKS = Array.isArray(j) ? j.reduce((m,rk)=> (m[String(rk.id)]=rk.ranking, m), {}) : (j||{});
      return FF.RANKS;
    }catch{ FF.RANKS = {}; return FF.RANKS; }
  }

  async function loadFirstPage(){
    try{
      const [ownedIds, ranks] = await Promise.all([ fetchOwnedIdsPage(), ensureRanks() ]);
      const stakedIds = addr ? await getStakedIds(addr) : [];
      _stakedCount = stakedIds.length;

      // Combine (add staked IDs not in owned)
      const seen = new Set(ownedIds);
      const idsForThisPage = ownedIds.concat(stakedIds.filter(id => !seen.has(id)));

      // Load local JSON for those IDs
      const metas = await loadMetaBatch(idsForThisPage);

      // Compose
      items = metas.map(m => ({
        id: m.id,
        attrs: m.attrs,
        staked: stakedIds.includes(m.id),
        sinceMs: null,
        rank: (ranks||{})[String(m.id)]
      }));

      // Fill stake times (adapter first; else fall back to events)
      await (async ()=>{
        const stakedBatch = items.filter(x=> x.staked);
        for (const it of stakedBatch){
          try{
            let ms = await getStakeSinceMs(it.id);          // may be null for this ABI
            if (!ms) ms = await stakeSinceViaEvents(it.id); // fallback from Transfer events
            if (ms && ms < 1e12) ms = ms * 1000;            // normalize to ms if seconds
            it.sinceMs = ms || null;
          }catch{ it.sinceMs = null; }
        }
      })();

      renderCards();

      // Infinite scroll for more OWNED pages
      const root=$(SEL.grid); if (!root) return;
      if (!continuation) { syncHeights(); return; }
      const sentinel=document.createElement('div'); sentinel.style.height='1px'; root.appendChild(sentinel);
      const ioCb = async (es)=>{
        if (!es[0].isIntersecting) return;
        observer.disconnect();
        try{
          const moreIds = await fetchOwnedIdsPage();
          const moreMetas = await loadMetaBatch(moreIds);
          const more = moreMetas
            .filter(m=> !items.some(x=> x.id===m.id))
            .map(m=> ({ id:m.id, attrs:m.attrs, staked: stakedIds.includes(m.id), sinceMs:null, rank:(FF.RANKS||{})[String(m.id)] }));
          items = items.concat(more);
          // hydrate staked times for the new batch
          for (const it of more){
            if (it.staked){
              try{
                let ms = await getStakeSinceMs(it.id);
                if (!ms) ms = await stakeSinceViaEvents(it.id);
                if (ms && ms < 1e12) ms = ms * 1000;
                it.sinceMs = ms || null;
              }catch{}
            }
          }
          renderCards();
        }catch{ toast('Could not load more'); }
      };
      const observer = new IntersectionObserver(ioCb, {root:root,rootMargin:'140px',threshold:0.01});
      observer.observe(sentinel);
    }catch(e){
      console.warn('[owned] first page failed', e);
      const root=$(SEL.grid); if (root) root.innerHTML='<div class="pg-muted">Failed to load owned frogs.</div>';
      updateHeaderOwned(); syncHeights();
    }
  }

  // --- Connect button ---
  function reflectConnectButton(){
    const btn=document.getElementById('ownedConnectBtn'); if(!btn) return;
    if (addr){ btn.classList.add('btn-connected'); btn.textContent=shorten(addr); }
    else { btn.classList.remove('btn-connected'); btn.textContent='Connect Wallet'; }
  }
  async function handleConnectClick(ev){
    const btn=ev?.currentTarget; if(btn) btn.disabled=true;
    try{ addr = await requestConnect(); if (!addr){ toast('No address'); return; } reflectConnectButton(); await afterConnect(); }
    catch{ toast('Connect failed'); }
    finally{ if(btn) btn.disabled=false; }
  }

  // --- Flow ---
  async function refreshAndRender(){ await Promise.all([ loadFirstPage(), refreshHeaderStats() ]); }
  async function afterConnect(){
    await renderHeader();
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Loading…</div>';
    await refreshAndRender();
  }
  async function initOwned(){
    // nuke any old info squares under this card
    const card=$(SEL.card); if (card) card.querySelectorAll('.info-grid-2').forEach(n=> n.remove());
    await renderHeader();

    const btn=document.getElementById('ownedConnectBtn');
    if (btn){ btn.style.display='inline-flex'; btn.addEventListener('click', handleConnectClick); }

    addr = await getConnectedAddress();
    reflectConnectButton();

    if (addr){ await afterConnect(); return; }
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    setTimeout(syncHeights,50);
  }

  window.FF_initOwnedPanel = initOwned;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
