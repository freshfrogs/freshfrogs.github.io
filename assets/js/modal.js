
/* freshfrogs modal tweaks: stake/unstake/approval
   - non-breaking: augments existing panels, doesn’t change your tx logic
   - image -> 128x128, name below, improved copy, make sure buttons exist on approval
*/

(function () {
  // Utility: ensure a child element exists (by selector) or create it
  function ensure(el, selector, tag, className) {
    let node = el.querySelector(selector);
    if (!node) {
      node = document.createElement(tag);
      if (className) node.className = className;
      el.appendChild(node);
    }
    return node;
  }

  // Apply 128x128 + name + description to a panel root
  function enhanceFrogPanel(root, opts) {
    if (!root) return;

    // Figure out the token image + name from whatever the panel already has
    // We try a few common selectors you’ve used across versions.
    const img =
      root.querySelector('img.frog-thumb, img.frog, .frog img, .modal-frog img, img[data-frog]') ||
      root.querySelector('img');

    if (img) {
      img.classList.add('ff-frog-128');
      img.setAttribute('width', '128');
      img.setAttribute('height', '128');
      img.style.width = '128px';
      img.style.height = '128px';
      img.style.imageRendering = 'pixelated';
    }

    // A compact header block: [image] + [name]
    const head = ensure(root, '.ff-frog-head', 'div', 'ff-frog-head');
    if (!head.contains(img) && img && img.parentElement !== head) {
      head.prepend(img);
    }

    // Name resolution: prefer existing text in panel
    let nameText =
      (root.querySelector('.frog-name, .modal-frog-name, [data-frog-name]') || {}).textContent ||
      (img && (img.alt || img.getAttribute('data-name'))) ||
      opts?.fallbackName ||
      'Your Frog';

    const nameEl = ensure(head, '.ff-frog-name', 'div', 'ff-frog-name');
    nameEl.textContent = nameText;

    // Description
    const descEl = ensure(root, '.ff-frog-desc', 'p', 'ff-frog-desc');
    if (opts?.kind === 'stake') {
      descEl.textContent =
        'Stake this frog to start earning FLYZ. You can unstake anytime. Rewards accrue while staked.';
    } else if (opts?.kind === 'unstake') {
      descEl.textContent =
        'Unstake to stop earning FLYZ and return the frog to your wallet. Staked rewards remain claimable.';
    } else if (opts?.kind === 'approve') {
      // Shortened, same message
      descEl.textContent =
        'Allow the staking contract to move your frogs so staking works. You can revoke approval anytime.';
    }

    // Actions (make sure we have two buttons visible)
    const actions = ensure(root, '.ff-modal-actions', 'div', 'ff-modal-actions');
    // Try to re-use existing buttons if present
    let confirmBtn =
      actions.querySelector('.btn-primary, .btn-confirm, [data-action="confirm"]') ||
      root.querySelector('.btn-primary, .btn-confirm, [data-action="confirm"]');
    let cancelBtn =
      actions.querySelector('.btn-ghost, .btn-cancel, [data-action="cancel"]') ||
      root.querySelector('.btn-ghost, .btn-cancel, [data-action="cancel"]');

    if (!confirmBtn) {
      confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.setAttribute('data-action', 'confirm');
      confirmBtn.textContent =
        opts?.kind === 'approve' ? 'Approve' : opts?.kind === 'stake' ? 'Stake' : 'Unstake';
      actions.appendChild(confirmBtn);
    }
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.setAttribute('data-action', 'cancel');
      cancelBtn.textContent = 'Cancel';
      actions.appendChild(cancelBtn);
    }

    // If the host code already wired handlers, we don’t interfere.
    // If not, provide safe defaults that close the panel by clicking any [data-close] or the host’s close control.
    if (!confirmBtn._ffBound && typeof window.dispatchEvent === 'function') {
      confirmBtn._ffBound = true;
      confirmBtn.addEventListener('click', () => {
        // Let your existing listeners handle the tx.
        // We fire a generic event some versions listen for:
        window.dispatchEvent(new CustomEvent('ff:modal:confirm', { detail: { kind: opts?.kind } }));
      });
    }
    if (!cancelBtn._ffBound) {
      cancelBtn._ffBound = true;
      const close = () =>
        (root.querySelector('[data-close], .modal-close, .panel-close') || {}).click?.();
      cancelBtn.addEventListener('click', close);
    }
  }

  // Observe panels as they are opened; enhance when we recognize them.
  const recognizers = [
    { kind: 'stake',  test: (n) => /stake/i.test(n.textContent || '') },
    { kind: 'unstake',test: (n) => /unstake/i.test(n.textContent || '') },
    { kind: 'approve',test: (n) => /approve/i.test(n.textContent || '') },
  ];

  const enhanceIfPanel = (node) => {
    if (!(node instanceof HTMLElement)) return;
    const isModalish =
      node.getAttribute('role') === 'dialog' ||
      node.classList.contains('modal') ||
      node.classList.contains('panel') ||
      node.hasAttribute('data-modal');

    if (!isModalish) return;

    for (const r of recognizers) {
      if (r.test(node)) {
        enhanceFrogPanel(node, { kind: r.kind });
      }
    }
  };

  // Initial pass for already-opened panels
  document.querySelectorAll('[role="dialog"], .modal, .panel[data-modal]').forEach(enhanceIfPanel);

  // Mutation observer for panels opening later
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach(enhanceIfPanel);
      if (m.type === 'attributes') enhanceIfPanel(m.target);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

})();
