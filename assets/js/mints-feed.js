// assets/js/mints-feed.js
// Recent Mints only — Reservoir + your FF helpers (Etherscan links + scroll)
(function (FF, CFG) {
  const UL_ID = 'recentMints';
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = `${BASE}/collections/activity/v6`;
  const PAGE  = Math.max(1, Number(CFG.PAGE_SIZE || 20)); // fetch up to 20; we show ~5 visible (scrollable)

  function need(k){ if(!CFG[k]) throw new Error(`[mints] Missing FF_CFG.${k}`); return CFG[k]; }
  const API_KEY    = need('FROG_API_KEY');
  const COLLECTION = need('COLLECTION_ADDRESS');
  const CHAIN_ID   = Number(CFG.CHAIN_ID || 1);

  const HDR      = { accept: 'application/json', 'x-api-key': API_KEY };
  const shorten  = (a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago      = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '';
  const imgFor   = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;

  // Etherscan tx URL (supports custom explorer base)
  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return `${CFG.ETHERSCAN_TX_BASE.replace(/\/+$/,'')}/${hash}`;
    const base =
      CHAIN_ID === 1        ? 'https://etherscan.io/tx/' :
      CHAIN_ID === 11155111 ? 'https://sepolia.etherscan.io/tx/' :
      CHAIN_ID === 5        ? 'https://goerli.etherscan.io/tx/' :
                              'https://etherscan.io/tx/';
    return base + hash;
  }

  function ul(){
    const root = document.getElementById(UL_ID);
    if (root) root.classList.add('scrolling'); // enable scroll styling (~5 rows visible)
    return root;
  }

  async function reservoirFetch(url){
    const res = await fetch(url, { headers: HDR });
    if (!res.ok){
      let body = '';
      try { body = await res.text(); } catch {}
      const err = new Error(`HTTP ${res.status}${body ? ` — ${body}` : ''}`);
      err.url = url; throw err;
    }
    return res.json();
  }

  // Normalize activity -> only mints
  function mapRow(a){
    const tokenId = Number(a?.token?.tokenId);
    if (!Number.isFinite(tokenId)) return null;

    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';

    // Only keep events that are mints:
    // - Explicit type 'mint'
    // - Or transfer where 'from' is zero address (some backfills label as transfer)
    const reportedType = (a?.type || '').toLowerCase();
    const isMint = (reportedType === 'mint') || (from === zero);

    if (!isMint) return null;

    // Timestamp
    const ts = a?.timestamp ?? a?.createdAt;
    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string') { const p = Date.parse(ts); if (!Number.isNaN(p)) dt = new Date(p); }

    const txHash = a?.txHash || a?.transactionHash || null;

    return {
      id: tokenId,
      from: a?.fromAddress || null,
      to:   a?.toAddress   || null,
      time: dt,
      img:  imgFor(tokenId),
      tx:   txHash
    };
  }

  async function fetchMints(limit = PAGE){
    // Ask Reservoir for activity; include types=mint to reduce payload.
    // We still guard with mapRow() for cases where a mint is reported as a zero-address transfer.
    const qs = new URLSearchParams({
      collection: COLLECTION,
      limit: String(Math.min(50, Math.max(1, limit))),
      types: 'mint'
    });
    const url = `${API}?${qs.toString()}`;
    const json = await reservoirFetch(url);
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    // newest first
    return rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
  }

  function render(items){
    const root = ul(); if (!root) return;
    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = `<li class="row"><div class="pg-muted">No recent mints yet.</div></li>`;
      return;
    }
    items.forEach(it=>{
      const meta = [
        it.to ? `→ ${shorten(it.to)}` : null,
        it.time ? ago(it.time) : null
      ].filter(Boolean).join(' • ');

      const li = document.createElement('li');
      li.className = 'row';

      // Click → Etherscan if tx hash exists; else open frog modal
      const href = txUrl(it.tx);
      if (href) {
        li.title = 'View transaction on Etherscan';
        li.addEventListener('click', ()=> window.open(href, '_blank', 'noopener'));
      } else {
        li.addEventListener('click', ()=> FF.openFrogModal?.({ id: it.id }));
      }

      li.innerHTML =
        FF.thumb64(it.img, `Frog ${it.id}`) +
        `<div>
           <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
             <b>Mint</b> • Frog #${it.id}
           </div>
           <div class="pg-muted">${meta}${href ? ' • Etherscan' : ''}</div>
         </div>`;

      root.appendChild(li);
    });
  }

  async function loadAndRender(){
    // Rarity isn’t needed for mints list, but we keep it non-blocking in case you want to add rank later.
    try { await FF.ensureRarity?.(); } catch (e) { /* non-blocking */ }
    try { render(await fetchMints(PAGE)); }
    catch(e){
      console.warn('[mints] failed', e, e.url ? `\nURL: ${e.url}` : '');
      const root = ul(); if (root) root.innerHTML = `<li class="row"><div class="pg-muted">Could not load recent mints.</div></li>`;
    }
  }

  window.FF_loadRecentMints = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
