const ipfsh = require('../../index')
const cid = "bafkreia2ctix6qekb6c6q5dauvbot7nbvtxdvhj4cmeriqyajseo2gqve4"
console.log("s", cid)
let digest = ipfsh.ctod(cid)
console.log("d = ", digest)
let end = ipfsh.dtoc(digest)
console.log("e", end)
