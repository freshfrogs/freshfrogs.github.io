// assets/js/pond-kpis.js — hard-proof Σ balanceOf(controller) and write into KPI.
// Only uses JSON-RPC; no wallet/Web3/ABI. Adds clear console logs.
// Addresses are read from window.CFG; if missing, it uses the hard-wired defaults below.

(function(){
  'use strict';

  // ---- REQUIRED ADDRS (overridden by window.CFG if present) ----
  const DEFAULTS = {
    COLLECTION_ADDRESS: (window.CFG && window.CFG.COLLECTION_ADDRESS) || '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b',
    CONTROLLER_ADDRESSES: (window.CFG && (window.CFG.CONTROLLER_ADDRESSES || (window.CFG.CONTROLLER_ADDRESS ? [window.CFG.CONTROLLER_ADDRESS] : null))) || ['0xcb1ee125cff4051a10a55a09b10613876c4ef199'],
    RPC_URL: (window.CFG && window.CFG.RPC_URL) || 'https://cloudflare-eth.com'
  };

  // ---- tiny utils ----
  const $ = (s,p)=> (p||document).querySelector(s);
  const $$ = (s,p)=> Array.from((p||document).querySelectorAll(s));

  function hexToBI(hex){ if(!hex || hex==='0x') return 0n; return BigInt(hex); }
  function pad32(addr){ const a = String(addr).replace(/^0x/,'').toLowerCase(); return '0'.repeat(64-a.length)+a; }
  function fmtInt(v){ try{ const n = typeof v==='bigint' ? v : BigInt(String(v)); return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }catch{ return String(v); } }

  async function rpc(url, body){
    const r = await fetch(url, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)});
    if (!r.ok) throw new Error('RPC HTTP '+r.status);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message||'RPC error');
    return j.result;
  }

  async function balanceOf(collection, owner, rpcUrl){
    const data = '0x70a08231' + pad32(owner); // balanceOf(address)
    const res = await rpc(rpcUrl, {jsonrpc:'2.0', id:1, method:'eth_call', params:[{to:collection, data}, 'latest']});
    return hexToBI(res);
  }

  // find the KPI value node robustly
  function getTotalTarget(){
    // prefer #stakedTotal if it exists
    const el = document.getElementById('stakedTotal');
    if (el) return el;
    // else: first .info-grid-2 .info-block value cell
    const guess = $('.info-grid-2 .info-block:nth-child(1) .iv');
    if (guess) return guess;
    // final: any .info-block containing the word "Total" as label
    const blocks = $$('.info-grid-2 .info-block');
    for (const b of blocks){
      const label = b.querySelector('.ik'); if (label && /total/i.test(label.textContent||'')) {
        const v = b.querySelector('.iv'); if (v) return v;
      }
    }
    return null;
  }

  async function fill(){
    const collection = (window.CFG?.COLLECTION_ADDRESS || DEFAULTS.COLLECTION_ADDRESS || '').toLowerCase();
    let controllers = window.CFG?.CONTROLLER_ADDRESSES || DEFAULTS.CONTROLLER_ADDRESSES || [];
    controllers = Array.isArray(controllers) ? controllers : [controllers];
    controllers = controllers.map(a => String(a||'').toLowerCase()).filter(Boolean);

    const out = getTotalTarget();
    if (!out){ console.warn('[pond-kpis] KPI target not found.'); return; }

    // label enforcement (optional)
    const label = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (label) label.textContent = '🌿 Total Staked';

    // sanity logs
    console.log('[pond-kpis] collection:', collection);
    console.log('[pond-kpis] controllers:', controllers);
    console.log('[pond-kpis] rpc:', (window.CFG?.RPC_URL || DEFAULTS.RPC_URL));

    // guard rails
    const addrOk = a => /^0x[a-f0-9]{40}$/.test(a);
    if (!addrOk(collection)){ console.error('[pond-kpis] bad collection address'); out.textContent='—'; return; }
    if (!controllers.length || !controllers.every(addrOk)){ console.error('[pond-kpis] bad controller address(es)'); out.textContent='—'; return; }

    // try primary RPC, then a couple of common fallbacks if blocked
    const rpcCandidates = [
      (window.CFG?.RPC_URL || DEFAULTS.RPC_URL),
      'https://mainnet.gateway.tenderly.co',
      'https://rpc.ankr.com/eth'
    ];

    let total = 0n, lastErr=null;
    for (const rpcUrl of rpcCandidates){
      try{
        const parts = await Promise.all(controllers.map(c => balanceOf(collection, c, rpcUrl).catch(()=>0n)));
        total = parts.reduce((a,b)=>a+b, 0n);
        console.log('[pond-kpis] parts:', parts.map(x=>x.toString()), 'sum:', total.toString(), 'via', rpcUrl);
        break;
      }catch(e){
        lastErr = e;
        console.warn('[pond-kpis] RPC failed at', rpcUrl, e?.message||e);
      }
    }

    if (total === 0n && lastErr){
      // likely blocked RPC; keep UI graceful
      out.textContent = '—';
      return;
    }
    out.textContent = fmtInt(total);
  }

  function init(){
    // set controller box if present
    const a = document.getElementById('stakedController');
    if (a){
      const ctrl = (window.CFG?.CONTROLLER_ADDRESSES || window.CFG?.CONTROLLER_ADDRESS || DEFAULTS.CONTROLLER_ADDRESSES[0]);
      if (ctrl) { a.href = 'https://etherscan.io/address/'+ctrl; a.textContent = (ctrl.slice(0,6)+'…'+ctrl.slice(-4)); }
    }
    fill().catch(e=>{ console.warn('[pond-kpis] fill error', e); });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  document.addEventListener('ff:staking:update', init);
})();
