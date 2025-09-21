// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const API = 'https://api.reservoir.tools/users/activity/v6';
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE  = 20; // reservoir max per call

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    pages: [],                 // [{ rows: [{id, staker, since}], contIn, contOut }]
    page: 0,                   // stores *internal* index (newest-first order)
    nextContinuation: '',      // for next fetch (older)
    blockedIds: new Set(),     // tokens that later left controller
    acceptedIds: new Set()     // dedupe accepted across pages
  };

  let RANKS = null;

  // ---------- UI helpers ----------
  const fmtAgo = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '—';
  const pillRank = (rank)=> (rank||rank===0)
    ? `<span class="pill">Rank <b>#${rank}</b></span>`
    : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

  function ensurePager(){
    let nav = document.getElementById('pondPager');
    if (!nav){
      nav = document.createElement('div');
      nav.id = 'pondPager';
      nav.style.marginTop = '8px';
      nav.className = 'row';
      wrap.appendChild(nav);
    }
    return nav;
  }

  // We fetch pages newest->older, but we DISPLAY oldest->newest.
  // Display index (0..N-1) -> store index (newest-first array).
  const storeIdxFromDisplay = (dispIdx)=> (ST.pages.length - 1 - dispIdx);
  const displayIdxFromStore = (storeIdx)=> (ST.pages.length - 1 - storeIdx);

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    // Build buttons in display order (oldest -> newest)
    for (let disp=0; disp<ST.pages.length; disp++){
      const sIdx = storeIdxFromDisplay(disp);
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(disp+1);
      if (sIdx === ST.page) btn.classList.add('btn-solid');
      btn.addEventListener('click', ()=>{
        if (ST.page !== sIdx){
          ST.page = sIdx;
          renderPage();
        }
      });
      nav.appendChild(btn);
    }

    // Ellipsis "…" to fetch next (older) page, if continuation exists
    if (ST.nextContinuation){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-ghost btn-sm';
      moreBtn.setAttribute('aria-label', 'Load more pages');
      moreBtn.title = 'Load more';
      moreBtn.textContent = '…'; // U+2026 ellipsis
      moreBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          // Jump to the new OLDEST page (which is at the end of the array → highest store index)
          ST.page = ST.pages.length - 1;
          renderPage();
        }
      });
      nav.appendChild(moreBtn);
    }
  }

  // ---------- frog renderer (128x128, layered, background trick, hover lift) ----------
  // Exclusions for lift / animations:
  const NO_ANIM_FOR = new Set(['Frog', 'Trait', 'SpecialFrog']);

  function mk(tag, props={}, style={}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }

  function safePath(part){ return encodeURI(part).replace(/%20/g, ' '); }

  // Try animation path first (onerror -> fallback png)
  function makeLayerImg(attr, value, sizePx){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `/frog/build_files/${safePath(attr)}`;
    const png  = `${base}/${safePath(value)}.png`;
    const gif  = `${base}/animations/${safePath(value)}_animation.gif`;

    const img = new Image();
    img.decoding = 'async';
    img.loading = 'lazy';
    img.alt = `${attr}: ${value}`;
    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';
    img.style.width = `${sizePx}px`;
    img.style.height = `${sizePx}px`;
    img.style.imageRendering = 'pixelated';
    img.style.willChange = 'transform, filter';
    img.dataset.attr = attr;

    if (allowAnim){
      img.src = gif;
      img.onerror = ()=>{ img.onerror = null; img.src = png; };
    } else {
      img.src = png;
    }
    return img;
  }

  function attachLiftHandlers(layerEl){
    const attr = layerEl.dataset.attr || '';
    if (NO_ANIM_FOR.has(attr)) return; // no lift for these
    // Subtle “picked up” effect on hover
    layerEl.addEventListener('mouseenter', ()=>{
      layerEl.style.transform = 'translateY(-6px)';
      layerEl.style.filter = 'drop-shadow(0 4px 0 rgba(0,0,0,0.45))';
    });
    layerEl.addEventListener('mouseleave', ()=>{
      layerEl.style.transform = 'translateY(0)';
      layerEl.style.filter = 'none';
    });
  }

  async function buildFrog128(container, tokenId){
    const SIZE = 128;

    // container box
    Object.assign(container.style, {
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      minWidth: `${SIZE}px`,
      minHeight: `${SIZE}px`,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '8px',
    });

    // Background technique: use original PNG, scaled & offset so only its bg color shows
    const bg = new Image();
    bg.decoding = 'async';
    bg.loading = 'lazy';
    bg.alt = `Frog #${tokenId} background`;
    Object.assign(bg.style, {
      position: 'absolute',
      // tuned offsets so the frog is pushed off the crop, leaving only bg color
      left: `-${Math.round(SIZE * 0.35)}px`,
      top:  `${Math.round(SIZE * 0.25)}px`,
      transform: `scale(2.6)`,
      imageRendering: 'pixelated',
      zIndex: '0',
      opacity: '1'
    });
    // prefer assets path if configured; fallback to /frog/{id}.png
    const pngA = `${CFG.SOURCE_PATH ? CFG.SOURCE_PATH : ''}/frog/${tokenId}.png`;
    const pngB = `/frog/${tokenId}.png`;
    bg.src = pngA;
    bg.onerror = ()=>{ bg.onerror = null; bg.src = pngB; };

    container.appendChild(bg);

    // Load metadata & layer
    const metaUrl = `/frog/json/${tokenId}.json`;
    let meta;
    try {
      meta = await FF.fetchJSON(metaUrl);
    } catch {
      // fallback to a single flat image if meta missing
      const flat = new Image();
      flat.decoding = 'async';
      flat.loading = 'lazy';
      flat.alt = `Frog #${tokenId}`;
      Object.assign(flat.style, {
        position: 'absolute', left: '0', top: '0',
        width: `${SIZE}px`, height: `${SIZE}px`,
        imageRendering: 'pixelated', zIndex: '2'
      });
      flat.src = pngA;
      flat.onerror = ()=>{ flat.onerror = null; flat.src = pngB; };
      container.appendChild(flat);
      return;
    }

    // Expecting OpenSea-style: attributes: [{trait_type, value}, ...]
    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
    let z = 2;
    for (const rec of attrs){
      const attr = String(rec.trait_type || rec.traitType || '').trim();
      const val  = String(rec.value).trim();
      if (!attr || val == null) continue;

      const layer = makeLayerImg(attr, val, SIZE);
      layer.style.zIndex = String(z++);
      container.appendChild(layer);
      attachLiftHandlers(layer);
    }
  }

  // ---------- activity selection ----------
  function selectCurrentlyStakedFromActivities(activities){
    const seenThisPage = new Set();
    const out = [];

    for (const a of activities){
      const tok = a?.token?.tokenId;
      if (!tok) continue;
      const id = Number(tok);
      if (!Number.isFinite(id)) continue;
      if (seenThisPage.has(id)) continue;
      seenThisPage.add(id);

      const to   = (a?.toAddress   || '').toLowerCase();
      const from = (a?.fromAddress || '').toLowerCase();

      if (from === CONTROLLER){ ST.blockedIds.add(id); continue; } // outbound ⇒ not staked

      if (to === CONTROLLER && !ST.blockedIds.has(id) && !ST.acceptedIds.has(id)){
        const since = a?.createdAt ? new Date(a.createdAt)
                    : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        out.push({ id, staker: a?.fromAddress || null, since });
        ST.acceptedIds.add(id);
      }
    }

    // Oldest -> newest for the page (ascending by time)
    out.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return ta - tb;
    });
    return out;
  }

  async function fetchActivitiesPage(continuation){
    const qs = new URLSearchParams({
      users: CONTROLLER,
      collection: COLLECTION,
      types: 'transfer',
      limit: String(PAGE_SIZE)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${API}?${qs.toString()}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`Reservoir activity ${res.status}`);
    const json = await res.json();
    return { activities: json?.activities || [], continuation: json?.continuation || '' };
  }

  async function fetchNextPage(){
    const cont = ST.nextContinuation || '';
    const { activities, continuation } = await fetchActivitiesPage(cont);
    const rows = selectCurrentlyStakedFromActivities(activities);
    ST.pages.push({ rows, contIn: ST.nextContinuation || null, contOut: continuation || null });
    ST.nextContinuation = continuation || '';
    return true;
  }

  async function prefetchInitialPages(n=3){
    for (let i=0; i<n; i++){
      const ok = await fetchNextPage();
      if (!ok || !ST.nextContinuation) break;
    }
  }

  function renderPage(){
    ul.innerHTML = '';

    if (!ST.pages.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs are currently staked.</div>`;
      ul.appendChild(li);
      ensurePager().innerHTML = '';
      return;
    }

    // Translate current store index to display order (oldest->newest)
    const dispIdx = displayIdxFromStore(ST.page);
    const storeIdx = storeIdxFromDisplay(dispIdx);
    const page = ST.pages[storeIdx];
    const rows = page?.rows || [];

    if (!rows.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs on this page.</div>`;
      ul.appendChild(li);
    } else {
      rows.forEach(r=>{
        const rank = RANKS?.[String(r.id)] ?? null;

        const li = document.createElement('li');
        li.className = 'list-item';

        // Left: layered 128x128
        const left = mk('div', {}, {
          width:'128px', height:'128px', minWidth:'128px', minHeight:'128px'
        });
        li.appendChild(left);
        buildFrog128(left, r.id);

        // Middle: text block
        const mid = mk('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${r.id}</b> ${pillRank(rank)}
          </div>
          <div class="muted">Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}</div>`;
        li.appendChild(mid);

        // Right: tag
        const right = mk('div', { className:'price', textContent:'Staked' });
        li.appendChild(right);

        ul.appendChild(li);
      });
    }

    renderPager();
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      if (!CFG.FROG_API_KEY) {
        ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key. Set <code>FROG_API_KEY</code> in config.js.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // load ranks (optional)
      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      // reset state
      ST.pages = [];
      ST.page = 0; // (newest-first internals)
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      // prefetch first 3 pages so pager shows: [1] [2] [3] …
      await prefetchInitialPages(3);

      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // Start by showing the OLDEST among the preloaded pages
      ST.page = ST.pages.length - 1;
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
      ensurePager().innerHTML = '';
    }
  }

  // autorun & expose
  loadPond();
  window.FF_reloadPond = loadPond;

})(window.FF, window.FF_CFG);
