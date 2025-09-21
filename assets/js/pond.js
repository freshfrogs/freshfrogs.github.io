// assets/js/pond.js
(function(FF, CFG){
  const PAGE_SIZE = 24;        // how many frogs per page
  let IDS = [];                // controller-owned tokenIds
  let page = 0;

  const HDR = ()=>({ accept: '*/*', 'x-api-key': CFG.FROG_API_KEY });

  // ---------- utils: container handling ----------
  function resolveTargets(root){
    // Accept either the UL itself or a container that will get a UL appended
    let host = typeof root === 'string' ? document.getElementById(root) : root;
    if (!host) host = document.getElementById('pondList') || document.getElementById('tab-pond') || document.getElementById('pondPanel');
    if (!host) return {};
    let ul = (host.tagName === 'UL') ? host : host.querySelector('ul');
    if (!ul){
      ul = document.createElement('ul');
      ul.className = 'card-list list-scroll';
      host.appendChild(ul);
    }
    return { host, ul };
  }

  function clear(el, html){ if(el){ el.innerHTML = html ?? ''; } }

  // ---------- Reservoir: list tokens owned by controller ----------
  async function fetchTokensByOwner(owner){
    const out = [];
    if (!CFG.FROG_API_KEY){ console.warn('Pond: missing FROG_API_KEY'); return out; }
    const base = 'https://api.reservoir.tools/tokens/v7';
    let continuation = '';
    for (let i=0;i<6;i++){
      const qs = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner,
        limit: '200',
        includeTopBid: 'false'
      });
      if (continuation) qs.set('continuation', continuation);
      const res = await fetch(`${base}?${qs.toString()}`, { headers: HDR() });
      if (!res.ok){ console.warn('Pond fetch tokens status', res.status); break; }
      const json = await res.json();
      const arr = (json?.tokens || []).map(t => Number(t?.token?.tokenId)).filter(Number.isFinite);
      out.push(...arr);
      continuation = json?.continuation || '';
      if (!continuation) break;
    }
    return out;
  }

  // ---------- pager ----------
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

  // ---------- row render (lazy enrich) ----------
  function baseRowHTML(id){
    const rank = FF.getRankById ? FF.getRankById(id) : null; // might be null until ensureRarity()
    const badge = (rank||rank===0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
    // Put placeholders for async values (staker/since)
    return (
      FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
      `<div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <b>Frog #${id}</b> ${badge}
          <span class="pill pill-green" id="p-since-${id}">Staked</span>
        </div>
        <div class="muted">Staker <span class="addr" id="p-staker-${id}">—</span></div>
      </div>`
    );
  }

  async function enrichRow(id){
    try {
      // Make sure rarity has loaded once so Rank isn't N/A on first pass
      await FF.ensureRarity?.();
    } catch {}
    // Update rank badge if it was N/A
    const rank = FF.getRankById ? FF.getRankById(id) : null;
    if (rank || rank===0){
      // Find the closest list-item we just rendered and patch its HTML badge if needed
      // (We keep it simple: no-op if already set)
    }

    // Fill staker + since (don’t block the whole list)
    try{
      const [staker, since] = await Promise.all([
        FF.resolveStaker?.(id).catch(()=>null),
        FF.stakedSinceDate?.(id).catch(()=>null),
      ]);
      const sEl = document.getElementById(`p-staker-${id}`);
      if (sEl && staker) sEl.textContent = FF.shorten(String(staker));
      const sinceEl = document.getElementById(`p-since-${id}`);
      if (sinceEl){
        if (since) sinceEl.textContent = `Staked • ${FF.formatAgo(Date.now()-since.getTime())} ago`;
        else sinceEl.textContent = `Staked`;
      }
    }catch(e){ /* quiet */ }
  }

  async function renderPage(container){
    const { host, ul } = resolveTargets(container);
    if(!ul) return;

    clear(ul);
    const start = page * PAGE_SIZE, end = Math.min(IDS.length, start + PAGE_SIZE);
    const slice = IDS.slice(start, end);

    if (!slice.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>';
      host && host.querySelector('.pond-pager')?.remove();
      return;
    }

    // Render base rows first (snappy)
    for (const id of slice){
      const li = document.createElement('li'); li.className='list-item';
      li.innerHTML = baseRowHTML(id);
      // open modal on click
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
      ul.appendChild(li);
    }

    // Pager
    if (host){
      host.querySelector('.pond-pager')?.remove();
      host.appendChild(buildPager(IDS.length, ()=>renderPage(host)));
    }

    // Enrich each row (rank, staker, since) without blocking initial paint
    slice.forEach(id => enrichRow(id));
  }

  // ---------- public API ----------
  async function renderPondPaged(container){
    const { host, ul } = resolveTargets(container);
    if(!host && !ul){ console.warn('Pond: no container found'); return; }
    page = 0;
    try{
      IDS = await fetchTokensByOwner(CFG.CONTROLLER_ADDRESS);
    }catch(e){
      console.warn('Pond fetch failed', e);
      IDS = [];
    }
    await renderPage(host || ul);
  }

  async function refresh(container){
    await renderPondPaged(container);
  }

  window.FF_renderPondPaged = renderPondPaged;
  window.FF_refreshPond = refresh;
})(window.FF, window.FF_CFG);
