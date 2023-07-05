    // Fresh Frogs NFT Static Github Pages

    // Variables
    var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
    var SOURCE_PATH = '../source/base_files/Toadz/'
    var alphaToad, betaToad;

    // Fetch Collection
    async function fetch_collection() {

        console.log(SOURCE_PATH)

        var arr = [];

        while(arr.length < 2){
            var r = Math.floor(Math.random() * 2222) + 1;
            if(arr.indexOf(r) === -1) arr.push(r);
        }

        for (let i = 0; i < arr.length; i++) {

            if (typeof alphaToad !== 'undefined') {
                var alphaToad = arr[i]
                console.log('Alpha Toad : '+alphaToad)
            } else if (typeof betaToad !== 'undefined') {
                var betaToad = arr[i]
                console.log('Beta Toad : '+betaToad)
            }

            await display_token(arr[i])

        }

        // Third Object

        // <-- Begin Element
        token_doc = document.getElementById('frogs');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = token_name;
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="morphResult" class="renderLeft" style="">'+
                '<div class="display_token_img_cont" id="cont_morphResult"></div>'+
            '</div>'

        // Create Element <--
        token_doc.appendChild(token_element);
            
    }

    /*

        Display Token
        Render NFT Token to UI (collection token)

    */

    async function display_token(token_id) {

        let image_link = SOURCE_PATH+'images/'+token_id+'.png'
        let token_name = 'Toad #'+token_id

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

        // Update Metadata! Build Token -->
        let token_metadata = await (await fetch(SOURCE_PATH+"json/"+token_id+".json")).json();

        for (let j = 0; j < token_metadata.attributes.length; j++) {

            // Build Token Image
            let attribute = token_metadata.attributes[j]
            loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

        }
        
    }

    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute
        newAttribute.src = SOURCE_PATH+trait+"/"+attribute+".png";
        newAttribute.className = "frogImg5";
        document.getElementById(where).appendChild(newAttribute);

    }

    //

    //

    // Token Combinations / Rebuild Token
    async function morphFrogs(baseId, subId, build_loc) {
        
        var baseFrog, baseSpecialFrog, baseTrait, baseAccessory, baseEyes, baseHat, baseMouth;
        var subFrog, subSpecialFrog, subTrait, subAccessory, subEyes, subHat, subMouth;
        var renderFrog, renderSpecialFrog, renderTrait, renderSecondaryTrait, renderAccessory, renderEyes, renderHat, renderMouth, renderOverlay;
        
        document.getElementById(build_loc).innerHTML = '';

        // <------ FETCH METADATA (baseId, subId) ------>
        let baseMetadata = await (await fetch("https://freshfrogs.io/frog/json/"+baseId+".json")).json();
        for (i = 0; i < baseMetadata.attributes.length; i++) {

            let attribute = baseMetadata.attributes[i];
            if (attribute.trait_type == 'Frog') { var baseFrog = attribute.value; } 
            else if (attribute.trait_type == 'SpecialFrog') { var baseSpecialFrog = attribute.value; } 
            else if (attribute.trait_type == 'Trait') { var baseTrait = attribute.value; } 
            else if (attribute.trait_type == 'Accessory') { var baseAccessory = attribute.value; } 
            else if (attribute.trait_type == 'Eyes') { var baseEyes = attribute.value; } 
            else if (attribute.trait_type == 'Hat') { var baseHat = attribute.value; } 
            else if (attribute.trait_type == 'Mouth') { var baseMouth = attribute.value; }

        }

        let subMetadata = await (await fetch("https://freshfrogs.io/frog/json/"+subId+".json")).json();
        for (j = 0; j < subMetadata.attributes.length; j++) {

            let attribute = subMetadata.attributes[j];
            if (attribute.trait_type == 'Frog') { var subFrog = attribute.value; } 
            else if (attribute.trait_type == 'SpecialFrog') { var subSpecialFrog = attribute.value; } 
            else if (attribute.trait_type == 'Trait') { var subTrait = attribute.value; } 
            else if (attribute.trait_type == 'Accessory') { var subAccessory = attribute.value; } 
            else if (attribute.trait_type == 'Eyes') { var subEyes = attribute.value; } 
            else if (attribute.trait_type == 'Hat') { var subHat = attribute.value; } 
            else if (attribute.trait_type == 'Mouth') {var subMouth = attribute.value; }

        }

        // <------ DETERMINE NEW METADATA (baseId, subId) ------> //
        // https://freshfrogs.io/frog/preset_/ [ trait_type/value ] .png

        // Base Adaptative Frog
        //if (baseFrog == 'splendidLeafFrog' || baseFrog == 'stawberryDartFrog' || baseFrog == 'redEyedTreeFrog' && typeof subTrait !== 'undefined') { renderOverlay = baseFrog+'/'+baseTrait; } 
        
        // Sub Adaptative Frog
        //else if (subFrog == 'splendidLeafFrog' || subFrog == 'stawberryDartFrog' || subFrog == 'redEyedTreeFrog' && typeof baseTrait !== 'undefined') { renderOverlay = subFrog+'/'+baseTrait; }
        
        // Special Frogs
        if (typeof baseSpecialFrog !== 'undefined' || typeof subSpecialFrog !== 'undefined') {

            // Base Special Frog AND Sub Special Frog
            if (typeof baseSpecialFrog !== 'undefined' && typeof subSpecialFrog !== 'undefined') {
                subSpecialFrog = baseSpecialFrog+'/SpecialFrog/'+subSpecialFrog;
                subTrait = undefined;
            }

            // Base Special Frog
            else if (typeof subFrog !== 'undefined') {
                subTrait = 'SpecialFrog/'+baseSpecialFrog+'/'+subTrait;
                subSpecialFrog = baseSpecialFrog+'/'+subFrog;
                subFrog = undefined;
            }

            // Sub Special Frog
            else if (typeof baseFrog !== 'undefined') {
                subTrait = 'SpecialFrog/'+subSpecialFrog+'/'+baseTrait;
                baseSpecialFrog = subSpecialFrog;
                subSpecialFrog = subSpecialFrog+'/'+baseFrog;
                baseFrog = undefined;
            }

        }
        
        // Select Attributes!
        if (typeof baseAccessory !== 'undefined') { var renderAccessory = baseAccessory; }
        else if (typeof subAccessory !== 'undefined') { var renderAccessory = subAccessory; }
        if (typeof baseEyes !== 'undefined') { var renderEyes = baseEyes; }
        else if (typeof subEyes !== 'undefined') { var renderEyes = subEyes; }
        if (typeof baseHat !== 'undefined') { var renderHat = baseHat; }
        else if (typeof subHat !== 'undefined') {var renderHat = subHat;}
        if (typeof baseMouth !== 'undefined') { var renderMouth = baseMouth; }
        else if (typeof subMouth !== 'undefined') { var renderMouth = subMouth; }

        // <------ BUILD NEW METADATA (baseId, subId) ------>
        
        // SUB FROG (UNDERLAY)
        if (typeof subFrog !== 'undefined') { loadTrait('Frog', subFrog, build_loc); }
        else if (typeof subSpecialFrog !== 'undefined') { loadTrait('SpecialFrog', subSpecialFrog, build_loc); }

        // ADD ON OVERLAY
        //if (typeof renderOverlay !== 'undefined') { loadTrait('Trait/Overlay', renderOverlay, build_loc); }

        // BASE FROG (OVERLAY)
        if (typeof baseFrog !== 'undefined') { loadTrait('Frog/base', baseFrog, build_loc); }
        else if (typeof baseSpecialFrog !== 'undefined') { loadTrait('SpecialFrog/bottom', baseSpecialFrog, build_loc); }

        // TRAIT(S)
        if (typeof subTrait !== 'undefined') { loadTrait('Trait', subTrait, build_loc); }
        else if (typeof baseTrait !== 'undefined') { loadTrait('Trait', baseTrait, build_loc); }

        // ACCESSORIES
        if (typeof renderAccessory !== 'undefined') { loadTrait('Accessory', renderAccessory, build_loc); }
        if (typeof renderEyes !== 'undefined') { loadTrait('Eyes', renderEyes, build_loc); }
        if (typeof renderHat !== 'undefined') { loadTrait('Hat', renderHat, build_loc); }
        if (typeof renderMouth !== 'undefined') { loadTrait('Mouth', renderMouth, build_loc); }

    }