      // Function combine tokens
      async function combineTokens(base, other) {

        console.log('Morphing Frogs '+base+', and '+other+'...')
          
        var base_Frog = base_SpecialFrog = base_Trait = base_Accessory = base_Eyes = base_Hat = base_Mouth = false;
        var other_Frog = other_SpecialFrog = other_Trait = other_Accessory = other_Eyes = other_Hat = other_Mouth = false;
        var alpha_Frog = alpha_SpecialFrog = alpha_Trait = alpha_Accessory = alpha_Eyes = alpha_Hat = alpha_Mouth = false;

        // Fetch Base Frog Metadata

        let base_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+base+".json")).json();

        for (var i = 0; i < base_metadata.attributes.length; i++) {

          var data = base_metadata.attributes[i]

          if (data.trait_type == "Frog") {
              var base_Frog = data.value;
              console.log('base_Frog : '+base_Frog)
          } else if (data.trait_type == "SpecialFrog") {
              var base_SpecialFrog = data.value;
              console.log('base_SpecialFrog : '+base_SpecialFrog)
          } else if (data.trait_type == "Trait") {
              var base_Trait = data.value;
              console.log('base_Trait : '+base_Trait)
          } else if (data.trait_type == "Accessory") {
              var base_Accessory = data.value;
              console.log('base_Accessory : '+base_Accessory)
          } else if (data.trait_type == "Eyes") {
              var base_Eyes = data.value;
              console.log('base_Eyes : '+base_Eyes)
          } else if (data.trait_type == "Hat") {
              var base_Hat = data.value;
              console.log('base_Hat : '+base_Hat)
          } else if (data.trait_type == "Mouth") {
              var base_Mouth = data.value;
              console.log('base_Mouth : '+base_Mouth)
          } else {
            console.log('Unknown attribute : '+data.value)
          }

        }

        // Fetch Other Frog Metadata

        let other_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+other+".json")).json();

        for (var l = 0; l < other_metadata.attributes.length; l++) {

          var data = other_metadata.attributes[l]

          if (data.trait_type == "Frog") {
              var other_Frog = data.value;
              console.log('other_Frog : '+other_Frog)
          } else if (data.trait_type == "SpecialFrog") {
              var other_SpecialFrog = data.value;
              console.log('other_SpecialFrog : '+other_SpecialFrog)
          } else if (data.trait_type == "Trait") {
              var other_Trait = data.value;
              console.log('other_Trait : '+other_Trait)
          } else if (data.trait_type == "Accessory") {
              var other_Accessory = data.value;
              console.log('other_Accessory : '+other_Accessory)
          } else if (data.trait_type == "Eyes") {
              var other_Eyes = data.value;
              console.log('other_Eyes : '+other_Eyes)
          } else if (data.trait_type == "Hat") {
              var other_Hat = data.value;
              console.log('other_Hat : '+other_Hat)
          } else if (data.trait_type == "Mouth") {
              var other_Mouth = data.value;
              console.log('other_Mouth : '+other_Mouth)
          } else {
            console.log('Unknown attribute : '+data.value)
          }

        }

        // Finalize Metadata Output

        // Frog Type
        if (base_Frog != false) {

          var alpha_Frog = base_Frog;

          if (base_Frog == 'cyanTreeFrog' && other_Frog == 'cyanTreeFrog') { var alpha_Frog = false; var alpha_SpecialFrog = 'elBino/'+base_Frog; }          

        } else if (base_SpecialFrog != false) {

          var alpha_SpecialFrog = base_SpecialFrog;

        }

        // Trait Type
        if (other_Trait != false) {

          var alpha_Trait = other_Trait;

        } else if (base_Trait != false) {

          var alpha_Trait = base_Trait;

        }

        // Update alpha_Trait for SpecialFrogs

        if (base_SpecialFrog != false || other_SpecialFrog != false) {

          if (base_SpecialFrog == 'croaking' && other_SpecialFrog == 'croaking') {
            var alpha_SpecialFrog = base_SpecialFrog+'/croaking2'
            var other_Trait = alpha_Trait = base_Trait = false
          }

          if ((base_SpecialFrog == 'thirdEye' || base_SpecialFrog == 'inversedEyes' || base_SpecialFrog == 'peace') && other_Frog != false) {

            if (base_SpecialFrog == 'inversedEyes') {

              var alpha_SpecialFrog = '../Frog/'+other_Frog

            } else if (base_SpecialFrog == 'thirdEye') {

              var alpha_SpecialFrog = base_SpecialFrog+'/'+other_Frog;

            } else if (base_SpecialFrog == 'peace' && other_Frog !== false) {

              var alpha_SpecialFrog = base_SpecialFrog+'/'+other_Frog;

            }
          
          }

          if (base_SpecialFrog != false) {
            if (other_SpecialFrog != false) {
              if (base_SpecialFrog == 'thirdEye' && other_SpecialFrog == 'peace') {
                
                var alpha_Trait = base_SpecialFrog+'/blue';
              
              }
              
              else if (base_SpecialFrog == 'inversedEyes' && other_SpecialFrog == 'peace') {
                
                var alpha_SpecialFrog = 'peace'
                var alpha_Trait = 'inversedEyes/peace';
              
              } else if (base_SpecialFrog == 'inversedEyes' && other_SpecialFrog == 'thirdEye') {
                
                var alpha_SpecialFrog = 'thirdEye'
                var alpha_Trait = 'thirdEye/inversedEyes';
              
              } else if (base_SpecialFrog == 'closedEyes' && other_SpecialFrog == 'peace') {
                
                var alpha_SpecialFrog = 'peace'
                var alpha_Trait = 'closedEyes/peace';
              
              } else {
                var alpha_Trait = base_SpecialFrog+'/'+other_SpecialFrog;
              }
            } else {
              var alpha_Trait = base_SpecialFrog+'/'+alpha_Trait;
            }
          }

          else if (other_SpecialFrog == 'thirdEye' || other_SpecialFrog == 'inversedEyes') {
            var alpha_Trait = other_SpecialFrog+'/base/'+alpha_Trait;
          }

        }

        // Accessory
        if (base_Accessory != false) {

          alpha_Accessory = base_Accessory

        } else if (other_Accessory != false) {

          alpha_Accessory = other_Accessory

        }

        // Eyes
        if (base_Eyes != false) {

          alpha_Eyes = base_Eyes

        } else if (other_Eyes != false) {

          alpha_Eyes = other_Eyes

        }

        // Hat
        if (base_Hat != false) {

          alpha_Hat = base_Hat

        } else if (other_Hat != false) {

          alpha_Hat = other_Hat

        }

        // Mouth
        if (base_Mouth != false) {

          alpha_Mouth = base_Mouth

        } else if (other_Mouth != false) {

          alpha_Mouth = other_Mouth

        }

        thisPlace = 'frogContainer4';
        var thisPlace_div = document.getElementById(thisPlace)
        thisPlace_div.style.background = 'transparent'
        thisPlace_div.innerHTML = ''

        console.log('--- Final Frog Metadata ---')
        if (alpha_Frog != false) { load_trait("Frog", alpha_Frog, thisPlace); console.log('Frog: '+alpha_Frog);} else if (alpha_SpecialFrog != false) { load_trait("SpecialFrog", alpha_SpecialFrog, thisPlace); console.log('SpecialFrog: '+alpha_SpecialFrog);}
        if (alpha_Trait != false) { load_trait("Trait", alpha_Trait, thisPlace); console.log('Trait: '+alpha_Trait);}
        if (alpha_Accessory != false) { load_trait("Accessory", alpha_Accessory, thisPlace); console.log('Accessory: '+alpha_Accessory);}
        if (alpha_Eyes != false) { load_trait("Eyes", alpha_Eyes, thisPlace); console.log('Eyes: '+alpha_Eyes);}
        if (alpha_Hat != false) { load_trait("Hat", alpha_Hat, thisPlace); console.log('Hat: '+alpha_Hat);}
        if (alpha_Mouth != false) { load_trait("Mouth", alpha_Mouth, thisPlace); console.log('Mouth: '+alpha_Mouth);}

      }

      
      // Load Fresh Frog
      function load_token(token) {

        openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
        etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token

        newFrog = document.createElement("div")
        newFrog.onclick = function() { 
          if (!morph) { display_token(token); } else { sub_frog = token; combineTokens(base_frog, sub_frog); document.getElementById('baseText').innerHTML = 'Frog #'+sub_frog; }
        }
        newFrog.id = token
        newFrog.className = 'frogPanel'
        newFrog.innerHTML = '<a style="margin-bottom" 0px !important;  display: inline !important;" class="smallContainer2 pointer2" id="Frog #'+token+'"><img class="frogImg3" src="https://freshfrogs.github.io/frog/'+token+'.png"/></a>'+'<p class="attributeList" id="Frog #'+token+'Desc"></p>'
        document.getElementById("thePad").appendChild(newFrog)

        document.getElementById('Frog #'+token+'Desc').innerHTML = '<a class="pointer" href="'+openSeaLink+'" target="_blank" style="image-rendering: auto !important; display: inline !important;">'+'<b><u>Frog #'+token+'</u></b> ↗️'+'</a>';

      }


      // Manually check Frog transactions
      async function load_ownedFrogs_manual() {

          consoleOutput('<br>'+'<strong>Connected!</strong> Could not talk to OpenSea! <br>Loading Frogs from IPFS... <b id="progress"></b><div id="myProgress"><div id="myBar"></div></div><br>')

          let this_user = userAddress;

          console.log('Checking Frogs Manually.. for user...'+this_user)

          document.getElementById("thePad").innerHTML = ''

          try {

              let ownedFrogs = await collection.methods.balanceOf(this_user).call()

              if (ownedFrogs <= 0) { // ❌ No FROGS
                  console.log("It seems you do not own any FROGS!")
                  return
              }

              var thisToken = loaded = 0;

              while(true) {

                  if (loaded >= ownedFrogs) {
                    break
                  }

                  thisToken++

                  // Progress Bar!
                  percent = parseInt((thisToken/nextIdC)*100);
                  document.getElementById("progress").innerHTML = percent+"%"
                  elem = document.getElementById("myBar");
                  width = percent
                  width++;
                  elem.style.width = width + "%";

                  let owner = await collection.methods.ownerOf(thisToken).call()

                  if (this_user === owner.toLowerCase()) {

                      load_token(thisToken);
                      loaded = loaded + 1
                      openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+thisToken
                      document.getElementById('Frog #'+thisToken+'Desc').innerHTML = '<a class="pointer" href="'+openSeaLink+'" target="_blank" style="image-rendering: auto !important; display: inline !important;">'+'<b><u>'+'Frog #'+thisToken+'</u></b> ↗️'+'</a>';

                      //Load Metadata
                      let tokenURI = await collection.methods.tokenURI(thisToken).call()
                      let cid = tokenURI.replace("ipfs://", "")
                      let ipfsGatewayURI = "https://ipfs.io/ipfs/" + cid

                      var metadata = await (await fetch(ipfsGatewayURI)).json();
                      for (var i = 0; i < metadata.attributes.length; i++){
                          var data = metadata.attributes[i]

                          //console.log(data.trait_type+": "+data.value)
                          trait_type = trait = data.trait_type
                          value = attribute = data.value
                          trait_rarity = 'n'
                          
                          let here = 'Frog #'+thisToken

                          load_trait(trait_type, value, here)

                          newAttribute = document.createElement('text') // <b><i class="trait">'+rarity+'%</i></b>
                          if (trait_type == 'Trait') { newAttribute.innerHTML = value + ' trait <b><i class="trait">'+trait_rarity+'%</i></b>'; } 
                            else { newAttribute.innerHTML = value.slice(0, 13) + ' ' + '<b><i class="trait">'+trait_rarity+'%</i></b>'; }
                          newAttribute.className = value;
                          
                          space = document.createElement('br')
                          document.getElementById('Frog #'+thisToken+'Desc').appendChild(space)
                          document.getElementById('Frog #'+thisToken+'Desc').appendChild(newAttribute) 
                          
                      }
                  }
              }
              // Finish Loading Bar
              percent = 100;
              document.getElementById("progress").innerHTML = percent+"%"
              
              elem = document.getElementById("myBar");
              width = percent
              width++;
              elem.style.width = width + "%";
              consoleOutput('<br>'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(userAddress)+' ]</acc><br>'+'[ '+ownedFrogs+' ] Frogs belong to this wallet!<br>'+'<p></p>')
          } catch (e) {
              console.log("Something went wrong, refresh the page!"+e.message)
              //document.getElementById("netStatus").innerHTML = "Connect to view 'FROG' tokens... <b><i><strong>"+addressCut+' ✓</strong></i></b>'+'<br>Compiling... ❌ '+loadedFrogs+'/'+ownedFrogs+' FROG(s) loaded!'+'<br><input type="text" class="myProgress" id="frogIndex" onkeyup="frogIndexer()" placeholder="Search by TokenID">'
          }
      }

      // Fetch Random Tokens
      async function fetch_random_tokens(how_many) {

        const options = {method: 'GET'};

        for (var i = 1; i < how_many; i++) {

          frog = getRandomInt(i, nextIdC)

          fetch('https://api.opensea.io/api/v1/asset/'+CONTRACT_ADDRESS+'/'+frog+'/?include_orders=false', options)
          .then(response => response.json())
          .then(frog => {
            var { name, token_metadata, permalink, traits, external_link, token_id } = frog
            
            load_token(token_id);

            fetch(token_metadata)
            .then((metadata) => metadata.json())
            .then((metadata) => {
              // Loop Attributes
              for (var i = 0; i < metadata.attributes.length; i++){
                //console.log(metadata.attributes[i]);

                // Trait_Type : Value
                var attribute = metadata.attributes[i] // attribute.trait_type / attribute.value
                let trait_type = attribute.trait_type
                let value = attribute.value

                try { var trait_rarity = ((traits_list[trait_type][value.toLowerCase()] / 4040) * 100).toFixed(0); } catch (e) {trait_rarity = 'i';}
                
                if (trait_rarity == 'NaN' || trait_rarity < 1) { trait_rarity = '<1' }

                // Build Fresh Frogs Attributes
                load_trait(trait_type, value, frog.name)
                newAttribute = document.createElement('text') // <b><i class="trait">'+rarity+'%</i></b>
                if (trait_type == 'Trait') { newAttribute.innerHTML = value + ' trait <b><i class="trait">'+trait_rarity+'%</i></b>'; } 
                  else { newAttribute.innerHTML = value.slice(0, 13) + ' ' + '<b><i class="trait">'+trait_rarity+'%</i></b>'; }
                newAttribute.className = value;
                space = document.createElement('br')
                //document.getElementById('Frog #'+token_id+'Desc').appendChild(space)
                //document.getElementById('Frog #'+token_id+'Desc').appendChild(newAttribute)
                
              }
            })

          })
          .catch(err => console.error(err));

        }

      }

      // Fetch Tokens
      async function fetch_tokens(from_address) {

        // Pull Collection data from OpenSea

        const options = {method: 'GET', headers: {'X-API-KEY': '1b80881e422a49d393113ede33c81211'}};

        fetch('https://api.opensea.io/api/v1/collection/fresh-frogs', options)
        .then(collection => collection.json())
        .then(collection => {

            var { collection: { banner_image_url, created_date, description, dev_seller_fee_basis_points, external_url, featured_image_url, name, payout_address, traits, stats: { floor_price, market_cap, total_volume, count, num_owners } } } = collection

            traits_list = traits;

        })
        .catch(e => {

            console.log('Error: Could not get Collection data from Opensea.');
            console.error('Error : ' + e.message)
      
        }); // End data pull / first paid Frog 3,236

        fetch('https://api.opensea.io/api/v1/assets?owner='+from_address+'&order_direction=desc&asset_contract_address=0xBE4Bef8735107db540De269FF82c7dE9ef68C51b&limit=50&include_orders=false', options)
        .then((res) => res.json())
        .then((res) => {
          loaded = 0;
          var { assets } = res
          assets.forEach((frog) => {

            // Progress Bar!
            loaded = loaded + 1;
            percent = parseInt((loaded/ownedFrogs)*100);
            document.getElementById("progress").innerHTML = percent+"%"
            elem = document.getElementById("myBar");
            width = percent
            width++;
            elem.style.width = width + "%";

            var { name, token_metadata, permalink, traits, external_link, token_id } = frog

            load_token(token_id);

            fetch(token_metadata)
            .then((metadata) => metadata.json())
            .then((metadata) => {
              // Loop Attributes
              for (var i = 0; i < metadata.attributes.length; i++){
                //console.log(metadata.attributes[i]);

                // Trait_Type : Value
                var attribute = metadata.attributes[i] // attribute.trait_type / attribute.value
                let trait_type = attribute.trait_type
                let value = attribute.value

                try { var trait_rarity = ((traits_list[trait_type][value.toLowerCase()] / 4040) * 100).toFixed(0); } catch (e) {trait_rarity = 'i'}
                
                if (trait_rarity == 'NaN' || trait_rarity < 1) { trait_rarity = '<1' }

                // Build Fresh Frogs Attributes
                load_trait(trait_type, value, frog.name)
                newAttribute = document.createElement('text') // <b><i class="trait">'+rarity+'%</i></b>
                if (trait_type == 'Trait') { newAttribute.innerHTML = value + ' trait <b><i class="trait">'+trait_rarity+'%</i></b>'; } 
                  else { newAttribute.innerHTML = value.slice(0, 13) + ' ' + '<b><i class="trait">'+trait_rarity+'%</i></b>'; }
                newAttribute.className = value;
                space = document.createElement('br')
                document.getElementById('Frog #'+token_id+'Desc').appendChild(space)
                document.getElementById('Frog #'+token_id+'Desc').appendChild(newAttribute)
                
              }
            })

          })

          // Finish Loading Bar
          percent = 100;
          document.getElementById("progress").innerHTML = percent+"%"
          elem = document.getElementById("myBar");
          width = percent
          width++;
          elem.style.width = width + "%";
          consoleOutput('<br>'+'<strong>Connected!</strong> <acc style="color: #333 !important;">[ '+truncateAddress(userAddress)+' ]</acc><br>'+'[ '+ownedFrogs+' ] Frogs belong to this wallet!<br>'+'<strong class="pointer" onclick="load_ownedFrogs_manual()"><u>Check via IPFS</u> 🔃</strong>'+'<p></p>')

        })
        .catch(e => {

          console.log(e.message);
          console.log('Error: Could not get Collection data from Opensea.');
          consoleOutput('<br>'+'<strong>Connected!</strong> Could not talk to OpenSea! <br>Loading Frogs from IPFS... <b id="progress"></b><div id="myProgress"><div id="myBar"></div></div><br>')
          load_ownedFrogs_manual()
      
        });
      }

      // Truncate Address
      function truncateAddress(address) {
        if (!address) {
          return "";
        }
        return `${address.substr(0, 5)}...${address.substr(
          address.length - 5,
          address.length
        )}`;
      }


      // Load Trait
      function load_trait(trait, attribute, where) {
        newAttribute = document.createElement("img")
        newAttribute.href = "https://opensea.io/collection/fresh-frogs?search[sortAscending]=true&search[sortBy]=PRICE&search[stringTraits][0][name]="+trait+"&search[stringTraits][0][values][0]="+attribute
        newAttribute.id = attribute
        newAttribute.target = "_blank"
        if (where == 'frogContainer4') {
          newAttribute.className = "frogImg4" //shadesAnimation
        } else {
          newAttribute.className = "frogImg2" //shadesAnimation
        }
        
        newAttribute.style.cursor = "pointer"
        if (attribute === "smoking" || attribute === "smokingPipe" || attribute === "smokingCigar") { 
          newAttribute.src = "https://freshfrogs.github.io/the-pad/"+trait+"/"+attribute+"2.gif"
        } else if (attribute === "morphAnimation") {
          newAttribute.src = "https://freshfrogs.github.io/the-pad/Frog/loadMorph.gif"
        } else if (attribute === "shadesAnimation") {
          newAttribute.src = "https://freshfrogs.github.io/the-pad/Eyes/shadesAnimation.gif"
        } else if (attribute.includes("croaking2")) {
          console.log('! '+trait+' / '+attribute)
          newAttribute.src = "https://freshfrogs.github.io/the-pad/"+trait+"/"+attribute+".gif"
        } else {
          newAttribute.src = "https://freshfrogs.github.io/the-pad/"+trait+"/"+attribute+".png"
        }
        newAttribute.alt = attribute
        document.getElementById(where).appendChild(newAttribute)
      }

      // Select Frog
      async function display_token(token){

          display_frog = 'https://freshfrogs.github.io/frog/'+token+'.png'
          display_name = 'Frog #'+token
          display_os = ''

          document.getElementById('thisheader').style.backgroundImage = 'url('+display_frog+')';
          document.getElementById('thisheader').style.backgroundSize = "2048px 2048px";

          document.getElementById('previewImg').setAttribute('src', display_frog)
          document.getElementById('display_name').innerHTML = display_name

          openSeaLink = 'https://opensea.io/assets/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
          etherscanLink = 'https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+token
          document.getElementById('selectSub').setAttribute('href', openSeaLink)
          document.getElementById('selectBase').innerHTML = '<strong>Morph</strong><frog id="baseText">two Frogs!</frog>'
          document.getElementById('selectBase').onclick = function() {
            if (!morph) {
              base_frog = token
              morph = true;
              document.getElementById('baseText').innerHTML = 'select frog!'
            } else if (morph) {
              alert('Create new custom Frog on Ethereum! Coming soon!')
              console.log('Frog Morph')
              console.log('Frog #'+base_frog)
              console.log('Frog #'+sub_frog)
            } 

          }

          let token_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token+".json")).json();
          for (var i = 0; i < token_metadata.attributes.length; i++){
              var data = token_metadata.attributes[i]
              //load_trait(data.trait_type, data.value, 'subDisplay')
              if (data.trait_type == 'Frog' || data.trait_type == 'SpecialFrog') {
                document.getElementById('display_type').innerHTML = data.value.slice(0, 10)+'..'
              }
          }
      }