// assets/js/topbar.js — Compact, centered button row below the hero.
// - No container background/border
// - Smaller, less-rounded (dashboard-like)
// - Role colors you asked for
// - 10 STYLE presets × 10 COLOR palettes you can cycle (S / C keys or ?btnStyle=&btnPalette=)
// Include this file LAST on the page.

(function(){
  'use strict';

  // ---------- Config / links ----------
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var OPENSEA_URL   = CFG.OPENSEA_COLLECTION_URL || CFG.OPENSEA_URL || 'https://opensea.io/';
  var ETHERSCAN_URL = CFG.ETHERSCAN_COLLECTION_URL ||
                      (CFG.COLLECTION_ADDRESS ? ('https://etherscan.io/address/'+CFG.COLLECTION_ADDRESS) : 'https://etherscan.io/');

  // ---------- Mount right below the "title / small frogs" hero ----------
  function findHero(){
    // Both pages define a ".frog-hero" with .frog-title + .frog-strip
    return document.querySelector('.frog-hero');
  }

  // ---------- CSS (10 styles × 10 palettes) ----------
  function injectStyles(){
    if (document.getElementById('ff-btnrow-css')) return;

    // Base row (no background, centered)
    var css = `
/* --- Button row --- */
.ff-btnrow{ display:flex; justify-content:center; align-items:center; gap:8px; padding:8px 0; }

/* Base button (small, light rounding; matches dashboard scale) */
.ffb{ -webkit-tap-highlight-color:transparent; display:inline-flex; align-items:center; justify-content:center;
  padding:6px 10px; font:inherit; font-size:0.92rem; line-height:1; letter-spacing:.2px;
  border-radius:8px; border:1px solid var(--ffb-border,#2a2a31); background:transparent; color:var(--ffb-ink,#d7d7df);
  cursor:pointer; text-decoration:none; transition:background-color .12s ease,border-color .12s ease,color .12s ease,transform .04s ease, box-shadow .12s ease; }
.ffb:active{ transform: translateY(1px); }

/* Role classes pick their **hue** (per your request) — palettes tweak intensities */
.ffb.connect  { --ffb-col: var(--h-green);     }
.ffb.opensea  { --ffb-col: var(--h-blue);      }
.ffb.ethscan  { --ffb-col: var(--h-gray);      }
.ffb.mutate   { --ffb-col: var(--h-red);       }
.ffb.pond     { --ffb-col: var(--h-forest);    }
.ffb.rank     { --ffb-col: var(--h-amber);     }

/* ---------- 10 STYLE PRESETS (ff-style-0..9) ---------- */
/* 0: Outline (subtle) */
.ff-style-0 .ffb { background: transparent; border-color: color-mix(in srgb, var(--ffb-col), black 70%); color: color-mix(in srgb, var(--ffb-col), white 10%); }
.ff-style-0 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), transparent 82%); }

/* 1: Soft tint */
.ff-style-1 .ffb { background: color-mix(in srgb, var(--ffb-col), transparent 90%); border-color: color-mix(in srgb, var(--ffb-col), black 65%); color: color-mix(in srgb, var(--ffb-col), white 5%); }
.ff-style-1 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), transparent 80%); }

/* 2: Solid filled (brighter) */
.ff-style-2 .ffb { background: color-mix(in srgb, var(--ffb-col), black 10%); border-color: color-mix(in srgb, var(--ffb-col), black 18%); color: white; }
.ff-style-2 .ffb:hover { box-shadow: 0 0 0 2px color-mix(in srgb, var(--ffb-col), transparent 70%); }

/* 3: Ghost (borderless) */
.ff-style-3 .ffb { border-color: transparent; background: transparent; color: color-mix(in srgb, var(--ffb-col), white 6%); }
.ff-style-3 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), transparent 82%); border-color: color-mix(in srgb, var(--ffb-col), black 70%); }

/* 4: Minimal (thin outline) */
.ff-style-4 .ffb { border-color: color-mix(in srgb, var(--ffb-col), black 78%); background: transparent; color: color-mix(in srgb, var(--ffb-col), white 8%); }
.ff-style-4 .ffb:hover { border-color: color-mix(in srgb, var(--ffb-col), black 60%); background: color-mix(in srgb, var(--ffb-col), transparent 88%); }

/* 5: Elevated soft */
.ff-style-5 .ffb { background: color-mix(in srgb, var(--ffb-col), black 92%); border-color: color-mix(in srgb, var(--ffb-col), black 75%); color: color-mix(in srgb, white, var(--ffb-col) 10%); box-shadow: 0 1px 0 rgba(0,0,0,.25);}
.ff-style-5 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), black 88%); }

/* 6: Semi-solid (filled but not full) */
.ff-style-6 .ffb { background: color-mix(in srgb, var(--ffb-col), black 25%); border-color: color-mix(in srgb, var(--ffb-col), black 35%); color: white; }
.ff-style-6 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), black 20%); }

/* 7: Underline (link-like) */
.ff-style-7 .ffb { border-color: transparent; background: transparent; color: color-mix(in srgb, var(--ffb-col), white 4%); text-decoration: underline; text-underline-offset: 3px; }
.ff-style-7 .ffb:hover { text-decoration-thickness: 2px; }

/* 8: Chip (small capsule; tighter) */
.ff-style-8 .ffb { padding:5px 9px; border-radius:10px; background: color-mix(in srgb, var(--ffb-col), transparent 86%); border-color: color-mix(in srgb, var(--ffb-col), black 65%); color: color-mix(in srgb, var(--ffb-col), white 6%); }
.ff-style-8 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), transparent 78%); }

/* 9: Strong Outline (brighter border) */
.ff-style-9 .ffb { background: transparent; border-color: color-mix(in srgb, var(--ffb-col), black 50%); color: color-mix(in srgb, var(--ffb-col), white 2%); box-shadow: 0 0 0 1px color-mix(in srgb, var(--ffb-col), transparent 65%) inset;}
.ff-style-9 .ffb:hover { background: color-mix(in srgb, var(--ffb-col), transparent 82%); }

/* ---------- 10 COLOR PALETTES (ff-pal-0..9) ----------
   These define the role hues so you can try brighter / fuller shades */
:root{
  --h-green:#35c46a;        /* connect primary green */
  --h-blue:#47a5ff;         /* opensea light blue */
  --h-gray:#8b8f99;         /* etherscan gray */
  --h-red:#ff6a3a;          /* mutate red/orange */
  --h-forest:#268c56;       /* pond deep green */
  --h-amber:#ffb84a;        /* rankings yellow/orange */
}
/* Palette 0: baseline (subtle) */
.ff-pal-0 { }
/* Palette 1: +10% brightness */
.ff-pal-1 { --h-green:#39d373; --h-blue:#58afff; --h-gray:#9aa0aa; --h-red:#ff7a4f; --h-forest:#2e9e62; --h-amber:#ffc262; }
/* Palette 2: +20% brightness */
.ff-pal-2 { --h-green:#3ee27d; --h-blue:#67b7ff; --h-gray:#a8aeb8; --h-red:#ff8a64; --h-forest:#35ad6c; --h-amber:#ffcb78; }
/* Palette 3: solid-ish (deeper) */
.ff-pal-3 { --h-green:#2fb861; --h-blue:#3c9df5; --h-gray:#808691; --h-red:#f25f33; --h-forest:#1f7e49; --h-amber:#f7aa3a; }
/* Palette 4: more saturation */
.ff-pal-4 { --h-green:#28d070; --h-blue:#4bb2ff; --h-gray:#9aa0aa; --h-red:#ff7445; --h-forest:#269c59; --h-amber:#ffc04f; }
/* Palette 5: high-contrast fill */
.ff-pal-5 { --h-green:#22e07a; --h-blue:#5bbaff; --h-gray:#b0b6bf; --h-red:#ff865b; --h-forest:#2ab86a; --h-amber:#ffd06b; }
/* Palette 6: darker tints */
.ff-pal-6 { --h-green:#2aa85d; --h-blue:#3896eb; --h-gray:#7b818c; --h-red:#ea5b32; --h-forest:#1c6f41; --h-amber:#ee9f2f; }
/* Palette 7: full solid candidates */
.ff-pal-7 { --h-green:#1fd274; --h-blue:#3fb2ff; --h-gray:#9ea3ad; --h-red:#ff7246; --h-forest:#22a763; --h-amber:#ffc85d; }
/* Palette 8: neon-ish (careful) */
.ff-pal-8 { --h-green:#39f28f; --h-blue:#6ac2ff; --h-gray:#c0c5cf; --h-red:#ff8f6d; --h-forest:#36cc7c; --h-amber:#ffd983; }
/* Palette 9: moody */
.ff-pal-9 { --h-green:#2b9a59; --h-blue:#2b89db; --h-gray:#6f757f; --h-red:#d9522c; --h-forest:#17653c; --h-amber:#d8942a; }

/* Responsive tweaks */
@media (max-width:720px){
  .ff-btnrow{ gap:6px; padding:6px 0; flex-wrap:wrap; }
  .ffb{ padding:6px 9px; font-size: .9rem; }
}
    `.trim();

    var style = document.createElement('style');
    style.id = 'ff-btnrow-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- Build row ----------
  function buildRow(){
    var row = document.createElement('div');
    row.className = 'ff-btnrow ff-style-2 ff-pal-2'; // default: Solid + brighter palette
    row.innerHTML = [
      '<button class="ffb connect"  data-act="connect">Connect Wallet</button>',
      '<a class="ffb opensea"  href="'+OPENSEA_URL+'" target="_blank" rel="noopener">Shop on OpenSea</a>',
      '<a class="ffb ethscan"  href="'+ETHERSCAN_URL+'" target="_blank" rel="noopener">Etherscan</a>',
      '<button class="ffb rank" data-act="rankings">Rankings</button>',
      '<button class="ffb pond" data-act="pond">The Pond</button>',
      '<button class="ffb mutate" data-act="mutate">Mutate</button>'
    ].join('');
    return row;
  }

  // ---------- Mount below hero ----------
  function mountBelowHero(row){
    var hero = findHero();
    if (!hero) { // fallback = top of body, still without container bg
      document.body.insertBefore(row, document.body.firstChild);
      return;
    }
    // Insert right *after* the hero block (title + frog-strip)
    if (hero.nextSibling) hero.parentNode.insertBefore(row, hero.nextSibling);
    else hero.parentNode.appendChild(row);
  }

  // ---------- Actions ----------
  var TARGETS = {
    rankings: ['#rarityPanel','#rankings','[data-panel="rankings"]'],
    pond:     ['#pondPanel','#thePond','[data-panel="pond"]'],
    mutate:   ['#mutatePanel','#mutate','mutate.html']
  };
  function go(kind){
    var sels = TARGETS[kind] || [];
    for (var i=0;i<sels.length;i++){
      var el = document.querySelector(sels[i]);
      if (el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    var hash = (kind==='rankings')?'#rankings':(kind==='pond')?'#pond':'#mutate';
    var target = (kind==='mutate' && sels.indexOf('mutate.html')>-1) ? 'mutate.html' : ('collection.html'+hash);
    window.location.href = target;
  }
  function setAddrText(txt){
    var b = document.querySelector('.ffb.connect');
    if (b) b.textContent = txt || 'Connect Wallet';
  }
  function short(a){ return !a ? '' : (a.slice(0,6)+'…'+a.slice(-4)); }
  function onRowClick(e){
    var a = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!a) return;
    var act = a.getAttribute('data-act');
    if (act==='connect') return connect();
    if (act==='rankings') return go('rankings');
    if (act==='pond')     return go('pond');
    if (act==='mutate')   return go('mutate');
  }
  function connect(){
    try{
      if (window.Wallet && typeof window.Wallet.connect==='function'){
        window.Wallet.connect().then(function(addr){
          if (addr) setAddrText(short(addr));
          document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:addr}}));
        }).catch(function(){});
        return;
      }
      if (window.ethereum && window.ethereum.request){
        window.ethereum.request({method:'eth_requestAccounts'}).then(function(arr){
          var a = (arr && arr[0]) ? arr[0] : '';
          if (a) setAddrText(short(a));
          document.dispatchEvent(new CustomEvent('ff:wallet:ready',{detail:{address:a}}));
        }).catch(function(){});
        return;
      }
      alert('No Ethereum wallet detected (e.g., MetaMask).');
    }catch(_){}
  }

  // ---------- Style/Palette cycling ----------
  var STYLE_MAX = 10; // 0..9
  var PAL_MAX   = 10; // 0..9
  function applyStylePalette(row, s, p){
    s = Math.max(0, Math.min(STYLE_MAX-1, s|0));
    p = Math.max(0, Math.min(PAL_MAX-1,   p|0));
    row.className = row.className
      .replace(/ff-style-\d+/g,'')
      .replace(/ff-pal-\d+/g,'')
      .trim();
    row.classList.add('ff-style-'+s);
    row.classList.add('ff-pal-'+p);
    row.dataset.styleIndex = String(s);
    row.dataset.paletteIndex = String(p);
  }
  function getParamNum(name, def){
    var m = location.search.match(new RegExp('[?&]'+name+'=(\\d+)'));
    return m ? parseInt(m[1],10) : def;
  }

  // ---------- Render ----------
  function render(){
    injectStyles();
    var row = buildRow();
    mountBelowHero(row);

    // wire
    row.addEventListener('click', onRowClick);

    // read existing connection (best effort)
    try{
      if (window.Wallet && typeof window.Wallet.getAddress==='function'){
        var a = window.Wallet.getAddress(); if (a) setAddrText(short(a));
      } else if (window.ethereum && window.ethereum.selectedAddress){
        setAddrText(short(window.ethereum.selectedAddress));
      }
    }catch(_){}

    // style/palette from query or defaults
    var s0 = getParamNum('btnStyle', 2);   // default Solid
    var p0 = getParamNum('btnPalette', 2); // default brighter
    applyStylePalette(row, s0, p0);

    // keyboard shortcuts: S = style, C = colors
    document.addEventListener('keydown', function(ev){
      if (['INPUT','TEXTAREA'].indexOf((ev.target.tagName||'').toUpperCase())>-1) return;
      if (ev.key==='s' || ev.key==='S'){
        var ns = ((parseInt(row.dataset.styleIndex||'0',10)+1) % STYLE_MAX);
        applyStylePalette(row, ns, parseInt(row.dataset.paletteIndex||'0',10));
      }
      if (ev.key==='c' || ev.key==='C'){
        var np = ((parseInt(row.dataset.paletteIndex||'0',10)+1) % PAL_MAX);
        applyStylePalette(row, parseInt(row.dataset.styleIndex||'0',10), np);
      }
    });

    // live account change
    if (window.ethereum && window.ethereum.on){
      window.ethereum.on('accountsChanged', function(acc){
        setAddrText(short((acc && acc[0]) ? acc[0] : ''));
      });
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);
})();
