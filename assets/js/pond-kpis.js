// assets/js/pond-kpis.js — tolerant & self-healing
(function () {
  'use strict';

  const FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
  const ABI_JSON_PATH = 'assets/abi/controller_abi.json'; // fallback if no global ABI is found

  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // ---------- utils ----------
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
  const shorten = (addr) => !addr ? '—' : String(addr).slice(0,6) + '…' + String(addr).slice(-4);

  // ---------- config & abi discovery ----------
  function getControllerAddress(){
    const cands = [
      window?.CFG?.CONTROLLER_ADDRESS,
      window?.CONFIG?.CONTROLLER_ADDRESS,
      window?.FF_CONFIG?.CONTROLLER_ADDRESS,
      window?.CFG?.controllerAddress,
      window?.CONFIG?.controllerAddress,
      window?.FF_CONFIG?.controllerAddress,
    ].filter(Boolean);
    if (cands.length) return cands[0];

    // Try to read from the Controller anchor (href like .../address/0xabc...)
    const a = $('#stakedController');
    if (a && a.href) {
      const m = a.href.match(/0x[a-fA-F0-9]{40}/);
      if (m) return m[0];
    }
    // Try data-attr
    const el = document.querySelector('[data-controller-address]');
    if (el?.dataset?.controllerAddress) return el.dataset.controllerAddress;

    return null;
  }

  async function getControllerAbi(){
    const cands = [
      window?.CONTROLLER_ABI,
      window?.ControllerABI,
      window?.ABI_CONTROLLER,
      window?.ABIs?.controller,
    ].filter(Boolean);
    if (cands.length) return cands[0];

    // Fallback: try to fetch JSON ABI if present in repo
    try {
      const res = await fetch(ABI_JSON_PATH, { cache: 'no-store' });
      if (res.ok) {
        const js = await res.json();
        if (Array.isArray(js)) return js;
      }
    } catch(_) {}
    return null;
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
          if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
        }
      }
    }

    const blocks = $$('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].remove(); // remove Notes if present
  }

  // ---------- web3 helpers ----------
  function getProvider(){
    if (window.web3?.currentProvider) return window.web3.currentProvider;
    if (window.ethereum) return window.ethereum;
    return 'https://cloudflare-eth.com'; // public, no key
  }
  function makeWeb3(){
    if (!window.Web3) return null;
    try { return new Web3(getProvider()); } catch { return null; }
  }

  function find0ArgViewFnLikelyTotal(abi){
    if (!Array.isArray(abi)) return null;
    const cands = abi.filter(x =>
      x?.type === 'function' &&
      (x.stateMutability === 'view' || x.stateMutability === 'pure') &&
      Array.isArray(x.inputs) && x.inputs.length === 0
    );
    const score = (n) => {
      n = (n||'').toLowerCase();
      let s = 0;
      if (n.includes('stak')) s+=5;
      if (n.includes('total')) s+=3;
      if (n.includes('count')) s+=2;
      if (n.includes('supply')) s+=1;
      if (n.includes('frogs')) s+=1;
      return s;
    };
    let best = null, bestS = -1;
    for (const f of cands){
      const sc = score(f.name);
      if (sc > bestS){ best=f; bestS=sc; }
    }
    return best?.name || null;
  }

  // ---------- fills ----------
  async function fillController(){
    const a = $('#stakedController');
    if (!a) return;
    const addr = getControllerAddress();
    if (!addr) return; // don't overwrite with dash if something else fills it later
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  async function fillTotalStaked(){
    const outEl = $('#stakedTotal');
    if (!outEl) return;

    // Prefer app adapters if present
    try {
      if (window.FF_STAKING?.getTotalStaked) {
        const v = await window.FF_STAKING.getTotalStaked();
        if (v != null) { outEl.textContent = formatInt(v); return; }
      }
      if (window.StakingAdapter?.getTotalStaked) {
        const v = await window.StakingAdapter.getTotalStaked();
        if (v != null) { outEl.textContent = formatInt(v); return; }
      }
    } catch {}

    // Fallback: direct contract call
    const addr = getControllerAddress();
    const abi  = await getControllerAbi();
    if (!addr || !abi) {
      // leave as-is, we’ll retry shortly
      return;
    }
    const w3 = makeWeb3();
    if (!w3) return;

    const ctr = new w3.eth.Contract(abi, addr);

    // Quick common names first
    const quick = ['totalStaked','stakedTotal','totalStakedSupply','stakedCount','totalStakedFrogs','totalSupplyStaked'];
    for (const name of quick){
      if (ctr.methods[name]) {
        try { const raw = await ctr.methods[name]().call(); outEl.textContent = formatInt(raw); return; }
        catch(_) {}
      }
    }
    // Heuristic fallback
    const guess = find0ArgViewFnLikelyTotal(abi);
    if (guess && ctr.methods[guess]) {
      try { const raw = await ctr.methods[guess]().call(); outEl.textContent = formatInt(raw); return; }
      catch(_) {}
    }
    // leave as-is; next retry may succeed
  }

  async function refresh(){
    primeUI();
    await Promise.all([ fillController(), fillTotalStaked() ]);
  }

  // expose manual trigger
  window.PondKPIs = { refresh };

  // retry loop while config/abi are not ready yet
  let tries = 0;
  async function kick(){
    await refresh();
    const haveAddr = !!getControllerAddress();
    const haveAbi  = !!(await getControllerAbi());
    if ((!haveAddr || !haveAbi) && tries < 5){
      tries++;
      setTimeout(kick, 500 * tries); // backoff: 0.5s, 1s, 1.5s, 2s, 2.5s
    }
  }

  document.addEventListener('DOMContentLoaded', kick);
  window.addEventListener('load', kick);
  document.addEventListener('ff:wallet:ready', kick);
  document.addEventListener('ff:network:changed', kick);
  document.addEventListener('ff:staking:update', kick);
})();
