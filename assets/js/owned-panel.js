// assets/js/owned-panel.js
// Fills the "My Frogs (Owned)" panel without changing appearance.
// Uses FFAPI; shows staked first with "Staked Xd ago • Owned by You".
(function(){
  'use strict';

  const grid   = document.getElementById('ownedGrid');
  const btn    = document.getElementById('ownedConnectBtn');
  const moreEl = document.getElementById('ownedMore');

  if (!grid) return;

  let state = {
    addr: null,
    cont: null,
    loading: false
  };

  function imgSrc(id){
    const base = (window.FF_CFG?.SOURCE_PATH || '').replace(/\/+$/,'');
    return `${base}/frog/png/${id}.png`;
  }

  function renderCard(id, badge){
    const el = document.createElement('div');
    el.className = 'frog-card';
    el.innerHTML = `
      <img class="thumb" loading="lazy" decoding="async" src="${imgSrc(id)}" alt="#${id}">
      <h4 class="title mono">#${id}</h4>
      <div class="meta">${badge || ''}</div>
      <div class="actions"></div>
    `;
    return el;
  }

  function setLoading(on){
    state.loading = !!on;
    if (moreEl) moreEl.style.display = on ? 'block' : 'none';
    if (moreEl) moreEl.textContent = on ? 'Loading…' : '';
  }

  async function loadOwnedFirstPage(addr){
    setLoading(true);
    try{
      // 1) staked (with days)
      const staked = await window.FFAPI.fetchStakedFrogsDetailed(addr);

      // 2) owned (page 1 via Reservoir)
      const ownedPage = await window.FFAPI.fetchOwnedFrogs(addr, null, 20);
      state.cont = ownedPage.continuation || null;

      // merge staked-first, then remaining owned
      const seen = new Set(staked.map(x => x.id));
      const merged = [
        ...staked.map(s => ({ id: s.id, badge: s.stakedDays!=null ? `Staked ${s.stakedDays}d ago • Owned by You` : 'Staked • Owned by You' })),
        ...(ownedPage.items || []).filter(o => !seen.has(o.id)).map(o => ({ id: o.id, badge: 'Owned by You' }))
      ];

      // render
      const frag = document.createDocumentFragment();
      merged.forEach(it => frag.appendChild(renderCard(it.id, it.badge)));
      grid.innerHTML = '';
      grid.appendChild(frag);

    } catch(e){
      console.warn('[owned] load failed', e);
      grid.innerHTML = `<div class="pg-muted">Could not load your frogs.</div>`;
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreOwned(){
    if (!state.addr || !state.cont || state.loading) return;
    setLoading(true);
    try{
      const page = await window.FFAPI.fetchOwnedFrogs(state.addr, state.cont, 20);
      state.cont = page.continuation || null;

      const frag = document.createDocumentFragment();
      (page.items || []).forEach(o => frag.appendChild(renderCard(o.id, 'Owned by You')));
      grid.appendChild(frag);
    } catch(e){
      console.warn('[owned] load more failed', e);
    } finally { setLoading(false); }
  }

  // Hook up connect button to existing wallet flow if present
  if (btn){
    btn.addEventListener('click', async ()=>{
      // Prefer the global main connect button if present
      const mainBtn = document.getElementById('connectBtn');
      if (mainBtn) { mainBtn.click(); return; }
      // Fallback MetaMask request
      if (window.ethereum?.request){
        try{
          const accs = await window.ethereum.request({ method:'eth_requestAccounts' });
          const addr = (accs && accs[0]) || null;
          if (addr) window.dispatchEvent(new CustomEvent('wallet:connected', { detail:{ address: addr }}));
        }catch(e){ console.warn('wallet connect rejected'); }
      }
    });
  }

  // Wallet events (emitted by assets/js/wallet.js)
  window.addEventListener('wallet:connected', (ev)=>{
    const addr = ev?.detail?.address;
    if (!addr) return;
    state.addr = addr;
    loadOwnedFirstPage(addr);
  });

  // Infinite scroll inside the owned card container
  const wrap = grid.parentElement;
  wrap.addEventListener('scroll', ()=>{
    const nearBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 100;
    if (nearBottom) loadMoreOwned();
  });

  // If already connected, bootstrap immediately
  const maybeAddr = window?.FF?.wallet?.address || window?.WALLET_ADDR;
  if (maybeAddr){
    state.addr = maybeAddr;
    loadOwnedFirstPage(maybeAddr);
  }
})();
