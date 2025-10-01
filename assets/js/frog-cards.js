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
    'classic','aurora','ember','midnight','glass','grove','retro','oasis','parchment','circuit','sunset'
  ];
  const CARD_LAYOUT_LABELS = {
    classic: 'Classic',
    aurora: 'Aurora Glow',
    ember: 'Ember Forge',
    midnight: 'Midnight Noir',
    glass: 'Glass Vault',
    grove: 'Canopy Grove',
    retro: 'Retro Pop',
    oasis: 'Desert Oasis',
    parchment: 'Archivist',
    circuit: 'Circuit Breaker',
    sunset: 'Sunset Mirage'
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
:root[data-card-layout="aurora"] .frog-card{ background:linear-gradient(135deg,#10172a,#203659 50%,#3bb5d2); border:1px solid rgba(96,165,250,.6); box-shadow:0 18px 42px rgba(23,55,97,.55); color:#e4f5ff; }
:root[data-card-layout="aurora"] .frog-card .title{ color:#f8fafc; letter-spacing:.03em; }
:root[data-card-layout="aurora"] .frog-card .meta{ color:rgba(228,245,255,.75); }
:root[data-card-layout="aurora"] .frog-card .meta .staked-flag{ color:#86efac; }
:root[data-card-layout="aurora"] .frog-card .thumb, :root[data-card-layout="aurora"] .frog-card canvas.frog-canvas{ background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(31,41,55,.4)); border:1px solid rgba(148,163,184,.5); box-shadow:0 14px 32px rgba(15,23,42,.55); }
:root[data-card-layout="aurora"] .frog-card .attr-bullets li{ background:rgba(15,23,42,.55); border:1px solid rgba(148,163,184,.45); border-radius:10px; padding:6px 10px; color:#e2e8f0; box-shadow:0 10px 24px rgba(15,23,42,.4); }
:root[data-card-layout="aurora"] .fc-level .lab{ color:rgba(228,245,255,.65); }
:root[data-card-layout="aurora"] .fc-level .bar{ border-color:rgba(59,130,246,.45); background:rgba(15,23,42,.6); }
:root[data-card-layout="aurora"] .fc-level .bar > i{ background:linear-gradient(90deg,#22d3ee,#818cf8); }

:root[data-card-layout="ember"] .frog-card{ background:linear-gradient(160deg,#2b0f0f,#4a1c10 55%,#9f3412); border:1px solid rgba(248,113,113,.6); box-shadow:0 16px 36px rgba(127,29,29,.55); color:#fee2e2; }
:root[data-card-layout="ember"] .frog-card .title{ color:#f87171; text-transform:uppercase; letter-spacing:.05em; }
:root[data-card-layout="ember"] .frog-card .meta{ color:rgba(254,226,226,.8); }
:root[data-card-layout="ember"] .frog-card .thumb, :root[data-card-layout="ember"] .frog-card canvas.frog-canvas{ background:radial-gradient(circle at 30% 20%,rgba(248,113,113,.4),rgba(127,29,29,.6)); border:1px solid rgba(248,113,113,.35); box-shadow:0 12px 26px rgba(127,29,29,.6); }
:root[data-card-layout="ember"] .frog-card .attr-bullets li{ background:rgba(127,29,29,.65); border:1px solid rgba(248,113,113,.45); border-radius:12px; padding:8px 12px; color:#fee2e2; box-shadow:0 10px 24px rgba(127,29,29,.45); }
:root[data-card-layout="ember"] .fc-level .lab{ color:rgba(254,226,226,.75); }
:root[data-card-layout="ember"] .fc-level .bar{ border-color:rgba(248,113,113,.45); background:rgba(69,10,10,.7); }
:root[data-card-layout="ember"] .fc-level .bar > i{ background:linear-gradient(90deg,#f97316,#facc15); }

:root[data-card-layout="midnight"] .frog-card{ background:linear-gradient(145deg,#0f172a,#111827); border:1px solid rgba(30,41,59,.85); box-shadow:0 18px 48px rgba(15,23,42,.7); color:#e2e8f0; }
:root[data-card-layout="midnight"] .frog-card .title{ font-family:'Bebas Neue',var(--font-ui); letter-spacing:.06em; color:#f1f5f9; }
:root[data-card-layout="midnight"] .frog-card .meta{ color:rgba(148,163,184,.8); }
:root[data-card-layout="midnight"] .frog-card .thumb, :root[data-card-layout="midnight"] .frog-card canvas.frog-canvas{ background:radial-gradient(circle at center,rgba(30,41,59,.85),rgba(15,23,42,.95)); border:1px solid rgba(71,85,105,.55); box-shadow:0 16px 32px rgba(2,6,23,.65); }
:root[data-card-layout="midnight"] .frog-card .attr-bullets li{ background:rgba(15,23,42,.75); border:1px solid rgba(51,65,85,.6); border-radius:8px; padding:6px 10px; color:#cbd5f5; }
:root[data-card-layout="midnight"] .fc-level .lab{ color:rgba(148,163,184,.75); }
:root[data-card-layout="midnight"] .fc-level .bar{ border-color:rgba(59,130,246,.35); background:rgba(15,23,42,.85); }
:root[data-card-layout="midnight"] .fc-level .bar > i{ background:linear-gradient(90deg,#38bdf8,#6366f1); }

:root[data-card-layout="glass"] .frog-card{ background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,255,255,.35)); border:1px solid rgba(148,163,184,.35); box-shadow:0 18px 36px rgba(15,23,42,.18); backdrop-filter:blur(12px); color:#0f172a; }
:root[data-card-layout="glass"] .frog-card .title{ font-weight:700; letter-spacing:.04em; color:#0f172a; }
:root[data-card-layout="glass"] .frog-card .meta{ color:rgba(30,41,59,.65); }
:root[data-card-layout="glass"] .frog-card .thumb, :root[data-card-layout="glass"] .frog-card canvas.frog-canvas{ background:linear-gradient(145deg,rgba(255,255,255,.75),rgba(148,163,184,.25)); border:1px solid rgba(148,163,184,.3); box-shadow:0 14px 26px rgba(15,23,42,.18); border-radius:14px; }
:root[data-card-layout="glass"] .frog-card .attr-bullets li{ background:rgba(255,255,255,.7); border:1px solid rgba(148,163,184,.35); border-radius:12px; padding:8px 12px; color:#1f2937; }
:root[data-card-layout="glass"] .fc-level .lab{ color:rgba(30,41,59,.6); }
:root[data-card-layout="glass"] .fc-level .bar{ border-color:rgba(148,163,184,.35); background:rgba(226,232,240,.65); }
:root[data-card-layout="glass"] .fc-level .bar > i{ background:linear-gradient(90deg,#38bdf8,#34d399); }

:root[data-card-layout="grove"] .frog-card{ background:linear-gradient(160deg,#0f2d23,#1f5135,#4ade80); border:1px solid rgba(34,197,94,.5); box-shadow:0 18px 40px rgba(15,118,110,.45); color:#ecfdf3; }
:root[data-card-layout="grove"] .frog-card .title{ color:#bbf7d0; letter-spacing:.05em; }
:root[data-card-layout="grove"] .frog-card .meta{ color:rgba(236,253,245,.8); }
:root[data-card-layout="grove"] .frog-card .thumb, :root[data-card-layout="grove"] .frog-card canvas.frog-canvas{ background:linear-gradient(140deg,rgba(34,197,94,.4),rgba(15,118,110,.65)); border:1px solid rgba(134,239,172,.45); box-shadow:0 14px 30px rgba(15,118,110,.55); }
:root[data-card-layout="grove"] .frog-card .attr-bullets li{ background:rgba(15,118,110,.6); border:1px solid rgba(74,222,128,.55); border-radius:12px; padding:8px 12px; color:#dcfce7; }
:root[data-card-layout="grove"] .fc-level .lab{ color:rgba(236,253,245,.75); }
:root[data-card-layout="grove"] .fc-level .bar{ border-color:rgba(74,222,128,.55); background:rgba(6,95,70,.7); }
:root[data-card-layout="grove"] .fc-level .bar > i{ background:linear-gradient(90deg,#22c55e,#a3e635); }

:root[data-card-layout="retro"] .frog-card{ background:linear-gradient(160deg,#fffbeb,#facc15 45%,#f97316); border:2px solid rgba(249,115,22,.55); box-shadow:0 18px 32px rgba(217,119,6,.45); color:#3b1f0b; }
:root[data-card-layout="retro"] .frog-card .title{ font-family:'Bebas Neue',var(--font-ui); letter-spacing:.08em; color:#b91c1c; text-transform:uppercase; }
:root[data-card-layout="retro"] .frog-card .meta{ color:rgba(59,31,11,.75); font-weight:600; }
:root[data-card-layout="retro"] .frog-card .thumb, :root[data-card-layout="retro"] .frog-card canvas.frog-canvas{ background:linear-gradient(135deg,#fee2b5,#f97316); border:2px solid rgba(250,204,21,.65); box-shadow:0 16px 34px rgba(217,119,6,.5); border-radius:16px; }
:root[data-card-layout="retro"] .frog-card .attr-bullets{ list-style:none; padding:0; margin:12px 0 0; display:flex; flex-direction:column; gap:8px; }
:root[data-card-layout="retro"] .frog-card .attr-bullets li{ background:rgba(255,255,255,.7); border:1px solid rgba(249,115,22,.45); border-radius:12px; padding:8px 12px; color:#7c2d12; font-weight:600; box-shadow:0 8px 18px rgba(217,119,6,.3); }
:root[data-card-layout="retro"] .fc-level .lab{ color:rgba(59,31,11,.7); }
:root[data-card-layout="retro"] .fc-level .bar{ border-color:rgba(249,115,22,.45); background:rgba(254,243,199,.75); }
:root[data-card-layout="retro"] .fc-level .bar > i{ background:linear-gradient(90deg,#f97316,#ef4444); }

:root[data-card-layout="oasis"] .frog-card{ background:linear-gradient(155deg,#022c3d,#036672,#0fb5a6); border:1px solid rgba(45,212,191,.55); box-shadow:0 18px 40px rgba(8,145,178,.5); color:#f0fdfa; }
:root[data-card-layout="oasis"] .frog-card .title{ color:#5eead4; letter-spacing:.04em; }
:root[data-card-layout="oasis"] .frog-card .meta{ color:rgba(224,242,254,.75); }
:root[data-card-layout="oasis"] .frog-card .thumb, :root[data-card-layout="oasis"] .frog-card canvas.frog-canvas{ background:linear-gradient(150deg,rgba(14,165,233,.45),rgba(6,182,212,.55)); border:1px solid rgba(94,234,212,.45); box-shadow:0 14px 28px rgba(6,148,162,.55); }
:root[data-card-layout="oasis"] .frog-card .attr-bullets li{ background:rgba(8,51,68,.65); border:1px solid rgba(94,234,212,.45); border-radius:10px; padding:7px 11px; color:#ccfbf1; }
:root[data-card-layout="oasis"] .fc-level .lab{ color:rgba(204,251,241,.75); }
:root[data-card-layout="oasis"] .fc-level .bar{ border-color:rgba(94,234,212,.45); background:rgba(8,51,68,.7); }
:root[data-card-layout="oasis"] .fc-level .bar > i{ background:linear-gradient(90deg,#22d3ee,#2dd4bf); }

:root[data-card-layout="parchment"] .frog-card{ background:linear-gradient(135deg,#fef3c7,#fcd34d,#f9a8d4); border:1px solid rgba(214,158,46,.55); box-shadow:0 18px 36px rgba(217,119,6,.35); color:#4a3515; }
:root[data-card-layout="parchment"] .frog-card .title{ font-family:'Crimson Text',serif; font-weight:700; letter-spacing:.04em; color:#6b3f11; }
:root[data-card-layout="parchment"] .frog-card .meta{ color:rgba(74,53,21,.75); font-style:italic; }
:root[data-card-layout="parchment"] .frog-card .thumb, :root[data-card-layout="parchment"] .frog-card canvas.frog-canvas{ background:linear-gradient(135deg,#fef3c7,#fde68a); border:1px solid rgba(217,119,6,.35); box-shadow:0 12px 26px rgba(146,64,14,.35); border-radius:14px; }
:root[data-card-layout="parchment"] .frog-card .attr-bullets li{ background:rgba(255,255,255,.65); border:1px solid rgba(214,158,46,.45); border-radius:12px; padding:8px 12px; color:#6b3f11; }
:root[data-card-layout="parchment"] .fc-level .lab{ color:rgba(74,53,21,.7); }
:root[data-card-layout="parchment"] .fc-level .bar{ border-color:rgba(214,158,46,.45); background:rgba(254,243,199,.7); }
:root[data-card-layout="parchment"] .fc-level .bar > i{ background:linear-gradient(90deg,#d97706,#fbbf24); }

:root[data-card-layout="circuit"] .frog-card{ background:linear-gradient(160deg,#020617,#0f172a,#1f2937); border:1px solid rgba(14,165,233,.55); box-shadow:0 18px 44px rgba(15,118,110,.55); color:#e2e8f0; position:relative; }
:root[data-card-layout="circuit"] .frog-card::after{ content:''; position:absolute; inset:0; background-image:linear-gradient(90deg,rgba(59,130,246,.15) 1px,transparent 1px),linear-gradient(0deg,rgba(14,165,233,.15) 1px,transparent 1px); background-size:28px 28px; opacity:.4; pointer-events:none; }
:root[data-card-layout="circuit"] .frog-card .row, :root[data-card-layout="circuit"] .frog-card .actions{ position:relative; }
:root[data-card-layout="circuit"] .frog-card .title{ font-family:'Share Tech Mono','Courier New',monospace; letter-spacing:.08em; text-transform:uppercase; color:#38bdf8; }
:root[data-card-layout="circuit"] .frog-card .meta{ color:rgba(148,163,184,.8); }
:root[data-card-layout="circuit"] .frog-card .thumb, :root[data-card-layout="circuit"] .frog-card canvas.frog-canvas{ background:linear-gradient(145deg,rgba(14,165,233,.45),rgba(56,189,248,.15)); border:1px solid rgba(56,189,248,.45); box-shadow:0 16px 32px rgba(8,47,73,.65); }
:root[data-card-layout="circuit"] .frog-card .attr-bullets li{ background:rgba(8,47,73,.7); border:1px solid rgba(56,189,248,.5); border-radius:10px; padding:7px 11px; color:#bae6fd; }
:root[data-card-layout="circuit"] .fc-level .lab{ color:rgba(148,163,184,.75); }
:root[data-card-layout="circuit"] .fc-level .bar{ border-color:rgba(56,189,248,.5); background:rgba(2,6,23,.8); }
:root[data-card-layout="circuit"] .fc-level .bar > i{ background:linear-gradient(90deg,#06b6d4,#818cf8); }

:root[data-card-layout="sunset"] .frog-card{ background:linear-gradient(160deg,#021431,#433878,#f97316,#facc15); border:1px solid rgba(251,191,36,.6); box-shadow:0 18px 38px rgba(125,29,82,.45); color:#fff7ed; }
:root[data-card-layout="sunset"] .frog-card .title{ font-family:'Bebas Neue',var(--font-ui); letter-spacing:.08em; color:#fde68a; text-transform:uppercase; }
:root[data-card-layout="sunset"] .frog-card .meta{ color:rgba(254,243,199,.85); }
:root[data-card-layout="sunset"] .frog-card .thumb, :root[data-card-layout="sunset"] .frog-card canvas.frog-canvas{ background:linear-gradient(145deg,rgba(251,191,36,.55),rgba(244,114,182,.35)); border:1px solid rgba(253,224,71,.55); box-shadow:0 16px 34px rgba(190,24,93,.45); border-radius:16px; }
:root[data-card-layout="sunset"] .frog-card .attr-bullets li{ background:rgba(67,56,118,.6); border:1px solid rgba(251,191,36,.45); border-radius:10px; padding:8px 12px; color:#fef3c7; }
:root[data-card-layout="sunset"] .fc-level .lab{ color:rgba(254,243,199,.78); }
:root[data-card-layout="sunset"] .fc-level .bar{ border-color:rgba(251,191,36,.45); background:rgba(30,27,75,.65); }
:root[data-card-layout="sunset"] .fc-level .bar > i{ background:linear-gradient(90deg,#f97316,#facc15); }
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
