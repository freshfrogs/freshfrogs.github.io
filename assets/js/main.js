import { initTheme, FF_CFG } from './core.js';
import { renderGrid, renderSales, loadSalesLive, loadRarity, renderRarity, initWallet, getUser, clearOwned, fetchOwned, wireFeatureButtons } from './ui.js';
import { wireStakingUI, setTab, loadStaked } from './staking.js';

initTheme();
wireFeatureButtons();
wireStakingUI();

(async () => {
  await loadRarity();
  const ok = await loadSalesLive();
  const b=document.getElementById('fetchLiveBtn');
  if(ok && b){ b.textContent="Live loaded"; b.disabled=true; b.classList.add('btn-ghost'); }
  renderSales();
  renderGrid();
  setTab('owned');

  initWallet({
    onConnect: (addr)=>{
      clearOwned();
      fetchOwned(addr);
      loadStaked();
      document.getElementById('stakeStatus').textContent='Connected. Loading Owned/Staked…';
    },
    onDisconnect: ()=>{
      clearOwned();
      document.getElementById('stakeStatus').textContent='Disconnected.';
    },
    onChanged: (addr)=>{
      if(addr){
        clearOwned();
        fetchOwned(addr);
        loadStaked();
      }else{
        clearOwned();
        document.getElementById('stakeStatus').textContent='Disconnected.';
      }
    }
  });

  if (FF_CFG.AUTO_INIT && window.ethereum?.selectedAddress) {
    const pre = window.ethereum.selectedAddress;
    document.getElementById('walletLabel').textContent = 'Connected: ' + pre.slice(0,6)+'…'+pre.slice(-4);
    document.getElementById('walletLabel').style.display='';
    document.getElementById('connectBtn').textContent='Disconnect';
    clearOwned(); fetchOwned(pre); loadStaked();
  }
})();
