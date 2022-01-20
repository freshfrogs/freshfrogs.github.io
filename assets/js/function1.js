const f0 = new F0()
const web3= new Web3(window.ethereum)
const template = Handlebars.compile(document.querySelector("#template").innerHTML);
document.addEventListener("DOMContentLoaded", async () => {
  let config = await fetch("box.json").then((r) => {
    return r.json()
  })
  let net = await web3.eth.getChainId()
  console.log("net = ", net)
  await window.ethereum.send('eth_requestAccounts');
  try {
    await f0.init({
      web3: web3,
      contract: config.contract,
      network: config.network
    })
    const name = await f0.name()
    const symbol = await f0.symbol()
    const placeholder = await f0.placeholder()
    const invites = await f0.myInvites()
    document.querySelector(".box").innerHTML = template({
      title: `${name} (${symbol}) Invite List`,
      image: placeholder.converted.image,
      items: Object.keys(invites).map((key, index) => {
        return {
          index: index,
          address: config.contract,
          key: key,
          eth: invites[key].condition.converted.eth,
          limit: invites[key].condition.converted.limit
        }
      })
    })
  } catch (e) {
    document.querySelector(".box").innerHTML = `<h1>${e.message.toLowerCase()}</h1>`
  }
})