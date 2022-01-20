---
layout: default
---

# Forest Frogs NFT Collection

Forest Frogs is a NFT collection of **4,040** randomly generated frogs that are each unique with thousands of different color combinations, traits, accessories, and more! 

Unbelievably, over 200,000 acres of rainforest are burned every day. That is over 150 acres lost every minute of every day, and 78 million acres are lost every year! A portion of every initial sale will be donated to [The Rainforest Foundation](https://rainforestfoundation.org/) via a direct transfer to their Ethereum wallet.

For every 1.00 ETH donated, two and a half acres of rainforest will be saved! More than 80 different frog species can be found in a single acre of lowland rainforest section alone! I hope that every FROG owner will be reminded of one of the many species they helped save.

```js
invite will codes automatically be applied
```

<html><head>
    <title>factoria</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="factoria">
    <meta name="twitter:description" content="Decentralized NFT Collection Factory">
    <meta name="twitter:image" content="https://rinkeby.factoria.app/_factoria.png">
    <meta property="og:url" content="https://rinkeby.factoria.app">
    <meta property="og:type" content="website">
    <meta property="og:title" content="factoria">
    <meta property="og:description" content="Decentralized NFT Collection Factory">
    <meta property="og:image" content="https://rinkeby.factoria.app/_factoria.png">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta2/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/ethereum/web3.js@3.0.0/dist/web3.min.js"></script>
    <link href="style.css" rel="stylesheet">
    <script src="token_abi.js"></script>
    <script src="methods.js"></script>
    <script src="hashparser.js"></script>
    <script src="page.js"></script>
    <script src="fetcher.js"></script>
    <script src="cidcleaner.js"></script>
    <script src="templates/formItems.js"></script>
    <script src="templates/cardItems.js"></script>
    <script src="templates/fillerItem.js"></script>
    <script src="templates/btnItems.js"></script>
    <script>
      var web3 = new Web3(window.ethereum)
      document.addEventListener("DOMContentLoaded", async () => {
        let token = new Token(token_abi, Params.address, web3)
        await token.init()
        let name = await token.name().call()
        let symbol = await token.symbol().call()
        let config = await token.config().call()
        let permanent = config.permanent
        let html = formItems({
          items: [{
            key: "permanent", value: permanent, editable: false
          }, {
            key: "total supply", value: config.supply, editable: false
          }]
        })
        document.querySelector(".form-items").innerHTML = html
        document.querySelector("#title").innerHTML = `${name} (${symbol})`
        document.querySelector("#address").innerHTML = Params.address
      
        let placeholderURI = "https://ipfs.io/ipfs/bafkreieqcdphcfojcd2vslsxrhzrjqr6cxjlyuekpghzehfexi5c3w55eq"
        if (config.placeholder && config.placeholder.length > 0) {
          placeholderURI = ipfshttp(config.placeholder)
        }
      
        // get placeholder image
        //let placeholderURI = `https://gateway.pinata.cloud/ipfs/${config.placeholder}`
        //let placeholderURI = `https://ipfs.io/ipfs/${config.placeholder.replace("ipfs://", "")}`
        let p = await fetch(placeholderURI).then((r) => { return r.json() })
      
        document.querySelector(".card-items").innerHTML = `<div class='filler'>
      <h3><i class="fa-solid fa-angle-up fa-flip"></i> LOADING...</h3>
      </div>`
      console.log("config", config)
      
        const page = new Page({
          config: config,
          base: "collection#address=" + Params.address,
          max: async (options) => {
            return parseInt(options.config.supply)
          },
          filter: async (start, end, options) => {
            let items = []
            if (options.config.base) {
              for(let i=start; i<end; i++) {
                let b = config.base.replace("ipfs://", "").slice(0, -1)
                //let metaURI = `https://gateway.pinata.cloud/ipfs/${b}${i}.json`
                let metaURI = `https://ipfs.io/ipfs/${b}/${i}.json`
                try {
                  let meta = await fetcher.get(metaURI).then((r) => { return r.json() })
                  //let image = "https://ipfs.io/ipfs/" + meta.image.replace("ipfs://", "")
                  let image = ipfshttp(meta.image)
                  console.log("meta", meta)
                  items.push({
                    href: `token#address=${Params.address}&tokenId=${i}`,
                    address: Params.address,
                    tokenId: i,
                    image: image,
                    placeholder: "question.png",
                    name: (meta.name || ""),
                    description: (meta.description || ""),
                    attributes: (meta.attributes || []),
                  })
                } catch (e) {
                  console.log("E", e)
                  document.querySelector(".card-items").innerHTML = fillerItem({
                    title: "IPFS folder doesn't exist",
                    message: `The baseURI ${options.config.base} does not exist. Go publish the folder and come back.`,
                    link: {
                      text: "Go",
                      path: "metadata/browse#cid=" + b,
                    }
                  })
                  return;
                }
              }
            } else {
              //let pImage = "https://ipfs.io/ipfs/" + p.image.replace("ipfs://", "")
              let pImage = ipfshttp(p.image)
              for(let i=start; i<end; i++) {
                items.push({
                  href: `token#address=${Params.address}&tokenId=${i}`,
                  address: Params.address,
                  tokenId: i,
                  image: pImage,
                  placeholder: "question.png",
                  name: (p.name || ""),
                  description: (p.description || ""),
                  attributes: (p.attributes || []),
                })
              }
            }
            return items
          },
          template: cardItems,
          el: ".card-items"
        })
        await page.get(Params.page)
      })
    </script>
    </head>
    <body class="public">
    <div class="container">
    <div class="main">
      <header class="form">
        <h1 id="title" class="align-center">ForestFrog2 (FRO2)</h1>
        <div id="address">0x9500aEe4F34681D38D2f53C634b36b9CCc236d10</div>
        <div class="form-items">  <div class="form-item ">
        <small class="margin-bottom-s">permanent</small>
          <div id="" contenteditable="false">false</div>
          </div>
      <div class="form-item ">
        <small class="margin-bottom-s">total supply</small>
          <div id="" contenteditable="false">4040</div>
          </div>
    </div>
        <div class="btns"></div>
      </header>
      <div class="card-items">
        <a class="card-item" href="token#address=0x9500aEe4F34681D38D2f53C634b36b9CCc236d10&amp;tokenId=1" data-index="index-1">
        <div class="img">
          <img src="https://ipfs.io/ipfs/QmcdUZdPeUieekmTgZv7rHnuZhojRktAKN3tDn2pZSHMvF/1.png" class="item" onerror="this.src='question.png'">
        </div>
        <div class="col">
          <div class="header">
            <h3>#1</h3>
            <h2>Frog #1</h2>
            <div class="description">Forest Frogs is an NFT collection of unique and colorful frogs that are randomly generated with thousands of different color combinations, traits, accessories, and attributes.</div>
          </div>
          <div class="attributes">
            <table class="table">
                <tbody><tr><td>Frog</td><td>treeFrog(8)</td></tr>
                <tr><td>Trait</td><td>green</td></tr>
                <tr><td>Accessory</td><td>none</td></tr>
                <tr><td>Eyes</td><td>none</td></tr>
                <tr><td>Hat</td><td>witchStraw</td></tr>
                <tr><td>Mouth</td><td>none</td></tr>
            </tbody></table>
          </div>
        </div>
      </a>
        </div>
        </div>
    </body>
</html>

