// assets/js/activity-feed.js
// Live Recent Activity — Reservoir + your FF helpers
(function (FF, CFG) {
  const UL_ID = 'activityList';
  const PAGE  = Math.max(1, Number(CFG.PAGE_SIZE || 20));

  function need(k){ if(!CFG[k]) throw new Error(`[activity] Missing FF_CFG.${k}`); return CFG[k]; }
  const COLLECTION = need('COLLECTION_ADDRESS');

  const shorten  = (a)=> FF.shorten?.(a) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const ago      = (d)=> d ? (FF.formatAgo(Date.now()-d.getTime())+' ago') : '';
  const imgFor   = (id)=> `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;

  // Etherscan tx URL
  function txUrl(hash){
    if (!hash) return null;
    if (CFG.ETHERSCAN_TX_BASE) return `${CFG.ETHERSCAN_TX_BASE.replace(/\/+$/,'')}/${hash}`;
    const chainId = Number(CFG.CHAIN_ID || 1);
    const base =
      chainId === 1         ? 'https://etherscan.io/tx/' :
      chainId === 11155111  ? 'https://sepolia.etherscan.io/tx/' :
      chainId === 5         ? 'https://goerli.etherscan.io/tx/' :
                              'https://etherscan.io/tx/';
    return base + hash;
  }

  function ul(){
    const root = document.getElementById(UL_ID);
    if (root) root.classList.add('scrolling');     // enable scrolling
    return root;
  }

  // Normalize one activity row
  function mapRow(a){
    let tokenId = null;
    let from = '';
    let to   = '';
    let ts   = null;
    let priceEth = null;
    let txHash = null;
    let rawType = '';

    if (a && a.token && a.token.tokenId != null){
      tokenId = Number(a.token.tokenId);
      from = (a.fromAddress || '').toLowerCase();
      to   = (a.toAddress   || '').toLowerCase();
      ts   = a.timestamp ?? a.createdAt;
      rawType = a.type || '';
      const p = a?.price ?? a?.salePrice;
      if (p?.amount?.decimal != null) priceEth = Number(p.amount.decimal);
      else if (typeof p === 'number') priceEth = p;
      txHash = a?.txHash || a?.transactionHash || null;
    } else if (a && typeof a.id !== 'undefined'){
      tokenId = Number(a.id);
      from = (a.from || '').toLowerCase();
      to   = (a.to   || '').toLowerCase();
      ts   = a.blockTimestamp || null;
      rawType = 'transfer';
      txHash = a.txHash || null;
    }

    if (!Number.isFinite(tokenId)) return null;

    const ctl  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();

    let type = rawType || '';
    if (from === '0x0000000000000000000000000000000000000000') type = 'Mint';
    else if (to === ctl)   type = 'Stake';
    else if (from === ctl) type = 'Unstake';
    else if ((a?.price || a?.salePrice) != null) type = 'Sale';
    else if (!type) type = 'Transfer';

    let dt = null;
    if (typeof ts === 'number') dt = new Date(ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string') { const p = Date.parse(ts); if (!Number.isNaN(p)) dt = new Date(p); }

    return {
      id: tokenId,
      type,
      from: a?.fromAddress || from || null,
      to: a?.toAddress || to || null,
      priceEth,
      time: dt,
      img: imgFor(tokenId),
      tx: txHash
    };
  }

  async function fetchRecent(limit = PAGE){
    if (!window.FF_ALCH) throw new Error('Alchemy helper not loaded');
    const { transfers } = await window.FF_ALCH.getCollectionTransfers({
      maxCount: Math.min(200, Math.max(20, limit * 4)),
      order: 'desc'
    });
    return transfers.map(mapRow).filter(Boolean)
      .sort((a,b)=> (b.time?.getTime()||0) - (a.time?.getTime()||0));
  }

  function pillRank(rank){
    return (rank||rank===0)
      ? `<span class="pill">Rank <b>#${rank}</b></span>`
      : `<span class="pill"><span class="muted">Rank N/A</span></span>`;
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

      // Make the entire row open Etherscan if tx is available; else open your modal
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
             <b>${it.type}</b> • Frog #${it.id} ${pillRank(rank)}
           </div>
           <div class="pg-muted">${meta}${href ? ' • Etherscan' : ''}</div>
         </div>`;

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
