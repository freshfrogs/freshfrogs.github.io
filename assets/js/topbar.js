// assets/js/topbar.js — sticky top button bar
(function(){
  'use strict';

  const MOUNT_ID = 'ffTopbarMount';
  const CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  const OPENSEA_URL = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';

  const TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };

  function h(el, attrs={}, html=''){
    const e=document.createElement(el);
    for (const [k,v] of Object.entries(attrs)) if (v!=null) e.setAttribute(k,v);
    e.innerHTML = html;
    return e;
  }
  const short = a=>!a?'':`${a.slice(0,6)}…${a.slice(-4)}`;

  function render(){
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    const bar = h('div', {class:'ff-topbar'}, `
      <button class="ff-pill" data-action="connect">Connect Wallet</button>
      <a class="ff-pill" data-action="opensea" href="${OPENSEA_URL}" target="_blank" rel="noopener">Shop on OpenSea</a>
      <button class="ff-pill" data-action="rankings">Rankings</button>
      <button class="ff-pill" data-action="pond">The Pond</button>
      <button class="ff-pill" data-action="mutate">Mutate</button>
    `);
    mount.innerHTML = '';
    mount.appendChild(bar);

    bar.addEventListener('click', onClick);

    if (window.Wallet?.getAddress) {
      const a = window.Wallet.getAddress(); if (a) setAddr(short(a));
    } else if (window.ethereum?.selectedAddress) {
      setAddr(short(window.ethereum.selectedAddress));
    }
  }

  function setAddr(txt){
    const b=document.querySelector('.ff-topbar [data-action="connect"]');
    if (b) b.textContent = txt || 'Connect Wallet';
  }

  async function connect(){
    try{
      if (window.Wallet?.connect){
        const a = await window.Wallet.connect(); if (a) setAddr(short(a));
        document.dispatchEvent(new CustomEvent('ff:wallet:ready', {detail:{address:a}}));
        return;
      }
      if (window.ethereum?.request){
        const [a] = await window.ethereum.request({method:'eth_requestAccounts'});
        if (a) setAddr(short(a));
        document.dispatchEvent(new CustomEvent('ff:wallet:ready', {detail:{address:a}}));
        return;
      }
      alert('No Ethereum wallet detected (e.g., MetaMask).');
    }catch(e){ console.warn('connect failed', e); }
  }

  function goto(kind){
    const sels = TARGETS[kind]||[];
    for (const s of sels){
      const el = document.querySelector(s);
      if (el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    const hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    const target = (kind==='mutate' && sels.includes('mutate.html'))?'mutate.html':`collection.html${hash}`;
    window.location.href = target;
  }

  function onClick(e){
    const a = e.target.closest('[data-action]'); if (!a) return;
    const k = a.getAttribute('data-action');
    if (k==='connect') return connect();
    if (k==='rankings') return goto('rankings');
    if (k==='pond')     return goto('pond');
    if (k==='mutate')   return goto('mutate');
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
  window.ethereum?.on?.('accountsChanged', acc => setAddr(short(acc?.[0]||'')));
})();
