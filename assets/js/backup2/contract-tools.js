// assets/js/contract-tools.js
(function(){
  const { ethers } = window;

  // ---------- Config ----------
  const CONTROLLER = (window.CONTROLLER_ADDRESS || "0xCB1eE125cFf4051A10A55a09B10613876C4eF199").trim();
  const TARGET_CHAIN_ID = 1; // Ethereum mainnet

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
  let provider, signer, userAddr;
  let controller, nftAddress, rewardsAddress;
  let rewardsMeta = {decimals:18, symbol:"TOKEN", loaded:false};

  // ---------- DOM ----------
  const $ = (id)=>document.getElementById(id);
  const terminal = $("terminal");
  const acct = $("acct");
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

  const inStakeId = $("in-stake-id");
  const inWithdrawId = $("in-withdraw-id");
  const inRewardsAddr = $("in-rewards-addr");
  const inStakedAddr = $("in-staked-addr");
  const inStakerOf = $("in-staker-of");
  const inStakers = $("in-stakers");

  // ---------- Helpers ----------
  function log(line, type="info"){
    const prefix = type==="error" ? "❌ " : type==="ok" ? "✅ " : "• ";
    terminal.textContent = `${prefix}${line}\n${terminal.textContent}`;
  }
  const linkAddr = (a)=>`https://etherscan.io/address/${a}`;
  function short(a){ return a ? a.slice(0,6)+"…"+a.slice(-4) : ""; }

  async function ensureRewardsMeta(){
    if (rewardsMeta.loaded || !rewardsAddress) return rewardsMeta;
    try{
      const erc20 = new ethers.Contract(rewardsAddress, ERC20_ABI, provider);
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

  // ---------- Init ----------
  function init(){
    chipController.textContent = CONTROLLER;
    chipController.href = linkAddr(CONTROLLER);
  }

  async function connect(){
    try{
      if(!window.ethereum) return log("MetaMask not found.", "error");
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      userAddr = await signer.getAddress();
      const net = await provider.getNetwork();

      acct.textContent = `${short(userAddr)} on ${net.name} (#${net.chainId})`;
      chipNetwork.textContent = net.chainId===1 ? "Ethereum" : `${net.name} (#${net.chainId})`;
      if (net.chainId !== TARGET_CHAIN_ID) log(`Warning: expected chainId ${TARGET_CHAIN_ID} (Ethereum). You are on ${net.name}.`, "error");

      controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, signer);
      [nftAddress, rewardsAddress] = await Promise.all([controller.nftCollection(), controller.rewardsToken()]);

      linkNFT.href = linkAddr(nftAddress);
      linkRewards.href = linkAddr(rewardsAddress);
      log("Connected.", "ok");

      if (window.ethereum && window.ethereum.on) {
        window.ethereum.on("accountsChanged", ()=>location.reload());
        window.ethereum.on("chainChanged", ()=>location.reload());
      }
    }catch(e){ log(e.message||String(e), "error"); }
  }

  // ---------- Actions ----------
  async function approveIfNeeded(tokenId){
    const nft = new ethers.Contract(nftAddress, ERC721_ABI, signer);
    const owner = (await nft.ownerOf(tokenId)).toLowerCase();
    if (owner !== userAddr.toLowerCase()) throw new Error(`You do not own tokenId ${tokenId}.`);
    const approved = (await nft.getApproved(tokenId)).toLowerCase();
    if (approved === CONTROLLER.toLowerCase()) return "already-approved";
    const tx = await nft.approve(CONTROLLER, tokenId);
    log(`approve() sent: ${tx.hash}`);
    const rec = await tx.wait();
    log(`approve() confirmed. status=${rec.status}`, "ok");
    return "approve-token";
  }

  async function doClaim(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const tx = await controller.claimRewards();
      log(`claimRewards() tx: ${tx.hash}`);
      const rec = await tx.wait();
      log(`claimRewards() confirmed. status=${rec.status}`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doStake(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const tokenId = inStakeId.value.trim();
      if(tokenId==="") throw new Error("Enter a tokenId.");
      if(!nftAddress) nftAddress = await controller.nftCollection();

      const how = await approveIfNeeded(tokenId);
      log(`Approval: ${how}`);

      const tx = await controller.stake(tokenId);
      log(`stake(${tokenId}) tx: ${tx.hash}`);
      const rec = await tx.wait();
      log(`stake(${tokenId}) confirmed. status=${rec.status}`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doWithdraw(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const tokenId = inWithdrawId.value.trim();
      if(tokenId==="") throw new Error("Enter a tokenId.");
      const tx = await controller.withdraw(tokenId);
      log(`withdraw(${tokenId}) tx: ${tx.hash}`);
      const rec = await tx.wait();
      log(`withdraw(${tokenId}) confirmed. status=${rec.status}`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doAvailableRewards(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const who = inRewardsAddr.value.trim() || userAddr;
      const raw = await controller.availableRewards(who);
      const pretty = await fmtRewards(raw);
      log(`availableRewards(${who}) → ${raw.toString()} (${pretty})`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doGetStakedTokens(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const who = inStakedAddr.value.trim() || userAddr;
      const arr = await controller.getStakedTokens(who);
      if(!arr || !arr.length) { log(`getStakedTokens(${who}) → none`, "ok"); return; }
      const lines = arr.map((x,i)=>`${i+1}. staker=${x.staker} tokenId=${x.tokenId.toString()}`).join("\n");
      log(`getStakedTokens(${who}):\n${lines}`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doStakerOf(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const tokenId = inStakerOf.value.trim();
      if(tokenId==="") throw new Error("Enter a tokenId.");
      const who = await controller.stakerAddress(tokenId);
      log(`stakerAddress(${tokenId}) → ${who}`, "ok");
    }catch(e){ log(e.message||String(e), "error"); }
  }

  async function doStakers(){
    try{
      if(!controller) throw new Error("Connect wallet first.");
      const who = inStakers.value.trim() || userAddr;
      const r = await controller.stakers(who);
      const pretty = await fmtRewards(r.unclaimedRewards);
      log(
        `stakers(${who}): amountStaked=${r.amountStaked.toString()}, timeOfLastUpdate=${r.timeOfLastUpdate.toString()}, unclaimedRewards=${r.unclaimedRewards.toString()} (${pretty})`,
        "ok"
      );
    }catch(e){ log(e.message||String(e), "error"); }
  }

  // ---------- Wire up ----------
  init();
  btnConnect?.addEventListener("click", connect);
  btnClaim?.addEventListener("click", doClaim);
  btnStake?.addEventListener("click", doStake);
  btnWithdraw?.addEventListener("click", doWithdraw);
  btnRewards?.addEventListener("click", doAvailableRewards);
  btnGetStaked?.addEventListener("click", doGetStakedTokens);
  btnStakerOf?.addEventListener("click", doStakerOf);
  btnStakers?.addEventListener("click", doStakers);
})();
