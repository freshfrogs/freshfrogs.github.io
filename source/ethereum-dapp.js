/* 

    FreshFrogsNFT Ethereum Decentralized Application (DApp)
    This application interacts with WEB3 contracts on the Ethereum blockchain!
    Learn more at https://github.com/freshfrogs

*/

// Public Variables
var controller, 
collection, 
user_address, 
unclaimed_rewards, 
userTokens, 
userTokensStaked, 
is_approved, 
web3, 
f0,
network;

const SOURCE_PATH = 'https://freshfrogs.github.io'
const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'X-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjcyYjJmYWNkLTIzZDUtNDM4NS04ZmE4LTRkN2QxZDJmYTcwMCIsIm9yZ0lkIjoiMzcwMTY1IiwidXNlcklkIjoiMzgwNDMzIiwidHlwZUlkIjoiMjA0MDliMWItNWE3Yi00ZjZlLWI5NjktOWU2OWJiMWY3N2VmIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDM4OTQwMDUsImV4cCI6NDg1OTY1NDAwNX0.NSsiVKVdzHmL_b3eNdbEVzJJ4jNLWIQh5Qd3VZ9O-ko'
    }
  };

async function fetch_tokens_by_owner(wallet) {
    fetch('https://deep-index.moralis.io/api/v2.2/'+wallet+'/nft?chain=eth&format=decimal&token_addresses%5B0%5D='+COLLECTION_ADDRESS+'&media_items=false', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {
        console.log(tokens.result)
        
        var assets = tokens.result
        assets.forEach((frog) => {
            var { token_id } = frog
            render_token(token_id);
        })
        
    })
}

/*

    Connect
    Allow users to connect using an ethereum wallet via web3 browser extension

*/

async function initiate_web3_connection() {
    if (typeof window.ethereum !== "undefined") {
        document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...'
        await connect_user().then( async function(){ update_frontend() });
    } else {
        // WEB3 browser extenstion could not be found!
    }
}

async function connect_user() {
    try {

        // Create new WEB3 instance and request accounts from provider.
        await ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);

        // Current user address
        user_address = await web3.currentProvider.selectedAddress;

        // Factoria API
        // Connect to WEB3 smart contracts
        f0 = new F0();
        await f0.init({ web3: web3, contract: COLLECTION_ADDRESS, network: 'main' })
        await get_user_invites(user_address);
        await connect_functions(user_address);
        
    } catch (e) {
        console.log(e.message)
    }
}

async function connect_functions(wallet_address) {
    try {
        
        // Connect ethereum contracts
        collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);
        controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
        collection_name = await f0.api.name().call();
        collection_symbol = await f0.api.symbol().call();
        next_id = await f0.api.nextId().call();
        next_id = parseInt(next_id);
        total_supply = '4040';

        // User variables. Held and staked tokens, etc.
        userTokens = await collection.methods.balanceOf(user_address).call();
        userTokensStaked = await stakers(user_address, 'amountStaked')
        unclaimed_rewards = await availableRewards(user_address)
        is_approved = await checkApproval();

    } catch (e) {
        console.log(e.message)
    }
}

async function get_user_invites(wallet_address) {
    try {

        user_invites = await f0.myInvites();
        user_keys = Object.keys(user_invites);
        user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";
        if (wallet_address === "0x97648BB89f2C5335fDeCE9edeEBB8d88FA3D0A38".toLowerCase()  || wallet_address === "0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359".toLowerCase() || wallet_address === "0xF01e067d442f4254cd7c89A5D42d90ad554616E8".toLowerCase() || wallet_address === "0x8Fe45D16694C0C780f4c3aAa6fCa2DDB6E252B25".toLowerCase()) {
            // NF7UOS / C7AR Bypass -- Unlimited Free Mints
            user_invite = "0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064";
            mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
            mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
        } else { // Public Invite -- 0.01 ETH
            user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";
            mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
            mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
        }

    } catch (e) {
        console.log(e.message)
    }
}

// Update website UI
async function update_frontend() {

    // Prepare HTML Element
    var parent_element = document.getElementById('console');
    break_element = document.createElement('br')
    parent_element.appendChild(break_element)

    // Connected Button
    document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']'
    document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); }

    /* // Mint Button | Mint Tokens
    mintButton = document.createElement('button')
    mintButton.id = 'mintButton'
    mintButton.className = 'connectButton'
    mintButton.onclick = async function (e) { await initiate_mint(1); }
    mintButton.innerHTML = '🐸 Mint Frogs'
    parent_element.appendChild(mintButton)
    */

    // Holdings Button | View holdings
    holdingsLink = document.createElement('a')
    holdingsLink.innerHTML = '<button class="connectButton" id="holdingsButton" >🍃 View Holdings</button>'
    holdingsLink.id = 'holdingsLink'
    holdingsLink.className = 'holdingsLink'
    holdingsLink.href = 'https://freshfrogs.github.io/wallet/'
    parent_element.appendChild(holdingsLink)

    /* // Stake Button | Stake tokens
    stkeBtn = document.createElement('button')
    stkeBtn.id = 'stakeButton'
    stkeBtn.className = 'connectButton'
    stkeBtn.onclick = async function (e) { await Initiate_stake(); }
    stkeBtn.innerHTML = '🌱 Stake & Earn!'
    parent_element.appendChild(stkeBtn)
    */

    await fetch_tokens_by_owner(CONTROLLER_ADDRESS);

}

// Get staked token ID's
async function held_tokens_by_wallet(wallet_address) {

    // Get ALL staked tokens by default
    if (! wallet_address) {wallet_address = CONTROLLER_ADDRESS}

    // Retrieve all transactions involving the transfer of said tokens
    const eventsReceivedTokens = await collection.getPastEvents("Transfer", {
        filter: {
            to: wallet_address,
        },
        fromBlock: 0,
    });

    // Count the number of times the account received the token
    let receivedTokensCount = {};
    for (let key in eventsReceivedTokens) {
        let tokenId = eventsReceivedTokens[key]["returnValues"]["tokenId"];
        receivedTokensCount[tokenId] = (receivedTokensCount[tokenId] || 0) + 1;
    }

    let receivedTokenIds = Object.keys(receivedTokensCount);

    // Get the tokens that the account sent
    const eventsSentTokens = await collection.getPastEvents("Transfer", {
        filter: {
            from: wallet_address,
            tokenId: receivedTokenIds,
        },
        fromBlock: 0,
    });

    let sentTokensCount = {};
    for (let key in eventsSentTokens) {
        let tokenId = eventsSentTokens[key]["returnValues"]["tokenId"];
        sentTokensCount[tokenId] = (sentTokensCount[tokenId] || 0) + 1;
    }

    // Substract the tokens received by the sent to get the tokens owned by account
    let address_tokens_array = [];
    for (let tokenId in receivedTokensCount) {
        if (
            (sentTokensCount[tokenId] ? sentTokensCount[tokenId] : 0) <
            receivedTokensCount[tokenId]
        ) {
            address_tokens_array.push(tokenId);
        }
    }

    // Return address_tokens_array ->
    return address_tokens_array
}

async function display_wallet_holdings(wallet) {

    console.log('Display Wallet Holdings: ')
    
    // Defaults to return all staked tokens
    let staked_tokens = await held_tokens_by_wallet() 

    // Checks if any staked tokens are owned by by
    for (var token = 0; token < staked_tokens.length; token++) {
        let tokenId = staked_tokens[token];
        let staked_token = await stakerAddress(tokenId);
        if (staked_token.toString().toLowerCase() == wallet.toString().toLowerCase()) {
            console.log('Staked Token: Frog #'+tokenId);
            await render_token(tokenId);
        }
    }

    // Tokens held by wallet
    let held_tokens = await held_tokens_by_wallet(wallet);
    for (var token = 0; token < held_tokens.length; token++) {
        let tokenId = held_tokens[token];
        console.log('Held Token: Frog #'+tokenId);
        await render_token(tokenId);
    }

    console.log(wallet+' :: '+userTokens+' :: '+userTokensStaked);
}

async function community_staked_tokens() {
    // Tokens held by staking contract
    let all_staked_tokens = await held_tokens_by_wallet();
    for (token = 0; token < all_staked_tokens.length; token++) {
        let token_id = all_staked_tokens[token];
        await render_token(token_id);
    }

    console.log('Total Staked Tokens: '+all_staked_tokens.length);
}

/*

    setApproval | set staking contract approval
    checkApproval | check staking contract approval

*/
async function setApprovalForAll() {

    // Check Approval Status
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!is_approved) { 
        try {
            
            // Send Txn
            let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });
            return true;

        // Catch Errors
        } catch (e) { return 'TXN FAILED:\n '+e.message; }
    
    // Already Approved
    } else { return true; }
}

async function checkApproval() {
    // Check Approval Status
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!is_approved) { return false; } // Not Approved
    else { return true; } // Approved
}

// Calculate total time a token has been staked (Hours)
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
        } catch (e) { console.log(e.message); return 0.00; }
    }
}


/*

    Calculate stake values & returns

*/

async function stakingValues(tokenId) {

    stakedTimeHours = await timeStaked(tokenId)
    stakedLevelInt = Math.floor((stakedTimeHours / 1000 )) + 1

    stakedTimeDays = Math.floor(stakedTimeHours / 24)                               // Time Staked
    stakedLevel = romanize(stakedLevelInt)                                          // Staked Level
    stakedNext = Math.round((((stakedLevelInt) * 1000) - stakedTimeHours) / 24)     // Days until next level
    stakedEarned = (stakedTimeHours / 1000).toFixed(3)                              // Flyz Earned

    // [ Time Staked, Staked Level, Next Level, Flyz Earned]
    return [stakedTimeDays, stakedLevel, stakedNext, stakedEarned]

}

/*

    Retrieve staked token's true owner
    stakerAddress(<input> (uint256)) | return staker's address or false

*/

async function stakerAddress(tokenId) {

    let stakerAddress = await controller.methods.stakerAddress(tokenId).call();
    if (stakerAddress !== '0x0000000000000000000000000000000000000000') { return stakerAddress; }
    else { return false; }

}

/*

    Retrieve Available Rewards for User
    availableRewards(_staker (address)) | return uint256

*/

async function availableRewards(userAddress) {

    let available_rewards = await controller.methods.availableRewards(userAddress).call();
    available_rewards = (available_rewards / 1000000000000000000);
    return available_rewards;

}

/*

    Retrieve Tokens Staked by User
    getStakedTokens(_user (address)) | return tuple[]

*/

async function getStakedTokens(userAddress) {

    return await controller.methods.getStakedTokens(userAddress).call();

}

/*  

    stakers(<input> (address), <input> (dataFetch)) | return ( amountStaked, timeOfLastUpdate, unclaimedRewards )

*/  

async function stakers(userAddress, _data) {
    let stakers = await controller.methods.stakers(userAddress).call();         // Call function from within Ethereum smart contract
    if (_data == 'amountStaked') { return stakers.amountStaked }                // Total Tokens Staked by User
    else if (_data == 'timeOfLastUpdate') { return stakers.timeOfLastUpdate }   // Time since Last Update from user
    else if (_data == 'unclaimedRewards') { return stakers.unclaimedRewards }   // Total unclaimed Rewards from User
    else { return }                                                             // Invalid arguments
}

// Render NFT token by layered attirubtes obtained through metadata.
async function render_token(token_id) {

    var location = 'frogs'
    let image_link = SOURCE_PATH+'/frog/'+token_id+'.png'

    // Token Variables
    let token_name = 'Frog #'+token_id
    let token_owner = await collection.methods.ownerOf(token_id).call();

    if (token_owner.toLowerCase() == CONTROLLER_ADDRESS.toLowerCase()) {
        staked = 'True'
        staked_status = 'darkseagreen'
        token_owner = await stakerAddress(token_id);
        staked_values = await stakingValues(token_id);
        staked_lvl = staked_values[1]
        staked_next_lvl = staked_values[2]
    } else {
        staked = 'False';
        staked_status = 'lightsalmon';
        staked_lvl = '-'
        staked_next_lvl = '-'
    }

    // Render token information and data
    top_left = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text>Staked</text>'+'<br>'+
            '<text style="color: '+staked_status+'; font-weight: bold;">'+staked+'</text>'+
        '</div>'
    top_right = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text>Owned By</text>'+'<br>'+
            '<text id="frog_type" style="color: darkseagreen; font-weight: bold;">'+truncateAddress(token_owner)+'</text>'+
        '</div>'
    bottom_left = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text>Level</text>'+'<br>'+
            '<text style="color: darkseagreen; font-weight: bold;">'+staked_lvl+'</text>'+
        '</div>'
    bottom_right = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text>Next Level</text>'+'<br>'+
            '<text style="color: darkseagreen; font-weight: bold;">'+staked_next_lvl+' days</text>'+
        '</div>'

    // <-- Begin Element
    token_doc = document.getElementById(location);
    token_element = document.createElement('div');

    // Element Details -->
    token_element.id = token_name;
    token_element.className = 'display_token';
    token_element.innerHTML = 
        '<div class="display_token_cont">'+
            '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
                '<div class="innerLeft">'+
                    '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
                        //'<img src="'+image_link+'" class="displayImage"/>'+
                    '</div>'+
                '</div>'+
            '</div>'+
            '<div class="renderRight">'+
                '<div class="innerRight">'+
                    '<div id="traits_'+token_id+'" class="trait_list">'+
                        //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
                        '<strong>'+token_name+'</strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                        top_right+
                        top_left+
                        '<br>'+
                        bottom_left+
                        bottom_right+
                    '</div>'+
                '</div>'+
            '</div>'+
        '</div>';

    // Create Element <--
    token_doc.appendChild(token_element);

    // Update Metadata! Build Frog -->
    let metadata = await (await fetch(SOURCE_PATH+'/frog/json/'+token_id+'.json')).json();

    for (let i = 0; i < metadata.attributes.length; i++) {

        let attribute = metadata.attributes[i]
        build_trait(attribute.trait_type, attribute.value, 'cont_'+token_id);

    }

}

/*

    This function will send WRITE transactions to ethereum contracts.
    Estimates gas cost and send to user for approval.

*/

// example: send_write_function(collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true))
async function send_write_function(contract_method) {
    try {
        var gas = contract_method.estimateGas({ from: user_address });
        gas.then(function(gasTouse) { 
            contract_method.send({ 
                from: user_address, 
                gas: gasTouse 
            }).then(function(hashdata){ 
                console.log(hashdata) 
                return hashdata
            }) 
        });
    } catch (e) {
        console.log(e.message);
        return e.message
    }
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

// Shorten ethereum wallet address
function truncateAddress(address) {
    if (!address) { return ""; }
    return `${address.substr(0, 5)}..${address.substr(
        address.length - 5,
        address.length
    )}`;
}

var star_frogs = [
    '',
    '2553'
]
var animated = [
    //'witchStraw',
    //'witchBrown',
    //'witchBlack',
    'blueDartFrog',
    'blueTreeFrog',
    'brownTreeFrog',
    'redEyedTreeFrog',
    'tongueSpiderRed',
    'tongueSpider',
    'tongue',
    'tongueFly',
    'croaking',
    'peace',
    'inversedEyes',
    'closedEyes',
    'thirdEye',
    'mask',
    'smoking',
    'smokingCigar',
    'smokingPipe',
    'circleShadesRed',
    'circleShadesPurple',
    'shades',
    'shadesPurple',
    'shadesThreeD',
    'shadesWhite',
    'circleNightVision',
    //'baseballCapBlue',
    //'baseballCapRed',
    //'baseballCapWhite',
    'yellow',
    'blue(2)',
    'blue',
    'cyan',
    'brown'
]

// build_trait(_trait(family), _attribute(type), _where(element))
function build_trait(trait_type, attribute, location) {
    newAttribute = document.createElement("img");
    if (trait_type == 'Trait') { newAttribute.className = "trait_overlay"; } 
    else { newAttribute.className = "attribute_overlay"; }
    newAttribute.src = SOURCE_PATH+"/frog/build_files/"+trait_type+"/"+attribute+".png";
    for (y = 0; y < animated.length; y++) {
        if (attribute == animated[y]) {
            newAttribute.src = SOURCE_PATH+"/frog/build_files/"+trait_type+"/animations/"+attribute+"_animation.gif";
            break;
        }
    }
    document.getElementById(location).appendChild(newAttribute);
}