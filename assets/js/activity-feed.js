// assets/js/activity-feed.js
// Live Recent Activity for Fresh Frogs — reuses FF + FF_CFG + your Reservoir patterns
(function (FF, CFG) {
  const UL_ID = 'activityList';
  const API   = 'https://api.reservoir.tools/users/activity/v6';
  const HDR   = { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  const PAGE  = Math.max(1, Number(CFG.PAGE_SIZE || 20));

  const shorten = (a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '';
  const imgFor  = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;

  function ul(){ return document.getElementById(UL_ID); }

  function pillRank(rank){
    return (rank||rank===0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
  }

  // Robust fetch with light retry/backoff (mirrors pond.js style)
  async function reservoirFetch(url, retries=2, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { headers: HDR, signal: ctrl.signal });
        clearTimeout(t);
        if (res.status === 429 && i < retries){
          const ra = Number(res.headers.get('retry-after')) || (1<<i);
          await new Promise(r=>setTimeout(r, ra*1000));
          continue;
        }
        if (!res.ok){
          if (i < retries){ await new Promise(r=>setTimeout(r, 300*(i+1))); continue; }
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      }catch(e){
        clearTimeout(t);
        if (i === retries) throw e;
        await new Promise(r=>setTimeout(r, 300*(i+1)));
      }
    }
  }

  // Normalize a Reservoir activity row
  function mapRow(a){
    const tokenId = Number(a?.token?.tokenId);
    if (!Number.isFinite(tokenId)) return null;

    const from = (a?.fromAddress || '').toLowerCase();
    const to   = (a?.toAddress   || '').toLowerCase();
    const ctl  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();

    // Type detection (mint/transfer/sale, with optional stake/unstake by controller)
    let type = a?.type || '';
    if (from === '0x0000000000000000000000000000000000000000') type = 'Mint';
    else if (to === ctl)   type = 'Stake';
    else if (from === ctl) type = 'Unstake';
    else if ((a?.price || a?.salePrice) != null) type = 'Sale';
    else if (!type) type = 'Transfer';

    // Timestamp
    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string') { const p = Date.parse(ts); if (!Number.isNaN(p)) dt = new Date(p); }

    // Price ETH (if present)
    let priceEth = null;
    const p = a?.price ?? a?.salePrice;
    if (p?.amount?.decimal != null) priceEth = Number(p.amount.decimal);
    else if (typeof p === 'number') priceEth = p;

    return {
      id: tokenId,
      type,
      from: a?.fromAddress || null,
      to:   a?.toAddress   || null,
      priceEth,
      time: dt,
      img: imgFor(tokenId)
    };
  }

  async function fetchRecent(collection, limit = PAGE){
    const qs = new URLSearchParams({
      collections: collection,
      limit: String(Math.min(50, Math.max(1, limit))),
      sortBy: 'eventTimestamp'
      // You can add `types=transfer,mint,sale` if you want to filter tighter
    });
    const url = `${API}?${qs.toString()}`;
    const json = await reservoirFetch(url);
    return (json?.activities || []).map(mapRow).filter(Boolean)
      .sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
  }

  function render(items){
    const root = ul(); if (!root) return;
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = `<li class="row"><div class="pg-muted">No recent activity yet.</div></li>`;
      return;
    }
    items.slice(0, PAGE).forEach(it=>{
      const rank = FF.getRankById?.(it.id);
      const badge = pillRank(rank);
      const metaParts = [];
      if (it.from || it.to){
        const from = it.from ? shorten(it.from) : '—';
        const to   = it.to ? shorten(it.to) : null;
        metaParts.push(to ? `${from} → ${to}` : from);
      }
      if (it.priceEth != null) metaParts.push(`${it.priceEth} ETH`);
      if (it.time) metaParts.push(ago(it.time));

      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML =
        FF.thumb64(it.img, `Frog ${it.id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
             <b>${it.type}</b> • Frog #${it.id} ${badge}
           </div>
           <div class="pg-muted">${metaParts.join(' • ')}</div>
         </div>`;

      li.addEventListener('click', ()=> FF.openFrogModal?.({ id: it.id }));
      root.appendChild(li);
    });
  }

  async function loadAndRender(){
    try { await FF.ensureRarity?.(); } catch {}
    if (!CFG.FROG_API_KEY){
      render([]); // also show a helpful line if you want
      console.warn('[activity] Missing FROG_API_KEY in config.js');
      return;
    }
    try{
      const list = await fetchRecent(CFG.COLLECTION_ADDRESS, PAGE);
      render(list);
    }catch(e){
      console.warn('[activity] failed', e);
      render([]);
    }
  }

  // public entry
  window.FF_loadRecentActivity = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
