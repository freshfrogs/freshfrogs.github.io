// Simple shared wallet state with localStorage persistence
// Replace demoConnect() with real provider logic when ready.
(function(global){
const KEY = 'ff_wallet_state_v1';
const listeners = new Set();
let state = { connected:false, address:'', addressShort:'', network:'Ethereum', owned:5, staked:2, rewards:655.00 };


function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){ try{ const s = JSON.parse(localStorage.getItem(KEY)||'{}'); state = Object.assign(state, s||{}); }catch{} }
function emit(){ listeners.forEach(fn=>{ try{ fn(state); }catch{} }); save(); }


const api = {
init(){ load(); emit(); },
onChange(fn){ listeners.add(fn); },
offChange(fn){ listeners.delete(fn); },
isConnected(){ return !!state.connected; },
state(){ return Object.assign({}, state); },
async demoConnect(){ // placeholder connect
state.connected = true;
if(!state.address) state.address = '0xA1b2C3d4E5f6A7b8C9d0E1F2A3b4C5d6E7F8A9B0';
state.addressShort = state.address.slice(0,6)+'…'+state.address.slice(-4);
emit();
},
disconnect(){ state.connected=false; emit(); },
copyAddress(){ if(state.connected && navigator.clipboard){ navigator.clipboard.writeText(state.address); } }
};


global.walletState = api;
})(window);