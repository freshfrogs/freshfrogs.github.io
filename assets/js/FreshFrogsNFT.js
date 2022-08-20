
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

    // 
    user_tokens = await collection.methods.balanceOf(user_address).call();
    is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    staker_tokens = await get_staked_tokens(user_address);
    staker_info = await controller.methods.availableRewards(user_address).call();
    staker_rewards = (staker_info / 1000000000000000000);
    staker_rewards = String(staker_rewards).slice(0, 6);

    // Collection Variables
    collection_name = await f0.api.name().call();
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
  async function fetch_user_data() {

    // Must own atleast one Frog or atleast one Staked!
    if (user_tokens > 1 || staker_tokens > 1) {

      try { // Continue

        let pages = parseInt(user_tokens/50) + 1;

        console.log('pages: '+pages)

        for (var i = 0; i < pages; i++) {

          let offset = i * 50;

          console.log('offset: '+offset);

          fetch('https://api.opensea.io/api/v1/assets?owner='+user_address+'&order_direction=asc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&offset='+offset+'&limit=50&include_orders=false', options)
          .then((tokens) => tokens.json())
          .then((tokens) => {
      
            var { assets } = tokens
            assets.forEach((frog) => {
      
              try { // OpenSea NFT Data
      
                var sale_price;
                var { token_id, last_sale: { payment_token: { decimals }, total_price } } = frog

                if (typeof total_price !== 'undefined' && typeof decimals !== 'undefined') { // Recent Sale Found

                  let sale_price = total_price / Math.pow(10, decimals);

                  render_token(token_id, sale_price);

                } else { // No recent Sales

                  render_token(token_id);

                }
      
              } catch (e) {} // No Sales
              
            })
      
          })
          .catch(e => {
      
            console.log('Failed to talk to OpenSea!');
            console.log(e.message);
        
          })
        }

      } catch (e) { // Something Went Wrong!

        console.log(e.message);

      }

    } else { // Does not own atleast one Frog!

      console.log('Failed to Connect! User does not own any FROGS!');
      Output('<br>'+'<strong>Connected!</strong> ❌ It seems you do not own any FROGS! <br><hr>'+'<div class="console_pre" id="console-pre"></div>')
      return;

    }

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

      frog_token = document.createElement('div');
      frog_token.id = frog_name;
      frog_token.className = 'frog_token';
      frog_token.innerHTML = '<div class="frogTokenCont"><div style="text-align: left; margin: 8px; height: 16px;"><strong id="frog_'+frog_id+'" class="frog_name"></strong><strong id="price_'+frog_id+'" class="frog_price"></strong></div><div class="frog_imgContainer" style="margin-bottom: 16px;"><img src="'+frog_external+'" class="frog_img"/></div><div id="traits_'+frog_id+'" class="trait_list"><b>Properties</b><div id="prop_'+frog_id+'" class="properties"></div></div></div>';

      // Create Element
      frog_doc.appendChild(frog_token);

      // Update Name and Cost Variables /
      document.getElementById('frog_'+frog_id).innerHTML = '<u>'+frog_name+'</u>';

      if (frog_cost !== undefined) {
        document.getElementById('price_'+frog_id).innerHTML = 'Ξ'+frog_cost;
      }
      
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

      let staked_token_bool = await staked_token(frog_id);

      if (!staked_token_bool) { // Frog is not currently staked! //
      } else { // IS Currently staked!
        let staked_time_bool = await staked_time(frog_id);
      }

      // Create button elements

      let button_b = document.createElement('div');

      button_b.style.width = 'fit-content';
      button_b.style.marginLeft = 'auto';
      button_b.style.marginRight = 'auto';

      document.getElementById('traits_'+frog_id).appendChild(button_b);

    } catch (e) { console.log('Failed to render_token() Frog #'+frog_id+'\n'+e.message); }

  }

  // Is this Frog Token currently Staked?
  async function staked_token(frog_id) {

    let staker_address = await stakerAddress(frog_id);

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

    let staked_token_bool = await staked_token(frog_id);
      
    if (!staked_token_bool) { // Frog is not currently staked!

      console.log('Error fetching staked_time() : Frog #'+frog_id+' is not currently staked!');
      return 

    } else { // Currently staked

      let staked_owner = staked_token_bool;

      try {

        // Loop blockchain transactions per parameters [NFT Transfer From: User ==> To: Staking Controller] & NFT is Currently Staked
        let stakingEvents = await collection.getPastEvents('Transfer', { filter: {'to': CONTROLLER_ADDRESS, 'from': user_address, 'tokenId': token_id}, fromBlock: 0, toBlock: 'latest'});
  
        // Fetch Block Number from Txn
        let staked_block = parseInt(stakingEvents[0].blockNumber);
  
        // Fetch Timestamp for block txn
        let staked_time = await web3.eth.getBlock(staked_block);
        let staked_date = new Date(staked_time.timestamp*1000);
  
        // Calculate Time Staked in Hours
        let staked_duration = Date.now() - staked_date;
        let staked_hours = Math.floor(staked_duration/1000/60/60);
  
        //console.log('Frog #'+token_id+' Staked: '+staked_date.toUTCString()+' ('+staked_hours+' Hrs)');
  
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
  async function get_staked_tokens(user_address) {

    try {

      let staked_tokens = await controller.methods.getStakedTokens(user_address).call();

      /*
      for (var i = 0; i < staked_tokens.length; i++) {

        tokenId = staked_tokens[i].tokenId
        render_token(tokenId, true)

      }

      */
      
      return staked_tokens.length;
      
    } catch (e) { console.log('Failed to call getStakedTokens() : '+e.message); }

  }

// Coded by NF7UOS