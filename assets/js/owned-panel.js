// assets/js/owned-panel.js
// FreshFrogs — Owned Panel: 128x128 media + Approve/Stake/Unstake copies + Transfer flow + gray-out
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
      .btn-disabled, button[disabled]{
        opacity:.45; pointer-events:none; filter:grayscale(0.8);
      }
      .om-field{ display:flex; flex-direction:column; gap:6px; margin-top:10px; }
      .om-field label{ font-size:12px; opacity:.85; }
      .om-input{ width:100%; padding:10px 12px; border:1px solid var(--border); background:var(--panel);
                 color:var(--text); border-radius:10px; font-family:inherit; }
      .om-help{ font-size:12px; opacity:.8; margin-top:6px; }
    `.trim();
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- Helpers ----------
  const toast = (m)=> window.dispatchEvent(new CustomEvent('ff:toast',{detail:m}));
  const $ = (sel, root=document)=> root.querySelector(sel);

  function getWallet(){ return (FF && FF.wallet && FF.wallet.address) || null; }
  function getStaking(){ return (FF && FF.staking) || window.FF_STAKING || {}; }

  function getModal(){ return document.getElementById('ownedModal'); }
  function closeModal(root){
    const bd = root.querySelector('.om-backdrop');
    if (bd) { bd.click(); return; }
    root.style.display = 'none';
  }

  function parseTokenIdFromTitle(titleText){
    const m = (titleText||'').match(/#\s?(\d{1,6})/);
    return m ? Number(m[1]) : null;
  }
  function currentActionType(titleText){
    const t = (titleText||'').toLowerCase();
    if (t.includes('approve')) return 'approve';
    if (t.includes('unstake')) return 'unstake';
    if (t.includes('stake')) return 'stake';
    if (t.includes('transfer')) return 'transfer';
    return null;
  }

  function ensureThumb128(root){
    const img = root.querySelector('.om-media .om-thumb');
    if (!img) return;
    img.style.width = '128px';
    img.style.height = '128px';
  }
  function ensureNameUnderImage(root, titleText){
    const media = root.querySelector('.om-media');
    if (!media) return;
    if (media.querySelector('.om-name')) return;
    const id = parseTokenIdFromTitle(titleText);
    const nm = document.createElement('div');
    nm.className = 'om-name';
    nm.textContent = (id!=null) ? `Frog #${id}` : 'Frog';
    const img = media.querySelector('.om-thumb');
    if (img && img.nextSibling){ img.parentNode.insertBefore(nm, img.nextSibling); }
    else media.appendChild(nm);
  }

  function setConciseCopy(root, type){
    const body = root.querySelector('.om-copy');
    if (!body) return;
    const sym = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
    if (type === 'approve'){
      body.innerHTML = `<p>One-time setup to let the controller move your frogs for staking. This does not transfer ownership.</p>`;
    }else if (type === 'stake'){
      body.innerHTML = `<p>Stake this frog to start earning ${sym}. You can unstake any time. Gas fees apply.</p>`;
    }else if (type === 'unstake'){
      body.innerHTML = `<p>Unstake to stop earning ${sym} and return this frog to your wallet. Unclaimed rewards remain claimable.</p>`;
    }
  }

  // ---------- Actions: Approve / Stake / Unstake ----------
  async function doApprove(root){
    const addr = getWallet();
    if (!addr){ toast('Connect wallet first'); return; }
    const S = getStaking();
    try{
      if (typeof S.approveIfNeeded === 'function'){
        await S.approveIfNeeded(addr);
      }else if (window.Web3 && window.COLLECTION_ABI && CFG.COLLECTION_ADDRESS && CFG.CONTROLLER_ADDRESS){
        const web3 = new Web3(window.ethereum);
        const col = new web3.eth.Contract(window.COLLECTION_ABI, CFG.COLLECTION_ADDRESS);
        await col.methods.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true).send({ from: addr });
      }else{
        throw new Error('Approval helper unavailable');
      }
      toast('Approved!');
      closeModal(root);
    }catch(err){ console.warn('approve failed', err); toast('Approval failed'); }
  }

  async function doStake(root, tokenId){
    const addr = getWallet();
    if (!addr || !Number.isFinite(tokenId)){ toast('Missing wallet or token id'); return; }
    const S = getStaking();
    try{
      if (typeof S.stake === 'function') { await S.stake(tokenId); toast('Staked!'); }
      else {
        const fallback = root.querySelector('button[data-act="stake"]');
        if (fallback){ fallback.click(); return; }
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
      if (typeof S.unstake === 'function') { await S.unstake(tokenId); toast('Unstaked!'); }
      else {
        const fallback = root.querySelector('button[data-act="unstake"]');
        if (fallback){ fallback.click(); return; }
        throw new Error('No unstake() available');
      }
      closeModal(root);
    }catch(err){ console.warn('unstake failed', err); toast('Unstake failed'); }
  }

  // ---------- Transfer UI + Action ----------
  function buildTransferCopy(body, tokenId){
    body.innerHTML = `
      <p>Send this frog to another wallet. <strong>Transfers are permanent</strong>—once sent, it can’t be undone.</p>
      <div class="om-field">
        <label for="om-transfer-to">Recipient address (0x…)</label>
        <input id="om-transfer-to" class="om-input" type="text" placeholder="0xRecipient…" spellcheck="false" autocomplete="off" />
      </div>
      <div class="om-help">Tip: double-check the address before sending.</div>
    `;
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

  function ensureActions(root, type, tokenId){
    let actions = root.querySelector('.om-actions');
    if (!actions){
      actions = document.createElement('div');
      actions.className = 'om-actions';
      (root.querySelector('.om-body') || root).appendChild(actions);
    }
    // reset and rebuild
    actions.innerHTML = '';
    const primary = document.createElement('button');
    primary.className = 'btn';
    primary.textContent = (type==='approve') ? 'Approve'
                        : (type==='stake')   ? 'Stake'
                        : (type==='unstake') ? 'Unstake'
                        : (type==='transfer')? 'Send'
                        : 'Confirm';
    const cancel = document.createElement('button');
    cancel.className = 'btn-secondary';
    cancel.textContent = 'Cancel';
    actions.append(primary, cancel);

    cancel.addEventListener('click', ()=> closeModal(root));
    if (type==='approve') primary.addEventListener('click', ()=> doApprove(root));
    if (type==='stake')   primary.addEventListener('click', ()=> doStake(root, tokenId));
    if (type==='unstake') primary.addEventListener('click', ()=> doUnstake(root, tokenId));
    if (type==='transfer')primary.addEventListener('click', ()=> doTransfer(root, tokenId));
  }

  // ---------- Modal content updater ----------
  function applyModalTweaks(){
    const root = getModal();
    if (!root) return;
    const titleEl = root.querySelector('.om-title');
    if (!titleEl) return;

    const title = titleEl.textContent || '';
    let type = currentActionType(title);

    // If it's a Transfer opened via our handler, title already set; else detect by data-flag
    if (!type && root.getAttribute('data-ff-transfer') === '1') type = 'transfer';
    if (!type) return;

    let tokenId = parseTokenIdFromTitle(title);
    const dataId = root.getAttribute('data-token-id') || root.querySelector('[data-token-id]')?.getAttribute('data-token-id');
    if (dataId && !Number.isFinite(tokenId)) tokenId = Number(dataId);

    ensureThumb128(root);
    ensureNameUnderImage(root, title);

    const body = root.querySelector('.om-copy');
    if (type === 'transfer'){ buildTransferCopy(body, tokenId); }
    else setConciseCopy(root, type);

    ensureActions(root, type, tokenId);
  }

  // ---------- Open Transfer modal from any transfer button ----------
  function openTransferModal(tokenId, imgSrc){
    const root = getModal();
    if (!root){ toast('Modal not found'); return; }
    // Title
    const titleEl = root.querySelector('.om-title') || (()=>{ const t=document.createElement('div'); t.className='om-title'; root.prepend(t); return t; })();
    titleEl.textContent = `Transfer • Frog #${tokenId}`;

    // Media image (reuse existing .om-media & .om-thumb)
    const media = root.querySelector('.om-media') || (()=>{ const m=document.createElement('div'); m.className='om-media'; (root.querySelector('.om-body')||root).prepend(m); return m; })();
    let thumb = media.querySelector('.om-thumb');
    if (!thumb){ thumb = document.createElement('img'); thumb.className = 'om-thumb'; media.prepend(thumb); }
    if (imgSrc) thumb.src = imgSrc;

    // Mark as transfer so updater knows how to build copy/actions
    root.setAttribute('data-ff-transfer', '1');
    root.setAttribute('data-token-id', String(tokenId));

    // Show the modal (prefer your existing show logic by clicking backdrop toggles, else display)
    root.style.display = 'block';

    // Apply content
    applyModalTweaks();
  }

  // Attach click handler: any button[data-act="transfer"]
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act="transfer"]');
    if (!btn) return;
    e.preventDefault();

    // If staked -> block & toast
    if (btn.matches('.btn-disabled,[disabled]') || btn.getAttribute('aria-disabled') === 'true'){
      toast('This frog is staked. Unstake before transferring.');
      return;
    }

    const tokenId = Number(btn.getAttribute('data-token-id') || btn.dataset.tokenId);
    if (!Number.isFinite(tokenId)){ toast('Missing token id'); return; }

    // Try to find the nearest image source to preview in modal
    let imgSrc = null;
    const card = btn.closest('[data-frog-card], .frog, .frog-card, li, .card');
    const img = card?.querySelector('img, .thumb, .frog-thumb, .om-thumb');
    if (img && img.getAttribute) imgSrc = img.getAttribute('src');

    openTransferModal(tokenId, imgSrc);
  });

  // ---------- Gray out transfer buttons on staked frogs ----------
  function grayOutTransferForStaked(){
    // Seek any card that indicates staked state; support both data attr and class
    const cards = document.querySelectorAll('[data-frog-card],[data-token-id].frog,.frog-card,li,.card');
    cards.forEach(card=>{
      const isStaked = card.getAttribute?.('data-staked') === '1'
                    || card.classList?.contains('is-staked')
                    || card.querySelector?.('.badge-staked, [data-badge="staked"]');
      if (!isStaked) return;
      const btn = card.querySelector?.('button[data-act="transfer"]');
      if (btn){
        btn.classList.add('btn-disabled');
        btn.setAttribute('aria-disabled','true');
        btn.setAttribute('title','Unstake before transferring');
      }
    });
  }

  // ---------- Observer: update modal content whenever it changes ----------
  function attachObservers(){
    const root = getModal();
    if (root){
      const obs = new MutationObserver(()=>{
        // After any change, refresh content (title/media/copy/actions)
        applyModalTweaks();
      });
      obs.observe(root, { childList:true, subtree:true, characterData:true });
    }

    // When owned list re-renders, re-apply gray-out
    const ownedWrap = document.getElementById('ownedList') || document.body;
    const obs2 = new MutationObserver(()=>{
      clearTimeout(obs2._t);
      obs2._t = setTimeout(grayOutTransferForStaked, 20);
    });
    obs2.observe(ownedWrap, { childList:true, subtree:true });
  }

  // ---------- Boot ----------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{
      attachObservers();
      grayOutTransferForStaked();
    });
  }else{
    attachObservers();
    grayOutTransferForStaked();
  }

  // Expose (optional) in case other modules want to open transfer directly
  FF.openTransferModal = openTransferModal;

})(window.FF = window.FF || {}, window.FF_CFG || {});
