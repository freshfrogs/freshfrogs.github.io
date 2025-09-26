// assets/js/owned-panel.js
(function(FF, CFG){
  'use strict';
  const C = window.FF_CFG || CFG || {};
  const API = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API_KEY = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';
  const PAGE = 20;

  const sel = {
    card:'#ownedCard', grid:'#ownedGrid', connect:'#ownedConnectBtn',
    more:'#ownedMore'
  };

  function $(s,r=document){ return r.querySelector(s); }
  const shorten = a => a ? a.slice(0,6)+'…'+a.slice(-4) : '—';
  const img = id => (C.SOURCE_PATH||'') + '/frog/' + id + '.png';
  const etherscanToken = id => {
    const base=(Number(C.CHAIN_ID||1)===1)?'https://etherscan.io/token/':
               (Number(C.CHAIN_ID||1)===11155111)?'https://sepolia.etherscan.io/token/':'https://etherscan.io/token/';
    return base + C.COLLECTION_ADDRESS + '?a=' + id;
  };
  const openseaToken = id => `https://opensea.io/assets/ethereum/${C.COLLECTION_ADDRESS}/${id}`;

  let addr=null, continuation=null, owned=[], stakedSet=new Set(), rewardsPretty='—', approved=null, loading=false;

  // ----- Header UI (like your screenshot) -----
  function renderHeader(){
    const root=$(sel.card); if(!root) return;
    let h = root.querySelector('.oh-wrap');
    if (!h){
      h=document.createElement('div'); h.className='oh-wrap'; h.style.marginBottom='8px';
      h.innerHTML = `
        <div class="row" style="gap:18px; align-items:baseline; color:var(--muted); margin:-2px 0 8px;">
          <div>Owned <b id="ohOwned">0</b></div>
          <div>• Staked <b id="ohStaked">0</b></div>
          <div>• Unclaimed Rewards <b id="ohRewards">—</b></div>
          <div class="spacer"></div>
          <a id="ohWalletChip" class="pill" target="_blank" rel="noopener">—</a>
          <span class="pill">${C.REWARD_TOKEN_SYMBOL||'$FLYZ'}</span>
        </div>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button id="ohApprove" class="btn btn-outline-gray" style="display:none;">Approve Staking</button>
          <button id="ohClaim" class="btn btn-outline-gray">Claim Rewards</button>
        </div>`;
      root.insertBefore(h, $(sel.grid, root));
      h.querySelector('#ohClaim').onclick = async ()=>{
        if (!addr) return;
        h.querySelector('#ohClaim').disabled=true;
        try{ await FF_STAKING.claim(addr); await refreshHeader(); } finally{ h.querySelector('#ohClaim').disabled=false; }
      };
      h.querySelector('#ohApprove').onclick = async ()=>{
        if (!addr) return;
        h.querySelector('#ohApprove').disabled=true;
        try{ await FF_STAKING.approve(addr); await refreshHeader(); } finally{ h.querySelector('#ohApprove').disabled=false; }
      };
    }
    $('#ohOwned').textContent = String(owned.length);
    $('#ohStaked').textContent = String(stakedSet.size);
    $('#ohRewards').textContent = rewardsPretty || '—';
    const chip = $('#ohWalletChip');
    if (chip && addr){
      chip.textContent = shorten(addr);
      const base = (Number(C.CHAIN_ID||1)===1) ? 'https://etherscan.io/address/' :
                   (Number(C.CHAIN_ID||1)===11155111) ? 'https://sepolia.etherscan.io/address/' : 'https://etherscan.io/address/';
      chip.href = base + addr;
    }
    $('#ohApprove').style.display = approved===false ? 'inline-flex' : 'none';
  }

  async function refreshHeader(){
    if (!addr) return;
    try{
      const ap = await FF_STAKING.isApproved(addr); approved = !!ap;
    }catch{ approved = null; }
    try{
      const rw = await FF_STAKING.availableRewards(addr);
      rewardsPretty = rw?.pretty || '—';
    }catch{ rewardsPretty = '—'; }
    renderHeader();
  }

  // ----- Owned via Reservoir -----
  async function fetchOwned(){
    const qp = new URLSearchParams({
      collection: C.COLLECTION_ADDRESS,
      limit: String(PAGE),
      includeTopBid:'false',
      includeAttributes:'true',
      sortBy:'acquiredAt',
      sortDirection:'desc'
    });
    if (continuation) qp.set('continuation', continuation);
    const res = await fetch(`${API}/users/${addr}/tokens/v8?${qp.toString()}`, {
      headers: { accept:'application/json', ...(API_KEY?{'x-api-key':API_KEY}:{}) }
    });
    if (!res.ok) throw new Error('owned fetch failed');
    const j = await res.json();
    continuation = j.continuation || null;
    const list = (j.tokens||[]).map(r=>{
      const t=r.token||{};
      const id=Number(t.tokenId);
      const attrs=Array.isArray(t.attributes)?t.attributes.map(a=>({key:a.key||a.trait_type||'', value: (a.value ?? a.trait_value ?? '') })):[];
      return { id, attrs, staked:false };
    }).filter(Boolean);
    return list;
  }

  // ----- Staked via adapter (metadata from frog/json/X.json) -----
  async function fetchStaked(){
    const ids = await FF_STAKING.getStakedIds(addr);
    stakedSet = new Set(ids||[]);
    const out=[];
    for (const id of stakedSet){
      // pull metadata from your static json path
      let attrs=[];
      try{
        const m = await (await fetch(`${C.SOURCE_PATH||''}/frog/json/${id}.json`)).json();
        if (Array.isArray(m?.attributes)) attrs = m.attributes.map(a=>({key:a.trait_type||a.key||'', value: a.value}));
      }catch{}
      let days=null; try{ days = await FF_STAKING.stakedAgoDays(id); }catch{}
      out.push({ id, attrs, staked:true, stakedDays: days });
    }
    return out;
  }

  function attrsHTML(attrs){
    if (!Array.isArray(attrs) || !attrs.length) return '';
    // bullet list (you asked to switch from bubbles to bullets)
    const items = attrs.slice(0,3).map(a=> `<li>• <b>${a.key}</b>: ${a.value}</li>`).join('');
    return `<ul class="pg-muted" style="margin:6px 0 0 0; padding-left:0; list-style:none">${items}</ul>`;
  }

  function cardHTML(it){
    const rankPill = it.rank||it.rank===0 ? `<span class="pill">Rank #${it.rank}</span>` : '';
    const state = it.staked ? `Staked ${it.stakedDays!=null?`${it.stakedDays}d ago`:'recently'} • Owned by You`
                            : `Not staked • Owned by You`;
    return `
      <article class="frog-card" data-token-id="${it.id}">
        <img class="thumb" src="${img(it.id)}" alt="${it.id}">
        <h4 class="title">Frog #${it.id} ${rankPill}</h4>
        <div class="meta">${state}</div>
        ${attrsHTML(it.attrs)}
        <div class="actions">
          ${it.staked
            ? `<button class="btn btn-outline-gray" data-act="unstake">Unstake</button>`
            : `<button class="btn btn-outline-gray" data-act="stake">Stake</button>`}
          <button class="btn btn-outline-gray" data-act="transfer">Transfer</button>
          <a class="btn btn-outline-gray" href="${openseaToken(it.id)}" target="_blank" rel="noopener">OpenSea</a>
          <a class="btn btn-outline-gray" href="${etherscanToken(it.id)}" target="_blank" rel="noopener">Etherscan</a>
          <a class="btn btn-outline-gray" href="${img(it.id)}" target="_blank" rel="noopener">Original</a>
        </div>
      </article>`;
  }

  function wireCardActions(scope, it){
    scope.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'){ await FF_STAKING.stake(addr, it.id); it.staked=true; it.stakedDays=0; }
          else if (act==='unstake'){ await FF_STAKING.unstake(addr, it.id); it.staked=false; it.stakedDays=null; }
          else if (act==='transfer'){
            if (window.FF?.wallet?.promptTransfer) await FF.wallet.promptTransfer(it.id);
            else alert('Transfer helper not wired in this build.');
          }
          renderAll();
          await refreshHeader();
        }catch(e){ console.warn('action failed', e); }
      });
    });
  }

  function renderAll(){
    const root=$(sel.grid); if(!root) return;
    root.innerHTML='';

    // Merge staked (first) + owned (dedupe)
    const map=new Map();
    for (const s of Array.from(stakedSet.values())) map.set(s, true);
    const items = [
      ...Array.from(stakedSet.values()).map(id => owned.find(o=>o.id===id) || { id, attrs:[], staked:true }),
      ...owned.filter(o=> !map.has(o.id))
    ];

    if (!items.length){ root.innerHTML='<div class="pg-muted">No frogs found for this wallet.</div>'; return; }
    const frag=document.createDocumentFragment();
    items.forEach(it=>{
      const el=document.createElement('div'); el.innerHTML=cardHTML(it); const card=el.firstElementChild;
      frag.appendChild(card); wireCardActions(card, it);
    });
    root.appendChild(frag);

    // counters
    $('#ohOwned') && ($('#ohOwned').textContent = String(owned.length));
    $('#ohStaked') && ($('#ohStaked').textContent = String(stakedSet.size));
  }

  // ----- Paging for owned -----
  async function loadFirstOwned(){
    loading=true;
    try{
      const list = await fetchOwned(); owned = list;
      renderAll();
      if (continuation){
        const sentinel=document.createElement('div'); sentinel.setAttribute('data-sentinel',''); sentinel.style.height='1px';
        $(sel.grid).appendChild(sentinel);
        const io=new IntersectionObserver(async es=>{
          if (!es[0].isIntersecting || loading) return;
          loading=true;
          try{
            const more = await fetchOwned(); owned = owned.concat(more);
            renderAll();
            if (!continuation) es[0].target.remove();
          } finally{ loading=false; }
        }, { root: $(sel.grid), rootMargin:'140px', threshold:0.01 });
        io.observe(sentinel);
      }
    } finally{ loading=false; }
  }

  async function connectFlow(){
    const res = await FF_STAKING.connect(); addr = res.address;
    if (!addr) return;

    // Hook connect button to show green + truncated
    const btn=$(sel.connect); if (btn){ btn.classList.add('btn-connected'); btn.textContent = shorten(addr); }

    renderHeader();
    $(sel.grid).innerHTML='<div class="pg-muted">Loading…</div>';
    continuation=null; owned=[]; stakedSet.clear();

    const [stakedList] = await Promise.all([fetchStaked(), loadFirstOwned(), refreshHeader()]);
    // enrich staked ranks if you have rank data cached somewhere
    stakedList.forEach(s => stakedSet.add(s.id));
    renderAll();
  }

  function init(){
    renderHeader();
    const btn=$(sel.connect);
    if (btn){
      btn.onclick=async()=>{ btn.disabled=true; try{ await connectFlow(); } finally{ btn.disabled=false; } };
    }
  }

  window.FF_initOwnedPanel = init;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
