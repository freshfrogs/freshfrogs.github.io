import { FF_CFG, loadABI, shorten } from './core.js';
import { getUser, getTab, setTabGetter, renderOwned } from './ui.js';

const ST = { items:[] };
let provider, signer, controller;
let currentTab='owned';

export function setTab(which){
  currentTab=which;
  const owned=(which==='owned');
  const tabOwned=document.getElementById('tabOwned');
  const tabStaked=document.getElementById('tabStaked');
  const tabsWrap=document.getElementById('stakeTabs');
  tabOwned?.setAttribute('aria-selected', owned?'true':'false');
  tabStaked?.setAttribute('aria-selected', owned?'false':'true');
  tabsWrap?.style.setProperty('--tab-i', owned?0:1);
  render();
}
export function getTab(){ return currentTab; }

/* expose to ui so it can read current tab */
setTabGetter(getTab);

function stakingReady(){ return controller && signer && getUser(); }

async function initEthers(){
  if(!window.ethereum) return false;
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer   = provider.getSigner();

  // Minimal fallbacks (used if external ABI files aren’t found)
  const MIN_CONTROLLER_ABI = [
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
  ];
  const controllerAbi = await loadABI(FF_CFG.ABI?.controller, MIN_CONTROLLER_ABI);

  controller = new ethers.Contract(FF_CFG.CONTROLLER_ADDRESS, controllerAbi, signer);
  return true;
}

export async function loadStaked(){
  const status=document.getElementById('stakeStatus');
  const user = getUser();
  if(!user){ status.textContent='Connect a wallet first.'; return; }
  if(!await initEthers()){ status.textContent='Ethereum provider not available.'; return; }
  try{
    status.textContent='Loading staked…';
    const rows = await controller.getStakedTokens(user);
    ST.items = (rows||[]).map(r => ({ id: Number(r.tokenId), owner: r.staker || user }));

    // Rewards
    const rewards = await controller.availableRewards(user);
    const rewardsLine = document.getElementById('rewardsLine');
    if (rewardsLine) {
      rewardsLine.style.display = 'block';
      // 18-decimals → whole FLYZ rounded
      let whole = '0';
      try {
        const formatted = ethers.utils.formatUnits(rewards, 18);
        whole = String(Math.round(Number(formatted)));
      } catch {
        const n = (typeof rewards === 'string' ? rewards : rewards?.toString?.() || '0');
        whole = String(Math.round(Number(n) / 1e18));
      }
      document.getElementById('rewardsEth').textContent = whole;
    }

    if(currentTab==='staked') render();
    status.textContent=`Owned/Staked ready • Staked: ${ST.items.length}`;
  }catch(err){
    console.warn(err);
    status.textContent='Failed to load staked tokens.';
  }
}

async function unstake(tokenId){
  if(!stakingReady()) { alert('Wallet/contract not ready'); return; }
  try{
    const tx = await controller.withdraw(ethers.BigNumber.from(String(tokenId)));
    document.getElementById('stakeStatus').textContent = 'Tx sent: '+tx.hash.slice(0,10)+'…';
    await tx.wait();
    ST.items = ST.items.filter(t => t.id !== Number(tokenId));
    render();
    document.getElementById('stakeStatus').textContent = 'Un-staked #'+tokenId;
  }catch(err){
    console.warn(err);
    alert('Failed to un-stake: '+(err?.message||err));
  }
}

export function clearStaked(){ ST.items=[]; if(getTab()==='staked') render(); }

export function wireStakingUI(){
  document.getElementById('tabOwned')?.addEventListener('click', ()=> setTab('owned'));
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
    li.innerHTML = `<img class="thumb64" src="${FF_CFG.SOURCE_PATH}/frog/${id}.png" alt="Frog ${id}" width="64" height="64" loading="lazy">` +
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
    list.appendChild(li);
  });

  list.querySelectorAll('[data-unstake]').forEach(btn=>{
    btn.addEventListener('click',()=> unstake(btn.getAttribute('data-unstake')));
  });
}
