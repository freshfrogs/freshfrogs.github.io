// assets/js/pond-tweaks.js
(function(CFG){
  const C = window.FF_CFG || CFG || {};
  function etherscanAddr(a){
    const chain = Number(C.CHAIN_ID||1);
    const base = chain===1 ? 'https://etherscan.io/address/' :
               chain===11155111 ? 'https://sepolia.etherscan.io/address/' :
               'https://etherscan.io/address/';
    return base + a;
  }
  // Link
  const a = document.getElementById('pondTransfersLink');
  if (a && C.CONTROLLER_ADDRESS) a.href = etherscanAddr(C.CONTROLLER_ADDRESS)+'#tokentxns';

  // De-nest rows if some legacy script double-wraps them
  const ul = document.getElementById('recentStakes');
  if (!ul) return;
  const fix = ()=> ul.querySelectorAll('li.row li.row').forEach(inner=>{
    const outer = inner.closest('li.row'); if (outer && outer!==inner) outer.replaceWith(inner);
  });
  new MutationObserver(fix).observe(ul, { childList:true, subtree:true }); fix();
})(window.FF_CFG);
