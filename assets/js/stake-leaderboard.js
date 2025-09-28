// assets/js/stake-leaderboard.js
// Staking Leaderboard (last N days): counts "stake" actions (controller is recipient) and ranks wallets.
// Renders into <ol id="stakeLeaderboard">; no backend required.

(function(FF, CFG){
  'use strict';

  // --- Config / Endpoints ---
  const BASE        = (CFG.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const API         = BASE + '/users/activity/v6';
  const API_KEY     = (CFG.FROG_API_KEY || CFG.RESERVOIR_API_KEY || '').trim();
  const CONTROLLER  = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  const COLLECTION  = (CFG.COLLECTION_ADDRESS || '').trim();

  // Tunables (override via FF_CFG if desired)
  const LOOKBACK_DAYS = Number(CFG.LB_LOOKBACK_DAYS || 30); // counting window
  const PAGE_SIZE     = Math.max(1, Math.min(50, Number(CFG.LB_PAGE_SIZE || 25)));
  const MAX_PAGES     = Math.max(1, Number(CFG.LB_MAX_PAGES || 20)); // 20*25 = up to 500 recent items
  const TOP_N         = Math.max(3, Number(CFG.LB_TOP_N || 10));

  // --- Styles ---
  (function injectCSS(){
    if (document.getElementById('lb-css')) return;
    const css = `
#stakeLeaderboard{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
#stakeLeaderboard .lb-row{ display:grid; grid-template-columns: 28px 1fr auto; gap:10px; align-items:center; padding:8px 10px; border:1px solid var(--border); border-radius:10px; background: color-mix(in srgb, var(--panel) 25%, transparent); }
#stakeLeaderboard .lb-rank{ font-weight:800; color:var(--muted); text-align:center; }
#stakeLeaderboard .lb-addr{ display:flex; flex-direction:column; gap:2px; }
#stakeLeaderboard .lb-addr b{ font-family: var(--font-ui); font-weight:800; }
#stakeLeaderboard .lb-addr small{ color:var(--muted); }
#stakeLeaderboard .lb-score{ font-weight:800; padding:4px 8px; border-radius:999px; border:1px solid var(--border); }
@media (max-width:700px){
  #stakeLeaderboard .lb-row{ grid-template-columns: 24px 1fr auto; }
}`;
    const el=document.createElement('style'); el.id='lb-css'; el.textContent=css; document.head.appendChild(el);
  })();

  // --- Ensure shared Reservoir queue (reuse if already present) ---
  (function ensureQueue(){
    if (window.FF_RES_QUEUE) return;
    const RATE_MIN_MS = Number(CFG.RATE_MIN_MS || 800);
    const BACKOFFS    = Array.isArray(CFG.RETRY_BACKOFF_MS) ? CFG.RETRY_BACKOFF_MS : [900,1700,3200];
    let lastAt=0, chain=Promise.resolve();
    const sleep=(ms)=> new Promise(r=>setTimeout(r,ms));
    async function spaced(url, init){ const d=Date.now()-lastAt; if(d<RATE_MIN_MS) await sleep(RATE_MIN_MS-d); lastAt=Date.now(); return fetch(url, init); }
    async function run(url, init){
      const hdrs = Object.assign({}, (FF.apiHeaders?.() || { accept:'application/json', 'x-api-key': API_KEY }), init?.headers || {});
      let i=0;
      while(true){
        const res = await spaced(url, { headers: hdrs });
        if (res.status===429){ await sleep(BACKOFFS[Math.min(i++,BACKOFFS.length-1)]); continue; }
        if (!res.ok){ const t=await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status}${t?' — '+t:''}`); }
        return res.json();
      }
    }
    window.FF_RES_QUEUE = { fetch:(url,init)=> (chain = chain.then(()=> run(url,init))) };
  })();

  // --- Helpers ---
  const shorten = (a)=> (FF.shorten?.(a)) || (a ? a.slice(0,6)+'…'+a.slice(-4) : '—');
  const sinceMs = Date.now() - LOOKBACK_DAYS*24*3600*1000;

  function mapRow(a){
    // Reservoir activity rows are a bit heterogenous; normalize what we need.
    const type = a?.event?.kind || a?.type;
    if (type !== 'transfer') return null;

    const from = (a?.event?.fromAddress || a?.fromAddress || a?.from || '').toLowerCase();
    const to   = (a?.event?.toAddress   || a?.toAddress   || a?.to   || '').toLowerCase();

    // "Stake" is a transfer where the controller receives the NFT
    if (to !== CONTROLLER) return null;

    const tokenId = Number(a?.token?.tokenId ?? a?.tokenId);
    const ts = a?.timestamp ?? a?.createdAt;
    let tms = null;
    if (typeof ts === 'number') tms = (ts < 1e12 ? ts*1000 : ts);
    else if (typeof ts === 'string'){ const p=Date.parse(ts); if(!isNaN(p)) tms=p; }

    return { tokenId, staker: from, tms };
  }

  async function fetchPage(continuation){
    const qs = new URLSearchParams({
      users: CONTROLLER,             // track activity involving controller
      collection: COLLECTION,
      types: 'transfer',
      limit: String(PAGE_SIZE),
    });
    if (continuation) qs.set('continuation', continuation);
    const json = await window.FF_RES_QUEUE.fetch(API + '?' + qs.toString());
    const rows = (json?.activities || []).map(mapRow).filter(Boolean);
    return { rows, continuation: json?.continuation || null };
  }

  function root(){ return document.getElementById('stakeLeaderboard'); }
  function paint(list){
    const ul = root(); if (!ul) return;
    ul.innerHTML = '';
    if (!list.length){
      ul.innerHTML = '<div class="pg-muted">No recent staking activity.</div>';
      return;
    }
    list.forEach((it, i)=>{
      const li = document.createElement('li');
      li.className = 'lb-row';
      li.innerHTML = `
        <div class="lb-rank">${i+1}</div>
        <div class="lb-addr">
          <b>${shorten(it.addr)}</b>
          <small>${it.addr}</small>
        </div>
        <div class="lb-score" title="Stake actions in last ${LOOKBACK_DAYS}d">${it.count}</div>
      `;
      ul.appendChild(li);
    });
  }

  async function build(){
    const ul = root(); if (!ul) return;
    ul.innerHTML = '<div class="pg-muted">Building leaderboard…</div>';

    let cont=null, page=0;
    const counts = new Map(); // addr -> stake count

    while(page < MAX_PAGES){
      page++;
      const { rows, continuation } = await fetchPage(cont);
      cont = continuation;

      for (const r of rows){
        if (!r || r.tms==null || r.tms < sinceMs) continue; // inside lookback window
        const key = r.staker?.toLowerCase(); if (!key) continue;
        counts.set(key, (counts.get(key)||0) + 1);
      }
      if (!cont) break; // no more pages
    }

    const top = Array.from(counts.entries())
      .map(([addr, count])=> ({ addr, count }))
      .sort((a,b)=> b.count - a.count)
      .slice(0, TOP_N);

    paint(top);
  }

  document.addEventListener('DOMContentLoaded', build);

})(window.FF = window.FF || {}, window.FF_CFG = window.FF_CFG || {});
