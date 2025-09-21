// assets/js/pond.js
(function(FF, CFG){
  const PAGE_SIZE = 24;          // how many frogs per page
  let IDs = [];                  // controller-owned tokenIds
  let page = 0;

  // ---- Reservoir: list tokens owned by controller (the pond) ----
  async function fetchTokensByOwner(owner){
    const out = [];
    const key = CFG.FROG_API_KEY; if(!key) return out;
    const base = 'https://api.reservoir.tools/tokens/v7';
    let continuation = '';
    for (let i=0;i<6;i++){
      const qs = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner, limit: '200', includeTopBid: 'false'
      });
      if (continuation) qs.set('continuation', continuation);
      const res = await fetch(`${base}?${qs}`, { headers:{accept:'*/*','x-api-key':key}});
      if (!res.ok) break;
      const json = await res.json();
      const arr = (json?.tokens||[]).map(t => Number(t?.token?.tokenId)).filter(Number.isFinite);
      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // ---- Pager UI ----
  function buildPager(total, onJump){
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const bar = document.createElement('div');
    bar.className = 'pond-pager';
    for(let i=0;i<pages;i++){
      const b=document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = String(i+1);
      if (i===page) b.classList.add('btn-solid');
      b.addEventListener('click', ()=>{ page=i; onJump(); });
      bar.appendChild(b);
    }
    return bar;
  }

  // ---- Single row (rank + staker + since) ----
  async function renderRow(id){
    // ensure rarity is available so we don’t show N/A
    await FF.ensureRarity?.();

    const [rank, since, staker] = await Promise.all([
      FF.getRankById?.(id).catch(()=>null),
      FF.stakedSinceDate?.(id).catch(()=>null),
      FF.resolveStaker?.(id).catch(()=>null),
    ]);

    const li = document.createElement('li'); li.className='list-item';
    li.innerHTML =
      FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <b>Frog #${id}</b>
          ${(rank||rank===0)?`<span class="pill">Rank <b>#${rank}</b></span>`:`<span class="pill"><span class="muted">Rank N/A</span></span>`}
          <span class="pill pill-green">Staked${since?` • ${FF.formatAgo(Date.now()-since.getTime())} ago`:''}</span>
        </div>
        <div class="muted">Staker <span class="addr">${staker?FF.shorten(staker):'—'}</span></div>
      </div>`;

    // open the modal on click (pond rows should open details)
    li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
    return li;
  }

  // ---- Render current page into container ----
  async function renderPage(container){
    const ul = container.querySelector('ul') || (()=>{
      const u=document.createElement('ul'); u.className='card-list'; container.innerHTML=''; container.appendChild(u); return u;
    })();
    ul.innerHTML = '';

    const start = page * PAGE_SIZE, end = Math.min(IDs.length, start + PAGE_SIZE);
    const slice = IDs.slice(start, end);

    if (!slice.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>';
      return;
    }
    for (const id of slice){ ul.appendChild(await renderRow(id)); }

    // pager
    container.querySelector('.pond-pager')?.remove();
    container.appendChild(buildPager(IDs.length, ()=>renderPage(container)));
  }

  // ---- Public API ----
  async function renderPondPaged(container){
    page = 0;
    IDs = await fetchTokensByOwner(CFG.CONTROLLER_ADDRESS).catch(()=>[]);
    await renderPage(container);
  }

  async function refresh(container){ await renderPondPaged(container); }

  window.FF_renderPondPaged = renderPondPaged;
  window.FF_refreshPond = refresh;
})(window.FF, window.FF_CFG);
