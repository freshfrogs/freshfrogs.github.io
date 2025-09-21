// assets/js/pond.js
(function(FF, CFG){
  let STAKED = []; // [{ id, staker, since: Date }]

  const API = 'https://api.reservoir.tools';
  const HDR = { accept:'*/*', 'x-api-key': CFG.FROG_API_KEY };
  const MAX_PAGES = 10;

  function $(id){ return document.getElementById(id); }
  function hostUL(root){
    let el = typeof root==='string' ? $(root) : root;
    if(!el) el = $('pondList') || $('tab-pond') || $('pondPanel');
    if(!el) return {};
    let ul = (el.tagName==='UL') ? el : el.querySelector('ul');
    if(!ul){
      ul = document.createElement('ul');
      ul.className = 'card-list list-scroll';
      el.appendChild(ul);
    }
    return { host: el, ul };
  }
  function safeDate(raw){
    if(raw==null) return null;
    if(typeof raw==='number'){ const ms = raw < 1e12 ? raw*1000 : raw; return new Date(ms); }
    const t = Date.parse(raw); return Number.isNaN(t) ? null : new Date(t);
  }
  function ago(d){ return d ? (FF.formatAgo ? FF.formatAgo(Date.now()-d.getTime()) : '') : ''; }

  async function fetchTransfers(params){
    const qs = new URLSearchParams(params);
    const res = await fetch(`${API}/transfers/v3?${qs.toString()}`, { headers: HDR });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  async function scanToController(){
    const inMap = Object.create(null); // tokenId -> { ts, from }
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

  async function scanFromController(){
    const outMap = Object.create(null); // tokenId -> { ts }
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

  async function loadStakedViaReservoir(){
    const [inMap, outMap] = await Promise.all([
      scanToController(),
      scanFromController()
    ]);
    const ids = Object.keys(inMap).map(n=>Number(n)).filter(Number.isFinite);
    const rows = [];
    for(const id of ids){
      const inbound = inMap[id];
      const outbound = outMap[id];
      const inTs = inbound?.ts ? inbound.ts.getTime() : -1;
      const outTs = outbound?.ts ? outbound.ts.getTime() : -1;
      if(inTs > outTs){
        rows.push({ id, staker: inbound?.from || null, since: inbound?.ts || null });
      }
    }
    rows.sort((a,b)=> (b.since?b.since.getTime():0) - (a.since?a.since.getTime():0));
    return rows;
  }

  // Render all (sales-like rows)
  async function renderAll(container){
    const { ul } = hostUL(container);
    if(!ul) return;
    ul.innerHTML = '';

    if(!STAKED.length){
      ul.innerHTML = '<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>';
      return;
    }

    try{ await FF.ensureRarity?.(); }catch{}

    STAKED.forEach(({id, staker, since})=>{
      const rank = FF.getRankById ? FF.getRankById(id) : null;
      const badge = (rank||rank===0)
        ? `<span class="pill">Rank <b>#${rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

      const li = document.createElement('li'); li.className='list-item';
      li.innerHTML =
        FF.thumb64(`${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <b>Frog #${id}</b> ${badge}
          </div>
          <div class="muted">${since ? (ago(since)+' ago') : '—'} • Staker ${staker ? FF.shorten(String(staker)) : '—'}</div>
        </div>`;
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id }));
      ul.appendChild(li);
    });
  }

  async function renderPond(container){
    if(!CFG.FROG_API_KEY){ console.warn('Pond: missing FROG_API_KEY'); }
    try{
      STAKED = await loadStakedViaReservoir();
    }catch(e){
      console.warn('Pond load failed', e);
      STAKED = [];
    }
    await renderAll(container);
  }

  // public
  window.FF_renderPond = renderPond;
  window.FF_refreshPond = renderPond;
})(window.FF, window.FF_CFG);
