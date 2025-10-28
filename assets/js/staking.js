// assets/js/staking.js
// Tab slider/indicator logic (kept separate for clarity)

(function(){
  const tabsWrap = document.getElementById('stakeTabs');
  if (!tabsWrap) return;

  const indicator = tabsWrap.querySelector('.tab-indicator');
  const btnOwned  = document.getElementById('tabOwned');
  const btnStaked = document.getElementById('tabStaked');

  function moveIndicator(btn){
    if (!indicator || !btn) return;
    const parentRect = tabsWrap.getBoundingClientRect();
    const btnRect    = btn.getBoundingClientRect();
    const left = btnRect.left - parentRect.left + tabsWrap.scrollLeft;
    indicator.style.position = 'absolute';
    indicator.style.height = '2px';
    indicator.style.bottom = '0';
    indicator.style.left   = `${left}px`;
    indicator.style.width  = `${btnRect.width}px`;
    indicator.style.transition = 'left 220ms ease, width 220ms ease';
  }

  function currentBtn(){
    if (btnOwned?.getAttribute('aria-selected') === 'true') return btnOwned;
    if (btnStaked?.getAttribute('aria-selected') === 'true') return btnStaked;
    return btnOwned || btnStaked || null;
  }

  // clicks
  btnOwned?.addEventListener('click', ()=> moveIndicator(btnOwned));
  btnStaked?.addEventListener('click', ()=> moveIndicator(btnStaked));

  // react when owned.js refreshes content & toggles aria-selected
  document.addEventListener('ff-tabs-updated', ()=> moveIndicator(currentBtn()));

  // handle layout changes
  window.addEventListener('resize', ()=> moveIndicator(currentBtn()));

  // init
  requestAnimationFrame(()=> moveIndicator(currentBtn()));
})();
