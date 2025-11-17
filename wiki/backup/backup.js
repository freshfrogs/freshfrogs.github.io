async function load_mintingTerminal() {

    frog_count = 1;

    document.getElementById('mintingTray').innerHTML = 

        '<div id="display-table" style="height: 64px;">' +
        '    <i id="label_name" class="label_name">Frog 3410 / 4040</i><i id="label_price" class="label_price">Quantity</i>' +
        '    <b id="frog_name" class="frog_name">0.01 ΞETH</b><b id="frog_price" class="frog_price"><a id="remove-frog" onclick="remove_frog();"><b>-</b></a> <b id="quant-frog">1</b> <a id="add-frog" onclick="add_frog();"><b>+</b></a></b>' +
        '</div>' +
        '<div class="bigContainer">' +
        '    <div id="frogContainer" class="containerMint"></div>' +
        '    <div id="frogContainer2" class="containerMint"></div>' +
        '    <div id="frogContainer3" class="containerMint">' +
        '        <div class="imgWrapperMint"><img id="previewImg" class="frogImgMint" src="https://freshfrogs.io/assets/frogs/preview2.gif"/></div>' +
        '    </div>' +
        '</div>';

    document.getElementById('lower_display').innerHTML = 

        '<button id="mint-button" class="button" onclick="refreshPage()"><b><i>Connect Wallet!</i></b></button>' +
        '<div id="minting-console" class="minting-console">' +
        '    > connect wallet...' +
        '</div>';

    morph = false;
    var morphbar = document.getElementById('buttonbar_morph')
    morphbar.style.boxShadow = 'none'
    morphbar.style.background = 'white'
    morphbar.style.color = 'initial'

    document.getElementById('buttonbar_mint').className = 'buttonbar_mint_on button_1';

    document.getElementById('previewImg').setAttribute('src', '../frog/'+nextIdC+'.png')
    
    connect();

}

function load_morph() {

    morph = true;
    var morphbar = document.getElementById('buttonbar_morph')
    morphbar.style.boxShadow = '0px 0px 6px 6px rgba(122, 122, 122, 0.20)'
    morphbar.style.background = 'lightcoral'
    morphbar.style.color = 'white'

    document.getElementById('buttonbar_mint').className = 'button_1';

    base_frog = false;
    sub_frog = false;
    
    document.getElementById('mintingTray').innerHTML = 

        '<div id="display-table" style="height: 64px;">' +
        '    <i id="label_name" class="label_name">Base Frog</i><button class="switch_button" onclick="switch_base_sub();">🗘</button><i id="label_price" class="label_price">Sub Frog</i>' +
        '    <b id="frog_name_base" class="frog_name">Select Frog</b><b id="frog_name_sub" class="frog_price">Select Frog</b>' +
        '</div>' +
        '<div class="bigContainer">' +
        '    <div id="frogContainer" class="containerMint"></div>' +
        '    <div id="frogContainer2" class="containerMint">' +
        '        <div class="imgWrapperMint"><img id="base_frog_img" class="frogImgMint" src="https://freshfrogs.io/frog/606.png"/></div>' + // 603 605
        '        <div class="imgWrapperMint"><img id="sub_frog_img" class="frogImgMint" src="https://freshfrogs.io/frog/407.png"/></div>' +
        '    </div>' +
        '    <div id="frogContainer3" class="containerMint"><div class="imgWrapperMint">' +
        '       <img id="previewImg" class="frogImgMint" src="https://freshfrogs.io/assets/frogs/morph-preview.png"/></div>' +
        '    </div>' +
        '</div>';

    document.getElementById('lower_display').innerHTML = 

        '<h4 style="text-align: left;">Morph Fresh Frogs!</h4><hr>' +
        '<div>' +
        '   <br><i>1. Connect Wallet!</i>' +
        '   <br><br><i>2. Select Two Frogs!</i>' +
        '   <br><br><i>3. Generate Morph!</i>' +
        '</div>';

    if (typeof userAddress == 'undefined') {
        try { connect(); } catch (e) { console.log('Failed to Connect : ' + e.message); }
    } else { load_ownedFrogs(); }

    // Load two random Frogs
    // selectBaseFrog(randomIntFromInterval(1, nextIdC));
    // selectSubFrog(randomIntFromInterval(1, nextIdC));
    // combineTokens(base_frog, sub_frog);

}



// Select subFrog
async function selectSubFrog(selected_sub){

    sub_frog = selected_sub

    sub_frog_ID = 'Frog #'+selected_sub

    document.getElementById('frog_name_sub').innerHTML = sub_frog_ID

    document.getElementById(sub_frog_ID).style.boxShadow = '0px 0px 6px 6px lightsalmon'
    
    document.getElementById("sub_frog_img").setAttribute('src', 'https://freshfrogs.io/frog/'+sub_frog+'.png')

    let subFrogmetadata = await (await fetch("https://freshfrogs.io/frog/json/"+selected_sub+".json")).json();
    for (var i = 0; i < subFrogmetadata.attributes.length; i++){
        var data = subFrogmetadata.attributes[i]
        //loadAttribute(data.trait_type, data.value, 'subDisplay')
    }

    if (!base_frog || !sub_frog) {
        return
    } else {
        combineTokens(base_frog, sub_frog);
        return
    }
    
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// Switch Frogs
function switch_base_sub() {

    if (!base_frog || !sub_frog) {

        return

    } else {

        var base_i = base_frog;
        var sub_i = sub_frog;

        base_frog = false;
        sub_frog = false;

        selectBaseFrog(sub_i)
        selectSubFrog(base_i)

    }

}
// Select baseFrog
async function selectBaseFrog(selected_base){

    base_frog = selected_base;

    base_frog_ID = 'Frog #'+selected_base

    document.getElementById('frog_name_base').innerHTML = base_frog_ID

    document.getElementById(base_frog_ID).style.boxShadow = '0px 0px 6px 6px lightcoral'

    document.getElementById("base_frog_img").setAttribute('src', 'https://freshfrogs.io/frog/'+base_frog+'.png')

    let baseFrogmetadata = await (await fetch("https://freshfrogs.io/frog/json/"+selected_base+".json")).json();
    for (var i = 0; i < baseFrogmetadata.attributes.length; i++){
        var data = baseFrogmetadata.attributes[i]
        //loadAttribute(data.trait_type, data.value, 'baseDisplay')
    }

    if (!base_frog || !sub_frog) {
        return
    } else {
        combineTokens(base_frog, sub_frog);
        return
    }
}

// Function combine tokens
async function combineTokens(baseFrog, otherFrog) {
    
    var useGIF = undefined;
    var baseFrog_Frog, baseFrog_SpecialFrog, baseFrog_Trait, baseFrog_Accessory, baseFrog_Eyes, baseFrog_Hat, baseFrog_Mouth = undefined;
    var otherFrog_Frog, otherFrog_SpecialFrog, otherFrog_Trait, otherFrog_Accessory, otherFrog_Eyes, otherFrog_Hat, otherFrog_Mouth = undefined;

    let baseFrogmetadata = await (await fetch("https://freshfrogs.io/frog/json/"+baseFrog+".json")).json();

    for (var baseFrogi = 0; baseFrogi < baseFrogmetadata.attributes.length; baseFrogi++) {

        var data = baseFrogmetadata.attributes[baseFrogi]

        if (data.trait_type == "Frog") {
            var baseFrog_Frog = data.value;
        } else if (data.trait_type == "SpecialFrog") {
            var baseFrog_SpecialFrog = data.value;
        } else if (data.trait_type == "Trait") {
            var baseFrog_Trait = data.value;
        } else if (data.trait_type == "Accessory") {
            var baseFrog_Accessory = data.value;
        } else if (data.trait_type == "Eyes") {
            var baseFrog_Eyes = data.value;
        } else if (data.trait_type == "Hat") {
            var baseFrog_Hat = data.value;
        } else if (data.trait_type == "Mouth") {
            if (data.value === "smoking" || data.value === "smokingPipe" || data.value === "smokingCigar") {
                var baseFrog_Mouth = data.value+"2";
            } else {
                var baseFrog_Mouth = data.value;
            }
        }
    }

    let otherFrogmetadata = await (await fetch("https://freshfrogs.io/frog/json/"+otherFrog+".json")).json();

    for (var otherFrogi = 0; otherFrogi < otherFrogmetadata.attributes.length; otherFrogi++){
        var data2 = otherFrogmetadata.attributes[otherFrogi]

        if (data2.trait_type == "Frog") {
            var otherFrog_Frog = data2.value;
        } else if (data2.trait_type == "SpecialFrog") {
            var otherFrog_SpecialFrog = data2.value;
            if (data2.value == "thirdEye") {
                if (typeof baseFrog_SpecialFrog !== "undefined") {
                    var otherFrog_Trait = "thirdEye/baseSpecial"
                } else {
                    var otherFrog_Trait = "thirdEye/base"
                }
            } else if (typeof baseFrog_SpecialFrog !== "undefined") {
                if (baseFrog_SpecialFrog == "thirdEye" && otherFrog_SpecialFrog == "inversedEyes") {
                    var otherFrog_Trait = baseFrog_SpecialFrog+"/baseInversed"
                } else {
                    var otherFrog_Trait = "special/sand";
                }
            } else {
                var otherFrog_Trait = "sand";
            }
            
        } else if (data2.trait_type == "Trait") { // <--TRAITS
            if (typeof baseFrog_SpecialFrog !== "undefined") { // Adapt trait for special Frogs
                if (baseFrog_SpecialFrog === "inversedEyes") {
                    var otherFrog_Trait = "special/"+data2.value
                } else if (baseFrog_SpecialFrog === "closedEyes") {
                    var otherFrog_Trait = "special/"+data2.value
                } else { 
                    var otherFrog_Trait = baseFrog_SpecialFrog+"/"+data2.value
                }
                if (data2.value == "natural") {
                    if (baseFrog_SpecialFrog === "inversedEyes") {
                        var otherFrog_Trait = "natural/special/"+otherFrog_Frog
                    } else if (baseFrog_SpecialFrog === "closedEyes") {
                        var otherFrog_Trait = "natural/special/"+otherFrog_Frog
                    } else { //alert ("baseFrog_SpecialFrog")
                        var otherFrog_Trait = "natural/"+baseFrog_SpecialFrog+"/"+otherFrog_Frog
                    }
                }
            } else if (typeof baseFrog_Frog !== "undefined") { // Regular Frog; continue
                if (data2.value == "natural") {
                    var otherFrog_Trait = "natural/"+otherFrog_Frog
                } else {
                    var otherFrog_Trait = data2.value;
                }
            }
        } else if (data2.trait_type == "Accessory") {
            var otherFrog_Accessory = data2.value;
        } else if (data2.trait_type == "Eyes") { // shadesAnimation
            var otherFrog_Eyes = data2.value;
        } else if (data2.trait_type == "Hat") {
            var otherFrog_Hat = data2.value;
        } else if (data2.trait_type == "Mouth") {
            if (data2.value === "smoking" || data2.value === "smokingPipe" || data2.value === "smokingCigar") {
                var otherFrog_Mouth = data2.value+"2";
            } else {
                var otherFrog_Mouth = data2.value;
            }
        }
    }

    thisPlace = 'frogContainer3';
    var thisPlace_div = document.getElementById(thisPlace)
    thisPlace_div.style.background = '#7cc1ff'
    thisPlace_div.style.width = '256px'
    thisPlace_div.style.height = '128px'
    thisPlace_div.innerHTML = ''

    //'Frog #'+ base_frog + ' + ' + sub_frog + '<hr>'
    
    var select = document.getElementById('lower_display')
    select.innerHTML = '<h4 style="text-align: left;">Properties</h4><hr>'

    // Frog
    if (typeof baseFrog_Frog !== 'undefined') {
        loadAttribute("Frog", baseFrog_Frog, thisPlace)
        // Trait
        if (typeof otherFrog_Trait !== 'undefined') {
            loadAttribute("Trait", otherFrog_Trait, thisPlace)
        } else if (typeof baseFrog_Trait !== 'undefined') {
            loadAttribute("Trait", baseFrog_Trait, thisPlace)
        }
        // Accessory
        if (typeof baseFrog_Accessory !== 'undefined') {
            loadAttribute("Accessory", baseFrog_Accessory, thisPlace)
        } else if (typeof otherFrog_Accessory !== 'undefined') {
            loadAttribute("Accessory", otherFrog_Accessory, thisPlace)
        }
        // Eyes
        if (typeof baseFrog_Eyes !== 'undefined') {
                loadAttribute("Eyes", baseFrog_Eyes, thisPlace)
            if (baseFrog_Eyes === "shades" || baseFrog_Eyes === "shadesPurple" || baseFrog_Eyes === "shadesThreeD" || baseFrog_Eyes === "shadesWhite") {
                loadAttribute("Eyes", "shadesAnimation", thisPlace)
            }
        } else if (typeof otherFrog_Eyes !== 'undefined') {
                loadAttribute("Eyes", otherFrog_Eyes, thisPlace)
            if (otherFrog_Eyes === "shades" || otherFrog_Eyes === "shadesPurple" || otherFrog_Eyes === "shadesThreeD" || otherFrog_Eyes === "shadesWhite") {
                loadAttribute("Eyes", "shadesAnimation", thisPlace)
            }
        }
        // Hat
        if (typeof baseFrog_Hat !== 'undefined') {
            loadAttribute("Hat", baseFrog_Hat, thisPlace)
        } else if (typeof otherFrog_Hat !== 'undefined') {
            loadAttribute("Hat", otherFrog_Hat, thisPlace)
        }
        // Mouth
        if (typeof baseFrog_Mouth !== 'undefined') {
            loadAttribute("Mouth", baseFrog_Mouth, thisPlace)
        } else if (typeof otherFrog_Mouth !== 'undefined') {
            loadAttribute("Mouth", otherFrog_Mouth, thisPlace)
        }
    // Special Frog
    } else if (typeof baseFrog_SpecialFrog !== 'undefined') {
        loadAttribute("SpecialFrog", baseFrog_SpecialFrog, thisPlace)
        if (typeof otherFrog_Trait !== 'undefined') {
            loadAttribute("Trait", otherFrog_Trait, thisPlace)
        } else if (typeof baseFrog_Trait !== 'undefined') {
            loadAttribute("Trait", baseFrog_Trait, thisPlace)
        }
        // Accessory
        if (typeof baseFrog_Accessory !== 'undefined') {
            loadAttribute("Accessory", baseFrog_Accessory, thisPlace)
        } else if (typeof otherFrog_Accessory !== 'undefined') {
            loadAttribute("Accessory", otherFrog_Accessory, thisPlace)
        }
        // Eyes
        if (typeof baseFrog_Eyes !== 'undefined') {
                loadAttribute("Eyes", baseFrog_Eyes, thisPlace)
            if (baseFrog_Eyes === "shades" || baseFrog_Eyes === "shadesPurple" || baseFrog_Eyes === "shadesThreeD" || baseFrog_Eyes === "shadesWhite") {
                loadAttribute("Eyes", "shadesAnimation", thisPlace)
            }
        } else if (typeof otherFrog_Eyes !== 'undefined') {
                loadAttribute("Eyes", otherFrog_Eyes, thisPlace)
            if (otherFrog_Eyes === "shades" || otherFrog_Eyes === "shadesPurple" || otherFrog_Eyes === "shadesThreeD" || otherFrog_Eyes === "shadesWhite") {
                loadAttribute("Eyes", "shadesAnimation", thisPlace)
            }
        }
        // Hat
        if (typeof baseFrog_Hat !== 'undefined') {
            loadAttribute("Hat", baseFrog_Hat, thisPlace)
        } else if (typeof otherFrog_Hat !== 'undefined') {
            loadAttribute("Hat", otherFrog_Hat, thisPlace)
        }
        // Mouth
        if (typeof baseFrog_Mouth !== 'undefined') {
            loadAttribute("Mouth", baseFrog_Mouth, thisPlace)
        } else if (typeof otherFrog_Mouth !== 'undefined') {
            loadAttribute("Mouth", otherFrog_Mouth, thisPlace)
        }
    }
    document.getElementById('morph_float').innerHTML = document.getElementById('frogContainer3').innerHTML
}

// Load attribute
function loadAttribute(trait, attribute, where) {
    newAttribute = document.createElement("img")
    newAttribute.href = "https://opensea.io/collection/fresh-frogs?search[sortAscending]=true&search[sortBy]=PRICE&search[stringTraits][0][name]="+trait+"&search[stringTraits][0][values][0]="+attribute
    newAttribute.id = attribute
    newAttribute.target = "_blank"
    newAttribute.className = "frogImg2" //shadesAnimation
    newAttribute.style.cursor = "pointer"
    if (attribute === "smoking2" || attribute === "smokingPipe2" || attribute === "smokingCigar2") { 
        newAttribute.src = "https://freshfrogs.io/the-pad/"+trait+"/"+attribute+".gif"
    } else if (attribute === "morphAnimation") {
        newAttribute.src = "https://freshfrogs.io/the-pad/Frog/loadMorph.gif"
    } else if (attribute === "shadesAnimation") {
        newAttribute.src = "https://freshfrogs.io/the-pad/Eyes/shadesAnimation.gif"
    } else {
        newAttribute.src = "https://freshfrogs.io/the-pad/"+trait+"/"+attribute+".png"
    }
    newAttribute.alt = attribute
    document.getElementById(where).appendChild(newAttribute)

    //console.log(traits_list[trait][attribute.toLowerCase()])

    var trait_rarity = ((traits_list[trait][attribute.toLowerCase()] / 4040) * 100).toFixed(0)

    if (trait_rarity == 'NaN') { trait_rarity = 0 }

    var new_trait = document.createElement('div')
    new_trait.className = 'frog_trait'
    new_trait.onclick = function() {
        if (trait !== 'Frog' && trait !== 'SpecialFrog') {
            document.getElementById(attribute).classList.toggle('sec');
            this.classList.toggle('sec2');

            document.getElementById('morph_float').innerHTML = document.getElementById('frogContainer3').innerHTML
        }
    }
    new_trait.innerHTML = 
        
        '<i>'+trait+'</i><br>' +
        '<b>'+attribute.slice(0, 13)+'</b><br>' +
        '<i>'+trait_rarity+'% have this trait<i>';

    document.getElementById('lower_display').appendChild(new_trait)
}

async function load_ownedFrogs() {

    const options = {
        method: 'GET',
        headers: {Accept: 'application/json', 'X-API-KEY': '1b80881e422a49d393113ede33c81211'}
    };

    var owned_frogs_div = document.getElementById('owned-frogs')
    
    owned_frogs_div.innerHTML = ''

    owned_frogs_div.style.background = 'white'
    owned_frogs_div.style.border = 'none'
    owned_frogs_div.style.color = 'inherit'

    owned_frogs_div.style.height = 'auto';

    fetch('https://api.opensea.io/api/v1/assets?owner='+userAddress+'&order_direction=desc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&limit=50&include_orders=false', options)
    .then((res) => res.json())
    .then((res) => {
        var { assets } = res
        assets.forEach((frog) => { // For Each FROG


                var { name, token_metadata, permalink, traits, external_link, token_id } = frog

                owned_frog = document.createElement('a');
                owned_frog.id = name
                owned_frog.className = 'owned_frog';
                owned_frog.style.width = 128+'px';
                owned_frog.onclick = function() { // Frog Select ()
                    
                    var this_frog_ID = event.currentTarget.id
                    
                    var this_frog = this_frog_ID.replace('Frog #', ''); // token ID


                    if (morph) {

                        if (!base_frog && sub_frog !== this_frog) { // SELECT BASE

                            selectBaseFrog(this_frog);
                            return
                            
                        } else if (this_frog == base_frog) { // UN-SELECT BASE

                            document.getElementById('frog_name_base').innerHTML = 'Select Frog'
                            document.getElementById(this_frog_ID).style.boxShadow = 'none'
                            base_frog = false;
                            return

                        } else if (!sub_frog && base_frog !== this_frog) { // SELECT SUB

                            selectSubFrog(this_frog);
                            
                            return

                        } else if (this_frog == sub_frog) { // UN-SELECT SUB

                            document.getElementById('frog_name_sub').innerHTML = 'Select Frog'
                            document.getElementById(this_frog_ID).style.boxShadow = 'none'
                            sub_frog = false;
                            return

                        } else { return }

                    } else {

                        document.getElementById('buttonbar_mint').className = 'button_1';
                        
                        var all_owned_frogs = document.getElementsByClassName('owned_frog')
                        for (var i = 0; i < all_owned_frogs.length; i++) {
                            all_owned_frogs[i].style.boxShadow = 'none';
                        }

                        document.getElementById(this_frog_ID).style.boxShadow = '0px 0px 6px 6px #7cc1ff'
                    }

                    document.getElementById('frogContainer').innerHTML = ''
                    document.getElementById('frogContainer2').innerHTML = ''

                    document.getElementById('frogContainer3').innerHTML = '<img id="display-frog" class="tray-frog" src="../frog/3410.png">'
                    
                    document.getElementById('display-frog').setAttribute('src', '../frog/'+this_frog+'.png')

                    document.getElementById('label_name').innerHTML = 'Fresh Frogs NFT'

                    document.getElementById('frog_name').innerHTML = name

                    document.getElementById('label_price').innerHTML = 'Owner'

                    document.getElementById('frog_price').innerHTML = '(You)'

                    etherscan_link = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id
                    gem_xyz_link = 'https://www.gem.xyz/asset/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token_id

                    document.getElementById('lower_display').innerHTML = 

                    '<h4 style="text-align: left;">Properties</h4>' +

                        '<b><a href="'+permalink+'" target="_blank">opensea.io</a></b> ' + ' | ' + ' <b><a href="'+etherscan_link+'" target="_blank">etherscan.io</a></b> '  + ' | ' + ' <b><a href="'+gem_xyz_link+'" target="_blank">gem.xyz</a></b> ' + '<hr>'

                    traits.forEach((trait) => {

                        var { trait_type, value, trait_count } = trait

                        var trait_rarity = ((trait_count / 4040) * 100).toFixed(0)

                        var new_trait = document.createElement('div')
                        new_trait.className = 'frog_trait'
                        new_trait.innerHTML = 
                            
                            '<i>'+trait_type+'</i><br>' +
                            '<b>'+value.slice(0, 13)+'</b><br>' +
                            '<i>'+trait_rarity+'% have this trait<i>';

                        document.getElementById('lower_display').appendChild(new_trait)

                    })      
                
                }
                owned_frog.innerHTML = 
                    '<img class="frog_img" src='+external_link+'>' +
                    '<i class="label_name">Fresh Frogs NFT</i>' +
                    '<b class="frog_name">'+name+'</b>';
                document.getElementById('owned-frogs').appendChild(owned_frog);
            
        })
    })
    .catch(e => {
        document.getElementById('button_ownedfrogs').innerHTML = 'No Frogs Found :(';
        console.log('Could not get assets from Opensea : ' + e.message)
    })
}

// Manually check Frog transactions
async function load_ownedFrogs_manual() {

    let this_user = userAddress;

    console.log('Checking Frogs Manually.. for user...'+userAddress)

    try {

        let ownedFrogs = await collection.methods.balanceOf(this_user).call()

        if (ownedFrogs <= 0) { // ❌ No FROGS
            console.log("It seems you do not own any FROGS!")
            return
        }

        for (var thisToken = 1; thisToken < nextIdC; thisToken++) {

            let owner = await collection.methods.ownerOf(thisToken).call()

            if (this_user === owner.toLowerCase()) {
                console.log(thisToken)
            }

        }
    } catch (e) {
        console.log("Something went wrong, refresh the page!"+e.message)
        //document.getElementById("netStatus").innerHTML = "Connect to view 'FROG' tokens... <b><i><strong>"+addressCut+' ✓</strong></i></b>'+'<br>Compiling... ❌ '+loadedFrogs+'/'+ownedFrogs+' FROG(s) loaded!'+'<br><input type="text" class="myProgress" id="frogIndex" onkeyup="frogIndexer()" placeholder="Search by TokenID">'
    }

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
function reset_frogsmeta() {

    var freshfrogsmeta = document.getElementById('freshfrogsmeta')
    freshfrogsmeta.innerHTML = 

        '<div style="margin-left: 20%; margin-right: auto;" onclick="loadBaseFrogTypes();">' +
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(3).png"/>' +
        '    <p>Base Frog Types</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;" onclick="loadColoredFrogTypes();">' +
        '    <img class="meta_img" src="../the-pad/Frog/cyanTreeFrog.png"/>' +
        '    <p>Colored Frog Types</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;" onclick="loadSpecialFrogTypes();">' +
        '    <img class="meta_img" src="../the-pad/SpecialFrog/peace.png"/>' +
        '    <p>Special Frog Types</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: 20%;" onclick="loadNaturalFrogTypes();">' +
        '    <img class="meta_img" src="../the-pad/Frog/redEyedTreeFrog.png"/>' +
        '    <p>Natural Frog Types</p>' +
        '</div>';

}
// Load Special Frog Types
function loadColoredFrogTypes() {

    var freshfrogsmeta = document.getElementById('freshfrogsmeta')
    freshfrogsmeta.innerHTML = 
    
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/blueTreeFrog.png"/>' +
        '    <p>blueTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/brownTreeFrog.png"/>' +
        '    <p>brownTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/cyanTreeFrog.png"/>' +
        '    <p>cyanTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/goldenTreeFrog.png"/>' +
        '    <p>goldenTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/greenTreeFrog.png"/>' +
        '    <p>greenTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/orangeTreeFrog.png"/>' +
        '    <p>orangeTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/pinkTreeFrog.png"/>' +
        '    <p>pinkTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/purpleTreeFrog.png"/>' +
        '    <p>purpleTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/tomatoFrog.png"/>' +
        '    <p>tomatoFrog</p>' +
        '</div>';

}
// Load Special Frog Types
function loadSpecialFrogTypes() {

    var freshfrogsmeta = document.getElementById('freshfrogsmeta')
    freshfrogsmeta.innerHTML = 
    
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/SpecialFrog/closedEyes.png"/>' +
        '    <p>closedEyes</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/SpecialFrog/croaking.png"/>' +
        '    <p>croaking</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/SpecialFrog/inversedEyes.png"/>' +
        '    <p>inversedEyes</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/SpecialFrog/peace.png"/>' +
        '    <p>peace</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/SpecialFrog/thirdEye.png"/>' +
        '    <p>thirdEye</p>' +
        '</div>';

}
// Load Natural Frog Types
function loadNaturalFrogTypes() {

    var freshfrogsmeta = document.getElementById('freshfrogsmeta')
    freshfrogsmeta.innerHTML = 
    
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/blueDartFrog.png"/>' +
        '    <p>blueDartFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/goldenDartFrog.png"/>' +
        '    <p>goldenDartFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/grayTreeFrog.png"/>' +
        '    <p>grayTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/lightBrownTreeFrog.png"/>' +
        '    <p>lightBrownTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/redEyedTreeFrog.png"/>' +
        '    <p>redEyedTreeFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/splendidLeafFrog.png"/>' +
        '    <p>splendidLeafFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/stawberryDartFrog.png"/>' +
        '    <p>stawberryDartFrog</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/unknown.png"/>' +
        '    <p>"unknown"</p>' +
        '</div>';

}
// Load Base Frog Types
function loadBaseFrogTypes() {

    var freshfrogsmeta = document.getElementById('freshfrogsmeta')
    freshfrogsmeta.innerHTML = 
    
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(1).png"/>' +
        '    <p>treeFrog(1)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(2).png"/>' +
        '    <p>treeFrog(2)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(3).png"/>' +
        '    <p>treeFrog(3)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(4).png"/>' +
        '    <p>treeFrog(4)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(5).png"/>' +
        '    <p>treeFrog(5)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(6).png"/>' +
        '    <p>treeFrog(6)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(7).png"/>' +
        '    <p>treeFrog(7)</p>' +
        '</div>' +
        '<div style="margin-left: auto; margin-right: auto;">' + 
        '    <img class="meta_img" src="../the-pad/Frog/treeFrog(8).png"/>' +
        '    <p>treeFrog(8)</p>' +
        '</div>';

}
// REMOVE FROG from minting Tray
function remove_frog() {
    if (frog_count >= 7) {
        var select = document.getElementById("frogContainer");
        select.removeChild(select.lastChild);
        frog_count = frog_count - 1
    } else if (frog_count >= 4) {
        var select = document.getElementById("frogContainer2");
        select.removeChild(select.lastChild);
        frog_count = frog_count - 1
    } else if (frog_count >= 2) {
        var select = document.getElementById("frogContainer3");
        select.removeChild(select.lastChild);
        frog_count = frog_count - 1
    }
    if (frog_count <= 1) {
        mintList = "Frog #"+nextIdC
    } else {
        mintList = "Frog #"+nextIdC+" - "+((nextIdC-1)+frog_count)
    }

    document.getElementById('frog_name').innerHTML = (0.01 * frog_count) + ' ΞETH'

    document.getElementById('quant-frog').innerHTML = frog_count
    document.getElementById('label_name').innerHTML = mintList
}
// ADD FROG to minting tray
function add_frog() {
    if (typeof frog_count == 'undefined') { frog_count = 1; }
    if (frog_count < 9) {
        if (frog_count <= 2) {
            newFrog = document.createElement("div")
            newFrog.className = "imgWrapperMint"
            newFrog.innerHTML = "<img class='frogImgMint' src='https://freshfrogs.io/frog/"+(nextIdC+frog_count)+".png'/>"
            document.getElementById("frogContainer3").appendChild(newFrog)
            frog_count = frog_count + 1
        } else if (frog_count <= 5) {
            newFrog = document.createElement("div")
            newFrog.className = "imgWrapperMint"
            newFrog.innerHTML = "<img class='frogImgMint' src='https://freshfrogs.io/frog/"+(nextIdC+frog_count)+".png'/>"
            document.getElementById("frogContainer2").appendChild(newFrog)
            frog_count = frog_count + 1
        } else if (frog_count <= 8) {
            newFrog = document.createElement("div")
            newFrog.className = "imgWrapperMint"
            newFrog.innerHTML = "<img class='frogImgMint' src='https://freshfrogs.io/frog/"+(nextIdC+frog_count)+".png'/>"
            document.getElementById("frogContainer").appendChild(newFrog)
            frog_count = frog_count + 1
        }
        
        if (frog_count <= 1) {
            mintList = "Frog #"+nextIdC
        } else {
            mintList = "Frog #"+nextIdC+" - "+((nextIdC-1)+frog_count)
        }
    }

    document.getElementById('frog_name').innerHTML = (0.01 * frog_count) + ' ΞETH'

    document.getElementById('quant-frog').innerHTML = frog_count
    document.getElementById('label_name').innerHTML = mintList
}
function refreshPage() {
    window.location.reload();
} 
// Login with Web3 via Metamasks window.ethereum library
async function connect() {

    console.log('Connecting...')
        
    const web3 = new Web3(window.ethereum);   // Open WEB3.0 Browsner Exentions Window
    const f0 = new F0();    // Connect to Factoria
    const CONTRACT_ADDRESS = "0xBE4Bef8735107db540De269FF82c7dE9ef68C51b";    // Contract Address (Ethereum Mainnet) 0xBE4Bef8735107db540De269FF82c7dE9ef68C51b // Rinkeby: 0xc2203Ff7B9d1c65c8Cf0F6c776f6CF358af3c524
    const COLLECTION = collection = new web3.eth.Contract(token_abi, CONTRACT_ADDRESS);    // Token ABI; imported from Factoria
    const NETWORK = "main";   // Which Network?


    try {   // Connect Wallet
        
        await f0.init({
            web3: web3,
            contract: CONTRACT_ADDRESS,
            network: NETWORK
        })

        userAddress = await web3.currentProvider.selectedAddress

        console.log('Connected Wallet! '+userAddress)

        console.log('Done! Loading FROG tokens...')

        if (!morph) { document.getElementById('mint-button').innerHTML = '<b><a href="https://freshfrogs.io">Mint freshfrogs.io</a></b>'; }
        document.getElementById('user-add').innerHTML = userAddress

        ownedFrogs = await collection.methods.balanceOf(userAddress).call();

        if (ownedFrogs >= 1) {
            load_ownedFrogs()
        }

    // Done! Ready to mint!
    } catch (e) { // Failed; Send Error Code!
        console.log("Failed to Connect! Error : " + e.message);
        return
    }

}