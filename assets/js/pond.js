// assets/js/pond.js
(function (FF, CFG) {
  const wrap = document.getElementById('pondListWrap');
  const ul   = document.getElementById('pondList');
  if (!wrap || !ul) return;

  // ---------- config ----------
  const API          = 'https://api.reservoir.tools/users/activity/v6';
  const OWNERS_API   = 'https://api.reservoir.tools/owners/v2';
  const TOKENS_API   = 'https://api.reservoir.tools/users'; // /{addr}/tokens/v8
  const CONTROLLER   = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION   = CFG.COLLECTION_ADDRESS || '';
  const PAGE_SIZE    = 20;
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
        if (!res.ok) throw new Error('HTTP '+res.status);
        return await res.json();
      }catch(e){
        clearTimeout(t);
        if (i===retries) throw e;
        await new Promise(r=> setTimeout(r, 300*(i+1)));
      }
    }
  }

  // time helpers
  const fmtAgo = (d)=> {
    const ms = (d instanceof Date) ? (Date.now() - d.getTime()) : +d;
    const days = Math.floor(ms/86400000);
    return isFinite(days) ? `${days}d ago` : '—';
  };

  // minimal element maker
  function mk(tag, attrs={}, style={}){
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    Object.assign(el.style, style);
    return el;
  }

  // thumbnails
  function flatThumb64(el, id){
    const src = FF?.imageUrl ? FF.imageUrl(id, 128) : (CFG.IMAGE_BASE ? `${CFG.IMAGE_BASE}/${id}.png` : '');
    el.innerHTML = `<img width="64" height="64" loading="lazy" style="image-rendering:pixelated" src="${src}" alt="#${id}">`;
  }

  // simple rank lookup if available
  function rankBadge(id){
    try{
      const r = (FF && FF.ranks && FF.ranks.lookup && FF.ranks.lookup[id]) || null;
      return r ? `<span class="pill">Rank #${r.rank}</span>` : '';
    }catch(e){ return ''; }
  }

  // ---------- pagination state ----------
  let state = {
    page: 0,
    items: [],         // {id, staker, since:Date}
    loading: false,
    done: false
  };

  // ---------- fetch pond page ----------
  async function fetchPondPage(page=0){
    const out = [];
    let cont = '';
    for (let guard=0; guard<PREFETCH_PAGES; guard++){
      const qs = new URLSearchParams({ users: CFG.CONTROLLER_ADDRESS, collection: COLLECTION, types:'transfer', limit:String(PAGE_SIZE) });
      if (cont) qs.set('continuation', cont);
      const json = await reservoirFetch(`${API}?${qs.toString()}`, { headers: apiHeaders() });
      const acts = json?.activities || [];
      for (const a of acts){
        const from = String(a?.fromAddress||'').toLowerCase();
        // controller -> user (unstake) isn't a stake, skip
        if (from === CONTROLLER) continue;
        const to = String(a?.toAddress||'').toLowerCase();
        if (to !== CONTROLLER) continue;
        const id = Number(a?.token?.tokenId);
        if (!Number.isFinite(id)) continue;
        const since = a?.createdAt ? new Date(a.createdAt) : (a?.timestamp ? new Date(a.timestamp*1000) : null);
        const staker = String(a?.fromAddress||'') ? String(a.fromAddress) : '';
        out.push({ id, staker, since });
      }
      cont = json?.continuation || '';
      if (!cont) break;
    }
    return out;
  }

  // ---------- render ----------
  async function render(page=0){
    if (state.loading || state.done) return;
    state.loading = true;
    try{
      const rows = await fetchPondPage(page);
      if (!rows.length) { state.done = true; return; }

      rows.forEach(r=>{
        const li = mk('li', { className:'list-item', tabIndex:0, role:'button' });
        // Make the whole row open the modal
        li.setAttribute('data-open-modal','');
        li.setAttribute('data-token-id', String(r.id));
        li.setAttribute('data-owner', r.staker || '');
        li.setAttribute('data-staked', 'true');
        if (r.since instanceof Date) li.setAttribute('data-since', String(r.since.getTime()));

        // Left: 64×64 still image
        const left = mk('div', {}, {
          width:'64px', height:'64px', minWidth:'64px', minHeight:'64px'
        });
        li.appendChild(left);
        flatThumb64(left, r.id);

        // Middle: text block
        const mid = mk('div');
        mid.innerHTML =
          `<div style="display:flex;align-items:center;gap:8px;">
             <strong>Frog #${r.id}</strong>
             ${rankBadge(r.id)}
           </div>
           <div class="muted">Staked ${fmtAgo(r.since)} • Owned by ${r.staker ? shorten(r.staker) : '—'}</div>`;
        li.appendChild(mid);

        // No right column (keeps row compact)
        ul.appendChild(li);
      });
    }finally{
      state.loading = false;
    }

    renderPager();
  }

  // ---------- Pond stats ----------
  function setBasicStatLinks(){
    const ctlA = document.getElementById('statController');
    const colA = document.getElementById('statCollection');
    if (ctlA) ctlA.href = `https://etherscan.io/address/${CFG.CONTROLLER_ADDRESS}`;
    if (colA) colA.href = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}`;
  }

  function renderPager(){
    // (optional UI for next page; left minimal to keep drop-in)
  }

  // init
  setBasicStatLinks();
  render(0);

})(window.FF || (window.FF={}), window.FF_CFG);
