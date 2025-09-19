// UI interactions, tabs, theme, lightbox, wallet connect
(function(){
  const $ = (sel, el=document)=> el.querySelector(sel);
  const $$ = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  // Theme toggles
  $('#themeNoir')?.addEventListener('click', ()=>{
    document.documentElement.setAttribute('data-theme','noir');
    localStorage.setItem('ff_theme','noir');
  });
  $('#themePastel')?.addEventListener('click', ()=>{
    document.documentElement.setAttribute('data-theme','pastel');
    localStorage.setItem('ff_theme','pastel');
  });

  // Tabs
  $$('.tabs .tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      $$('.tabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      $$('.tab-pane').forEach(p=>p.classList.remove('active'));
      $('#'+name)?.classList.add('active');
    });
  });

  // Lightbox
  const lb = $('#lightbox'), lbImg = $('#lightboxImg');
  $$('[data-lightbox]').forEach(img=>{
    img.addEventListener('click', ()=>{
      lbImg.src = img.src; lb.classList.remove('hidden');
    });
  });
  lb.addEventListener('click', ()=> lb.classList.add('hidden'));

  // Wallet connect (no auto-init)
  const addrEl = $('#walletAddr');
  $('#connectBtn')?.addEventListener('click', async ()=>{
    if(!window.ethereum){ alert('MetaMask not found'); return; }
    try{
      const accounts = await window.ethereum.request({ method:'eth_requestAccounts' });
      const addr = accounts?.[0];
      if(addr){
        addrEl.textContent = addr.slice(0,6)+'…'+addr.slice(-4);
        window.FF_walletAddress = addr;
      }
    }catch(e){ console.warn('Connect failed', e); }
  });

  // Owned refresh
  $('#ownedRefresh')?.addEventListener('click', ()=>{
    if(!window.FF_walletAddress){ alert('Connect first'); return; }
    window.FF_fetchOwned?.(window.FF_walletAddress);
  });

  // Staked load
  $('#stakedLoad')?.addEventListener('click', ()=>{
    if(!window.FF_walletAddress){ alert('Connect first'); return; }
    window.FF_loadStaked?.();
  });

})();