// assets/js/owned-panel.js
// FreshFrogs — Owned Panel modal tweaks (128x128 preview + concise copy + ensured actions)
(function(FF, CFG){
  'use strict';

  // ---------- Light CSS patch (injected so you don't have to touch styles.css) ----------
  (function injectCSS(){
    const ID = 'ff-owned-modal-css-128';
    if (document.getElementById(ID)) return;
    const css = `
      /* Owned modal — vertical media layout + 128px frog */
      #ownedModal .om-media{
        display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
        gap:14px; margin:6px 0 12px 0; text-align:center;
      }
      #ownedModal .om-media .om-thumb{
        width:128px; height:128px; min-width:128px; min-height:128px;
        border-radius:12px; border:1px solid var(--border); object-fit:cover; background:#111;
        image-rendering: pixelated;
      }
      #ownedModal .om-media .om-name{
        font-weight:700; font-size:14px; line-height:1.15; margin-top:6px;
      }
      #ownedModal .om-actions{
        display:flex; gap:10px; justify-content:center; margin-top:12px;
      }
      #ownedModal .om-actions .btn,
      #ownedModal .om-actions .btn-secondary{
        min-width:120px;
      }
    `.trim();
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ---------- Helpers ----------
  function toast(msg){ window.dispatchEvent(new CustomEvent('ff:toast', { detail: msg })); }
  function getWallet(){
    return (FF && FF.wallet && FF.wallet.address) || (window.FF_WALLET && window.FF_WALLET.address) || null;
  }
  function getStaking(){
    // prefer your unified staking namespace if present
    return (FF && FF.staking) || window.FF_STAKING || {};
  }
  function closeModal(root){
    // Prefer backdrop click to reuse existing close behavior
    const bd = root.querySelector('.om-backdrop');
    if (bd) { bd.click(); return; }
    root.style.display = 'none';
  }
  function parseTokenIdFromTitle(titleText){
    // expects something like "Stake • Frog #1234" or "Frog #7"
    const m = (titleText || '').match(/#\s?(\d{1,6})/);
    return m ? Number(m[1]) : null;
  }
  function currentActionType(titleText){
    const t = (titleText || '').toLowerCase();
    if (t.includes('approve')) return 'approve';
    if (t.includes('unstake')) return 'unstake';
    if (t.includes('stake')) return 'stake';
    return null;
  }

  // ---------- Action handlers ----------
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
    }catch(err){
      console.warn('approve failed', err);
      toast('Approval failed');
    }
  }

  async function doStake(root, tokenId){
    const addr = getWallet();
    if (!addr || !Number.isFinite(tokenId)){ toast('Missing wallet or token id'); return; }
    const S = getStaking();
    try{
      if (typeof S.stake === 'function'){
        await S.stake(tokenId);
        toast('Staked!');
      }else{
        // fallback: look for an existing hidden action button wired elsewhere
        const fallback = root.querySelector('button[data-act="stake"]');
        if (fallback){ fallback.click(); return; }
        throw new Error('No stake() available');
      }
      closeModal(root);
    }catch(err){
      console.warn('stake failed', err);
      toast('Stake failed');
    }
  }

  async function doUnstake(root, tokenId){
    const addr = getWallet();
    if (!addr || !Number.isFinite(tokenId)){ toast('Missing wallet or token id'); return; }
    const S = getStaking();
    try{
      if (typeof S.unstake === 'function'){
        await S.unstake(tokenId);
        toast('Unstaked!');
      }else{
        const fallback = root.querySelector('button[data-act="unstake"]');
        if (fallback){ fallback.click(); return; }
        throw new Error('No unstake() available');
      }
      closeModal(root);
    }catch(err){
      console.warn('unstake failed', err);
      toast('Unstake failed');
    }
  }

  // ---------- UI tweaks ----------
  function ensureNameUnderImage(root, titleText){
    const media = root.querySelector('.om-media');
    if (!media) return;

    const hasName = media.querySelector('.om-name');
    if (hasName) return;

    // Derive a friendly name from title if available
    const id = parseTokenIdFromTitle(titleText);
    const name = (id != null) ? `Frog #${id}` : 'Frog';

    const nm = document.createElement('div');
    nm.className = 'om-name';
    nm.textContent = name;

    // Place the name under the image
    const img = media.querySelector('.om-thumb');
    if (img && img.nextSibling){
      img.parentNode.insertBefore(nm, img.nextSibling);
    }else{
      media.appendChild(nm);
    }
  }

  function setConciseCopy(root, type){
    const body = root.querySelector('.om-copy');
    if (!body) return;

    const sym = CFG.REWARD_TOKEN_SYMBOL || '$FLYZ';
    if (type === 'approve'){
      body.innerHTML = `<p>One-time setup to let the controller move your frogs for staking. It doesn’t transfer ownership.</p>`;
    }else if (type === 'stake'){
      body.innerHTML = `<p>Stake this frog to start earning ${sym}. You can unstake any time. Gas fees apply.</p>`;
    }else if (type === 'unstake'){
      body.innerHTML = `<p>Unstake to stop earning ${sym} and return this frog to your wallet. Unclaimed rewards stay claimable.</p>`;
    }
  }

  function ensureActions(root, type, tokenId){
    let actions = root.querySelector('.om-actions');
    if (!actions){
      actions = document.createElement('div');
      actions.className = 'om-actions';
      // Append near copy if possible; otherwise at the end
      const body = root.querySelector('.om-body') || root;
      body.appendChild(actions);
    }

    // If there are already visible actions, don't duplicate
    const hasPrimary = actions.querySelector('.btn');
    const hasCancel  = actions.querySelector('.btn-secondary');
    if (hasPrimary && hasCancel){
      // refresh handlers (in case the tokenId changed)
      wireActions(actions, type, tokenId, root, true);
      return;
    }

    actions.innerHTML = ''; // reset
    const primary = document.createElement('button');
    primary.className = 'btn';
    primary.textContent = type === 'approve' ? 'Approve'
                         : type === 'stake'   ? 'Stake'
                         : type === 'unstake' ? 'Unstake'
                         : 'Confirm';

    const cancel = document.createElement('button');
    cancel.className = 'btn-secondary';
    cancel.textContent = 'Cancel';

    actions.append(primary, cancel);
    wireActions(actions, type, tokenId, root, false);
  }

  function wireActions(actions, type, tokenId, root, rewire){
    const primary = actions.querySelector('.btn');
    const cancel  = actions.querySelector('.btn-secondary');

    // remove previous listeners if rewire
    if (rewire){
      const cloneP = primary.cloneNode(true);
      const cloneC = cancel.cloneNode(true);
      actions.replaceChild(cloneP, primary);
      actions.replaceChild(cloneC, cancel);
    }

    const P = actions.querySelector('.btn');
    const C = actions.querySelector('.btn-secondary');

    C.addEventListener('click', ()=> closeModal(root));

    if (type === 'approve'){
      P.addEventListener('click', ()=> doApprove(root));
    }else if (type === 'stake'){
      P.addEventListener('click', ()=> doStake(root, tokenId));
    }else if (type === 'unstake'){
      P.addEventListener('click', ()=> doUnstake(root, tokenId));
    }
  }

  // Ensure the thumb has the 128×128 class and attributes; if not, coerce
  function ensureThumbSizing(root){
    const img = root.querySelector('.om-media .om-thumb');
    if (!img) return;
    img.style.width = '128px';
    img.style.height = '128px';
  }

  // ---------- Observer to react whenever the modal content changes ----------
  function attachModalObserver(){
    const root = document.getElementById('ownedModal');
    if (!root) return;

    const apply = () => {
      const titleEl = root.querySelector('.om-title');
      if (!titleEl) return;
      const titleText = titleEl.textContent || '';
      const type = currentActionType(titleText);
      if (!type) return;

      // derive token id from title or from data attributes
      let tokenId = parseTokenIdFromTitle(titleText);
      const dataId = root.getAttribute('data-token-id') || root.querySelector('[data-token-id]')?.getAttribute('data-token-id');
      if (dataId && !Number.isFinite(tokenId)) tokenId = Number(dataId);

      // Make sure media/name/size are correct
      ensureThumbSizing(root);
      ensureNameUnderImage(root, titleText);

      // Copy + actions
      setConciseCopy(root, type);
      ensureActions(root, type, tokenId, root);
    };

    // Run on initial open (in case the modal is already in DOM)
    apply();

    const obs = new MutationObserver((muts)=>{
      for (const m of muts){
        if (m.type === 'childList' || m.type === 'subtree' || m.type === 'characterData'){
          // small debounce
          clearTimeout(apply._t);
          apply._t = setTimeout(apply, 10);
          break;
        }
      }
    });
    obs.observe(root, { childList:true, subtree:true, characterData:true });
  }

  // ---------- Boot ----------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachModalObserver);
  }else{
    attachModalObserver();
  }

})(window.FF = window.FF || {}, window.FF_CFG || {});
