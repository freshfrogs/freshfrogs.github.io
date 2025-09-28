// assets/js/stakes-feed.js
// FreshFrogs — staking activity feed line format fix:
// "{truncated user} → {truncated controller} • time • Etherscan"

;(function(FF, CFG){
  const short = (a)=> (a && a.slice) ? (a.slice(0,6)+'…'+a.slice(-4)) : a;
  const controller = (CFG && CFG.CONTROLLER_ADDRESS) ? CFG.CONTROLLER_ADDRESS : null;

  // Hook your existing renderOne — keep everything else as-is
  // Find the portion that builds the meta line and replace with:
  FF.buildStakeMeta = function(it, href, ago){
    const userAddr =
      it.other || it.from || it.maker || it.owner || it.user || null;

    const left  = userAddr ? short(userAddr) : '—';
    const right = controller ? short(controller) : '—';

    return [ `${left} → ${right}`, it.time ? ago(it.time) : null, href ? 'Etherscan' : null ]
      .filter(Boolean).join(' • ');
  };

  // If you want to auto-patch, and your renderOne calls a local `meta = ...`,
  // you can optionally expose a tiny helper here for your file to call.

})(window.FF||(window.FF={}), window.FF_CFG||(window.FF_CFG={}));
