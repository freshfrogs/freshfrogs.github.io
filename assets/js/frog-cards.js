// assets/js/frog-cards.js
// Renders dashboard-style frog cards (view-only or with actions),
// and now supports attribute-hover re-renders (lift effect) + animated overlays.

(function(){
  'use strict';

  const CFG = window.FF_CFG || {};
  const CHAIN_ID = Number(CFG.CHAIN_ID || 1);
  const BASEPATH = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  const LEVEL_SECS = Math.max(1, Number(CFG.STAKE_LEVEL_SECONDS || (30 * 86400)));
  const NO_HOVER_KEYS = new Set(['Trait','Frog','SpecialFrog']);
  const CARD_LAYOUTS = [
    'classic','collector'
  ];
  const CARD_LAYOUT_LABELS = {
    classic: 'Classic',
    collector: 'Collector Foil'
  };

  (function injectCSS(){
    if (document.getElementById('ff-frog-cards-css')) return;
    const css = `
.frog-cards{ display:grid; gap:10px; }
.frog-card{ padding:14px; border:1px solid var(--border); border-radius:12px; background:var(--panel); --fc-muted: color-mix(in srgb, var(--muted) 70%, #ffffff 30%); }
.frog-card .row{ display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:start; }
.frog-card .thumb-wrap{ width:128px; min-width:128px; position:relative; } /* relative for GIF overlays */
.frog-card .thumb, .frog-card canvas.frog-canvas{
  width:128px; height:128px; min-width:128px; min-height:128px;
  border-radius:10px; object-fit:contain; background:var(--panel-2); display:block;
}
.frog-card .title{ margin:0 0 4px 0; font-weight:800; font-size:16px; }
.frog-card .pill{ font-size:12px; padding:2px 8px; border:1px solid var(--border); border-radius:999px; vertical-align:middle; }
.frog-card .pill.rk-legendary{ color:#f59e0b; border-color: color-mix(in srgb,#f59e0b 70%, var(--border)); }
.frog-card .pill.rk-epic{ color:#a855f7; border-color: color-mix(in srgb,#a855f7 70%, var(--border)); }
.frog-card .pill.rk-rare{ color:#38bdf8; border-color: color-mix(in srgb,#38bdf8 70%, var(--border)); }
.frog-card .meta{ margin:0; color:var(--muted); font-size:12px; }
.frog-card .meta .staked-flag{ color:#22c55e; font-weight:700; }
.frog-card .attr-bullets{ list-style:disc; margin:6px 0 0 18px; padding:0; }
.frog-card .attr-bullets li{ font-size:12px; margin:2px 0; cursor:default; color:var(--fc-muted); }
.frog-card .attr-bullets li[data-hoverable="1"]{ cursor:pointer; }
.frog-card .actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.frog-card .btn{ font-family:var(--font-ui); border:1px solid var(--border); background:transparent; color:inherit; border-radius:8px; padding:6px 10px; font-weight:700; font-size:12px; line-height:1; }
.frog-card .btn:disabled{ opacity:.5; cursor:not-allowed; }
.fc-level{ display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; margin:4px 0 0; }
.fc-level .lab{ font-size:12px; color:var(--fc-muted); }
.fc-level .val{ font-size:12px; font-weight:700; }
.fc-level .bar{ height:6px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--panel) 90%, transparent); overflow:hidden; }
.fc-level .bar > i{ display:block; height:100%; width:0%; background:linear-gradient(90deg, #16a34a, #4ade80); }
:root[data-card-layout="collector"] .frog-card{ background:linear-gradient(145deg,#fff9e6,#f0d9a6); border:3px solid #d59f26; box-shadow:0 18px 40px rgba(165,116,26,.35); color:#3f2f12; position:relative; overflow:hidden; padding:18px; border-radius:18px; }
:root[data-card-layout="collector"] .frog-card::before{ content:''; position:absolute; inset:10px; border-radius:12px; background:radial-gradient(circle at top,#ffffffcc,#fff1cf80); border:1px solid rgba(255,255,255,.65); pointer-events:none; }
:root[data-card-layout="collector"] .frog-card::after{ content:''; position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,.35),rgba(255,255,255,0) 55%),linear-gradient(300deg,rgba(255,214,126,.3),rgba(255,255,255,0) 60%); pointer-events:none; mix-blend-mode:screen; opacity:.8; }
:root[data-card-layout="collector"] .frog-card .row, :root[data-card-layout="collector"] .frog-card .actions{ position:relative; }
:root[data-card-layout="collector"] .frog-card .title{ font-family:'Bebas Neue',var(--font-ui); letter-spacing:.04em; font-size:18px; text-transform:uppercase; color:#2a1f0d; }
:root[data-card-layout="collector"] .frog-card .meta{ color:rgba(63,47,18,.75); font-weight:600; }
:root[data-card-layout="collector"] .frog-card .meta .staked-flag{ color:#22c55e; }
:root[data-card-layout="collector"] .frog-card .thumb, :root[data-card-layout="collector"] .frog-card canvas.frog-canvas{ background:linear-gradient(135deg,rgba(255,255,255,.55),rgba(255,255,255,.15)); border:2px solid rgba(255,255,255,.7); box-shadow:0 14px 26px rgba(58,35,7,.25); border-radius:14px; }
:root[data-card-layout="collector"] .frog-card .attr-bullets{ list-style:none; padding:0; margin:12px 0 0; display:flex; flex-direction:column; gap:6px; }
:root[data-card-layout="collector"] .frog-card .attr-bullets li{ background:rgba(255,255,255,.6); border:1px solid rgba(213,159,38,.4); border-radius:10px; padding:8px 12px; color:#4a3515; font-weight:600; box-shadow:0 6px 12px rgba(58,35,7,.16); }
:root[data-card-layout="collector"] .frog-card .attr-bullets li[data-hoverable="1"]{ color:#2d200c; }
:root[data-card-layout="collector"] .fc-level .lab{ color:rgba(63,47,18,.7); font-weight:600; }
:root[data-card-layout="collector"] .fc-level .bar{ border-color:rgba(213,159,38,.45); background:rgba(255,255,255,.35); }
:root[data-card-layout="collector"] .fc-level .bar > i{ background:linear-gradient(90deg,#22c55e,#bbf7d0); }
:root[data-card-layout="collector"] .frog-card .actions .btn{ border:1px solid rgba(213,159,38,.5); background:rgba(255,255,255,.35); box-shadow:0 6px 10px rgba(58,35,7,.18); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"]{ background:linear-gradient(155deg,#f2f8ff,#c8d9ff); border-color:#5b7bdc; box-shadow:0 18px 36px rgba(45,76,165,.32); color:#1f2d5b; }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"]::before{ background:radial-gradient(circle at top,#ffffffcc,#cfe0ff80); border-color:rgba(255,255,255,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"]::after{ background:linear-gradient(120deg,rgba(255,255,255,.45),rgba(255,255,255,0) 55%),linear-gradient(300deg,rgba(110,147,255,.3),rgba(255,255,255,0) 60%); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"] .meta{ color:rgba(31,45,91,.75); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"] .attr-bullets li{ border-color:rgba(91,123,220,.35); color:#25356b; background:rgba(255,255,255,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="2"] .fc-level .lab{ color:rgba(31,45,91,.72); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"]{ background:linear-gradient(150deg,#fff1f1,#ffd6d6); border-color:#d16a7d; box-shadow:0 18px 36px rgba(171,58,86,.32); color:#5b1f2f; }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"]::before{ background:radial-gradient(circle at top,#ffffffcc,#ffd6d680); border-color:rgba(255,255,255,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"]::after{ background:linear-gradient(120deg,rgba(255,255,255,.45),rgba(255,255,255,0) 55%),linear-gradient(300deg,rgba(255,173,190,.35),rgba(255,255,255,0) 60%); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"] .meta{ color:rgba(91,31,47,.75); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"] .attr-bullets li{ border-color:rgba(209,106,125,.35); color:#5b1f2f; background:rgba(255,255,255,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="3"] .fc-level .lab{ color:rgba(91,31,47,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"]{ background:linear-gradient(150deg,#ecfdf3,#bbf7d0); border-color:#3ba475; box-shadow:0 18px 38px rgba(32,122,84,.32); color:#1f3b2d; }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"]::before{ background:radial-gradient(circle at top,#ffffffcc,#bbf7d080); border-color:rgba(255,255,255,.7); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"]::after{ background:linear-gradient(120deg,rgba(255,255,255,.45),rgba(255,255,255,0) 55%),linear-gradient(300deg,rgba(125,224,173,.3),rgba(255,255,255,0) 60%); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"] .meta{ color:rgba(31,59,45,.75); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"] .attr-bullets li{ border-color:rgba(59,164,117,.35); color:#244936; background:rgba(255,255,255,.72); }
:root[data-card-layout="collector"] .frog-card[data-collector-variant="4"] .fc-level .lab{ color:rgba(31,59,45,.72); }
    `;
    const s = document.createElement('style');
    s.id='ff-frog-cards-css'; s.textContent=css; document.head.appendChild(s);
  })();

  (function ensureLayoutAttribute(){
    const root = document.documentElement;
    if (root && !root.getAttribute('data-card-layout')){
      root.setAttribute('data-card-layout', 'classic');
    }
  })();

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
  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  function attrEscape(str){
    return String(str).replace(/"/g,'&quot;');
  }
  function shortAddr(addr){
    if(!addr||typeof addr!=='string') return '—';
    const a = addr.trim();
    if (!a) return '—';
    if(a.length<=10) return a;
    return a.slice(0,6)+'…'+a.slice(-4);
  }
  function ownerLabelFor(it){
    if (it == null || typeof it !== 'object') return 'Unknown';
    if (it.ownerLabel) return escapeHtml(it.ownerLabel);
    if (it.ownerYou) return 'You';
    if (it.ownerShort && it.ownerShort !== '—') return escapeHtml(it.ownerShort);
    if (it.owner) return escapeHtml(shortAddr(it.owner));
    if (it.holder) return escapeHtml(shortAddr(it.holder));
    return 'Unknown';
  }
  function attrsFromMeta(meta){
    const arr = meta && Array.isArray(meta.attributes) ? meta.attributes : null;
    if (!arr || !arr.length) return null;
    const out = [];
    for (let i = 0; i < arr.length; i++){
      const row = arr[i] || {};
      const keyRaw = row.key ?? row.trait_type ?? row.traitType ?? row.type ?? null;
      const valRaw = row.value ?? row.trait_value ?? row.traitValue ?? null;
      const key = keyRaw != null ? String(keyRaw).trim() : '';
      const val = valRaw != null ? String(valRaw).trim() : '';
      if (!key || !val) continue;
      out.push({ key, value: val });
    }
    return out.length ? out : null;
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
    return ` <span class="pill ${cls}">♦ #${rank}</span>`;
  }
  function attrsHTML(attrs, max=4){
    if (!Array.isArray(attrs)||!attrs.length) return '';
    const rows=[];
    for (let i=0;i<attrs.length;i++){
      const a = attrs[i]; if(!a.key||a.value==null) continue;
      const keyStr = String(a.key);
      const hoverable = NO_HOVER_KEYS.has(keyStr) ? '0' : '1';
      rows.push(`<li data-attr-key="${attrEscape(keyStr)}" data-hoverable="${hoverable}"><b>${escapeHtml(keyStr)}:</b> ${escapeHtml(String(a.value))}</li>`);
      if(rows.length>=max) break;
    }
    return rows.length? '<ul class="attr-bullets">'+rows.join('')+'</ul>' : '';
  }

  function mountMedia(el, item, options, hoverKey){
    const box = el.querySelector('.thumb-wrap');
    if (!box) return;

    // Prefer DOM renderer
    if (window.FF && typeof window.FF.renderFrogDOM === 'function'){
        // ensure container element inside .thumb-wrap for the stack
        let host = box.querySelector('.frog-stack-host');
        if (!host){
        host = document.createElement('div');
        host.className = 'frog-stack-host';
        host.style.position = 'relative';
        host.style.width = '128px';
        host.style.height = '128px';
        host.style.borderRadius = '10px';
        host.style.overflow = 'hidden';
        box.innerHTML = '';
        box.appendChild(host);
        }
        // render (in exact metadata order)
        (async ()=>{
        try{
            await window.FF.renderFrogDOM(host, item.metaRaw || null, { tokenId: item.id, size:128, hoverKey: hoverKey || '' });
        }catch(_){
            box.innerHTML = `<img class="thumb" src="${(options.imgForId || (id => (window.FF_CFG?.SOURCE_PATH?.replace(/\/+$/,'')||'') + '/frog/' + id + '.png'))(item.id)}" alt="${item.id}">`;
        }
        })();
        return;
    }

    // Fallback to canvas renderer (if present)
    if (window.FF && typeof window.FF.renderFrog === 'function'){
        const canvas = box.querySelector('canvas.frog-canvas') || document.createElement('canvas');
        canvas.className = 'frog-canvas';
        canvas.width = 128; canvas.height = 128;
        if (!canvas.parentNode) { box.innerHTML = ''; box.appendChild(canvas); }
        (async ()=>{
        try{
            await window.FF.renderFrog(canvas, item.metaRaw || null, { size:128, tokenId:item.id, hoverKey: hoverKey || '' });
        }catch(_){
            box.innerHTML = `<img class="thumb" src="${(options.imgForId || (id => (window.FF_CFG?.SOURCE_PATH?.replace(/\/+$/,'')||'') + '/frog/' + id + '.png'))(item.id)}" alt="${item.id}">`;
        }
        })();
        return;
    }

    // Final fallback: static PNG
    box.innerHTML = `<img class="thumb" src="${(options.imgForId || (id => (window.FF_CFG?.SOURCE_PATH?.replace(/\/+$/,'')||'') + '/frog/' + id + '.png'))(item.id)}" alt="${item.id}">`;
    }

  function metaLineDefault(it){
    const ownerLabel = ownerLabelFor(it);
    if (it.staked){
      const agoRaw = it.sinceMs ? fmtAgo(it.sinceMs) : null;
      const agoHtml = agoRaw ? ' ' + escapeHtml(agoRaw) : '';
      return `<span class="staked-flag">Staked</span> by ${ownerLabel}${agoHtml}`;
    }
    return 'Owned by ' + ownerLabel;
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
    const attrs = attrsHTML(item.attrs || [], 8); // show more so hover has targets
    const secsPer = Number(options.levelSeconds || LEVEL_SECS);
    const disableTransfer = (options.disableTransferWhenStaked !== false) && item.staked;

    const article = document.createElement('article');
    article.className = 'frog-card';
    article.setAttribute('data-token-id', String(item.id));
    const variantSeed = Number(item.id);
    const variant = isFinite(variantSeed) ? ((variantSeed % 4) + 4) % 4 + 1 : 1;
    article.setAttribute('data-collector-variant', String(variant));
    article.innerHTML = `
      <div class="row">
        <div class="thumb-wrap"></div>
        <div>
          <h4 class="title">Frog #${item.id}${pill}</h4>
          <div class="meta">${metaLine}</div>
          ${levelRowHTML(item, secsPer)}
          ${attrs}
        </div>
      </div>
      ${options.showActions ? `
        <div class="actions">
          <button class="btn" data-act="${item.staked ? 'unstake' : 'stake'}">${item.staked ? 'Unstake' : 'Stake'}</button>
          <button class="btn" data-act="transfer" ${disableTransfer ? 'disabled title="Transfer disabled while staked"' : ''}>Transfer</button>
          ${options.linkEtherscan !== false ? `<a class="btn" href="${(options.etherscanForId||etherscanFor)(item.id)}" target="_blank" rel="noopener">Etherscan</a>`:''}
          ${options.linkOriginal !== false ? `<a class="btn" href="${(options.imgForId||imgFor)(item.id)}" target="_blank" rel="noopener">Original</a>`:''}
        </div>
      `:``}
    `;

    // hover wiring (per attribute)
    let hoverKey = '';
    function rerender(){ mountMedia(article, item, options, hoverKey); }
    const list = article.querySelector('.attr-bullets');
    if (list){
      list.addEventListener('mousemove', (e)=>{
        const li = e.target.closest('li[data-attr-key]'); if(!li) return;
        const key = li.getAttribute('data-attr-key') || '';
        const hoverable = li.getAttribute('data-hoverable') === '1';
        const nextKey = hoverable ? key : '';
        if (nextKey !== hoverKey){
          hoverKey = nextKey;
          rerender();
        }
      });
      list.addEventListener('mouseleave', ()=>{
        if (hoverKey){ hoverKey = ''; rerender(); }
      });
    }

    // initial media
    rerender();

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
        attrs: (()=>{
          const metaAttrs = attrsFromMeta(x.metaRaw || null);
          if (metaAttrs) return metaAttrs;
          return Array.isArray(x.attrs)? x.attrs : [];
        })(),
        rank: (x.rank==null? null : Number(x.rank)),
        metaRaw: x.metaRaw || null,
        owner: x.owner || null,
        ownerShort: x.ownerShort || null,
        ownerYou: !!x.ownerYou,
        holder: x.holder || null,
        ownerLabel: x.ownerLabel || null
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

  function normalizeLayoutId(id){
    if (!id || typeof id !== 'string') return 'classic';
    const lower = id.toLowerCase();
    return CARD_LAYOUTS.indexOf(lower) >= 0 ? lower : 'classic';
  }

  window.FF = window.FF || {};
  window.FF.shortAddress = shortAddr;
  window.FF.formatOwnerLine = metaLineDefault;
  window.FF.buildFrogCard = buildCard;
  window.FF.renderFrogCards = function renderFrogCards(container, frogs, options){
    const root = resolveContainer(container);
    if (!root) return;
    const opts = options || {};
    root.classList.add('frog-cards');

    const rows = Array.isArray(frogs) ? frogs.map(normalizeFrog).filter(Boolean) : [];
    if (!rows.length){
      root.innerHTML = '<div class="pg-muted">No frogs to display.</div>';
      return;
    }

    root.innerHTML = '';
    for (const it of rows){
      root.appendChild(buildCard(it, opts));
    }
  };
  window.FF.setCardLayout = function setCardLayout(id){
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('data-card-layout', normalizeLayoutId(id));
  };
  window.FF.getCardLayout = function getCardLayout(){
    const root = document.documentElement;
    if (!root) return 'classic';
    return normalizeLayoutId(root.getAttribute('data-card-layout'));
  };
  window.FF.availableCardLayouts = function availableCardLayouts(){
    return CARD_LAYOUTS.map((id)=>({ id, label: CARD_LAYOUT_LABELS[id] || id }));
  };
  window.FF.cardLayoutLabel = function cardLayoutLabel(id){
    const key = normalizeLayoutId(id);
    return CARD_LAYOUT_LABELS[key] || key;
  };
})();
