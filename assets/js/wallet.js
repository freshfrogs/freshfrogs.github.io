// assets/js/wallet.js
(function(){
  const SESSION_KEY = 'ff:connected';

  // Elements
  const connectBtn  = document.getElementById('connectBtn');
  const walletLabel = document.getElementById('walletLabel');

  let current = null; // current address (string | null)

  // ---------- utils ----------
  function shorten(addr){ return addr ? (addr.slice(0,6)+'…'+addr.slice(-4)) : ''; }

  function setFFWallet(addr){
    // Primary global used by newer code (modal, etc.)
    window.FF = window.FF || {};
    window.FF.wallet = {
      address: addr || null,
      connected: !!addr
    };

    // Compat globals some scripts read
    window.FF_WALLET = { address: addr || null, connected: !!addr };
    window.WALLET_ADDR = addr || null;
    window.SELECTED_WALLET = addr || null;
  }

  function emitConnected(addr){
    setFFWallet(addr);
    sessionStorage.setItem(SESSION_KEY, '1');
    window.user_address = addr; // legacy alias
    window.dispatchEvent(new CustomEvent('wallet:connected',    { detail:{ address: addr }}));
    window.dispatchEvent(new CustomEvent('FF:walletConnected',  { detail:{ address: addr }}));
  }
  function emitDisconnected(){
    setFFWallet(null);
    sessionStorage.removeItem(SESSION_KEY);
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
    if (!window.ethereum){
      alert('No Ethereum provider found. Please install MetaMask or a compatible wallet.');
      return;
    }
    try{
      // Explicit, user-initiated connect only (no auto-connect elsewhere)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = (accounts && accounts[0]) ? accounts[0] : null;
      if (!addr) return;
      current = addr;
      uiConnected(addr);
      emitConnected(addr);
    }catch(e){
      // user rejected or provider error; remain disconnected
    }
  }

  // ---------- initial (do NOT auto-connect) ----------
  setFFWallet(null);
  sessionStorage.removeItem(SESSION_KEY);
  uiDisconnected();

  // Click-to-connect only
  connectBtn?.addEventListener('click', requestConnect);

  // ---------- react to wallet/provider changes ----------
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
      // Keep the address; just re-emit so listeners can refetch if needed
      if (current){
        uiConnected(current);
        emitConnected(current);
      }
    });

    // Optional: handle disconnect event from some providers
    window.ethereum.on?.('disconnect', ()=>{
      current = null;
      uiDisconnected();
      emitDisconnected();
    });
  }
})();
