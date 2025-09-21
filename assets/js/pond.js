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
    page: 0,
    nextContinuation: '',      // for next fetch
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

  // ---------- layered 128px thumbnail (animations allowed except Frog/Hat) ----------
  async function renderLayeredThumb128(hostEl, tokenId){
    const size = 128;
    const metaUrl  = `frog/json/${tokenId}.json`; // << corrected
    const baseDir  = 'frog/build_files';          // << corrected

    // container styles (inline to avoid css edits)
    hostEl.style.position = 'relative';
    hostEl.style.width = `${size}px`;
    hostEl.style.height = `${size}px`;
    hostEl.style.minWidth = `${size}px`;
    hostEl.style.minHeight = `${size}px`;
    hostEl.style.borderRadius = '8px';
    hostEl.style.overflow = 'hidden';
    hostEl.style.background = 'transparent';
    hostEl.style.imageRendering = 'pixelated';

    const ANIM_FORBIDDEN = new Set(['Frog','Hat']); // animations off for these groups
    function addLayer(group, value){
      const tryAnim = !ANIM_FORBIDDEN.has(group);
      const pngSrc  = `${baseDir}/${group}/${value}.png`;
      const gifSrc  = `${baseDir}/${group}/animations/${value}_animation.gif`;

      const img = new Image();
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.imageRendering = 'pixelated';
      img.decoding = 'async';
      img.loading = 'lazy';

      if (tryAnim){
        img.src = gifSrc;
        img.onerror = ()=>{ img.onerror=null; img.src = pngSrc; };
      } else {
        img.src = pngSrc;
      }
      hostEl.appendChild(img);
    }

    try{
      const meta = await FF.fetchJSON(metaUrl);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const a of attrs){
        const group = a?.trait_type ?? a?.traitType ?? a?.type ?? '';
        const value = a?.value ?? a?.trait_value ?? '';
        if (!group || !value) continue;
        addLayer(String(group), String(value));
      }
    }catch{
      // fallback to plain png if metadata missing
      const img = new Image();
      img.src = `frog/${tokenId}.png`; // << corrected fallback
      img.alt = `Frog ${tokenId}`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.imageRendering = 'pixelated';
      hostEl.appendChild(img);
    }
  }

  // tiny helper so we can call async without awaiting in a loop
  function awaitable(p){ Promise.resolve(p).catch(()=>{}); }

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
      rows.forEach(r=>{
        const rank = RANKS?.[String(r.id)] ?? null;

        const li = document.createElement('li');
        li.className = 'list-item';

        // left: layered 128
        const thumb = document.createElement('div');
        awaitable(renderLayeredThumb128(thumb, r.id));
        li.appendChild(thumb);

        // middle: text
        const mid = document.createElement('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
             <b>Frog #${r.id}</b> ${pillRank(rank)}
           </div>
           <div class="muted">Staked ${fmtAgo(r.since)} • Staker ${r.staker ? FF.shorten(r.staker) : '—'}</div>`;
        li.appendChild(mid);

        // right: tag
        const right = document.createElement('div');
        right.className = 'price';
        right.textContent = 'Staked';
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

    // oldest -> newest (ascending)
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
