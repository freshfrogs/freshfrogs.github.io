// assets/js/pond-kpis.js — Total Staked = balanceOf(controller) on the collection.
// No wallet/web3 needed: direct JSON-RPC eth_call. Multi-controller supported (sum).
(function () {
  'use strict';

  // --- RPC + constants ---
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  var RPC_URL = CFG.RPC_URL || 'https://cloudflare-eth.com';
  var FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';
  var FALLBACK_CONTROLLER = '0xcb1ee125cff4051a10a55a09b10613876c4ef199'; // provided

  // --- tiny helpers ---
  function $(s, p){ return (p||document).querySelector(s); }
  function $all(s, p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function byId(id){ return document.getElementById(id); }
  function shorten(a){ return !a ? '—' : String(a).slice(0,6)+'…'+String(a).slice(-4); }
  function fmtInt(v){
    try{
      if (v && typeof v==='object' && v.toString) v = v.toString();
      if (typeof v==='string'){ if (v.indexOf('.')>-1) v=v.split('.')[0]; return isFinite(+v)?(+v).toLocaleString():v.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
      if (typeof v==='number') return Math.floor(v).toLocaleString();
      if (typeof v==='bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
      return String(v||'—');
    }catch(_){ return String(v||'—'); }
  }
  function rpc(body){
    return fetch(RPC_URL, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) })
      .then(function(r){ return r.json(); });
  }
  function hexToBI(hex){
    if (!hex) return 0n;
    var s = String(hex); if (s.startsWith('0x')) s = s.slice(2); if (!s) return 0n;
    return BigInt('0x'+s);
  }
  function toHex32(addr){
    var a = String(addr||'').toLowerCase(); if (a.startsWith('0x')) a=a.slice(2);
    if (a.length !== 40) throw new Error('Bad address '+addr);
    return '000000000000000000000000'+a;
  }

  // --- config readers ---
  function getCollection(){
    return (CFG.COLLECTION_ADDRESS || CFG.collectionAddress || '').toLowerCase();
  }
  function getControllers(){
    var many = CFG.CONTROLLER_ADDRESSES || CFG.controllerAddresses;
    var one  = CFG.CONTROLLER_ADDRESS  || CFG.controllerAddress  || FALLBACK_CONTROLLER;
    if (!Array.isArray(many)) many = one ? [one] : [];
    // dedupe + lowercase
    var out = [];
    for (var i=0;i<many.length;i++){
      var a = String(many[i]||'').toLowerCase();
      if (a && out.indexOf(a)===-1) out.push(a);
    }
    return out;
  }

  // --- UI priming per your spec ---
  function primeUI(){
    var firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

    var blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // Rewards link ($FLYZ with link)
    var third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third){
      var lab = third.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      var iv = third.querySelector('.iv');
      if (iv){
        var a = iv.querySelector('#pondRewardsLink');
        if (!a){
          a = document.createElement('a');
          a.id='pondRewardsLink'; a.target='_blank'; a.rel='noopener'; a.href=FLYZ_URL; a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
          iv.textContent=''; iv.appendChild(a);
        } else {
          a.href=FLYZ_URL; a.target='_blank'; a.rel='noopener';
          if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML='<span id="pondRewardsSymbol">$FLYZ</span>';
        }
      }
    }

    // Remove Notes box if a 4th exists
    var blocks = $all('.info-grid-2 .info-block'); if (blocks[3]) blocks[3].remove();
  }

  function fillControllerBox(){
    var a = byId('stakedController'); if (!a) return;
    var addr = getControllers()[0]; if (!addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // --- on-chain reads (direct eth_call) ---
  // balanceOf(address) selector = 0x70a08231
  function balanceOf(collection, controller){
    var data = '0x70a08231' + toHex32(controller);
    var body = { jsonrpc:'2.0', id:1, method:'eth_call', params:[ { to: collection, data: data }, 'latest' ] };
    return rpc(body).then(function(resp){
      if (resp && resp.result != null) return hexToBI(resp.result);
      throw new Error('eth_call error '+JSON.stringify(resp));
    });
  }

  function fetchTotalStaked(){
    var collection = getCollection();
    var controllers = getControllers();
    if (!collection || !controllers.length) return Promise.reject(new Error('Missing collection/controller'));

    var calls = controllers.map(function(c){ return balanceOf(collection, c).catch(function(){ return 0n; }); });
    return Promise.all(calls).then(function(parts){
      return parts.reduce(function(a,b){ return a+b; }, 0n);
    });
  }

  function fillTotalStaked(){
    var out = byId('stakedTotal'); if (!out) return;
    fetchTotalStaked().then(function(totalBI){
      out.textContent = fmtInt(totalBI.toString());
    }).catch(function(err){
      console.warn('[pond-kpis] total staked failed:', err && err.message || err);
      if (!out.textContent || out.textContent.trim()==='') out.textContent = '—';
    });
  }

  function refresh(){
    primeUI();
    fillControllerBox();
    fillTotalStaked();
  }

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  document.addEventListener('ff:staking:update', refresh);
})();
