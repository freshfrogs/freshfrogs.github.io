// assets/js/activity-feed.js
(function (FF, CFG) {
  const UL_ID = 'activityList';
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = `${BASE}/collections/activity/v6`;
  const PAGE  = Math.max(1, Number(CFG.PAGE_SIZE || 20));

  function need(k){ if(!CFG[k]) throw new Error(`[activity] Missing FF_CFG.${k}`); return CFG[k]; }
  const API_KEY    = need('FROG_API_KEY');
  const COLLECTION = need('COLLECTION_ADDRESS');

  const HDR = { accept: 'application/json', 'x-api-key': API_KEY };

  const shorten = (a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago     = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '';
  const imgFor  = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;

  function ul(){ return document.getElementById(UL_ID); }
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  async function reservoirFetch(url){
    const res = await fetch(url, { headers: HDR });
    if (!res.ok){
      let body = null;
      try { body = await res.text(); } catch {}
      const err = new Error(`HTTP ${res.status}${body ? ` — ${body}` : ''}`);
      err.url = url; throw err;
    }
    return res.json();
  }

  function mapRow(a){
    const tokenId = Number(a?.token?.tokenId);
    if (!Number.isFinite(tokenId)) return null;

    const from = (a?.fromAddress || '').toLowerCase();
    const to   = (a?.toAddress   || '').toLowerCase();
    const ctl  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();

    let type = a?.type || '';
    if (from === '0x0000000000000000000000000000000000000000') type = 'Mint';
    else if (to === ctl)   type = 'Stake';
    else if (from === ctl) type = 'Unstake';
    else if ((a?.price || a?.salePrice) != null) type = 'Sale';
    else if (!type) type = 'Transfer';

    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string') { const p = Date.parse(ts); if (!Number.isNaN(p)) dt = new Date(p); }

    let priceEth = null;
    const p = a?.price ?? a?.salePrice;
    if (p?.amount?.decimal != null) priceEth = Number(p.amount.decimal);
    else if (typeof p === 'number') priceEth = p;

    return { id: tokenId, type, from: a?.fromAddress || null, to: a?.toAddress || null, priceEth, time: dt, img: imgFor(tokenId) };
  }

  async function fetchRecent(limit = PAGE){
    const qs = new URLSearchParams({
      collection: COLLECTION,                 // ✅ singular
      limit: String(Math.min(50, Math.max(1, limit)))
      // keep it minimal while debugging; add types/sortBy later if desired
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
      const meta = [
        (it.from || it.to) ? [it.from ? shorten(it.from) : '—', it.to ? '→ '+shorten(it.to) : ''].join(' ') : null,
        (it.priceEth != null) ? `${it.priceEth} ETH` : null,
        it.time ? ago(it.time) : null
      ].filter(Boolean).join(' • ');

      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML =
        FF.thumb64(it.img, `Frog ${it.id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
             <b>${it.type}</b> • Frog #${it.id} ${pillRank(rank)}
           </div>
           <div class="pg-muted">${meta}</div>
         </div>`;
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id: it.id }));
      root.appendChild(li);
    });
  }

  async function loadAndRender(){
    try { await FF.ensureRarity?.(); } catch (e) { console.warn('Rarity load failed (non-blocking)', e); }
    try{ render(await fetchRecent(PAGE)); }
    catch(e){
      console.warn('[activity] failed', e, e.url ? `\nURL: ${e.url}` : '');
      const root = ul(); if (root) root.innerHTML = `<li class="row"><div class="pg-muted">Could not load activity.</div></li>`;
    }
  }

  window.FF_loadRecentActivity = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
