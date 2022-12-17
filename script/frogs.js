
  // Variables
  var user_address, user_invites, user_keys, user_tokens, user_invite;
  var mint_price, mint_limit, mint_quantity, mint_total;
  var mint_price = mint_total = 0.01;
  var mint_quantity = 1;
  var next_id, traits_list, web3, f0;
  var CONTRACT_ADDRESS, COLLECTION, collection, collection_name, collection_symbol;
  var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
  var NETWORK = 'main';

  const _0x3c6cb7=_0x455b;(function(_0x10c095,_0x4ebf79){const _0x128040=_0x455b,_0x558e9b=_0x10c095();while(!![]){try{const _0x151436=parseInt(_0x128040(0x1ec))/0x1*(parseInt(_0x128040(0x1f1))/0x2)+-parseInt(_0x128040(0x1f6))/0x3*(parseInt(_0x128040(0x1f5))/0x4)+parseInt(_0x128040(0x1f4))/0x5*(parseInt(_0x128040(0x1eb))/0x6)+parseInt(_0x128040(0x1ea))/0x7*(-parseInt(_0x128040(0x1ed))/0x8)+parseInt(_0x128040(0x1f3))/0x9+-parseInt(_0x128040(0x1ef))/0xa*(parseInt(_0x128040(0x1f2))/0xb)+parseInt(_0x128040(0x1f0))/0xc;if(_0x151436===_0x4ebf79)break;else _0x558e9b['push'](_0x558e9b['shift']());}catch(_0x163f3d){_0x558e9b['push'](_0x558e9b['shift']());}}}(_0x46a6,0x6aab1));const options={'method':'GET','headers':{'X-API-KEY':_0x3c6cb7(0x1ee)}};function _0x455b(_0x52da3f,_0x147a14){const _0x46a6d7=_0x46a6();return _0x455b=function(_0x455bdd,_0x1ee73a){_0x455bdd=_0x455bdd-0x1ea;let _0x5885ff=_0x46a6d7[_0x455bdd];return _0x5885ff;},_0x455b(_0x52da3f,_0x147a14);}function _0x46a6(){const _0x2e9797=['188216XwkUNa','1b80881e422a49d393113ede33c81211','5097090qszEib','11422152wzRNKi','1946jfhPGQ','11FRRONZ','1433718usknQF','75575VtUmze','88HamPWj','100911myKlsh','119cKmLbR','264AwALcZ','319AyvMxB'];_0x46a6=function(){return _0x2e9797;};return _0x46a6();}

  // Update UI Display
  async function update_display() {

    console.log('Updated Next ID: '+next_id)
    document.getElementById('supply').innerHTML = (next_id-1)+'/4,040';
    document.getElementById('mintImage').src = '../frog/'+next_id+'.png';
    document.getElementById('button_middle').innerHTML = '<strong>Frog</strong>'+next_id

  }

  // fetch_user_tokens() | address
  async function fetch_user_tokens(fetch_address) {
    if (! fetch_address) { fetch_address = user_address; }

    // No. tokens owned by fetch_address
    let user_tokens = await collection.methods.balanceOf(fetch_address).call();

    document.getElementById('frogs').innerHTML = ''

    if (user_tokens >= 1) {

    // Render tokens Held by Fetch Address
      let pages = parseInt(user_tokens/50) + 1;
      for (var i = 0; i < pages; i++) {

        // Fetch OpenSea Data
        fetch('https://api.opensea.io/api/v1/assets?owner='+fetch_address+'&order_direction=asc&asset_contract_address='+CONTRACT_ADDRESS+'&offset='+(i * 50)+'&limit=50&include_orders=false', options)
        .then((tokens) => tokens.json())
        .then((tokens) => {
          var { assets } = tokens
          assets.forEach((token) => {
            
            render_token(token);

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

    // Does not own atleast one token!
    } else {
      Output('<br>'+'<strong>Connected!</strong> ❌ It seems you do not own any Frogs! <br><hr>'+'<div class="console_pre" id="console-pre"></div>')
      return;

    }
    
  }

  // connect() | Connect Wallet | Update Collection Data
  async function connect() {

    // Connecting
    consoleOutput(
      '<div style="text-align: left;">'+
        'Waiting to connect Ethereum wallet...<br>'+
      '</div>'
    );
    
    console.log('Fetching OpenSea collection data...')

    // Fetch Collection Data via OpenSea API
    fetch('https://api.opensea.io/api/v1/collection/fresh-frogs', options)
    .then(collection => collection.json())
    .then(collection => {

      var { collection: { banner_image_url, created_date, description, dev_seller_fee_basis_points, external_url, featured_image_url, name, payout_address, traits, stats: { floor_price, market_cap, total_volume, count, num_owners } } } = collection
      traits_list = traits;

      next_id = parseInt(count) + 1;

      // Update UI
      update_display();

    })
    .catch(e => {

      console.log('Error: Failed to fetch OpenSea collection data!\n'+e.message);
      
    });

    document.getElementById('quantity+').addEventListener("click", function(e) {

      if (mint_quantity >= 10) { return; }
      else {
        mint_quantity = mint_quantity + 1;
        mint_total = mint_price*mint_quantity;
        document.getElementById('mint_quantity').innerHTML = mint_quantity
        document.getElementById('button_left').innerHTML = '<strong>Mint</strong>'+mint_total.toFixed(3)+'Ξ'
        document.getElementById('mintImage').src = '../frog/'+((next_id+mint_quantity)-1)+'.png'
        document.getElementById('button_middle').innerHTML = '<strong>Frog</strong>'+((next_id+mint_quantity)-1)
      }

    })

    document.getElementById('quantity-').addEventListener("click", function(e) {
      if (mint_quantity <= 1) { return; }
      else {
        mint_quantity = mint_quantity - 1;
        mint_total = mint_price*mint_quantity;
        document.getElementById('mint_quantity').innerHTML = mint_quantity
        document.getElementById('button_left').innerHTML = '<strong>Mint</strong>'+mint_total.toFixed(3)+'Ξ'
        document.getElementById('mintImage').src = '../frog/'+((next_id+mint_quantity)-1)+'.png'
        document.getElementById('button_middle').innerHTML = '<strong>Frog</strong>'+((next_id+mint_quantity)-1)
      }

    })

    // Connect WEB3, Factoria
    console.log('Connecting to Ethereum network...')
    const web3 = new Web3(window.ethereum);
    console.log('Syncing with Factoria...')
    const f0 = new F0();

    console.log('Defining Token ABI...')
    // Connect Collection Smart Contract, Staking Smart Contract
    COLLECTION = collection = new web3.eth.Contract(token_abi, CONTRACT_ADDRESS);

    try { // Attempt to Connect!

      consoleOutput(
        '<div style="text-align: left;">'+
          'Connecting... please wait<br>'+
        '</div>'
      );

      console.log('Initiating...')

      await f0.init({
        web3: web3,
        contract: CONTRACT_ADDRESS,
        network: NETWORK
      })

      console.log('success')

      // User Variables
      user_address = await web3.currentProvider.selectedAddress;
      user_invites = await f0.myInvites();
      user_keys = Object.keys(user_invites);
      user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";
      
      // No. Tokens owned by fetch_address
      user_tokens = await collection.methods.balanceOf(user_address).call();

      // Collection Variables
      collection_name = await f0.api.name().call();
      collection_symbol = await f0.api.symbol().call();
      next_id = await f0.api.nextId().call();
      next_id = parseInt(next_id);

      console.log('Retrieving user invites...')

      // User Invites
      await getInvites();

      // Connected!
      console.log(
        'Connected!\n\n'+
        'User Address: \n'+user_address+'\n\n'+
        collection_name+' ('+collection_symbol+'):\n'+
        CONTRACT_ADDRESS)

      // Update UI
      update_display();

      Output(
        '<div>'+
          '<div class="terminalTop">'+
            '<wallet class="displayUnit">Wallet Address</wallet>'+
            '<br>'+user_address+''+
          '</div>'+
          '<div class="terminalBase">'+
            '<div class="terminalBottom">'+
              '<owned class="displayUnit">Owned</owned>'+
              '<br>'+user_tokens+''+
            '</div>'+
            '<div class="terminalBottom">'+
              '<limit class="displayUnit">Limit</limit>'+
              '<br>'+mint_limit+''+
            '</div>'+
            '<div class="terminalBottom">'+
              '<price class="displayUnit">Price</price>'+
              '<br>'+''+mint_price+'Ξ'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="console_pre" id="console-pre"></div>'
      )

      document.getElementById('button_left').addEventListener("click", async function(e) {

        console.log('Sending mint transaction!\n'+
        mint_quantity+' Tokens @ Ξ'+mint_price+' : ['+(mint_total)+']');

        try {
          consoleOutput(
            '<div style="text-align: left;">'+
              'Minting <b>'+collection_name+'</b> x'+mint_quantity+'<br>'+
              'Please sign the transaction and wait...'+
            '</div>'
          );

          let tokens = await f0.mint(user_invite, mint_quantity);

          consoleOutput(
            '<div style="text-align: left;">'+
              'Congratulations! Tokens successfully minted!<br>'+
            '</div>'
          );

        } catch (e) {
          consoleOutput(
            '<div style="text-align: left;">'+
              'Something went wrong! :(<br>'+e.message+
            '</div>'
          );
        }
        
      })

    } catch (e) { // Something Went Wrong!
      consoleOutput(
        '<div style="text-align: left;">'+
          '❌ Failed to connect Ethereum wallet: '+'<br>'+
          e.message+
        '</div>'
      );
    }
  }

  // Check invites
  async function getInvites() {

    mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1);
    mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1);

    /*
    for (var i = 0; i < 10; i++) { 

      if (user_keys[i] === "0x8998b51794e854975484439f8d12ab4bb845d1378c538343c6014e01017bac31") {

        user_invite = "0x8998b51794e854975484439f8d12ab4bb845d1378c538343c6014e01017bac31";
        mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1);
        mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1);

        break;

      }
    }
    */

  }

  async function fetch_frogs(tokens) {

    // Fetch Collection Data via OpenSea API
    fetch('https://api.opensea.io/api/v1/assets?order_direction=desc&asset_contract_address='+CONTRACT_ADDRESS+'&limit='+tokens+'&include_orders=false', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {
      var { assets } = tokens
      assets.forEach((token) => {
        
        render_token(token);

      })
    })
    .catch(e => {
      console.log('Failed to talk to Opensea.! \n'+e.message);
    });

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

    }

  /*

    Render NFT Token to UI

  */

  async function render_token(token) {

    let opensea_username = ''
    let token_owner = ''

    // Assign token variables from data object
    try { var { token_id, external_link, permalink, name, rarity_data: { rank }, owner: { address, user: { username } } } = token } catch (e) {} // , last_sale: { payment_token: { decimals }, total_price }

    let image_link = '../frog/'+token_id+'.png'
    opensea_username = username

    if (typeof address == 'undefined' || address == '' || address == null) {
      address = await collection.methods.ownerOf(token_id).call();
    }

    if (typeof opensea_username == 'undefined' || opensea_username == '' || opensea_username == null) {
      opensea_username = truncateAddress(address)
    }

    if (typeof name == 'undefined' || name == '' || name == null) {
      name = 'Frog #'+token_id
    }

    // <-- Begin Element
    token_doc = document.getElementById('frogs');
    token_element = document.createElement('div');

    // Element Details -->
    token_element.id = name;
    token_element.className = 'display_token';
    token_element.innerHTML = 
      '<div class="display_token_cont">'+
        '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
          '<div class="innerLeft">'+
            '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="display_token('+token_id+')">'+
              //'<img src="'+image_link+'" class="displayImage"/>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="renderRight">'+
          '<div class="innerRight">'+
            '<div id="traits_'+token_id+'" class="trait_list">'+
              '<b>'+name+'</b>'+'<text style="color: #1a202c; float: right;">'+opensea_username+'</text>'+
            '</div>'+
            '<div id="prop_'+token_id+'" class="properties">'+
              '<div style="text-align: center;">'+
                '<a href="'+permalink+'" target="_blank"><button class="os_button">View on OpenSea</button></a>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';

    // Create Element <--
    token_doc.appendChild(token_element);

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

  // Scroll Into view
  function scroll_to(element) {
    console_pre = document.getElementById(element);
    console_pre.scrollIntoView({behavior: "smooth", block: "end", inline: "start"});
  }

// Coded by NF7UOS