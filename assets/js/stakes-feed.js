// assets/js/stakes-feed.js
(function(FF, CFG){
  'use strict';
  const C = window.FF_CFG || CFG || {};
  const CTRL = (C.CONTROLLER_ADDRESS || '').toLowerCase();
  const API = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_KEY = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const UL = document.getElementById('recentStakes');

  const WEB3 = (window.Web3 && (C.RPC_URL ? new window.Web3(new window.Web3.providers.HttpProvider(C.RPC_URL)) : (window.ethereum ? new window.Web3(window.ethereum) : null))) || null;
  const ERC721_ABI = [
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
    {"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"type":"function","stateMutability":"view"}
  ];
  if (!window.collection && WEB3 && C.COLLECTION_ADDRESS){
    try{ window.collection = new WEB3.eth.Contract(ERC721_ABI, C.COLLECTION_ADDRESS); }catch(e){ console.warn(e); }
  }

  function $(s,r=document){ return r.querySelector(s); }
  const shorten = a => a ? a.slice(0,6)+'…'+a.slice(-4) : '—';
  const frogImg = id => (C.SOURCE_PATH||'') + '/frog/' + id + '.png';
  const etherscanAddr = a => {
    const base = (Number(C.CHAIN_ID||1)===1) ? 'https://etherscan.io/address/' :
                 (Number(C.CHAIN_ID||1)===11155111) ? 'https://sepolia.etherscan.io/address/' : 'https://etherscan.io/address/';
    return base + a;
  };
  const etherscanTx = h => ((Number(C.CHAIN_ID||1)===1) ? 'https://etherscan.io/tx/' :
                (Number(C.CHAIN_ID||1)===11155111) ? 'https://sepolia.etherscan.io/tx/' : 'https://etherscan.io/tx/') + h;

  async function setKPIs(){
    // Controller chip + Rewards ticker
    const a = $('#stakedController'); if (a && CTRL){ a.textContent = shorten(CTRL); a.href = etherscanAddr(CTRL); }
    const sym = $('#pondRewardsSymbol'); if (sym) sym.textContent = (C.REWARD_TOKEN_SYMBOL || '$FLYZ');

    // Total Frogs Staked from ERC721.balanceOf(controller)
    const out = $('#stakedTotal');
    if (out && window.collection && CTRL){
      try{ const n = await window.collection.methods.balanceOf(CTRL).call(); out.textContent = String(n); }
      catch(e){ console.warn('balanceOf(controller) failed', e); out.textContent='—'; }
    }
  }

  function niceAgo(ts){
    const d = Math.max(0, (Date.now() - ts*1000)/1000);
    const mins = Math.floor(d/60), hrs = Math.floor(mins/60), days = Math.floor(hrs/24);
    if (days>0) return `${days}d ago`;
    if (hrs>0)  return `${hrs}h ago`;
    if (mins>0) return `${mins}m ago`;
    return `just now`;
  }

  function rowHTML(e){
    // e.kind: stake | unstake | claim
    const title = e.kind === 'stake' ? 'Stake' : (e.kind === 'unstake' ? 'Unstake' : 'Claim');
    const when = e.timestamp ? niceAgo(e.timestamp) : '—';
    const meta = e.kind==='claim'
      ? `${shorten(e.user)} claimed ${e.amountPretty||e.amount}`
      : `${shorten(e.from)} → ${shorten(e.to)}`;
    const img = e.tokenId ? `<img class="thumb64" src="${frogImg(e.tokenId)}" alt="${e.tokenId}">` : `<div class="thumb64" style="display:flex;align-items:center;justify-content:center">💰</div>`;
    return `<li class="row" data-kind="${e.kind}">
      ${img}
      <div>
        <div><b>${title}</b>${e.tokenId?` • Frog #${e.tokenId}`:''}</div>
        <div class="pg-muted">${meta} • ${when} • Etherscan</div>
      </div>
    </li>`;
  }

  let continuation=null, busy=false, done=false;
  async function fetchActivities(){
    if (busy || done) return [];
    busy=true;
    const qp = new URLSearchParams({
      users: C.CONTROLLER_ADDRESS,
      limit: '20',
      // types=transfer will include both incoming and outgoing transfers
      types: 'transfer'
    });
    if (continuation) qp.set('continuation', continuation);

    const res = await fetch(`${API}/users/activity/v6?${qp.toString()}`, {
      headers: { accept:'*/*', ...(API_KEY?{'x-api-key':API_KEY}:{}) }
    });
    if (!res.ok) { busy=false; throw new Error('reservoir activity failed'); }
    const j = await res.json();

    continuation = j.continuation || null;
    if (!continuation) done=true;

    // Map to stake/unstake
    const rows=[];
    (j.activities||[]).forEach(a=>{
      if (!a || !a.event) return;
      const ev = a.event;
      if (ev.kind!=='transfer') return;
      const tokenId = Number(a.token?.tokenId);
      const from = (ev.fromAddress||'').toLowerCase();
      const to   = (ev.toAddress||'').toLowerCase();
      let kind=null;
      if (to===CTRL) kind='stake';
      else if (from===CTRL) kind='unstake';
      else return;
      rows.push({
        kind,
        tokenId,
        from: ev.fromAddress,
        to:   ev.toAddress,
        txhash: a.txHash,
        timestamp: a.timestamp
      });
    });
    busy=false;
    return rows;
  }

  function appendRows(rows){
    if (!UL) return;
    if (UL.firstElementChild && UL.firstElementChild.classList.contains('pg-muted')) UL.innerHTML='';
    const frag=document.createDocumentFragment();
    rows.forEach(r=>{
      const li=document.createElement('li'); li.className='row'; li.innerHTML=rowHTML(r);
      li.addEventListener('click', ()=> window.open(etherscanTx(r.txhash),'_blank'));
      frag.appendChild(li);
    });
    UL.appendChild(frag);
  }

  async function pump(){
    try{
      const rows = await fetchActivities();
      if (rows.length) appendRows(rows);
    }catch(e){
      console.warn('[pond] activity error', e);
      if (UL && UL.innerHTML.trim()==='') UL.innerHTML='<li class="row"><div class="pg-muted">Failed to load activity.</div></li>';
    }
  }

  function attachScroll(){
    if (!UL) return;
    function onScroll(){
      if (busy || done) return;
      if (UL.scrollTop + UL.clientHeight >= UL.scrollHeight - 80) pump();
    }
    UL.addEventListener('scroll', onScroll);
  }

  async function init(){
    await setKPIs();
    if (UL) { UL.innerHTML='<li class="row"><div class="pg-muted">Loading…</div></li>'; attachScroll(); }
    pump(); setTimeout(pump, 80); // early second page
  }

  window.FF_loadRecentStakes = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
