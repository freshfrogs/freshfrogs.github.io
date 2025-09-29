// assets/js/frog-cards.js
// Reusable frog info cards (same look/feel as dashboard).
// Uses optional FF.renderFrog(canvas, meta, {size:128, tokenId}) hook for layered builds.
// If the hook isn't present, falls back to /frog/{id}.png.

// API:
//   FF.renderFrogCards(container, frogs, options)
//     - container: DOM element or selector
//     - frogs: array of ids or objects:
//         { id, staked?:bool, sinceMs?:number, attrs?:[{key,value}], rank?:number, metaRaw?:object }
//     - options:
//         imgBasePath?: string        // defaults to FF_CFG.SOURCE_PATH or ''
//         showActions?: boolean       // default false
//         disableTransferWhenStaked?: boolean // default true
//         onStake?: (id)=>Promise|void
//         onUnstake?: (id)=>Promise|void
//         onTransfer?: (id)=>Promise|void
//         linkOriginal?: boolean      // default true
//         linkEtherscan?: boolean     // default true
//         levelSeconds?: number       // default FF_CFG.STAKE_LEVEL_SECONDS || 86400
//         rarityTiers?: {legendary:number,epic:number,rare:number}
//         // formatting overrides:
//         metaLine?: (frog)=>string
//         imgForId?: (id)=>string
//         etherscanForId?: (id)=>string

(function(){
  'use strict';

  const CFG = window.FF_CFG || {};
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASEPATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,''); // prefix for /frog
  const LEVEL_SECS = Math.max(1, Number(CFG.STAKE_LEVEL_SECONDS || 86400));

  // --- tiny CSS (safe, class-scoped; matches owned-panel look) ---
  (function injectCSS(){
    if (document.getElementById('ff-frog-cards-css')) return;
    const css = `
.frog-cards{ display:grid; gap:10px; }
.frog-card{ padding:14px; border:1px solid var(--border); border-radius:12px; background:var(--panel); }
.frog-card .thumb-wrap{ width:128px; min-width:128px; }
.frog-card .thumb, .frog-card canvas.frog-canvas{
  width:128px; height:128px; min-width:128px; min-height:128px;
  border-radius:10px; object-fit:contain; background:var(--panel-2); display:block;
}
.frog-card .title{ margin:0 0 4px 0; font-weight:800; font-size:16px; }
.frog-card .pill{ font-size:12px; padding:2px 8px; border:1px solid var(--border); border-radius:999px; vertical-align:middle; }
.frog-card .pill.rk-legendary{ color:#f59e0b; border-color: color-mix(in srgb,#f59e0b 70%, var(--border)); }
.frog-card .pill.rk-epic{ color:#a855f7; border-color: color-mix(in srgb,#a855f7 70%, var(--border)); }
.frog-card .pill.rk-rare{ color:#38bdf8; border-color: color-mix(in srgb,#38bdf8 70%, var(--border)); }
.frog-card .meta{ margin:0; color:#22c55e; } /* staked line in green */
.frog-card .attr-bullets{ list-style:disc; margin:6px 0 0 18px; padding:0; }
.frog-card .attr-bullets li{ font-size:12px; margin:2px 0; }
.frog-card .actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.frog-card .btn{ font-family:var(--font-ui); border:1px solid var(--border); background:transparent; color:inherit; border-radius:8px; padding:6px 10px; font-weight:700; font-size:12px; line-height:1; }
.frog-card .btn:disabled{ opacity:.5; cursor:not-allowed; }
.frog-cards .row{ display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:start; }
.fc-level{ display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; margin:4px 0 0; }
.fc-level .lab{ font-size:12px; color:var(--muted); }
.fc-level .val{ font-size:12px; font-weight:700; }
.fc-level .bar{ height:6px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--panel) 90%, transparent); overflow:hidden; }
.fc-level .bar > i{ display:block; height:100%; width:0%; background:linear-gradient(90deg, #16a34a, #4ade80); }
    `;
    const s = document.createElement('style');
    s.id='ff-frog-cards-css'; s.textContent=css; document.head.appendChild(s);
  })();

  // --- helpers ---
  function imgFor(id){ return `${BASEPATH}/frog/${id}.png`; }
  function etherscanFor(id){
    const base =
      CHAIN_ID===1?'https://etherscan.io/token/':
      CHAIN_ID===11155111?'https://sepolia.etherscan.io/token/':
      CHAIN_ID===5?'https://goerli.etherscan.io/token/':
      'https://etherscan.io/token/';
    return base + (CFG.COLLECTION_ADDRESS || '') + '?a=' + id;
  }
  function fmtAgo(ms){
    if(!ms||!isFinite(ms))return null;
    const s=Math.max(0,Math.floor((Date.now()-ms)/1000));
    const d=Math.floor(s/86400); if(d>=1) return d+'d ago';
    const h=Math.floor((s%86400)/3600); if(h>=1) return h+'h ago';
    const m=Math.floor((s%3600)/60); if(m>=1) return m+'m ago';
    return s+'s ago';
  }
  function levelInfo(sinceMs, secsPerLevel){
    if (!sinceMs) return { level:0, pct:0 };
    const el = Math.max(0, Math.floor((Date.now() - sinceMs)/1000));
    const lv = Math.floor(el / secsPerLevel);
    const into = el % secsPerLevel;
    const pct = Math.max(0, Math.min(100, Math.round((into / secsPerLevel)*100)));
    return { level:lv, pct };
  }
  function tierFor(rank, tiers){
    const T = tiers || { legendary: 50, epic: 250, rare: 800 };
    if (typeof rank !== 'number' || !isFinite(rank)) return 'common';
    if (rank <= T.legendary) return 'legendary';
    if (rank <= T.epic) return 'epic';
    if (rank <= T.rare) return 'rare';
    return 'common';
  }
  function rankPill(rank, tiers){
    if (rank==null) return '';
    const t=tierFor(rank, tiers);
    const cls = t==='legendary'?'rk-legendary':t==='epic'?'rk-epic':t==='rare'?'rk-rare':'';
    return ` <span class="pill ${cls}">Rank #${rank}</span>`;
  }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const rows=[]; for (const a of attrs){ if(!a.key||a.value==null) continue; rows.push('<li><b>'+a.key+':</b> '+String(a.value)+'</li>'); if(rows.length>=max) break; }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }

  // Mount media (canvas via FF.renderFrog or fallback PNG)
  function mountMedia(el, item, options){
    const box = el.querySelector('.thumb-wrap');
    if (!box) return;
    const meta = item.metaRaw || null;
    const hasRenderer = (typeof (window.FF && window.FF.renderFrog) === 'function');
    if (hasRenderer){
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      canvas.className = 'frog-canvas';
      box.innerHTML = ''; box.appendChild(canvas);
      (async ()=>{
        try{
          await window.FF.renderFrog(canvas, meta, { size:128, tokenId:item.id });
        }catch(e){
          box.innerHTML = `<img class="thumb" src="${(options.imgForId||imgFor)(item.id)}" alt="${item.id}">`;
        }
      })();
    }else{
      box.innerHTML = `<img class="thumb" src="${(options.imgForId||imgFor)(item.id)}" alt="${item.id}">`;
    }
  }

  function metaLineDefault(it){
    if (it.staked){
      const ago = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      return (ago ? `Staked ${ago}` : 'Staked') + ' • Owned by You';
    }
    return 'Not staked • Owned by You';
  }

  function levelRowHTML(it, secsPerLevel){
    if (!it.staked || !it.sinceMs) return '';
    const li = levelInfo(it.sinceMs, secsPerLevel);
    return `
      <div class="fc-level" aria-label="Staking level">
        <div class="lab">Level</div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${li.pct}"><i style="width:${li.pct}%"></i></div>
        <div class="val">${li.level}</div>
      </div>
    `;
  }

  function buildCard(item, options){
    const tiers = options.rarityTiers;
    const pill = (item.rank || item.rank===0) ? rankPill(item.rank, tiers) : '';
    const metaLine = (options.metaLine || metaLineDefault)(item);
    const attrs = attrsHTML(item.attrs || [], 4);
    const secsPer = Number(options.levelSeconds || LEVEL_SECS);
    const disableTransfer = (options.disableTransferWhenStaked !== false) && item.staked;

    const article = document.createElement('article');
    article.className = 'frog-card';
    article.setAttribute('data-token-id', String(item.id));
    article.innerHTML = `
      <div class="row">
        <div class="thumb-wrap"></div>
        <div>
          <h4 class="title">Frog #${item.id}${pill}</h4>
          <div class="meta">${metaLine}</div>
          ${levelRowHTML(item, secsPer)}
          ${attrs}
          ${options.showActions ? `
            <div class="actions">
              <button class="btn" data-act="${item.staked ? 'unstake' : 'stake'}">${item.staked ? 'Unstake' : 'Stake'}</button>
              <button class="btn" data-act="transfer" ${disableTransfer ? 'disabled title="Transfer disabled while staked"' : ''}>Transfer</button>
              ${options.linkEtherscan !== false ? `<a class="btn" href="${(options.etherscanForId||etherscanFor)(item.id)}" target="_blank" rel="noopener">Etherscan</a>`:''}
              ${options.linkOriginal !== false ? `<a class="btn" href="${(options.imgForId||imgFor)(item.id)}" target="_blank" rel="noopener">Original</a>`:''}
            </div>
          `:``}
        </div>
      </div>
    `;

    // media
    mountMedia(article, item, options);

    // actions
    if (options.showActions){
      article.addEventListener('click', async (e)=>{
        const btn = e.target.closest('[data-act]'); if(!btn) return;
        const act = btn.getAttribute('data-act');
        try{
          if (act==='stake'   && typeof options.onStake==='function')   await options.onStake(item.id);
          if (act==='unstake' && typeof options.onUnstake==='function') await options.onUnstake(item.id);
          if (act==='transfer'&& typeof options.onTransfer==='function') await options.onTransfer(item.id);
        }catch(_){}
      });
    }

    return article;
  }

  function normalizeFrog(x){
    if (typeof x === 'number') return { id:x };
    if (x && typeof x === 'object'){
      return {
        id: Number(x.id),
        staked: !!x.staked,
        sinceMs: Number(x.sinceMs||0) || null,
        attrs: Array.isArray(x.attrs)? x.attrs : [],
        rank: (x.rank==null? null : Number(x.rank)),
        metaRaw: x.metaRaw || null
      };
    }
    return null;
  }

  function resolveContainer(elOrSel){
    if (!elOrSel) return null;
    if (typeof elOrSel === 'string') return document.querySelector(elOrSel);
    if (elOrSel.nodeType === 1) return elOrSel;
    return null;
  }

  // Public API
  window.FF = window.FF || {};
  window.FF.buildFrogCard = buildCard;
  window.FF.renderFrogCards = function renderFrogCards(container, frogs, options){
    const root = resolveContainer(container);
    if (!root) return;
    const opts = options || {};
    root.classList.add('frog-cards');

    // Normalize array
    const rows = Array.isArray(frogs) ? frogs.map(normalizeFrog).filter(Boolean) : [];
    if (!rows.length){
      root.innerHTML = '<div class="pg-muted">No frogs to display.</div>';
      return;
    }

    // Clear + render
    root.innerHTML = '';
    for (const it of rows){
      root.appendChild(buildCard(it, opts));
    }
  };
})();
