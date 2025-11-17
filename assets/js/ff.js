
// <-- [Google Analytics]
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-6PB0WKB4SH');
// -- >

/*
  Assign Public Variables
*/

// User Variables

var user_address, user_invites, user_inviteKeys, user_tokens, user_invite;

// Function Variables

var mint_id, opensea_failed;
var mint_price = 0.01;
var mint_quantity = 1;

// Contract Variables

var contract_name, contract_symbol, contract_id, collection, COLLECTION, traits_list;
var CONTRACT_ADDRESS = contract_address = "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b"; // main: 0xBE4Bef8735107db540De269FF82c7dE9ef68C51b | rinkeby: 0xc2203Ff7B9d1c65c8Cf0F6c776f6CF358af3c524
var NETWORK = "main";

/*
  Load web page
*/

document.addEventListener("DOMContentLoaded", async () => {

  const web3 = new Web3(window.ethereum);
  const f0 = new F0();

  COLLECTION = collection = new web3.eth.Contract(token_abi, CONTRACT_ADDRESS);

  fetch_opensea_data();

  try { // Connect

    await f0.init({

      web3: web3,
      contract: CONTRACT_ADDRESS,
      network: NETWORK

    })

    // Assign variables

    user_address = await web3.currentProvider.selectedAddress;
    user_invites = await f0.myInvites();
    user_inviteKeys = Object.keys(user_invites);
    user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";

    user_tokens = await collection.methods.balanceOf(user_address).call();

    contract_name = await f0.api.name().call();
    contract_symbol = await f0.api.symbol().call();
    contract_id = await f0.api.nextId().call();
    mint_id = contract_id = parseInt(contract_id);

    if (opensea_failed){

      display_token(contract_id);
      console.log('Nex token_id : ' + contract_id);

    }

    getInvites();

    console.log('Connected  Smart Contract : '+contract_name+'('+contract_symbol+')');
    console.log('Ethereum : '+contract_address);
    console.log('Connected User : '+user_address);

    // Update minting ui

    // Remove token from minting tray

    document.querySelector("#remove_token").addEventListener("click", async (e) => {
      if (mint_quantity <= 1) {
        return; // Quantity always greater than or equal to 1 AND always less than or equal to 9;
      } else {
        mint_quantity = mint_quantity - 1;
        document.getElementById('mint_total_actual').innerHTML = (mint_price*mint_quantity);
        document.getElementById('mint_quantity_actual').innerHTML = mint_quantity;
      }
    })

    // Add token to minting tray mint_total

    document.querySelector("#add_token").addEventListener("click", async (e) => {
      if (mint_quantity >= 9) {
        return; // Quantity always greater than or equal to 1 AND always less than or equal to 9;
      } else {
        mint_quantity = mint_quantity + 1;
        document.getElementById('mint_total_actual').innerHTML = (mint_price*mint_quantity);
        document.getElementById('mint_quantity_actual').innerHTML = mint_quantity;
      }

      //if (mint_quantity <= (mint_limit - user_tokens)) {
      //} else { console.log('User mint limit reached!'); console.log('Mint Limit '+mint_limit+' : '+user_tokens+' User Tokens'); }

    })

    // Send mint transaction to provider!

    document.querySelector("#mint_total").addEventListener("click", async (e) => {

      console.log('Sending mint transaction!');
      console.log(mint_quantity+' FROGS @ Ξ'+mint_price+' : ['+(mint_price*mint_quantity)+']');
      
      try {
          
        consoleOutput('<br>'+'<strong>Minting ('+mint_quantity+') FROG Tokens...</strong>'+'<br>'+'Please sign the transaction and wait...<br>Do not leave or refresh the page!'+'<p></p>')
        document.getElementById('pre').style.backgroundColor = '#99ffc5'
          
        let tokens = await f0.mint(user_invite, mint_quantity)
        
        // AWAIT RESPONSE!

        consoleOutput('<br><h3 class="h3">Congratulations!</h3> <b>'+mint_quantity+' FROG(s)</b> have successfully been minted! <a class="pointer" href="https://freshfrogs.io/the-pond"><b>View "FROG" Tokens</a></b></div><br>')
        document.getElementById('pre').style.backgroundColor = '#99ffc5'
        return; // BREAK!

      } catch (e) {
          
        // Something went wrong!
        
        consoleOutput('<br><p>'+e.message+'</p><a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>')
        document.getElementById('pre').style.backgroundColor = '#ff99b6'
        return; // BREAK!

      }

    })

  } catch (e) { consoleOutput('<strong></strong><br>'+e.message+'<a href="https://discord.gg/xWMFWgpvd3" target="_blank" class="pointer"><strong><u>Discord #Support</u></strong></a>'); }

})


function consoleOutput(output) {
  document.getElementById("pre").innerHTML = output
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

/*
  Fetch OpenSea collection data
*/

function fetch_opensea_data() {

  const options = {
    method: 'GET',
    headers: {Accept: 'application/json', 'X-API-KEY': '1b80881e422a49d393113ede33c81211'} // 1b80881e422a49d393113ede33c81211
  };

  // Collection variables
  // Trait list and rarities

  fetch('https://api.opensea.io/api/v1/collection/fresh-frogs', options)
  .then(collection => collection.json())
  .then(collection => {

    var { collection: { banner_image_url, created_date, description, dev_seller_fee_basis_points, external_url, featured_image_url, name, payout_address, traits, stats: { floor_price, market_cap, total_volume, count, num_owners } } } = collection

    traits_list = traits;

  })
  .catch(e => {

      console.log('Error: Could not talk to Opensea. (1)');
      console.error('Error : ' + e.message)

  });
  
  // Pull next available token ID prior to web3 connection
  //

  fetch('https://api.opensea.io/api/v1/assets?order_direction=desc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&limit=12&include_orders=false', options)
  .then((assets) => assets.json())
  .then((assets) => {

    var { assets } = assets
    var contract_id = mint_id = parseInt(assets[0].name.replace('Frog #', '')) + 1;

    display_token(contract_id);
    console.log('Nex token_id : ' + contract_id);

  })
  .catch(e => {

    opensea_failed = true;
    console.log('Error: Could not talk to Opensea. (2)');
    console.error('Error : ' + e.message)

  });


  // Get recent sales

  fetch('https://api.opensea.io/api/v1/events?collection_slug=fresh-frogs&event_type=successful&limit=24', options)
  .then(sales => sales.json())
  .then(sales => {

      var { asset_events } = sales

      document.getElementById('recent_mints').innerHTML = '';

      asset_events.forEach((sale) => {
        
        try {

          var { asset: { image_url, name, permalink, token_id, external_link }, payment_token: { decimals }, total_price } = sale;

          // for each recent mint...
          recentMint = document.createElement('img')
          recentMint.src = external_link
          recentMint.className = 'recentMint'

          document.getElementById('recent_mints').appendChild(recentMint);
      
        } catch (e) { console.log('Error : ' + e.message) }

      })

  })
  .catch(e => {

      console.log('Error: Could not get recent sales from Opensea...');
      console.error('Error : ' + e.message)

  })

}

// Check invites
async function getInvites() {

  mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1);
  mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1);

  for (var i = 0; i < 10; i++) { 

    if (user_inviteKeys[i] === "0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064") {

      if (user_address === "0x97648BB89f2C5335fDeCE9edeEBB8d88FA3D0A38".toLowerCase() || user_address === "0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359_0".toLowerCase() || user_address === "0xF01e067d442f4254cd7c89A5D42d90ad554616E8_0".toLowerCase() || user_address === "0x8Fe45D16694C0C780f4c3aAa6fCa2DDB6E252B25".toLowerCase()) {

        user_invite = "0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064";
        mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1);
        mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1);

        break;

      }
    }
  }
  
  document.getElementById('mint_total_actual').innerHTML = (mint_price*mint_quantity);
  consoleOutput('<br>'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(user_address)+' ]</acc><br>'+'Frog #'+mint_id+' is now available to mint!<br>Maximum of <u>'+mint_limit+'</u> Frogs @ Ξ'+mint_price+'<br>'+'<p></p>')

}

// Display Frog
async function display_token(token){

    token_img = 'https://freshfrogs.io/frog/'+token+'.png'
    token_name = 'Frog #'+token

    document.getElementById('thisheader').style.backgroundImage = 'url('+token_img+')';
    document.getElementById('thisheader').style.backgroundSize = "2048px 2048px";
    document.getElementById('previewImg').setAttribute('src', token_img)

    /*
    let token_metadata = await (await fetch("https://freshfrogs.io/frog/json/"+token+".json")).json();
    for (var i = 0; i < token_metadata.attributes.length; i++){
        var data = token_metadata.attributes[i]
        //load_trait(data.trait_type, data.value, 'subDisplay')
        if (data.trait_type == 'Frog' || data.trait_type == 'SpecialFrog') {
          token_type = data.value.slice(0, 11)+'..'
          break;
        }
    }
    */

    document.getElementById('mint_token').innerHTML = '<strong>'+token_name+'</strong>4040 supply'//+token_type;
    document.getElementById('mint_token').removeAttribute('href');

    document.getElementById('mint_total').innerHTML = '<strong>MINT</strong>Ξ<b id="mint_total_actual">'+(mint_price*mint_quantity)+'</b> +gas';
    document.getElementById('mint_total').removeAttribute('href');

    document.getElementById('mint_quantity').innerHTML = '<strong><b id="remove_token">-</b> <b id="mint_quantity_actual">'+mint_quantity+'</b> <b id="add_token">+</b></strong>quantity';
    document.getElementById('mint_quantity').removeAttribute('href');

}
