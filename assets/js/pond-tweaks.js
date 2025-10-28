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
