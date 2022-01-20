---
layout: default
---

<html>
<style>
body { display: flex; flex-wrap: wrap; }
img { width: 64px; margin: 10px; }
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
    el.src= token.converted.image
    document.body.appendChild(el)
  }
})
</script>
</html>