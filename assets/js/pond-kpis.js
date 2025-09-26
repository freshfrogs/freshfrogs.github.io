// assets/js/pond-kpis.js — robust KPIs (on-chain with public RPC, Reservoir fallback)
(function () {
  'use strict';

  const C = window.FF_CFG || {};
  const FALLBACK_RPC = 'https://cloudflare-eth.com';
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // DOM helpers
  const byId = (id) => document.getElementById(id);
  const $ = (sel, p=document) => p.querySelector(sel);
  const $$ = (sel, p=document) => Array.from(p.querySelectorAll(sel));
  const shorten = (a)=>!a?'—':String(a).slice(0,6)+'…'+String(a).slice(-4);
  const fmtInt = (v)=> {
    try{
      if (v && typeof v==='object' && 'toString' in v) v = v.toString();
      if (typeof v==='string'){ if (v.includes('.')) v=v.split('.')[0]; return Number.isFinite(+v)?(+v).toLocaleString():v.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
      if (typeof v==='bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
      if (typeof v==='number') return Math.floor(v).toLocaleString();
      return String(v ?? '—');
    }catch{ return String(v ?? '—'); }
  };

  // API headers (Reservoir optional)
  function apiHeaders(){
    const h={accept:'*/*'};
    const key = C.FROG_API_KEY || window.RESERVOIR_API_KEY;
    if (key) h['x-api-key']=key;
    return h;
  }

  // UI priming: label, flyz link, remove Notes, rename Owned->Dashboard (if present)
  function primeUI(){
    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

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

    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();

    // Optional rename of "My Frogs (Owned)" if that header exists
    const heads = $$('#ownedPanel .panel-title, .owned-panel .panel-title, h2.panel-title');
    const owned = heads.find(h=>/My Frogs\s*\(Owned\)/i.test(h.textContent));
    if (owned) owned.textContent = 'Dashboard';
  }

  // Controller box
  function fillControllerBox(){
    const a = byId('stakedController');
    const addr = (C.CONTROLLER_ADDRESS || '').toLowerCase();
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // Web3 provider (wallet -> FF_CFG.RPC_URL -> public)
  function makeWeb3(){
    if (!window.Web3){ console.warn('[pond-kpis] Web3 not on page'); return null; }
    const provider =
      (window.web3 && window.web3.currentProvider) ||
      window.ethereum ||
      (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : new window.Web3.providers.HttpProvider(FALLBACK_RPC));
    try{ return new window.Web3(provider); }catch(e){ console.warn('[pond-kpis] Web3 init failed', e); return null; }
  }

  // On-chain: ERC-721 balanceOf(controller)
  async function getTotalStakedOnChain(){
    if (!C.COLLECTION_ADDRESS || !C.CONTROLLER_ADDRESS) throw new Error('Missing COLLECTION_ADDRESS or CONTROLLER_ADDRESS');
    const w3 = makeWeb3(); if (!w3) throw new Error('No web3');
    const erc721 = new w3.eth.Contract(
      [{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":""}],"stateMutability":"view","type":"function"}],
      C.COLLECTION_ADDRESS
    );
    const n = await erc721.methods.balanceOf(C.CONTROLLER_ADDRESS).call();
    return n;
  }

  // Reservoir fallback: owners aggregate (fast) or tokens paging (exact)
  async function getTotalStakedReservoir(){
    const collection = (C.COLLECTION_ADDRESS || '').toLowerCase();
    const controller = (C.CONTROLLER_ADDRESS || '').toLowerCase();
    if (!collection || !controller) throw new Error('Missing addresses');

    // try owners/v2 (fast)
    try{
      const u = `https://api.reservoir.tools/owners/v2?collection=${collection}&owner=${controller}&limit=1`;
      const r = await fetch(u, {headers: apiHeaders()});
      if (r.ok){
        const j = await r.json();
        const row = (j.owners || j.ownerships || [])[0] || {};
        const cnt = row.tokenCount ?? row?.ownership?.tokenCount ?? row?.ownerships?.[0]?.tokenCount ?? 0;
        return String(cnt);
      }
    }catch(_){}

    // fallback tokens/v10 (paged)
    let cont=null, total=0, guard=0;
    do{
      const base=`https://api.reservoir.tools/tokens/v10?collection=${collection}&owner=${controller}&limit=1000&includeTopBid=false`;
      const url = cont ? `${base}&continuation=${encodeURIComponent(cont)}` : base;
      const r = await fetch(url, {headers: apiHeaders()});
      if (!r.ok) throw new Error('tokens/v10 failed '+r.status);
      const j = await r.json();
      total += (j.tokens||[]).length;
      cont = j.continuation || null;
      guard++;
    }while(cont && guard<10);
    return String(total);
  }

  async function fillTotalStaked(){
    const out = byId('stakedTotal'); if (!out) return;

    // 1) Try on-chain (authoritative)
    try{
      const raw = await getTotalStakedOnChain();
      out.textContent = fmtInt(raw);
      const stamp = byId('stakedUpdated'); if (stamp) stamp.textContent = new Date().toLocaleTimeString();
      return;
    }catch(e){
      console.warn('[pond-kpis] on-chain balanceOf fallback to Reservoir', e?.message || e);
    }

    // 2) Fallback to Reservoir
    try{
      const raw = await getTotalStakedReservoir();
      out.textContent = fmtInt(raw);
      const stamp = byId('stakedUpdated'); if (stamp) stamp.textContent = new Date().toLocaleTimeString();
    }catch(e){
      console.warn('[pond-kpis] Reservoir failed', e);
      if (!out.textContent || out.textContent.trim()==='') out.textContent = '—';
    }
  }

  async function refresh(){
    primeUI();
    fillControllerBox();
    await fillTotalStaked();
  }

  // expose manual trigger
  window.PondKPIs = { refresh };

  // init / re-run
  const kick = ()=> refresh().catch(()=>{});
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
