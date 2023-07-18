    // Fresh Frogs NFT Static Github Pages

    // Global Variables
    var CONTRACT_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
    var SOURCE_PATH = '../source/base_files/Toadz/'
    var toadA, toadB, toadC;

    // Fetch Collection
    async function fetch_collection() {

        toadA = toadB = toadC = '';

        var arr = [];

        while(arr.length < 2){
            var r = Math.floor(Math.random() * 2222) + 1;
            if(arr.indexOf(r) === -1) arr.push(r);
        }

        for (let i = 0; i < arr.length; i++) {

            if (toadA == '') {
                toadA = arr[i]
            } else if (toadB == '') {
                toadB = arr[i]
            }

            await display_token(arr[i])

        }

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
        if (charlieMetadata['ToadSubset'] !== '') { loadTrait('Toad/subset/v2', charlieMetadata['ToadSubset'], build_loc); }

        // TRAIT(S)
        if (bravoMetadata['Trait'] !== '') { loadTrait('Trait', bravoMetadata['Trait'], build_loc); }
        else if (alphaMetadata['Trait'] !== '') { loadTrait('Trait', alphaMetadata['Trait'], build_loc); }

        // ACCESSORIES
        if (charlieMetadata['Accessory'] !== '') { loadTrait('Accessory', charlieMetadata['Accessory'], build_loc); }
        if (charlieMetadata['Eyes'] !== '') { loadTrait('Eyes', charlieMetadata['Eyes'], build_loc); }
        if (charlieMetadata['Hat'] !== '') { loadTrait('Hat', charlieMetadata['Hat'], build_loc); }
        if (charlieMetadata['Mouth'] !== '') { loadTrait('Mouth', charlieMetadata['Mouth'], build_loc); }

    }