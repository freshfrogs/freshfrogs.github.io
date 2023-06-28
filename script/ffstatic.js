// Fresh Frogs NFT Static Github Pages

// Variables
var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
var SOURCE_PATH = '../SRC/'

// Fetch Collection
async function fetch_collection(order) {

    if (order > 0) {

        // 1 - 4040
        for (let i = 1; i < 4040; i++) {
            await display_token(i)
        }

    } else {

        // 4040 - 1
        for (let i = 4040; i < 1; i++) {
            await display_token(i)
        }
        
    }

}

  /*

    Display Token
    Render NFT Token to UI (collection token)

  */

async function display_token(token_id) {

    let image_link = '../frog/'+token_id+'.png'
    let token_name = 'Frog #'+token_id

    button_elements = 
        '<div style="text-align: center;">'+
            '<a href="'+image_link+'" target="_blank"><button class="os_button">Original Image</button></a>'+
        '</div>';

    // <-- Begin Element
    token_doc = document.getElementById('frogs');
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
                        '<strong>'+token_name+'</strong>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                    '</div>'+
                    '<div>'+button_elements+'</div>'+
                '</div>'+
            '</div>'+
        '</div>';

    // Create Element <--
    token_doc.appendChild(token_element);

    // Update Metadata! Build Frog -->
    let token_metadata = await (await fetch("../frog/json/"+token_id+".json")).json();

    // Boolean
    let b = true;

    for (let j = 0; j < token_metadata.attributes.length; j++) {

        // Build Token Image
        let attribute = token_metadata.attributes[i]
        loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

        // Input properties
        properties_div = document.getElementById('prop_'+token_id)
        trait_element = document.createElement('div');
        trait_element.className = 'traitProperties'

        // Style Float
        if (b) { trait_element.style.float = 'Left'; } // Class A (left)
        else { trait_element.style.float = 'Right'; } // Class B (right)
        
        // Properties Text
        trait_element.innerHTML = 
            '<text>'+attribute.trait_type+'</text>'+'<br>'+
            '<text style="color: #1ac486; font-weight: bold;">'+attribute.value+'</text>'
      
        // Insert break for every other element
        if (b && j !== 0) {
            linebreak = document.createElement("br");
            properties_div.appendChild(linebreak);
        }

        // Append Child
        properties_div.appendChild(trait_element)

        // Toggle style float
        b = !b;

    }
    
}


    // ----


    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute

        if (attribute == 'tongueSpiderRed' || attribute == 'tongueSpider' || attribute == 'tongue' || attribute == 'tongueFly' || attribute == 'croaking' || attribute == 'peace' || attribute == 'inversedEyes' || attribute == 'closedEyes' || attribute == 'thirdEye' || attribute == 'mask' || attribute == 'smoking' || attribute == 'smokingCigar' || attribute == 'smokingPipe' || attribute == 'circleShadesRed' || attribute == 'circleShadesPurple' || attribute == 'shades' || attribute == 'shadesPurple' || attribute == 'shadesThreeD' || attribute == 'shadesWhite' || attribute == 'circleNightVision') {
            
            newAttribute.src = "../the-pond/"+trait+"/animations/"+attribute+"_animation.gif";

        } else {

            newAttribute.src = "../the-pond/"+trait+"/"+attribute+".png";

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