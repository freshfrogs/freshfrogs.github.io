// assets/js/pond-kpis.js — Total Staked via direct JSON-RPC (no wallet, no Web3)
// Computes Σ balanceOf(controller_i) on the ERC-721 collection.
// Also: sets label "🌿 Total Staked", fills Controller link, enforces FLYZ link.
(function () {
  'use strict';

  // ---- constants ----
  var RPC_URL = (window.CFG && window.CFG.RPC_URL) || 'https://cloudflare-eth.com';
  var FLYZ_URL = 'https://etherscan.io/token/0xd71d2f57819ae4be6924a36591ec6c164e087e63';

  // ---- tiny helpers ----
  function $(s, p){ return (p||document).querySelector(s); }
  function $all(s, p){ return Array.prototype.slice.call((p||document).querySelectorAll(s)); }
  function byId(id){ return document.getElementById(id); }
  function shorten(a){ return !a ? '—' : String(a).slice(0,6)+'…'+String(a).slice(-4); }
  function fmtInt(v){
    try{
      if (v && typeof v==='object' && v.toString) v = v.toString();
      if (typeof v==='string'){ if (v.indexOf('.')>-1) v=v.split('.')[0];
        return isFinite(+v) ? (+v).toLocaleString() : v.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
      if (typeof v==='number') return Math.floor(v).toLocaleString();
      if (typeof v==='bigint') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
      return String(v||'—');
    }catch(_){ return String(v||'—'); }
  }
  function toHex32(addr){ // 32-byte ABI word for address
    var a = String(addr||'').toLowerCase();
    if (a.startsWith('0x')) a = a.slice(2);
    if (a.length !== 40) throw new Error('Bad address: ' + addr);
    return '000000000000000000000000' + a; // left-pad to 32 bytes
  }
  function rpc(body){
    return fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }
  function hexToBigInt(hex){
    if (!hex) return 0n;
    var s = String(hex);
    if (s.startsWith('0x')) s = s.slice(2);
    if (!s) return 0n;
    return BigInt('0x' + s);
  }

  // ---- config (from window.CFG / window.FF_CFG / window.CONFIG) ----
  var CFG = (window.CFG || window.FF_CFG || window.CONFIG || {});
  function getCollection(){
    return (CFG.COLLECTION_ADDRESS || CFG.collectionAddress || '').toLowerCase();
  }
  function getControllers(){
    var many = CFG.CONTROLLER_ADDRESSES || CFG.controllerAddresses;
    var one  = CFG.CONTROLLER_ADDRESS  || CFG.controllerAddress  || readControllerFromLink();
    if (!Array.isArray(many)) many = one ? [one] : [];
    // dedupe + lowercase
    var out = [];
    for (var i=0;i<many.length;i++){
      var a = String(many[i]||'').toLowerCase();
      if (a && out.indexOf(a)===-1) out.push(a);
    }
    return out;
  }
  function readControllerFromLink(){
    var a = byId('stakedController');
    if (a && a.href){
      var m = a.href.match(/0x[a-fA-F0-9]{40}/);
      if (m) return m[0];
    }
    return '';
  }

  // ---- UI priming ----
  function primeUI(){
    var firstLabel = $('.info-grid-2 .info-block:nth-child(1) .ik');
    if (firstLabel) firstLabel.textContent = '🌿 Total Staked';

    var blurb = $('.pg-muted');
    if (blurb) blurb.textContent = 'Live view of staking activity in the FreshFrogs pond — track total staked, the controller contract, and FLYZ rewards.';

    // Rewards link
    var third = $('.info-grid-2 .info-block:nth-child(3)');
    if (third){
      var lab = third.querySelector('.ik'); if (lab) lab.textContent = '🪙 Rewards';
      var iv = third.querySelector('.iv');
      if (iv){
        var a = iv.querySelector('#pondRewardsLink');
        if (!a){
          a = document.createElement('a');
          a.id = 'pondRewardsLink';
          a.target = '_blank';
          a.rel = 'noopener';
          a.href = FLYZ_URL;
          a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
          iv.textContent = '';
          iv.appendChild(a);
        }else{
          a.href = FLYZ_URL;
          a.target = '_blank';
          a.rel = 'noopener';
          if (!a.querySelector('#pondRewardsSymbol')) a.innerHTML = '<span id="pondRewardsSymbol">$FLYZ</span>';
        }
      }
    }

    // Remove Notes if present
    var blocks = $all('.info-grid-2 .info-block');
    if (blocks[3]) blocks[3].parentNode.removeChild(blocks[3]);
  }

  function fillControllerBox(){
    var a = byId('stakedController');
    var list = getControllers();
    var addr = list[0];
    if (!a || !addr) return;
    a.href = 'https://etherscan.io/address/' + addr;
    a.textContent = shorten(addr);
  }

  // ---- On-chain: Σ balanceOf(controller_i) via direct eth_call ----
  function balanceOfCall(collection, controller){
    // function selector: 0x70a08231 (balanceOf(address))
    var data = '0x70a08231' + toHex32(controller);
    var body = { jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [ { to: collection, data: data }, 'latest' ] };
    return rpc(body).then(function(resp){
      if (resp && resp.result != null) return hexToBigInt(resp.result);
      throw new Error('eth_call error ' + JSON.stringify(resp));
    });
  }

  function fetchTotalStaked(){
    var collection = getCollection();
    var controllers = getControllers();
    if (!collection || !controllers.length) {
      return Promise.reject(new Error('Missing collection/controller address'));
    }
    // Sum all controller balances in parallel
    var calls = controllers.map(function(c){ return balanceOfCall(collection, c).catch(function(){ return 0n; }); });
    return Promise.all(calls).then(function(nums){
      return nums.reduce(function(acc, n){ return acc + n; }, 0n);
    });
  }

  function fillTotalStaked(){
    var out = byId('stakedTotal'); if (!out) return;
    fetchTotalStaked().then(function(totalBI){
      out.textContent = fmtInt(totalBI.toString());
    }).catch(function(err){
      console.warn('[pond-kpis] RPC total failed:', err && err.message || err);
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
