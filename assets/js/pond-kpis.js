// assets/js/pond-kpis.js — drop-in replacement
(function(){
  'use strict';

  // ---- constants ----
  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // ---- dom helpers ----
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // ---- formatting helpers ----
  function formatInt(v){
    try{
      if (typeof v === 'object' && v !== null && 'toString' in v) v = v.toString();
      if (typeof v === 'string') {
        if (v.includes('.')) v = v.split('.')[0];
        // add thousands separators
        return Number.isSafeInteger(+v) ? (+v).toLocaleString() : v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      if (typeof v === 'bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (typeof v === 'number') return Math.floor(v).toLocaleString();
      return String(v);
    }catch{
      return String(v ?? '—');
    }
  }

  function shorten(addr){
    if (!addr) return '—';
    const s = String(addr);
    return s.slice(0,6) + '…' + s.slice(-4);
  }

  // ---- UI setup (labels, link, remove notes, blurb) ----
  function primeUI(){
    // Pond blurb (shorter description)
    const blurb = $('.pg-muted');
    if (blurb) {
      blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';
    }

    // Emoji for first KPI
    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Frogs Staked';

    // Ensure Rewards link with emoji label
    const third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third) {
      const label = third.querySelector('.ik');
      if (label) label.textContent = '🪙 Rewards';
      const iv = third.querySelector('.iv');
      if (iv) {
        let a = iv.querySelector('#pondRewardsLink');
        if (!a) {
          a = document.createElement('a');
          a.id = 'pondRewardsLink';
          a.target = '_blank';
          a.rel = 'noopener';
          a.href = FLYZ_URL;
          a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          iv.textContent = '';
          iv.appendChild(a);
        } else {
          a.href = FLYZ_URL;
          a.target = '_blank';
          a.rel = 'noopener';
          if (!a.querySelector('#pondRewardsSymbol')) {
            a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          }
        }
      }
    }

    // Remove 4th info box (Notes), if present
    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove();
  }

  // ---- data fills ----
  async function fillController(){
    const a = $('#stakedController');
    const addr = window?.CFG?.CONTROLLER_ADDRESS;
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  async function fillTotalStaked(){
    const outEl = $('#stakedTotal');
    if (!outEl) return;

    // Prefer your app’s adapters if present
    try{
      if (window.FF_STAKING?.getTotalStaked) {
        const v = await window.FF_STAKING.getTotalStaked();
        outEl.textContent = formatInt(v);
        return;
      }
      if (window.StakingAdapter?.getTotalStaked) {
        const v = await window.StakingAdapter.getTotalStaked();
        outEl.textContent = formatInt(v);
        return;
      }
    }catch(e){ /* fall through to Web3 call */ }

    // Fallback: direct contract view call via Web3
    try{
      if (window.Web3 && (window.web3 || window.ethereum) && window.CONTROLLER_ABI && window?.CFG?.CONTROLLER_ADDRESS){
        const provider = (window.web3 && window.web3.currentProvider) || window.ethereum || Web3.givenProvider;
        const w3 = new Web3(provider);
        const ctr = new w3.eth.Contract(window.CONTROLLER_ABI, window.CFG.CONTROLLER_ADDRESS);

        const candidates = [
          'totalStaked',
          'stakedTotal',
          'totalStakedSupply',
          'stakedCount',
          'totalStakedFrogs',
          'totalSupplyStaked'
        ];
        for (const name of candidates){
          if (ctr.methods[name]) {
            try {
              const raw = await ctr.methods[name]().call();
              outEl.textContent = formatInt(raw);
              return;
            } catch(_) {}
          }
        }
      }
    }catch(e){ /* ignore */ }

    // If nothing filled, leave as —
    if (!outEl.textContent || outEl.textContent.trim() === '') outEl.textContent = '—';
  }

  async function refresh(){
    primeUI();
    await Promise.all([
      fillController(),
      fillTotalStaked()
    ]);
  }

  // expose a small API for other scripts
  window.PondKPIs = { refresh };

  // init
  function kick(){ refresh().catch(()=>{}); }
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
