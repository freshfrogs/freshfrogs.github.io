// assets/js/pond.js
(function(FF, CFG){
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const API = 'https://api.reservoir.tools/users/activity/v6';
  const OWNERS_API = 'https://api.reservoir.tools/owners/v2';
  const TOKENS_API = 'https://api.reservoir.tools/users'; // /{addr}/tokens/v8
  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE  = 20;
  const PREFETCH_PAGES = 3;

  function apiHeaders(){
    if (!CFG.FROG_API_KEY) throw new Error('Missing FROG_API_KEY in config.js');
    return { accept: '*/*', 'x-api-key': CFG.FROG_API_KEY };
  }

  const shorten = (s)=> (FF && FF.shorten) ? FF.shorten(s) :
    (s ? (s.slice(0,6)+'…'+s.slice(-4)) : '—');

  // ---------- resilient fetch ----------
  async function reservoirFetch(url, opts={}, retries=3, timeoutMs=9000){
    for (let i=0; i<=retries; i++){
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(new DOMException('Timeout')), timeoutMs);
      try{
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        clearTimeout(t);
        if (res.status === 429 && i < retries){
          const ra = Number(res.headers.get('retry-after')) || (1 << i);
          await new Promise(r=>setTimeout(r, ra * 1000));
          continue;
        }
        if (!res.ok){
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
    pages: [],
    page: 0,
    nextContinuation: '',
    blockedIds: new Set(),
    acceptedIds: new Set(),
    stats: { total: null, updatedAt: null }
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
      Object.assign(nav.style, { marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center' });
      nav.className = 'row';
      wrap.appendChild(nav);
    }
    return nav;
  }

  const storeIdxFromDisplay = (dispIdx)=> (ST.pages.length - 1 - dispIdx);
  const displayIdxFromStore = (storeIdx)=> (ST.pages.length - 1 - storeIdx);

  function renderPager(){
    const nav = ensurePager();
    nav.innerHTML = '';
    for (let disp=0; disp<ST.pages.length; disp++){
      const sIdx = storeIdxFromDisplay(disp);
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(disp + 1);
      if (sIdx === ST.page){
        btn.classList.add('btn-solid');
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', ()=>{
        if (ST.page !== sIdx){
          ST.page = sIdx;
          renderPage();
        }
      });
      nav.appendChild(btn);
    }
    if (ST.nextContinuation){
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-ghost btn-sm';
      moreBtn.setAttribute('aria-label', 'Load more pages');
      moreBtn.title = 'Load more';
      moreBtn.textContent = '…';
      moreBtn.addEventListener('click', async ()=>{
        const ok = await fetchNextPage();
        if (ok){
          ST.page = ST.pages.length - 1;
          renderPage();
          renderStatsBar?.();
        }
      });
      nav.appendChild(moreBtn);
    }
  }

  // ---------- background (flat PNG zoom for bg-color) ----------
  function pickBestBgUrl(id){
    const local = `frog/${id}.png`;
    const leading = `/frog/${id}.png`;
    const cfg = (CFG.SOURCE_PATH ? `${CFG.SOURCE_PATH}/frog/${id}.png` : local);
    return [local, leading, cfg];
  }

  async function applyFrogBackground(container, tokenId){
    Object.assign(container.style, {
      backgroundRepeat: 'no-repeat',
      backgroundSize: '2000% 2000%',
      backgroundPosition: '100% 100%',
      imageRendering: 'pixelated'
    });
    const urls = pickBestBgUrl(tokenId);
    for (const url of urls){
      const ok = await new Promise(resolve=>{
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = ()=>{
          try{
            const c = document.createElement('canvas');
            c.width = 2; c.height = 2;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 2, 2);
            const d = ctx.getImageData(0,0,1,1).data;
            container.style.backgroundColor = `rgba(${d[0]},${d[1]},${d[2]},${(d[3]||255)/255})`;
          }catch{}
          container.style.backgroundImage = `url('${url}')`;
          resolve(true);
        };
        img.onerror = ()=>resolve(false);
        img.src = url;
      });
      if (ok) return true;
    }
    container.style.backgroundColor = '#151a1e';
    container.style.backgroundImage = 'none';
    return false;
  }

  // ---------- frog renderer (layered 128) ----------
  const NO_ANIM_FOR = new Set(['Hat','Frog','Trait']);
  const NO_LIFT_FOR = new Set(['Frog','Trait','SpecialFrog']);

  function mk(tag, props={}, style={}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, style);
    return el;
  }
  function safe(part){ return encodeURIComponent(part); }

  function makeLayerImg(attr, value, sizePx){
    const allowAnim = !NO_ANIM_FOR.has(attr);
    const base = `/frog/build_files/${safe(attr)}`;
    const png  = `${base}/${safe(value)}.png`;
    const gif  = `${base}/animations/${safe(value)}_animation.gif`;

    const img = new Image();
    img.decoding = 'async';
    img.loading = 'lazy';
    img.dataset.attr = attr;
    Object.assign(img.style, {
      position:'absolute', left:'0', top:'0',
      width:`${sizePx}px`, height:`${sizePx}px`,
      imageRendering:'pixelated', zIndex:'2',
      transition:'transform 280ms cubic-bezier(.22,.61,.36,1)'
    });

    if (allowAnim){
      img.src = gif;
      img.onerror = ()=>{ img.onerror = null; img.src = png; };
    } else {
      img.src = png;
    }

    if (!NO_LIFT_FOR.has(attr)){
      img.addEventListener('mouseenter', ()=>{
        img.style.transform = 'translate(-8px, -12px)';
        img.style.filter = 'drop-shadow(0 5px 0 rgba(0,0,0,.45))';
      });
      img.addEventListener('mouseleave', ()=>{
        img.style.transform = 'translate(0, 0)';
        img.style.filter = 'none';
      });
    }

    return img;
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
      imageRendering: 'pixelated'
    });
    await applyFrogBackground(container, tokenId);

    const metaUrl = `frog/json/${tokenId}.json`;
    try{
      const meta = await FF.fetchJSON(metaUrl);
      const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
      for (const rec of attrs){
        const attr = String(rec.trait_type || rec.traitType || '').trim();
        const val  = String(rec.value).trim();
        if (!attr || !val) continue;
        const layer = makeLayerImg(attr, val, SIZE);
        container.appendChild(layer);
      }
    }catch{
      const [url] = pickBestBgUrl(tokenId);
      const flat = new Image();
      flat.decoding = 'async';
      flat.loading  = 'lazy';
      Object.assign(flat.style, {
        position:'absolute', inset:'0', width:`${SIZE}px`, height:`${SIZE}px`,
        imageRendering:'pixelated', zIndex:'2'
      });
      flat.src = url;
      container.appendChild(flat);
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

      if (from === CONTROLLER){ ST.blockedIds.add(id); continue; }
      if (to === CONTROLLER && !ST.blockedIds.has(id) && !ST.acceptedIds.has(id)){
        const since = a?.createdAt ? new Date(a.createdAt)
                    : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        out.push({ id, staker: a?.fromAddress || null, since });
        ST.acceptedIds.add(id);
      }
    }

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

        const li = mk('li', { className:'list-item' });

        // Left: layered 128×128
        const left = mk('div', {}, { width:'128px', height:'128px', minWidth:'128px', minHeight:'128px' });
        li.appendChild(left);
        buildFrog128(left, r.id);

        // Middle: title + subtitle + compact actions (same style as Owned)
        const mid = mk('div');
        const header = mk('div', {}, { display:'flex', alignItems:'center', gap:'8px' });
        header.innerHTML = `<b>Frog #${r.id}</b> ${pillRank(rank)}`;
        mid.appendChild(header);

        const sub = mk('div', { className:'muted', textContent:`Staked ${fmtAgo(r.since)} • Staker ${r.staker ? shorten(r.staker) : '—'}` });
        mid.appendChild(sub);

        const actions = mk('div', {}, { marginTop:'6px', display:'flex', flexWrap:'wrap', gap:'6px' });

        const more = mk('button', { className:'btn btn-ghost btn-xs', textContent:'More info' });
        more.setAttribute('data-open-modal','');
        more.setAttribute('data-token-id', String(r.id));
        more.setAttribute('data-owner', r.staker || '');
        more.setAttribute('data-staked', 'true');
        actions.appendChild(more);

        const os = mk('a', { className:'btn btn-ghost btn-xs', target:'_blank', rel:'noopener', textContent:'OpenSea' });
        os.href = `https://opensea.io/assets/ethereum/${COLLECTION}/${r.id}`;
        actions.appendChild(os);

        const es = mk('a', { className:'btn btn-ghost btn-xs', target:'_blank', rel:'noopener', textContent:'Etherscan' });
        es.href = `https://etherscan.io/token/${COLLECTION}?a=${r.id}`;
        actions.appendChild(es);

        mid.appendChild(actions);
        li.appendChild(mid);

        // No separate right column; keep cards compact
        ul.appendChild(li);
      });
    }

    renderPager();
  }

  // ---------- Pond stats ----------
  function setBasicStatLinks(){
    const ctlA = document.getElementById('statController');
    const colA = document.getElementById('statCollection');
    if (ctlA){
      ctlA.href = `https://etherscan.io/address/${CFG.CONTROLLER_ADDRESS}`;
      ctlA.textContent = shorten(CONTROLLER);
    }
    if (colA){
      colA.href = `https://etherscan.io/address/${CFG.COLLECTION_ADDRESS}`;
      colA.textContent = shorten((CFG.COLLECTION_ADDRESS||'').toLowerCase());
    }
  }

  async function fetchTotalStakedViaOwners(){
    let cont = '';
    for (let guard=0; guard<30; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION });
      if (cont) qs.set('continuation', cont);
      const url = `${OWNERS_API}?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      const owners = json?.owners || [];
      const hit = owners.find(o => (o?.address || '').toLowerCase() === CONTROLLER);
      if (hit){
        const n = Number(hit?.ownership?.tokenCount ?? 0);
        return Number.isFinite(n) ? n : 0;
      }
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return null;
  }

  async function fetchTotalStakedViaTokens(){
    let cont = ''; let total = 0;
    for (let guard=0; guard<40; guard++){
      const qs = new URLSearchParams({ collection: COLLECTION, limit:'200', includeTopBid:'false' });
      if (cont) qs.set('continuation', cont);
      const url = `${TOKENS_API}/${CONTROLLER}/tokens/v8?${qs.toString()}`;
      const json = await reservoirFetch(url, { headers: apiHeaders() });
      total += (json?.tokens || []).length;
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return total;
  }

  async function fetchTotalStaked(){
    const a = await fetchTotalStakedViaOwners();
    if (a !== null) return a;
    return await fetchTotalStakedViaTokens();
  }

  function renderStatsBar(){
    const totalEl   = document.getElementById('statTotal');
    const updatedEl = document.getElementById('statUpdated');
    if (totalEl){
      const n = ST.stats.total;
      totalEl.textContent = (n==null) ? '—' : `${n.toLocaleString()} frogs`;
    }
    if (updatedEl){
      updatedEl.textContent = ST.stats.updatedAt
        ? new Date(ST.stats.updatedAt).toLocaleString()
        : '—';
    }
  }

  async function refreshStats(){
    setBasicStatLinks();
    try{
      const total = await fetchTotalStaked();
      ST.stats.total = total;
      ST.stats.updatedAt = Date.now();
    }catch(e){
      console.warn('Pond stats failed', e);
      ST.stats.total = null;
      ST.stats.updatedAt = null;
    }
    renderStatsBar();
  }

  // ---------- main ----------
  async function loadPond(){
    try{
      if (!CFG.FROG_API_KEY) {
        ul.innerHTML = `<li class="list-item"><div class="muted">Missing Reservoir API key. Set <code>FROG_API_KEY</code> in config.js.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      try { RANKS = await FF.fetchJSON('assets/freshfrogs_rank_lookup.json'); }
      catch { RANKS = {}; }

      ST.pages = [];
      ST.page = 0;
      ST.nextContinuation = '';
      ST.blockedIds = new Set();
      ST.acceptedIds = new Set();

      await refreshStats();
      await prefetchInitialPages();

      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
        ensurePager().innerHTML = '';
        return;
      }

      ST.page = ST.pages.length - 1;
      renderPage();
    }catch(e){
      console.warn('Pond load failed', e);
      if (!ST.pages.length){
        ul.innerHTML = `<li class="list-item"><div class="muted">Failed to load the pond.</div></li>`;
        ensurePager().innerHTML = '';
      }
    }
  }

  loadPond();
  window.FF_reloadPond = loadPond;

  const refreshBtn = document.getElementById('refreshPond');
  if (refreshBtn){
    refreshBtn.addEventListener('click', async ()=>{
      refreshBtn.disabled = true;
      try { await loadPond(); } finally { refreshBtn.disabled = false; }
    });
  }
})(window.FF, window.FF_CFG);
