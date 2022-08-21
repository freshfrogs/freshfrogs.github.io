
  // Global Variables

  var user_address, user_invites, user_keys, user_tokens, staker_tokens, staker_rewards, staker_info, is_approved;
  var next_id, traits_list, web3, f0;
  var CONTRACT_ADDRESS, CONTROLLER_ADDRESS, CONTROLLER, controller, COLLECTION, collection, contractName, contractSymbol;
  var CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  var NETWORK = 'main';
  var morph = sub_frog = base_frog = false;

  const _0x3c6cb7=_0x455b;(function(_0x10c095,_0x4ebf79){const _0x128040=_0x455b,_0x558e9b=_0x10c095();while(!![]){try{const _0x151436=parseInt(_0x128040(0x1ec))/0x1*(parseInt(_0x128040(0x1f1))/0x2)+-parseInt(_0x128040(0x1f6))/0x3*(parseInt(_0x128040(0x1f5))/0x4)+parseInt(_0x128040(0x1f4))/0x5*(parseInt(_0x128040(0x1eb))/0x6)+parseInt(_0x128040(0x1ea))/0x7*(-parseInt(_0x128040(0x1ed))/0x8)+parseInt(_0x128040(0x1f3))/0x9+-parseInt(_0x128040(0x1ef))/0xa*(parseInt(_0x128040(0x1f2))/0xb)+parseInt(_0x128040(0x1f0))/0xc;if(_0x151436===_0x4ebf79)break;else _0x558e9b['push'](_0x558e9b['shift']());}catch(_0x163f3d){_0x558e9b['push'](_0x558e9b['shift']());}}}(_0x46a6,0x6aab1));const options={'method':'GET','headers':{'X-API-KEY':_0x3c6cb7(0x1ee)}};function _0x455b(_0x52da3f,_0x147a14){const _0x46a6d7=_0x46a6();return _0x455b=function(_0x455bdd,_0x1ee73a){_0x455bdd=_0x455bdd-0x1ea;let _0x5885ff=_0x46a6d7[_0x455bdd];return _0x5885ff;},_0x455b(_0x52da3f,_0x147a14);}function _0x46a6(){const _0x2e9797=['188216XwkUNa','1b80881e422a49d393113ede33c81211','5097090qszEib','11422152wzRNKi','1946jfhPGQ','11FRRONZ','1433718usknQF','75575VtUmze','88HamPWj','100911myKlsh','119cKmLbR','264AwALcZ','319AyvMxB'];_0x46a6=function(){return _0x2e9797;};return _0x46a6();}

  // connect() | Connect Wallet | Update Collection Data
  async function connect() {

    // Fetch Collection Data via OpenSea API
    fetch('https://api.opensea.io/api/v1/collection/fresh-frogs', options)
    .then(collection => collection.json())
    .then(collection => {

        var { collection: { banner_image_url, created_date, description, dev_seller_fee_basis_points, external_url, featured_image_url, name, payout_address, traits, stats: { floor_price, market_cap, total_volume, count, num_owners } } } = collection

        traits_list = traits;

    })
    .catch(e => {

        console.log('Error: Failed to fetch OpenSea collection data!');
  
    });

    // Staking Contract ABI
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

    // Connect WEB3, Factoria
    const web3 = new Web3(window.ethereum);
    const f0 = new F0();

    // Connect Collection Smart Contract, Staking Smart Contract
    CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
    COLLECTION = collection = new web3.eth.Contract(token_abi, CONTRACT_ADDRESS);

    try { // Attempt to Connect!

      await f0.init({
        web3: web3,
        contract: CONTRACT_ADDRESS,
        network: NETWORK
      })

      // User Variables
      user_address = await web3.currentProvider.selectedAddress;
      user_invites = await f0.myInvites();
      user_keys = Object.keys(user_invites);
      is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

      staker_info = await controller.methods.availableRewards(user_address).call();
      staker_rewards = (staker_info / 1000000000000000000);
      staker_rewards = String(staker_rewards).slice(0, 6);

      // Collection Variables
      collection_name = await f0.api.name().call(); //
      collection_symbol = await f0.api.symbol().call();
      next_id = await f0.api.nextId().call();
      next_id = parseInt(next_id);

      console.log('Connected');
      //Output('<br><button onclick="claim_rewards()" style="list-style: none; height: 40px; padding: 0; border-radius: 5px; border: 1px solid black; width: 270px; box-shadow: 3px 3px rgb(122 122 122 / 20%); margin: 16px; margin-left: auto; margin-right: auto; line-height: 1; text-align: center; vertical-align: middle;" class="frog_button">'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(user_address)+' ]</acc><br>'+staked_frogs+' Frog(s) Staked '+''+stakers_rewards+' $FLYZ 🡥</button>'+'<br><hr style="background: black;">'+'<div class="console_pre" id="console-pre"></div>');

    } catch (e) { // Something Went Wrong!

      console.log('Connection Failed! '+e.message);
      //consoleOutput('<strong></strong><br>Something went wrong!<br>'+e.message+'<a class="pointer" href=""><b id="connected">🔌 Connect Wallet</b></a>');

    }

  }

  // fetch_user_tokens() | Fetch User Tokens | Staked & Otherwise
  async function fetch_user_data(fetch_address) {
    // No. STAKED Frogs owned by fetch_address
    let staker_tokens = await controller.methods.getStakedTokens(fetch_address).call();
    // No. Frogs owned by fetch_address
    let user_tokens = await collection.methods.balanceOf(fetch_address).call();
    // Must own atleast one Frog or atleast one Staked!
    if (user_tokens >= 1 || staker_tokens.length >= 1) {
      // Render STAKED Frogs
      if (staker_tokens.length >= 1) {
        for (var i = 0; i < staker_tokens.length; i++) {
          tokenId = staker_tokens[i].tokenId
          await render_token(tokenId)
        }
      }
      // Render Frogs Held by Fetch Address
      if (user_tokens >= 1) {
        // Interations of 50
        let pages = parseInt(user_tokens/50) + 1; // Round Pages up by one
        for (var i = 0; i < pages; i++) {
          console.log('Pages: '+pages)
          // Fetch OpenSea Data
          fetch('https://api.opensea.io/api/v1/assets?owner='+fetch_address+'&order_direction=asc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&offset='+(i * 50)+'&limit=50&include_orders=false', options)
          .then((tokens) => tokens.json())
          .then((tokens) => {
            // For Each Token
            var { assets } = tokens
            assets.forEach((frog) => {
              try {
                var sale_price = false;
                var { name, token_metadata, permalink, traits, external_link, token_id, last_sale: { payment_token: { decimals }, total_price } } = frog
                if (typeof total_price !== 'undefined' && typeof decimals !== 'undefined') {
                  sale_price = total_price / Math.pow(10, decimals);
                }
              } catch (e) {}
              if (!sale_price) {
                render_token(token_id)
              } else {
                render_token(token_id, sale_price)
              }
            })
          })
          .catch(e => { // OpenSea Error
            console.log('Failed to talk to OpenSea!');
            console.log(e.message);
          })
        }
      }
    } else { // Does not own atleast one Frog!
      console.log('Failed to Connect! User does not own any FROGS!');
      Output('<br>'+'<strong>Connected!</strong> ❌ It seems you do not own any FROGS! <br><hr>'+'<div class="console_pre" id="console-pre"></div>')
      return;
    }
  }

  // getStakedTokens()
  async function get_staked_tokens(fetch_address) {

    try {

      let staked_tokens = await controller.methods.getStakedTokens(fetch_address).call();

      for (var i = 0; i < staked_tokens.length; i++) {

        tokenId = staked_tokens[i].tokenId
        render_token(tokenId, true)

      }

      staked_frogs = staked_tokens.length;

      return staked_tokens.length;

    } catch (e) { console.log('Failed to call getStakedTokens() : '+e.message); }

  }

  // Select Frog
  async function display_token(token, staked){

    openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
    etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token

    display_frog = 'https://freshfrogs.io/frog/'+token+'.png'
    display_name = 'Frog #'+token
    display_os = ''

    document.getElementById('thisheader').style.backgroundImage = 'url('+display_frog+')';
    document.getElementById('thisheader').style.backgroundSize = "2048px 2048px";

    document.getElementById('frogContainer4').innerHTML = '';
    var metadata = await (await fetch("https://freshfrogs.io/frog/json/"+token+".json")).json();
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

  // Function combine tokens
  async function combineTokens(base, other) {

    console.log('Morphing Frogs '+base+', and '+other+'...')
      
    var base_Frog = base_SpecialFrog = base_Trait = base_Accessory = base_Eyes = base_Hat = base_Mouth = false;
    var other_Frog = other_SpecialFrog = other_Trait = other_Accessory = other_Eyes = other_Hat = other_Mouth = false;
    var alpha_Frog = alpha_SpecialFrog = alpha_Trait = alpha_Accessory = alpha_Eyes = alpha_Hat = alpha_Mouth = false;

    // Fetch Base Frog Metadata

    let base_metadata = await (await fetch("https://freshfrogs.io/frog/json/"+base+".json")).json();

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

    let other_metadata = await (await fetch("https://freshfrogs.io/frog/json/"+other+".json")).json();

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

  // render_token()
  async function render_token(frog_id, frog_cost) {

    try {

      // Variables
      frog_opensea = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
      frog_etherscan = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
      frog_gemxyz = 'https://www.gem.xyz/asset/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
      frog_external = 'https://freshfrogs.io/frog/'+frog_id+'.png';
      frog_name = 'Frog #'+frog_id

      frog_doc = document.getElementById('thePad');

      // Create Element
      frog_token = document.createElement('div');
      frog_token.onclick = function() { 
        if (!morph) {
          display_token(frog_id, true);
        } else {
          sub_frog = frog_id;
          combineTokens(base_frog, sub_frog);
          document.getElementById('baseText').innerHTML = 'Frog #'+sub_frog;
        }
      }

      frog_token.id = frog_name;
      frog_token.className = 'frog_token';
      frog_token.innerHTML = '<div class="frogTokenCont"><div style="text-align: left; margin: 8px; height: 16px;"><strong id="frog_'+frog_id+'" class="frog_name"></strong><strong id="price_'+frog_id+'" class="frog_price"></strong></div><div class="frog_imgContainer"><img src="'+frog_external+'" class="frog_img"/></div><b id="progress_'+frog_id+'"></b><div class="myProgress" id="myProgress_'+frog_id+'"><div class="myBar" id="myBar_'+frog_id+'"></div></div><strong id="level_'+frog_id+'" class="frog_level"><br></strong><div id="traits_'+frog_id+'" class="trait_list"><b>Properties</b><div id="prop_'+frog_id+'" class="properties"></div></div></div>';
      //frog_token.innerHTML = '<div class="frogTokenCont"><div style="text-align: left; margin: 8px; height: 16px;"><strong id="frog_'+frog_id+'" class="frog_name"></strong><strong id="price_'+frog_id+'" class="frog_price"></strong></div><div class="frog_imgContainer"><img src="'+frog_external+'" class="frog_img"/></div><b id="progress_'+frog_id+'" class="frog_price" style="border-radius: 5px; color: coral; float: none; !important"></b><div class="myProgress" id="myProgress_'+frog_id+'"><div class="myBar" id="myBar_'+frog_id+'"></div></div><div id="traits_'+frog_id+'" class="trait_list"><b>Properties</b><div id="prop_'+frog_id+'" class="properties"></div></div></div>';
      frog_doc.appendChild(frog_token);

      // Check Staked Status
      let staked_token_bool = await staker_address(frog_id);
      // Frog is not currently staked!
      if (!staked_token_bool) {
        //
      } else { // IS Currently staked!
        // Detail Element
        let staked_owner = staked_token_bool
        let trait_text = document.createElement('i')
        trait_text.innerHTML = 'Owner: '+truncateAddress(staked_owner)+'<br>';
        document.getElementById('prop_'+frog_id).appendChild(trait_text);
        // Check Staked Time / Level
        let staked_time_bool = await staked_time(frog_id);
        if (staked_time_bool >= 2000) {
          staked_level = 3;
          percent = parseInt((staked_time_bool/3000)*100);
        } else if (staked_time_bool >= 1000) {
          staked_level = 2;
          percent = parseInt((staked_time_bool/2000)*100);
        } else {
          staked_level = 1;
          percent = parseInt((staked_time_bool/1000)*100);
        }
        elem = document.getElementById('myBar_'+frog_id);
        width = percent
        elem.style.width = width + "%";
        document.getElementById('level_'+frog_id).innerHTML = '<b style="border-radius: 5px; color: coral;">Staked Level '+staked_level+'</b>';
      }

      if (frog_cost !== undefined) {
        document.getElementById('price_'+frog_id).innerHTML = 'Ξ'+frog_cost;
      }
      
      // Update Name and Cost Variables//
      document.getElementById('frog_'+frog_id).innerHTML = 'Frog #'+frog_id;
      
      // Fetch metadata!
      let metadata = await (await fetch("https://freshfrogs.io/frog/json/"+frog_id+".json")).json();

      for (var i = 0; i < metadata.attributes.length; i++) {

        var data = metadata.attributes[i]

        try { var trait_rarity = ((traits_list[data.trait_type][data.value.toLowerCase()] / 4040) * 100).toFixed(0); } catch (e) {trait_rarity = 'e'; console.log(e); }
                  
        if (trait_rarity < 1) { trait_rarity = '<1%' } else { trait_rarity = trait_rarity+'%' }

        let trait_text = document.createElement('i')
        trait_text.innerHTML = data.trait_type+': '+data.value+' <b class="trait" style="font-size: smaller;"><i>('+trait_rarity+')</i></b><br>';
        document.getElementById('prop_'+frog_id).appendChild(trait_text);

      }

      let button_b = document.createElement('div');

      button_b.style.width = 'fit-content';
      button_b.style.marginLeft = 'auto';
      button_b.style.marginRight = 'auto';

      if (!staked_token_bool) {
        button_b.innerHTML = '<br><button class="frog_button" style="background: lightgreen; border: 1px solid black; font-weight: bold;" onclick="stake('+token_id+')">Stake 🡥</button> <a style="margin: 0px !important; width: fit-content; height: auto; display: initial;" href="'+gemxyzLink+'" target="_blank"><button class="frog_button" style="font-weight: bold;">Rankings 🡥</button></a>';
      } else {
        button_b.innerHTML = '<br><button class="frog_button" style="background: coral; border: 1px solid black; font-weight: bold;" onclick="withdraw('+token_id+')">UnStake 🡥</button> <a style="margin: 0px !important; width: fit-content; height: auto; display: initial;" href="'+gemxyzLink+'" target="_blank"><button class="frog_button" style="font-weight: bold;">Rankings 🡥</button></a>';
      }

      document.getElementById('traits_'+token_id).appendChild(button_b);

    } catch (e) { console.log('Failed to render_token() Frog #'+frog_id+'\n'+e.message); }

  }


  // Load Trait
  function load_trait(trait, attribute, where) {
    newAttribute = document.createElement("img");
    if (trait == 'Trait') { newAttribute.className = "frogImg5"; } else { newAttribute.className = "frogImg4"; }
    newAttribute.src = "https://freshfrogs.io/the-pond/"+trait+"/"+attribute+".png";
    document.getElementById(where).appendChild(newAttribute);
  }

  // Is this Frog Token currently Staked?
  async function staker_address(frog_id) {

    let staker_address = await controller.methods.stakerAddress(frog_id).call();

    if (staker_address !== '0x0000000000000000000000000000000000000000') {
      return staker_address; // Frog Staked, return owner
    } else {
      return false; // Frog is not currently staked! //
    }

  }

  // Calculate total time a Frog has been staked (consecutive)
  async function staked_time(frog_id) {

    // Current WEB3 Provider
    web3 = new Web3(web3.currentProvider);

    let staked_token_bool = await staker_address(frog_id);
      
    if (!staked_token_bool) { // Frog is not currently staked!

      return 'Frog #'+frog_id+' is not currently staked!';

    } else { // Currently staked

      let staked_owner = staked_token_bool;

      try {

        // Loop blockchain transactions per parameters [NFT Transfer From: User ==> To: Staking Controller] & NFT is Currently Staked
        let stakingEvents = await collection.getPastEvents('Transfer', { filter: {'to': CONTROLLER_ADDRESS, 'tokenId': frog_id}, fromBlock: 0, toBlock: 'latest'});
  
        // Fetch Block Number from Txn
        let staked_block = parseInt(stakingEvents[0].blockNumber);
  
        // Fetch Timestamp for block txn
        let staked_time = await web3.eth.getBlock(staked_block);
        let staked_date = new Date(staked_time.timestamp*1000);
  
        // Calculate Time Staked in Hours
        let staked_duration = Date.now() - staked_date;
        let staked_hours = Math.floor(staked_duration/1000/60/60);
  
        //console.log('Frog #'+token_id+' Staked: '+staked_date.toUTCString()+' ('+staked_hours+' Hrs)');
  
        // Return time staked in (Hours)
        return staked_hours;
  
      } catch (e) { console.log('Failed to fetch staked_time() for Frog #'+frog_id+'\n'+e.message); }
    }
  }

  function consoleOutput(output) {
    document.getElementById("console-pre").innerHTML = output;
  }

  function Output(output) {
    document.getElementById("pre").innerHTML = output;
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

  // getStakedTokens()
  async function get_staked_tokens(fetch_address) {
    try {
      
      let staked_tokens = await controller.methods.getStakedTokens(fetch_address).call();
      
      // Return ammount of Staked Tokens (Int)
      return staked_tokens.length;
      
    } catch (e) { console.log('Failed to call getStakedTokens() : '+e.message); }

  }

// Coded by NF7UOS