// assets/js/dashboard_mount.js
// Moves the existing Owned/Staked panel (with tabOwned/tabStaked/chipWrap) into #dashPanelSlot.

(function(){
  function findPanelRoot(){
    // We’ll anchor off a known element from your panel:
    const anchors = [
      document.getElementById('tabOwned'),
      document.getElementById('tabStaked'),
      document.getElementById('chipWrap'),
      document.getElementById('stakeStatus'),
      document.getElementById('refreshOwned')
    ].filter(Boolean);

    if (!anchors.length) return null;

    // Climb up until we hit a likely section/card wrapper
    for (const a of anchors){
      let n = a;
      for (let i=0; i<5 && n; i++){
        if (n.matches && (n.matches('section.card') || n.matches('section') || n.classList?.contains('card'))) {
          return n;
        }
        n = n.parentElement;
      }
    }
    // Fallback: common parent of found anchors
    if (anchors.length > 1){
      let p = anchors[0];
      while (p && !anchors.every(x => p.contains(x))) p = p.parentElement;
      return p || anchors[0].parentElement;
    }
    return anchors[0]?.parentElement || null;
  }

  function mount(){
    const slot = document.getElementById('dashPanelSlot');
    if (!slot) return;

    const root = findPanelRoot();
    if (!root) return;

    // Already mounted?
    if (slot.contains(root)) return;

    // Optional: tweak heading to feel embedded (if the panel has its own header)
    // Example: hide duplicate big title from the panel if present
    const h2 = root.querySelector('h2, h3');
    if (h2) h2.style.marginTop = '0';

    // Move the whole panel into the dashboard slot
    slot.appendChild(root);
  }

  // Try now, then after DOM ready, and once more after a short delay
  mount();
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    setTimeout(mount, 0);
  }
  // Also react to SPA-ish re-renders
  const mo = new MutationObserver(()=> mount());
  mo.observe(document.body, { childList:true, subtree:true });
})();
