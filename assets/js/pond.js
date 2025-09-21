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
  const PREFETCH_PAGES = 3;

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- resilient fetch (timeout + retries + 429 handling) ----------
  async function reservoirFetch(url, opts={}, retries=3, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);

        // 429 backoff
        if (res.status === 429 && i < retries){
          const ra = Number(res.headers.get('retry-after')) || (1 << i);
          await new Promise(r=>setTimeout(r, ra * 1000));
          continue;
        }
        if (!res.ok){
          // Non-OK: retry a couple times, then throw
          if (i < retries){
            await new Promise(r=>setTimeout(r, (300 + Math.random()*300) * (i+1)));
            continue;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      }catch(err){
        clearTimeout(t);
        if (i === retries) throw err;
        await new Promise(r=>setTimeout(r, (350 + Math.random()*300) * (i+1)));
      }
    }
  }

  // ---------- state ----------
  const ST = {
    pages: [],                 // [{ rows: [{id, staker, since}], contIn, contOut }]
    page: 0,                   // internal store index (newest-first)
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

  // We fetch pages newest->older, but DISPLAY oldest->newest.
  const storeIdxFromDisplay = (dispIdx)=> (ST.pages.length - 1 - dispIdx);
  const displayIdxFromStore = (storeIdx)=> (ST.pages.length - 1 - storeIdx);

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    // Buttons in display order (oldest -> newest)
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
      moreBtn.textContent = '…';
      moreBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          // Jump to the new OLDEST page (highest store index)
          ST.page = ST.pages.length - 1;
          renderPage();
        }
      });
      nav.appendChild(moreBtn);
    }
  }

  // ---------- frog renderer (128x128 layered, bg trick, hover lift) ----------
  const NO_ANIM_FOR = new Set(['Frog', 'Trait', 'SpecialFrog']);

  function mk(tag, props={}, style={}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }
  function safePath(part){ return encodeURI(part).replace(/%20/g, ' '); }

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

    Object.assign(container.style, {
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      minWidth: `${SIZE}px`,
      minHeight: `${SIZE}px`,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '8px',
    });

    // Background trick: use the flat PNG scaled & offset so only bg color shows
    const bg = new Image();
    bg.decoding = 'async';
    bg.loading = 'lazy';
    bg.alt = `Frog #${tokenId} background`;
    Object.assign(bg.style, {
      position: 'absolute',
      left: `-${Math.round(SIZE * 0.35)}px`,
      top:  `${Math.round(SIZE * 0.25)}px`,
      transform: `scale(2.6)`,
      imageRendering: 'pixelated',
      zIndex: '0',
      opacity: '1'
    });
    const pngA = `${CFG.SOURCE_PATH ? CFG.SOURCE_PATH : ''}/frog/${tokenId}.png`;
    const pngB = `/frog/${tokenId}.png`;
    bg.src = pngA;
    bg.onerror = ()=>{ bg.onerror = null; bg.src = pngB; };
    container.appendChild(bg);

    // Layered build from metadata
    const metaUrl = `/frog/json/${tokenId}.json`;
    let meta;
    try {
      meta = await FF.fetchJSON(metaUrl);
    } catch {
      // fallback: flat image
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

    // Oldest -> newest within page
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

    const url = `${API}?${qs.toString()}`;
    const json = await reservoirFetch(url, { headers: apiHeaders() });
    return { activities: json?.activities || [], continuation: json?.continuation || '' };
  }

  async function fetchNextPage(){
    const cont = ST.nextContinuation || '';
    try{
      const { activities, continuation } = await fetchActivitiesPage(cont);
      const rows = selectCurrentlyStakedFromActivities(activities);
      ST.pages.push({ rows, contIn: ST.nextContinuation || null, contOut: continuation || null });
      ST.nextContinuation = continuation || '';
      return true;
    }catch(err){
      console.warn('Pond: page fetch failed', err);
      // keep UI usable; do not throw—just report failure to caller
      return false;
    }
  }

  async function prefetchInitialPages(n=PREFETCH_PAGES){
    for (let i=0; i<n; i++){
      const ok = await fetchNextPage();
      if (!ok) break;
      if (!ST.nextContinuation) break;
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
      ST.page = 0; // newest-first internal index
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      // prefetch first N pages
      await prefetchInitialPages();

      if (!ST.pages.length){
        // If nothing loaded at all, show a soft message instead of a hard failure
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      // Show the OLDEST of the preloaded pages first
      ST.page = ST.pages.length - 1;
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      // leave any partial content if present
      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
        ensurePager().innerHTML = '';
      }
    }
  }

  // autorun & expose
  loadPond();
  window.FF_reloadPond = loadPond;

})(window.FF, window.FF_CFG);
