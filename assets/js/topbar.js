// assets/js/topbar.js — centered, compact button row matching dashboard style
// No container background, smaller buttons, light rounding; per-button theme colors.
(function(){
  'use strict';

  const CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  const OPENSEA_URL = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  const ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL || (CFG.COLLECTION_ADDRESS ? `https://etherscan.io/address/${CFG.COLLECTION_ADDRESS}` : 'https://etherscan.io/');

  const TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };

  // Inject minimal CSS so you don't have to edit styles.css
  function injectStyles(){
    if (document.getElementById('ff-topbar-css')) return;
    const css = `
      /* container: no background, centered */
      .ff-topbar { display:flex; justify-content:center; align-items:center; gap:8px; padding:8px 0; }
      /* compact button like dashboard: thin border, small radius, small font */
      .ff-btn { -webkit-tap-highlight-color:transparent; display:inline-flex; align-items:center; justify-content:center;
        padding:6px 10px; font:inherit; font-size:0.92rem; line-height:1; letter-spacing:.2px;
        border:1px solid var(--border,#2a2a31); border-radius:8px; background:transparent; color:var(--ink,#d7d7df);
        cursor:pointer; text-decoration:none; transition:background-color .12s ease, border-color .12s ease, color .12s ease, transform .04s ease; }
      .ff-btn:active { transform: translateY(1px); }
      /* themed outlines with subtle fill on hover — shades tuned to your palette */
      .is-connect { --c: var(--green,#35c46a); color: var(--ink,#e7ffe7); border-color: color-mix(in srgb, var(--c), #000 70%); background: color-mix(in srgb, var(--c), transparent 92%); }
      .is-connect:hover { background: color-mix(in srgb, var(--c), transparent 82%); border-color: color-mix(in srgb, var(--c), #000 55%); }
      .is-pond { --c: color-mix(in srgb, var(--green,#35c46a), #0a0a0f 35%); color: var(--ink,#d7f7e1); border-color: color-mix(in srgb, var(--c), #000 70%); background: color-mix(in srgb, var(--c), transparent 93%); }
      .is-pond:hover { background: color-mix(in srgb, var(--c), transparent 83%); border-color: color-mix(in srgb, var(--c), #000 55%); }
      .is-opensea { --c: var(--blue,#47a5ff); color: var(--ink,#e7f3ff); border-color: color-mix(in srgb, var(--c), #000 70%); background: color-mix(in srgb, var(--c), transparent 93%); }
      .is-opensea:hover { background: color-mix(in srgb, var(--c), transparent 83%); border-color: color-mix(in srgb, var(--c), #000 55%); }
      .is-etherscan { --c: var(--muted,#8b8f99); color: var(--ink,#e6e7ea); border-color: color-mix(in srgb, var(--c), #000 65%); background: color-mix(in srgb, var(--c), transparent 94%); }
      .is-etherscan:hover { background: color-mix(in srgb, var(--c), transparent 85%); border-color: color-mix(in srgb, var(--c), #000 50%); }
      .is-mutate { --c: var(--red,#ff6a3a); color: var(--ink,#ffece7); border-color: color-mix(in srgb, var(--c), #000 70%); background: color-mix(in srgb, var(--c), transparent 93%); }
      .is-mutate:hover { background: color-mix(in srgb, var(--c), transparent 83%); border-color: color-mix(in srgb, var(--c), #000 55%); }
      .is-rankings { --c: var(--amber,#ffb84a); color: var(--ink,#fff7e8); border-color: color-mix(in srgb, var(--c), #000 70%); background: color-mix(in srgb, var(--c), transparent 93%); }
      .is-rankings:hover { background: color-mix(in srgb, var(--c), transparent 83%); border-color: color-mix(in srgb, var(--c), #000 55%); }
      @media (max-width:720px){ .ff-topbar{gap:6px; padding:6px 0} .ff-btn{padding:6px 9px; font-size:.9rem} }
    `.trim();
    const style = document.createElement('style');
    style.id = 'ff-topbar-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureMount(){
    let m = document.querySelector('.ff-topbar');
    if (m) return m;
    const host = document.createElement('div');
    host.className = 'ff-topbar';
    // insert at top, but without any container background
    document.body.insertBefore(host, document.body.firstChild);
    return host;
  }

  const short = a=>!a?'':`${a.slice(0,6)}…${a.slice(-4)}`;

  function render(){
    injectStyles();
    const bar = ensureMount();
    bar.innerHTML = `
      <button class="ff-btn is-connect" data-action="connect">Connect Wallet</button>
      <a class="ff-btn is-opensea" href="${OPENSEA_URL}" target="_blank" rel="noopener">Shop on OpenSea</a>
      <a class="ff-btn is-etherscan" href="${ETHERSCAN_URL}" target="_blank" rel="noopener">Etherscan</a>
      <button class="ff-btn is-rankings" data-action="rankings">Rankings</button>
      <button class="ff-btn is-pond" data-action="pond">The Pond</button>
      <button class="ff-btn is-mutate" data-action="mutate">Mutate</button>
    `;
    bar.addEventListener('click', onClick);

    if (window.Wallet?.getAddress){
      const a = window.Wallet.getAddress(); if (a) setAddr(short(a));
    } else if (window.ethereum?.selectedAddress){
      setAddr(short(window.ethereum.selectedAddress));
    }
  }

  function setAddr(txt){
    const b = document.querySelector('.ff-btn.is-connect');
    if (b) b.textContent = txt || 'Connect Wallet';
  }

  async function connect(){
    try{
      if (window.Wallet?.connect){
        const a = await window.Wallet.connect(); if (a) setAddr(short(a));
        document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
        return;
      }
      if (window.ethereum?.request){
        const [a] = await window.ethereum.request({method:'eth_requestAccounts'});
        if (a) setAddr(short(a));
        document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
        return;
      }
      alert('No Ethereum wallet detected (e.g., MetaMask).');
    }catch(e){ console.warn('connect failed', e); }
  }

  const TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };

  function go(kind){
    const sels = TARGETS[kind] || [];
    for (const s of sels){
      const el = document.querySelector(s);
      if (el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    const hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    const target = (kind==='mutate' && sels.includes('mutate.html')) ? 'mutate.html' : `collection.html${hash}`;
    window.location.href = target;
  }

  function onClick(ev){
    const a = ev.target.closest('[data-action]'); if (!a) return;
    const act = a.getAttribute('data-action');
    if (act==='connect') return connect();
    if (act==='rankings') return go('rankings');
    if (act==='pond')     return go('pond');
    if (act==='mutate')   return go('mutate');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
  window.ethereum?.on?.('accountsChanged', acc => setAddr(short(acc?.[0]||'')));
})();
