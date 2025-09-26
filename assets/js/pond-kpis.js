// assets/js/pond-kpis.js — authoritative Total Staked via on-chain balanceOf(controller)
// Also fills Controller link, enforces FLYZ link, sets label to "🌿 Total Staked".
// Falls back to Reservoir if RPC fails; supports multiple controller addresses.
(function () {
  'use strict';

  // ---- theme / UI constants ----
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // ---- DOM helpers ----
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  const byId = (id)=> document.getElementById(id);

  // ---- formatting ----
  const shorten = (a)=>!a?'—':String(a).slice(0,6)+'…'+String(a).slice(-4);
  const fmtInt  = (v)=>{
    try{
      if (v && typeof v==='object' && 'toString' in v) v = v.toString();
      if (typeof v==='string'){ if (v.includes('.')) v=v.split('.')[0]; return Number.isFinite(+v)?(+v).toLocaleString():v.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
      if (typeof v==='bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
      if (typeof v==='number') return Math.floor(v).toLocaleString();
      return String(v ?? '—');
    }catch{ return String(v ?? '—'); }
  };

  // ---- read config from multiple places (tolerant) ----
  const CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});

  function getCollectionAddress(){
    // Try globals then data- attributes
    const fromGlobal = CFG.COLLECTION_ADDRESS || CFG.collectionAddress;
    if (fromGlobal) return String(fromGlobal);
    const dataEl = document.querySelector('[data-collection-address]');
    if (dataEl?.dataset?.collectionAddress) return String(dataEl.dataset.collectionAddress);
    return ''; // must be provided by your site
  }

  function getControllerAddresses(){
    // Support array or single string on multiple globals
    let many = CFG.CONTROLLER_ADDRESSES || CFG.controllerAddresses;
    const one = CFG.CONTROLLER_ADDRESS || CFG.controllerAddress
      || $('#stakedController')?.href?.match(/0x[a-fA-F0-9]{40}/)?.[0] || '';
    if (!Array.isArray(many)) many = one ? [one] : [];
    const arr = many.filter(Boolean).map(s=>String(s).toLowerCase());
    return [...new Set(arr)];
  }

  // ---- Web3 init (wallet -> custom RPC -> Cloudflare public) ----
  function makeWeb3(){
    if (!window.Web3){ console.warn('[pond-kpis] Web3 not present'); return null; }
    const prov =
      (window.web3 && window.web3.currentProvider) ||
      window.ethereum ||
      (CFG.RPC_URL ? new window.Web3.providers.HttpProvider(CFG.RPC_URL) :
                     new window.Web3.providers.HttpProvider('https://cloudflare-eth.com'));
    try { return new window.Web3(prov); } catch(e){ console.warn('[pond-kpis] Web3 init failed', e); return null; }
  }

  // ---- On-chain: sum ERC721.balanceOf(controller) for each controller ----
  async function totalStakedOnChain(){
    const collection = getCollectionAddress();
    const controllers = getControllerAddresses();
    if (!collection || !controllers.length) throw new Error('Missing COLLECTION_ADDRESS or CONTROLLER_ADDRESS');
    const w3 = makeWeb3(); if (!w3) throw new Error('No web3');

    // Minimal ERC-721 ABI
    const ERC721 = [{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"}];
    const nft = new w3.eth.Contract(ERC721, collection);
    let total = 0n;
    for (const addr of controllers){
      const n = await nft.methods.balanceOf(addr).call();
      const bi = (typeof n === 'string') ? BigInt(n) : BigInt(n ?? 0);
      total += bi;
    }
    return total.toString();
  }

  // ---- Reservoir fallback (owners aggregate, then tokens paged) ----
  function apiHeaders(){
    const h = { accept: '*/*' };
    const key = CFG.FROG_API_KEY || window.RESERVOIR_API_KEY;
    if (key) h['x-api-key'] = key; // optional
    return h;
  }
  function lower(s){ return String(s).toLowerCase(); }

  async function totalStakedReservoir(){
    const collection = lower(getCollectionAddress());
    const controllers = getControllerAddresses().map(lower);
    if (!collection || !controllers.length) throw new Error('Missing addresses');

    // Fast aggregate via owners/v2
    let fast = 0;
    try{
      for (const c of controllers){
        const u = `https://api.reservoir.tools/owners/v2?collection=${collection}&owner=${c}&limit=1`;
        const r = await fetch(u, { headers: apiHeaders() });
        if (!r.ok) throw new Error('owners/v2 '+r.status);
        const j = await r.json();
        const row = (j.owners || j.ownerships || [])[0] || {};
        const cnt = row.tokenCount ?? row?.ownership?.tokenCount ?? row?.ownerships?.[0]?.tokenCount ?? 0;
        fast += Number(cnt||0);
      }
    }catch{ fast = NaN; }

    // Exact via tokens/v10 (paged)
    let exact = 0;
    try{
      for (const c of controllers){
        let cont=null, sub=0, guard=0;
        do{
          const base=`https://api.reservoir.tools/tokens/v10?collection=${collection}&owner=${c}&limit=1000&includeTopBid=false`;
          const url = cont ? `${base}&continuation=${encodeURIComponent(cont)}` : base;
          const r = await fetch(url, { headers: apiHeaders() });
          if (!r.ok) throw new Error('tokens/v10 '+r.status);
          const j = await r.json();
          sub += (j.tokens||[]).length;
          cont = j.continuation || null;
          guard++;
        }while(cont && guard<10);
        exact += sub;
      }
    }catch{ exact = NaN; }

    if (Number.isFinite(exact)) return String(exact);
    if (Number.isFinite(fast))  return String(fast);
    throw new Error('Reservoir failed');
  }

  // ---- UI priming & fills ----
  function primeUI(){
    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // Rewards link
    const third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third) {
      const lab = third.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      const iv = third.querySelector('.iv');
      if (iv){
        let a = iv.querySelector('#pondRewardsLink');
        if (!a){ a=document.createElement('a'); a.id='pondRewardsLink'; a.target='_blank'; a.rel='noopener'; a.href=FLYZ_URL; a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>'; iv.textContent=''; iv.appendChild(a); }
        else { a.href=FLYZ_URL; a.target='_blank'; a.rel='noopener'; if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>'; }
      }
    }

    // Remove Notes box if present
    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();
  }

  function fillControllerBox(){
    const a = byId('stakedController');
    const addr = getControllerAddresses()[0];
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  async function fillTotalStaked(){
    const out = byId('stakedTotal'); if (!out) return;

    // 1) Ground truth: on-chain balanceOf
    try{
      const raw = await totalStakedOnChain();
      out.textContent = fmtInt(raw);
      return;
    }catch(e){
      console.warn('[pond-kpis] on-chain failed → Reservoir fallback:', e?.message||e);
    }

    // 2) Fallback: Reservoir
    try{
      const raw = await totalStakedReservoir();
      out.textContent = fmtInt(raw);
      return;
    }catch(e){
      console.warn('[pond-kpis] Reservoir failed:', e?.message||e);
    }

    if (!out.textContent || out.textContent.trim()==='') out.textContent = '—';
  }

  async function refresh(){
    primeUI();
    fillControllerBox();
    await fillTotalStaked();
  }

  // public trigger
  window.PondKPIs = { refresh };

  // kick & re-run on app events
  const kick = ()=> refresh().catch(()=>{});
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
