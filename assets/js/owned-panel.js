// assets/js/owned-panel.js
// FreshFrogs — Owned Panel: 128×128 media + concise copy + Transfer panel + gray-out + public openers
(function(FF, CFG){
  'use strict';

  // ---------- Small CSS override injected (keeps styles.css untouched) ----------
  (function injectCSS(){
    const ID = 'ff-owned-modal-css-128';
    if (document.getElementById(ID)) return;
    const css = `
      #ownedModal .om-media{
        display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
        gap:14px; margin:6px 0 12px; text-align:center;
      }
      #ownedModal .om-media .om-thumb{
        width:128px; height:128px; min-width:128px; min-height:128px;
        border-radius:12px; border:1px solid var(--border); background:#111; object-fit:cover;
        image-rendering: pixelated;
      }
      #ownedModal .om-media .om-name{ font-weight:700; font-size:14px; margin-top:6px; }
      #ownedModal .om-actions{ display:flex; gap:10px; justify-content:center; margin-top:12px; }
      #ownedModal .om-actions .btn, #ownedModal .om-actions .btn-secondary{ min-width:120px; }

      /* Disabled (gray) transfer buttons for staked frogs */
      .btn-disabled, button[disabled]{ opacity:.45; pointer-events:none; filter:grayscale(0.8); }

      /* Transfer input */
      .om-field{ display:flex; flex-direction:column; gap:6px; margin-top:10px; }
      .om-field label{ font-size:12px; opacity:.85; }
      .om-input{
        width:100%; padding:10px 12px; border:1px solid var(--border); background:var(--panel);
        color:var(--text); border-radius:10px; font-family:inherit;
      }
      .om-help{ font-size:12px; opacity:.8; margin-top:6px; }
    `.trim();
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- Shorthands ----------
  const toast = (m)=> window.dispatchEvent(new CustomEvent('ff:toast',{detail:m}));
  const $ = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  function getWallet(){ return (FF && FF.wallet && FF.wallet.address) || null; }
  function getStaking(){ return (FF && FF.staking) || window.FF_STAKING || {}; }
  function getModal(){ return document.getElementById('ownedModal'); }

  function closeModal(root){
    const bd = root.querySelector('.om-backdrop');
    if (bd) { bd.click(); return; }
    root.style.display = 'none';
  }

  function ensureOwnedModalSkeleton(){
    const root = getModal();
    if (!root) return null;
    let body = root.querySelector('.om-body');
    if (!body){ body = document.createElement('div'); body.className='om-body'; root.appendChild(body); }
    let media = root.querySelector('.om-media');
    if (!media){ media = document.createElement('div'); media.className='om-media'; body.prepend(media); }
    let copy = root.querySelector('.om-copy');
    if (!copy){ copy = document.createElement('div'); copy.className='om-copy'; body.appendChild(copy); }
    let actions = root.querySelector('.om-actions');
    if (!actions){ actions = document.createElement('div'); actions.className='om-actions'; body.appendChild(actions); }
    let title = root.querySelector('.om-title');
    if (!title){ title = document.createElement('div'); title.className='om-title'; root.prepend(title); }
    return root;
  }

  function parseTokenIdFromTitle(titleText){
    const m = (titleText||'').match(/#\s?(\d{1,6})/);
    return m ? Number(m[1]) : null;
  }

  function setThumb(root, src){
    const media = root.querySelector('.om-media');
    let img = media.querySelector('.om-thumb');
    if (!img){ img = document.createElement('img'); img.className='om-thumb'; media.prepend(img); }
    if (src) img.src = src;
    img.style.width = '128px';
    img.style.height = '128px';
  }

  function setNameUnderThumb(root, tokenId){
    const media = root.querySelector('.om-media');
    if (media.querySelector('.om-name')) return;
    const nm = document.createElement('div');
    nm.className = 'om-name';
    nm.textContent = tokenId != null ? `Frog #${tokenId}` : 'Frog';
    const img = media.querySelector('.om-thumb');
    if (img && img.nextSibling){ img.parentNode.insertBefore(nm, img.nextSibling); }
    else media.appendChild(nm);
  }

  // ---------- Concise descriptions ----------
  function setApproveCopy(root){
    $('.om-copy', root).innerHTML = `<p>One-time setup to let the controller move your frogs for staking. This does not transfer ownership.</p>`;
  }
  function setStakeCopy(root){
    const sym = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
    $('.om-copy', root).innerHTML = `<p>Stake this frog to start earning ${sym}. You can unstake any time. Gas fees apply.</p>`;
  }
  function setUnstakeCopy(root){
    const sym = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
    $('.om-copy', root).innerHTML = `<p>Unstake to stop earning ${sym} and return this frog to your wallet. Unclaimed rewards remain claimable.</p>`;
  }
  function setTransferCopy(root){
    $('.om-copy', root).innerHTML = `
      <p>Send this frog to another wallet. <strong>Transfers are permanent</strong>—once sent, it can’t be undone.</p>
      <div class="om-field">
        <label for="om-transfer-to">Recipient address (0x…)</label>
        <input id="om-transfer-to" class="om-input" type="text" placeholder="0xRecipient…" spellcheck="false" autocomplete="off"/>
      </div>
      <div class="om-help">Tip: double-check the address before sending.</div>
    `;
  }

  function resetActions(root){
    const actions = $('.om-actions', root);
    actions.innerHTML = '';
    const primary = document.createElement('button');
    primary.className = 'btn';
    const cancel = document.createElement('button');
    cancel.className = 'btn-secondary';
    cancel.textContent = 'Cancel';
    actions.append(primary, cancel);
    cancel.addEventListener('click', ()=> closeModal(root));
    return primary;
  }

  // ---------- On-chain calls ----------
  async function doApprove(root){
    const addr = getWallet();
    if (!addr){ toast('Connect wallet first'); return; }
    const S = getStaking();
    try{
      if (typeof S.approveIfNeeded === 'function') {
        await S.approveIfNeeded(addr);
      } else if (window.Web3 && window.COLLECTION_ABI && CFG.COLLECTION_ADDRESS && CFG.CONTROLLER_ADDRESS){
        const web3 = new Web3(window.ethereum);
        const col = new web3.eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
        await col.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: addr });
      } else throw new Error('Approval helper unavailable');
      toast('Approved!');
      closeModal(root);
    }catch(err){ console.warn('approve failed', err); toast('Approval failed'); }
  }

  async function doStake(root, tokenId){
    const addr = getWallet();
    if (!addr || !Number.isFinite(tokenId)){ toast('Missing wallet or token id'); return; }
    const S = getStaking();
    try{
      if (typeof S.stake === 'function'){ await S.stake(tokenId); toast('Staked!'); }
      else {
        const fb = root.querySelector('button[data-act="stake"]'); if (fb){ fb.click(); return; }
        throw new Error('No stake() available');
      }
      closeModal(root);
    }catch(err){ console.warn('stake failed', err); toast('Stake failed'); }
  }

  async function doUnstake(root, tokenId){
    const addr = getWallet();
    if (!addr || !Number.isFinite(tokenId)){ toast('Missing wallet or token id'); return; }
    const S = getStaking();
    try{
      if (typeof S.unstake === 'function'){ await S.unstake(tokenId); toast('Unstaked!'); }
      else {
        const fb = root.querySelector('button[data-act="unstake"]'); if (fb){ fb.click(); return; }
        throw new Error('No unstake() available');
      }
      closeModal(root);
    }catch(err){ console.warn('unstake failed', err); toast('Unstake failed'); }
  }

  function isValidEthAddress(addr){
    try{
      if (!window.Web3) return /^0x[a-fA-F0-9]{40}$/.test(addr);
      return new Web3().utils.isAddress(addr);
    }catch{ return false; }
  }

  async function doTransfer(root, tokenId){
    const from = getWallet();
    if (!from){ toast('Connect wallet first'); return; }
    if (!Number.isFinite(tokenId)){ toast('Missing token id'); return; }
    const input = $('#om-transfer-to', root);
    const to = (input?.value||'').trim();
    if (!isValidEthAddress(to)){ toast('Enter a valid recipient address'); input?.focus(); return; }
    if (to.toLowerCase() === from.toLowerCase()){ toast('Recipient is your address'); return; }

    try{
      if (!(window.Web3 && window.COLLECTION_ABI && CFG.COLLECTION_ADDRESS)){
        throw new Error('Missing Web3/ABI/config');
      }
      const web3 = new Web3(window.ethereum);
      const col = new web3.eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
      await col.methods.safeTransferFrom(from, to, String(tokenId)).send({ from });
      toast('Transfer sent!');
      closeModal(root);
    }catch(err){ console.warn('transfer failed', err); toast('Transfer failed'); }
  }

  // ---------- Public openers (builds the modal each time) ----------
  function openApprovePanel(){
    const root = ensureOwnedModalSkeleton(); if (!root) return;
    $('.om-title', root).textContent = 'Approve Staking';
    $('.om-media', root).innerHTML = `<img class="om-thumb" alt="Logo" />`; // can be replaced by project logo if you prefer
    setThumb(root, $('.site-logo img')?.src || $('.logo img')?.src || '');
    setNameUnderThumb(root, null);
    setApproveCopy(root);
    const primary = resetActions(root);
    primary.textContent = 'Approve';
    primary.addEventListener('click', ()=> doApprove(root));
    root.style.display = 'block';
  }

  function openStakePanel(tokenId, imgSrc){
    const root = ensureOwnedModalSkeleton(); if (!root) return;
    $('.om-title', root).textContent = `Stake • Frog #${tokenId}`;
    setThumb(root, imgSrc);
    setNameUnderThumb(root, tokenId);
    setStakeCopy(root);
    const primary = resetActions(root);
    primary.textContent = 'Stake';
    primary.addEventListener('click', ()=> doStake(root, tokenId));
    root.style.display = 'block';
  }

  function openUnstakePanel(tokenId, imgSrc){
    const root = ensureOwnedModalSkeleton(); if (!root) return;
    $('.om-title', root).textContent = `Unstake • Frog #${tokenId}`;
    setThumb(root, imgSrc);
    setNameUnderThumb(root, tokenId);
    setUnstakeCopy(root);
    const primary = resetActions(root);
    primary.textContent = 'Unstake';
    primary.addEventListener('click', ()=> doUnstake(root, tokenId));
    root.style.display = 'block';
  }

  function openClaimPanel(){
    const root = ensureOwnedModalSkeleton(); if (!root) return;
    $('.om-title', root).textContent = 'Claim Rewards';
    $('.om-media', root).innerHTML = `<img class="om-thumb" alt="Rewards" />`;
    setThumb(root, $('.site-logo img')?.src || $('.logo img')?.src || '');
    $('.om-copy', root).innerHTML = `<p>Claim any unclaimed rewards to your connected wallet.</p>`;
    const primary = resetActions(root);
    primary.textContent = 'Claim';
    primary.addEventListener('click', async ()=>{
      const S = getStaking();
      try{
        if (typeof S.claimRewards === 'function'){ await S.claimRewards(); toast('Rewards claimed!'); }
        else throw new Error('No claimRewards() available');
        closeModal(root);
      }catch(err){ console.warn('claim failed', err); toast('Claim failed'); }
    });
    root.style.display = 'block';
  }

  function openTransferPanel(tokenId, imgSrc){
    const root = ensureOwnedModalSkeleton(); if (!root) return;
    $('.om-title', root).textContent = `Transfer • Frog #${tokenId}`;
    setThumb(root, imgSrc);
    setNameUnderThumb(root, tokenId);
    setTransferCopy(root);
    const primary = resetActions(root);
    primary.textContent = 'Send';
    primary.addEventListener('click', ()=> doTransfer(root, tokenId));
    root.style.display = 'block';
  }

  // ---------- Helpers for card wiring ----------
  function imgFor(tokenId){
    if (typeof FF?.imgFor === 'function') return FF.imgFor(tokenId);
    // fallback guess; change if your path differs
    return `assets/frog/${tokenId}.png`;
  }

  function wireCardActions(root=document){
    // stake / unstake / transfer buttons inside cards
    root.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;

      const act = btn.getAttribute('data-act');
      if (!act) return;

      // If transfer is disabled because staked, block
      if (act === 'transfer' && (btn.classList.contains('btn-disabled') || btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled')==='true')){
        toast('This frog is staked. Unstake before transferring.');
        return;
      }

      const id = Number(btn.getAttribute('data-token-id') || btn.dataset.tokenId);
      if ((act === 'stake' || act === 'unstake' || act === 'transfer') && !Number.isFinite(id)){
        toast('Missing token id');
        return;
      }

      // try to find a nearby image for the modal
      let src = null;
      const card = btn.closest('[data-frog-card], .frog, .frog-card, li, .card');
      const imgEl = card?.querySelector('img, .thumb, .frog-thumb, .om-thumb');
      if (imgEl && imgEl.getAttribute) src = imgEl.getAttribute('src') || null;

      if (act === 'stake')    openStakePanel(id, src || imgFor(id));
      if (act === 'unstake')  openUnstakePanel(id, src || imgFor(id));
      if (act === 'transfer') openTransferPanel(id, src || imgFor(id));
    });

    // header actions (approve / claim) if present
    const approveBtn = document.querySelector('[data-owned-approve]');
    if (approveBtn){
      approveBtn.addEventListener('click', (e)=>{ e.preventDefault(); openApprovePanel(); });
    }
    const claimBtn = document.querySelector('[data-owned-claim]');
    if (claimBtn){
      claimBtn.addEventListener('click', (e)=>{ e.preventDefault(); openClaimPanel(); });
    }
  }

  // ---------- Gray out transfer buttons for staked frogs ----------
  function grayOutTransferForStaked(){
    // Any card with these signals is considered staked
    const cards = document.querySelectorAll('[data-frog-card],[data-token-id].frog,.frog-card,li,.card');
    cards.forEach(card=>{
      const isStaked = card.getAttribute?.('data-staked') === '1'
                    || card.classList?.contains('is-staked')
                    || !!card.querySelector?.('.badge-staked, [data-badge="staked"], .ff-staked-flag');
      if (!isStaked) return;
      const btn = card.querySelector?.('button[data-act="transfer"]');
      if (btn){
        btn.classList.add('btn-disabled');
        btn.setAttribute('aria-disabled','true');
        btn.setAttribute('title','Unstake before transferring');
      }
    });
  }

  // ---------- Observe DOM updates to re-apply gray out ----------
  function attachObservers(){
    const ownedWrap = document.getElementById('ownedList') || document.body;
    const obs = new MutationObserver(()=>{
      clearTimeout(obs._t);
      obs._t = setTimeout(grayOutTransferForStaked, 20);
    });
    obs.observe(ownedWrap, { childList:true, subtree:true });
  }

  // ---------- Boot ----------
  function boot(){
    wireCardActions(document);
    attachObservers();
    grayOutTransferForStaked();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // expose openers for other modules
  FF.openApprovePanel  = openApprovePanel;
  FF.openStakePanel    = openStakePanel;
  FF.openUnstakePanel  = openUnstakePanel;
  FF.openClaimPanel    = openClaimPanel;
  FF.openTransferPanel = openTransferPanel;

})(window.FF = window.FF || {}, window.FF_CFG || {});
