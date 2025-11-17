var user_address, userInviteList, userInviteKeys, owned_frogs, contractName, contractSymbol, nextId, nextIdC, collection, COLLECTION, traits_list;
var CONTROLLER_ADDRESS, controller, CONTROLLER, is_approved, staked_tokens, staked_frogs, stakers_info, stakers_rewards;
var CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
var CONTRACT_ADDRESS = "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b";
var NETWORK = "main";
var morph = sub_frog = base_frog = false;

const _0x3c6cb7=_0x455b;(function(_0x10c095,_0x4ebf79){const _0x128040=_0x455b,_0x558e9b=_0x10c095();while(!![]){try{const _0x151436=parseInt(_0x128040(0x1ec))/0x1*(parseInt(_0x128040(0x1f1))/0x2)+-parseInt(_0x128040(0x1f6))/0x3*(parseInt(_0x128040(0x1f5))/0x4)+parseInt(_0x128040(0x1f4))/0x5*(parseInt(_0x128040(0x1eb))/0x6)+parseInt(_0x128040(0x1ea))/0x7*(-parseInt(_0x128040(0x1ed))/0x8)+parseInt(_0x128040(0x1f3))/0x9+-parseInt(_0x128040(0x1ef))/0xa*(parseInt(_0x128040(0x1f2))/0xb)+parseInt(_0x128040(0x1f0))/0xc;if(_0x151436===_0x4ebf79)break;else _0x558e9b['push'](_0x558e9b['shift']());}catch(_0x163f3d){_0x558e9b['push'](_0x558e9b['shift']());}}}(_0x46a6,0x6aab1));const options={'method':'GET','headers':{'X-API-KEY':_0x3c6cb7(0x1ee)}};function _0x455b(_0x52da3f,_0x147a14){const _0x46a6d7=_0x46a6();return _0x455b=function(_0x455bdd,_0x1ee73a){_0x455bdd=_0x455bdd-0x1ea;let _0x5885ff=_0x46a6d7[_0x455bdd];return _0x5885ff;},_0x455b(_0x52da3f,_0x147a14);}function _0x46a6(){const _0x2e9797=['188216XwkUNa','1b80881e422a49d393113ede33c81211','5097090qszEib','11422152wzRNKi','1946jfhPGQ','11FRRONZ','1433718usknQF','75575VtUmze','88HamPWj','100911myKlsh','119cKmLbR','264AwALcZ','319AyvMxB'];_0x46a6=function(){return _0x2e9797;};return _0x46a6();}

async function connect() {

    const web3 = new Web3(window.ethereum);
    const f0 = new F0();

    const CONTROLLER_ABI =
    [
        {
        "inputs": [],
        "name": "claimRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "uint256",
            "name": "_tokenId",
            "type": "uint256"
            }
        ],
        "name": "stake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "contract IERC721",
            "name": "_nftCollection",
            "type": "address"
            },
            {
            "internalType": "contract IERC20",
            "name": "_rewardsToken",
            "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
        },
        {
        "inputs": [
            {
            "internalType": "uint256",
            "name": "_tokenId",
            "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "address",
            "name": "_staker",
            "type": "address"
            }
        ],
        "name": "availableRewards",
        "outputs": [
            {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "address",
            "name": "_user",
            "type": "address"
            }
        ],
        "name": "getStakedTokens",
        "outputs": [
            {
            "components": [
                {
                "internalType": "address",
                "name": "staker",
                "type": "address"
                },
                {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
                }
            ],
            "internalType": "struct FreshFrogsController.StakedToken[]",
            "name": "",
            "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        },
        {
        "inputs": [],
        "name": "nftCollection",
        "outputs": [
            {
            "internalType": "contract IERC721",
            "name": "",
            "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        },
        {
        "inputs": [],
        "name": "rewardsToken",
        "outputs": [
            {
            "internalType": "contract IERC20",
            "name": "",
            "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
            }
        ],
        "name": "stakerAddress",
        "outputs": [
            {
            "internalType": "address",
            "name": "",
            "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        },
        {
        "inputs": [
            {
            "internalType": "address",
            "name": "",
            "type": "address"
            }
        ],
        "name": "stakers",
        "outputs": [
            {
            "internalType": "uint256",
            "name": "amountStaked",
            "type": "uint256"
            },
            {
            "internalType": "uint256",
            "name": "timeOfLastUpdate",
            "type": "uint256"
            },
            {
            "internalType": "uint256",
            "name": "unclaimedRewards",
            "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
        }
    ]

    CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
    COLLECTION = collection = new web3.eth.Contract(token_abi, CONTRACT_ADDRESS);

    try { // Connect Wallet, Factoria

    await f0.init({
        web3: web3,
        contract: CONTRACT_ADDRESS,
        network: NETWORK
    })

    // Contract
    user_address = await web3.currentProvider.selectedAddress;
    userInviteList = await f0.myInvites();
    userInviteKeys = Object.keys(userInviteList);
    owned_frogs = await collection.methods.balanceOf(user_address).call();
    contractName = await f0.api.name().call();
    contractSymbol = await f0.api.symbol().call();
    nextId = await f0.api.nextId().call();
    nextIdC = parseInt(nextId);

    // Controller
    is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    staked_tokens = await get_staked_tokens(user_address);
    stakers_info = await controller.methods.availableRewards(user_address).call();
    temp = (stakers_info / 1000000000000000000);
    stakers_rewards = String(temp).slice(0, 6);
    
    //document.getElementById('connected').innerHTML = 'Connect Wallet ✔️'

    if (owned_frogs <= 0 && staked_tokens <= 0) { // ❌ No FROGS

        Output('<br>'+'<strong>Connected!</strong> ❌ It seems you do not own any FROGS! <br><hr>'+'<div class="console_pre" id="console-pre"></div>')
        return

    } else {

        console.log('Connected User : ' + user_address);
        console.log('Staking isApprovedForAll : ' + is_approved);
        console.log('Total Staked Tokens : ' + staked_tokens);
        console.log('UnClaimed Rewards : ' + stakers_rewards + '('+temp+')');
        console.log('Loading data from OpenSea...');

        Output('<br><button onclick="claim_rewards()" style="margin: 16px;" class="frog_button">'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(user_address)+' ]</acc><br>'+staked_frogs+' Frog(s) Staked '+''+stakers_rewards+' $FLYZ 🡥</button>'+'<br><hr>'+'<div class="console_pre" id="console-pre"></div>'); // '[ '+stakers_rewards+' $FLYZ ] Rewards available <br>'

        console.log(owned_frogs)
        fetch_user_tokens(0);

        if (owned_frogs > 50){
          fetch_user_tokens(50);
        }

        if (owned_frogs > 100){
          fetch_user_tokens(100);
        }

        if (owned_frogs > 150){
          fetch_user_tokens(150);
        }

        if (owned_frogs > 200){
          fetch_user_tokens(200);
        }

    }

    } catch (e) { consoleOutput('<strong></strong><br>'+e.message+'<a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>'); }
}

  // claimRewards()
  async function claim_rewards() {

    try {

      is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
      
      if (!is_approved) {

        consoleOutput('<strong>Claiming '+stakers_rewards+' $FLYZ</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
          '<div style="text-align: left;">'+
          '<br><b>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.<br>'+
          '<br><b>2.) Transfer NFT</b><br> Transfer FROG #'+token_id+' to staking protocol, requires a gas fee.<br>'+
          '</div>')
        
        let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });

      }

      consoleOutput('<strong>Claiming '+stakers_rewards+' $FLYZ</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
        '<div style="text-align: left;">'+
        '<br><b><strike>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.</strike><br>'+
        '<br><b>2.) Claim Rewards</b><br> Transfer '+stakers_rewards+' $FLYZ from staking protocol, requires a gas fee.<br>'+
        '</div>');
        
      await controller.methods.claimRewards().send({ from: user_address });

      consoleOutput('<strong>Congratulations!</strong><br>'+stakers_rewards+' $FLYZ have successfully been claimed!');

    } catch (e) { 

      console.log(e.message);
      consoleOutput('<br><p>'+e.message+'</p><a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>');

    }
    
  }

  // stake()
  async function stake(token_id) {
    
    try {

      console_pre = document.getElementById('pre');
      console_pre.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
      is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

      if (!is_approved) {

        console_pre.style.backgroundColor = 'white'

        consoleOutput('<strong>Staking Frog #'+token_id+'...</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
          '<div style="text-align: left;">'+
          '<br><b>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.<br>'+
          '<br><b>2.) Transfer NFT</b><br> Transfer FROG #'+token_id+' to staking protocol, requires a gas fee.<br>'+
          '</div>')
        
        let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });

      } 

      consoleOutput('<strong>Staking Frog #'+token_id+'...</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
        '<div style="text-align: left;">'+
        '<br><b><strike>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.</strike><br>'+
        '<br><b>2.) Transfer NFT</b><br> Transfer FROG #'+token_id+' to staking protocol, requires a gas fee.<br>'+
        '</div>')
        
        //console_pre.style.backgroundColor = '#99ffc5'

      let stake = await controller.methods.stake(token_id).send({ from: user_address });
      consoleOutput('<strong>Congratulations!</strong><br>Frog #'+token_id+' has successfully been staked!');

    } catch (e) { 

      console.log(e.message);
      consoleOutput('<br><p>'+e.message+'</p><a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>');
      //console_pre.style.backgroundColor = '#ff99b6';

    }

  }

  // withdraw()
  async function withdraw(token_id) {

    try {

      console_pre = document.getElementById('pre');
      console_pre.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
      is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

      if (!is_approved) {

        console_pre.style.backgroundColor = 'white'

        consoleOutput('<strong>Withdrawing Frog #'+token_id+'...</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
          '<div style="text-align: left;">'+
          '<br><b>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.<br>'+
          '<br><b>2.) Retrieve NFT</b><br> Transfer FROG #'+token_id+' from staking protocol, requires a gas fee.<br>'+
          '</div>')
        
        let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });

      }
        
      consoleOutput('<strong>Withdrawing Frog #'+token_id+'...</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
        '<div style="text-align: left;">'+
        '<br><b><strike>1.) Approve Contract</b> <br> This is a one time transaction to allow staking.</strike><br>'+
        '<br><b>2.) Retrieve NFT</b><br> Transfer FROG #'+token_id+' from staking protocol, requires a gas fee.<br>'+
        '</div>')
        
        //console_pre.style.backgroundColor = '#99ffc5'

      let withdraw = await controller.methods.withdraw(token_id).send({ from: user_address });
      consoleOutput('<strong>Congratulations!</strong><br>Frog #'+token_id+' has successfully been un-staked!');

    } catch (e) { 

      console.log(e.message);
      consoleOutput('<br><p>'+e.message+'</p><a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>');
      //console_pre.style.backgroundColor = '#ff99b6';

    }
    
  }

  // availableRewards()
  async function available_rewards(user_address) {

    try {

      controller.methods.availableRewards(user_address).call();

    } catch (e) { console.log(e.message); }
    
  }

  // render_token()
  async function render_token(token_id, staked, cost) {

    try {

      // Variables
      let openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id;
      let etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id;
      let gemxyzLink = 'https://www.gem.xyz/asset/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id;
      let external_link = 'https://freshfrogs.github.io/frog/'+token_id+'.png';
      let name = 'Frog #'+token_id
      let doc = document.getElementById('thePad');

      // Create Element
      frog_token = document.createElement('div');
      frog_token.id = name;
      frog_token.className = 'frog_token';
      frog_token.innerHTML = '<img src="'+external_link+'" class="frog_img"/><div id="traits_'+token_id+'" class="trait_list"></div>';
      frog_token.onclick = function() { 
        if (!morph) {
          if (!staked) { display_token(token_id); } else { display_token(token_id, true); }
        } else {
          sub_frog = token_id;
          combineTokens(base_frog, sub_frog);
          document.getElementById('baseText').innerHTML = 'Frog #'+sub_frog;
        }
      }
      doc.appendChild(frog_token);

      if (staked) { // ff9999
        document.getElementById('traits_'+token_id).innerHTML = '<strong style="color: #222 !important;"><u>'+name+'</u> <b style="border-radius: 5px; background: rgb(122 122 122 / 20%); color: #ff9999;">(staked)</b></strong>';
      } else {
        document.getElementById('traits_'+token_id).innerHTML = '<strong style="color: #222 !important;"><u>'+name+'</u></strong>';
      }

      let metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_id+".json")).json();

      for (var i = 0; i < metadata.attributes.length; i++) {

        var data = metadata.attributes[i]

        let trait_text = document.createElement('i')
        trait_text.innerHTML = '<br>'+data.trait_type+': '+data.value
        document.getElementById('traits_'+token_id).appendChild(trait_text)

      }

      //let button_b = document.createElement('div');
      //button_b.innerHTML = '<br><a style="margin: 0px !important; width: fit-content; height: auto; display: initial;" href="'+openSeaLink+'" target="_blank"><button class="frog_button">OpenSea 🡥</button></a> <a style="margin: 0px !important; width: fit-content; height: auto; display: initial;" href="'+gemxyzLink+'" target="_blank"><button class="frog_button">Rankings 🡥</button></a>'
      //document.getElementById('traits_'+token_id).appendChild(button_b);

    } catch (e) { console.log(e.message); }

  }

  // getStakedTokens()
  async function get_staked_tokens(user_address) {

    try {

      let staked_tokens = await controller.methods.getStakedTokens(user_address).call();

      for (var i = 0; i < staked_tokens.length; i++) {

        tokenId = staked_tokens[i].tokenId
        //console.log(tokenId);
        render_token(tokenId, true)

      }
      staked_frogs = staked_tokens.length;
      return staked_tokens.length;

    } catch (e) { console.log(e.message); }

  }

  // nftCollection()
  async function nft_collection() {

    try {

      controller.methods.nftCollection().call();

    } catch (e) { console.log(e.message); }
    
  }

  // rewardsToken()
  async function rewards_token() {

    try {

      controller.methods.rewardsToken().call();

    } catch (e) { console.log(e.message); }
    
  }

  // stakerAddress(token)
  async function staker_address(token_id) {

    try {

      controller.methods.stakerAddress(token_id).call();

    } catch (e) { console.log(e.message); }
    
  }

  // stakers() function
  async function stakers(user_address) {

    try {

      let stakers_return = await controller.methods.stakers(user_address).call();
      return (stakers_return.unclaimedRewards / 1000000000000000000);

    } catch (e) { console.log(e.message); }
    
  }

  function truncateAddress(address) {
    if (!address) {
      return "";
    }
    return `${address.substr(0, 5)}...${address.substr(
      address.length - 5,
      address.length
    )}`;
  }

  // Check owned tokens

  function fetch_user_tokens(offset) {

    fetch('https://api.opensea.io/api/v1/assets?owner='+user_address+'&order_direction=asc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&offset='+offset+'&limit=50&include_orders=false', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {

      //consoleOutput('<br>'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(user_address)+' ]</acc><br>'+'[ '+ownedFrogs+' ] Frogs belong to this wallet!<br>'+'<div id="display_frog"></div><hr>')

      var { assets } = tokens
      assets.forEach((frog) => { // console.log(frog)

        try {

          var { name, token_metadata, permalink, traits, external_link, token_id } = frog

        } catch (e) { console.log(e.message); }

        render_token(token_id)

      })

    })
    .catch(e => {

      console.log(e.message);
      console.log('Error: OpenSea Error! fetch_user_tokens()');
  
    })
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function consoleOutput(output) {
    document.getElementById("console-pre").innerHTML = output;
  }

  function Output(output) {
    document.getElementById("pre").innerHTML = output;
  }

  function load_trait(trait, attribute, where) {
    newAttribute = document.createElement("img")
    newAttribute.href = "https://opensea.io/collection/fresh-frogs?search[sortAscending]=true&search[sortBy]=PRICE&search[stringTraits][0][name]="+trait+"&search[stringTraits][0][values][0]="+attribute
    newAttribute.id = attribute
    newAttribute.target = "_blank"
    if (where == 'frogContainer4') {
      newAttribute.className = "frogImg4" //shadesAnimation
    } else {
      newAttribute.className = "frogImg2" //shadesAnimation
    }
    
    //newAttribute.style.cursor = "pointer"
    if (attribute === "smoking" || attribute === "smokingPipe" || attribute === "smokingCigar") { 
      newAttribute.src = "https://freshfrogs.github.io/the-pond/"+trait+"/"+attribute+"2.gif"
    } else if (attribute === "tongueFly") { 
      newAttribute.src = "https://freshfrogs.github.io/the-pond/"+trait+"/"+attribute+".gif"
    } else if (attribute === "cyan_tongueFly") { 
      newAttribute.src = "https://freshfrogs.github.io/the-pond/"+trait+"/"+attribute+".gif"
    } else if (attribute === "morphAnimation") {
      newAttribute.src = "https://freshfrogs.github.io/the-pond/Frog/loadMorph.gif"
    } else if (attribute === "shadesAnimation") {
      newAttribute.src = "https://freshfrogs.github.io/the-pond/Eyes/shadesAnimation.gif"
    } else if (attribute.includes("croaking2")) {
      console.log('! '+trait+' / '+attribute)
      newAttribute.src = "https://freshfrogs.github.io/the-pond/"+trait+"/"+attribute+".gif"
    } else {
      newAttribute.src = "https://freshfrogs.github.io/the-pond/"+trait+"/"+attribute+".png"
    }
    newAttribute.alt = attribute
    document.getElementById(where).appendChild(newAttribute)
  }

  // Select Frog
  async function display_token(token, staked){

    openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
    etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token

    display_frog = 'https://freshfrogs.github.io/frog/'+token+'.png'
    display_name = 'Frog #'+token
    display_os = ''

    document.getElementById('thisheader').style.backgroundImage = 'url('+display_frog+')';
    document.getElementById('thisheader').style.backgroundSize = "2048px 2048px";

    document.getElementById('frogContainer4').innerHTML = '';
    var metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token+".json")).json();
    var this_place = 'frogContainer4';
    for (var i = 0; i < metadata.attributes.length; i++) {
      var data = metadata.attributes[i];
      load_trait(data.trait_type, data.value, this_place);
    }

    document.getElementById('display_name').innerHTML = display_name
    document.getElementById('morphFrogs').setAttribute('href', etherscanLink)

    document.getElementById('selectBase').removeAttribute('href');
    document.getElementById('selectBase').innerHTML = '<strong>Morph</strong><frog id="baseText">two frogs</frog>'
    document.getElementById('selectBase').onclick = function() {
      if (!morph) {
        base_frog = token
        morph = true;
        document.getElementById('baseText').innerHTML = 'select frog!'
      } else if (morph) {
        console.log('Sending Image...');
        takeScreenShot();
      } 

    }

    document.getElementById('selectSub').removeAttribute('href');

    if (!staked) {
      document.getElementById('selectSub').innerHTML = '<strong>Stake</strong><frog id="baseText">and earn</frog>'
      document.getElementById('selectSub').onclick = function() { stake(token); }
    } else {
      document.getElementById('selectSub').innerHTML = '<strong>Withdraw</strong><frog id="baseText">unstake frog</frog>'
      document.getElementById('selectSub').onclick = function() { withdraw(token); }
    }

  }

  window.takeScreenShot = function() {

    //var node = document.getElementById('my-node');

    domtoimage.toBlob(document.getElementById('thisHeader'))
    .then(function (blob) {
        window.saveAs(blob, 'FreshFrogsNFT_Morph.png');
    });

  }

  // Function combine tokens
  async function combineTokens(base, other) {

    console.log('Morphing Frogs '+base+', and '+other+'...')
      
    var base_Frog = base_SpecialFrog = base_Trait = base_Accessory = base_Eyes = base_Hat = base_Mouth = false;
    var other_Frog = other_SpecialFrog = other_Trait = other_Accessory = other_Eyes = other_Hat = other_Mouth = false;
    var alpha_Frog = alpha_SpecialFrog = alpha_Trait = alpha_Accessory = alpha_Eyes = alpha_Hat = alpha_Mouth = false;

    // Fetch Base Frog Metadata

    let base_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+base+".json")).json();

    for (var i = 0; i < base_metadata.attributes.length; i++) {

      var data = base_metadata.attributes[i]

      if (data.trait_type == "Frog") {
          var base_Frog = data.value;
          console.log('base_Frog : '+base_Frog)
      } else if (data.trait_type == "SpecialFrog") {
          var base_SpecialFrog = data.value;
          console.log('base_SpecialFrog : '+base_SpecialFrog)
      } else if (data.trait_type == "Trait") {
          var base_Trait = data.value;
          console.log('base_Trait : '+base_Trait)
      } else if (data.trait_type == "Accessory") {
          var base_Accessory = data.value;
          console.log('base_Accessory : '+base_Accessory)
      } else if (data.trait_type == "Eyes") {
          var base_Eyes = data.value;
          console.log('base_Eyes : '+base_Eyes)
      } else if (data.trait_type == "Hat") {
          var base_Hat = data.value;
          console.log('base_Hat : '+base_Hat)
      } else if (data.trait_type == "Mouth") {
          var base_Mouth = data.value;
          console.log('base_Mouth : '+base_Mouth)
      } else {
        console.log('Unknown attribute : '+data.value)
      }

    }

    // Fetch Other Frog Metadata

    let other_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+other+".json")).json();

    for (var l = 0; l < other_metadata.attributes.length; l++) {

      var data = other_metadata.attributes[l]

      if (data.trait_type == "Frog") {
          var other_Frog = data.value;
          console.log('other_Frog : '+other_Frog)
      } else if (data.trait_type == "SpecialFrog") {
          var other_SpecialFrog = data.value;
          console.log('other_SpecialFrog : '+other_SpecialFrog)
      } else if (data.trait_type == "Trait") {
          var other_Trait = data.value;
          console.log('other_Trait : '+other_Trait)
      } else if (data.trait_type == "Accessory") {
          var other_Accessory = data.value;
          console.log('other_Accessory : '+other_Accessory)
      } else if (data.trait_type == "Eyes") {
          var other_Eyes = data.value;
          console.log('other_Eyes : '+other_Eyes)
      } else if (data.trait_type == "Hat") {
          var other_Hat = data.value;
          console.log('other_Hat : '+other_Hat)
      } else if (data.trait_type == "Mouth") {
          var other_Mouth = data.value;
          console.log('other_Mouth : '+other_Mouth)
      } else {
        console.log('Unknown attribute : '+data.value)
      }

    }

    // Finalize Metadata Output

    // Frog Type
    if (base_Frog != false) {

      var alpha_Frog = base_Frog;

      if (base_Frog == 'cyanTreeFrog' && other_Frog == 'cyanTreeFrog') { var alpha_Frog = false; var alpha_SpecialFrog = 'elBino/'+base_Frog; }          

    } else if (base_SpecialFrog != false) {

      var alpha_SpecialFrog = base_SpecialFrog;

    }

    // Trait Type
    if (other_Trait != false) {

      var alpha_Trait = other_Trait;

    } else if (base_Trait != false) {

      var alpha_Trait = base_Trait;

    }

    // Update alpha_Trait for SpecialFrogs

    if (base_SpecialFrog != false || other_SpecialFrog != false) {

      if (base_SpecialFrog == 'croaking' && other_SpecialFrog == 'croaking') {
        var alpha_SpecialFrog = base_SpecialFrog+'/croaking2'
        var other_Trait = alpha_Trait = base_Trait = false
      }

      if ((base_SpecialFrog == 'thirdEye' || base_SpecialFrog == 'inversedEyes' || base_SpecialFrog == 'peace'  || base_SpecialFrog == 'closedEyes') && other_Frog != false) {

        if (base_SpecialFrog == 'inversedEyes') {

          var alpha_SpecialFrog = '../Frog/'+other_Frog

        } else if (base_SpecialFrog == 'thirdEye') {

          var alpha_SpecialFrog = base_SpecialFrog+'/'+other_Frog;

        } else if (base_SpecialFrog == 'peace' && other_Frog !== false) {

          var alpha_SpecialFrog = base_SpecialFrog+'/'+other_Frog;

        } else if (base_SpecialFrog == 'closedEyes') {

          var alpha_SpecialFrog = base_SpecialFrog+'/'+other_Frog;

        }
      
      }

      if (base_SpecialFrog != false) {
        if (other_SpecialFrog != false) {
          if (base_SpecialFrog == 'thirdEye' && other_SpecialFrog == 'peace') {
            
            var alpha_Trait = base_SpecialFrog+'/blue';
          
          }
          
          else if (base_SpecialFrog == 'inversedEyes' && other_SpecialFrog == 'peace') {
            
            var alpha_SpecialFrog = 'peace'
            var alpha_Trait = 'inversedEyes/peace';
          
          } else if (base_SpecialFrog == 'inversedEyes' && other_SpecialFrog == 'thirdEye') {
            
            var alpha_SpecialFrog = 'thirdEye'
            var alpha_Trait = 'thirdEye/inversedEyes';
          
          } else if (base_SpecialFrog == 'closedEyes' && other_SpecialFrog == 'peace') {
            
            var alpha_SpecialFrog = 'peace'
            var alpha_Trait = 'closedEyes/peace';
          
          } else {
            var alpha_Trait = base_SpecialFrog+'/'+other_SpecialFrog;
          }
        } else {
          var alpha_Trait = base_SpecialFrog+'/'+alpha_Trait;
        }
      }

      else if (other_SpecialFrog == 'thirdEye' || other_SpecialFrog == 'inversedEyes') {
        var alpha_Trait = other_SpecialFrog+'/base/'+alpha_Trait;
      }

    }

    // Accessory
    if (base_Accessory != false) {

      alpha_Accessory = base_Accessory

    } else if (other_Accessory != false) {

      alpha_Accessory = other_Accessory

    }

    // Eyes
    if (base_Eyes != false) {

      alpha_Eyes = base_Eyes

    } else if (other_Eyes != false) {

      alpha_Eyes = other_Eyes

    }

    // Hat
    if (base_Hat != false) {

      alpha_Hat = base_Hat

    } else if (other_Hat != false) {

      alpha_Hat = other_Hat

    }

    // Mouth
    if (base_Mouth != false) {

      alpha_Mouth = base_Mouth

    } else if (other_Mouth != false) {

      alpha_Mouth = other_Mouth

    }

    thisPlace = 'frogContainer4';
    var thisPlace_div = document.getElementById(thisPlace)
    thisPlace_div.style.background = 'transparent'
    thisPlace_div.innerHTML = ''

    console.log('--- Final Frog Metadata ---')
    if (alpha_Frog != false) { load_trait("Frog", alpha_Frog, thisPlace); console.log('Frog: '+alpha_Frog);} else if (alpha_SpecialFrog != false) { load_trait("SpecialFrog", alpha_SpecialFrog, thisPlace); console.log('SpecialFrog: '+alpha_SpecialFrog);}
    
    if (alpha_Trait != false) { load_trait("Trait", alpha_Trait, thisPlace); console.log('Trait: '+alpha_Trait);}
    if (base_Frog == 'splendidLeafFrog') {

      //load_trait("Frog", other_Frog, thisPlace);
      load_trait("Trait/splendidLeafFrog", base_Trait, thisPlace);

    } // Custom for traits (overlay)
    if (alpha_Mouth == "tongueFly" && alpha_Trait == "Cyan") {
      load_trait("Trait", "cyan_tongueFly", thisPlace)
    }
    if (alpha_Accessory != false) { load_trait("Accessory", alpha_Accessory, thisPlace); console.log('Accessory: '+alpha_Accessory);}
    if (alpha_Eyes != false) { load_trait("Eyes", alpha_Eyes, thisPlace); console.log('Eyes: '+alpha_Eyes);}
    if (alpha_Hat != false) { load_trait("Hat", alpha_Hat, thisPlace); console.log('Hat: '+alpha_Hat);}
    if (alpha_Mouth != false) { load_trait("Mouth", alpha_Mouth, thisPlace); console.log('Mouth: '+alpha_Mouth);}

  }

  // Load Fresh Frog
  function load_token(token) {

    openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
    etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token

    newFrog = document.createElement("div")
    newFrog.onclick = function() { 
      if (!morph) { display_token(token); } else { sub_frog = token; combineTokens(base_frog, sub_frog); document.getElementById('baseText').innerHTML = 'Frog #'+sub_frog; }
    }
    newFrog.id = token
    newFrog.className = 'frogPanel'
    newFrog.innerHTML = '<a style="margin-bottom" 0px !important;  display: inline !important;" class="smallContainer2 pointer2" id="Frog #'+token+'"><img class="frogImg3" src="https://freshfrogs.github.io/frog/'+token+'.png"/></a>'+'<p class="attributeList" id="Frog #'+token+'Desc"></p>'
    document.getElementById("thePad").appendChild(newFrog)

    document.getElementById('Frog #'+token+'Desc').innerHTML = '<a class="pointer" href="'+openSeaLink+'" target="_blank" style="image-rendering: auto !important; display: inline !important;">'+'<b><u>Frog #'+token+'</u></b> ↗️'+'</a>';

  }

  async function fetch_staked_frogs() {
    
    fetch('https://api.opensea.io/api/v1/assets?owner='+'0xd302B8B0Dc965553b1D8c247E2cdA5E1F600640f'+'&order_direction=asc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&limit=50&include_orders=false', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {

      console.log('Connecting to FreshFrogsController via OpenSea...')
      var { assets } = tokens
      assets.forEach((frog) => { 

        var { token_id } = frog

        // append multiple values to the array
        frog_array.push(token_id);

      })

    })
    .catch(e => {

      console.log('Error: Could not talk to OpenSea! '+e.message);
  
    })
  }
// Coded by NF7UOS