/* 

    FreshFrogsNFT Ethereum Decentralized Application (DApp)
    This application interacts with WEB3 contracts on the Ethereum blockchain!
    Learn more at https://github.com/freshfrogs

*/

// Public Variables
var controller, collection, 
user_address, user_rewards, 
user_tokenBalance, user_stakedBalance, 
is_approved, web3, f0, network, eth_usd, next;

var sales_volume_eth = 0;
var sales_volume_usd = 0;
var net_income_usd = 0;
var mint_volume_eth = 0;
var mint_volume_usd = 0;

var frogArray = [
    'blueDartFrog',
    'blueTreeFrog',
    'brownTreeFrog',
    'cyanTreeFrog',
    'goldenDartFrog',
    'goldenTreeFrog',
    'grayTreeFrog',
    'greenTreeFrog',
    'lightBrownTreeFrog',
    'orangeTreeFrog',
    'pinkTreeFrog',
    'purpleTreeFrog',
    'redEyedTreeFrog',
    'splendidLeafFrog',
    'stawverryDartFrog',
    'tomatoFrog',
    'treeFrog(1)',
    'treeFrog(2)',
    'treeFrog(3)',
    'treeFrog(4)',
    'treeFrog(5)',
    'treeFrog(6)',
    'treeFrog(7)',
    'treeFrog(8)',
    'unknown'
]

var traitArray = [
    'blue(2)',
    'blue',
    'brown',
    'cyan',
    'darkGreen',
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

var animated = [
    //'witchStraw',
    //'witchBrown',
    //'witchBlack',
    //'blueDartFrog',
    //'blueTreeFrog',
    //'brownTreeFrog',
    //'redEyedTreeFrog',
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

// Constants
const SOURCE_PATH = 'https://freshfrogs.github.io'
const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
const options = {method: 'GET', headers: {accept: '*/*', 'x-api-key': frog_api}};

/*

    Fetch NFT token sales (initial & secondary) using Reservoir API. Returns => Object

*/
async function fetch_token_sales(contract, limit, next_string) {
    if (! contract) { contract = COLLECTION_ADDRESS; }
    if (! limit) { limit = '50'; }
    if (! next_string) { next = ''; } else { next = '&continuation='+next_string; }
    fetch('https://api.reservoir.tools/sales/v5?collection=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b?sortBy=price&sortDirection=desc&limit='+limit+next+'', options)
    .then((data) => data.json())
    .then((data) => {
        console.log(data)
        render_token_sales(contract, data.sales);
        if (! data.continuation) { return }
        else { sales_load_button(contract, limit, data.continuation); }
    })
    .catch(err => console.error(err));
}

/*

    Fetch NFT tokens held by user using Reservoir API. Returns => Object

*/
async function fetch_held_tokens(wallet, limit, next_string) {
    if (! wallet) { wallet = user_address}
    if (! limit) { limit = '50'; }
    if (! next_string) { next = ''; } else { next = '&continuation='+next_string; }
    fetch('https://api.reservoir.tools/users/'+wallet+'/tokens/v8?collection='+COLLECTION_ADDRESS+'&limit='+limit+next, options)
    .then((data) => data.json())
    .then((data) => {
        console.log(wallet+', '+data.tokens);
        render_held_tokens(wallet, data.tokens);
        if (wallet == CONTROLLER_ADDRESS) {
            update_staked_tokens(data.tokens)
        }
        if (! data.continuation) { return }
        else { load_more_button(wallet, limit, data.continuation); }
    })
    .catch(err => console.error(err));
}

/*

    Update NFT token staking information for rendered html objects

*/
async function update_staked_tokens(tokens) {
    tokens.forEach(async (token) => {
        var { token: { tokenId } } = token
        let owner = await stakerAddress(tokenId);
        let staked_values = await stakingValues(tokenId);
        var staked_lvl = staked_values[1]
        var staked_next_lvl = staked_values[2].toString()+' days'
        var progress = (( 41.7 - staked_values[2] ) / 41.7 ) * 100
        var progress_element = '';//'<b id="progress"></b><div id="myProgress"><div id="myBar" style="width: '+progress+'% !important;"></div></div>'
        if (owner.toLowerCase() == user_address.toLowerCase()) { 
            button_element = // Un-stake button
                '<div style="text-align: center;">'+
                    '<button class="unstake_button" onclick="initiate_withdraw('+tokenId+')">Un-stake</button>'+
                    '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId+'" target="_blank"><button class="opensea_button">OpenSea</button></a>'+
                '</div>';
        } else {
            button_element =
                '<div style="text-align: center;">'+
                    '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId+'" target="_blank"><button class="opensea_button">OpenSea</button></a>'+
                '</div>';
        }
        document.getElementById('prop_'+'Frog #'+tokenId).innerHTML = 
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Staked</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">True</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;" id="frog_type">'+truncateAddress(owner)+'</text>'+
            '</div>'+
            '<br>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Next Level</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">'+staked_next_lvl+'</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Level</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">'+staked_lvl+'</text>'+
            '</div>'+
            progress_element+
            button_element;
    })
}

/*

    Create html objects for token sales from fetch_token_sales()

*/
async function render_token_sales(contract, sales) {
    sales.forEach(async (token) => {
        console.log(token);
        var { createdAt, from, to, token: { tokenId }, price: { amount: { decimal, usd } }, txHash } = token
        var sale_date = createdAt.substring(0, 10);
        if (from !== '0x0000000000000000000000000000000000000000') {
            txn_string = 'sale'; from = truncateAddress(from)
            net_income_usd = net_income_usd + (Number(usd))*0.025
            sales_volume_eth = sales_volume_eth + Number(decimal);
            sales_volume_usd = sales_volume_usd + Number(usd);
        } else {
            txn_string = 'mint'; from = 'FreshFrogsNFT';
            net_income_usd = net_income_usd + Number(usd)
            mint_volume_eth = mint_volume_eth + Number(decimal);
            mint_volume_usd = mint_volume_usd + Number(usd);
        }
        var html_elements = 
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Date</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">'+sale_date+'</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Last Sale</text>'+'<br>'+
                '<text id="frog_type" style="color: teal; font-weight: bold !important;">'+decimal+'Ξ '+'</text>'+'<text id="usd_price" class="usd_price">$'+usd.toFixed(2)+'</text>'+
            '</div>'+
            '<br>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Seller</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">'+from+'</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">'+truncateAddress(to)+'</text>'+
            '</div>'
        //if (txn_string == 'sale') {
            await build_token(html_elements, tokenId, tokenId+':'+createdAt, txn_string, txHash);
        //}
    })
    console.log('\nSales Volume:'+
        '\n - - -> '+ sales_volume_eth.toFixed(2)+' ETH'+
        '\n - - -> $'+ sales_volume_usd.toFixed(2)+''
    );
    console.log('\nMint Volume:'+
        '\n - - -> '+ mint_volume_eth.toFixed(2)+' ETH'+
        '\n - - -> $'+ mint_volume_usd.toFixed(2)+''+
        '\n - - -> Net: $'+net_income_usd.toFixed(2)
    );
}

/*

    Create html objects for user tokens from fetch_held_tokens()

*/
async function render_held_tokens(wallet, tokens) {
    console.log(wallet)
    console.log(tokens)
    tokens.forEach(async (token) => {
        var { token: { tokenId } } = token
        if (wallet.toLowerCase() == user_address.toLowerCase()) { 
            button_element = // Stake button
                '<div style="text-align: center;">'+
                    '<button class="stake_button" onclick="initiate_stake('+tokenId+')">Stake</button>'+
                    '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId+'" target="_blank"><button class="opensea_button">Opensea</button></a>'+
                '</div>';
        } else {
            button_element = 
                '<div style="text-align: center;">'+
                    '<a href="https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId+'" target="_blank"><button class="etherscan_button">Etherscan</button></a>'+
                    '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+tokenId+'" target="_blank"><button class="opensea_button">Opensea</button></a>'+
                '</div>';
        }
        var html_elements = 
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Staked</text>'+'<br>'+
                '<text style="color: tomato; font-weight: bold;">False</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;" id="frog_type">'+truncateAddress(wallet)+'</text>'+
            '</div>'+
            '<br>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Next Level</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">--</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Level</text>'+'<br>'+
                '<text style="color: teal; font-weight: bold;">--</text>'+
            '</div>'+
            button_element;
        await build_token(html_elements, tokenId);
    }).catch((e) => {
        console.log(e.message)
    })
}

/*

    Load more sales -- html button (front page)

*/
async function sales_load_button(contract, limit, next_string) {
    if (next_string !== null && next_string !== '' && next_string !== 'undefined') {
        break_element = document.createElement('br')
        break_element.id = 'tempBreak'
        document.getElementById('frogs').appendChild(break_element)
        loadMore = document.createElement('button')
        loadMore.id = 'loadMore'
        loadMore.className = 'loadmore_button'
        loadMore.onclick = async function(){ document.getElementById('loadMore').remove(); document.getElementById('tempBreak').remove(); await fetch_token_sales(contract, '150', next_string); }
        loadMore.innerHTML = '▼'
        loadMore.style.width = '12%'
        loadMore.style.minWidth = '120px'
        document.getElementById('frogs').appendChild(loadMore)
        
    } else { return; }
}

/*

    Load more held tokens -- html button

*/
async function load_more_button(wallet, limit, next_string) {
    if (next_string !== null && next_string !== '' && next_string !== 'undefined') {
        break_element = document.createElement('br')
        break_element.id = 'tempBreak'
        document.getElementById('frogs').appendChild(break_element)
        loadMore = document.createElement('button')
        loadMore.id = 'loadMore'
        loadMore.className = 'connectButton'
        loadMore.onclick = async function(){ document.getElementById('loadMore').remove(); document.getElementById('tempBreak').remove(); await fetch_held_tokens(wallet, '100', next_string); }
        loadMore.innerHTML = '🔰 Load More'
        loadMore.style.width = '12%'
        document.getElementById('frogs').appendChild(loadMore)
    } else { return; }
}

/*

    =================================================
    ==> Un-used / Outdated / Incomplete functions <==
    =================================================

*/
async function render_owners_tokens(wallet, tokens, next_string) {
    tokens.forEach(async (token) => {
        var { token: { tokenId } } = token
        var staked, staked_status, staked_values, staked_lvl, staked_next_lvl, button_element, progress, progress_element;
        let owner = await collection.methods.ownerOf(tokenId).call();
        // Staked
        if (owner.toLowerCase() == CONTROLLER_ADDRESS.toLowerCase()) {
            staked = 'True'; staked_status = 'teal';
            owner = await stakerAddress(tokenId);
            staked_values = await stakingValues(tokenId);
            staked_lvl = staked_values[1]; staked_next_lvl = staked_values[2].toString()+' days';
            progress = (( 41.7 - staked_values[2] ) / 41.7 ) * 100;
            progress_element = '<b id="progress"></b><div id="myProgress"><div id="myBar" style="width: '+progress+'% !important;"></div></div>';
            if (owner.toLowerCase() == user_address.toLowerCase()) { 
                button_element = // Un-stake button
                    '<div style="text-align: center;">'+
                        '<button class="unstake_button" onclick="initiate_withdraw('+tokenId+')">Un-stake</button>'+
                    '</div>';
            } else { button_element = ''; }
        // NOT Staked
        } else {
            progress_element = ''; staked = 'False'; staked_status = 'tomato'; staked_lvl = '--'; staked_next_lvl = '--';
            if (owner.toLowerCase() == user_address.toLowerCase()) { 
                button_element = // Stake button
                    '<div style="text-align: center;">'+
                        '<button class="stake_button" onclick="initiate_stake('+tokenId+')">Stake</button>'+
                    '</div>';
            } else { button_element = ''; }
        }

        var html_elements = 
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Staked</text>'+'<br>'+
                '<text style="color: '+staked_status+';">'+staked+'</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
                '<text style="color: teal;" id="frog_type">'+truncateAddress(owner)+'</text>'+
            '</div>'+
            '<br>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Next Level</text>'+'<br>'+
                '<text style="color: teal;">'+staked_next_lvl+'</text>'+
            '</div>'+
            '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text style="color: #1a202c; font-weight: bold;">Level</text>'+'<br>'+
                '<text style="color: teal;">'+staked_lvl+'</text>'+
            '</div>'+
            progress_element+
            button_element;

        await render_frog_token(html_elements, tokenId);
    })
}

var morph_preset_a, morph_preset_b, parent_a, parent_b;
async function metamorph_a_preset() {
    console.log('Enable morph select for parent: A')
    morph_preset_a = true;
    morph_preset_b = false;
    return;
}

async function metamorph_b_preset() {
    console.log('Enable morph select for parent: B')
    morph_preset_a = false;
    morph_preset_b = true;
    return;
}

async function metamorph_select(frog){
    console.log('Select: Frog #'+frog)
    if (morph_preset_a) {
        document.getElementById('parent-a-img').src = SOURCE_PATH+'/frog/'+frog+'.png';
        morph_preset_a = false;
        parent_a = frog
        return;
    } else if (morph_preset_b) {
        document.getElementById('parent-b-img').src = SOURCE_PATH+'/frog/'+frog+'.png';
        morph_preset_b = false;
        parent_b = frog
        return;
    }
}

async function morph_ui(){
    // 🍄 Meta Morph
    morph_enabled = true;
    morphButton = document.createElement('button')
    morphButton.id = 'the-morphButton'
    morphButton.className = 'connectButton'
    morphButton.onclick = async function (e) {

        // <br> x2
        break_element = document.createElement('br')
        document.getElementById('buttonBar').appendChild(break_element)
        document.getElementById('buttonBar').appendChild(break_element)
        
        // Morph results display
        var results_element = document.createElement('div');
        // Element Details -->
        results_element.id = 'morph-results-display';
        results_element.className = 'display_token';
        results_element.innerHTML = 
            '<div class="display_token_cont">'+
                '<div id="div_morph-results" class="renderLeft" style="background: transparent; background-size: 2048px 2048px;">'+
                    '<div class="innerLeft">'+
                        '<div class="display_token_img_cont" id="cont_morph-results">'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div class="renderRight" style="display: inline-block !important; min-height: auto !important;">'+
                    '<div class="morph-preset-a">'+
                        '<img id="parent-a-img" class="morph-preimg" src="https://freshfrogs.github.io/source/blackWhite.png"/>'+
                        '<button class="stake_button" onclick="metamorph_a_preset()">Select Frog</button>'+
                    '</div>'+
                    '<div class="morph-preset-b">'+
                        '<img id="parent-b-img" class="morph-preimg" src="https://freshfrogs.github.io/source/blackWhite.png"/>'+
                        '<button class="stake_button" onclick="metamorph_b_preset()">Select Frog</button>'+
                    '</div>'+
                    '<div class="morph-preset-c">'+
                        '<button class="unstake_button" onclick="metamorph_build()">Meta Morph</button>'+
                    '</div>'+
                '</div>'+
            '</div>';

        // Create Element <--
        document.getElementById('buttonBar').appendChild(results_element);
        
    }
    morphButton.innerHTML = '🍄 Meta Morph'
    document.getElementById('buttonBar').appendChild(morphButton)
}

/*

    Morph Token(s)
    Combine and Render NFT Tokens

    Token(A) + Token(B) = Token(C)
    Alpha + Bravo = Charlie

*/

async function metamorph_build(token_a, token_b, location) {

    if (! location) { token_a = parent_a}
    if (! location) { token_b = parent_b}
    if (! location) { location = 'cont_morph-results'}
    console.log('=-=-=-=-=-=-=-=-=-= Morphing =-=-=-=-=-=-=-=-=-=');
    console.log('= Morphing Tokens Alpha (#'+token_a+') & Bravo (#'+token_b+')');
    console.log('= Fetching Metadata...');
    console.log('= ');

    document.getElementById('div_morph-results').style.backgroundImage = 'url("'+SOURCE_PATH+'/frog/'+token_a+'.png'+'")';

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
    let metadata_a_raw = await (await fetch(SOURCE_PATH+'/frog/json/'+token_a+".json")).json();
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
    let metadata_b_raw = await (await fetch(SOURCE_PATH+'/frog/json/'+token_b+".json")).json();
    for (j = 0; j < metadata_b_raw.attributes.length; j++) {

        let attribute = metadata_b_raw.attributes[j];
        
        metadata_b[attribute.trait_type] = attribute.value
        console.log('= '+attribute.trait_type+' : '+attribute.value);

    }
    console.log(JSON.stringify(metadata_b_raw.attributes, null, "\t"))

    console.log('= ');
    console.log('= Generating New Metadata...');
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
    if (metadata_c['Frog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Frog","value":metadata_c['Frog']}); build_trait('Frog', metadata_c['Frog'], location); }
    
    // SPECIALFROG
    else if (metadata_c['SpecialFrog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"SpecialFrog","value":metadata_c['SpecialFrog']}); build_trait('SpecialFrog', metadata_c['SpecialFrog'], location); }
    
    // FROG B (SUBSET)
    if (metadata_c['Subset'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Subset","value":metadata_c['Subset']}); build_trait('Frog/subset', metadata_c['Subset'], location); }

    // TRAIT
    if (metadata_c['Trait'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Trait","value":metadata_c['Trait']}); build_trait('Trait', metadata_c['Trait'], location); }

    // ACCESSORY
    if (metadata_c['Accessory'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Accessory","value":metadata_c['Accessory']}); build_trait('Accessory', metadata_c['Accessory'], location); }
    
    // EYES
    if (metadata_c['Eyes'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Eyes","value":metadata_c['Eyes']}); build_trait('Eyes', metadata_c['Eyes'], location); }
    
    // HAT
    if (metadata_c['Hat'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Hat","value":metadata_c['Hat']}); build_trait('Hat', metadata_c['Hat'], location); }
    
    // MOUTH
    if (metadata_c['Mouth'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Mouth","value":metadata_c['Mouth']}); build_trait('Mouth', metadata_c['Mouth'], location); }

    morophMetadataJsonString = JSON.stringify(morophMetadataJsonObject.attributes, null, 4);
    //console.log(morophMetadataJsonString)

    console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=')
    console.log(morophMetadataJsonString)

    document.getElementById('morph-json').innerHTML = morophMetadataJsonString

}

/* 

    Render NFT token by layered attirubtes obtained through metadata.

*/
async function build_token(html_elements, token_id, element_id, txn, txn_hash) {
    if (! element_id) { var element_id = 'Frog #'+token_id }
    if (txn == 'sale') {
        var txn_link =
            '<br><a href="https://etherscan.io/tx/'+txn_hash+'" target="_blank"><button class="etherscan_button">Etherscan</button></a>'+
            '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id+'" target="_blank"><button class="opensea_button">Opensea</button></a>';
    }

    var location = 'frogs'
    var image_link = SOURCE_PATH+'/frog/'+token_id+'.png'

    // <-- Begin Element
    var token_doc = document.getElementById(location);
    var token_element = document.createElement('div');

    // Element Details -->
    token_element.id = element_id;
    token_element.className = 'display_token';
    token_element.innerHTML = 
        '<div class="display_token_cont">'+
            '<div id="div_'+element_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
                '<div class="innerLeft">'+
                    '<div href="https://rarible.com/token/'+COLLECTION_ADDRESS+':'+token_id+'" target="_blank" class="display_token_img_cont" id="cont_'+element_id+'" onclick="metamorph_select('+token_id+')">'+
                    '</div>'+
                '</div>'+
            '</div>'+
            '<div class="renderRight">'+
                '<div class="innerRight">'+
                    '<div id="traits_'+element_id+'" class="trait_list">'+
                        //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
                        '<strong><u>Frog #'+token_id+'</strong></u>'+' <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+element_id+'" class="properties">'+
                        html_elements+
                    '</div>'+
                    txn_link+
                '</div>'+
            '</div>'+
        '</div>';

    // Create Element <--
    token_doc.appendChild(token_element);

    // Update Metadata! Build Frog -->
    let metadata = await (await fetch(SOURCE_PATH+'/frog/json/'+token_id+'.json')).json();
    for (let i = 0; i < metadata.attributes.length; i++) {
        let attribute = metadata.attributes[i]
        /* if (attribute.trait_type == 'SpecialFrog' && attribute.value == 'peace') {

            // get special dna from token id
            firstDigit = parseInt(token_id / 1000);
            lastDigit = token_id % 10;
            if (firstDigit > frogArray.length) { firstDigit = frogArray.length; }
            if (lastDigit > traitArray.length) { lastDigit = traitArray.length; }
            frogdna = frogArray[firstDigit]
            traitdna = traitArray[lastDigit]
            build_trait('SpecialFrog', 'peace/'+frogdna, 'cont_'+element_id);
            build_trait('Trait', 'SpecialFrog/peace/'+traitdna, 'cont_'+element_id);
        } else { */
            build_trait(attribute.trait_type, attribute.value, 'cont_'+element_id);
        // }
    }
}

/*

    Fetch all staked NFT tokens by user (wallet address)

*/
async function fetch_staked_tokens(wallet) {
    if (! wallet) { wallet = user_address; }
    await getStakedTokens(wallet)
    .then(async (tokens) => {
        console.log('Fetching (STAKED) tokens from address: \n'+wallet+'\n')
        console.log(tokens)
        tokens.forEach(async (token) => {
            //var token_owner = await collection.methods.ownerOf(token_id).call();
            var token_id = token.tokenId
            var staked, staked_status, staked_values, staked_lvl, staked_next_lvl, button_element, progress, progress_element;
            staked = 'True'
            staked_status = 'teal'
            owner = await stakerAddress(token_id);
            staked_values = await stakingValues(token_id);
            staked_lvl = staked_values[1]
            staked_next_lvl = staked_values[2].toString()+' days'
            progress = (( 41.7 - staked_values[2] ) / 41.7 ) * 100
            progress_element = ''//'<b id="progress"></b><div id="myProgress"><div id="myBar" style="width: '+progress+'% !important;"></div></div>'
            if (owner.toLowerCase() == user_address.toLowerCase()) { // https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/506
                button_element = // Un-stake button
                    '<div style="text-align: center;">'+
                        '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                        '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id+'" target="_blank"><button class="opensea_button">Opensea</button></a>'+
                    '</div>';
            } else {
                button_element =
                    '<div style="text-align: center;">'+
                        '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id+'" target="_blank"><button class="opensea_button">Opensea</button></a>'+
                    '</div>';
            }

            var html_elements = 
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text style="color: #1a202c; font-weight: bold;">Staked</text>'+'<br>'+
                    '<text style="color: '+staked_status+';">'+staked+'</text>'+
                '</div>'+
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text style="color: #1a202c; font-weight: bold;">Owner</text>'+'<br>'+
                    '<text style="color: teal;" id="frog_type">'+truncateAddress(owner)+'</text>'+
                '</div>'+
                '<br>'+
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text style="color: #1a202c; font-weight: bold;">Next Level</text>'+'<br>'+
                    '<text style="color: teal;">'+staked_next_lvl+'</text>'+
                '</div>'+
                '<div style="margin: 8px; float: right; width: 100px;">'+
                    '<text style="color: #1a202c; font-weight: bold;">Level</text>'+'<br>'+
                    '<text style="color: teal;">'+staked_lvl+'</text>'+
                '</div>'+
                progress_element+
                button_element;

            await build_token(html_elements, token_id);
        })
    })
}

/*

    Fetch ETH/USD conversion

*/
async function fetch_eth_usd() {

    console.log('Fetching ETH/USD...')
    fetch('https://deep-index.moralis.io/api/v2.2/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=eth&include=percent_change', options_2)
    .then((results) => results.json())
    .then((results) => { eth_usd = Number(results.usdPrice); console.log('CURRENT WRAPPED ETH PRICE\n$'+eth_usd); })
    .catch((e) => {
        console.log(e.message)
    })

}

/*

    Connection Functions 
    Allow users to connect using an ethereum wallet via web3 browser extension

*/
async function initiate_web3_connection() {
    if (typeof window.ethereum !== "undefined") {
        document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...'
        await connect_user();
    } else {
        // WEB3 browser extenstion could not be found!
        alert('WEB3 browser extenstion could not be found!\nHave you tried refreshing the page?')
    }
}
async function connect_user() {
    try { // Connect wallet
        if (window.ethereum) {

            await window.ethereum.request({method: 'eth_requestAccounts'});
            web3 = new Web3(window.ethereum);

            user_address = await web3.currentProvider.selectedAddress;

            f0 = new F0();
            console.log('f0 connection');
            await f0.init({ web3: web3, contract: COLLECTION_ADDRESS, network: 'main' })
            await get_user_invites(user_address);
            await connect_functions(user_address);
            await update_frontend();

        } else { // No wallet found.
            console.log('Failed to find WEB3 browser addon')
            window.location('https://www.coinbase.com/wallet/downloads');
            return
        }
    } catch (e) {
        console.log(e.message)
    }
}
async function connect_functions(wallet_address) {
    try {

        console.log('Fetching contract data...');
        
        // Connect ethereum contracts
        console.log('Connecting collection contract...');
        collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);
        console.log('Connecting controller contract...');
        controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
        console.log('Fetching collection name...');
        collection_name = await f0.api.name().call();
        console.log('Fetching collection symbol...');
        collection_symbol = await f0.api.symbol().call();
        console.log('Fetching next id from NFT token supply...');
        next_id = await f0.api.nextId().call();
        next_id = parseInt(next_id);
        total_supply = '4040';

        // User variables. Held and staked tokens, etc.
        console.log('Fetching user token balance...');
        user_tokenBalance = await collection.methods.balanceOf(user_address).call();
        console.log('Fetching user staked token balance...');
        user_stakedBalance = await stakers(user_address, 'amountStaked')
        console.log('Fetching user available rewards...');
        user_rewards = await availableRewards(user_address)
        console.log('Check user staking approval status...');
        is_approved = await checkApproval();

    } catch (e) {
        console.log(e.message)
    }
}
async function get_user_invites(wallet_address) {
    try {

        console.log('Fetching user invites...');

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

/*

    Update website UI

*/
async function update_frontend() {

    // Prepare HTML Element
    var parent_element = document.getElementById('buttonBar');
    //break_element = document.createElement('br')
    //parent_element.appendChild(break_element)

    // Connected Button
    document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']'
    document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+user_tokenBalance+'/'+user_stakedBalance+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+user_tokenBalance+'/'+user_stakedBalance+')'); }

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
    stkeBtn.onclick = async function (e) { await initiate_setApprovalForAll(); }
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
    parent_element.appendChild(thePondButton);

    /* // The Pond | View all staked tokens 🍄 Meta Morph
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

/*

    Mint NFT tokens!
    Calls upon collection contract, using user invite for mint price & limit

*/
async function initiate_mint() {

    // Token ID input
    var input_quantity = prompt('🐸 FreshFrogsNFT (FROG)\nTotal Supply: '+next_id+' / 4040\n\nMint Price: '+mint_price+' | Mint Limit: '+mint_limit+'\n\nMint to create NEW uniquely pre-generated Frogs on the Ethereum blockchain! How many Frogs would you like to mint? ('+mint_price+'Ξ each + gas fee)') // prompt("Frog #"+next_id+" out of 4,040 is available to mint! \nMint limit of "+mint_limit+" Frogs per wallet! \nHow many Frogs would you like to mint? ("+mint_price+"Ξ each + gas fee)");
    if (input_quantity !== null) {
        mint_quantity = parseInt(input_quantity)
        let mint_txn = await mint(mint_quantity, user_invite);
        alert(mint_txn);
    }

}

/*

    Send mint transaction!

*/
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
    if (!approved) { alert('Before you can begin staking, the contract must be given permission to acess your Frogs. See "🌱 Stake & Earn!" to learn more.'); return; }

    // Passed all requisites. Request user to confirm token ID
    var input = prompt('📌 STAKE FROG #'+token_id+'\nWhile this Frog is staked you will not be able to sell it on secondary market places, like Rarible. To do this you will have to un-stake directly from this site. Once a frog is un-staked it\'s level will reset to zero!\n'+'\nConfirm the ID of the Frog you would like to stake.\nToken ID: '+token_id);
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
        let txn = await controller.methods.stake(token_id).send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

        var txn_raw = 'stake('+token_id+')'

        // Transaction sent
        .on('transactionHash', function(hash){
            return txn_raw+'\nTransaction has been sent and now pending.';
        })
    
        // Transction complete
        .on('receipt', function(receipt){
            console.log(receipt)
            return txn_raw+'\nTransaction has been completed! See console for details.'
        })
    
        // Transaction error
        .on('error', function(error, receipt) {
            console.log(receipt)
            return txn_raw+'\nSomething went wrong during the transaction! Did it run out of gas?\nCheck console for receipt details!'
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
    var input = prompt('🤏 WITHDRAW FROG #'+token_id+'\nUn-staking (withdrawing) this Frog will return it to your wallet. The staking level will be reset to zero!\n'+'\nConfirm the ID of the token you would like to withdraw.\nToken ID: '+token_id);
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
        let txn = await controller.methods.withdraw(token_id).send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

        var txn_raw = 'withdraw('+token_id+')'

        // Transaction sent
        .on('transactionHash', function(hash){
            return txn_raw+'\nTransaction has been sent and now pending.';
        })
    
        // Transction complete
        .on('receipt', function(receipt){
            console.log(receipt)
            return txn_raw+'\nTransaction has been completed! See console for details.'
        })
    
        // Transaction error
        .on('error', function(error, receipt) {
            console.log(receipt)
            return txn_raw+'\nSomething went wrong during the transaction! Did it run out of gas?\nCheck console for receipt details!'
        });

    // Catch Errors
    } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
}

/*

    setApproval | set staking contract approval
    checkApproval | check staking contract approval

*/
async function setApprovalForAll() {
    try {
        // Estimate gas needed for transaction
        var gasprice = await web3.eth.getGasPrice();
        gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
        var gas_estimate = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).estimateGas({ from: user_address }); 
        gas_estimate = Math.round(gas_estimate * 1.05);
        console.log('gas estimate: '+gas_estimate);

        // Send transaction using gas estimate
        let txn = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ 
            from: user_address, 
            gas: web3.utils.toHex(gas_estimate), 
            gasPrice:  web3.utils.toHex(gasprice),
        })

        var txn_raw = 'setApprovalForAll()'

        // Transaction sent
        .on('transactionHash', function(hash){
            return txn_raw+'\nTransaction has been sent and now pending.';
        })

        // Transction complete
        .on('receipt', function(receipt){
            console.log(receipt)
            return txn_raw+'\nTransaction has been completed! See console for details.'
        })

        // Transaction error
        .on('error', function(error, receipt) {
            console.log(receipt)
            return txn_raw+'\nSomething went wrong during the transaction! Did it run out of gas?\nCheck console for receipt details!'
        })
    // Catch Errors
    } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
}
async function initiate_setApprovalForAll() {

    // Check Approval Status
    var approval_status;
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (is_approved) {approval_status = '🟢 TRUE'} else {approval_status = '🔴 FALSE'}
    alert('📃 FreshFrogsNFT Staking\nStake your Frogs and start earning rewards like $FLYZ, and more! Staking works by sending your Frog to a smart contract that will keep it safe. Frogs that are staked can\'t be listed on secondary market places, like Rarible.\n\n✍️ Sign Contract Approval\nTo start staking you must first give the staking contract permission to access your Frogs. This is a one time transaction that requires a gas fee. Approval Status: '+approval_status+'\n\nStaked Tokens: ('+user_stakedBalance+') | Rewards: '+user_rewards.toFixed(2)+' $FLYZ');
    if (!is_approved) { 
        try {

            // Submit Txn
            let setApproval_txn = await setApprovalForAll();
            alert(setApproval_txn);
            return

        // Catch Errors
        } catch (e) { return 'TRANSACTION FAILED:\n '+e.message; }
    
    // Already Approved
    } else { return; }
}
async function checkApproval() {
    // Check Approval Status
    let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
    if (!is_approved) { return false; } // Not Approved
    else { return true; } // Approved
}

/*

    Calculate total time a token has been staked (Hours)

*/
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

    example: send_write_function(collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true))

*/
async function send_write_transaction(contract_method) {
    try {
        var gasprice = await web3.eth.getGasPrice();
        gasprice = Math.round(gasprice * 1.05);// to speed up 1.05 times..
        var gas_estimate = await contract_method.estimateGas({ from: user_address }); 
        gas_estimate = Math.round(gas_estimate * 1.05);
        let txn = await contract_method.send({ 
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

/*

    build_trait(_trait(family), _attribute(type), _where(element))

*/
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