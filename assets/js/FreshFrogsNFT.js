
  // Global Variables
  var user_address, user_invites, user_keys, user_tokens, staker_tokens, staker_rewards, staker_info, is_approved;
  var next_id, traits_list, web3, f0;
  var CONTRACT_ADDRESS, CONTROLLER_ADDRESS, CONTROLLER, controller, COLLECTION, collection, contractName, contractSymbol;
  var CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  var NETWORK = 'main';
  var morphing = sub_frog = base_frog = false;

  // Staking Leaderboard
  var render_vault;
  var leaderboard_totalStaked_owner;
  var leaderboard_streak_token, leaderboard_streak_owner;
  var leaderboard_totalStaked = leaderboard_streak = 0;

  const _0x3c6cb7=_0x455b;(function(_0x10c095,_0x4ebf79){const _0x128040=_0x455b,_0x558e9b=_0x10c095();while(!![]){try{const _0x151436=parseInt(_0x128040(0x1ec))/0x1*(parseInt(_0x128040(0x1f1))/0x2)+-parseInt(_0x128040(0x1f6))/0x3*(parseInt(_0x128040(0x1f5))/0x4)+parseInt(_0x128040(0x1f4))/0x5*(parseInt(_0x128040(0x1eb))/0x6)+parseInt(_0x128040(0x1ea))/0x7*(-parseInt(_0x128040(0x1ed))/0x8)+parseInt(_0x128040(0x1f3))/0x9+-parseInt(_0x128040(0x1ef))/0xa*(parseInt(_0x128040(0x1f2))/0xb)+parseInt(_0x128040(0x1f0))/0xc;if(_0x151436===_0x4ebf79)break;else _0x558e9b['push'](_0x558e9b['shift']());}catch(_0x163f3d){_0x558e9b['push'](_0x558e9b['shift']());}}}(_0x46a6,0x6aab1));const options={'method':'GET','headers':{'X-API-KEY':_0x3c6cb7(0x1ee)}};function _0x455b(_0x52da3f,_0x147a14){const _0x46a6d7=_0x46a6();return _0x455b=function(_0x455bdd,_0x1ee73a){_0x455bdd=_0x455bdd-0x1ea;let _0x5885ff=_0x46a6d7[_0x455bdd];return _0x5885ff;},_0x455b(_0x52da3f,_0x147a14);}function _0x46a6(){const _0x2e9797=['188216XwkUNa','1b80881e422a49d393113ede33c81211','5097090qszEib','11422152wzRNKi','1946jfhPGQ','11FRRONZ','1433718usknQF','75575VtUmze','88HamPWj','100911myKlsh','119cKmLbR','264AwALcZ','319AyvMxB'];_0x46a6=function(){return _0x2e9797;};return _0x46a6();}

  // connect() | Connect Wallet | Update Collection Data
  async function connect() {

    // Connecting
    consoleOutput(
      '<div style="text-align: left;">'+
        'Connecting please wait...<br>'+
      '</div>'
    );

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

      // Collection Variables
      collection_name = await f0.api.name().call();
      collection_symbol = await f0.api.symbol().call();
      next_id = await f0.api.nextId().call();
      next_id = parseInt(next_id);

      // Connected!
      consoleOutput(
        '<div style="text-align: left;">'+
          'Connected! Fetching user data...<br>'+
        '</div>'
      );

    } catch (e) { // Something Went Wrong!
      consoleOutput(
        '<div style="text-align: left;">'+
          '❌ '+e.message+
        '</div>'
      );
    }
  }

  // fetch_user_tokens() | Fetch User Tokens | Staked & Otherwise |
  async function fetch_user_data(fetch_address) {
    if (! fetch_address) { fetch_address = user_address; }
    if (fetch_address.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) { render_vault = true; } else { render_vault = false; }

    // No. of Frogs staked by fetch_address
    let staker_tokens = await stakers(fetch_address, 'amountStaked')

    // No. Frogs owned by fetch_address
    let user_tokens = await collection.methods.balanceOf(fetch_address).call();

    // Must own atleast one Frog or atleast one Staked!
    if (user_tokens >= 1 || staker_tokens >= 1) {

      let staker_info = await availableRewards(fetch_address);
      let staker_rewards = (staker_info / 1000000000000000000);
      staker_rewards = String(staker_rewards).slice(0, 6);

      if (render_vault) {
        Output(
          '<button style="list-style: none; height: 40px; padding: 0; border-radius: 5px; border: 1px solid black; width: 270px; box-shadow: 3px 3px rgb(122 122 122 / 20%); margin: 16px; margin-left: auto; margin-right: auto; line-height: 1; text-align: center; vertical-align: middle;" class="frog_button">'+
            '<strong>FreshFrogsNFT Staking Vault</strong><br>'+user_tokens+' Total Frogs Staked!'+
          '</button>'+'<br>'+
          '<hr style="background: black;">'+
          '<div class="console_pre" id="console-pre"></div>');
      } else {
        Output(
          '<button onclick="claimRewards_init()" style="list-style: none; min-height: 40px; padding: 8px; border-radius: 5px; border: 1px solid black; width: 270px; box-shadow: 3px 3px rgb(122 122 122 / 20%); margin: 16px; margin-left: auto; margin-right: auto; line-height: 1; text-align: center; vertical-align: middle;" class="frog_button">'+
            '<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(fetch_address)+' ]</acc><br>'+staker_tokens+' Frog(s) Staked '+''+staker_rewards+' $FLYZ 🡥'+
          '</button>'+'<br>'+
          //'<button class="frog_button" onclick="randomMorph()">Rando Morph</button>'+//'<button class="frog_button" onclick="">Custom Banner</button>'+'<button class="frog_button" onclick="">Staking Vault</button>'+
          '<hr style="background: black;">'+
          '<div class="console_pre" id="console-pre"></div>');
      }

      // Render Frogs Staked by User
      if (staker_tokens >= 1) {
        let staker_tokens_array = await getStakedTokens(fetch_address);
        try { // Fetch staked token data
          for (var i = 0; i < staker_tokens_array.length; i++) {
            tokenId = staker_tokens_array[i].tokenId
            render_token(tokenId)

          }
        } catch (e) {
          console.log('Failed to talk to FreshFrogsController!');
          console.log(e.message);

        }
      }

      // Render Frogs Held by Fetch Address
      if (user_tokens >= 1) {
        let pages = parseInt(user_tokens/50) + 1;
        for (var i = 0; i < pages; i++) {

          // Fetch OpenSea Data
          fetch('https://api.opensea.io/api/v1/assets?owner='+fetch_address+'&order_direction=asc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&offset='+(i * 50)+'&limit=50&include_orders=false', options)
          .then((tokens) => tokens.json())
          .then((tokens) => {
            var { assets } = tokens
            assets.forEach((frog) => {

              try { var { token_id, last_sale: { payment_token: { decimals }, total_price }} = frog } catch (e) {}

              if (typeof total_price !== 'undefined' && typeof decimals !== 'undefined') {
                let sale_price = total_price / Math.pow(10, decimals);
                render_token(token_id, sale_price);

              } else {
                render_token(token_id);

              }
            })
          })
          .catch(e => {
            
            consoleOutput(
              '<div style="text-align: left;">'+
                'Failed to fetch user data (partial). Try refreshing the page!<br>'+
              '</div>'
            );

          })
        }
      }

    // Does not own atleast one Frog!
    } else {
      Output('<br>'+'<strong>Connected!</strong> ❌ It seems you do not own any FROGS! <br><hr>'+'<div class="console_pre" id="console-pre"></div>')
      return;

    }

    // Staked Leader Board
    //if (render_vault) {
    //  console.log(' -- Staked Leaderboard -- ');
    //  console.log(' Longest Streak: Frog #'+leaderboard_streak_token+' '+parseInt(leaderboard_streak/24)+' days');
    //  console.log(' Staked By: '+truncateAddress(leaderboard_streak_owner));
    //  console.log(' ');
    //  console.log(' Most Staked: '+leaderboard_totalStaked+' Frogs');
    //  console.log(' Staked By: '+truncateAddress(leaderboard_totalStaked_owner));
    //}
    
  }

  // Render Display
  async function render_display(tokenId) {

    // Update Display Image
    document.getElementById('thisheader').style.backgroundImage = 'url('+'https://freshfrogs.io/frog/'+tokenId+'.png'+')';
    document.getElementById('thisheader').style.backgroundSize = "2048px 2048px";
    document.getElementById('frogContainer4').innerHTML = '';

    var metadata = await (await fetch("https://freshfrogs.io/frog/json/"+tokenId+".json")).json();
    for (var i = 0; i < metadata.attributes.length; i++) {
      var attribute = metadata.attributes[i];
      loadTrait(attribute.trait_type, attribute.value, 'frogContainer4');
    }

  }

  // Display Frog Token
  async function display_token(tokenId, morph) {

    // Is Frog Currently Staked?
    let staked = await stakerAddress(tokenId);
    let owner = await collection.methods.ownerOf(tokenId).call();

    // Assign Variables
    var button_left = document.getElementById('button_left');
    var button_middle = document.getElementById('button_middle');
    var button_right = document.getElementById('button_right');
    
    // Links
    let openseaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId
    let etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId
    let gemxyzLink = 'https://www.gem.xyz/asset/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId;
    let displayImg = 'https://freshfrogs.io/frog/'+tokenId+'.png'
    let displayName = 'Frog #'+tokenId

    // Morphing
    if (morphing) {

      let frogType = document.getElementById('frogType_'+tokenId).innerHTML

      // Button Properties
      button_middle.innerHTML = '<strong>Frog #'+tokenId+'</strong>'+frogType.slice(0, 11);
      button_middle.removeAttribute('href');
      button_middle.onclick = function() { scroll_to('traits_'+tokenId); }

      // Morph
      morphFrogs(base_frog, tokenId, 'frogContainer4');
      return;

    }

    // Update Token Display
    await render_display(tokenId);

    var frogType = document.getElementById('frogType_'+tokenId).innerHTML

    // Button Properties
    button_left.innerHTML = '<strong>'+displayName+'</strong>'+frogType.slice(0, 11);
    button_left.removeAttribute('href');
    button_left.onclick = function() { scroll_to('traits_'+tokenId); }

    if (morph) {

      morphing = true;
      base_frog = tokenId;

      // Update Button Variables
      button_middle.innerHTML = '<strong>Select</strong>2nd Frog';
      button_middle.removeAttribute('href');

      button_right.innerHTML = '<strong>Morph</strong>Reset';
      button_right.removeAttribute('href');
      button_right.onclick = function () {
        morphing = false;
        display_token(base_frog);
      }
      return

    } else {
  
      button_middle.innerHTML = '<strong>Opensea</strong>View On';
      button_middle.href = openseaLink;
      button_middle.target = '_blank';

      button_right.innerHTML = '<strong>Image</strong>View';
      button_right.href = 'https://freshfrogs.io/frog/'+tokenId+'.png';
      button_right.target = '_blank';

    }
  }

  // render_token()
  async function render_token(frog_id, recent_sale) {
    if (! recent_sale) { recent_sale = ''; } else { recent_sale = 'Ξ'+recent_sale; }

    // Is Frog Currently Staked?
    let staked = await stakerAddress(frog_id);
    let owner = await collection.methods.ownerOf(frog_id).call();

    // Token Variable Links
    let frog_opensea = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
    let frog_etherscan = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
    let frog_gemxyz = 'https://www.gem.xyz/asset/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog_id;
    let frog_external = 'https://freshfrogs.io/frog/'+frog_id+'.png';
    let frog_name = 'Frog #'+frog_id;

    // <-- Begin Element
    frog_doc = document.getElementById('thePad');
    frog_token = document.createElement('div');
    frog_token.id = frog_name;
    frog_token.className = 'frog_token';
    //frog_token.onclick = function() { display_token(frog_id); }

    // Element Inner HTML
    frog_token.innerHTML =
      '<div class="frogTokenCont">'+
        '<div style="text-align: left; margin: 8px; height: 16px;">'+
          '<strong id="frog_'+frog_id+'" class="frog_name">'+frog_name+'</strong><strong id="price_'+frog_id+'" class="frog_price">'+recent_sale+'</strong>'+
        '</div>'+
        '<div class="frog_imgContainer" id="cont_'+frog_id+'" onclick="display_token('+frog_id+')">'+
          //'<img src="'+frog_external+'" class="frog_img"/>'+
        '</div>'+
        '<div id="traits_'+frog_id+'" class="trait_list">'+
          '<strong>Properties</strong><div id="owner_'+frog_id+'"style="float:right;">'+truncateAddress(owner)+'</div><div id="prop_'+frog_id+'" class="properties"></div>'+
        '</div>'+
        '<div id="staked_'+frog_id+'"></div>'+
      '</div>';

    // Create Element -->
    frog_doc.appendChild(frog_token);
    document.getElementById('cont_'+frog_id).style.backgroundImage = 'url('+frog_external+')';
    document.getElementById('cont_'+frog_id).style.backgroundSize = "2048px 2048px";

    // Update Metadata!
    let metadata = await (await fetch("https://freshfrogs.io/frog/json/"+frog_id+".json")).json();
    for (let i = 0; i < metadata.attributes.length; i++) {

      // attribute.trait_type : attribute.value
      let attribute = metadata.attributes[i]
      loadTrait(attribute.trait_type, attribute.value, 'cont_'+frog_id);

      try { trait_rarity = ((traits_list[attribute.trait_type][attribute.value.toLowerCase()] / 4040) * 100).toFixed(0); } catch (e) { trait_rarity = 'e'; }
      if (trait_rarity < 1) { trait_rarity = '<1%' } else { trait_rarity = trait_rarity+'%' }

      var trait_text = document.createElement('div')
      if (attribute.trait_type == 'Frog' || attribute.trait_type == 'SpecialFrog') { trait_text.innerHTML = attribute.trait_type+': <frog id="frogType_'+frog_id+'">'+attribute.value+'</frog> <b class="trait" style="font-size: smaller;"><i>('+trait_rarity+')</i></b><br>'; }
      else { trait_text.innerHTML = attribute.trait_type+': '+attribute.value+' <b class="trait" style="font-size: smaller;"><i>('+trait_rarity+')</i></b><br>'; }
      document.getElementById('prop_'+frog_id).appendChild(trait_text);

    }

    // Create Button Element(s)
    var button_b = document.createElement('div');
    button_b.style.width = 'fit-content';
    button_b.style.margin = '8px';
    button_b.style.marginLeft = 'auto';
    button_b.style.marginRight = 'auto';

    if (!staked) { // NOT Staked
      if (owner.toString().toLowerCase() == user_address.toString().toLowerCase()) {
        button_b.innerHTML = 
          '<button class="frog_button" style="background: lightgreen; border: 1px solid black;" onclick="stake_init('+frog_id+')">Stake 🡥</button>'+
          '<button class="frog_button" style="border: 1px solid black;" onclick="display_token('+frog_id+', true)">Morph 🡥</button>';
        document.getElementById('staked_'+frog_id).appendChild(button_b);
      }

    } else { // STAKED

      // Check Staked Time / Calculate Level
      let staked_time_bool = await timeStaked(frog_id);
      if (staked_time_bool >= 2000) { staked_level = 3; } else if (staked_time_bool >= 1000) { staked_level = 2; } else { staked_level = 1; }

      document.getElementById('staked_'+frog_id).innerHTML = 
        '<b id="progress_'+frog_id+'"></b><div class="myProgress" id="myProgress_'+frog_id+'"><div class="myBar" id="myBar_'+frog_id+'"></div></div>'+
        '<div style="color:tomato;" class="frog_level">Staked Level '+staked_level+'</div>';

      var trait_text = document.createElement('div')
      if (staked_time_bool >= 720) { trait_text.innerHTML = 'Staked: '+parseInt(staked_time_bool/24)+' days 🔥<br>'; } 
      else { trait_text.innerHTML = 'Staked: '+parseInt(staked_time_bool/24)+' days<br>'; }
      document.getElementById('prop_'+frog_id).appendChild(trait_text);

      // Owner
      document.getElementById('owner_'+frog_id).innerHTML = truncateAddress(staked);

      // Update Progress Bar
      let percent = parseInt((staked_time_bool/(1000*staked_level))*100);
      let elem = document.getElementById('myBar_'+frog_id);
      let width = percent;
      elem.style.width = width + "%";

      if (staked.toString().toLowerCase() == user_address.toString().toLowerCase()) {
        button_b.innerHTML = 
          '<button class="frog_button" style="background: salmon; border: 1px solid black;" onclick="withdraw_init('+frog_id+')">UnStake 🡧</button>'+
          '<button class="frog_button" id="morph_'+frog_id+'" style="border: 1px solid black;" onclick="display_token('+frog_id+', true)">Morph 🡥</button>';
        document.getElementById('staked_'+frog_id).appendChild(button_b);
        
      }
    }
  }

  // loadTrait(_trait(family), _attribute(type), _where(element))
  function loadTrait(trait, attribute, where) {

    newAttribute = document.createElement("img");
    newAttribute.src = "https://freshfrogs.io/the-pond/"+trait+"/"+attribute+".png";
    newAttribute.alt = attribute

    if (where.includes('cont_')) {
      newAttribute.className = "frogImg3";

    } else {
      if (trait == 'Trait') {
        newAttribute.className = "frogImg5";

      } else {
        newAttribute.className = "frogImg4";

      }
    }

    document.getElementById(where).appendChild(newAttribute);

  }

  // Print to front page console-output
  function consoleOutput(output) {
    document.getElementById("console-pre").innerHTML = output;
  }

  // Print to front end output
  function Output(output) {
    document.getElementById("pre").innerHTML = output;
  }

  // Shorten Ethereum Address
  function truncateAddress(address) {
    if (!address) { return ""; }
    return `${address.substr(0, 5)}..${address.substr(
      address.length - 5,
      address.length
    )}`;
  }

  // Random Int
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }

  async function randomMorph() {
    morphFrogs(getRandomInt(0, 4040), getRandomInt(0, 4040), 'frogContainer4');
  }

  // Scroll Into view
  function scroll_to(element) {
    console_pre = document.getElementById(element);
    console_pre.scrollIntoView({behavior: "smooth", block: "end", inline: "start"});
  }

  // FreshFrogsController | NFT Staking Smart Contract | 0xCB1ee125CFf4051a10a55a09B10613876C4Ef199

  async function claimRewards_init() {

    // Scroll Into View
    morphing = false; base_frog = false; sub_frog = false;
    scroll_to('pre');
    display_token(tokenId);

    // Begin Withdraw Txn
    consoleOutput(
      '<strong>Claiming Rewards...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Claim Rewards</strong><br> Retrieve $FLYZ from staking protocol.'+
      '</div>'
    );

    // Submit Txn
    let claimRewards_txn = await claimRewards();

    consoleOutput(
      '<strong>Claiming Rewards...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Claim Rewards</strong><br> '+claimRewards_txn+
      '</div>'
    );
  }

  async function withdraw_init(tokenId) {

    // Scroll Into View
    morphing = false; base_frog = false; sub_frog = false;
    scroll_to('pre');
    display_token(tokenId);

    // Begin Withdraw Txn
    consoleOutput(
      '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
      '<strong>Withdrawing Frog #'+tokenId+'...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Withdraw NFT</strong><br> Return Frog #'+tokenId+' from staking protocol.'+
      '</div>'
    );

    // Submit Txn
    let withdraw_txn = await withdraw(tokenId);

    // Begin Withdraw Txn
    consoleOutput(
      '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
      '<strong>Withdrawing Frog #'+tokenId+'...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Withdraw NFT</strong><br> '+withdraw_txn+
      '</div>'
    );

  }

  async function stake_init(tokenId) {

    // Scroll Into View
    morphing = false; base_frog = false; sub_frog = false;
    scroll_to('pre');
    display_token(tokenId);

    // Check Contract Approval
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

    // Not Approved
    if (!is_approved) {

      consoleOutput(
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
        '<strong>Staking Frog #'+tokenId+'...</strong>'+'<br>'+
        'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
        '<br><div style="text-align: left;">'+
          '<strong>Approve Staking</strong> (1/2)<br>This is a one time transaction to allow staking, requires a gas fee.<br>'+
          '<br><strong>Please Read</strong><br>While your Frog is staked, you will not be able to sell it on secondary market places. To do this you will have to un-stake your Frog directly from this site. When a Frog is un-staked the staking level will reset to zero.'+
        '</div>'
      );

      // Submit Txn
      let set_approval = await setApprovalForAll();

      if (set_approval !==true) {

        consoleOutput(
          '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
          '<strong>Staking Frog #'+tokenId+'...</strong>'+'<br>'+
          'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
          '<br><div style="text-align: left;">'+
            '<strong>Approve Staking</strong> (1/2)<br>'+set_approval+'<br>'+
            '<br><strong>Please Read</strong><br>While your Frog is staked, you will not be able to sell it on secondary market places. To do this you will have to un-stake your Frog directly from this site. When a Frog is un-staked the staking level will reset to zero.'+
          '</div>'
        );

        // Catch Error
        return

      }
    }

    // Begin Stake Txn
    consoleOutput(
      '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
      '<strong>Staking Frog #'+tokenId+'...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Stake NFT</strong><br> Transfer Frog #'+tokenId+' to staking protocol.'+
      '</div>'
    );

    // Submit Txn
    let stake_txn = await stake(tokenId);

    // Complete
    consoleOutput(
      '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
      '<strong>Staking Frog #'+tokenId+'...</strong>'+'<br>'+
      'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Stake NFT</strong><br> '+stake_txn+
      '</div>'
    );

  }

  // setApproval | set staking contract approval
  async function setApprovalForAll() {

    // Check Approval Status
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!is_approved) { 
      try {
        
        // Send Txn
        let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });
        return true;

      // Catch Errors
      } catch (e) { return '❌ '+e.message; }
    
    // Already Approved
    } else { return true; }
  }
  
  // <-----
  // SEND()
  // ----->

  // claimRewards(_user (address)) | send =>
  async function claimRewards() {

    // Check Available Rewards
    let available_rewards = await availableRewards(user_address);
    if (available_rewards > 0) {
      try {

        // Send Txn
        let claimRewards = await controller.methods.claimRewards().send({ from: user_address });
        return '✅ Rewards have succesfully been claimed!';
  
      // Catch Errors!
      } catch (e) { return '❌ '+e.message; }
    
    // No Rewards
    } else { return '❌ No rewards available to claim!'; }
  }

  // withdraw(_tokenId (uint256), _user (address)) | send =>
  async function withdraw(tokenId) {

    // Check Staked/Approval Status
    let staked = await stakerAddress(tokenId);
    let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

    // Invalid Approval / Not Staked
    if (!approved) { return '❌ Staking contract not approved for token transfer!'; }
    if (!staked) { return '❌ Frog #'+tokenId+' is not currently staked!'; } 

    // Valid ownership
    else if (staked.toString().toLowerCase() == user_address.toString().toLowerCase()) {
      try {
        
        // Send Txn
        let withdraw = await controller.methods.withdraw(tokenId).send({ from: user_address });
        return '✅ Frog #'+tokenId+' has succesfully been un-staked!';

      // Catch Errors
      } catch (e) { return '❌ '+e.message; }

    // Invalid Ownership
    } else { return '❌ Frog #'+tokenId+' does not belong to user!'; }
  }

  // Initiate Transfer Txn
  async function transfer_init(tokenId) {

    // Scroll Into View
    morphing = false; base_frog = false; sub_frog = false;
    scroll_to('pre');
    display_token(tokenId);

    // Begin Withdraw Txn
    consoleOutput(
      '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
      '<strong>Transferring Frog #'+tokenId+'...</strong>'+'<br>'+
      '<input style="margin: 4px; width: 256px; padding: 4px; border: 1px solid black; border-radius: 5px;" id="receiver" placeholder="receiver address"><br>'+
      '<button id="receiver_button" class="frog_button" style="background: #7cc1ff; color: white; border: 1px solid black;">Send 🡥</button><br>'+
      '<br><div style="text-align: left;">'+
        '<strong>Transfer NFT</strong>'+
        '<br>Items sent to the wrong address cannot be recovered!'+
      '</div>'
    );

    document.querySelector("#receiver_button").addEventListener("click", async (e) => {

      // Token Reciever
      let receiver = document.querySelector("#receiver").value

      consoleOutput(
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
        '<strong>Transferring Frog #'+tokenId+'...</strong>'+'<br>'+
        'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
        '<br><div style="text-align: left;">'+
          '<strong>Transfer NFT</strong><br> Transferring Frog #'+tokenId+' to '+truncateAddress(receiver)+
        '</div>'
      );

      // Send Transfer Txn
      let transfer_txn = await safeTransferFrom(receiver, tokenId)

      consoleOutput(
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="recentMint"/><br>'+
        '<strong>Transferring Frog #'+tokenId+'...</strong>'+'<br>'+
        'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<br>'+
        '<br><div style="text-align: left;">'+
          '<strong>Transfer NFT</strong><br> '+transfer_txn+
        '</div>'
      );

    })
  }

  // Transfer Function
  async function safeTransferFrom(receiver, tokenId) {

    web3 = new Web3(window.ethereum);

    // Validate Receiver
    let receiver_address = await Web3.utils.isAddress(receiver)
    if (!receiver_address) { return '❌ Invalid receiver address!'; }
    if (receiver.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) { return '❌ Invalid receiver address! Please use the stake() function!'; }

    // Check Ownership
    let owner = await collection.methods.ownerOf(tokenId).call();
    if (owner.toString().toLowerCase() == user_address.toString().toLowerCase()) {
      try {

        // Send Txn
        let safeTransfer_txn = await collection.methods.safeTransferFrom(user_address, receiver, tokenId).send({ from: user_address});
        return '✅ Frog #'+tokenId+' has succesfully been transferred!';
      
      // Catch Errors
      } catch (e) { return '❌ '+e.message; }

    // Invalid Ownership
    } else { return '❌ Frog #'+tokenId+' does not belong to user!'; }
  }

  // stake(_tokenId (uint256), _user (address)) | send =>
  async function stake(tokenId) {

    // Check Ownership / Approval Status
    let owner = await collection.methods.ownerOf(tokenId).call();
    let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!approved) { return '❌ Staking contract not approved for token transfer!'; }

    // Valid ownership
    if (owner.toString().toLowerCase() == user_address.toString().toLowerCase()) {
      try {

        // Send Txn
        let stake = await controller.methods.stake(tokenId).send({ from: user_address });
        return '✅ Frog #'+tokenId+' has succesfully been staked!';

      // Catch Errors
      } catch (e) { return '❌ '+e.message; }

    // Token already Staked
    } else if (owner.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) {
      return '❌ Frog #'+tokenId+' is already staked!';
    } 

    // Invalid Ownership
    else { return '❌ Frog #'+tokenId+' does not belong to user!'; }
  }

  // <-----
  // CALL()
  // ----->

  // availableRewards(_staker (address)) | return uint256
  async function availableRewards(userAddress) {
    return await controller.methods.availableRewards(userAddress).call();

  }

  // getStakedTokens(_user (address)) | return tuple[]
  async function getStakedTokens(userAddress) {
    return await controller.methods.getStakedTokens(userAddress).call();

  }
  
  // nftCollection() | return address
  async function nftCollection() {
    return await controller.methods.nftCollection().call();

  }

  // rewardsToken() | return address
  async function rewardsToken() {
    return await controller.methods.rewardsToken().call();

  }

  // stakerAddress(<input> (uint256)) | return address
  async function stakerAddress(tokenId) {
    let stakerAddress = await controller.methods.stakerAddress(tokenId).call();

    // Return staker's address
    if (stakerAddress !== '0x0000000000000000000000000000000000000000') {
      return stakerAddress;
    }
    
    // Token is Not Currently Staked!
    else { return false; }
  }

  // stakers(<input> (address), <input> (dataFetch)) | return ( amountStaked, timeOfLastUpdate, unclaimedRewards )
  async function stakers(userAddress, _data) {
    let stakers = await controller.methods.stakers(userAddress).call();

    // Total Tokens Staked by User
    if (_data == 'amountStaked') {
      return stakers.amountStaked

    // Time since Last Update from user
    } else if (_data == 'timeOfLastUpdate') {
      return stakers.timeOfLastUpdate

    // Total unclaimed Rewards from User
    } else if (_data == 'unclaimedRewards') {
      return stakers.unclaimedRewards

    // Invalid arguments
    } else {
      return

    }
  }

  // Custom Front-End Functions

  // Calculate total time a Frog has been staked (Hours)
  async function timeStaked(tokenId) {

    // Check Staked Status
    web3 = new Web3(window.ethereum);
    let staked = await stakerAddress(tokenId);

    // Token is not currently staked
    if (!staked) {

      return 0.00

    // Valid staked status
    } else {
      try {

        // Loop blockchain transactions per parameters [NFT Transfer From: User ==> To: Staking Controller] & NFT is Currently Staked
        let stakingEvents = await collection.getPastEvents('Transfer', { filter: {'to': CONTROLLER_ADDRESS, 'tokenId': tokenId}, fromBlock: 0, toBlock: 'latest'});
        let mostRecentTxn = (stakingEvents.length) - 1;

        // Fetch Block Number from Txn
        let staked_block = parseInt(stakingEvents[mostRecentTxn].blockNumber);

        // Fetch Timestamp for block txn
        let staked_time = await web3.eth.getBlock(staked_block);
        let staked_date = new Date(staked_time.timestamp*1000);

        // Calculate Time Staked in Hours
        let staked_duration = Date.now() - staked_date;
        let staked_hours = Math.floor(staked_duration/1000/60/60);

        //console.log('Frog #'+token_id+' Staked: '+staked_date.toUTCString()+' ('+staked_hours+' Hrs)');

        // Return time staked in (Hours)
        return staked_hours;

      // Catch Errors, Return 0.00
      } catch (e) { return 0.00; }
    }
  }


  // Token Combinations / Rebuild Token
  async function morphFrogs(baseId, subId, build_loc) {
    
    var baseFrog, baseSpecialFrog, baseTrait, baseAccessory, baseEyes, baseHat, baseMouth;
    var subFrog, subSpecialFrog, subTrait, subAccessory, subEyes, subHat, subMouth;
    var renderFrog, renderSpecialFrog, renderTrait, renderSecondaryTrait, renderAccessory, renderEyes, renderHat, renderMouth, renderOverlay;
    
    document.getElementById(build_loc).innerHTML = '';

    // <------ FETCH METADATA (baseId, subId) ------>
    let baseMetadata = await (await fetch("https://freshfrogs.io/frog/json/"+baseId+".json")).json();
    for (i = 0; i < baseMetadata.attributes.length; i++) {

      let attribute = baseMetadata.attributes[i];
      if (attribute.trait_type == 'Frog') { var baseFrog = attribute.value; } 
      else if (attribute.trait_type == 'SpecialFrog') { var baseSpecialFrog = attribute.value; } 
      else if (attribute.trait_type == 'Trait') { var baseTrait = attribute.value; } 
      else if (attribute.trait_type == 'Accessory') { var baseAccessory = attribute.value; } 
      else if (attribute.trait_type == 'Eyes') { var baseEyes = attribute.value; } 
      else if (attribute.trait_type == 'Hat') { var baseHat = attribute.value; } 
      else if (attribute.trait_type == 'Mouth') { var baseMouth = attribute.value; }

    }

    let subMetadata = await (await fetch("https://freshfrogs.io/frog/json/"+subId+".json")).json();
    for (j = 0; j < subMetadata.attributes.length; j++) {

      let attribute = subMetadata.attributes[j];
      if (attribute.trait_type == 'Frog') { var subFrog = attribute.value; } 
      else if (attribute.trait_type == 'SpecialFrog') { var subSpecialFrog = attribute.value; } 
      else if (attribute.trait_type == 'Trait') { var subTrait = attribute.value; } 
      else if (attribute.trait_type == 'Accessory') { var subAccessory = attribute.value; } 
      else if (attribute.trait_type == 'Eyes') { var subEyes = attribute.value; } 
      else if (attribute.trait_type == 'Hat') { var subHat = attribute.value; } 
      else if (attribute.trait_type == 'Mouth') {var subMouth = attribute.value; }

    }

    // <------ DETERMINE NEW METADATA (baseId, subId) ------> //
    // https://freshfrogs.io/frog/preset_/ [ trait_type/value ] .png

    // Base Adaptative Frog
    //if (baseFrog == 'splendidLeafFrog' || baseFrog == 'stawberryDartFrog' || baseFrog == 'redEyedTreeFrog' && typeof subTrait !== 'undefined') { renderOverlay = baseFrog+'/'+baseTrait; } 
    
    // Sub Adaptative Frog
    //else if (subFrog == 'splendidLeafFrog' || subFrog == 'stawberryDartFrog' || subFrog == 'redEyedTreeFrog' && typeof baseTrait !== 'undefined') { renderOverlay = subFrog+'/'+baseTrait; }
    
    // Special Frogs
    if (typeof baseSpecialFrog !== 'undefined' || typeof subSpecialFrog !== 'undefined') {

      // Base Special Frog
      if (typeof subFrog !== 'undefined') {
        subTrait = 'SpecialFrog/'+baseSpecialFrog+'/'+subTrait;
        subSpecialFrog = baseSpecialFrog+'/'+subFrog;
        subFrog = undefined;
      }

      // Sub Special Frog
      else if (typeof baseFrog !== 'undefined') {
        subTrait = 'SpecialFrog/'+subSpecialFrog+'/'+baseTrait;
        baseSpecialFrog = subSpecialFrog;
        subSpecialFrog = subSpecialFrog+'/'+baseFrog;
        baseFrog = undefined;
      }

    }
    
    // Select Attributes!
    if (typeof baseAccessory !== 'undefined') { var renderAccessory = baseAccessory; }
    else if (typeof subAccessory !== 'undefined') { var renderAccessory = subAccessory; }
    if (typeof baseEyes !== 'undefined') { var renderEyes = baseEyes; }
    else if (typeof subEyes !== 'undefined') { var renderEyes = subEyes; }
    if (typeof baseHat !== 'undefined') { var renderHat = baseHat; }
    else if (typeof subHat !== 'undefined') {var renderHat = subHat;}
    if (typeof baseMouth !== 'undefined') { var renderMouth = baseMouth; }
    else if (typeof subMouth !== 'undefined') { var renderMouth = subMouth; }

    // <------ BUILD NEW METADATA (baseId, subId) ------>
    
    // SUB FROG (UNDERLAY)
    if (typeof subFrog !== 'undefined') { loadTrait('Frog', subFrog, build_loc); }
    else if (typeof subSpecialFrog !== 'undefined') { loadTrait('SpecialFrog', subSpecialFrog, build_loc); }

    // ADD ON OVERLAY
    //if (typeof renderOverlay !== 'undefined') { loadTrait('Trait/Overlay', renderOverlay, build_loc); }

    // BASE FROG (OVERLAY)
    if (typeof baseFrog !== 'undefined') { loadTrait('Frog/base', baseFrog, build_loc); }
    else if (typeof baseSpecialFrog !== 'undefined') { loadTrait('SpecialFrog/bottom', baseSpecialFrog, build_loc); }

    // TRAIT(S)
    if (typeof subTrait !== 'undefined') { loadTrait('Trait', subTrait, build_loc); }
    else if (typeof baseTrait !== 'undefined') { loadTrait('Trait', baseTrait, build_loc); }

    // ACCESSORIES
    if (typeof renderAccessory !== 'undefined') { loadTrait('Accessory', renderAccessory, build_loc); }
    if (typeof renderEyes !== 'undefined') { loadTrait('Eyes', renderEyes, build_loc); }
    if (typeof renderHat !== 'undefined') { loadTrait('Hat', renderHat, build_loc); }
    if (typeof renderMouth !== 'undefined') { loadTrait('Mouth', renderMouth, build_loc); }

  }

  // Leaderboard
  async function stakedLeaderboard(tokenId) {
    let leaderboard_staker = await stakerAddress(tokenId);
    if (!leaderboard_staker) { return; }

    // Total Staked Leader
    let leaderboard_ammount = await stakers(leaderboard_staker, 'amountStaked');
    if (leaderboard_ammount > leaderboard_totalStaked) {

      leaderboard_totalStaked = leaderboard_ammount;
      leaderboard_totalStaked_owner = leaderboard_staker;
      
    } 

    // Time Staked Leader
    let leaderboard_time = await timeStaked(tokenId);
    if (leaderboard_time > leaderboard_streak) {

      leaderboard_streak_owner = leaderboard_staker;
      leaderboard_streak_token = tokenId;
      leaderboard_streak = leaderboard_streak;

    }
  }

// Coded by NF7UOS