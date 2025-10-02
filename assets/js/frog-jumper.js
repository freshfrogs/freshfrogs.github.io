(async function(){
  const $ = (id)=>document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  let provider, signer, user, contract;
  let layersCache = {}; // tokenId -> composed ImageBitmap
  let best = Number(localStorage.getItem('frogjumper_best')||0);
  $('bestScore').textContent = best;

  // ---- Wallet connect + owned tokens ----
  $('connectBtn').onclick = async () => {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    user = await signer.getAddress();
    $('addr').textContent = user;
    contract = new ethers.Contract(COLLECTION_ADDRESS, ABI_ENUMERABLE, provider);

    const bal = Number(await contract.balanceOf(user));
    const sel = $('frogSelect'); sel.innerHTML = '';
    for (let i=0;i<bal;i++){
      const id = (await contract.tokenOfOwnerByIndex(user,i)).toString();
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = `Frog #${id}`;
      sel.appendChild(opt);
    }
    if (bal>0) await showPreview(sel.value);
  };

  $('frogSelect').onchange = (e)=> showPreview(e.target.value);

  async function showPreview(id){
    const bmp = await composeFrog(id);
    const pv = $('frogPreview');
    const c = document.createElement('canvas'); c.width=128; c.height=128;
    const pctx = c.getContext('2d'); pctx.imageSmoothingEnabled=false;
    pctx.drawImage(await bmp, 0,0,128,128);
    pv.innerHTML = ''; pv.appendChild(c);
  }

  // ---- Compose frog from metadata layers (client-side) ----
  async function composeFrog(id){
    if (layersCache[id]) return layersCache[id];
    const meta = await (await fetch(`${FROG_BASE}/json/${id}.json`, {cache:'no-store'})).json();
    // Assume meta.image layers are named in attributes order (you already maintain this)
    // If your metadata only has a single PNG, you can just load that one image instead.
    const layerUrls = extractLayerUrls(meta); // implement for your metadata shape
    const off = new OffscreenCanvas(128,128), octx = off.getContext('2d', {alpha:true});
    octx.imageSmoothingEnabled=false;
    for (const url of layerUrls){
      const img = await loadImage(url);
      octx.drawImage(img,0,0,128,128);
    }
    const bmp = off.transferToImageBitmap();
    layersCache[id] = bmp;
    return bmp;
  }

  function extractLayerUrls(meta){
    // Example fallback: if meta.image is already a PNG path, just return that
    if (meta.image && !meta.image.startsWith('ipfs://') && meta.image.endsWith('.png')) {
      return [`${meta.image}`.replace(/^\.?\//,'../')];
    }
    // Otherwise build from attributes you store; adjust to your schema.
    // Placeholder: return a base + body combo as an example.
    const base = `${FROG_BASE}/layers/base.png`;
    const body = `${FROG_BASE}/layers/body/${attr(meta,'Body')}.png`;
    return [base, body];
  }
  function attr(meta, key){
    const a = meta.attributes?.find(a=>a.trait_type===key);
    return a ? a.value : 'Default';
  }
  function loadImage(url){
    return new Promise((res,rej)=>{
      const img = new Image(); img.crossOrigin='anonymous';
      img.onload=()=>res(img); img.onerror=rej; img.src=url;
    });
  }

  // ---- Game state ----
  const G = {
    running:false, t:0, score:0,
    frog:{x:20, y:96, vy:0, onGround:true, jumps:0, maxJumps:1, speed:1.0},
    obstacles:[]
  };

  // Trait → stat mapping (adjust to your collection)
  function applyTraits(meta){
    G.frog.maxJumps = (attr(meta,'Hat')==='Propeller') ? 2 : 1;
    G.frog.speed = (attr(meta,'Background')==='Swamp') ? 1.15 : 1.0;
  }

  $('startBtn').onclick = async ()=>{
    const id = $('frogSelect').value;
    if (!id) return;
    const meta = await (await fetch(`${FROG_BASE}/json/${id}.json`, {cache:'no-store'})).json();
    applyTraits(meta);
    G.running = true; G.t=0; G.score=0;
    G.obstacles = [];
    loop();
  };

  // Input
  window.addEventListener('keydown', (e)=>{
    if (e.code==='Space' || e.code==='ArrowUp'){
      if (G.frog.onGround || G.frog.jumps < G.frog.maxJumps){
        G.frog.vy = -3.2;
        G.frog.onGround=false;
        G.frog.jumps++;
      }
      e.preventDefault();
    }
  }, {passive:false});

  // Main loop
  function loop(){
    if (!G.running) return;
    update(); draw();
    requestAnimationFrame(loop);
  }

  function update(){
    G.t++;
    // Gravity
    G.frog.vy += 0.18;
    G.frog.y += G.frog.vy;
    if (G.frog.y >= 96){ G.frog.y=96; G.frog.vy=0; G.frog.onGround=true; G.frog.jumps=0; }
    // Spawn obstacles
    if (G.t % Math.floor(90 / G.frog.speed) === 0){
      G.obstacles.push({x:240, y:104, w:8, h:8, vx: - (1.5 * G.frog.speed)});
    }
    // Move obstacles & collide
    for (const o of G.obstacles){ o.x += o.vx; }
    G.obstacles = G.obstacles.filter(o=>o.x>-16);
    for (const o of G.obstacles){
      if (intersect(20, G.frog.y, 12,12, o.x,o.y,o.w,o.h)) endRun();
    }
    G.score += 1 * G.frog.speed;
  }

  function intersect(x1,y1,w1,h1,x2,y2,w2,h2){
    return !(x1+w1<x2 || x2+w2<x1 || y1+h1<y2 || y2+h2<y1);
  }

  async function draw(){
    // Clear
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle = '#0b0f14'; ctx.fillRect(0,0,240,120);
    // Ground
    ctx.fillStyle = '#1a2330'; ctx.fillRect(0,108,240,12);
    // Frog (draw layered bitmap scaled to 12x12)
    const id = $('frogSelect').value;
    if (id){
      const bmp = await composeFrog(id);
      ctx.drawImage(bmp, 0,0,128,128, G.frog.x, G.frog.y-12, 12,12);
    }
    // Obstacles
    ctx.fillStyle = '#88ee88';
    for (const o of G.obstacles) ctx.fillRect(o.x,o.y,o.w,o.h);
    // HUD
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '8px monospace';
    ctx.fillText(`Score ${Math.floor(G.score)}`, 6,10);
  }

  function endRun(){
    G.running=false;
    const s = Math.floor(G.score);
    $('lastScore').textContent = s;
    if (s>best){ best=s; localStorage.setItem('frogjumper_best', String(s)); $('bestScore').textContent=s; }
  }
})();
