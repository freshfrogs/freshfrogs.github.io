import { FF_CFG, loadABIFromScript, shorten } from "./core.js";
import { getUser, renderOwned, setTabGetter } from "./ui.js";

const ST = { items: [] };
let provider, signer, controller, collection;
let currentTab = "owned";

export function setTab(which){
  currentTab = which;
  const owned=(which==='owned');
  document.getElementById('tabOwned') ?.setAttribute('aria-selected', owned?'true':'false');
  document.getElementById('tabStaked')?.setAttribute('aria-selected', owned?'false':'true');
  document.getElementById('stakeTabs')?.style.setProperty('--tab-i', owned?0:1);
  render();
}
export function getTab(){ return currentTab; }
setTabGetter(getTab);

// -------- Ethers + contracts ----------
async function ensureProvider(){
  if(!window.ethereum) return false;
  if(!provider) provider = new ethers.providers.Web3Provider(window.ethereum);
  if(!signer)   signer   = provider.getSigner();
  return true;
}
async function ensureController(){
  if(controller) return controller;
  if(!await ensureProvider()) return null;
  const { file, global } = FF_CFG.ABI.controller || {};
  const abi = await loadABIFromScript(file, global);
  controller = new ethers.Contract(FF_CFG.CONTROLLER_ADDRESS, abi, signer);
  return controller;
}
async function ensureCollection(){
  if(collection) return collection;
  if(!await ensureProvider()) return null;
  const { file, global } = FF_CFG.ABI.collection || {};
  const abi = await loadABIFromScript(file, global);
  collection = new ethers.Contract(FF_CFG.COLLECTION_ADDRESS, abi, signer);
  return collection;
}

// Pick the first available method by name
function pickMethod(obj, names){
  for(const n of names){ if(obj && typeof obj[n]==='function') return n; }
  return null;
}

// -------- Public: load staked for current user --------
export async function loadStaked(){
  const status=document.getElementById('stakeStatus');
  const user=getUser();
  if(!user){ if(status) status.textContent='Connect a wallet first.'; return; }
  try{
    const ctrl = await ensureController();
    if(!ctrl){ if(status) status.textContent='Ethereum provider not available.'; return; }

    const userToTokens = pickMethod(ctrl, [
      'getStakedTokens','tokensOfOwner','walletOfOwner','stakedTokens','tokenIdsOf'
    ]);
    if(!userToTokens){ if(status) status.textContent='Staking adapter: no token fetch method found.'; return; }

    status.textContent='Loading staked…';
    let rows = await ctrl[userToTokens](user);

    // Normalize rows → [{id, owner}]
    let items=[];
    if(Array.isArray(rows) && rows.length && typeof rows[0]==='object'){
      items = rows.map(r=>({ id:Number(r.tokenId ?? r.id ?? r.toString?.()), owner:String(r.staker ?? r.owner ?? user) }))
                  .filter(x=>Number.isFinite(x.id));
    }else if(Array.isArray(rows)){
      items = rows.map(v=>({ id:Number(v.toString()), owner:user })).filter(x=>Number.isFinite(x.id));
    }
    ST.items = items;

    // Rewards (optional)
    const rewardsFn = pickMethod(ctrl, ['availableRewards','pendingRewards','rewardsOf']);
    if(rewardsFn){
      try{
        const r = await ctrl[rewardsFn](user);
        const rewardsLine = document.getElementById('rewardsLine');
        if(rewardsLine){
          rewardsLine.style.display='block';
          let whole="0";
          try{
            const formatted = ethers.utils.formatUnits(r, 18);
            whole = String(Math.round(Number(formatted)));
          }catch{
            const n=(typeof r==='string'?r:r?.toString?.()||'0');
            whole = String(Math.round(Number(n)/1e18));
          }
          document.getElementById('rewardsEth').textContent = whole;
        }
      }catch{}
    }

    if(currentTab==='staked') render();
    if(status) status.textContent=`Owned/Staked ready • Staked: ${ST.items.length}`;
  }catch(err){
    console.warn(err);
    if(status) status.textContent='Failed to load staked tokens.';
  }
}

// -------- Modal helper for single token stake info --------
export async function getStakeInfo(tokenId){
  const ctrl = await ensureController();
  if(!ctrl) return { staked:false };

  let staker=null;
  const whoFn = pickMethod(ctrl, ['stakerOf','stakerAddress','ownerOf']);
  try{ if(whoFn) staker = await ctrl[whoFn](tokenId); }catch{}

  if(!staker || staker===ethers.constants.AddressZero){
    try{
      const coll=await ensureCollection();
      if(coll?.ownerOf) staker = await coll.ownerOf(tokenId);
    }catch{}
  }
  if(!staker || staker===ethers.constants.AddressZero) return { staked:false };

  const sinceFn = pickMethod(ctrl, ['stakingValues','getStake','stakeOf']);
  let sinceMs=null, sinceText=null;
  if(sinceFn==='stakingValues'){
    try{
      const v = await ctrl.stakingValues(tokenId);
      const raw = Array.isArray(v)?v[0]:v?.[0];
      const n = typeof raw==='string'?Number(raw):(raw?.toNumber?.() ?? Number(raw));
      if(Number.isFinite(n) && n>0) sinceMs = n*1000;
      if(v?.[4]) sinceText = String(v[4]);
    }catch{}
  }else if(sinceFn==='getStake' || sinceFn==='stakeOf'){
    try{
      const raw = await ctrl[sinceFn](tokenId);
      const n = typeof raw==='string'?Number(raw):(raw?.toNumber?.() ?? Number(raw));
      if(Number.isFinite(n) && n>0) sinceMs = n*1000;
    }catch{}
  }

  return { staked:true, staker, sinceMs, sinceText };
}
window.FF_getStakeInfo = getStakeInfo; // used by ui.js

export function clearStaked(){ ST.items=[]; if(getTab()==='staked') render(); }
export function wireStakingUI(){
  document.getElementById('tabOwned') ?.addEventListener('click', ()=> setTab('owned'));
  document.getElementById('tabStaked')?.addEventListener('click', ()=> setTab('staked'));
  document.getElementById('loadStakedBtn')?.addEventListener('click', loadStaked);
}

function render(){
  const list=document.getElementById('chipWrap'); if(!list) return;
  list.innerHTML='';
  if(currentTab==='owned'){ renderOwned(); return; }

  const items=ST.items||[];
  if(!getUser()){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to load staked tokens.</div></li>'; return; }
  if(!items.length){ list.innerHTML='<li class="list-item"><div class="muted">No staked tokens yet.</div></li>'; return; }

  items.forEach(({id,owner})=>{
    const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
    const li=document.createElement('li'); li.className='list-item';
    li.innerHTML =
      `<img class="thumb64" src="${FF_CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog ${id}" width="64" height="64" loading="lazy">`+
      `<div>
        <div style="display:flex;align-items:center;gap:8px;">
          <b>Frog #${id}</b>
          ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
        </div>
        <div class="muted">Owner <span class="addr">${owner?shorten(String(owner)):'—'}</span></div>
      </div>
      <div class="row" style="gap:6px;">
        <button class="btn btn-outline btn-sm" data-unstake="${id}">Un-stake</button>
      </div>`;
    li.style.cursor='pointer';
    li.addEventListener('click',()=> window.FF_openFrogInfo?.(id));
    list.appendChild(li);
  });

  list.querySelectorAll('[data-unstake]').forEach(btn=>{
    btn.addEventListener('click',(ev)=>{
      ev.stopPropagation();
      (async ()=>{
        const ctrl = await ensureController();
        if(!ctrl) return alert('Wallet/contract not ready');
        try{
          const tokenId = btn.getAttribute('data-unstake');
          const tx = await ctrl.withdraw(ethers.BigNumber.from(String(tokenId)));
          document.getElementById('stakeStatus').textContent='Tx sent: '+tx.hash.slice(0,10)+'…';
          await tx.wait();
          ST.items = ST.items.filter(t=>t.id!==Number(tokenId));
          render();
          document.getElementById('stakeStatus').textContent='Un-staked #'+tokenId;
        }catch(err){
          console.warn(err);
          alert('Failed to un-stake: '+(err?.message||err));
        }
      })();
    });
  });
}
