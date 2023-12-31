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


async function fetch_recent_sales(ammount) {

    /*
        Five random secondary sales
        n = 5;
        array = Array.from({ length: 50 }, (v, k) => k * 10); // [0,10,20,30,...,490]
        var shuffled = array.sort(function(){ return 0.5 - Math.random() });
        var selected = shuffled.slice(0,n);
    */
    fetch('https://deep-index.moralis.io/api/v2.2/nft/'+COLLECTION_ADDRESS+'/trades?chain=eth&marketplace=opensea', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {
        var assets = tokens.result
        var shuffled, asset_tokens;
        
        // all
        if (! ammount) { asset_tokens = assets } 
        else { // Random Secondary Sales
            n = 5;
            shuffled = assets.sort(function(){ return 0.5 - Math.random() });
            asset_tokens = shuffled.slice(0,n);
        }

        asset_tokens.forEach((frog) => {
            render_recently_sold(frog)
        })
    })
    .then(async function() { // Load all recent secondary sales
        if (! ammount) { return } 
        break_element = document.createElement('br')
        document.getElementById('frogs').appendChild(break_element)
        loadMore = document.createElement('button')
        loadMore.id = 'loadMore'
        loadMore.className = 'connectButton'
        loadMore.onclick = async function (e) { document.getElementById('frogs').innerHTML = ''; await fetch_recent_sales(); }
        loadMore.innerHTML = '<b>⟳</b> Load More'
        document.getElementById('frogs').appendChild(loadMore)
      })
}

async function fetch_tokens_by_owner(wallet) {
    fetch('https://deep-index.moralis.io/api/v2.2/'+wallet+'/nft?chain=eth&format=decimal&token_addresses%5B0%5D='+COLLECTION_ADDRESS+'&media_items=false', options)
    .then((tokens) => tokens.json())
    .then((tokens) => {
        var assets = tokens.result
        assets.forEach((frog) => {
            var { token_id } = frog
            render_token(frog.token_id);
        }) })
    .then(async function() {
        var staked_tokens_array = await getStakedTokens(wallet);
        for (var i = 0; i < staked_tokens_array.length; i++) {
            token_id = staked_tokens_array[i].tokenId
            render_token(token_id);
        }
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

        if (window.ethereum) {
            await window.ethereum.request({method: 'eth_requestAccounts'});
            web3 = new Web3(window.ethereum);
        } else { return } // No wallet found.

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
        if (wallet_address == "0x97648BB89f2C5335fDeCE9edeEBB8d88FA3D0A38".toLowerCase()  || wallet_address == "0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359".toLowerCase() || wallet_address == "0xF01e067d442f4254cd7c89A5D42d90ad554616E8".toLowerCase() || wallet_address == "0x8Fe45D16694C0C780f4c3aAa6fCa2DDB6E252B25".toLowerCase()) {
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
    var parent_element = document.getElementById('buttonBar');
    //break_element = document.createElement('br')
   // parent_element.appendChild(break_element)

    // Connected Button
    document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']'
    document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); }

    // Mint Button | Mint Tokens
    mintButton = document.createElement('button')
    mintButton.id = 'mintButton'
    mintButton.className = 'connectButton'
    mintButton.onclick = async function (e) { await initiate_mint(); }
    mintButton.innerHTML = '🐸 Mint Frogs'
    parent_element.appendChild(mintButton)

    // Stake Button | Stake tokens
    stkeBtn = document.createElement('button')
    stkeBtn.id = 'stakeButton'
    stkeBtn.className = 'connectButton'
    stkeBtn.onclick = async function (e) { await setApprovalForAll(); }
    stkeBtn.innerHTML = '🌱 Stake & Earn!'
    parent_element.appendChild(stkeBtn)

    // Holdings Button | View holdings
    holdingsLink = document.createElement('a')
    holdingsLink.innerHTML = '<button class="connectButton" id="holdingsButton" >🍃 View Holdings</button>'
    holdingsLink.id = 'holdingsLink'
    holdingsLink.className = 'holdingsLink'
    holdingsLink.href = 'https://freshfrogs.github.io/wallet/'
    parent_element.appendChild(holdingsLink)

    // The Pond | View all staked tokens
    thePondButton = document.createElement('a')
    thePondButton.innerHTML = '<button class="connectButton" id="thePondButton" >🍀 The Pond</button>'
    thePondButton.id = 'thePondLink'
    thePondButton.className = 'thePondButton'
    thePondButton.href = 'https://freshfrogs.github.io/the-pond/'
    parent_element.appendChild(thePondButton)

    /* // The Pond | View all staked tokens
    thePondButton = document.createElement('button')
    thePondButton.id = 'the-pond'
    thePondButton.className = 'connectButton'
    thePondButton.onclick = async function (e) { document.getElementById('frogs').innerHTML = ''; await fetch_tokens_by_owner(CONTROLLER_ADDRESS); }
    thePondButton.innerHTML = ''
    parent_element.appendChild(thePondButton)
    */

}

/* // Get staked token ID's
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
} */

async function initiate_mint() {

    // Token ID input
    var input_quantity = prompt('🐸 FreshFrogsNFT (FROG)\n Total Supply\n'+next_id+' / 4040\n\nMint Price\n'+mint_price+'\n\nMint Limit\n'+mint_limit+'\n\nHow many Frogs would you like to mint? ('+mint_price+'Ξ each + gas fee)') // prompt("Frog #"+next_id+" out of 4,040 is available to mint! \nMint limit of "+mint_limit+" Frogs per wallet! \nHow many Frogs would you like to mint? ("+mint_price+"Ξ each + gas fee)");
    if (input_quantity !== null) {
        mint_quantity = parseInt(input_quantity)
        let mint_txn = await mint(mint_quantity, user_invite);
        alert(mint_txn);
    }

}

async function mint(quantity, invite) {
    if (! invite) { invite = "0x0000000000000000000000000000000000000000000000000000000000000000" }
    try {
        let tokens = await f0.mint(invite, quantity)
        return tokens
    } catch (e) {
        return e.message
    }   
}

/*

    stake(_tokenId (uint256), _user (address)) | send =>

*/

async function initiate_stake(token_id) {

    console.log('this is a 2ND test')

    // Input token_id must be within range and be an integer
    token_id = parseInt(token_id)
    if (Number.isInteger(token_id) == false || token_id > 4040 || token_id < 1) { return 'TRANSACTION FAILED:\n Invalid token ID!'; }

    // Does the user own this token?
    let token_owner = await collection.methods.ownerOf(token_id).call();
    if (token_owner.toLowerCase() !== user_address.toLowerCase()) {
        // Is this token already staked?
        if (token_owner.toLowerCase() == CONTROLLER_ADDRESS.toLowerCase()) {
            return 'TRANSACTION FAILED:\n Token #'+token_id+' is already staked!';
        } else {
            return 'TRANSACTION FAILED:\n Token #'+token_id+' does not belong to user!';
        }
    }

    // Has the user approved the staking contract?
    let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!approved) { alert('Before you can begin staking the contract must be given permission to acess your Frogs. See "🌱 Stake & Earn!" to learn more.'); return; }

    // Passed all requisites. Request user to confirm token ID
    var input = prompt("While tokens are staked, you will not be able to sell them on secondary market places. To do this you will have to un-stake directly from this site. Once a token is un-staked it's staking level will reset to zero!\n"+"\nConfirm the ID of the token you would like to stake.\nToken ID: "+token_id);
    var input_id = parseInt(input)
    if (input !== null) {
        if (input_id !== token_id) {
            alert('TRANSACTION FAILED:\n Token IDs do not match! Please double check and try again!')
            return
        } else {
            // Submit txn for signature
            let stake_txn = await stake(token_id);
            alert(stake_txn);
            return
        }
    } else { return }
}

async function stake(token_id) {
    try {

        // Estimate gas needed for transaction
        var gasprice = await web3.eth.getGasPrice();
        gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
        var gas_estimate = await controller.methods.stake(token_id).estimateGas({ from: user_address }); 
        gas_estimate = Math.round(gas_estimate * 1.05);
        // Send transaction using gas estimate
        var txn = await controller.methods.stake(token_id).send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

        // Transaction Sent
        .on('transactionHash', function(hash){
            return 'TRANSACTION SENT\n Transaction to stake Frog #'+token_id+' has been sent!';
        })

        // Transaction Complete
        .on('receipt', function(receipt){
            console.log(receipt)
            return 'TRANSACTION COMPLETE\nFrog #'+token_id+' has succesfully been staked! :)\nCheck console for receipt details.'
        })

        // Transaction Error
        .on('error', function(error, receipt) {
            console.log(receipt)
            return 'TRANSACTION ERROR\nSomething went wrong when attempting to stake Frog #'+token_id+' :(\nCheck console for receipt details!'
        });

    // Catch Errors
    } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
}

/*

    withdraw(_tokenId (uint256), _user (address)) | send =>

*/

async function initiate_withdraw(token_id) {

    // Input token_id must be within range and be an integer
    token_id = parseInt(token_id)
    if (Number.isInteger(token_id) == false || token_id > 4040 || token_id < 1) { return 'TRANSACTION FAILED:\n Invalid token ID!'; }

    // Is this token currently staked? Does it belond to the user?
    let token_owner = await stakerAddress(token_id);
    if (!token_owner) { return 'TRANSACTION FAILED:\n Token #'+token_id+' is not currently staked!'; } 
    else if (token_owner.toLowerCase() !== user_address.toLowerCase()) { return 'TRANSACTION FAILED:\n Token #'+token_id+' does not belong to user!'; }

    // Has the user approved the staking contract?
    let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!approved) { alert('TRANSACTION FAILED:\n Staking contract is missing approval!'); return; }

    // Passed all requisites. Request user to confirm token ID
    var input = prompt("Un-staking (withdrawing) will return the token to your wallet. Staking level will be reset to zero!\n"+"\nConfirm the ID of the token you would like to withdraw.\nToken ID: "+token_id);
    var input_id = parseInt(input)
    if (input !== null) {
        if (input_id !== token_id) {
            alert('TRANSACTION FAILED:\n Token IDs do not match! Please double check and try again!')
            return
        } else {
            // Submit Txn
            let withdraw_txn = await withdraw(token_id);
            alert(withdraw_txn);
            return
        }
    } else { return }

}

async function withdraw(token_id) {
    try { 

        // Estimate gas needed for transaction
        var gasprice = await web3.eth.getGasPrice();
        gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
        var gas_estimate = await controller.methods.withdraw(token_id).estimateGas({ from: user_address }); 
        gas_estimate = Math.round(gas_estimate * 1.05);

        // Send transaction using gas estimate
        var txn = await controller.methods.withdraw(token_id).send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

        // Transaction sent
        .on('transactionHash', function(hash){
            return 'TRANSACTION SENT\n Transaction to withdraw Frog #'+token_id+' has been sent!';
        })

        // Transction complete
        .on('receipt', function(receipt){
            console.log(receipt)
            return 'TRANSACTION COMPLETE\nFrog #'+token_id+' has succesfully been withdrawn from the staking contract.\nCheck console for receipt details.'
        })

        // Transaction error
        .on('error', function(error, receipt) {
            console.log(receipt)
            return 'TRANSACTION ERROR\nSomething went wrong when attempting to withdraw Frog #'+token_id+' :(\nCheck console for receipt details!'
        });

    // Catch Errors
    } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
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

            // Estimate gas needed for transaction
            var gasprice = await web3.eth.getGasPrice();
            gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
            var gas_estimate = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address }).estimateGas({ from: user_address }); 
            gas_estimate = Math.round(gas_estimate * 1.05);

            // Send transaction using gas estimate
            var txn = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address }).send({ 
                from: user_address, 
                gas: web3.utils.toHex(gas_estimate), 
                gasPrice:  web3.utils.toHex(gasprice),
            })

            // Transaction sent
            .on('transactionHash', function(hash){
                return 'TRANSACTION SENT\n Transaction to approve staking has been sent!';
            })

            // Transction complete
            .on('receipt', function(receipt){
                console.log(receipt)
                return 'TRANSACTION COMPLETE\nYou can now stake your FreshFrog NFTS!'
            })

            // Transaction error
            .on('error', function(error, receipt) {
                console.log(receipt)
                return 'TRANSACTION ERROR\nSomething went wrong when attempting to approve the staking contract. :(\nCheck console for receipt details!'
            });

        // Catch Errors
        } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
    
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
async function render_recently_sold(token) {

    var { token_ids, seller_address, buyer_address, price, block_timestamp } = token
    var token_id = token_ids[0]
    var sale_price = price / 1000000000000000000;
    var timestamp = block_timestamp.substring(0, 10);
    var location = 'frogs'
    var image_link = SOURCE_PATH+'/frog/'+token_id+'.png'
    var token_name = 'Frog #'+token_id

    // Render token information and data
    top_left = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Date</text>'+'<br>'+
            '<text style="color: teal;">'+timestamp+'</text>'+
        '</div>'
    top_right = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Sale Price</text>'+'<br>'+
            '<text id="frog_type" style="color: teal;">'+sale_price+'Ξ</text>'+
        '</div>'
    bottom_left = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Seller</text>'+'<br>'+
            '<text style="color: teal;">'+truncateAddress(seller_address)+'</text>'+
        '</div>'
    bottom_right = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Buyer</text>'+'<br>'+
            '<text style="color: teal;">'+truncateAddress(buyer_address)+'</text>'+
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
                        '<strong><u>'+token_name+'</u></strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                        top_right+
                        top_left+
                        '<br>'+
                        bottom_left+
                        bottom_right+
                    //    button_element+
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
        if (attribute.trait_type == 'SpecialFrog' && attribute.value == 'peace') {

            // get special dna from token id
            randomFrog = Math.round(( token_id / 100 ) / 2.5)
            if (randomFrog < 1) { randomFrog = 0 }
            frogdna = frogArray[randomFrog]
            traitdna = traitArray[randomFrog]
            build_trait('SpecialFrog', 'peace/'+frogdna, 'cont_'+token_id);
            build_trait('Trait', 'SpecialFrog/peace/'+traitdna, 'cont_'+token_id);
        } else {
            build_trait(attribute.trait_type, attribute.value, 'cont_'+token_id);
        }
    }
}
// randomFrog = (( token_id / 100 ) / 2.5) round up
// frogdna = frogArray[randomFrog]
var frogArray = [
    'blueDartFrog',
    'brownTreeFrog',
    'cyanTreeFrog',
    'goldenDartFrog',
    'goldenTreeFrog',
    'greenTreeFrog',
    'lightBrownTreeFrog',
    'orangeTreeFrog',
    'pinkTreeFrog',
    'purpleTreeFrog',
    'redEyedTreeFrog',
    'splendidTreeFrog',
    'stawberryDartFrog',
    'tomatoFrog',
    'unknown'
]

var traitArray = [
    'blue(2)',
    'blue',
    'brown',
    'cyan',
    'green',
    'natural',
    'orange(2)',
    'orange',
    'pink',
    'purple(2)',
    'purple',
    'red(2)',
    'red',
    'sand',
    'white(2)',
    'white',
    'yellow(2)',
    'yellow'
]

// Render NFT token by layered attirubtes obtained through metadata.
async function render_token(token_id) {

    var location = 'frogs'
    var image_link = SOURCE_PATH+'/frog/'+token_id+'.png'
    var token_name = 'Frog #'+token_id
    var token_owner = await collection.methods.ownerOf(token_id).call();
    var staked, staked_status, staked_values, staked_lvl, staked_next_lvl, button_element, progress, progress_element;

    // Staked
    if (token_owner.toLowerCase() == CONTROLLER_ADDRESS.toLowerCase()) {
        staked = 'True'
        staked_status = 'teal'
        token_owner = await stakerAddress(token_id);
        staked_values = await stakingValues(token_id);
        staked_lvl = staked_values[1]
        staked_next_lvl = staked_values[2].toString()+' days'
        progress = (( 41.7 - staked_values[2] ) / 41.7 ) * 100
        progress_element = '<b id="progress"></b><div id="myProgress"><div id="myBar" style="width: '+progress+'% !important;"></div></div>'
        if (token_owner.toLowerCase() == user_address.toLowerCase()) { 
            button_element = // Un-stake button
                '<div style="text-align: center;">'+
                    '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                '</div>';
        } else { button_element = ''; }
    // NOT Staked
    } else {
        progress_element = '';
        staked = 'False';
        staked_status = 'tomato';
        staked_lvl = '--'
        staked_next_lvl = '--'
        if (token_owner.toLowerCase() == user_address.toLowerCase()) { 
            button_element = // Un-stake button
                '<div style="text-align: center;">'+
                    '<button class="stake_button" onclick="initiate_stake('+token_id+')">Stake</button>'+
                '</div>';
        } else { button_element = ''; }
    }

    // Render token information and data
    top_left = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Staked</text>'+'<br>'+
            '<text style="color: '+staked_status+';">'+staked+'</text>'+
        '</div>'
    top_right = 
        '<div style="margin: 8px; float: right; width: 100px;">'+
            '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
            '<text style="color: teal;" id="frog_type">'+truncateAddress(token_owner)+'</text>'+
        '</div>'
    bottom_left = 
    '<div style="margin: 8px; float: right; width: 100px;">'+
        '<text style="color: #1a202c; font-weight: bold;">Next Level</text>'+'<br>'+
        '<text style="color: teal;">'+staked_next_lvl+'</text>'+
    '</div>'
    bottom_right = 
    '<div style="margin: 8px; float: right; width: 100px;">'+
        '<text style="color: #1a202c; font-weight: bold;">Level</text>'+'<br>'+
        '<text style="color: teal;">'+staked_lvl+'</text>'+
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
                    '<div href="https://rarible.com/token/'+COLLECTION_ADDRESS+':'+token_id+'" target="_blank" class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
                        //'<img src="'+image_link+'" class="displayImage"/>'+
                    '</div>'+
                '</div>'+
            '</div>'+
            '<div class="renderRight">'+
                '<div class="innerRight">'+
                    '<div id="traits_'+token_id+'" class="trait_list">'+
                        //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
                        '<strong><u>'+token_name+'</u></strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                        top_right+
                        top_left+
                        '<br>'+
                        bottom_left+
                        bottom_right+
                        progress_element+
                        button_element+
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
        if (attribute.trait_type == 'SpecialFrog' && attribute.value == 'peace') {

            // get special dna from token id
            randomFrog = Math.round(( token_id / 100 ) / 2.5)
            if (randomFrog < 1) { randomFrog = 0 }
            frogdna = frogArray[randomFrog]
            traitdna = traitArray[randomFrog]
            build_trait('SpecialFrog', 'peace/'+frogdna, 'cont_'+token_id);
            build_trait('Trait', 'SpecialFrog/peace/'+traitdna, 'cont_'+token_id);
        } else {
            build_trait(attribute.trait_type, attribute.value, 'cont_'+token_id);
        }
    }
}

/*

    This function will send WRITE transactions to ethereum contracts.
    Estimates gas cost and send to user for approval.

    var gasprice = await web3.eth.getGasPrice();
    gasprice = Math.round(gasprice * 1.2);// to speed up 1.2 times..

    var buyItem = contractInstances.methods.method1(objId)
    var gas_estimate = await buyItem.estimateGas({ from: account })
    gas_estimate = Math.round(gas_estimate * 1.2); 

    buyItem
        .send({
            from: account,
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

*/

// example: send_write_function(collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true))
async function send_write_transaction(contract_method) {
    try {
        var gasprice = await web3.eth.getGasPrice();
        gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
        var gas_estimate = await contract_method.estimateGas({ from: user_address }); 
        gas_estimate = Math.round(gas_estimate * 1.05);
        var txn = await contract_method.send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        }).then(function(hashdata){ 
            console.log(hashdata) 
            return hashdata.message
        })
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
    //'peace',
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
    'brown',
    'silverEthChain',
    'goldDollarChain'
]

// build_trait(_trait(family), _attribute(type), _where(element))
function build_trait(trait_type, attribute, location) {
    newAttribute = document.createElement("img");
    if (trait_type == 'Trait' || trait_type == 'Frog' || trait_type == 'SpecialFrog') { newAttribute.className = "trait_overlay"; } 
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