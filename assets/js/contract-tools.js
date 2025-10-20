// assets/js/contract-tools.js
(function(){
  const { ethers } = window;

  // ---------- Config ----------
  const CONTROLLER = (window.CONTROLLER_ADDRESS || "0xCB1ee125CFf4051a10a55a09B10613876C4Ef199").trim();
  const TARGET_CHAIN_ID = 1; // Ethereum mainnet
  const SESSION_KEY = 'ff:connected';

  // Controller ABI (from your message)
  const CONTROLLER_ABI = [
    {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"contract IERC721","name":"_nftCollection","type":"address"},{"internalType":"contract IERC20","name":"_rewardsToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"availableRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"components":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"internalType":"struct FreshFrogsController.StakedToken[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"nftCollection","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"rewardsToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"stakerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakers","outputs":[{"internalType":"uint256","name":"amountStaked","type":"uint256"},{"internalType":"uint256","name":"timeOfLastUpdate","type":"uint256"},{"internalType":"uint256","name":"unclaimedRewards","type":"uint256"}],"stateMutability":"view","type":"function"}
  ];

  const ERC721_ABI = [
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function approve(address to, uint256 tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];
  const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  // ---------- State ----------
  const state = {
    provider: null,
    signer: null,
    account: null,
    network: null,
    controller: null,
    nftAddress: null,
    rewardsAddress: null,
    eventsBound: false
  };

  const rewardsMeta = {decimals:18, symbol:"TOKEN", loaded:false};

  // ---------- DOM ----------
  const $ = (id)=>document.getElementById(id);
  const legacyTerminal = $("terminal");
  const cliLog = $("terminal-log");
  const cliScroll = $("terminal-scroll");
  const cliForm = $("terminal-form");
  const cliInput = $("terminal-input");
  const statusAddress = $("status-address");
  const statusNetwork = $("status-network");
  const statusDot = $("status-dot");

  const CLI_MODE = !!cliLog;

  const chipController = $("chipController");
  const chipNetwork = $("chipNetwork");
  const linkNFT = $("linkNFT");
  const linkRewards = $("linkRewards");
  const btnConnect = $("btnConnect");
  const btnClaim = $("btnClaim");
  const btnStake = $("btnStake");
  const btnWithdraw = $("btnWithdraw");
  const btnRewards = $("btnRewards");
  const btnGetStaked = $("btnGetStaked");
  const btnStakerOf = $("btnStakerOf");
  const btnStakers = $("btnStakers");
  const acct = $("acct");

  const inStakeId = $("in-stake-id");
  const inWithdrawId = $("in-withdraw-id");
  const inRewardsAddr = $("in-rewards-addr");
  const inStakedAddr = $("in-staked-addr");
  const inStakerOf = $("in-staker-of");
  const inStakers = $("in-stakers");

  // ---------- Logging ----------
  function scrollToBottom(){
    if (CLI_MODE && cliScroll){
      cliScroll.scrollTop = cliScroll.scrollHeight;
    }
  }

  function decorate(line, type){
    if (CLI_MODE) return line;
    const prefix = type === "error" ? "❌ " : type === "ok" ? "✅ " : "• ";
    return `${prefix}${line}`;
  }

  function appendLine(target, text, className){
    if (!target) return;
    const div = document.createElement('div');
    div.className = `line${className ? ' ' + className : ''}`;
    div.textContent = text;
    target.appendChild(div);
  }

  function log(line, type="info"){
    if (CLI_MODE && cliLog){
      appendLine(cliLog, line, type);
      scrollToBottom();
    } else if (legacyTerminal){
      const text = decorate(line, type);
      legacyTerminal.textContent = `${text}\n${legacyTerminal.textContent || ''}`;
    } else {
      console.log(line);
    }
  }

  function logPrompt(line){
    if (CLI_MODE && cliLog){
      appendLine(cliLog, `> ${line}`, 'prompt');
      scrollToBottom();
    } else if (legacyTerminal){
      legacyTerminal.textContent = `> ${line}\n${legacyTerminal.textContent || ''}`;
    }
  }

  function clearLog(){
    if (CLI_MODE && cliLog){
      cliLog.textContent = '';
      scrollToBottom();
    } else if (legacyTerminal){
      legacyTerminal.textContent = '';
    }
  }

  function setStatusLabels(){
    if (statusAddress){
      statusAddress.textContent = state.account ? short(state.account) : 'wallet not connected';
    }
    if (statusNetwork){
      statusNetwork.textContent = state.network ? `${state.network.name} (#${state.network.chainId})` : 'offline';
    }
    if (statusDot){
      statusDot.classList.toggle('online', !!state.account);
    }
    if (acct){
      acct.textContent = state.account ? `${short(state.account)} on ${state.network?.name || ''}` : '';
    }
    if (chipNetwork){
      chipNetwork.textContent = state.network ? (state.network.chainId === 1 ? 'Ethereum' : `${state.network.name} (#${state.network.chainId})`) : '—';
    }
  }

  const history = [];
  let historyIndex = 0;

  // ---------- Helpers ----------
  const linkAddr = (a)=>`https://etherscan.io/address/${a}`;
  function short(a){ return a ? a.slice(0,6)+"…"+a.slice(-4) : ""; }

  async function ensureRewardsMeta(){
    if (rewardsMeta.loaded || !state.rewardsAddress) return rewardsMeta;
    try{
      const erc20 = new ethers.Contract(state.rewardsAddress, ERC20_ABI, state.provider);
      const [d,s] = await Promise.all([erc20.decimals(), erc20.symbol()]);
      rewardsMeta.decimals = d; rewardsMeta.symbol = s || "TOKEN"; rewardsMeta.loaded = true;
    }catch{}
    return rewardsMeta;
  }
  async function fmtRewards(raw){
    const m = await ensureRewardsMeta();
    try{ return `${ethers.utils.formatUnits(raw, m.decimals)} ${m.symbol}`; }
    catch{ return raw.toString(); }
  }

  function requireController(){
    if (!state.controller) throw new Error('Connect wallet first.');
    return state.controller;
  }

  function bindProviderEvents(){
    if (state.eventsBound || !window.ethereum) return;
    const provider = window.ethereum;
    provider.on?.('accountsChanged', async (arr)=>{
      const next = (arr && arr[0]) ? arr[0] : null;
      if (!next){
        state.account = null;
        state.controller = null;
        sessionStorage.removeItem(SESSION_KEY);
        setStatusLabels();
        log('Wallet disconnected.', 'error');
      } else {
        state.account = next;
        state.signer = state.provider.getSigner();
        state.controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, state.signer);
        state.network = await state.provider.getNetwork();
        sessionStorage.setItem(SESSION_KEY, '1');
        setStatusLabels();
        log(`Account changed to ${short(next)}.`, 'info');
      }
    });

    provider.on?.('chainChanged', async ()=>{
      if (state.provider){
        state.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        state.signer = state.provider.getSigner();
        if (state.account){
          state.controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, state.signer);
          state.network = await state.provider.getNetwork();
          setStatusLabels();
          log(`Network changed to ${state.network.name} (#${state.network.chainId}).`, 'info');
        }
      }
    });

    provider.on?.('disconnect', ()=>{
      state.account = null;
      state.controller = null;
      sessionStorage.removeItem(SESSION_KEY);
      setStatusLabels();
      log('Provider disconnected.', 'error');
    });

    state.eventsBound = true;
  }

  // ---------- Init ----------
  function init(){
    if (chipController){
      chipController.textContent = CONTROLLER;
      chipController.href = linkAddr(CONTROLLER);
    }
    if (linkNFT){ linkNFT.href = '#'; }
    if (linkRewards){ linkRewards.href = '#'; }
    setStatusLabels();
    if (CLI_MODE){
      log('Fresh Frogs :: staking console ready.', 'header');
      log('Type "help" to list available commands.', 'muted');
      if (!sessionStorage.getItem(SESSION_KEY)){
        log('Connect your wallet via the onboarding screen or by entering "connect".', 'muted');
      }
    }
  }

  // ---------- Connection ----------
  async function connect(){
    try{
      if(!window.ethereum) throw new Error('MetaMask not found.');
      state.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      await state.provider.send('eth_requestAccounts', []);
      state.signer = state.provider.getSigner();
      state.account = await state.signer.getAddress();
      state.network = await state.provider.getNetwork();
      state.controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, state.signer);
      [state.nftAddress, state.rewardsAddress] = await Promise.all([
        state.controller.nftCollection(),
        state.controller.rewardsToken()
      ]);

      if (linkNFT){ linkNFT.href = linkAddr(state.nftAddress); }
      if (linkRewards){ linkRewards.href = linkAddr(state.rewardsAddress); }
      if (chipController){ chipController.textContent = CONTROLLER; chipController.href = linkAddr(CONTROLLER); }
      if (chipNetwork){
        chipNetwork.textContent = state.network.chainId === 1 ? 'Ethereum' : `${state.network.name} (#${state.network.chainId})`;
      }

      sessionStorage.setItem(SESSION_KEY, '1');
      setStatusLabels();
      bindProviderEvents();

      log(`Connected as ${state.account} on ${state.network.name} (#${state.network.chainId}).`, 'ok');
      if (state.network.chainId !== TARGET_CHAIN_ID){
        log(`Warning: expected chainId ${TARGET_CHAIN_ID} (Ethereum). You are on ${state.network.name}.`, 'error');
      }
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  // ---------- Actions ----------
  async function approveIfNeeded(tokenId){
    const nft = new ethers.Contract(state.nftAddress, ERC721_ABI, state.signer);
    const owner = (await nft.ownerOf(tokenId)).toLowerCase();
    if (owner !== state.account.toLowerCase()) throw new Error(`You do not own tokenId ${tokenId}.`);
    const approved = (await nft.getApproved(tokenId)).toLowerCase();
    if (approved === CONTROLLER.toLowerCase()) return 'already-approved';
    const tx = await nft.approve(CONTROLLER, tokenId);
    log(`approve(${tokenId}) sent: ${tx.hash}`, 'info');
    const rec = await tx.wait();
    log(`approve(${tokenId}) confirmed. status=${rec.status}`, rec.status === 1 ? 'ok' : 'error');
    return 'approve-token';
  }

  async function doClaim(){
    try{
      const controller = requireController();
      const tx = await controller.claimRewards();
      log(`claimRewards() tx: ${tx.hash}`, 'info');
      const rec = await tx.wait();
      log(`claimRewards() confirmed. status=${rec.status}`, rec.status === 1 ? 'ok' : 'error');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doStake(tokenId){
    try{
      const controller = requireController();
      if(!tokenId && !inStakeId) throw new Error('Enter a tokenId.');
      const id = tokenId || inStakeId.value.trim();
      if(id === '') throw new Error('Enter a tokenId.');
      if(!state.nftAddress) state.nftAddress = await controller.nftCollection();

      const how = await approveIfNeeded(id);
      log(`Approval: ${how}`, 'info');

      const tx = await controller.stake(id);
      log(`stake(${id}) tx: ${tx.hash}`, 'info');
      const rec = await tx.wait();
      log(`stake(${id}) confirmed. status=${rec.status}`, rec.status === 1 ? 'ok' : 'error');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doWithdraw(tokenId){
    try{
      const controller = requireController();
      const id = tokenId || (inWithdrawId ? inWithdrawId.value.trim() : '');
      if(id === '') throw new Error('Enter a tokenId.');
      const tx = await controller.withdraw(id);
      log(`withdraw(${id}) tx: ${tx.hash}`, 'info');
      const rec = await tx.wait();
      log(`withdraw(${id}) confirmed. status=${rec.status}`, rec.status === 1 ? 'ok' : 'error');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doAvailableRewards(addressArg){
    try{
      const controller = requireController();
      const who = addressArg || (inRewardsAddr ? inRewardsAddr.value.trim() : '') || state.account;
      const raw = await controller.availableRewards(who);
      const pretty = await fmtRewards(raw);
      log(`availableRewards(${who}) → ${raw.toString()} (${pretty})`, 'ok');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doGetStakedTokens(addressArg){
    try{
      const controller = requireController();
      const who = addressArg || (inStakedAddr ? inStakedAddr.value.trim() : '') || state.account;
      const arr = await controller.getStakedTokens(who);
      if(!arr || !arr.length) { log(`getStakedTokens(${who}) → none`, 'ok'); return; }
      const lines = arr.map((x,i)=>`${i+1}. staker=${x.staker} tokenId=${x.tokenId.toString()}`).join('\n');
      log(`getStakedTokens(${who}):\n${lines}`, 'ok');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doStakerOf(tokenId){
    try{
      const controller = requireController();
      const id = tokenId || (inStakerOf ? inStakerOf.value.trim() : '');
      if(id === '') throw new Error('Enter a tokenId.');
      const who = await controller.stakerAddress(id);
      log(`stakerAddress(${id}) → ${who}`, 'ok');
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  async function doStakers(addressArg){
    try{
      const controller = requireController();
      const who = addressArg || (inStakers ? inStakers.value.trim() : '') || state.account;
      const r = await controller.stakers(who);
      const pretty = await fmtRewards(r.unclaimedRewards);
      log(
        `stakers(${who}): amountStaked=${r.amountStaked.toString()}, timeOfLastUpdate=${r.timeOfLastUpdate.toString()}, unclaimedRewards=${r.unclaimedRewards.toString()} (${pretty})`,
        'ok'
      );
    }catch(e){ log(e.message||String(e), 'error'); }
  }

  function showStatus(){
    if (!state.account){
      log('Wallet not connected.', 'muted');
      return;
    }
    log(`Wallet: ${state.account}`, 'info');
    log(`Network: ${state.network?.name || 'unknown'} (#${state.network?.chainId ?? '?'})`, 'info');
    if (state.nftAddress) log(`NFT collection: ${state.nftAddress}`, 'info');
    if (state.rewardsAddress) log(`Rewards token: ${state.rewardsAddress}`, 'info');
  }

  function showLinks(){
    if (state.nftAddress) log(`NFT collection → ${linkAddr(state.nftAddress)}`, 'info');
    if (state.rewardsAddress) log(`Rewards token → ${linkAddr(state.rewardsAddress)}`, 'info');
    log(`Controller → ${linkAddr(CONTROLLER)}`, 'info');
  }

  function handleLogout(){
    sessionStorage.removeItem(SESSION_KEY);
    log('Session cleared. Redirecting to connect screen…', 'muted');
    setTimeout(()=>{ window.location.href = 'connect.html'; }, 400);
  }

  // ---------- CLI Mode ----------
  async function handleCommand(raw){
    const line = raw.trim();
    if (!line) return;
    logPrompt(line);
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try{
      switch(cmd){
        case 'help':
          log('Available commands:', 'muted');
          log(' connect               → connect wallet', 'info');
          log(' claim                 → claimRewards()', 'info');
          log(' stake <tokenId>       → stake(tokenId)', 'info');
          log(' withdraw <tokenId>    → withdraw(tokenId)', 'info');
          log(' rewards [address]     → availableRewards(address)', 'info');
          log(' staked [address]      → getStakedTokens(address)', 'info');
          log(' stakerof <tokenId>    → stakerAddress(tokenId)', 'info');
          log(' stats [address]       → stakers(address)', 'info');
          log(' status                → show current session info', 'info');
          log(' links                 → show etherscan links', 'info');
          log(' clear                 → clear the console', 'info');
          log(' logout                → return to wallet onboarding', 'info');
          break;
        case 'connect':
          await connect();
          break;
        case 'claim':
          await doClaim();
          break;
        case 'stake':
          await doStake(args[0]);
          break;
        case 'withdraw':
          await doWithdraw(args[0]);
          break;
        case 'rewards':
          await doAvailableRewards(args[0]);
          break;
        case 'staked':
          await doGetStakedTokens(args[0]);
          break;
        case 'stakerof':
          await doStakerOf(args[0]);
          break;
        case 'stats':
          await doStakers(args[0]);
          break;
        case 'status':
          showStatus();
          break;
        case 'links':
          showLinks();
          break;
        case 'clear':
          clearLog();
          init();
          break;
        case 'logout':
          handleLogout();
          break;
        default:
          log(`Unknown command: ${cmd}. Type "help" to list commands.`, 'error');
      }
    }catch(e){
      log(e.message||String(e), 'error');
    }
  }

  function setupCli(){
    if (!CLI_MODE || !cliForm || !cliInput) return;
    cliInput.focus();
    cliForm.addEventListener('submit', async (event)=>{
      event.preventDefault();
      const value = cliInput.value;
      if (!value.trim()) { cliInput.value = ''; return; }
      history.push(value);
      historyIndex = history.length;
      cliInput.value = '';
      await handleCommand(value);
    });

    cliInput.addEventListener('keydown', (event)=>{
      if (history.length === 0) return;
      if (event.key === 'ArrowUp'){
        event.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        cliInput.value = history[historyIndex] || '';
        setTimeout(()=>{ cliInput.setSelectionRange(cliInput.value.length, cliInput.value.length); }, 0);
      } else if (event.key === 'ArrowDown'){
        event.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        cliInput.value = historyIndex === history.length ? '' : (history[historyIndex] || '');
        setTimeout(()=>{ cliInput.setSelectionRange(cliInput.value.length, cliInput.value.length); }, 0);
      }
    });
  }

  // ---------- Wire up ----------
  init();
  setupCli();

  btnConnect?.addEventListener('click', connect);
  btnClaim?.addEventListener('click', doClaim);
  btnStake?.addEventListener('click', ()=>doStake());
  btnWithdraw?.addEventListener('click', ()=>doWithdraw());
  btnRewards?.addEventListener('click', ()=>doAvailableRewards());
  btnGetStaked?.addEventListener('click', ()=>doGetStakedTokens());
  btnStakerOf?.addEventListener('click', ()=>doStakerOf());
  btnStakers?.addEventListener('click', ()=>doStakers());
})();
