(function(FF){
  let user_address = null;

  function setWalletUI(addr){
    const label=document.getElementById('walletLabel');
    const btn=document.getElementById('connectBtn');
    if(addr){ label.textContent='Connected: '+FF.shorten(addr); label.style.display=''; btn.textContent='Disconnect'; }
    else { label.style.display='none'; btn.textContent='Connect Wallet'; }
  }

  async function connectWallet(){
    if(location.protocol==='file:'){ alert('Open the site over http(s) to enable wallet connections.'); return; }
    const provider = window.ethereum;
    if(!provider){ alert("No Ethereum provider found. Install/enable MetaMask."); return; }
    try{
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      user_address = accounts?.[0] || null;
      setWalletUI(user_address);
      if(user_address){
        window.FF_clearOwned();
        window.FF_fetchOwned(user_address);
        document.getElementById('stakeStatus').textContent='Connected. Load Owned/Staked below.';
      }
    }catch(e){ console.warn(e); }
  }

  function disconnectWallet(){
    user_address = null;
    setWalletUI(null);
    window.FF_clearOwned();
    window.FF_clearStaked();
    document.getElementById('stakeStatus').textContent='Disconnected.';
  }

  // buttons
  document.getElementById('connectBtn')?.addEventListener('click', ()=>{ user_address ? disconnectWallet() : connectWallet(); });

  // accountsChanged
  if(window.ethereum){
    window.ethereum.on?.('accountsChanged',(a)=>{
      user_address = a?.[0] || null;
      setWalletUI(user_address);
      if(user_address){ window.FF_clearOwned(); window.FF_fetchOwned(user_address); }
      else { window.FF_clearOwned(); window.FF_clearStaked(); }
    });
  }

  // expose
  window.FF_getUser = ()=> user_address;
  window.FF_setWalletUI = setWalletUI;
})(window.FF);
