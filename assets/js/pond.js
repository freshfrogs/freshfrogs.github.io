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
  const TILE_SIZE  = 128; // render size for pond thumbnails

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  // ---------- state ----------
  const ST = {
    pages: [],                 // [{ rows: [{id, staker, since}], contIn, contOut }]
    page: 0,
    nextContinuation: '',      // for next fetch
    blockedIds: new Set(),     // tokens that later left controller
    acceptedIds: new Set()     // dedupe accepted across pages
  };

  let RANKS = null;

  // ---------- small helpers ----------
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

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';

    // numbered buttons for fetched pages
    ST.pages.forEach((_, i)=>{
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(i+1);
      if (i === ST.page) btn.classList.add('btn-solid');
      btn.addEventListener('click', ()=>{
        if (ST.page !== i){
          ST.page = i;
          renderPage();
        }
      });
      nav.appendChild(btn);
    });

    // ellipsis "…" to fetch more, if continuation exists
    if (ST.nextContinuation){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-ghost btn-sm';
      moreBtn.setAttribute('aria-label', 'Load more pages');
      moreBtn.title = 'Load more';
      moreBtn.textContent = '…'; // U+2026 ellipsis
      moreBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          ST.page = ST.pages.length - 1; // jump to the new page
          renderPage();
        }
      });
      nav.appendChild(moreBtn);
    }
  }

  // ---------- layered frog (128×128) with bg + hover lift ----------
  const NO_ANIM_ATTRS  = new Set(['Hat','Frog','Trait']);                 // never use GIF for these
  const NO_HOVER_ATTRS = new Set(['Frog','Trait','SpecialFrog']);         // never lift these

  function enc(v){ return encodeURIComponent(String(v)); }

  // Builds a 128×128 node with:
  //  - massive-bg <img> from ./frog/{id}.png (zoomed & offset so only bg color shows)
  //  - ordered layers from frog/json/{id}.json using /frog/build_files/{ATTRIBUTE}/{VALUE}.png
  //  - optional GIF at /frog/build_files/{ATTRIBUTE}/animations/{VALUE}_animation.gif
  async function buildLayeredFrog(id, size=TILE_SIZE){
    const stage = document.createElement('div');
    stage.style.position = 'relative';
    stage.style.width    = size+'px';
    stage.style.height   = size+'px';
    stage.style.borderRadius = '8px';
    stage.style.overflow = 'hidden';
    stage.style.background = 'transparent';
    stage.style.imageRendering = 'pixelated';

    // Background trick using the original static PNG (zoom + push down/left)
    // This makes only the original background color visible.
    const bg = document.createElement('img');
    bg.src = `./frog/${id}.png`;
    bg.alt = '';
    bg.style.position = 'absolute';
    bg.style.pointerEvents = 'none';
    bg.style.imageRendering = 'pixelated';
    // Zoom a LOT and push down/left. Tuned so frog artwork is off-stage.
    const ZOOM = 8; // 8× the canvas
    bg.style.width  = (size*ZOOM)+'px';
    bg.style.height = (size*ZOOM)+'px';
    // push left (negative) and down (positive)
    bg.style.left = (-size*3)+'px';
    bg.style.top  = ( size*3)+'px';
    bg.style.opacity = '1';
    stage.appendChild(bg);

    // Foreground layers (ordered)
    let meta;
    try {
      meta = await FF.fetchJSON(`./frog/json/${id}.json`);
    } catch {
      // fallback to just show the flat PNG if metadata missing
      const flat = document.createElement('img');
      flat.src = `./frog/${id}.png`;
      flat.alt = `Frog #${id}`;
      flat.style.position='absolute';
      flat.style.inset='0';
      flat.style.width='100%';
      flat.style.height='100%';
      flat.style.imageRendering='pixelated';
      stage.appendChild(flat);
      return stage;
    }

    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];

    // mouse hover lift: gentle, smooth, up & left for allowed attrs only
    function applyLift(on){
      const lift = on ? 'translate(-10px, -12px)' : 'translate(0,0)';
      layerImgs.forEach(img=>{
        if (!img.dataset.attr) return;
        if (NO_HOVER_ATTRS.has(img.dataset.attr)) return;
        img.style.transform = lift;
      });
    }
    stage.addEventListener('mouseenter', ()=>applyLift(true));
    stage.addEventListener('mouseleave', ()=>applyLift(false));

    const layerImgs = [];
    for (const a of attrs){
      const attr  = (a?.trait_type ?? a?.traitType ?? a?.attribute ?? '').toString();
      const value = (a?.value ?? '').toString();
      if (!attr || !value) continue;

      // Animation decision
      const tryGif = !NO_ANIM_ATTRS.has(attr);
      const gifSrc = `/frog/build_files/${enc(attr)}/animations/${enc(value)}_animation.gif`;
      const pngSrc = `/frog/build_files/${enc(attr)}/${enc(value)}.png`;

      const img = document.createElement('img');
      img.dataset.attr = attr;
      img.alt = '';
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top  = '0';
      img.style.width = size+'px';
      img.style.height= size+'px';
      img.style.imageRendering = 'pixelated';
      img.style.transition = 'transform 220ms cubic-bezier(.22,.61,.36,1)';

      if (tryGif){
        img.src = gifSrc;
        img.onerror = ()=>{ img.onerror=null; img.src = pngSrc; };
      } else {
        img.src = pngSrc;
      }

      stage.appendChild(img);
      layerImgs.push(img);
    }

    return stage;
  }

  // ---------- UI render ----------
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

    const page = ST.pages[ST.page];
    const rows = page?.rows || [];

    if (!rows.length){
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="muted">No frogs on this page.</div>`;
      ul.appendChild(li);
    } else {
      rows.forEach(async r=>{
        const rank = RANKS?.[String(r.id)] ?? null;

        const li = document.createElement('li'); 
        li.className = 'list-item';

        // left: layered frog 128×128 (with background trick + hover lift)
        const thumbWrap = document.createElement('div');
        thumbWrap.style.width = TILE_SIZE+'px';
        thumbWrap.style.height= TILE_SIZE+'px';
        thumbWrap.style.minWidth = TILE_SIZE+'px';
        thumbWrap.style.minHeight= TILE_SIZE+'px';
        thumbWrap.style.borderRadius = '8px';
        thumbWrap.style.overflow = 'hidden';

        // build & append layered frog
        buildLayeredFrog(r.id, TILE_SIZE).then(node=>{
          thumbWrap.appendChild(node);
        }).catch(()=>{
          // fail-soft to flat PNG
          const flat = document.createElement('img');
          flat.src = `./frog/${r.id}.png`;
          flat.alt = `Frog #${r.id}`;
          flat.className = 'thumb128';
          thumbWrap.appendChild(flat);
        });

        const leftCol = document.createElement('div');
        leftCol.appendChild(thumbWrap);

        // mid: text
        const mid = document.createElement('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${r.id}</b> ${pillRank(rank)}
          </div>
          <div class="muted">Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}</div>`;

        // right: status
        const right = document.createElement('div');
        right.className = 'price';
        right.textContent = 'Staked';

        // assemble
        li.appendChild(leftCol);
        li.appendChild(mid);
        li.appendChild(right);
        ul.appendChild(li);
      });
    }

    renderPager();
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

    // keep newest → older (you said no need to invert)
    out.sort((a,b)=>{
      const ta = a.since ? a.since.getTime() : 0;
      const tb = b.since ? b.since.getTime() : 0;
      return tb - ta;
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
    let cont = ST.nextContinuation || '';
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
      ST.page = 0;
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      // prefetch first 3 pages so pager shows: [1] [2] [3] […]
      await prefetchInitialPages(3);

      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

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
