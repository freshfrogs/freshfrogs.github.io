// assets/js/wallet.js
(function(){
  const connectBtn  = document.getElementById('connectBtn');
  const walletLabel = document.getElementById('walletLabel');

  let current = null;

  function shorten(addr){ return addr ? (addr.slice(0,6)+'…'+addr.slice(-4)) : ''; }

  function emitConnected(addr){
    window.FF_WALLET = { address: addr, connected: true };
    window.user_address = addr; // compatibility for any legacy code
    window.dispatchEvent(new CustomEvent('wallet:connected', { detail:{ address: addr }}));
    // also emit a compat alias in case other scripts listen for it
    window.dispatchEvent(new CustomEvent('FF:walletConnected', { detail:{ address: addr }}));
  }
  function emitDisconnected(){
    window.FF_WALLET = { address: null, connected: false };
    window.user_address = null;
    window.dispatchEvent(new CustomEvent('wallet:disconnected'));
    window.dispatchEvent(new CustomEvent('FF:walletDisconnected'));
  }

  function uiConnected(addr){
    if (walletLabel){
      walletLabel.style.display = '';
      walletLabel.textContent = shorten(addr);
    }
    if (connectBtn){
      connectBtn.textContent = 'Connected';
      connectBtn.disabled = true;
      connectBtn.classList.add('btn-disabled');
    }
  }
  function uiDisconnected(){
    if (walletLabel){
      walletLabel.style.display = 'none';
      walletLabel.textContent = '';
    }
    if (connectBtn){
      connectBtn.textContent = 'Connect Wallet';
      connectBtn.disabled = false;
      connectBtn.classList.remove('btn-disabled');
    }
  }

  async function requestConnect(){
    if (!window.ethereum){ alert('No Ethereum provider found. Please install MetaMask or a compatible wallet.'); return; }
    try{
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = (accounts && accounts[0]) ? accounts[0] : null;
      if (!addr) return;
      current = addr;
      uiConnected(addr);
      emitConnected(addr);
    }catch(e){
      // user rejected / error — stay disconnected
    }
  }

  // Never auto-connect on page load
  uiDisconnected();

  // Click-to-connect only
  if (connectBtn){
    connectBtn.addEventListener('click', requestConnect);
  }

  // React to wallet changes after a user has connected once
  if (window.ethereum){
    window.ethereum.on?.('accountsChanged', (arr)=>{
      const addr = (arr && arr[0]) ? arr[0] : null;
      if (!addr){
        current = null;
        uiDisconnected();
        emitDisconnected();
      } else {
        current = addr;
        uiConnected(addr);
        emitConnected(addr);
      }
    });
    window.ethereum.on?.('chainChanged', ()=>{
      // keep address, just re-emit state so listeners can refetch if needed
      if (current){
        uiConnected(current);
        emitConnected(current);
      }
    });
  }
})();
