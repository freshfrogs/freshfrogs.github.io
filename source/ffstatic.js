    // Fresh Frogs NFT Static Github Pages

    // Global Variables
    const SOURCE_PATH = '../source/base_files/Toadz/'

    var toadA, toadB, toadC;
    var CONTROLLER, controller;
    var COLLECTION, collection;

    const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';

    const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
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

    
    //
    async function Initiate_stake() {

        

        //var num = prompt("What is your favorite number? ");
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
            } catch (e) { return '❌ '+e.message; }
        
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

        // Update Metadata! Build Token -->
        let token_metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+66+'.json')).json();

        document.getElementById('randomLogo').style.backgroundImage = 'url('+'https://freshfrogs.github.io/frog/'+66+'.png'+')';
        document.getElementById('randomLogo').style.backgroundSize = "2048px 2048px";

        for (let r = 0; r < token_metadata.attributes.length; r++) {

            // Build Token Image
            let attribute = token_metadata.attributes[r]
            loadTrait(attribute.trait_type, attribute.value, 'randomLogo');

        }

    }

    // Fetch Collection
    async function fetch_collection() {

        
        toadA = toadB = toadC = '';

        var arr = [];

        while(arr.length < 1){
            var r = Math.floor(Math.random() * 4040) + 1;
            if(arr.indexOf(r) === -1) arr.push(r);
        }

        for (let i = 0; i < arr.length; i++) {

        /*  
        
            if (toadA == '') {
                toadA = arr[i]
            } else if (toadB == '') {
                toadB = arr[i]
            }

        */

            await display_token(arr[i])

        }

        /*
        
        // Third Object

        // Random background
        var r2 = Math.floor(Math.random() * 2222) + 1;

        // <-- Begin Element
        token_doc = document.getElementById('frogs');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = 'Toad';
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="morphResult" class="renderLeft" style="background-image: url('+SOURCE_PATH+'images/'+r2+'.png'+'); background-size: 2048px 2048px;">'+
                '<div class="display_token_img_cont" id="cont_morphResult"></div>'+
            '</div>'

        // Create Element <--
        token_doc.appendChild(token_element);

        morphFrogs(toadA, toadB, 'cont_morphResult');

        */

    }

    /*

        Display Token
        Render NFT Token to UI (collection token)

    */

    async function display_token(token_id) {

        let image_link = 'https://freshfrogs.github.io/frog/'+token_id+'.png'
        let token_name = 'Frog #'+token_id

        // <-- Begin Element
        token_doc = document.getElementById('frogs');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = token_name;
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="'+token_id+'" class="renderLeft">'+
                '<div class="display_token_img_cont" id="cont_'+token_id+'">'+
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
            loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

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

    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute

        if (attribute == 'tongueSpiderRed' || attribute == 'tongueSpider' || attribute == 'tongue' || attribute == 'tongueFly' || attribute == 'croaking' || attribute == 'peace' || attribute == 'inversedEyes' || attribute == 'closedEyes' || attribute == 'thirdEye' || attribute == 'mask' || attribute == 'smoking' || attribute == 'smokingCigar' || attribute == 'smokingPipe' || attribute == 'circleShadesRed' || attribute == 'circleShadesPurple' || attribute == 'shades' || attribute == 'shadesPurple' || attribute == 'shadesThreeD' || attribute == 'shadesWhite' || attribute == 'circleNightVision') {
            newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/animations/"+attribute+"_animation.gif";
        } else {
            newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/"+attribute+".png";
        }

        if (where == 'bigContainer') {
            if (trait == 'Trait') {
                newAttribute.className = "frogImg6";
            } else {
                newAttribute.className = "frogImg4";
            }
        } else {
            if (trait == 'Trait') {
                newAttribute.className = "frogImg5";
            } else {
                newAttribute.className = "frogImg3";
            }
        }

        document.getElementById(where).appendChild(newAttribute);

    }

    /*

        Morph Token(s)
        Combine and Render NFT Tokens

        Token(A) + Token(B) = Token(C)
        Alpha + Bravo = Charlie

    */

    async function morphFrogs(toadAlpha, toadBravo, build_loc) {

        console.log('=-=-=-=-=-=-=-=-=-= Morphing =-=-=-=-=-=-=-=-=-=');
        console.log('= Morphing Tokens Alpha (#'+toadAlpha+') & Bravo ('+toadBravo+')');
        console.log('= Fetching Metadata...'+toadAlpha+'...'+toadBravo+'...');
        console.log('= ');

        // Token (Alpha) Metdata
        let alphaMetadata = {
            "Toad": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Bravo) Metdata
        let bravoMetadata = {
            "Toad": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Charlie) Metdata
        let charlieMetadata = {
            "Toad": "",
            "ToadSubset": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }
        
        document.getElementById(build_loc).innerHTML = '';

        console.log('= TOKEN #'+toadAlpha);
        // Fetch Alpha Metedata ------>
        let metadataRawA = await (await fetch(SOURCE_PATH+'json/'+toadAlpha+".json")).json();
        for (i = 0; i < metadataRawA.attributes.length; i++) {

            let attribute = metadataRawA.attributes[i];

            alphaMetadata[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }

        console.log('= ');
        console.log('= TOKEN #'+toadAlpha);
        // Fetch Bravo Metedata ------>
        let metadataRawB = await (await fetch(SOURCE_PATH+'json/'+toadBravo+".json")).json();
        for (j = 0; j < metadataRawB.attributes.length; j++) {

            let attribute = metadataRawB.attributes[j];
            
            bravoMetadata[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }

        console.log('= ');
        console.log('= Generating New Metadata (Charlie)...');

        // DETERMINE NEW METADATA ------>
        
        // Select Attributes!
        if (alphaMetadata['Toad'] !== '') {charlieMetadata['Toad'] = bravoMetadata['Toad']}
        if (bravoMetadata['Toad'] !== '') {charlieMetadata['ToadSubset'] = alphaMetadata['Toad']}
        console.log('= Toad : '+charlieMetadata['Toad']);
        console.log('= ToadSubset : '+charlieMetadata['ToadSubset']);

        if (bravoMetadata['Trait'] !== '') {charlieMetadata['Trait'] = bravoMetadata['Toad']}
        else if (alphaMetadata['Trait'] !== '') { charlieMetadata['Trait'] = alphaMetadata['Trait']; }
        console.log('= Trait : '+charlieMetadata['Trait']);

        if (alphaMetadata['Accessory'] !== '') { charlieMetadata['Accessory'] = alphaMetadata['Accessory']; }
        else if (bravoMetadata['Accessory'] !== '') { charlieMetadata['Accessory'] = bravoMetadata['Accessory']; }
        console.log('= Accessory : '+charlieMetadata['Accessory']);

        if (alphaMetadata['Eyes'] !== '') { charlieMetadata['Eyes'] = alphaMetadata['Eyes']; }
        else if (bravoMetadata['Eyes'] !== '') { charlieMetadata['Eyes'] = bravoMetadata['Eyes']; }
        console.log('= Eyes : '+charlieMetadata['Eyes']);

        if (alphaMetadata['Hat'] !== '') { charlieMetadata['Hat'] = alphaMetadata['Hat']; }
        else if (bravoMetadata['Hat'] !== '') { charlieMetadata['Hat'] = bravoMetadata['Hat']; }
        console.log('= Hat : '+charlieMetadata['Hat']);

        if (alphaMetadata['Mouth'] !== '') { charlieMetadata['Mouth'] = alphaMetadata['Mouth']; }
        else if (bravoMetadata['Mouth'] !== '') { charlieMetadata['Mouth'] = bravoMetadata['Mouth']; }
        console.log('= Mouth : '+charlieMetadata['Mouth']);

        // BUILD NEW METADATA ------>
        
        // Alpha (UNDERLAY)
        if (charlieMetadata['Toad'] !== '') { loadTrait('Toad', charlieMetadata['Toad'], build_loc); }
        
        // Bravo (OVERLAY)
        if (charlieMetadata['ToadSubset'] !== '') { loadTrait('Toad/subset/v4', charlieMetadata['ToadSubset'], build_loc); }

        // TRAIT(S)
        if (bravoMetadata['Trait'] !== '') { loadTrait('Trait', bravoMetadata['Trait'], build_loc); }
        else if (alphaMetadata['Trait'] !== '') { loadTrait('Trait', alphaMetadata['Trait'], build_loc); }

        // ACCESSORIES
        if (charlieMetadata['Accessory'] !== '') { loadTrait('Accessory', charlieMetadata['Accessory'], build_loc); }
        if (charlieMetadata['Eyes'] !== '') { loadTrait('Eyes', charlieMetadata['Eyes'], build_loc); }
        if (charlieMetadata['Hat'] !== '') { loadTrait('Hat', charlieMetadata['Hat'], build_loc); }
        if (charlieMetadata['Mouth'] !== '') { loadTrait('Mouth', charlieMetadata['Mouth'], build_loc); }

    }


    /*

        connect() | Connect Wallet

    */

    async function connect() {

        if (typeof window.ethereum !== "undefined") {
            console.log('Attempting to connect to web3...')
            try {

                console.log('Requesting accounts...')
                await ethereum.request({ method: "eth_requestAccounts" });
                console.log('Establishing...')
                const web3 = new Web3(window.ethereum);
                //const provider = new ethers.providers.Web3Provider(window.ethereum);

                user_address = await web3.currentProvider.selectedAddress;
                document.getElementById('connectButton').innerHTML = '🟢 Connected - ['+truncateAddress(user_address)+']'
                console.log('Web3 Address found... '+user_address)
                console.log('Connecting to controller.... ..')
                CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
                COLLECTION = collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);

                let unclaimed_rewards = await availableRewards(user_address)

                rwrdsBtn = document.createElement('button')
                rwrdsBtn.className = 'connectButton'
                rwrdsBtn.onclick = async function (e) { let rewards_return = await claimRewards(); panelOutput(rewards_return) }
                rwrdsBtn.innerHTML = '🎁 Unclaimed $FLYZ: '+unclaimed_rewards.toFixed(1)

                stkeBtn = document.createElement('button')
                stkeBtn.className = 'connectButton'
                stkeBtn.onclick = async function (e) { console.log('stake') }
                stkeBtn.innerHTML = '📌 Stake and Earn'

                let is_approved = await checkApproval()

                appvlBtn = document.createElement('button')
                appvlBtn.className = 'connectButton'
                if (! is_approved) {
                    appvlBtn.innerHTML = '❌ Contract Approval'
                    appvlBtn.onclick = async function (e) { await setApprovalForAll(); }
                } else {
                    appvlBtn.innerHTML = '✔️ Contract Approval'
                }

                document.getElementById('console').appendChild(rwrdsBtn)
                document.getElementById('console').appendChild(stkeBtn)
                document.getElementById('console').appendChild(appvlBtn)
                document.getElementById('connectButton').onclick = function (e) { console.log(user_address); }

                await fetch_staked_tokens(user_address);

            } catch (e) {

                console.log(e.message)
                panelOutput(e.message);

            }

        } else {

            console.log('Web3 extension not detected!')
            panelOutput("Don't have a wallet? <a href='https://metamask.io/download/'>Install Metamask</a> 🦊");

        }
    }

    // claimRewards(_user (address)) | send =>
    async function claimRewards() {

        // Check Available Rewards
        let available_rewards = await availableRewards(user_address);
        if (available_rewards > 0) {
            try {

                // Send Txn
                let claimRewards = await controller.methods.claimRewards().send({ from: user_address });
                return '✅ Rewards have succesfully been claimed! ('+available_rewards+' $FLYZ)';
        
            // Catch Errors!
            } catch (e) { return '❌ '+e.message; }
        
        // No Rewards
        } else { return '❌ No rewards available to claim!'; }
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

            console.log('Fetching tokens staked by user: '+staker_address)

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

  async function render_token(token_id) {

    let name = 'Frog #'+token_id
    let token_owner = '';
    let staked_time_days = staked_level = staked_next = staked_earned = '0';

    //let staked = await stakerAddress(token_id)
    let image_link = '../frog/'+token_id+'.png'

    let staking_values = await stakingValues(token_id)
    staked_time_days = staking_values[0]
    staked_level = staking_values[1]
    staked_next = staking_values[2]
    staked_earned = staking_values[3]
    

    // Use Functions?
    button_elements = 
        '<div style="text-align: center;">'+
            '<button class="connectButton" onclick="" style="padding: 6px !important; width: 100%; height: auto;">Un-stake</button>'+
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
                '<text style="color: #1ac486; font-weight: bold;">'+staked_time_days+' days</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>$FLYZ Earned</text>'+'<br>'+
                '<text style="color: #1ac486; font-weight: bold;">'+staked_earned+'</text>'+
              '</div>'+
              '<br>'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Level</text>'+'<br>'+
                '<text style="color: #1ac486; font-weight: bold;">'+staked_level+'</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>Next Level</text>'+'<br>'+
                '<text style="color: #1ac486; font-weight: bold;">'+staked_next+' days</text>'+
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