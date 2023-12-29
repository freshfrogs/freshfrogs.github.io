    // Fresh Frogs NFT Static Github Pages

    // Global Variables
    var toadA, toadB, toadC;
    var CONTROLLER, controller;
    var COLLECTION, collection;
    var user_address, unclaimed_rewards, userTokens, userTokensStaked, is_approved, web3, f0;

    const SOURCE_PATH = 'https://freshfrogs.github.io/frog/'
    const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
    const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';


    async function contract_function_testing() {

        var gas = collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).estimateGas({ from: user_address });
        gas.then(function(gasTouse) { collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address, gas: gasTouse }).then(function(hashdata){ console.log(hashdata) }) });
    }

    // Mint FreshFrogsNFT Token

    async function gas_estimate_testing() {
        collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).estimateGas({gas: 5000000}, function(error, gasAmount){
            console.log(gasAmount)
            if(gasAmount == 5000000)
                console.log('Method ran out of gas');
        });
    }

    async function initiate_mint() {

        // Token ID input
        var mint_quantity = prompt("Frog #"+next_id+" out of 4,040 is available to mint! \nMint limit of "+mint_limit+" Frogs per wallet! \nHow many Frogs would you like to mint? ("+mint_price+"Ξ each + gas fee)");

        // Submit Txn
        let mint_txn = await mint(mint_quantity, user_invite);
        alert(mint_txn);
    
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


    // Render NFT token by layered attirubtes obtained through metadata.
    async function render_token(token_id) {

        var location = 'frogs'

        // Token Variables
        let token_name = 'Frog #'+token_id
        let token_owner = await collection.methods.ownerOf(token_id).call();
        let image_link = SOURCE_PATH+token_id+'.png'

        if (token_owner.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) {
            format = 'staked'
            token_owner = await stakerAddress(token_id);
        } else { format = 'default' }

        // Default format or staked format
        if (format == 'default') {

            // Render token information and data
            top_left = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Owned By</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+truncateAddress(token_owner)+'</text>'+
                '</div>'
            top_right = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Frog Type</text>'+'<br>'+
                    '<text id="frog_type" style="color: darkseagreen; font-weight: bold;">'+'</text>'+
                '</div>'
            bottom_left = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Next Level</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+' days</text>'+
                '</div>'
            bottom_right = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Next Level</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+' days</text>'+
                '</div>'
            
        } else if (format == 'staked') {

            // Staked token data calculations
            let staked_time_days = staked_level = staked_next = staked_earned = '0';
            //let staked = await stakerAddress(token_id)
            let staking_values = await stakingValues(token_id)
            staked_time_days = staking_values[0]
            staked_level = staking_values[1]
            staked_next = staking_values[2]
            staked_earned = staking_values[3]

            // Display token properties
            top_right = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Owned By</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+truncateAddress(token_owner)+'</text>'+
                '</div>'
            bottom_right = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>$FLYZ Earned</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+staked_earned+'</text>'+
                '</div>'
            top_left = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Level</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+staked_level+'</text>'+
                '</div>'
            bottom_left = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text>Next Level</text>'+'<br>'+
                    '<text style="color: darkseagreen; font-weight: bold;">'+staked_next+' days</text>'+
                '</div>'

        }
    
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
        let metadata = await (await fetch(SOURCE_PATH+'json/'+token_id+'.json')).json();
    
        for (let i = 0; i < metadata.attributes.length; i++) {
    
          let attribute = metadata.attributes[i]
          loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);
    
        }
    
    }

    /*

        connect() | Connect Wallet

    */

    async function connect() {

        if (typeof window.ethereum !== "undefined") {

            console.log('- Attempting to connect to web3...')
            console.log('- Requesting Ethereum mainnet...')
            document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...'

            await ethereum.request({ method: "eth_requestAccounts" });
            web3 = new Web3(window.ethereum);
            f0 = new F0();

            try {
                // Attempt to Connect!
                await f0.init({
                    web3: web3,
                    contract: COLLECTION_ADDRESS,
                    network: 'main'
                })

                // Connect Collection Smart Contract, Staking Smart Contract
                CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
                COLLECTION = collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);

                // User Variables
                user_address = await web3.currentProvider.selectedAddress;
                user_invites = await f0.myInvites();
                user_keys = Object.keys(user_invites);
                user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";

                // NF7UOS / C7AR Bypass
                if (user_address === "0x97648BB89f2C5335fDeCE9edeEBB8d88FA3D0A38".toLowerCase()  || user_address === "0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359".toLowerCase() || user_address === "0xF01e067d442f4254cd7c89A5D42d90ad554616E8".toLowerCase() || user_address === "0x8Fe45D16694C0C780f4c3aAa6fCa2DDB6E252B25".toLowerCase()) {
                    // Unlimited Free Mints
                    user_invite = "0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064";
                    mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
                    mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
                } else { // Public Invite
                    user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";
                    mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
                    mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
                }

                userTokens = await collection.methods.balanceOf(user_address).call();
                userTokensStaked = await stakers(user_address, 'amountStaked')
                unclaimed_rewards = await availableRewards(user_address)
                is_approved = await checkApproval();

                // Collection Variables
                collection_name = await f0.api.name().call();
                collection_symbol = await f0.api.symbol().call();
                next_id = await f0.api.nextId().call();
                next_id = parseInt(next_id);

                console.log('=')
                console.log('- Connected Ethereum wallet: \n'+user_address)
                console.log('- Connected to Smart Contract: '+collection_name+' ('+collection_symbol+')')
                console.log('- ERC-721 Standard NFT Collection. Supply ('+next_id+'/4040)')
                console.log(COLLECTION_ADDRESS)
                console.log('=')
                console.log('=')
                console.log('- Connected to Smart Contract: FreshFrogsController')
                console.log(CONTROLLER_ADDRESS)

                document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']'
                document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); }

            } catch (e) {

                console.log(e.message)
                alert('FAILED TO CONNECT\n '+e.message);

            }

        } else {

            console.log('Web3 browser extension not detected!')
            panelOutput("Don't have a wallet? <a href='https://metamask.io/download/'>Install Metamask</a> 🦊");

        }
    }

    /*

        Update website UI options

    */

    async function update_ui_options() {

    /*
        // Rewards Button | Claim available rewards
        // Create/define document element
        rwrdsBtn = document.createElement('button')
        rwrdsBtn.id = 'rewardsButton'
        rwrdsBtn.className = 'connectButton'
        rwrdsBtn.onclick = async function (e) { let rewards_return = await claimRewards(); alert(rewards_return) }
        rwrdsBtn.innerHTML = '🎁 Rewards: '+unclaimed_rewards.toFixed(1)+' $FLYZ' 

        // Append to parent element
        document.getElementById('console').appendChild(rwrdsBtn)
    */

        var parent_element = document.getElementById('console');

        break_element = document.createElement('br')
        parent_element.appendChild(break_element)

        // Mint Button | Mint Tokens
        // Create/define document element
        mintButton = document.createElement('button')
        mintButton.id = 'mintButton'
        mintButton.className = 'connectButton'
        mintButton.onclick = async function (e) { await initiate_mint(); }
        mintButton.innerHTML = '🐸 Mint Frogs'
        // Append to parent element
        parent_element.appendChild(mintButton)

        // Holdings Button | View holdings
        // Create/define document element
        holdingsLink = document.createElement('a')
        holdingsLink.innerHTML = '<button class="connectButton" id="holdingsButton" >🍃 View Holdings</button>'
        holdingsLink.id = 'holdingsLink'
        holdingsLink.className = 'holdingsLink'
        holdingsLink.href = 'https://freshfrogs.github.io/wallet/'
        // Append to parent element
        parent_element.appendChild(holdingsLink)

        // Stake Button | Stake tokens
        // Create/define document element
        stkeBtn = document.createElement('button')
        stkeBtn.id = 'stakeButton'
        stkeBtn.className = 'connectButton'
        stkeBtn.onclick = async function (e) { await Initiate_stake(); }
        stkeBtn.innerHTML = '🌱 Stake & Earn!'
        // Append to parent element
        parent_element.appendChild(stkeBtn)

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

    // Get staked token ID's
    async function held_tokens_by_wallet(account) {

        // Get ALL staked tokens by default
        if (! account) {account = CONTROLLER_ADDRESS}

        // Retrieve all transactions involving the transfer of said tokens
        const eventsReceivedTokens = await collection.getPastEvents("Transfer", {
            filter: {
                to: account,
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
                from: account,
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

    /*
        -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   >
    */

    // Fetch Collection
    async function fetch_collection() {

        var collection_tokens_array = [];

        while(collection_tokens_array.length < 44){
            random_token = Math.floor(Math.random() * 4040) + 1;
            if(collection_tokens_array.indexOf(random_token) === -1) collection_tokens_array.push(random_token);
        }

        for (let i = 0; i < collection_tokens_array.length; i++) {

            token_id = collection_tokens_array[i]
            let name = 'Frog #'+token_id
            let image_link = '/frog/'+token_id+'.png'
        
            // Use Functions?
            button_elements = '' //
                '<div style="text-align: center;">'+
                    '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                    '<a class="" target="_blank" href="https://freshfrogs.github.io/frog/json/'+token_id+'.json"><button class="unstake_button">View Metadata</button></a>'
                '</div>';
        
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
                    '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
                      //'<img src="'+image_link+'" class="displayImage"/>'+
                    '</div>'+
                  '</div>'+
                '</div>'+
                '<div class="renderRight">'+
                  '<div class="innerRight">'+
                    '<div id="traits_'+token_id+'" class="trait_list">'+
                      //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
                      '<strong>'+name+'</strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                      '<div style="margin: 8px; float: left; width: 100px;">'+
                        '<text>Time Staked</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+' days</text>'+
                      '</div>'+
                      '<div style="margin: 8px; float: right; width: 100px;">'+
                        '<text>$FLYZ Earned</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+'</text>'+
                      '</div>'+
                      '<br>'+
                      '<div style="margin: 8px; float: left; width: 100px;">'+
                        '<text>Level</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+'</text>'+
                      '</div>'+
                      '<div style="margin: 8px; float: right; width: 100px;">'+
                        '<text>Next Level</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+' days</text>'+
                      '</div>'+
                      button_elements+
                    '</div>'+
                  '</div>'+
                '</div>'+
              '</div>';
        
            // Create Element <--
            token_doc.appendChild(token_element);
        
            // Update Metadata! Build Frog -->
            let metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_id+".json")).json();
        
            for (let i = 0; i < metadata.attributes.length; i++) {
        
              let attribute = metadata.attributes[i]
              loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);
        
            }

        }

    }

    /*

        stake(_tokenId (uint256), _user (address)) | send =>

    */

    async function Initiate_stake() {

        // Token ID input
        var stakeID = prompt("Please Note: \nWhile tokens are staked, you will not be able to sell them on secondary market places. To do this you will have to un-stake directly from this site. Once a token is un-staked it's staking level will reset to zero!\n"+"\nWhich token would you like to stake?\nToken ID: ");

        // Submit Txn
        let stake_txn = await stake(stakeID);
        alert(stake_txn);
    
    }

    async function stake(tokenId) {

        tokenId = parseInt(tokenId)

        if (Number.isInteger(tokenId) == false || tokenId > 4040 || tokenId < 1) { return 'TXN FAILED:\n Invalid token ID!'; }

        // Check Ownership / Approval Status
        let owner = await collection.methods.ownerOf(tokenId).call();
        let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
        if (!approved) { return 'TXN FAILED:\n Staking contract is missing approval!'; }

        // Valid ownership
        if (owner.toString().toLowerCase() == user_address.toString().toLowerCase()) {
            try {

                // Send Txn
                //let stake = await controller.methods.stake(tokenId).send({ from: user_address });

                var gas = controller.methods.stake(tokenId).estimateGas({ from: user_address });
                gas.then(function(gasTouse) {
                    controller.methods.stake(tokenId).send({ 
                        from: user_address,
                         gas: gasTouse 
                    }).then(function(hashdata){ 
                        console.log(hashdata) 
                    }) 
                });
            
                return 'Token #'+tokenId+' has succesfully been staked!';

            // Catch Errors
            } catch (e) { return 'TXN FAILED:\n '+e.message; }

        // Token already Staked
        } else if (owner.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) {
            return 'TXN FAILED:\n Token #'+tokenId+' is already staked!';
        } 

        // Invalid Ownership
        else { return 'TXN FAILED:\n Token #'+tokenId+' does not belong to user!'; }
    }

    /*

        un-stake (withdraw)

    */

    async function initiate_withdraw(withdrawID) {


        // Submit Txn
        let withdraw_txn = await withdraw(withdrawID);
        alert(withdraw_txn);
    
    }

    // withdraw(_tokenId (uint256), _user (address)) | send =>
    async function withdraw(tokenId) {

        // Check Staked/Approval Status
        let staked = await stakerAddress(tokenId);
        if (!staked) { return 'TXN FAILED:\n Token #'+tokenId+' is not currently staked!'; } 

        // Valid ownership
        else if (staked.toString().toLowerCase() == user_address.toString().toLowerCase()) {
            try {
                
                // Send Txn
                let withdraw = await controller.methods.withdraw(tokenId).send({ from: user_address });
                return 'Token #'+tokenId+' has succesfully been un-staked!';

            // Catch Errors
            } catch (e) { return 'TXN FAILED:\n '+e.message; }

        // Invalid Ownership
        } else { return 'TXN FAILED:\n Token #'+tokenId+' does not belong to user!'; }
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

    async function randomLogo() {

        var range = [3071, 3780, 3130, 608, 1881]
        for (let k = 0; k < range.length; k++) { display_token(range[k]); }

    }

    /*

        Display Token
        Render NFT Token to UI (collection token)

    */

    async function display_token(token_id) {

        let image_link = 'https://freshfrogs.github.io/frog/'+token_id+'.png'
        let token_name = 'Display #'+token_id

        // <-- Begin Element
        token_doc = document.getElementById('randomLogo');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = token_name;
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="display_'+token_id+'" class="renderLeft">'+
                '<div class="display_token_img_cont" id="displayCont_'+token_id+'">'+
                    //'<img src="'+image_link+'" class="displayImage"/>'+
                '</div>'+
            '</div>'

        // Create Element <--
        token_doc.appendChild(token_element);

        // Update Metadata! Build Token -->
        let token_metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+token_id+'.json')).json();

        for (let j = 0; j < token_metadata.attributes.length; j++) {

            // Build Token Image
            let attribute = token_metadata.attributes[j]
            loadTrait(attribute.trait_type, attribute.value, 'displayCont_'+token_id);

        }
        
    }

    // loadTrait(_trait(family), _attribute(type), _where(element))
    /*

    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute
        newAttribute.src = SOURCE_PATH+trait+"/"+attribute+".png";
        newAttribute.className = "frogImg5";
        document.getElementById(where).appendChild(newAttribute);

    }

    */

    let animated = [
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

    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute

        if (where == 'morph-token-display') { newAttribute.style.width = '256px'; newAttribute.style.height = '256px'; }

        if (trait == 'Trait') {
            newAttribute.className = "frogImg5";
        } else {
            newAttribute.className = "frogImg3";
        }

        newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/"+attribute+".png";

        
        for (y = 0; y < animated.length; y++) {
            if (attribute == animated[y]) {
                newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/animations/"+attribute+"_animation.gif";
                break;
            }
        }
        

        document.getElementById(where).appendChild(newAttribute);

    }

    // fetch_staked_tokens() | address
    async function fetch_staked_tokens_raw(staker_address) {

        try {

            if (! staker_address) { staker_address = user_address; }

            let staker_tokens = await stakers(staker_address, 'amountStaked');
            if (staker_tokens >= 1) {

                let staker_tokens_array = await getStakedTokens(staker_address);
                for (var i = 0; i < staker_tokens_array.length; i++) {

                    tokenId = staker_tokens_array[i].tokenId
                    
                    drpdwnoptn = document.createElement('option')
                    drpdwnoptn.value = tokenId
                    drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                    drpdwnoptn.className = 'tokens-dropdown-option';

                    document.getElementById('token-ids-a').appendChild(drpdwnoptn)

                    drpdwnoptn = document.createElement('option')
                    drpdwnoptn.value = tokenId
                    drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                    drpdwnoptn.className = 'tokens-dropdown-option';

                    document.getElementById('token-ids-b').appendChild(drpdwnoptn)

                }

            } else {

                console.log('No tokens currently staked!');

            }
            
        } catch (e) {

            console.log('Something went wrong! \n'+e.message);

        }

    }

    async function updateMorphTokenInfo() {

        let staker_tokens_array = await getStakedTokens(user_address);
        if (staker_tokens_array.length >= 1) {

            for (var i = 0; i < staker_tokens_array.length; i++) {

                tokenId = staker_tokens_array[i].tokenId
                
                // Morph Token A Dropdown Option
                drpdwnoptn = document.createElement('option')
                drpdwnoptn.value = tokenId
                drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                drpdwnoptn.className = 'tokens-dropdown-option';

                document.getElementById('token-ids-a').appendChild(drpdwnoptn)

                // Morph Token B Dropdown Option
                drpdwnoptn = document.createElement('option')
                drpdwnoptn.value = tokenId
                drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                drpdwnoptn.className = 'tokens-dropdown-option';

                document.getElementById('token-ids-b').appendChild(drpdwnoptn)

            }

            //updateMorphDisplay(staker_tokens_array[0].tokenId, staker_tokens_array[1].tokenId)

            let dropdown_a = document.getElementById('token-ids-a');
            let dropdown_b = document.getElementById('token-ids-b');

            dropdown_a.onchange = async function (e) {
                //updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
                document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value
            }
            
            dropdown_b.onchange = async function (e) {
                //updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
                document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value
            }

            morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
            document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value

        } else { alert('Not enough tokens staked to morph!') }
    }

    async function updateMorphDisplay(token_a, token_b) {

        /*
            Morph Token A
            mta-token-name
            mta-time-staked
            mta-flyz-earned
            mta-level
            mta-next-level
        */

        document.getElementById('mta-container').innerHTML = ''

        document.getElementById('mta-token').style.backgroundImage = 'url('+'https://freshfrogs.github.io/frog/'+token_a+'.png'+')';
        document.getElementById('mta-token').style.backgroundSize = "2048px 2048px";

        // Update Metadata! Build Token -->
        let mta_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_a+".json")).json();

        for (let i = 0; i < mta_metadata.attributes.length; i++) {

            let attribute = mta_metadata.attributes[i]
            loadTrait(attribute.trait_type, attribute.value, 'mta-container');

        }

        mtaTokenName = document.getElementById('mta-token-name')
        mtaTimeStaked = document.getElementById('mta-time-staked')
        mtaFlyzEarned = document.getElementById('mta-flyz-earned')
        mtaLevel = document.getElementById('mta-level')
        mtaNextLevel = document.getElementById('mta-next-level')

        /*
        mtaTimeStaked.innerHTML = ''
        mtaFlyzEarned.innerHTML = ''
        mtaLevel.innerHTML = ''
        mtaNextLevel.innerHTML = ''
        */

        let mtaStakingData = await stakingValues(token_a)
        //[ Time Staked, Staked Level, Next Level, Flyz Earned]

        mtaTokenName.innerHTML = 'Frog #'+token_a
        mtaTimeStaked.innerHTML = mtaStakingData[0]
        mtaFlyzEarned.innerHTML = mtaStakingData[3]
        mtaLevel.innerHTML = mtaStakingData[1]
        mtaNextLevel.innerHTML = mtaStakingData[2]

        /*
            Morph Token B
            mtb-token-name
            mtb-time-staked
            mtb-flyz-earned
            mtb-level
            mtb-next-level
        */

        document.getElementById('mtb-container').innerHTML = ''
        document.getElementById('mtb-token').style.backgroundImage = 'url('+'https://freshfrogs.github.io/frog/'+token_b+'.png'+')';
        document.getElementById('mtb-token').style.backgroundSize = "2048px 2048px";
       
        // Update Metadata! Build Token -->
        let mtb_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_b+".json")).json();

        for (let i = 0; i < mtb_metadata.attributes.length; i++) {

            let attribute = mtb_metadata.attributes[i]
            loadTrait(attribute.trait_type, attribute.value, 'mtb-container');

        }

        mtbTokenName = document.getElementById('mtb-token-name')
        mtbTimeStaked = document.getElementById('mtb-time-staked')
        mtbFlyzEarned = document.getElementById('mtb-flyz-earned')
        mtbLevel = document.getElementById('mtb-level')
        mtbNextLevel = document.getElementById('mtb-next-level')

        /*
        mtbTimeStaked.innerHTML = ''
        mtbFlyzEarned.innerHTML = ''
        mtbLevel.innerHTML = ''
        mtbNextLevel.innerHTML = ''
        */

        let mtbStakingData = await stakingValues(token_b)
        //[ Time Staked, Staked Level, Next Level, Flyz Earned]

        mtbTokenName.innerHTML = 'Frog #'+token_b
        mtbTimeStaked.innerHTML = mtbStakingData[0]
        mtbFlyzEarned.innerHTML = mtbStakingData[3]
        mtbLevel.innerHTML = mtbStakingData[1]
        mtbNextLevel.innerHTML = mtbStakingData[2]

    }

    /*

        Morph Token(s)
        Combine and Render NFT Tokens

        Token(A) + Token(B) = Token(C)
        Alpha + Bravo = Charlie

    */

    async function morph(token_a, token_b, location) {

        console.log('=-=-=-=-=-=-=-=-=-= Morphing =-=-=-=-=-=-=-=-=-=');
        console.log('= Morphing Tokens Alpha (#'+token_a+') & Bravo (#'+token_b+')');
        console.log('= Fetching Metadata...');
        console.log('= ');

        // Token (Alpha) Metdata
        let metadata_a = {
            "Frog": "",
            "SpecialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Bravo) Metdata
        let metadata_b = {
            "Frog": "",
            "SpecialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Charlie) Metdata
        let metadata_c = {
            "Frog": "",
            "SpecialFrog": "",
            "Subset": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }
        
        document.getElementById(location).innerHTML = '';
        
        console.log('= TOKEN #'+token_a);
        console.log('= ');
        // Fetch Alpha Metadata ------>
        let metadata_a_raw = await (await fetch(SOURCE_PATH+'json/'+token_a+".json")).json();
        for (i = 0; i < metadata_a_raw.attributes.length; i++) {

            let attribute = metadata_a_raw.attributes[i];

            metadata_a[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(JSON.stringify(metadata_a_raw.attributes, null, 4))

        console.log('= ');
        console.log('= TOKEN #'+token_b);
        console.log('= ');
        // Fetch Bravo Metadata ------>
        let metadata_b_raw = await (await fetch(SOURCE_PATH+'json/'+token_b+".json")).json();
        for (j = 0; j < metadata_b_raw.attributes.length; j++) {

            let attribute = metadata_b_raw.attributes[j];
            
            metadata_b[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(JSON.stringify(metadata_b_raw.attributes, null, "\t"))

        console.log('= ');
        console.log('= Generating New Metadata (Charlie)...');
        console.log('= ');

        // BUILD NEW METADATA ------>

        // Special Frogs
        if (metadata_a['SpecialFrog'] !== '' || metadata_b['SpecialFrog'] !== '') {

            // Base Special Frog AND Sub Special Frog
            if (metadata_a['SpecialFrog'] !== '' && metadata_b['SpecialFrog'] !== '') {
                metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/SpecialFrog/'+metadata_b['SpecialFrog'];
                metadata_b['Trait'] = '';
            }
    
            // Base Special Frog
            else if (metadata_b['Frog'] !== '') {
                metadata_b['Trait'] = 'SpecialFrog/'+metadata_a['SpecialFrog']+'/'+metadata_b['Trait'];
                metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/'+metadata_b['Frog'];
                metadata_b['Frog'] = '';
            }
    
            // Sub Special Frog
            else if (metadata_a['Frog'] !== '') {
                metadata_b['Trait'] = 'SpecialFrog/'+metadata_b['SpecialFrog']+'/'+metadata_a['Trait'];
                metadata_a['SpecialFrog'] = metadata_b['SpecialFrog'];
                metadata_b['SpecialFrog'] = metadata_b['SpecialFrog']+'/'+metadata_a['Frog'];
                metadata_a['Frog'] = '';
            }
    
        }
        
        // Select Attributes!
        if (metadata_a['Frog'] !== '') {metadata_c['Frog'] = metadata_b['Frog']}
        else if (metadata_a['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = '/bottom/'+metadata_a['SpecialFrog']; }

        if (metadata_b['Frog'] !== '') {metadata_c['Subset'] = metadata_a['Frog']}
        else if (metadata_b['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = metadata_b['SpecialFrog'] }

        console.log('= Frog : '+metadata_c['Frog']);
        console.log('= SpecialFrog : '+metadata_c['SpecialFrog']);
        console.log('= Subset : '+metadata_c['Subset']);

        if (metadata_b['Trait'] !== '') {metadata_c['Trait'] = metadata_b['Trait']}
        else if (metadata_a['Trait'] !== '') { metadata_c['Trait'] = metadata_a['Trait']; }
        console.log('= Trait : '+metadata_c['Trait']);

        if (metadata_a['Accessory'] !== '') { metadata_c['Accessory'] = metadata_a['Accessory']; }
        else if (metadata_b['Accessory'] !== '') { metadata_c['Accessory'] = metadata_b['Accessory']; }
        console.log('= Accessory : '+metadata_c['Accessory']);

        if (metadata_a['Eyes'] !== '') { metadata_c['Eyes'] = metadata_a['Eyes']; }
        else if (metadata_b['Eyes'] !== '') { metadata_c['Eyes'] = metadata_b['Eyes']; }
        console.log('= Eyes : '+metadata_c['Eyes']);

        if (metadata_a['Hat'] !== '') { metadata_c['Hat'] = metadata_a['Hat']; }
        else if (metadata_b['Hat'] !== '') { metadata_c['Hat'] = metadata_b['Hat']; }
        console.log('= Hat : '+metadata_c['Hat']);

        if (metadata_a['Mouth'] !== '') { metadata_c['Mouth'] = metadata_a['Mouth']; }
        else if (metadata_b['Mouth'] !== '') { metadata_c['Mouth'] = metadata_b['Mouth']; }
        console.log('= Mouth : '+metadata_c['Mouth']);

        // CREATE NEW JSON ELEMENT

        var morophMetadataJsonString = '{"attributes":[]}'; // {"trait_type":"Frog","value":"blueDartFrog"}
        var morophMetadataJsonObject = JSON.parse(morophMetadataJsonString);
        
        // BUILD NEW IMAGE ------>
        
        // FROG A
        if (metadata_c['Frog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Frog","value":metadata_c['Frog']}); loadTrait('Frog', metadata_c['Frog'], location); }
        
        // SPECIALFROG
        else if (metadata_c['SpecialFrog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"SpecialFrog","value":metadata_c['SpecialFrog']}); loadTrait('SpecialFrog', metadata_c['SpecialFrog'], location); }
        
        // FROG B (SUBSET)
        if (metadata_c['Subset'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Subset","value":metadata_c['Subset']}); loadTrait('Frog/subset', metadata_c['Subset'], location); }

        // TRAIT
        if (metadata_c['Trait'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Trait","value":metadata_c['Trait']}); loadTrait('Trait', metadata_c['Trait'], location); }

        // ACCESSORY
        if (metadata_c['Accessory'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Accessory","value":metadata_c['Accessory']}); loadTrait('Accessory', metadata_c['Accessory'], location); }
        
        // EYES
        if (metadata_c['Eyes'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Eyes","value":metadata_c['Eyes']}); loadTrait('Eyes', metadata_c['Eyes'], location); }
        
        // HAT
        if (metadata_c['Hat'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Hat","value":metadata_c['Hat']}); loadTrait('Hat', metadata_c['Hat'], location); }
        
        // MOUTH
        if (metadata_c['Mouth'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Mouth","value":metadata_c['Mouth']}); loadTrait('Mouth', metadata_c['Mouth'], location); }

        morophMetadataJsonString = JSON.stringify(morophMetadataJsonObject.attributes, null, 4);
        //console.log(morophMetadataJsonString)

        console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=')
        console.log(morophMetadataJsonString)

        document.getElementById('morph-json').innerHTML = morophMetadataJsonString

    }

    // claimRewards(_user (address)) | send =>
    async function claimRewards() {

        // Check Available Rewards
        let available_rewards = await availableRewards(user_address);
        if (available_rewards > 0) {
            try {

                // Send Txn
                let claimRewards = await controller.methods.claimRewards().send({ from: user_address });
                return 'Rewards have succesfully been claimed! ('+available_rewards+' $FLYZ)';
        
            // Catch Errors!
            } catch (e) { return 'TXN FAILED:\n '+e.message; }
        
        // No Rewards
        } else { return 'TXN FAILED:\n No rewards available to claim!'; }
    }

    // Shorten Address
    function truncateAddress(address) {
        if (!address) { return ""; }
        return `${address.substr(0, 5)}..${address.substr(
            address.length - 5,
            address.length
        )}`;
    }

    // Print to front page console-output
    function panelOutput(output, destination) {

        //output_text = document.createElement('text');
        //output_text.innerHTML = '\n'+output

        document.getElementById("outputPanel").innerHTML = output;

        
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

    // fetch_staked_tokens() | address
    async function fetch_staked_tokens(staker_address) {

        try { // Fetch staked token data

            // Default to current user's address
            if (! staker_address) { staker_address = user_address; }

            // No. Tokens owned by staker_address
            let staker_tokens = await stakers(staker_address, 'amountStaked');

            console.log('Total tokens currently staked by user: '+staker_tokens)

            // Available Rewards
            let staker_rewards = await availableRewards(staker_address);
            staker_rewards = String(staker_rewards).slice(0, 6);

            console.log('Rewards available to user ($FLYZ): '+staker_rewards)

            // Render Frogs Staked by User
            if (staker_tokens >= 1) {

                console.log('Fetching staked tokens....')
                document.getElementById('frogs').innerHTML = '';
                let staker_tokens_array = await getStakedTokens(staker_address);

                for (var i = 0; i < staker_tokens_array.length; i++) {

                    tokenId = staker_tokens_array[i].tokenId
                    //console.log('Staked Token Found: #'+tokenId)
                    render_token(tokenId)

                }

            }
            
        } catch (e) {

            console.log('Something went wrong! \n'+e.message);

        }

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

    /*


        HTML


        <img src="https://freshfrogs.github.io/source/blackWhite.png" class="clogo"/>

        <a style="color: initial; margin: 0px !important; width: fit-content; height: auto; display: initial;" href="https://rarible.com/fresh-frogs"><button id="raribleButton" class="connectButton">Browse on Rarible</button></a>






    */