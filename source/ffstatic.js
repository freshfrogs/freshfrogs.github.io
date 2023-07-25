    // Fresh Frogs NFT Static Github Pages

    // Global Variables
    const SOURCE_PATH = '../frog'

    var toadA, toadB, toadC;
    var CONTROLLER, controller;
    var COLLECTION, collection;
    var user_address, unclaimed_rewards, userTokens, userTokensStaked, is_approved;

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
                let stake = await controller.methods.stake(tokenId).send({ from: user_address });
                console.log(stake)
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
        'witchStraw',
        'witchBrown',
        'witchBlack',
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
        'baseballCapBlue',
        'baseballCapRed',
        'baseballCapWhite',
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

            updateMorphDisplay(staker_tokens_array[0].tokenId, staker_tokens_array[0].tokenId)

            let dropdown_a = document.getElementById('token-ids-a');
            let dropdown_b = document.getElementById('token-ids-b');

            dropdown_a.onchange = async function (e) {
                updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-result');
            }
            
            dropdown_b.onchange = async function (e) {
                updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-result');
            }

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
            "specialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Bravo) Metdata
        let metadata_b = {
            "Frog": "",
            "specialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Charlie) Metdata
        let metadata_c = {
            "Frog": "",
            "specialFrog": "",
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
        // Fetch Alpha Metedata ------>
        let metadata_a_raw = await (await fetch(SOURCE_PATH+'/json/'+token_a+".json")).json();
        for (i = 0; i < metadata_a_raw.attributes.length; i++) {

            let attribute = metadata_a_raw.attributes[i];

            metadata_a[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(metadata_a_raw)

        
        console.log('= TOKEN #'+token_b);
        console.log('= ');
        // Fetch Bravo Metedata ------>
        let metadata_b_raw = await (await fetch(SOURCE_PATH+'/json/'+token_b+".json")).json();
        for (j = 0; j < metadata_b_raw.attributes.length; j++) {

            let attribute = metadata_b_raw.attributes[j];
            
            metadata_b[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(metadata_b_raw)

        console.log('= ');
        console.log('= Generating New Metadata (Charlie)...');

        // BUILD NEW METADATA ------>
        
        // Select Attributes!
        if (metadata_a['Frog'] !== '') {metadata_c['Frog'] = metadata_b['Frog']}
        if (metadata_b['Frog'] !== '') {metadata_c['Subset'] = metadata_a['Frog']}
        console.log('= Frog : '+metadata_c['Frog']);
        console.log('= Subset : '+metadata_c['Subset']);

        if (metadata_b['Trait'] !== '') {metadata_c['Trait'] = metadata_b['Frog']}
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

        // BUILD NEW IMAGE ------>
        
        // Alpha (UNDERLAY)
        if (metadata_c['Frog'] !== '') { loadTrait('Frog', metadata_c['Frog'], location); }
        
        // Bravo (OVERLAY)
        if (metadata_c['Subset'] !== '') { loadTrait('Frog/subset', metadata_c['Subset'], location); }

        // TRAIT(S)
        if (metadata_b['Trait'] !== '') { loadTrait('Trait', metadata_b['Trait'], location); }
        else if (metadata_a['Trait'] !== '') { loadTrait('Trait', metadata_a['Trait'], location); }

        // ACCESSORIES
        if (metadata_c['Accessory'] !== '') { loadTrait('Accessory', metadata_c['Accessory'], location); }
        if (metadata_c['Eyes'] !== '') { loadTrait('Eyes', metadata_c['Eyes'], location); }
        if (metadata_c['Hat'] !== '') { loadTrait('Hat', metadata_c['Hat'], location); }
        if (metadata_c['Mouth'] !== '') { loadTrait('Mouth', metadata_c['Mouth'], location); }

    }


    /*

        connect() | Connect Wallet

    */

    async function connect(silent) {

        if (! silent) { silent = false; }

        if (typeof window.ethereum !== "undefined") {
            
            try {

                console.log('Attempting to connect to web3...')
                console.log('Requesting accounts...')

                if (!silent) { document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...' }

                await ethereum.request({ method: "eth_requestAccounts" });

                console.log('Establishing...')

                const web3 = new Web3(window.ethereum);
                //const provider = new ethers.providers.Web3Provider(window.ethereum);

                user_address = await web3.currentProvider.selectedAddress;

                //if (user_address == '0xf01e067d442f4254cd7c89a5d42d90ad554616e8') { fetch_address = '0x9b0a6b63fbe89d3b1a38f102c9356adceed54265'; }

                console.log('Connected Ethereum wallet: \n'+user_address)
                console.log('Connecting to controller contract...')

                CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);

                console.log(CONTROLLER_ADDRESS)
                console.log('Connecting to collection contract...')

                COLLECTION = collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);

                console.log(COLLECTION_ADDRESS)

                // No. Tokens owned by user
                userTokens = await collection.methods.balanceOf(user_address).call();

                console.log('Total tokens currently held by user: ('+userTokens+')')

                // No. Tokens staked by user
                userTokensStaked = await stakers(user_address, 'amountStaked')

                if (!silent) { document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']' }

                unclaimed_rewards = await availableRewards(user_address)

                console.log('Unclaimed staking rewards: '+unclaimed_rewards+' $FLYZ')

                is_approved = await checkApproval();

                console.log('Staking contract approval status: '+is_approved)

                if (!silent) { document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); } }

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

        // Rewards Button | Claim available rewards
        // Create/define document element
        rwrdsBtn = document.createElement('button')
        rwrdsBtn.id = 'rewardsButton'
        rwrdsBtn.className = 'connectButton'
        rwrdsBtn.onclick = async function (e) { let rewards_return = await claimRewards(); alert(rewards_return) }
        rwrdsBtn.innerHTML = '🎁 Rewards: '+unclaimed_rewards.toFixed(1)+' $FLYZ'

        // Append to parent element
        document.getElementById('console').appendChild(rwrdsBtn)

        // Stake Button | Stake tokens
        // Create/define document element
        stkeBtn = document.createElement('button')
        stkeBtn.id = 'stakeButton'
        stkeBtn.className = 'connectButton'
        stkeBtn.onclick = async function (e) { await Initiate_stake(); }
        stkeBtn.innerHTML = '📌 Stake and Earn'

        // Append to parent element
        document.getElementById('console').appendChild(stkeBtn)

        // Staking Contract Approval | Approve staking contract to transfer and recieve tokens
        // Create/define document element
        appvlBtn = document.createElement('button')
        appvlBtn.id = 'approvalButton'
        appvlBtn.className = 'connectButton'
        if (!is_approved) {
            appvlBtn.innerHTML = '❌ Contract Approval'
            appvlBtn.onclick = async function (e) { alert("setApprovalForAll() \nTo start staking, the contract must first be approved. This is a one time transaction that allows the staking contract to recieve and transfer your tokens."); let chkapproval = await setApprovalForAll(); if (chkapproval == true) { document.getElementById('approvalButton').innerHTML = '✔️ Contract Approval'; console.log(chkapproval); } else { alert(chkapproval); } }
        } else {
            appvlBtn.innerHTML = '✔️ Contract Approval'
        }
        
        // Append to parent element
        document.getElementById('console').appendChild(appvlBtn)

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

  async function render_token(token_id, location) {

    if (! location) { location = 'frogs'}

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

    if (location == 'tknaui') {
        button_elements = ''
    } else if (location == 'tkbaui') {

    } else {
        // Use Functions?
        button_elements = 
            '<div style="text-align: center;">'+
                '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                '<a class="" target="_blank" href="https://freshfrogs.github.io/frog/json/'+token_id+'.json"><button class="unstake_button">View Metadata</button></a>'
            '</div>';
    }

    // <-- Begin Element
    token_doc = document.getElementById(location);
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
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_time_days+' days</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>$FLYZ Earned</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_earned+'</text>'+
              '</div>'+
              '<br>'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Level</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_level+'</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>Next Level</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_next+' days</text>'+
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