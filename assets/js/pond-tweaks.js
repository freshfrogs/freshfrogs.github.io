// assets/js/pond-tweaks.js
(function(){
  'use strict';
  const card = document.querySelector('.page-grid > section.pg-card'); // first/left card
  if (!card) return;

  const h = card.querySelector('.pg-card-head h3');
  if (h) h.textContent = 'The Pond';

  const blocks = card.querySelectorAll('.info-block');
  if (blocks[0]) {
    const ik = blocks[0].querySelector('.ik');
    if (ik) ik.textContent = 'Total Frogs Staked';
  }
  if (blocks[2]) {
    const ik = blocks[2].querySelector('.ik');
    const iv = blocks[2].querySelector('.iv');
    const inn= blocks[2].querySelector('.in');
    if (ik) ik.textContent = 'Rewards';
    if (iv) iv.textContent = (window.FF_CFG?.REWARD_TOKEN_SYMBOL || '$FLYZ');
    if (inn) inn.textContent = 'Earnings token';
  }
})();
// ==== Address: show full unless space forces truncation (applies to index & collection) ====
(function(){
  'use strict';

  function fullFromHref(href){
    if (!href) return null;
    const m = href.match(/\/address\/(0x[a-fA-F0-9]{40})/);
    return m ? m[1] : null;
  }

  function expandIn(root){
    if (!root) return;
    // 1) Anchors that link to an Etherscan address
    root.querySelectorAll('a[href*="etherscan.io/address/"]').forEach(a=>{
      const full = fullFromHref(a.getAttribute('href')) || a.getAttribute('data-addr');
      if (!full) return;
      a.textContent = full;   // show full address
      a.title = full;         // tooltip still shows full
      a.classList.add('addr-clip'); // only ellipsis if needed
    });

    // 2) Any element with a data-addr attribute
    root.querySelectorAll('[data-addr]').forEach(el=>{
      const v = el.getAttribute('data-addr');
      if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return;
      el.textContent = v;
      el.title = v;
      el.classList.add('addr-clip');
    });
  }

  function runAll(){
    expandIn(document.getElementById('recentStakes'));
    expandIn(document.getElementById('recentMints'));
    expandIn(document.getElementById('activityList'));
  }

  // Re-apply when lists update dynamically
  function observe(id){
    const root = document.getElementById(id);
    if (!root) return;
    const mo = new MutationObserver(runAll);
    mo.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      runAll();
      ['recentStakes','recentMints','activityList'].forEach(observe);
    });
  }else{
    runAll();
    ['recentStakes','recentMints','activityList'].forEach(observe);
  }
})();
