---
layout: default
---

<style>
input[type=text] { width: 100%; box-sizing: border-box; padding: 10px; display: block; }
button { background: royalblue; color: white; padding: 10px; margin: 5px 0; border: none; }
.mint-buttons { margin-top: 20px; }
</style>
<h2>Vending Macine</h2>
<label for="contract">Contract address</label>
<input id='contract' type='text' name='contract' placeholder='contract address' value="0xEBe70667fF075aC505f08e7BCcC210f54dE1f24b"><br>
<label for="count">How many to mint</label>
<input id='count' type='text' name='count' placeholder='how many to mint' value="3"><br>
<div class='mint-buttons'>
  <button id='mint'>Mint</button>
</div>8
<script src="https://cdn.jsdelivr.net/gh/ethereum/web3.js@3.0.0/dist/web3.min.js"></script>
<script src="https://testnet.factoria.app/f0/token_abi.js"></script>
<script src="https://unpkg.com/invitelist@0.0.2/dist/invitelist.js"></script>
<script src="https://unpkg.com/ipfsh@0.0.2/dist/ipfsh.min.js"></script>
<script>
var web3 = new Web3(window.ethereum);
class Vendingmachine {
  constructor () {
    document.querySelector("#contract").addEventListener("input", async (e) => {
      await this.build()
    })
    document.querySelector("#mint").addEventListener("click", async (e) => {
      let publicInviteKey = "0x0000000000000000000000000000000000000000000000000000000000000000"
      let invite = await this.collection.methods.invite(publicInviteKey).call()
      console.log("invite", invite)
      let count = parseInt(document.querySelector("#count").value)
      let cost = parseInt(invite.price) * count;
      await this.mint(
        { key: publicInviteKey, proof: [] },
        count,
        cost
      );
    })  
  }
  async account () {
    let _res = await window.ethereum.send('eth_requestAccounts');
    return _res.result[0];
  }
  async build () {
    let contract_address = document.querySelector("#contract").value
    this.collection = new web3.eth.Contract(token_abi, contract_address);
  }
  async mint (auth, count, cost) {
    let account_address = await this.account();
    let tx = await this.collection.methods.mint(auth, count).send({
      from: account_address,
      value: "" + cost
    })
    console.log("tx")
  }
}
const machine = new Vendingmachine()
machine.build()