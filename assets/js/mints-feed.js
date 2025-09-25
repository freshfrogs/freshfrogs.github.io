// assets/js/mints-feed.js
// Recent Mints — scroll to see more (visible rows configurable) + Etherscan links
(function (FF, CFG) {
  const UL_ID = 'recentMints';
  const BASE  = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API   = `${BASE}/collections/activity/v6`;
  const PAGE  = Math.max(1, Number(CFG.PAGE_SIZE || 40)); // fetch a good chunk

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

  function ul(){ return document.getElementById(UL_ID); }

  // Make the UL show exactly N rows, then allow scrolling for the rest
  function applyVisibleRows(root){
    if (!root) return;
    root.classList.add('scrolling');
    root.style.overflowY = 'auto'; // ensure scroll is enabled

    const visible =
      Number(root.getAttribute('data-visible')) ||
      Number(CFG.MINTS_VISIBLE || 5);

    // Need at least one real row in DOM to measure height/gap
    const firstRow = root.querySelector('.row');
    if (!firstRow){ root.style.maxHeight = ''; return; }

    const csUL  = getComputedStyle(root);
    const gap   = parseFloat(csUL.gap || '0') || 0;
    const rowH  = firstRow.getBoundingClientRect().height || 84; // fallback

    const rows  = Math.max(1, visible);
    const maxH  = rowH * rows + gap * (rows - 1);

    root.style.maxHeight = `${Math.round(maxH)}px`;
  }

  async function reservoirFetch(url){
    const res = await fetch(url, { headers: HDR });
    if (!res.ok){
      let body = ''; try { body = await res.text(); } catch {}
      const err = new Error(`HTTP ${res.status}${body ? ` — ${body}` : ''}`);
      err.url = url; throw err;
    }
    return res.json();
  }

  // Only keep mints (or zero-address transfers)
  function mapRow(a){
    const tokenId = Number(a?.token?.tokenId);
    if (!Number.isFinite(tokenId)) return null;

    const from = (a?.fromAddress || '').toLowerCase();
    const zero = '0x0000000000000000000000000000000000000000';
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
      to:   a?.toAddress   || null,
      time: dt,
      img:  imgFor(tokenId),
      tx:   txHash
    };
  }

  async function fetchMints(limit = PAGE){
    const qs = new URLSearchParams({
      collection: COLLECTION,
      limit: String(Math.min(50, Math.max(1, limit))),
      types: 'mint'
    });
    const url = `${API}?${qs.toString()}`;
    const json = await reservoirFetch(url);
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    return rows.sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
  }

  function render(items){
    const root = ul(); if (!root) return;
    root.innerHTML = '';

    if (!items.length){
      root.innerHTML = `<li class="row"><div class="pg-muted">No recent mints yet.</div></li>`;
      applyVisibleRows(root);
      return;
    }

    items.forEach(it=>{
      const meta = [
        it.to ? `→ ${shorten(it.to)}` : null,
        it.time ? ago(it.time) : null
      ].filter(Boolean).join(' • ');

      const li = document.createElement('li');
      li.className = 'row';

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

    // after items are in DOM, set the viewport height to N rows
    requestAnimationFrame(()=> applyVisibleRows(root));
  }

  async function loadAndRender(){
    try { await FF.ensureRarity?.(); } catch { /* not required */ }
    try { render(await fetchMints(PAGE)); }
    catch(e){
      console.warn('[mints] failed', e, e.url ? `\nURL: ${e.url}` : '');
      const root = ul(); if (root) root.innerHTML = `<li class="row"><div class="pg-muted">Could not load recent mints.</div></li>`;
    }
  }

  window.FF_loadRecentMints = loadAndRender;
})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
