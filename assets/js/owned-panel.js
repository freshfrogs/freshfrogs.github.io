
// assets/js/owned-panel.js
// Modals + wiring for Approve / Stake / Unstake / Claim / Transfer

;(function (global) {
  var FF  = global.FF  = global.FF  || {};
  var CFG = global.FF_CFG = global.FF_CFG || {};

  var $  = function(s,r){return (r||document).querySelector(s)};
  var $$ = function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var isAddr = function(v){ return typeof v==='string' && /^0x[a-fA-F0-9]{40}$/.test(v); };
  var imgFor = function(id){ return (FF.imgFor?FF.imgFor(id):(CFG.FROG_IMAGE_BASE?CFG.FROG_IMAGE_BASE+'/':'assets/frog/')+id+'.png'); };
  var short  = function(a){ return isAddr(a)?(a.slice(0,6)+'…'+a.slice(-4)):(a||''); };

  var openModal  = FF.openModal  || global.openModal;
  var closeModal = FF.closeModal || global.closeModal || function(){};
  var toast      = FF.toast      || global.toast      || function(m){console.log('[toast]',m);};

  // Inject minimal CSS once
  (function inject(){
    if (document.getElementById('owned-panel-css')) return;
    var css = `
#ownedModal .om-col{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
#ownedModal .om-thumb{width:128px;height:128px;border-radius:10px;border:1px solid var(--border);background:#111;object-fit:cover}
#ownedModal .om-logo{width:128px;height:128px;border-radius:12px;border:1px solid var(--border);background:#111;object-fit:cover}
#ownedModal .om-name{font-weight:700;font-size:14px;color:#fff}
#ownedModal .om-copy{color:#fff;font-size:13px;line-height:1.5;max-width:52ch}
#ownedModal .om-copy p{margin:0 0 10px 0}
#ownedModal .om-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}
.btn.disabled,.btn[disabled]{opacity:.45;pointer-events:none;filter:saturate(.5)}
`;
    var el = document.createElement('style');
    el.id = 'owned-panel-css';
    el.textContent = css;
    document.head.appendChild(el);
  })();

  // Model hook (if exposed elsewhere)
  var items = FF.ownedItems || [];

  // ---- adapter functions (from staking-adapter.js) ----
  var approveForAll = FF.staking && FF.staking.approveForAll;
  var stake         = FF.staking && FF.staking.stake;
  var unstake       = FF.staking && FF.staking.unstake;
  var claimRewards  = FF.staking && FF.staking.claimRewards;
  var transferNft   = FF.nft     && FF.nft.transfer;

  // Fallback to shims if present
  approveForAll = approveForAll || FF.sendApprove;
  stake         = stake         || FF.sendStake;
  unstake       = unstake       || FF.sendUnstake;

  var refreshHeaderStats = global.refreshHeaderStats || function(){};
  var updateHeaderOwned  = global.updateHeaderOwned  || function(){};
  var renderOwnedCards   = global.renderOwnedCards   || function(){};

  function _normalizeIdAndImg(tokenId, imgUrl){
    // Fix for old calls that passed (ownerAddress, tokenId[, imgUrl])
    if (isAddr(tokenId)) {
      tokenId = arguments[1];
      imgUrl  = arguments[2] || imgFor(tokenId);
    }
    return [tokenId, imgUrl || imgFor(tokenId)];
  }

  // --------- Modals ----------
  function openApprovePanel(){
    var body = ''
      + '<div class="om-col">'
      + '  <img class="om-logo" src="assets/img/blackWhite.png" alt="Fresh Frogs" width="128" height="128">'
      + '  <div class="om-name">Fresh Frogs Staking</div>'
      + '  <div class="om-copy">'
      + '    <p><b>Why approval?</b> One-time permission that lets the staking contract move your Frogs between your wallet and the vault when you stake or unstake. It does <i>not</i> grant access to your ETH or other tokens.</p>'
      + '    <p><b>How it works.</b> After approval, stake a Frog to start earning <b>$FLYZ</b>. While staked, a Frog can’t be listed or transferred. You can unstake anytime; rewards remain claimable.</p>'
      + '    <p class="pg-muted">Single on-chain transaction (small gas fee).</p>'
      + '  </div>'
      + '</div>';

    openModal && openModal({
      title: '',
      bodyHTML: body,
      actions: [
        { label:'Cancel', primary:false, onClick:function(){} },
        { label:'Approve Staking', primary:true, onClick: async function(){
            try { await approveForAll(); toast('Approval submitted'); await refreshHeaderStats(); }
            catch(e){ console.error(e); toast('Approval failed'); }
          } }
      ]
    });
  }

  function openStakePanel(tokenId, imgUrl){
    var tup = _normalizeIdAndImg(tokenId, imgUrl); tokenId = tup[0]; imgUrl = tup[1];
    var body = ''
      + '<div class="om-col">'
      + '  <img class="om-thumb" src="'+imgUrl+'" alt="Frog #'+tokenId+'" width="128" height="128">'
      + '  <div class="om-name">Stake Frog #'+tokenId+'</div>'
      + '  <div class="om-copy">'
      + '    <p>Staking locks this Frog in the vault so it can’t be listed or transferred, and it begins earning <b>$FLYZ</b> over time.</p>'
      + '    <ul>'
      + '      <li>Rewards accrue while staked and can be claimed anytime.</li>'
      + '      <li>You can unstake whenever you like.</li>'
      + '    </ul>'
      + '    <p class="pg-muted">One on-chain transaction (gas required).</p>'
      + '  </div>'
      + '</div>';

    openModal && openModal({
      title: '',
      bodyHTML: body,
      actions: [
        { label:'Cancel', primary:false, onClick:function(){} },
        { label:'Stake Frog #'+tokenId, primary:true, keepOpen:true, onClick: async function(){
            try {
              await stake(tokenId);
              toast('Stake tx sent for #'+tokenId);
              closeModal();
              var it = items && items.find ? items.find(function(x){return x.id===tokenId;}) : null;
              if (it){ it.staked=true; it.since=Date.now(); }
              renderOwnedCards(); updateHeaderOwned(); refreshHeaderStats();
            } catch(e){ console.error(e); toast('Stake failed'); }
          } }
      ]
    });
  }

  function openUnstakePanel(tokenId, imgUrl){
    var tup = _normalizeIdAndImg(tokenId, imgUrl); tokenId = tup[0]; imgUrl = tup[1];
    var body = ''
      + '<div class="om-col">'
      + '  <img class="om-thumb" src="'+imgUrl+'" alt="Frog #'+tokenId+'" width="128" height="128">'
      + '  <div class="om-name">Unstake Frog #'+tokenId+'</div>'
      + '  <div class="om-copy">'
      + '    <p>Unstaking returns the Frog to your wallet and restores normal transfers/listings. Any <b>$FLYZ</b> already accrued remains claimable.</p>'
      + '    <ul>'
      + '      <li>Frog becomes tradable again after the transaction confirms.</li>'
      + '      <li>Rewards are not lost when unstaking.</li>'
      + '    </ul>'
      + '    <p class="pg-muted">One on-chain transaction (gas required).</p>'
      + '  </div>'
      + '</div>';

    openModal && openModal({
      title: '',
      bodyHTML: body,
      actions: [
        { label:'Cancel', primary:false, onClick:function(){} },
        { label:'Withdraw Frog #'+tokenId, primary:true, keepOpen:true, onClick: async function(){
            try {
              await unstake(tokenId);
              toast('Withdraw tx sent for #'+tokenId);
              closeModal();
              var it = items && items.find ? items.find(function(x){return x.id===tokenId;}) : null;
              if (it){ it.staked=false; it.since=null; }
              renderOwnedCards(); updateHeaderOwned(); refreshHeaderStats();
            } catch(e){ console.error(e); toast('Withdraw failed'); }
          } }
      ]
    });
  }

  function openClaimPanel(){
    var body = ''
      + '<div class="om-col">'
      + '  <img class="om-logo" src="assets/img/blackWhite.png" alt="Fresh Frogs" width="128" height="128">'
      + '  <div class="om-name">Claim $FLYZ</div>'
      + '  <div class="om-copy">'
      + '    <p>Claim the <b>$FLYZ</b> your staked Frogs have accrued. This sends a single transaction from your wallet.</p>'
      + '    <p class="pg-muted">Claiming does not unstake your Frogs.</p>'
      + '  </div>'
      + '</div>';

    var inFlight = false;
    openModal && openModal({
      title: '',
      bodyHTML: body,
      actions: [
        { label:'Cancel', primary:false, onClick:function(){} },
        { label:'Claim Rewards', primary:true, onClick: async function(btn){
            if (inFlight) return;
            try {
              inFlight = true; if (btn){ btn.disabled=true; btn.textContent='Claiming…'; }
              await claimRewards();
              toast('Claim submitted');
              refreshHeaderStats();
            } catch(e){ console.error(e); toast('Claim failed'); }
            finally { inFlight = false; if (btn){ btn.disabled=false; btn.textContent='Claim Rewards'; } }
          } }
      ]
    });
  }

  function openTransferPanel(tokenId){
    var imgUrl = imgFor(tokenId);
    var stakingAddr = (CFG.CONTROLLER_ADDRESS||'').toLowerCase();

    var body = ''
      + '<div class="om-col">'
      + '  <img class="om-thumb" src="'+imgUrl+'" alt="Frog #'+tokenId+'" width="128" height="128">'
      + '  <div class="om-name">Transfer Frog #'+tokenId+'</div>'
      + '  <div class="om-copy">'
      + '    <p>Send this Frog to another address. <b>Transfers are final</b> once confirmed.</p>'
      + '    <div class="pg-input">'
      + '      <label for="xferTo">Recipient address</label>'
      + '      <input id="xferTo" class="om-input" placeholder="0x…" autocomplete="off" spellcheck="false" />'
      + '      <div id="xferErr" class="pg-error" style="display:none;margin-top:6px"></div>'
      + '    </div>'
      + '    <p class="pg-muted">Do not send to contracts you do not control.</p>'
      + '  </div>'
      + '</div>';

    var inFlight = false;
    openModal && openModal({
      title: '',
      bodyHTML: body,
      actions: [
        { label:'Cancel', primary:false, onClick:function(){} },
        { label:'Send', primary:true, onClick: async function(btn){
            if (inFlight) return;
            var input = $('#xferTo'); var err = $('#xferErr');
            var to = (input && input.value || '').trim();
            err.style.display='none';

            var okAddr = (global.Web3 && global.Web3.utils && global.Web3.utils.isAddress && global.Web3.utils.isAddress(to))
                      || (global.ethers && global.ethers.isAddress && global.ethers.isAddress(to));
            if (!okAddr){ err.textContent='Enter a valid address.'; err.style.display='block'; return; }
            if (stakingAddr && to.toLowerCase()===stakingAddr){ err.textContent='Cannot transfer to the staking contract.'; err.style.display='block'; return; }

            try{
              inFlight = true; if (btn){ btn.disabled=true; btn.textContent='Sending…'; }
              await (FF.nft && FF.nft.transfer ? FF.nft.transfer(tokenId, to) : Promise.reject(new Error('transfer helper missing')));
              toast('Transfer submitted');
              closeModal();
              // optimistic UI: if item exists and not staked, remove from local list
              var it = items && items.find ? items.find(function(x){return x.id===tokenId;}) : null;
              if (it && !it.staked){
                items = items.filter(function(x){return x.id!==tokenId;});
                renderOwnedCards(); updateHeaderOwned();
              }
            }catch(e){ console.error(e); toast('Transfer failed'); }
            finally{ inFlight=false; if (btn){ btn.disabled=false; btn.textContent='Send'; } }
          } }
      ]
    });

    // live enable as user types
    setTimeout(function(){
      var input = $('#xferTo');
      var footer = $('#ownedModal .om-actions') || $('.om-actions');
      var sendBtn = footer ? footer.lastElementChild : null;
      var onType = function(){
        var v = (input && input.value || '').trim();
        var okAddr = (global.Web3 && global.Web3.utils && global.Web3.utils.isAddress && global.Web3.utils.isAddress(v))
                  || (global.ethers && global.ethers.isAddress && global.ethers.isAddress(v));
        var badCtl = stakingAddr && v.toLowerCase() === stakingAddr;
        if (sendBtn) sendBtn.disabled = !okAddr || badCtl;
      };
      if (input){ input.addEventListener('input', onType); onType(); }
    }, 0);
  }

  // Wire buttons inside Owned cards + header
  function wireCardActions(root){
    root = root || document;
    $$('.owned-card', root).forEach(function(card){
      var id = Number(card.getAttribute('data-id'));
      var staked = card.getAttribute('data-staked') === 'true';
      $$('[data-act]', card).forEach(function(btn){
        var act = btn.getAttribute('data-act');
        if (act==='stake'){ btn.onclick=function(){ openStakePanel(id, imgFor(id)); }; }
        else if (act==='unstake'){ btn.onclick=function(){ openUnstakePanel(id, imgFor(id)); }; }
        else if (act==='transfer'){
          if (staked){ btn.disabled=true; btn.classList.add('disabled'); }
          else { btn.onclick=function(){ openTransferPanel(id); }; }
        }
      });
    });

    var claimBtn = document.getElementById('ownedClaimBtn') || $('[data-owned-claim]');
    if (claimBtn){ claimBtn.onclick=function(){ openClaimPanel(); }; }

    var approveBtn = document.getElementById('ownedApproveBtn') || $('[data-owned-approve]');
    if (approveBtn){ approveBtn.onclick=function(){ openApprovePanel(); }; }
  }

  FF.ownedPanel = Object.assign(FF.ownedPanel || {}, {
    openApprovePanel: openApprovePanel,
    openStakePanel: openStakePanel,
    openUnstakePanel: openUnstakePanel,
    openClaimPanel: openClaimPanel,
    openTransferPanel: openTransferPanel,
    wireCardActions: wireCardActions
  });

  document.addEventListener('DOMContentLoaded', function(){ wireCardActions(); });

})(window);