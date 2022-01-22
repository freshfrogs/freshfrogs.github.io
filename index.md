---
layout: default
---

Fresh Frogs is a NFT collection of *4,040* randomly generated frogs that are each unique with thousands of different color combinations, traits, accessories, and more! 

Unbelievably, over 200,000 acres of rainforest are burned every day. That is over 150 acres lost every minute of every day, and 78 million acres are lost every year! A portion of every initial sale will be donated to [The Rainforest Foundation](https://rainforestfoundation.org/) via a direct transfer to their Ethereum wallet.

For every 1.00 ETH donated, two and a half acres of rainforest will be saved! More than 80 different frog species can be found in a single acre of lowland rainforest section alone! I hope that every FROG owner will be reminded of one of the many species they helped save.

```js
Please connect your Ethereum wallet...
[Download Metamask Crpyro Wallet](https://metamask.io/download/)
```
<html>
    <head>
        <style>
            body { display: flex; flex-wrap: wrap; margin: 10px;}
            .test { width: 64px; margin: 10px; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/web3/1.7.0-rc.0/web3.min.js"></script>
        <script src="https://unpkg.com/f0js/dist/f0.js"></script>
        <script>
            document.addEventListener("DOMContentLoaded", async () => {
            const f0 = new F0();
            await f0.init({
                web3: new Web3(window.ethereum),
                contract: "0x9500aEe4F34681D38D2f53C634b36b9CCc236d10",
            })
            for(let i=1; i<=42; i++) {
                let token = await f0.get(i);
                let el = document.createElement("img")
                el.src = token.converted.image
                el.class = "test"
                document.body.appendChild(el)
            }
            })
        </script>
    </head>
    <body>
    </body>
</html>