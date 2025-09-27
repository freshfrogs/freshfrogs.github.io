// assets/js/owned-panel.js
// Renders: Owned + Staked. Owned IDs from Reservoir; Staked IDs from controller.
// Metadata always from frog/json/{id}.json. No OpenSea button. Attribute chips → bullets.
// Header: Owned • Staked • Unclaimed Rewards (+ Approve/Claim). Connect button shows muted address when connected.

(function (FF, CFG) {
  'use strict';

  const SEL = { card:'#ownedCard', grid:'#ownedGrid', btnConn:'#ownedConnectBtn' };
  const CHAIN_ID  = Number(CFG.CHAIN_ID || 1);
  const RESV_HOST = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
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
#ownedModal .om-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
#ownedModal .om-title{font-weight:700;font-size:14px}
#ownedModal .om-body{padding:14px 16px;color:var(--muted);font-size:13px;line-height:1.4}
#ownedModal .om-body p{margin:0 0 10px 0}
#ownedModal .om-actions{display:flex;gap:8px;justify-content:flex-end;padding:14px 16px;border-top:1px solid var(--border)}
#ownedModal .om-btn{font-family:var(--font-ui);border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:8px 12px;font-weight:700;font-size:12px;line-height:1;display:inline-flex;align-items:center;gap:6px;text-decoration:none;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s,transform .05s}
#ownedModal .om-btn:hover{background: color-mix(in srgb,#22c55e 14%,var(--panel));border-color: color-mix(in srgb,#22c55e 80%,var(--border));color: color-mix(in srgb,#ffffff 85%,#22c55e)}
#ownedModal .om-btn.primary{background: color-mix(in srgb,#22c55e 18%,var(--panel));border-color: color-mix(in srgb,#22c55e 85%,var(--border));color: color-mix(in srgb,#ffffff 90%,#22c55e)}
#ownedModal .om-input{width:100%;border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;padding:8px 10px;font-size:13px}
#ownedModal .om-mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
    `;
    const el=document.createElement('style'); el.id='owned-clean-css'; el.textContent=css; document.head.appendChild(el);
  })();

  // --- Reservoir fetch queue (used only to list owned IDs) ---
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
  const shorten=(a)=> (FF.shorten?.(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
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

  // --- Wallet / ABIs / Contracts (wallet-only, no RPC) ---
  function getWeb3(){ if (!window.Web3 || !window.ethereum) throw new Error('Wallet not found'); return new Web3(window.ethereum); }

  // ABIs may be defined as top-level consts or attached to window; resolve robustly.
  function resolveCollectionAbi(){
    if (typeof COLLECTION_ABI !== 'undefined') return COLLECTION_ABI;
    return (window.COLLECTION_ABI || window.collection_abi || []);
  }
  function resolveControllerAbi(){
    if (typeof CONTROLLER_ABI !== 'undefined') return CONTROLLER_ABI;
    return (window.CONTROLLER_ABI || window.controller_abi || []);
  }

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

  // Tuple-aware normalization (e.g., [owner, tokenId] -> tokenId)
  function normalizeIds(rows){
    if (!Array.isArray(rows)) return [];
    const toNum=(x)=>{ try{
      if (x==null) return NaN;
      if (typeof x==='number') return Number.isFinite(x)?x:NaN;
      if (typeof x==='bigint') return Number(x);
      if (typeof x==='string'){ if(/^0x[0-9a-f]+$/i.test(x)) return Number(BigInt(x)); if(/^-?\d+$/.test(x)) return Number(x); return NaN; }
      if (Array.isArray(x)) return toNum(x[x.length-1]); // tuple -> last is tokenId
      if (typeof x==='object'){
        if (typeof x._hex==='string') return Number(BigInt(x._hex));
        if (typeof x.toString==='function'){ const s=x.toString(); if(/^0x/i.test(s)) return Number(BigInt(s)); if(/^-?\d+$/.test(s)) return Number(s); }
        const cand = x.tokenId ?? x.id ?? x.token_id ?? x.tokenID ?? x.value ?? x[1] ?? x[0];
        return toNum(cand);
      }
      return NaN;
    }catch{ return NaN; }};
    return rows.map(toNum).filter(Number.isFinite);
  }

  // Direct controller read via wallet provider (returns plain number[] of tokenIds)
  async function getStakedIds(addr){
    if (!window.ethereum || !window.Web3) return [];
    try{
      await ensureCorrectChain();
      const ctrl = ctrlContract();
      const raw  = await ctrl.methods.getStakedTokens(addr).call({ from: addr });
      if (Array.isArray(raw) && raw.length && Array.isArray(raw[0])) {
        return raw.map(t => {
          const v = t[t.length-1];
          try{
            if (typeof v==='number') return v;
            if (typeof v==='string') return Number(/^\d+$/.test(v) ? v : BigInt(v));
            if (typeof v==='bigint') return Number(v);
            if (v && typeof v._hex==='string') return Number(BigInt(v._hex));
            if (v && typeof v.toString==='function'){ const s=v.toString(); if(/^0x/i.test(s)) return Number(BigInt(s)); if(/^\d+$/.test(s)) return Number(s); }
          }catch{}
          return NaN;
        }).filter(Number.isFinite);
      }
      return normalizeIds(raw);
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

  // Rewards on CONTROLLER (view + claim)
  async function getRewards(addr){
    try{
      await ensureCorrectChain();
      const ctrl = ctrlContract();
      return await ctrl.methods.availableRewards(addr).call({ from: addr });
    }catch(e){
      // fallback to any adapter that might exist
      for (const k of ['getAvailableRewards','getRewards','claimableRewards','getUnclaimedRewards']){
        try{
          const S=(FF.staking||window.FF_STAKING||{}); if (typeof S[k]==='function') return await S[k](addr);
        }catch{}
      }
      return null;
    }
  }
  async function claimRewards(){
    try{
      await ensureCorrectChain();
      const ctrl = ctrlContract();
      return await ctrl.methods.claimRewards().send({ from: addr });
    }catch(e){
      for (const k of ['claimRewards','claim','harvest']){
        try{
          const S=(FF.staking||window.FF_STAKING||{}); if (typeof S[k]==='function') return await S[k]();
        }catch{}
      }
      throw new Error('Claim helper not found.');
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

  // --- Fallback via Transfer(to=controller) events (for since time) ---
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
      try{ await claimRewards(); toast('Claim sent'); await refreshHeaderStats(); }
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

  // --- Stake / Unstake / Approve modals ---
  function openApprovePanel(owner, stats){
    const approvalText = stats?.approved ? 'Approved' : 'Not Approved';
    const stCount = Number(stats?.staked || 0);
    const rewards = (typeof stats?.rewards === 'string') ? stats.rewards : formatToken(stats?.rewards, REWARD_DECIMALS);

    const body = `
      <p><b>📃 FreshFrogsNFT Staking</b></p>
      <p>Stake your Frogs and start earning rewards like ${REWARD_SYMBOL}, and more! Staking works by sending your Frog to a smart contract that will keep it safe. Frogs that are staked can’t be listed on secondary market places, like Rarible.</p>
      <p><b>✍️ Sign Contract Approval</b><br>To start staking you must first give the staking contract permission to access your Frogs. This is a one time transaction that requires a gas fee.</p>
      <p class="om-mono">Approval Status: ${approvalText}<br>Staked Tokens: (${stCount}) | Rewards: ${rewards} ${REWARD_SYMBOL}</p>
    `;
    openModal({
      title: 'Approve Staking Contract',
      bodyHTML: body,
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:'Approve Staking', primary:true, onClick: async ()=>{
            await sendApprove(owner);
            toast('Approval submitted');
            await refreshHeaderStats();
          }}
      ]
    });
  }

  function openStakePanel(owner, tokenId){
    const body = `
      <p><b>📌 Stake Frog #${tokenId}</b></p>
      <p>While this Frog is staked you will not be able to sell it on secondary market places, like Rarible. To do this you will have to un-stake directly from this site. Once a Frog is un-staked its level will reset to zero!</p>
      <p>Confirm the ID of the Frog you would like to stake.</p>
      <label>Token ID</label>
      <input id="omStakeInput" class="om-input om-mono" value="${tokenId}">
    `;
    openModal({
      title: `Stake #${tokenId}`,
      bodyHTML: body,
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:`Stake Frog #${tokenId}`, primary:true, keepOpen:true, onClick: async ()=>{
            const val = document.getElementById('omStakeInput')?.value?.trim();
            if (String(val) !== String(tokenId)) { toast('Token ID does not match.'); return; }
            try{
              await sendStake(owner, tokenId);
              toast(`Stake tx sent for #${tokenId}`);
              closeModal();
              const item = items.find(x=>x.id===tokenId);
              if (item){ item.staked=true; item.sinceMs=Date.now(); }
              renderCards();
              await refreshHeaderStats();
            }catch(e){ toast('Stake failed'); }
          }}
      ]
    });
  }

  function openUnstakePanel(owner, tokenId){
    const body = `
      <p><b>🤏 Withdraw Frog #${tokenId}</b></p>
      <p>Un-staking (withdrawing) this Frog will return it to your wallet. The staking level will be reset to zero!</p>
      <p>Confirm the ID of the token you would like to withdraw.</p>
      <label>Token ID</label>
      <input id="omUnstakeInput" class="om-input om-mono" value="${tokenId}">
    `;
    openModal({
      title: `Withdraw #${tokenId}`,
      bodyHTML: body,
      actions: [
        { label:'Cancel', onClick:()=>{}, primary:false },
        { label:`Withdraw Frog #${tokenId}`, primary:true, keepOpen:true, onClick: async ()=>{
            const val = document.getElementById('omUnstakeInput')?.value?.trim();
            if (String(val) !== String(tokenId)) { toast('Token ID does not match.'); return; }
            try{
              await sendUnstake(owner, tokenId);
              toast(`Withdraw tx sent for #${tokenId}`);
              closeModal();
              const item = items.find(x=>x.id===tokenId);
              if (item){ item.staked=false; item.sinceMs=null; }
              renderCards();
              await refreshHeaderStats();
            }catch(e){ toast('Withdraw failed'); }
          }}
      ]
    });
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
          const a = addr || await getConnectedAddress();
          if (!a) { toast('Connect wallet first'); return; }

          if (act==='stake'){
            const approved = await checkApproved(a);
            if (!approved){
              const stakedIds = await getStakedIds(a).catch(()=>[]);
              const rewardsRaw = await getRewards(a).catch(()=>null);
              openApprovePanel(a, { approved:false, staked: stakedIds.length, rewards: rewardsRaw });
            }else{
              openStakePanel(a, it.id);
            }
          }else if (act==='unstake'){
            openUnstakePanel(a, it.id);
          }else if (act==='transfer'){
            if (FF.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else toast('Transfer: helper not found');
          }
        }catch{ toast('Action failed'); }
      });
    });
  }

  function renderCards(){
    const root = document.querySelector('#ownedGrid');
    if (!root) return;

    root.innerHTML = '';

    if (!items.length){
      root.innerHTML = '<div class="pg-muted">No frogs found for this wallet.</div>';
      updateHeaderOwned();
      syncHeights();
      return;
    }

    updateHeaderOwned();

    items.forEach(it => {
      const card = document.createElement('article');
      card.className = 'frog-card';
      card.setAttribute('data-token-id', String(it.id));

      const rankPill = (it.rank || it.rank === 0) ? ` <span class="pill">Rank #${it.rank}</span>` : '';
      const attrs = attrsHTML(it.attrs, 4);

      card.innerHTML = [
        `<img class="thumb" src="${imgFor(it.id)}" alt="${it.id}">`,
        `<h4 class="title">Frog #${it.id}${rankPill}</h4>`,
        `<div class="meta">${fmtMeta(it)}</div>`,
        attrs,
        `<div class="actions">
           <button class="btn btn-outline-gray" data-act="${it.staked ? 'unstake' : 'stake'}">${it.staked ? 'Unstake' : 'Stake'}</button>
           <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
           <a class="btn btn-outline-gray" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
           <a class="btn btn-outline-gray" href="${imgFor(it.id)}" target="_blank" rel="noopener">Original</a>
         </div>`
      ].join('');

      root.appendChild(card);
      wireCardActions(card, it);
    });

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
        rank: (FF.RANKS||{})[String(m.id)]
      }));

      // Fill stake times (adapter first; else fall back to events)
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
            .map(m=> ({ id:m.id, attrs:m.attrs, staked: stakedIds.includes(m.id), sinceMs:null, rank:(FF.RANKS||{})[String(m.id)] }));
          items = items.concat(more);
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

    // React to wallet connect events
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

  // Public init
  window.FF_initOwnedPanel = initOwned;

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
