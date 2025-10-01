// assets/js/owned-panel.js
// Renders: Owned + Staked. Owned IDs from Reservoir; Staked IDs from controller.
// Metadata from frog/json/{id}.json. Attribute bullets. Header shows Owned • Staked • Unclaimed Rewards.
// Includes: 128×128 modal images, approve/stake/unstake/transfer panels, disabled transfer on staked,
// rarity sort (lowest rank first) + colored rarity pill, green "Staked … ago" meta.

(function (FF, CFG) {
  'use strict';

  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn' };
  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
  const RESV_HOST = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const PAGE_SIZE = Math.max(1, Math.min(50, Number(CFG.OWNED_PAGE_SIZE || CFG.PAGE_SIZE || 12)));
  const COLLECTION = CFG.COLLECTION_ADDRESS;
  const REWARD_SYMBOL   = (CFG.REWARD_TOKEN_SYMBOL || '$FLYZ');
  const REWARD_DECIMALS = Number.isFinite(Number(CFG.REWARD_DECIMALS)) ? Number(CFG.REWARD_DECIMALS) : 18;
  const BASEPATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');

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
#ownedGrid{overflow:auto;-webkit-overflow-scrolling:touch;padding-right:4px}
@media (hover:hover){
  #ownedGrid::-webkit-scrollbar{width:8px}
  #ownedGrid::-webkit-scrollbar-thumb{background: color-mix(in srgb,var(--muted) 35%, transparent); border-radius:8px}
}
#ownedCard .attr-bullets{list-style:disc;margin:6px 0 0 18px;padding:0}
#ownedCard .attr-bullets li{font-size:12px;margin:2px 0}

/* Address label */
#ownedCard .address-chip{
  font-family: var(--font-ui);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: 8px;
  padding: 6px 10px;
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  max-width: 40ch;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

/* Owned modal */
#ownedModal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:1000}
#ownedModal.show{display:flex}
#ownedModal .om-backdrop{position:absolute;inset:0;background:color-mix(in srgb, var(--panel) 35%, #000);backdrop-filter: blur(2px)}
#ownedModal .om-card{position:relative;min-width:320px;max-width:640px;margin:16px;border:1px solid var(--border);background:var(--panel);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);overflow:hidden}
#ownedModal .om-head{padding:0;border-bottom:0}
#ownedModal .om-title:empty{display:none}
#ownedModal .om-body{padding:22px}
#ownedModal .om-actions{display:flex;gap:8px;justify-content:flex-end;padding:14px 16px;border-top:1px solid var(--border)}
#ownedModal .om-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedModal .om-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedModal .om-btn.primary{background: color-mix(in srgb,#22c55e 18%,var(--panel));border-color: color-mix(in srgb,#22c55e 85%,var(--border));color: color-mix(in srgb,#ffffff 90%,#22c55e)}
#ownedModal .om-input{width:100%;border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:8px 10px;font-size:13px}
#ownedModal .om-mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}

/* Centered stack layout for stake/unstake + approval */
#ownedModal .om-col{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
#ownedModal .om-thumb{width:128px;height:128px;border-radius:10px;border:1px solid var(--border);object-fit:cover;background:#111;image-rendering:pixelated}
#ownedModal .om-name{font-weight:700;font-size:14px;color:#fff}
#ownedModal .om-copy{color:#fff;font-size:13px;line-height:1.5;max-width:52ch}
#ownedModal .om-copy p{margin:0 0 10px 0}
#ownedModal .om-logo{
  width:128px;height:128px;border-radius:12px;border:1px solid var(--border);object-fit:cover;background:#111;
}

/* Disabled buttons */
.btn[disabled], .btn-disabled{opacity:.45;pointer-events:none;filter:grayscale(.8)}

/* Rank rarity colors */
.rank-pill{
  display:inline-flex; align-items:center; gap:6px;
  border:1px solid var(--border); border-radius:999px; padding:3px 8px;
  font-size:11px; font-weight:700; letter-spacing:.01em;
  background:color-mix(in srgb, var(--panel) 35%, transparent);
}
.rank-pill::before{ content:'◆'; font-size:12px; line-height:1; }
.rank-legendary{ color:#f59e0b; border-color: color-mix(in srgb, #f59e0b 70%, var(--border)); }
.rank-legendary::before{ color:#f59e0b; }
.rank-epic{ color:#a855f7; border-color: color-mix(in srgb, #a855f7 70%, var(--border)); }
.rank-epic::before{ color:#a855f7; }
.rank-rare{ color:#38bdf8; border-color: color-mix(in srgb, #38bdf8 70%, var(--border)); }
.rank-rare::before{ color:#38bdf8; }
.rank-common{ color:inherit; border-color:var(--border); }
.rank-common::before{ color:var(--muted); }

/* Green highlight for "Staked … ago" */
#ownedCard .meta .staked-flag{ color:#22c55e; font-weight:700; }
    `;
    const el=document.createElement('style'); el.id='owned-clean-css'; el.textContent=css; document.head.appendChild(el);
  })();

  // --- Reservoir fetch queue ---
  if (!window.FF_RES_QUEUE){
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    const headers=()=> (FF.apiHeaders?.() || { accept:'application/json', 'x-api-key': CFG.FROG_API_KEY });
    async function spaced(url,init){ const d=Date.now()-lastAt; if(d<RATE_MIN_MS) await sleep(RATE_MIN_MS-d); lastAt=Date.now(); return fetch(url,{headers:headers(), ...init}); }
    async function run(url,init){ let i=0; while(true){ const res=await spaced(url,init); if(res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; } if(!res.ok){ const t=await res.text().catch(()=> ''); throw new Error('HTTP '+res.status+(t?' — '+t:'')); } return res.json(); } }
    window.FF_RES_QUEUE={ fetch:(url,init)=> (chain = chain.then(()=> run(url,init))) };
  }

  // --- Utils ---
  const $=(s,r=document)=>r.querySelector(s);
  const toast=(m)=>{ try{FF.toast?.(m);}catch{} console.log('[owned]',m); };

  function formatToken(raw,dec=REWARD_DECIMALS){
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

  // --- Rarity helpers (lower rank # = rarer) ---
  function rarityVal(x){
    const r = Number((x && x.rank) ?? Infinity);
    return Number.isFinite(r) ? r : Infinity;
  }
  function compareByRarity(a,b){
    const ra=rarityVal(a), rb=rarityVal(b);
    if (ra !== rb) return ra - rb;                 // rarer first
    return (a.id||0) - (b.id||0);                  // tie-break by id
  }
  function rankTier(rank){
    const r = Number(rank);
    if (!Number.isFinite(r)) return 'common';
    const T = (CFG.RARITY_TIERS) || { legendary: 50, epic: 250, rare: 800 };
    if (r <= T.legendary) return 'legendary';
    if (r <= T.epic)      return 'epic';
    if (r <= T.rare)      return 'rare';
    return 'common';
  }

  // --- Minimal themed modal ---
  function ensureOwnedModalRoot(){
    let m = document.getElementById('ownedModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ownedModal';
    m.innerHTML = `
      <div class="om-backdrop"></div>
      <div class="om-card">
        <div class="om-head"><div class="om-title"></div></div>
        <div class="om-body"></div>
        <div class="om-actions"></div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e)=>{ if (e.target.classList.contains('om-backdrop')) closeModal(); });
    return m;
  }
  function openModal({ title='', bodyHTML='', actions=[] }){
    const m = ensureOwnedModalRoot();
    m.querySelector('.om-title').textContent = title;
    m.querySelector('.om-body').innerHTML = bodyHTML;
    const act = m.querySelector('.om-actions'); act.innerHTML = '';
    actions.forEach(a=>{
      const b = document.createElement('button');
      b.className = 'om-btn' + (a.primary ? ' primary' : '');
      b.textContent = a.label || 'OK';
      b.addEventListener('click', async ()=>{
        try{ await a.onClick?.(); }finally{ if (!a.keepOpen) closeModal(); }
      });
      act.appendChild(b);
    });
    m.classList.add('show');
  }
  function closeModal(){
    const m = document.getElementById('ownedModal');
    if (m) m.classList.remove('show');
  }

  // --- Wallet / ABIs / Contracts (wallet-only) ---
  function getWeb3(){ if (!window.Web3 || !window.ethereum) throw new Error('Wallet not found'); return new Web3(window.ethereum); }
  function resolveCollectionAbi(){ if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI; return (window.COLLECTION_ABI || window.collection_abi || []); }
  function resolveControllerAbi(){ if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI; return (window.CONTROLLER_ABI || window.controller_abi || []); }

  function nftContract(){ const w3 = getWeb3(); return new w3.eth.Contract(resolveCollectionAbi(), CFG.COLLECTION_ADDRESS); }
  function ctrlContract(){ const w3 = getWeb3(); return new w3.eth.Contract(resolveControllerAbi(), CFG.CONTROLLER_ADDRESS); }

  async function ensureCorrectChain(){
    const targetHex = '0x' + Number(CHAIN_ID).toString(16);
    const curHex = await window.ethereum.request({ method:'eth_chainId' }).catch(()=>null);
    if (!curHex || curHex.toLowerCase() !== targetHex.toLowerCase()){
      await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId: targetHex }] }).catch(()=>{});
    }
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

  // Controller reads
  async function getStakedIds(addr){
    if (!window.ethereum || !window.Web3) return [];
    try{
      await ensureCorrectChain();
      const ctrl = ctrlContract();
      const raw  = await ctrl.methods.getStakedTokens(addr).call({ from: addr });
      const arr = Array.isArray(raw) ? raw : [];
      const out = arr.map(v=>{
        try{
          if (typeof v==='number') return v;
          if (typeof v==='string'){ return /^\d+$/.test(v) ? Number(v) : Number(BigInt(v)); }
          if (typeof v==='bigint') return Number(v);
          if (v && typeof v._hex==='string') return Number(BigInt(v._hex));
          if (Array.isArray(v)) return Number(v[v.length-1]);
          if (v && typeof v.toString==='function'){
            const s=v.toString();
            if (/^\d+$/.test(s)) return Number(s);
            if (/^0x/i.test(s)) return Number(BigInt(s));
          }
        }catch{}
        return NaN;
      }).filter(Number.isFinite);
      return out;
    }catch(e){
      console.warn('[owned] wallet getStakedTokens failed', e);
      return [];
    }
  }

  // Approvals on COLLECTION
  async function checkApproved(owner){
    try{
      await ensureCorrectChain();
      const nft = nftContract();
      return !!(await nft.methods.isApprovedForAll(owner, CFG.CONTROLLER_ADDRESS).call({ from: owner }));
    }catch{ return false; }
  }
  async function sendApprove(owner){
    await ensureCorrectChain();
    const nft = nftContract();
    return nft.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: owner });
  }

  // Stake / Unstake on CONTROLLER
  async function sendStake(owner, tokenId){
    await ensureCorrectChain();
    const ctrl = ctrlContract();
    return ctrl.methods.stake(String(tokenId)).send({ from: owner });
  }
  async function sendUnstake(owner, tokenId){
    await ensureCorrectChain();
    const ctrl = ctrlContract();
    return ctrl.methods.withdraw(String(tokenId)).send({ from: owner });
  }

  // Transfer on COLLECTION
  async function sendTransfer(owner, to, tokenId){
    await ensureCorrectChain();
    const nft = nftContract();
    return nft.methods.safeTransferFrom(owner, to, String(tokenId)).send({ from: owner });
  }

  // Rewards (view)
  async function getRewards(addr){
    try{
      await ensureCorrectChain();
      const ctrl = ctrlContract();
      return await ctrl.methods.availableRewards(addr).call({ from: addr });
    }catch(e){
      for (const k of ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards']){
        try{
          const S=(FF.staking||window.FF_STAKING||{}); if (typeof S[k]==='function') return await S[k](addr);
        }catch{}
      }
      return null;
    }
  }

  async function getStakeSinceMs(tokenId){
    const S=(FF.staking || window.FF_STAKING || {});
    try{
      if (typeof S.getStakeSince==='function'){ const v=await S.getStakeSince(tokenId); return Number(v)>1e12?Number(v):Number(v)*1000; }
      if (typeof S.getStakeInfo==='function'){ const i=await S.getStakeInfo(tokenId); const sec=i?.since??i?.stakedAt??i?.timestamp; if (sec!=null) return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
      if (typeof S.stakeSince==='function'){ const sec=await S.stakeSince(tokenId); return Number(sec)>1e12?Number(sec):Number(sec)*1000; }
    }catch{} return null;
  }

  // Fallback via Transfer(to=controller) events (for since time)
  async function stakeSinceViaEvents(tokenId){
    try{
      if (!window.Web3) return null;
      const provider = window.ethereum;
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
  let addr=null, continuation=null, items=[];
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
      const out = { id, attrs, metaRaw: j };
      META.set(id,out); return out;
    }catch{
      const out={ id, attrs:[], metaRaw:null }; META.set(id,out); return out;
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
    if (bA) bA.addEventListener('click', async ()=>{
      bA.disabled = true;
      try{
        const a = addr || await getConnectedAddress();
        const approved = a ? await checkApproved(a) : false;
        const stakedIds = a ? await getStakedIds(a) : [];
        const rewardsRaw = a ? await getRewards(a) : null;
        openApprovePanel(a, { approved, staked: stakedIds.length, rewards: rewardsRaw });
      }finally{ bA.disabled = false; }
    });
    if (bCl) bCl.addEventListener('click', async ()=>{
      bCl.disabled=true;
      try{
        const S=(FF.staking||window.FF_STAKING||{});
        if (typeof S.claimRewards==='function'){
          await S.claimRewards();
        }else{
          await ensureCorrectChain();
          const ctrl = ctrlContract();
          await ctrl.methods.claimRewards().send({ from: addr });
        }
        toast('Claim sent');
        await refreshHeaderStats();
      }
      catch{ toast('Claim failed'); }
      finally{ bCl.disabled=false; }
    });
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
    try{ _approved = addr ? await checkApproved(addr) : null; }catch{ _approved=null; }
    try{ const ids = addr ? await getStakedIds(addr) : []; _stakedCount = Array.isArray(ids)?ids.length:'—'; }catch{ _stakedCount='—'; }
    try{ const raw = addr ? await getRewards(addr) : null; _rewardsPretty = formatToken(raw, REWARD_DECIMALS); }catch{ _rewardsPretty='—'; }
    await renderHeader(); syncHeights();
  }

  // --- Panel templates (final copy) ---
  function approveCopyShort(){
    return `
      <div class="om-col" style="text-align:center">
        <img class="om-logo" src="assets/img/blackWhite.png" alt="Fresh Frogs">
        <div class="om-name">Staking Approval</div>
        <div class="om-copy" style="text-align:left">
          <p>Give the controller contract permission to manage your Frogs for staking. While staked, Frogs can’t be listed or transferred on marketplaces like OpenSea. You can unstake anytime on this site.</p>
        </div>
      </div>
    `;
  }
  function stakeCopy(id){
    return `
      <div class="om-col">
        <img class="om-thumb" src="${imgFor(id)}" alt="Frog #${id}">
        <div class="om-name">Frog #${id}</div>
        <div class="om-copy">
          <p>Stake Frog #${id} to start earning rewards. While staked, it can’t be transferred or listed. Unstake anytime.</p>
        </div>
      </div>
    `;
  }
  function unstakeCopy(id){
    return `
      <div class="om-col">
        <img class="om-thumb" src="${imgFor(id)}" alt="Frog #${id}">
        <div class="om-name">Frog #${id}</div>
        <div class="om-copy">
          <p>Return Frog #${id} from the staking contract to your wallet. Its staking level resets to 0.</p>
        </div>
      </div>
    `;
  }
  function transferCopy(id){
    return `
      <div class="om-col">
        <img class="om-thumb" src="${imgFor(id)}" alt="Frog #${id}">
        <div class="om-name">Frog #${id}</div>
        <div class="om-copy">
          <p>Transfer Frog #${id} to another wallet. Transfers are permanent—double-check the address before sending.</p>
          <label class="om-mono" style="font-size:12px;margin:8px 0 4px">Recipient (0x…)</label>
          <input id="omTransferTo" class="om-input" placeholder="0xRecipient…" spellcheck="false" autocomplete="off">
        </div>
      </div>
    `;
  }

  // --- Panels with actions ---
  function openApprovePanel(owner){
    openModal({
      title: '',
      bodyHTML: approveCopyShort(),
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:'Approve', primary:true, keepOpen:true, onClick: async ()=>{
            try{
              await sendApprove(owner);
              toast('Approved!');
              closeModal();
              await refreshHeaderStats();
            }catch{ toast('Approval failed'); }
          }}
      ]
    });
  }
  function openStakePanel(owner, tokenId){
    openModal({
      title:'',
      bodyHTML: stakeCopy(tokenId),
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:`Stake Frog #${tokenId}`, primary:true, keepOpen:true, onClick: async ()=>{
            try{
              await sendStake(owner, tokenId);
              toast(`Stake tx sent for #${tokenId}`);
              closeModal();
              const item = items.find(x=>x.id===tokenId);
              if (item){ item.staked=true; item.sinceMs=Date.now(); }
              items.sort(compareByRarity);
              renderCards();
              await refreshHeaderStats();
            }catch{ toast('Stake failed'); }
          }}
      ]
    });
  }
  function openUnstakePanel(owner, tokenId){
    openModal({
      title:'',
      bodyHTML: unstakeCopy(tokenId),
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:`Unstake Frog #${tokenId}`, primary:true, keepOpen:true, onClick: async ()=>{
            try{
              await sendUnstake(owner, tokenId);
              toast(`Unstake tx sent for #${tokenId}`);
              closeModal();
              const item = items.find(x=>x.id===tokenId);
              if (item){ item.staked=false; item.sinceMs=null; }
              items.sort(compareByRarity);
              renderCards();
              await refreshHeaderStats();
            }catch{ toast('Unstake failed'); }
          }}
      ]
    });
  }
  function isValidEthAddress(addr){
    try{
      if (!window.Web3) return /^0x[a-fA-F0-9]{40}$/.test(addr);
      return new Web3().utils.isAddress(addr);
    }catch{ return false; }
  }
  function openTransferPanel(owner, tokenId){
    openModal({
      title:'',
      bodyHTML: transferCopy(tokenId),
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:'Send', primary:true, keepOpen:true, onClick: async ()=>{
            const inp = document.getElementById('omTransferTo');
            const to = (inp?.value||'').trim();
            if (!isValidEthAddress(to)){ toast('Enter a valid recipient address'); inp?.focus(); return; }
            if (to.toLowerCase() === owner.toLowerCase()){ toast('Recipient is your own address'); return; }
            if (to.toLowerCase() === String(CFG.CONTROLLER_ADDRESS||'').toLowerCase()){ toast('Cannot send to the controller address'); return; }
            try{
              await sendTransfer(owner, to, tokenId);
              toast(`Transfer sent for #${tokenId}`);
              closeModal();
              const idx = items.findIndex(x=>x.id===tokenId && !x.staked);
              if (idx>=0){ items.splice(idx,1); }
              items.sort(compareByRarity);
              renderCards();
              await refreshHeaderStats();
            }catch{ toast('Transfer failed'); }
          }}
      ]
    });
  }

  // --- Cards ---
  function shortAddrLocal(a){
    try{
      if (window.FF && typeof window.FF.shortAddress === 'function'){
        return window.FF.shortAddress(a);
      }
    }catch(_){ }
    if (!a || typeof a !== 'string') return '—';
    const t = a.trim();
    if (!t) return '—';
    if (t.length <= 10) return t;
    return t.slice(0,6)+'…'+t.slice(-4);
  }
  function formatMetaLineForOwned(it){
    try{
      if (window.FF && typeof window.FF.formatOwnerLine === 'function'){
        return window.FF.formatOwnerLine(it);
      }
    }catch(_){ }
    const ownerLabelRaw = it.ownerYou ? 'You' : shortAddrLocal(it.owner);
    const ownerLabel = ownerLabelRaw && ownerLabelRaw !== '—' ? ownerLabelRaw : 'Unknown';
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      const agoHtml = ago ? (' ' + ago) : '';
      return '<span class="staked-flag">Staked' + agoHtml + ' by ' + ownerLabel + '</span>';
    }
    return 'Owned by ' + ownerLabel;
  }
  async function handleStake(id){
    try{
      const a = addr || await getConnectedAddress();
      if (!a){ toast('Connect wallet first'); return; }
      const approved = await checkApproved(a);
      if (!approved){
        const stakedIds = await getStakedIds(a).catch(()=>[]);
        const rewardsRaw = await getRewards(a).catch(()=>null);
        openApprovePanel(a, { approved:false, staked: stakedIds.length, rewards: rewardsRaw });
      }else{
        openStakePanel(a, id);
      }
    }catch{ toast('Action failed'); }
  }
  async function handleUnstake(id){
    try{
      const a = addr || await getConnectedAddress();
      if (!a){ toast('Connect wallet first'); return; }
      openUnstakePanel(a, id);
    }catch{ toast('Action failed'); }
  }
  async function handleTransfer(id){
    try{
      const a = addr || await getConnectedAddress();
      if (!a){ toast('Connect wallet first'); return; }
      const target = items.find(x=>x.id===id);
      if (target && target.staked){ toast('This frog is staked. Unstake before transferring.'); return; }
      openTransferPanel(a, id);
    }catch{ toast('Action failed'); }
  }

  function renderCards(){
    const root = document.querySelector('#ownedGrid');
    if (!root) return;

    items.sort(compareByRarity);

    root.innerHTML = '';

    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      updateHeaderOwned();
      syncHeights();
      return;
    }

    updateHeaderOwned();

    const ownerAddr = addr || null;
    const ownerShort = ownerAddr ? shortAddrLocal(ownerAddr) : null;
    const frogs = items.map(it => ({
      id: it.id,
      rank: it.rank,
      attrs: it.attrs,
      staked: it.staked,
      sinceMs: it.sinceMs,
      metaRaw: it.metaRaw,
      owner: ownerAddr,
      ownerShort: ownerShort,
      ownerYou: !!ownerAddr,
      holder: ownerAddr
    }));

    if (window.FF && typeof window.FF.renderFrogCards === 'function'){
      window.FF.renderFrogCards(root, frogs, {
        showActions: true,
        rarityTiers: CFG.RARITY_TIERS,
        metaLine: formatMetaLineForOwned,
        onStake: handleStake,
        onUnstake: handleUnstake,
        onTransfer: handleTransfer,
        levelSeconds: Number(CFG.STAKE_LEVEL_SECONDS || (30 * 86400))
      });
    }else{
      root.innerHTML = '<div class="pg-muted">Frog cards unavailable.</div>';
    }

    syncHeights();
  }
  function updateHeaderOwned(){
    const el=document.getElementById('ohOwned'); if (!el) return;
    const ownedOnly = Array.isArray(items) ? items.filter(x => !x.staked).length : 0;
    el.textContent = String(ownedOnly);
  }

  // Owned IDs page from Reservoir (metadata comes from local JSON)
  function tokensApiUser(addr){ return RESV_HOST + '/users/' + addr + '/tokens/v8'; }
  async function fetchOwnedIdsPage(){
    const qs = new URLSearchParams({ collection: COLLECTION, limit:String(PAGE_SIZE), includeTopBid:'false', includeAttributes:'false' });
    if (continuation) qs.set('continuation', continuation);
    const j = await window.FF_RES_QUEUE.fetch(tokensApiUser(addr)+'?'+qs.toString());
    const ids = (j?.tokens||[]).map(r => Number(r?.token?.tokenId)).filter(Number.isFinite);
    continuation = j?.continuation || null;
    return ids;
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
      const [ownedIds] = await Promise.all([ fetchOwnedIdsPage(), ensureRanks() ]);
      const stakedIds = addr ? await getStakedIds(addr) : [];
      _stakedCount = stakedIds.length;

      // Combine (add staked IDs not in owned)
      const seen = new Set(ownedIds);
      const idsForThisPage = ownedIds.concat(stakedIds.filter(id => !seen.has(id)));

      // Load local JSON for those IDs
      const metas = await loadMetaBatch(idsForThisPage);

      // Compose (normalize rank to a number for coloring/sorting)
      items = metas.map(m => {
        const rkRaw = (FF.RANKS||{})[String(m.id)];
        const rkNum = Number(rkRaw);
        return {
          id: m.id,
          attrs: m.attrs,
          staked: stakedIds.includes(m.id),
          sinceMs: null,
          rank: Number.isFinite(rkNum) ? rkNum : undefined,
          metaRaw: m.metaRaw || null
        };
      });

      // Sort by rarity now
      items.sort(compareByRarity);

      // Fill stake times
      await (async ()=>{
        const stakedBatch = items.filter(x=> x.staked);
        for (const it of stakedBatch){
          try{
            let ms = await getStakeSinceMs(it.id);
            if (!ms) ms = await stakeSinceViaEvents(it.id);
            if (ms && ms < 1e12) ms = ms * 1000;
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
            .map(m=> {
              const rkRaw = (FF.RANKS||{})[String(m.id)];
              const rkNum = Number(rkRaw);
              return {
                id:m.id, attrs:m.attrs,
                staked: stakedIds.includes(m.id),
                sinceMs:null,
                rank: Number.isFinite(rkNum) ? rkNum : undefined,
                metaRaw: m.metaRaw || null
              };
            });
          items = items.concat(more);
          items.sort(compareByRarity);
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
    if (addr){
      btn.classList.add('btn-connected','address-chip');
      btn.textContent = addr;
      btn.style.pointerEvents = 'none';
      btn.title = addr;
    }else{
      btn.classList.remove('btn-connected','address-chip');
      btn.textContent='Connect Wallet';
      btn.style.pointerEvents = '';
      btn.title = '';
    }
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
    const card=$(SEL.card); if (card) card.querySelectorAll('.info-grid-2').forEach(n=> n.remove());
    await renderHeader();

    const btn=document.getElementById('ownedConnectBtn');
    if (btn){ btn.style.display='inline-flex'; btn.addEventListener('click', handleConnectClick); }

    document.addEventListener('ff:wallet:ready', async (e) => {
      const a = e?.detail?.address; if (!a) return;
      addr = a; reflectConnectButton(); await afterConnect();
    });
    window.addEventListener('wallet:connected', async (e) => {
      const a = e?.detail?.address || (window.ethereum && window.ethereum.selectedAddress);
      if (!a) return;
      addr = a; reflectConnectButton(); await afterConnect();
    });

    addr = await getConnectedAddress();
    reflectConnectButton();

    if (addr){ await afterConnect(); return; }
    const grid=$(SEL.grid); if (grid) grid.innerHTML='<div class="pg-muted">Connect your wallet to view owned frogs.</div>';
    setTimeout(syncHeights,50);
  }

  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
