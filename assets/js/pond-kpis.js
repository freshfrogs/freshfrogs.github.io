// assets/js/pond-kpis.js — robust Total Staked + KPI fixes
// Order of truth: (1) controller method if CFG.TOTAL_STAKED_METHOD set
//                 (2) on-chain sum of ERC721.balanceOf(controller_i)
//                 (3) Reservoir owners/tokens fallback
(function () {
  'use strict';

  // ---------- constants ----------
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
  const FALLBACK_RPC = 'https://cloudflare-eth.com';

  // ---------- helpers ----------
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  const byId = (id)=> document.getElementById(id);
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

  // ---------- config discovery ----------
  const CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  function getCollection(){ return String(CFG.COLLECTION_ADDRESS || CFG.collectionAddress || '').trim(); }
  function getControllers(){
    let many = CFG.CONTROLLER_ADDRESSES || CFG.controllerAddresses;
    const one = CFG.CONTROLLER_ADDRESS || CFG.controllerAddress
      || $('#stakedController')?.href?.match(/0x[a-fA-F0-9]{40}/)?.[0] || '';
    if (!Array.isArray(many)) many = one ? [one] : [];
    return [...new Set(many.filter(Boolean).map(s=>String(s).toLowerCase()))];
  }
  function apiHeaders(){
    const h = { accept: '*/*' };
    const key = CFG.FROG_API_KEY || window.RESERVOIR_API_KEY;
    if (key) h['x-api-key'] = key;
    return h;
  }

  // ---------- web3 ----------
  function makeWeb3(){
    if (!window.Web3){ console.warn('[pond-kpis] Web3 not found'); return null; }
    const provider =
      (window.web3 && window.web3.currentProvider) ||
      window.ethereum ||
      (CFG.RPC_URL ? new window.Web3.providers.HttpProvider(CFG.RPC_URL)
                   : new window.Web3.providers.HttpProvider(FALLBACK_RPC));
    try { return new window.Web3(provider); } catch(e){ console.warn('[pond-kpis] Web3 init failed', e); return null; }
  }

  // ---------- UI priming ----------
  function primeUI(){
    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // Rewards link
    const third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third){
      const lab = third.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      const iv = third.querySelector('.iv');
      if (iv){
        let a = iv.querySelector('#pondRewardsLink');
        if (!a){ a=document.createElement('a'); a.id='pondRewardsLink'; a.target='_blank'; a.rel='noopener'; a.href=FLYZ_URL; a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>'; iv.textContent=''; iv.appendChild(a); }
        else { a.href=FLYZ_URL; a.target='_blank'; a.rel='noopener'; if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>'; }
      }
    }

    // Remove Notes, if present
    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();
  }

  function fillControllerBox(){
    const a = byId('stakedController'); if (!a) return;
    const addr = getControllers()[0];
    if (!addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // ---------- on-chain reads ----------
  // (1) Controller method if provided: e.g., CFG.TOTAL_STAKED_METHOD = 'totalStaked'
  async function totalViaControllerMethod(){
    const method = CFG.TOTAL_STAKED_METHOD || CFG.totalStakedMethod;
    const controller = getControllers()[0];
    const abi = (window.CONTROLLER_ABI || window.ControllerABI || window.ABI_CONTROLLER);
    if (!method || !controller || !abi) throw new Error('controller method unavailable');
    const w3 = makeWeb3(); if (!w3) throw new Error('no web3');
    const ctr = new w3.eth.Contract(abi, controller);
    if (!ctr.methods[method]) throw new Error('method not in ABI');
    const v = await ctr.methods[method]().call();
    return String(v);
  }

  // (2) Sum ERC-721 balanceOf(controller_i) on the collection
  async function totalViaBalanceOf(){
    const collection = getCollection();
    const controllers = getControllers();
    if (!collection || !controllers.length) throw new Error('missing collection/controller');
    const w3 = makeWeb3(); if (!w3) throw new Error('no web3');
    const ERC721 = [{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"}];
    const nft = new w3.eth.Contract(ERC721, collection);
    let total = 0n;
    for (const addr of controllers){
      const n = await nft.methods.balanceOf(addr).call();
      total += BigInt(typeof n === 'string' ? n : n ?? 0);
    }
    return total.toString();
  }

  // (3) Reservoir fallback
  async function totalViaReservoir(){
    const collection = (getCollection() || '').toLowerCase();
    const controllers = getControllers().map(s=>s.toLowerCase());
    if (!collection || !controllers.length) throw new Error('missing addresses');

    // owners/v2
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

    // tokens/v10 paging
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
    throw new Error('reservoir failed');
  }

  async function fillTotalStaked(){
    const out = byId('stakedTotal'); if (!out) return;

    // Try explicit controller method first (if configured)
    try{ const v = await totalViaControllerMethod(); out.textContent = fmtInt(v); return; }catch{}

    // Then authoritative on-chain balanceOf
    try{ const v = await totalViaBalanceOf(); out.textContent = fmtInt(v); return; }catch(e){ console.warn('[pond-kpis] balanceOf fallback → reservoir', e?.message||e); }

    // Finally Reservoir
    try{ const v = await totalViaReservoir(); out.textContent = fmtInt(v); return; }catch(e){ console.warn('[pond-kpis] reservoir failed', e?.message||e); }

    if (!out.textContent || out.textContent.trim()==='') out.textContent = '—';
  }

  async function refresh(){
    primeUI();
    fillControllerBox();
    await fillTotalStaked();
  }

  window.PondKPIs = { refresh };

  const kick = ()=> refresh().catch(()=>{});
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
