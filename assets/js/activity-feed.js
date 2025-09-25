// assets/js/activity-feed.js
// Fresh Frogs — Recent Activity (uses your existing FF + CFG + Reservoir access)
(function(FF, CFG){
  const UL_ID = 'activityList';
  const API   = 'https://api.reservoir.tools/users/activity/v6';
  const PAGE_SIZE = 20;

  // --- helpers from your style ---
  const shorten = (a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '—';
  const imgFor  = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY (see config.js)');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  function ul(){ return document.getElementById(UL_ID); }

  // Normalize Reservoir activity rows into a small shape the renderer expects
  function mapRow(a){
    const tok = a?.token?.tokenId;
    const id  = Number(tok);
    if (!Number.isFinite(id)) return null;

    // classify
    const from = (a?.fromAddress || '').toLowerCase();
    const to   = (a?.toAddress   || '').toLowerCase();
    const ctl  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();

    let type = a?.type || '';
    // Reservoir types might include sale, mint, transfer, bid, ask, etc.
    if (from === '0x0000000000000000000000000000000000000000') type = 'Mint';
    else if (to === ctl)   type = 'Stake';
    else if (from === ctl) type = 'Unstake';
    else if ((a?.price || a?.salePrice) != null) type = 'Sale';
    else if (!type) type = 'Transfer';

    // time
    const ts = a?.timestamp || a?.createdAt;
    const dt = typeof ts === 'number' ? new Date(ts < 1e12 ? ts*1000 : ts) : (ts ? new Date(ts) : null);

    // price ETH (when present)
    let priceEth = null;
    const p = a?.price ?? a?.salePrice;
    if (p?.amount?.decimal) priceEth = Number(p.amount.decimal);
    if (typeof p === 'number') priceEth = p;

    return {
      type,
      id,
      from: a?.fromAddress || null,
      to:   a?.toAddress   || null,
      priceEth,
      img: imgFor(id),
      time: dt
    };
  }

  function render(items){
    const root = ul(); if(!root) return;
    root.innerHTML = '';
    if (!items || !items.length){
      root.innerHTML = `<li class="row"><div class="pg-muted">No recent activity yet.</div></li>`;
      return;
    }
    items.slice(0, PAGE_SIZE).forEach(it=>{
      const rank = FF.getRankById?.(it.id);
      const badge = pillRank(rank);
      const price = (it.priceEth != null) ? `${it.priceEth} ETH` : null;

      const li = document.createElement('li'); li.className = 'row';
      li.innerHTML =
        FF.thumb64(it.img, `Frog ${it.id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
             <b>${it.type}</b> • Frog #${it.id} ${badge}
           </div>
           <div class="pg-muted">
             ${it.from ? shorten(it.from) : '—'}
             ${it.to ? ' → ' + shorten(it.to) : ''}
             ${price ? ' • ' + price : ''}
             ${it.time ? ' • ' + ago(it.time) : ''}
           </div>
         </div>`;

      // open your existing modal on click
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id: it.id }));
      root.appendChild(li);
    });
  }

  async function fetchActivity(){
    // We fetch activity for the collection via "users/activity" with collection filter
    // (this endpoint supports multiple filters including collections[])
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      sortBy: 'eventTimestamp',
      types: 'transfer,mint,sale',          // Reservoir will still return stake/unstake via controller flows
      collections: CFG.COLLECTION_ADDRESS || ''
    });
    const url = `${API}?${params.toString()}`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    // newest first
    return rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
  }

  async function loadAndRender(){
    try{
      await FF.ensureRarity?.();      // so ranks render
    }catch{}
    try{
      const items = await fetchActivity();
      render(items);
    }catch(e){
      console.warn('[activity-feed] failed', e);
      render([]); // clean fallback
    }
  }

  // Public API
  window.FF_loadRecentActivity = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
