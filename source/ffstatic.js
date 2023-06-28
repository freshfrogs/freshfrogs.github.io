// Fresh Frogs NFT Static Github Pages

// Variables
var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
var SOURCE_PATH = '../SRC/'

// Fetch Collection
async function fetch_collection(order) {

    var arr = [];
    while(arr.length < 202){
        var r = Math.floor(Math.random() * 4040) + 1;
        if(arr.indexOf(r) === -1) arr.push(r);
    }
    console.log(arr);

    for (let i = 0; i < arr.length; i++) {
        console.log(arr[i])
        await display_token(arr[i])
    }
        
}

  /*

    Display Token
    Render NFT Token to UI (collection token)

  */

async function display_token(token_id) {

    let image_link = '../frog/'+token_id+'.png'
    let token_name = 'Frog #'+token_id

    // <-- Begin Element
    token_doc = document.getElementById('frogs');
    token_element = document.createElement('div');

    // Element Details -->
    token_element.id = token_name;
    token_element.className = 'display_token';
    token_element.innerHTML = 
        '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
            '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
                //'<img src="'+image_link+'" class="displayImage"/>'+
            '</div>'+
        '</div>'

    // Create Element <--
    token_doc.appendChild(token_element);

    // Update Metadata! Build Frog -->
    let token_metadata = await (await fetch("../frog/json/"+token_id+".json")).json();

    for (let j = 0; j < token_metadata.attributes.length; j++) {

        // Build Token Image
        let attribute = token_metadata.attributes[j]
        loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

    }
    
}

//

    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute

        if (attribute == 'tongueSpiderRed' || attribute == 'tongueSpider' || attribute == 'tongue' || attribute == 'tongueFly' || attribute == 'croaking' || attribute == 'peace' || attribute == 'inversedEyes' || attribute == 'closedEyes' || attribute == 'thirdEye' || attribute == 'mask' || attribute == 'smoking' || attribute == 'smokingCigar' || attribute == 'smokingPipe' || attribute == 'circleShadesRed' || attribute == 'circleShadesPurple' || attribute == 'shades' || attribute == 'shadesPurple' || attribute == 'shadesThreeD' || attribute == 'shadesWhite' || attribute == 'circleNightVision') {
            
            newAttribute.src = "../source/base_files/"+trait+"/animations/"+attribute+"_animation.gif";

        } else {

            newAttribute.src = "../source/base_files/"+trait+"/"+attribute+".png";

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

                newAttribute.className = "frogImg5";

            }

        }

        document.getElementById(where).appendChild(newAttribute);

    }