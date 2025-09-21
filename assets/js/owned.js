(function(FF, CFG){
  let heldTokens = [];
  let heldContinuation = '';

  async function ensureRarity(){ try{ await FF.ensureRarity?.(); }catch{} }

  async function renderOwned(){
    const list=document.getElementById('chipWrap'); if(!list) return;
    if(window.FF_getTab && window.FF_getTab()!=='owned') return;

    await ensureRarity();

    list.innerHTML='';
    const user = window.FF_getUser();
    if(!user){ list.innerHTML='<li class="list-item"><div class="muted">Connect your wallet to view owned tokens.</div></li>'; return; }
    if(!heldTokens.length){ list.innerHTML='<li class="list-item"><div class="muted">No tokens loaded yet. Click “Refresh Owned”.</div></li>'; return; }

    heldTokens.forEach(({id,image})=>{
      const rank = FF.getRankById ? FF.getRankById(id) : null;
      const li=document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(image || (`${CFG.SOURCE_PATH}/frog/${id}.png`), `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <b>Frog #${id}</b>
            ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          </div>
          <div class="muted">Owned by <span class="addr">${FF.shorten(user)}</span></div>
        </div>`;
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
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

      await ensureRarity();
      if(window.FF_getTab && window.FF_getTab()==='owned') renderOwned();

      const ss=document.getElementById('stakeStatus');
      ss.textContent = `Owned: ${heldTokens.length}` + (heldContinuation ? ' • more available' : '');
    }catch(e){
      console.warn(e);
      document.getElementById('stakeStatus').textContent='Failed to fetch owned tokens.';
    }
  }

  document.getElementById('refreshOwned')?.addEventListener('click', async ()=>{
    const u = window.FF_getUser();
    if(!u){ document.getElementById('stakeStatus').textContent='Connect a wallet first.'; return; }
    heldTokens=[]; heldContinuation=''; await fetchOwned(u);
  });

  window.FF_fetchOwned = fetchOwned;
  window.FF_clearOwned = ()=>{ heldTokens=[]; heldContinuation=''; if(window.FF_getTab && window.FF_getTab()==='owned') renderOwned(); };
  window.FF_renderOwned = ()=>{ renderOwned(); };
})(window.FF, window.FF_CFG);
