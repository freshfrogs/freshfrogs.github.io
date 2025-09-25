// assets/js/pond-tweaks.js
// Renames the left card to "The Pond", swaps the total-staked icon to 🐸,
// and pins the third info box to Rewards ($FLYZ) even if the feed rewrites it.

(function(){
  'use strict';
  const card = document.querySelector('.page-grid > section.pg-card');
  if (!card) return;

  // Title -> The Pond
  const h = card.querySelector('.pg-card-head h3');
  if (h) h.textContent = 'The Pond';

  const blocks = card.querySelectorAll('.info-block');

  // 0) Total Frogs Staked: keep, but use 🐸 icon text
  if (blocks[0]) {
    const ik = blocks[0].querySelector('.ik');
    if (ik) ik.textContent = '🐸  Total Frogs Staked';
  }

  // 2) Rewards box (prevent feed from restoring "Last Update")
  function setRewardsBox() {
    const b = blocks[2]; if (!b) return;
    const ik = b.querySelector('.ik');  if (ik) ik.textContent = 'Rewards';
    const iv = b.querySelector('.iv');  if (iv) iv.textContent = (window.FF_CFG?.REWARD_TOKEN_SYMBOL || '$FLYZ');
    const inn= b.querySelector('.in');  if (inn) inn.textContent = 'Earnings token';
  }
  setRewardsBox();

  if (blocks[2]){
    const mo = new MutationObserver(setRewardsBox);
    mo.observe(blocks[2], { childList:true, subtree:true, characterData:true });
  }
})();
