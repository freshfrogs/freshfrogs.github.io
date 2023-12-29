/* 

    FreshFrogsNFT Ethereum DApp

    This application interacts with contracts on the Ethereum blockchain!
    
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
f0;

const SOURCE_PATH = 'https://freshfrogs.github.io/'
const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';

// Begin connection
async function initiate_web3_connection() {
    if (typeof window.ethereum !== "undefined") {
        document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...'
        await connect().then(function(){ 
            update_frontend();
        })
    } else { // WEB3 browser extenstion could not be found!
        console.log('WEB3 wallet not found!')
    }
}

// Update website UI
function update_frontend() {

    // Prepare HTML Element
    var parent_element = document.getElementById('console');
    break_element = document.createElement('br')
    parent_element.appendChild(break_element)

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

    // Holdings Button | View holdings
    holdingsLink = document.createElement('a')
    holdingsLink.innerHTML = '<button class="connectButton" id="holdingsButton" >🍃 View Holdings</button>'
    holdingsLink.id = 'holdingsLink'
    holdingsLink.className = 'holdingsLink'
    holdingsLink.href = 'https://freshfrogs.github.io/wallet/'
    parent_element.appendChild(holdingsLink)

    // Stake Button | Stake tokens
    stkeBtn = document.createElement('button')
    stkeBtn.id = 'stakeButton'
    stkeBtn.className = 'connectButton'
    stkeBtn.onclick = async function (e) { await Initiate_stake(); }
    stkeBtn.innerHTML = '🌱 Stake & Earn!'
    parent_element.appendChild(stkeBtn)

}

/*

    Connect Function
    Allow users to connect using an ethereum wallet

*/

async function connect(network) {
    if (! network) { network = "main" }
    try { // Connect user account
        
        // Create new WEB3 instance and request accounts from provider
        await ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);

        // Current user address
        user_address = await web3.currentProvider.selectedAddress;

        // Connect ethereum contracts
        collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);
        controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);

        // Recieve tokens held or staked by current user.
        userTokens = await collection.methods.balanceOf(user_address).call();
        userTokensStaked = await stakers(user_address, 'amountStaked')
        unclaimed_rewards = await availableRewards(user_address)
        is_approved = await checkApproval();

        // Factoria API
        f0 = new F0();
        await f0.init({ web3: web3, contract: COLLECTION_ADDRESS, network: network })
        collection_name = await f0.api.name().call();
        collection_symbol = await f0.api.symbol().call();
        next_id = await f0.api.nextId().call();
        next_id = parseInt(next_id);
        user_invites = await f0.myInvites();
        user_keys = Object.keys(user_invites);
        user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";

        // NF7UOS / C7AR Bypass -- Unlimited Free Mints
        if (user_address === "0x97648BB89f2C5335fDeCE9edeEBB8d88FA3D0A38".toLowerCase()  || user_address === "0xCeed98bF7F53f87E6bA701B8FD9d426A2D28b359".toLowerCase() || user_address === "0xF01e067d442f4254cd7c89A5D42d90ad554616E8".toLowerCase() || user_address === "0x8Fe45D16694C0C780f4c3aAa6fCa2DDB6E252B25".toLowerCase()) {
            user_invite = "0x27e18d050c101c6caf9693055d8be1f71d62e8639a2f3b84c75403a667f3e064";
            mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
            mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
        } else { // Public Invite -- 0.01 ETH
            user_invite = "0x0000000000000000000000000000000000000000000000000000000000000000";
            mint_price = JSON.stringify(user_invites[user_invite].condition.converted.eth, user_invite, 1)
            mint_limit = JSON.stringify(user_invites[user_invite].condition.converted.limit, user_invite, 1)
        }

        // DONE!
        // CATCH ERRORS
    } catch (e) {
        console.log(e.message)
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