(function(FF, CFG){
  let heldTokens = [];
  let heldContinuation = '';

  function renderStakeListOwned(){
    const wrap=document.getElementById('chipWrap'); if(!wrap) return;
    const list=document.createElement('ul'); list.className='card-list'; wrap.innerHTML=''; wrap.appendChild(list);

    const user = window.FF_getUser();
    if(!user){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to view owned tokens.</div></li>'; return; }
    if(!heldTokens.length){ list.innerHTML='<li class="list-item"><div class="muted">No tokens loaded yet. Click “Refresh Owned”.</div></li>'; return; }

    heldTokens.forEach(({id,image})=>{
      const rank = window.FF_getRankById ? window.FF_getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML = FF.thumb64(image || (`${CFG.SOURCE_PATH}/frog/${id}.png`), `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Owned by <span class="addr">${FF.shorten(user)}</span></div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-outline btn-sm" disabled title="Stake flow wired later">🔒 Stake</button>
        </div>`;
      list.appendChild(li);
    });
  }

  async function fetchOwned(wallet, limit=50, nextStr){
    try{
      wallet = wallet || window.FF_getUser();
      if(!wallet){ document.getElementById('stakeStatus').textContent='Connect a wallet to load owned tokens.'; return; }
      const cont = nextStr || heldContinuation || '';
      const qs = cont ? '&continuation='+encodeURIComponent(cont) : '';
      const url = `https://api.reservoir.tools/users/${wallet}/tokens/v8?collection=${CFG.COLLECTION_ADDRESS}&limit=${limit}${qs}`;
      const res = await fetch(url, { method:'GET', headers:{ accept:'*/*','x-api-key': CFG.FROG_API_KEY } });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const items = (data.tokens||[]).map(t=>{
        const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
        const id = tokenId!=null?parseInt(String(tokenId),10):null;
        const img = t?.token?.image ?? (`${CFG.SOURCE_PATH}/frog/${tokenId}.png`);
        return id ? { id, image: img } : null;
      }).filter(Boolean);

      heldTokens = heldTokens.concat(items);
      heldContinuation = data.continuation || '';

      // render
      if(window.FF_getTab && window.FF_getTab()==='owned') renderStakeListOwned();

      // status
      const ss=document.getElementById('stakeStatus');
      ss.textContent = `Owned: ${heldTokens.length}` + (heldContinuation ? ' • more available' : '');

      // load more button
      const anchor = document.getElementById('stakeControls');
      let btn = document.getElementById('heldMoreBtn');
      if(!heldContinuation){ if(btn) btn.remove(); }
      else {
        if(!btn){
          btn=document.createElement('button');
          btn.id='heldMoreBtn'; btn.className='btn btn-outline btn-sm'; btn.textContent='Load more Owned';
          anchor?.appendChild(btn);
        }
        btn.onclick = ()=> fetchOwned(wallet, limit, heldContinuation);
      }
    }catch(e){
      console.warn(e);
      document.getElementById('stakeStatus').textContent='Failed to fetch owned tokens.';
    }
  }

  // controls
  document.getElementById('refreshOwned')?.addEventListener('click', ()=>{
    const u = window.FF_getUser();
    if(!u){ document.getElementById('stakeStatus').textContent='Connect a wallet first.'; return; }
    heldTokens=[]; heldContinuation=''; fetchOwned(u);
  });
  document.getElementById('selectAll')?.addEventListener('click',()=>{ document.getElementById('stakeStatus').textContent='Selected all visible tokens (demo).'; });
  document.getElementById('clearSel')?.addEventListener('click',()=>{ document.getElementById('stakeStatus').textContent='Cleared selection (demo).'; });

  // expose
  window.FF_fetchOwned = fetchOwned;
  window.FF_renderOwned = renderStakeListOwned;
  window.FF_clearOwned = ()=>{ heldTokens=[]; heldContinuation=''; if(window.FF_getTab && window.FF_getTab()==='owned') renderStakeListOwned(); };
})(window.FF, window.FF_CFG);
