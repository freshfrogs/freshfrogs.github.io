    // Fresh Frogs NFT Static Github Pages

    // Variables
    var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
    var SOURCE_PATH = '../source/base_files/Toadz/'
    var toadA, toadB, toadC;

    // Fetch Collection
    async function fetch_collection() {

        var toadA = toadB = toadC = '';

        var arr = [];

        while(arr.length < 2){
            var r = Math.floor(Math.random() * 2222) + 1;
            if(arr.indexOf(r) === -1) arr.push(r);
        }

        for (let i = 0; i < arr.length; i++) {

            if (typeof toadA !== '') {
                let toadA = arr[i]
                console.log('Alpha Toad : '+toadA)
            } else if (typeof toadB !== '') {
                let toadB = arr[i]
                console.log('Bravo Toad : '+toadB)
            }

            await display_token(arr[i])

        }

        // Third Object

        // <-- Begin Element
        token_doc = document.getElementById('frogs');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = 'Toad';
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="morphResult" class="renderLeft" style="">'+
                '<div class="display_token_img_cont" id="cont_morphResult"></div>'+
            '</div>'

        // Create Element <--
        token_doc.appendChild(token_element);

        morphFrogs(toadA, toadB, 'cont_morphResult');
            
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

    /*

        Morph Token(s)
        Combine and Render NFT Tokens

        Token(A) + Token(B) = Token(C)
        Alpha + Bravo = Charlie

    */

    async function morphFrogs(toadA, toadB, build_loc) {

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
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }
        
        document.getElementById(build_loc).innerHTML = '';

        // Fetch Alpha Metedata ------>
        metadataRaw = await (await fetch(SOURCE_PATH+'/json/'+toadA+".json")).json();
        for (i = 0; i < alphaMetadataRaw.attributes.length; i++) {

            let attribute = alphaMetadataRaw.attributes[i];

            alphaMetadata[attribute.trait_type] = attribute.value

        }

        // Fetch Bravo Metedata ------>
        metadataRaw = await (await fetch(SOURCE_PATH+'/json/'+toadB+".json")).json();
        for (j = 0; j < subMetadata.attributes.length; j++) {

            let attribute = subMetadata.attributes[j];
            bravoMetadata[attribute.trait_type] = attribute.value

        }

        // DETERMINE NEW METADATA ------>
        
        // Select Attributes!
        if (alphaMetadata['Accessory'] !== '') { charlieMetadata['Accessory'] = alphaMetadata['Accessory']; }
        else if (bravoMetadata['Accessory'] !== '') { charlieMetadata['Accessory'] = bravoMetadata['Accessory']; }

        if (alphaMetadata['Eyes'] !== '') { charlieMetadata['Eyes'] = alphaMetadata['Eyes']; }
        else if (bravoMetadata['Eyes'] !== '') { charlieMetadata['Eyes'] = bravoMetadata['Eyes']; }

        if (alphaMetadata['Hat'] !== '') { charlieMetadata['Hat'] = alphaMetadata['Hat']; }
        else if (bravoMetadata['Hat'] !== '') { charlieMetadata['Hat'] = bravoMetadata['Hat']; }

        if (alphaMetadata['Mouth'] !== '') { charlieMetadata['Mouth'] = alphaMetadata['Mouth']; }
        else if (bravoMetadata['Mouth'] !== '') { charlieMetadata['Mouth'] = bravoMetadata['Mouth']; }

        // BUILD NEW METADATA ------>
        
        // Alpha (UNDERLAY)
        if (bravoMetadata['Toad'] !== '') { loadTrait('Toad', bravoMetadata['Toad'], build_loc); }

        // Bravo (OVERLAY)
        if (alphaMetadata['Toad'] !== '') { loadTrait('Toad/subset', alphaMetadata['Toad'], build_loc); }

        // TRAIT(S)
        if (bravoMetadata['Trait'] !== '') { loadTrait('Trait', bravoMetadata['Trait'], build_loc); }
        else if (alphaMetadata['Trait'] !== '') { loadTrait('Trait', alphaMetadata['Trait'], build_loc); }

        // ACCESSORIES
        if (charlieMetadata['Accessory'] !== '') { loadTrait('Accessory', charlieMetadata['Accessory'], build_loc); }
        if (charlieMetadata['Eyes'] !== '') { loadTrait('Eyes', charlieMetadata['Eyes'], build_loc); }
        if (charlieMetadata['Hat'] !== '') { loadTrait('Hat', charlieMetadata['Hat'], build_loc); }
        if (charlieMetadata['Mouth'] !== '') { loadTrait('Mouth', charlieMetadata['Mouth'], build_loc); }

    }