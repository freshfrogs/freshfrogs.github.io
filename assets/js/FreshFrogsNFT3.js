
  // Global Variables
  // User Variables
  var user_address, user_invites, user_keys, user_tokens;
  // Staked Variables
  var staker_tokens, staker_rewards, staker_info, is_approved;
  // Contract Variables
  var next_id, traits_list, web3, f0;
  var CONTRACT_ADDRESS, CONTROLLER_ADDRESS, CONTROLLER, controller, COLLECTION, collection, contractName, contractSymbol;
  var CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  var NETWORK = 'main';
  // Function Variables
  //var morphing = sub_frog = base_frog = false;

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
        'Connect Ethereum wallet...<br>'+
      '</div>'
    );

    /*
    console.log('fetching opensea collection info')

    // Fetch Collection Data via OpenSea API
    fetch('https://api.opensea.io/api/v1/collection/fresh-frogs', options)
    .then(collection => collection.json())
    .then(collection => {

      
      consoleOutput(
        '<div style="text-align: left;">'+
          'Fetching collection data from Opensea...<br>'+
        '</div>'
      );

      var { collection: { banner_image_url, created_date, description, dev_seller_fee_basis_points, external_url, featured_image_url, name, payout_address, traits, stats: { floor_price, market_cap, total_volume, count, num_owners } } } = collection
      traits_list = traits;
    })
    .catch(e => {
      console.log('Error: Failed to fetch OpenSea collection data!');

      consoleOutput(
        '<div style="text-align: left;">'+
          'Something went wrong! Try refreshing the page!<br>'+
        '</div>'
      );
      
    });
    */

    console.log('Get Contract, Controller ABI')

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
      console.log('Connecting factoria, web3')

      consoleOutput(
        '<div style="text-align: left;">'+
          'Connecting... please wait<br>'+
        '</div>'
      );

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
      
      // No. Frogs owned by fetch_address
      user_tokens = await collection.methods.balanceOf(user_address).call();
      // No. of Frogs staked by fetch_address
      staker_tokens = await stakers(user_address, 'amountStaked')
      // No. of total Frogs staked in contract
      total_staked = await collection.methods.balanceOf(CONTROLLER_ADDRESS).call();

      // Collection Variables
      collection_name = await f0.api.name().call();
      collection_symbol = await f0.api.symbol().call();
      next_id = await f0.api.nextId().call();
      next_id = parseInt(next_id);

      // Connected!
      // Update UI

      /*
      document.getElementById('button_bar').innerHTML =
        '<div id="mint_button_overlay" class="button_overlay">'+
          '<button class="stake_button" id="mint_button" style="width: 100px;">Mint</button>'+
        '</div>'+
        '<div id="thePond_button_overlay" class="button_overlay">'+
          '<button class="stake_button" id="thePond_button" style="width: 100px;">The Pond</button>'+
        '</div>'+
        '<div id="myFrogs_button_overlay" class="button_overlay" style="background: #2d3748;">'+
          '<button class="stake_button" id="myFrogs_button" style="width: 100px; background: #1ac486; color: white;">My Frogs</button>'+
        '</div>'

      // Add event listeners
      var mint_icon = document.getElementById('mint_button')
      var mint_icon_tab = document.getElementById('mint_button_overlay')

      var thePond_icon = document.getElementById('thePond_button')
      var thePond_button_tab = document.getElementById('thePond_button_overlay')

      var myFrogs_icon = document.getElementById('myFrogs_button')
      var myFrogs_button_tab = document.getElementById('myFrogs_button_overlay')

      // Mint Tab
      mint_icon.addEventListener("click", function(e) {
        console.log('mint_button')

        mint_icon.style.background = '#1ac486'
        thePond_icon.style.background = ''
        myFrogs_icon.style.background = ''
        mint_icon.style.color = 'white'
        thePond_icon.style.color = ''
        myFrogs_icon.style.color = ''

        mint_icon_tab.style.background = '#2d3748'
        thePond_button_tab.style.background = 'transparent'
        myFrogs_button_tab.style.background = 'transparent'
        Output(
          '<div>'+
            '<div class="terminalTop">'+
              '<wallet class="displayUnit">Wallet Address</wallet>'+
              '<br>'+user_address+''+
            '</div>'+
            '<div class="terminalBase">'+
              '<div class="terminalBottom">'+
                '<supply class="displayUnit">Total Supply</supply>'+
                '<br>'+next_id+' / 4040'+
              '</div>'+
              '<div class="terminalBottom">'+
                '<limit class="displayUnit">Mint Limit</limit>'+
                '<br>'+'9 @ Ξ0.01'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="console_pre" id="console-pre"></div>'
        )
      });

      // The Pond Tab
      thePond_icon.addEventListener("click", function(e) {
        console.log('thePond_icon')

        mint_icon.style.background = ''
        thePond_icon.style.background = '#1ac486'
        myFrogs_icon.style.background = ''
        mint_icon.style.color = ''
        thePond_icon.style.color = 'white'
        myFrogs_icon.style.color = ''

        mint_icon_tab.style.background = 'transparent'
        thePond_button_tab.style.background = '#2d3748'
        myFrogs_button_tab.style.background = 'transparent'
        fetch_user_data(CONTROLLER_ADDRESS);
        Output(
          '<div>'+
            '<div class="terminalTop">'+
              '<wallet class="displayUnit">Staking Contract</wallet>'+
              '<br>'+CONTROLLER_ADDRESS+''+
            '</div>'+
            '<div class="terminalBase">'+
              '<div class="terminalBottom">'+
                '<limit class="displayUnit">Reward Token</limit>'+
                '<br>'+'$FLYZ'+
              '</div>'+
              '<div class="terminalBottom">'+
                '<supply class="displayUnit">Total Staked</supply>'+
                '<br>'+total_staked+''+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="console_pre" id="console-pre"></div>'
        )
      });
      
      // My Frogs Tab
      myFrogs_icon.addEventListener("click", function(e) {
        console.log('myFrogs_icon')

        mint_icon.style.background = ''
        thePond_icon.style.background = ''
        myFrogs_icon.style.background = '#1ac486'
        mint_icon.style.color = ''
        thePond_icon.style.color = ''
        myFrogs_icon.style.color = 'white'

        mint_icon_tab.style.background = 'transparent'
        thePond_button_tab.style.background = 'transparent'
        myFrogs_button_tab.style.background = '#2d3748'
        fetch_user_data();

        Output(
          '<div>'+
            '<div class="terminalTop">'+
              '<wallet class="displayUnit">Wallet Address</wallet>'+
              '<br>'+user_address+''+
            '</div>'+
            '<div class="terminalBase">'+
              '<div class="terminalBottom">'+
                '<supply class="displayUnit">Owned</supply>'+
                '<br>'+user_tokens+''+
              '</div>'+
              '<div class="terminalBottom">'+
                '<limit class="displayUnit">Staked</limit>'+
                '<br>'+''+staker_tokens+''+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="console_pre" id="console-pre"></div>'
        )
        
      });
      */


      Output(
        '<div>'+
          '<div class="terminalTop">'+
            '<wallet class="displayUnit">Wallet Address</wallet>'+
            '<br>'+user_address+''+
          '</div>'+
          '<div class="terminalBase">'+
            '<div class="terminalBottom">'+
              '<supply class="displayUnit">Owned</supply>'+
              '<br>'+user_tokens+''+
            '</div>'+
            '<div class="terminalBottom">'+
              '<limit class="displayUnit">Staked</limit>'+
              '<br>'+''+staker_tokens+''+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="console_pre" id="console-pre"></div>'
      )

    } catch (e) { // Something Went Wrong!
      consoleOutput(
        '<div style="text-align: left;">'+
          'Failed to connect Ethereum wallet: '+
          '❌ '+e.message+
        '</div>'
      );
      console.log(e)
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

    document.getElementById('thePad').innerHTML = ''

    // Must own atleast one Frog or atleast one Staked!
    if (user_tokens >= 1 || staker_tokens >= 1) {

      let staker_info = await availableRewards(fetch_address);
      let staker_rewards = (staker_info / 1000000000000000000);
      staker_rewards = String(staker_rewards).slice(0, 6);

      /*
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
      */

      // Render Frogs Staked by User
      if (staker_tokens >= 1) {
        let staker_tokens_array = await getStakedTokens(fetch_address);
        try { // Fetch staked token data
          for (var i = 0; i < staker_tokens_array.length; i++) {
            tokenId = staker_tokens_array[i].tokenId

            let options = {method: 'GET'};

            fetch('https://api.opensea.io/api/v1/asset/'+CONTRACT_ADDRESS+'/'+tokenId+'/?include_orders=false', options)
              .then(token => token.json())
              .then(token => render_token(token))
              .catch(err => console.error(err));

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
              
              render_token(frog);

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
      button_middle.innerHTML = '<strong>Frog #'+tokenId+'</strong>secondary';
      button_middle.removeAttribute('href');
      button_middle.onclick = function() { scroll_to('traits_'+tokenId); }

      // Morph
      morphFrogs(base_frog, tokenId, 'frogContainer4');
      return;

    }

    // Update Token Display
    await render_display(tokenId);

    //var frogType = document.getElementById('frogType_'+tokenId).innerHTML

    // Button Properties
    button_left.innerHTML = '<strong>'+displayName+'</strong>';//+frogType.slice(0, 9);
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
      button_middle.onclick = function() {}

      button_right.innerHTML = '<strong>Image</strong>View';
      button_right.href = 'https://freshfrogs.io/frog/'+tokenId+'.png';
      button_right.target = '_blank';

    }
  }

  /*

    Retrieve OpenSea Username
    fetch_username(<address>) | return username (string)

  */

    async function fetch_username(account_address) {

      let options = {method: 'GET'};
      let opensea_response = await fetch('https://api.opensea.io/api/v1/user/'+account_address+'', options)
      let opensea_account = await opensea_response.json()
      let { account: { user: { username } } } = opensea_account
      return username;

      /*
        .then(OSUser => OSUser.json())
        .then(OSUser => {

          var { account: { user: { username } } } = OSUser
          return username

        })
        .catch(err => {

          console.error(err)
          return ''

        });
      */

        /// test AGAIN

    }
  
  /*

    Calculate stake values & returns

  */

    async function stakingValues(tokenId) {

      stakedTimeHours = await timeStaked(tokenId)
      stakedLevelInt = Math.floor((stakedTimeHours / 1000 )) + 1

      stakedTimeDays = Math.floor(stakedTimeHours / 24)                             // Time Staked
      stakedLevel = romanize(stakedLevelInt)                                         // Staked Level
      stakedNext = Math.round((((stakedLevelInt) * 1000) - stakedTimeHours) / 24)  // Days until next level
      stakedEarned = (stakedTimeHours / 1000).toFixed(3)                                          // Flyz Earned

      // [ Time Staked, Staked Level, Next Level, Flyz Earned]
      return [stakedTimeDays, stakedLevel, stakedNext, stakedEarned]

    }

  /*

    Frog Display Element

  */

  async function render_token(frog) {

    let opensea_username = ''
    let token_owner = ''
    let staked_time_days = staked_level = staked_next = staked_earned = '0'

    // Assign token variables from data object
    try { var { token_id, external_link, permalink, name, rarity_data: { rank }, owner: { address, user: { username } } } = frog } catch (e) {} // , last_sale: { payment_token: { decimals }, total_price }

    // Reference controller contract
    let staked = await stakerAddress(token_id)
    //if (staked == '0xF01e067d442f4254cd7c89A5D42d90ad554616E8' || staked == '0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359') {
    //  return
    //}

    if (!staked) {

      opensea_username = username

      if (typeof opensea_username == 'undefined' || opensea_username == '' || opensea_username == null) {
        opensea_username = truncateAddress(address)
      }

    } else {

      opensea_username = await fetch_username(staked)

      if (typeof opensea_username == 'undefined' || opensea_username == '' || opensea_username == null) {
        opensea_username = truncateAddress(staked)
      }

      let staking_values = await stakingValues(token_id)
      staked_time_days = staking_values[0]
      staked_level = staking_values[1]
      staked_next = staking_values[2]
      staked_earned = staking_values[3]

    }

    let rarity_rank = Math.floor(parseFloat((( rank / 4040 ) * 100)))
    if (rarity_rank < 1) { rarity_rank = 1 }

    // <-- Begin Element
    frog_doc = document.getElementById('thePad');
    frog_token = document.createElement('div');

    // Element Details -->
    frog_token.id = name;
    frog_token.className = 'frog_token';
    frog_token.innerHTML = 
      '<div class="frogTokenCont">'+
        '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+external_link+'); background-size: 2048px 2048px;">'+
          '<div class="innerLeft">'+
            '<div class="frog_imgContainer" id="cont_'+token_id+'" onclick="display_token('+token_id+')">'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="renderRight">'+
          '<div class="innerRight">'+
            '<div id="traits_'+token_id+'" class="trait_list">'+
              '<b>'+name+'</b> <text style="color: #1ac486;">'+opensea_username+'</text>'+'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
            '</div>'+
            '<div id="prop_'+token_id+'" class="properties">'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Time Staked</text>'+'<br>'+
                '<text style="color: #1ac486;">'+staked_time_days+' days</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>$FLYZ Earned</text>'+'<br>'+
                '<text style="color: #1ac486;">'+staked_earned+'</text>'+
              '</div>'+
              '<br>'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Level</text>'+'<br>'+
                '<text style="color: #1ac486;">'+staked_level+'</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>Next Level</text>'+'<br>'+
                '<text style="color: #1ac486;">'+staked_next+' days</text>'+
              '</div>'+
              '<div style="text-align: center;">'+
                '<button class="stake_button" onclick="stake_init('+token_id+')">Stake</button> <button class="unstake_button" onclick="withdraw_init('+token_id+')">Un-stake</button>'+
                '<br>'+'<a href="'+permalink+'" target="_blank"><button class="os_button">View on Opensea</button></a>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';

    // Create Element <--
    frog_doc.appendChild(frog_token);

    // Update Metadata! Build Frog -->
    let metadata = await (await fetch("https://freshfrogs.io/frog/json/"+token_id+".json")).json();

    for (let i = 0; i < metadata.attributes.length; i++) {

      let attribute = metadata.attributes[i]
      loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

    }

  }

  // loadTrait(_trait(family), _attribute(type), _where(element))
  function loadTrait(trait, attribute, where) {

    newAttribute = document.createElement("img");
    newAttribute.alt = attribute

    if (attribute == 'baseballCapWhite' || attribute == 'baseballCapBlue' || attribute == 'baseballCapRed' || attribute == 'tongueSpiderRed' || attribute == 'tongueSpider' || attribute == 'tongue' || attribute == 'tongueFly' || attribute == 'croaking' || attribute == 'peace' || attribute == 'inversedEyes' || attribute == 'closedEyes' || attribute == 'thirdEye' || attribute == 'mask' || attribute == 'smoking' || attribute == 'smokingCigar' || attribute == 'smokingPipe' || attribute == 'circleShadesRed' || attribute == 'circleShadesPurple' || attribute == 'shades' || attribute == 'shadesPurple' || attribute == 'shadesThreeD' || attribute == 'shadesWhite' || attribute == 'circleNightVision') {
      newAttribute.src = "https://freshfrogs.io/the-pond/"+trait+"/animations/"+attribute+"_animation.gif";
    } else {
      newAttribute.src = "https://freshfrogs.io/the-pond/"+trait+"/"+attribute+".png";
    }

    if (trait == 'Trait') {
      newAttribute.className = "frogImg5";

    } else {
      newAttribute.className = "frogImg3";

    }

    document.getElementById(where).appendChild(newAttribute);

  }

  // Print to front page console-output
  function consoleOutput(output, destination) {

    if (! destination) {
      document.getElementById("console-pre").innerHTML = output;
    } else {
      document.getElementById(destination).innerHTML = output;
    }
    
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

  // Numbers to roman numerals
  function romanize (num) {
    if (isNaN(num))
        return NaN;
    var digits = String(+num).split(""),
        key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
               "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
               "","I","II","III","IV","V","VI","VII","VIII","IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
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

    let note_exists = document.getElementById('note_init_'+tokenId)
    if (! note_exists) {

      let new_note = document.createElement('div')
      new_note.id = 'note_init_'+tokenId
      new_note.className = 'mintingTextWhite3'
      document.getElementById('console-pre').appendChild(new_note)

    }

    // Scroll Into View
    scroll_to('pre');

    // Begin Stake Txn
    consoleOutput(
      '<div class="notification-tab">'+
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="noteImg"/><br>'+
        '<div style="width: 100%; vertical-align: middle; margin: auto;">'+
          '<strong>Withdraw Frog #'+tokenId+'</strong>'+'<br>'+
          'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
        '</div>'+
      '</div>', 'note_init_'+tokenId
    );

    // Submit Txn
    let withdraw_txn = await withdraw(tokenId);

    // Begin Withdraw Txn
    // Begin Stake Txn
    consoleOutput(
      '<div class="notification-tab" onclick="remove(this)">'+
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="noteImg"/><br>'+
        '<div style="width: 100%; vertical-align: middle; margin: auto;">'+
          '<strong>Withdraw Frog #'+tokenId+'</strong>'+'<br>'+
          withdraw_txn+
          '<br>'+'<text style="color: #2d3748;">(click to close)</text>'+
        '</div>'+
      '</div>', 'note_init_'+tokenId
    );

  }

  async function stake_init(tokenId) {

    // Scroll Into View
    scroll_to('pre');

    // Check Contract Approval
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});

    // Not Approved
    if (!is_approved) {

      let note_exists = document.getElementById('approval_init_')
      if (! note_exists) {
  
        let new_note = document.createElement('div')
        new_note.id = 'approval_init_'
        new_note.className = 'mintingTextWhite3'
        document.getElementById('console-pre').appendChild(new_note)
  
      }

      consoleOutput(
        '<div style="text-align: left;">'+
          '<strong>Approve Staking</strong><br>This is a one time transaction to allow staking, requires a gas fee.<br>'+
          '<br><strong>Please Read</strong><br>While your Frog is staked, you will not be able to sell it on secondary market places. To do this you will have to un-stake your Frog directly from this site. When a Frog is un-staked the staking level will reset to zero!'+
        '</div>', 'approval_init_'
      );

      // Submit Txn
      let set_approval = await setApprovalForAll();

      if (set_approval !==true) {

        consoleOutput(
          '<div style="text-align: left; display: block; border: none;" class="notification-tab" onclick="remove(this)">'+
            '<strong>Approve Staking</strong><br>This is a one time transaction to allow staking, requires a gas fee.<br>'+
            '<br><strong>Please Read</strong><br>While your Frog is staked, you will not be able to sell it on secondary market places. To do this you will have to un-stake your Frog directly from this site. When a Frog is un-staked the staking level will reset to zero!'+
            '<br><text style="color: lightcoral;">'+set_approval+'</text><br>'+'<text style="color: #2d3748;">(click to close)</text>'+
            '</div>', 'approval_init_'
        );

        // Catch Error
        return

      } else {

        consoleOutput(
          '<div style="text-align: left;" onclick="remove(this)">'+
            '<strong>Approve Staking</strong><br><text style="color: #1ac486;">Staking contract succesfully approved!</text><br>'+
            '<br><strong>Please Read</strong><br>While your Frog is staked, you will not be able to sell it on secondary market places. To do this you will have to un-stake your Frog directly from this site. When a Frog is un-staked the staking level will reset to zero!'+
          '</div>', 'approval_init_'
        );

      }

    }

    let note_exists = document.getElementById('note_init_'+tokenId)
    if (! note_exists) {

      let new_note = document.createElement('div')
      new_note.id = 'note_init_'+tokenId
      new_note.className = 'mintingTextWhite3'
      document.getElementById('console-pre').appendChild(new_note)

    }

    // Begin Stake Txn
    consoleOutput(
      '<div class="notification-tab">'+
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="noteImg"/><br>'+
        '<div style="width: 100%; vertical-align: middle; margin: auto;">'+
          '<strong>Stake Frog #'+tokenId+'</strong>'+'<br>'+
          'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+
        '</div>'+
      '</div>', 'note_init_'+tokenId
    );
    
    // Submit Txn
    let stake_txn = await stake(tokenId);
    
    // Complete
    consoleOutput(
      '<div class="notification-tab" onclick="remove(this)">'+
        '<img src="https://freshfrogs.io/frog/'+tokenId+'.png" class="noteImg"/><br>'+
        '<div style="width: 100%; vertical-align: middle; margin: auto;">'+
          '<strong>Stake Frog #'+tokenId+'</strong>'+'<br>'+
          stake_txn+
          '<br>'+'<text style="color: #2d3748;">(click to close)</text>'+
        '</div>'+
      '</div>', 'note_init_'+tokenId
    );

  }

  function remove(el) {
    var element = el;
    //element.remove();
    element.parentElement.remove()
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
    if (!staked) { return '❌ Frog #'+tokenId+' is not currently staked!'; } 
    if (!approved) { return '❌ Staking contract not approved for token transfer!'; }

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

  /*

    Retrieve staked token's true owner
    stakerAddress(<input> (uint256)) | return staker's address or false

  */

  async function stakerAddress(tokenId) {

    // Call function from controller contract
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

  /*

    Calculate FreshFrogs Rarity
    In House Rarity Ranking

  */

  async function calculate_rarity_ranking() {

    var rarity_ranks_traits =
    {
      "cyanTreeFrog": 106,
      "sand": 197,
      "smokingPipe": 87,
      "treeFrog": 2230,
      "brown": 177,
      "tongueSpider": 75,
      "red": 214,
      "witchBlack": 178,
      "white(2)": 185,
      "blue(2)": 195,
      "tongue": 171,
      "purple": 209,
      "cowboyHatBlack": 171,
      "natural": 187,
      "darkGreen": 176,
      "cowboyHatWhite": 74,
      "orange(2)": 200,
      "stockingCap": 76,
      "white": 205,
      "witchStraw": 78,
      "greenTreeFrog": 99,
      "blue": 204,
      "goldDollarChain": 126,
      "orange": 210,
      "circleGlasses": 84,
      "mask": 80,
      "purpleTreeFrog": 86,
      "goldChain": 184,
      "baseballCapBlue": 89,
      "green": 215,
      "shades": 68,
      "thirdEye": 44,
      "shadesPurple": 77,
      "yellow": 217,
      "baseballCapRed": 68,
      "lightBrownTreeFrog": 108,
      "yellow(2)": 189,
      "red(2)": 229,
      "topHatRed": 78,
      "tomatoFrog": 101,
      "cowboyHatBrown": 132,
      "redEyedTreeFrog": 100,
      "blueTreeFrog": 98,
      "shadesThreeD": 78,
      "witchBrown": 154,
      "shadesWhite": 79,
      "goldenTreeFrog": 73,
      "cyan": 222,
      "circleNightVision": 81,
      "baseballCapWhite": 84,
      "smoking": 78,
      "bandannaRed": 81,
      "circleShadesPurple": 77,
      "stawberryDartFrog": 90,
      "purple(2)": 212,
      "tongueFly": 139,
      "inversedEyes": 44,
      "silverChain": 242,
      "crown": 80,
      "silverEthChain": 78,
      "closedEyes": 46,
      "circleShadesRed": 90,
      "smokingCigar": 74,
      "blueDartFrog": 90,
      "cowboyHatTan": 71,
      "unknown": 97,
      "croaking": 49,
      "topHatBlue": 82,
      "pink": 195,
      "pinkTreeFrog": 94,
      "goldenDartFrog": 97,
      "brownTreeFrog": 107,
      "bandannaBlue": 79,
      "topHatYellow": 79,
      "orangeTreeFrog": 89,
      "tongueSpiderRed": 71,
      "grayTreeFrog": 95,
      "splendidLeafFrog": 78,
      "peace": 19
    }

    var rarity_ranks_tokens = {};

    for (i = 1; i < 4041; i++) {

      console.log(i)

      rarity_ranks_tokens[i] = 100

      let r_metadata = await (await fetch("https://freshfrogs.io/frog/json/"+i+".json")).json();
      for (let j = 0; j < r_metadata.attributes.length; j++) {
  
        // data.trait_type : data.value
        let data = r_metadata.attributes[j]

        if (data.trait_type == 'Frog' && data.value.includes('treeFrog(')) { trait = 'treeFrog' }
        else { trait = data.value}

        let attribute = rarity_ranks_traits[trait]
        let rarity_percentage = attribute / 4040

        rarity_ranks_tokens[i] = rarity_ranks_tokens[i] * rarity_percentage
  
      }

    }

    console.log(rarity_ranks_tokens)

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

      // Base Special Frog AND Sub Special Frog
      if (typeof baseSpecialFrog !== 'undefined' && typeof subSpecialFrog !== 'undefined') {
        subSpecialFrog = baseSpecialFrog+'/SpecialFrog/'+subSpecialFrog;
        subTrait = undefined;
      }

      // Base Special Frog
      else if (typeof subFrog !== 'undefined') {
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