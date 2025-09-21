// assets/js/utils.js
window.FF = window.FF || {};

(function(FF, CFG){
  // ---------- Small helpers ----------
  FF.shorten = (a) => a ? (String(a).slice(0,6) + '…' + String(a).slice(-4)) : '';

  // 128px thumbnails everywhere (keeps existing call sites unchanged)
  FF.thumb64 = (src, alt) =>
    `<img class="thumb128" src="${src}" alt="${alt}" width="128" height="128" loading="lazy">`;

  // "time ago" formatter from milliseconds
  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1e3); if(s<60) return s+'s';
    const m=Math.floor(s/60);   if(m<60) return m+'m';
    const h=Math.floor(m/60);   if(h<24) return h+'h';
    const d=Math.floor(h/24);   return d+'d';
  };

  // JSON fetch with no-store (used by rarity and others)
  FF.fetchJSON = async (url)=>{
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    return res.json();
  };

  // ---------- Reusable Frog modal ----------
  // Pass whatever fields you have; unknown ones just won’t render.
  // Supported fields:
  // { id, image, rank, buyer, time, price, staker, stakedAgo, score }
  FF.openFrogModal = function(info){
    const el = document.createElement('div');
    el.className = 'modal-overlay';

    const rankPill = (info.rank || info.rank === 0)
      ? `<span class="pill">Rank <b>#${info.rank}</b></span>` : '';

    const buyerLine = info.buyer
      ? `<div class="muted">Buyer <span class="addr">${FF.shorten(info.buyer)}</span>${info.time ? ` • ${info.time} ago` : ''}</div>`
      : '';

    const priceLine = info.price
      ? `<div class="muted">Price ${info.price}</div>` : '';

    const stakerLine = info.staker
      ? `<div class="muted">Staker <span class="addr">${FF.shorten(info.staker)}</span>${info.stakedAgo ? ` • Staked ${info.stakedAgo} ago` : ''}</div>`
      : '';

    const scoreLine = info.score
      ? `<div class="muted">Rarity Score: ${info.score}</div>` : '';

    const img = info.image || `${CFG?.SOURCE_PATH || ''}/frog/${info.id}.png`;

    el.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" aria-label="Close">×</button>
        <div class="row" style="align-items:flex-start; gap:16px;">
          <img src="${img}" alt="Frog #${info.id}" class="thumb128" width="128" height="128" />
          <div class="stack" style="gap:6px;">
            <div><b>Frog #${info.id}</b> ${rankPill}</div>
            ${stakerLine}
            ${buyerLine}
            ${priceLine}
            ${scoreLine}
            <div class="row" style="gap:8px;margin-top:6px;">
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${info.id}">OpenSea</a>
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener"
                 href="https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${info.id}">Etherscan</a>
            </div>
          </div>
        </div>
      </div>`;

    function close(){ el.remove(); document.removeEventListener('keydown', esc); }
    function esc(e){ if(e.key==='Escape') close(); }
    el.addEventListener('click', (e)=>{ if(e.target===el) close(); });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', esc);
    document.body.appendChild(el);
  };

})(window.FF, window.FF_CFG);
