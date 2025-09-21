// assets/js/pond.js
(function(FF, CFG){
  const PAGE_SIZE = 24;          // frogs per page
  const MAX_PAGES = 10;          // safety cap when walking Reservoir pagination
  let PAGE = 0;
  let STAKED = [];               // [{ id, staker, since: Date }]

  // ---------- helpers ----------
  const HDR = { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY };
  const API = 'https://api.reservoir.tools';

  function $(id){ return document.getElementById(id); }
  function ensureList(root){
    let host = typeof root === 'string' ? $(root) : root;
    if(!host) host = $('pondList') || $('tab-pond') || $('pondPanel');
    if(!host) return {};
    let ul = (host.tagName === 'UL') ? host : host.querySelector('ul');
    if(!ul){
      ul = document.createElement('ul');
      ul.className = 'card-list list-scroll';
      host.appendChild(ul);
    }
    return {host, ul};
  }
  function fmtAgo(date){
    if(!date) return '';
    const ms = Date.now() - date.getTime();
    return FF.formatAgo ? FF.formatAgo(ms) : `${Math.round(ms/3600000)}h`;
  }
  function safeDate(raw){
    if(raw==null) return null;
    if(typeof raw==='number'){ const ms = raw < 1e12 ? raw*1000 : raw; return new Date(ms); }
    const t = Date.parse(raw); return Number.isNaN(t) ? null : new Date(t);
  }

  function buildPager(total, onJump){
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const bar = document.createElement('div'); bar.className = 'pond-pager';
    for(let i=0;i<pages;i++){
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = String(i+1);
      if(i===PAGE) b.classList.add('btn-solid');
      b.addEventListener('click', ()=>{ PAGE=i; onJump(); });
      bar.appendChild(b);
    }
    return bar;
  }

  // ---------- RESERVOIR: scan transfers to/from controller ----------
  async function fetchTransfers(params){
    const qs = new URLSearchParams(params);
    let url = `${API}/transfers/v3?${qs.toString()}`;
    const res = await fetch(url, { headers: HDR });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function scanTransfersToController(){
    const inMap = Object.create(null); // tokenId -> { ts: Date, from: address }
    let continuation = '';
    for(let i=0;i<MAX_PAGES;i++){
      const q = {
        contract: CFG.COLLECTION_ADDRESS,
        to: CFG.CONTROLLER_ADDRESS,
        limit: '200',
        sortBy: 'timestamp',
        sortDirection: 'desc'
      };
      if(continuation) q.continuation = continuation;
      const json = await fetchTransfers(q);
      const rows = json?.transfers || [];
      for(const t of rows){
        const id = Number(t?.token?.tokenId ?? t?.tokenId);
        if(!Number.isFinite(id)) continue;
        // first time we see it (descending), it's the most recent inbound → keep it
        if(!inMap[id]){
          inMap[id] = {
            ts: safeDate(t?.timestamp ?? t?.createdAt ?? t?.txTimestamp),
            from: t?.fromAddress || t?.from || null
          };
        }
      }
      continuation = json?.continuation || '';
      if(!continuation) break;
    }
    return inMap;
  }

  async function scanTransfersFromController(){
    const outMap = Object.create(null); // tokenId -> { ts: Date }
    let continuation = '';
    for(let i=0;i<MAX_PAGES;i++){
      const q = {
        contract: CFG.COLLECTION_ADDRESS,
        from: CFG.CONTROLLER_ADDRESS,
        limit: '200',
        sortBy: 'timestamp',
        sortDirection: 'desc'
      };
      if(continuation) q.continuation = continuation;
      const json = await fetchTransfers(q);
      const rows = json?.transfers || [];
      for(const t of rows){
        const id = Number(t?.token?.tokenId ?? t?.tokenId);
        if(!Number.isFinite(id)) continue;
        if(!outMap[id]){
          outMap[id] = { ts: safeDate(t?.timestamp ?? t?.createdAt ?? t?.txTimestamp) };
        }
      }
      continuation = json?.continuation || '';
      if(!continuation) break;
    }
    return outMap;
  }

  // If transfers endpoint is unavailable, fallback to owner=controller, then enrich per token
  async function fallbackTokensOwnedByController(){
    const out = [];
    let continuation = '';
    for(let i=0;i<MAX_PAGES;i++){
      const qs = new URLSearchParams({
        collection: CFG.COLLECTION_ADDRESS,
        owner: CFG.CONTROLLER_ADDRESS,
        limit: '200',
        includeTopBid: 'false'
      });
      if(continuation) qs.set('continuation', continuation);
      const res = await fetch(`${API}/tokens/v7?${qs.toString()}`, { headers: HDR });
      if(!res.ok) break;
      const json = await res.json();
      const ids = (json?.tokens || []).map(t => Number(t?.token?.tokenId)).filter(Number.isFinite);
      out.push(...ids);
      continuation = json?.continuation || '';
      if(!continuation) break;
    }
    // Enrich each id with latest inbound (to controller) to get staker/since
    const result = [];
    for(const id of out){
      try{
        const q = {
          contract: CFG.COLLECTION_ADDRESS,
          to: CFG.CONTROLLER_ADDRESS,
          tokenId: String(id),
          limit: '1',
          sortBy: 'timestamp',
          sortDirection: 'desc'
        };
        const r = await fetchTransfers(q);
        const t = (r?.transfers||[])[0];
        result.push({
          id,
          staker: t?.fromAddress || t?.from || null,
          since: safeDate(t?.timestamp ?? t?.createdAt ?? t?.txTimestamp)
        });
      }catch{
        result.push({ id, staker: null, since: null });
      }
    }
    return result;
  }

  async function loadStakedViaReservoir(){
    try{
      const [inMap, outMap] = await Promise.all([
        scanTransfersToController(),
        scanTransfersFromController()
      ]);
      const ids = Object.keys(inMap).map(x=>Number(x)).filter(Number.isFinite);

      // “Currently staked” = last inbound newer than last outbound (or no outbound)
      const rows = [];
      for(const id of ids){
        const inbound = inMap[id];
        const outbound = outMap[id];
        const inTs = inbound?.ts ? inbound.ts.getTime() : -1;
        const outTs = outbound?.ts ? outbound.ts.getTime() : -1;
        if(inTs > outTs){
          rows.push({
            id,
            staker: inbound?.from || null,
            since: inbound?.ts || null
          });
        }
      }
      // newest first
      rows.sort((a,b)=> (b.since?b.since.getTime():0) - (a.since?a.since.getTime():0));
      return rows;
    }catch(e){
      console.warn('Pond: transfers scan failed; using owner=controller fallback', e);
      return await fallbackTokensOwnedByController();
    }
  }

  // ---------- render ----------
  async function renderPage(container){
    const { host, ul } = ensureList(container);
    if(!ul) return;

    ul.innerHTML = '';
    const start = PAGE * PAGE_SIZE, end = Math.min(STAKED.length, start + PAGE_SIZE);
    const slice = STAKED.slice(start, end);

    if(!slice.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>';
      host && host.querySelector('.pond-pager')?.remove();
      return;
    }

    // Make sure rarity is ready so rank badges are correct
    try{ await FF.ensureRarity?.(); }catch{}

    for(const row of slice){
      const { id, staker, since } = row;
      const rank = FF.getRankById ? FF.getRankById(id) : null;
      const badge = (rank||rank===0)
        ? `<span class="pill">Rank <b>#${rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

      const li = document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <b>Frog #${id}</b> ${badge}
            <span class="pill pill-green">Staked • ${since ? (fmtAgo(since)+' ago') : ''}</span>
          </div>
          <div class="muted">Staker <span class="addr">${staker ? FF.shorten(String(staker)) : '—'}</span></div>
        </div>`;
      // modal on click
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
      ul.appendChild(li);
    }

    // Pager
    if(host){
      host.querySelector('.pond-pager')?.remove();
      host.appendChild(buildPager(STAKED.length, ()=>renderPage(host)));
    }
  }

  // ---------- public API ----------
  async function renderPondPaged(container){
    PAGE = 0;
    STAKED = await loadStakedViaReservoir();
    await renderPage(container);
  }

  async function refresh(container){
    await renderPondPaged(container);
  }

  window.FF_renderPondPaged = renderPondPaged;
  window.FF_refreshPond = refresh;
})(window.FF, window.FF_CFG);
