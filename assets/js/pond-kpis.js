// assets/js/pond-kpis.js — resilient drop-in
(function () {
  'use strict';

  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  function formatInt(v){
    try {
      if (v && typeof v === 'object' && 'toString' in v) v = v.toString();
      if (typeof v === 'string') {
        if (v.includes('.')) v = v.split('.')[0];
        return Number.isSafeInteger(+v) ? (+v).toLocaleString() : v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      if (typeof v === 'bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (typeof v === 'number') return Math.floor(v).toLocaleString();
      return String(v ?? '—');
    } catch { return String(v ?? '—'); }
  }

  function shorten(addr){
    if (!addr) return '—';
    const s = String(addr);
    return s.slice(0,6) + '…' + s.slice(-4);
  }

  // ---------- UI priming ----------
  function primeUI(){
    const blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    const firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Frogs Staked';

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

    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove(); // remove Notes box if present
  }

  // ---------- Web3 helpers ----------
  function getProvider(){
    // Prefer site/wallet provider; fallback to public no-key RPC
    if (window.web3?.currentProvider) return window.web3.currentProvider;
    if (window.ethereum) return window.ethereum;
    return 'https://cloudflare-eth.com';
  }

  function makeWeb3(){
    if (!window.Web3) { console.warn('Web3 not found on window'); return null; }
    try { return new Web3(getProvider()); } catch(e){ console.warn('Web3 init failed', e); return null; }
  }

  // Find a 0-input, view/pure function that likely represents "total staked"
  function findTotalStakedMethod(abi){
    if (!Array.isArray(abi)) return null;
    const candidates = abi.filter(it =>
      it?.type === 'function' &&
      (it.stateMutability === 'view' || it.stateMutability === 'pure') &&
      Array.isArray(it.inputs) && it.inputs.length === 0 &&
      Array.isArray(it.outputs) && it.outputs.length >= 1
    );

    // Score by name heuristics
    function score(name){
      name = (name || '').toLowerCase();
      let s = 0;
      if (name.includes('stak')) s += 5;
      if (name.includes('total')) s += 3;
      if (name.includes('count')) s += 2;
      if (name.includes('supply')) s += 1;
      if (name.includes('frogs')) s += 1;
      return s;
    }

    let best = null;
    let bestScore = -1;
    for (const fn of candidates){
      const sc = score(fn.name);
      if (sc > bestScore) { best = fn; bestScore = sc; }
    }
    return best?.name || null;
  }

  async function readTotalStakedViaAbi(){
    const el = $('#stakedTotal');
    if (!el) return null;
    const addr = window?.CFG?.CONTROLLER_ADDRESS;
    const abi  = window?.CONTROLLER_ABI;
    if (!addr || !abi) { console.warn('Missing CONTROLLER_ADDRESS or CONTROLLER_ABI'); return null; }

    const w3 = makeWeb3();
    if (!w3) return null;

    const ctr = new w3.eth.Contract(abi, addr);
    // First: common names quick check
    const quick = ['totalStaked','stakedTotal','totalStakedSupply','stakedCount','totalStakedFrogs','totalSupplyStaked'];
    for (const name of quick){
      if (ctr.methods[name]) {
        try { return await ctr.methods[name]().call(); } catch(_){}
      }
    }
    // Fallback: heuristic scan
    const detected = findTotalStakedMethod(abi);
    if (detected && ctr.methods[detected]){
      try { return await ctr.methods[detected]().call(); } catch(e){ console.warn('Heuristic method call failed:', detected, e); }
    }

    console.warn('No suitable total-staked method found in ABI.');
    return null;
  }

  // ---------- Fills ----------
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

    // Prefer app adapters if present
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
    }catch(e){ /* Fall through */ }

    // Fallback: read from contract directly
    const raw = await readTotalStakedViaAbi();
    if (raw != null) {
      outEl.textContent = formatInt(raw);
    } else {
      // Keep previous or show —
      if (!outEl.textContent || outEl.textContent.trim() === '') outEl.textContent = '—';
    }
  }

  async function refresh(){
    primeUI();
    await Promise.all([ fillController(), fillTotalStaked() ]);
  }

  window.PondKPIs = { refresh };

  function kick(){ refresh().catch(()=>{}); }

  // Init + re-run on common app events
  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
