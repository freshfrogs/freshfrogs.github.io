// ESM import (sidesteps SES/global window issues)
import {
  BrowserProvider,
  Contract
} from 'https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js';

/** ====== CONFIG (edit these) ====== */
const COLLECTION_ADDRESS = '0xYOUR_FROG_ERC721'; // <-- set to your ERC-721 address
// Where your frog images + metadata live (adjust if your repo paths differ)
const FROG_BASE = '../frog'; // expects ../frog/json/{id}.json and pngs in ../frog/png/{id}.png (or adjust extractLayerUrls)
const ABI_ENUMERABLE = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)"
];
/** ================================= */

const $ = (id) => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');

let provider, signer, user, contract;
let layersCache = {}; // tokenId -> ImageBitmap
let best = Number(localStorage.getItem('frogjumper_best') || 0);
$('bestScore').textContent = best;
const setMsg = (t) => $('msg').textContent = t || '';

/* ---------------- Wallet / Owned Tokens ---------------- */
$('connectBtn').onclick = connect;

async function connect() {
  try {
    if (!window.ethereum) {
      setMsg('No wallet detected. Install MetaMask or a compatible wallet.');
      return;
    }
    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    user = await signer.getAddress();
    $('addr').textContent = truncate(user);

    contract = new Contract(COLLECTION_ADDRESS, ABI_ENUMERABLE, provider);
    const bal = Number(await contract.balanceOf(user));

    const sel = $('frogSelect'); sel.innerHTML = '';
    if (bal === 0) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = 'No frogs found in this wallet';
      sel.appendChild(opt);
      setMsg('If your collection is non-enumerable, wire your existing “owned frogs” fetch here.');
      return;
    }

    for (let i = 0; i < bal; i++) {
      const id = (await contract.tokenOfOwnerByIndex(user, i)).toString();
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = `Frog #${id}`;
      sel.appendChild(opt);
    }
    await showPreview(sel.value);
    setMsg('');
  } catch (err) {
    console.error(err);
    setMsg('Connect failed. See console for details.');
  }
}

$('frogSelect').onchange = (e) => showPreview(e.target.value);

async function showPreview(id) {
  if (!id) { $('frogPreview').innerHTML = ''; return; }
  try {
    const bmp = await composeFrog(id);
    const pv = $('frogPreview');
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const pctx = c.getContext('2d'); pctx.imageSmoothingEnabled = false;
    pctx.drawImage(await bmp, 0, 0, 128, 128);
    pv.innerHTML = ''; pv.appendChild(c);
  } catch (e) {
    console.error(e);
    setMsg('Preview failed to load. Check metadata/image paths.');
  }
}

/* ---------------- Image Composition ---------------- */
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

async function composeFrog(id) {
  if (layersCache[id]) return layersCache[id];

  // Load metadata (adjust if your files live elsewhere)
  const metaUrl = `${FROG_BASE}/json/${id}.json`;
  const meta = await (await fetch(metaUrl, { cache: 'no-store' })).json();

  const layerUrls = extractLayerUrls(meta, id); // customize this to your schema
  const off = makeCanvas(128, 128);
  const octx = off.getContext('2d', { alpha: true });
  octx.imageSmoothingEnabled = false;

  for (const url of layerUrls) {
    const img = await loadImage(url);
    octx.drawImage(img, 0, 0, 128, 128);
  }

  const bmp = (off.transferToImageBitmap)
    ? off.transferToImageBitmap()
    : await createImageBitmap(off);

  layersCache[id] = bmp;
  return bmp;
}

/**
 * Customize this for your metadata.
 * Easy mode: if metadata has a single PNG at meta.image and you store it under /frog/png/{id}.png
 * you can just return that. Otherwise, build from layers following your attribute order.
 */
function extractLayerUrls(meta, id) {
  // If your JSON already points to the final PNG:
  if (meta?.image) {
    // Handle ipfs:// and site-relative URLs
    if (meta.image.startsWith('ipfs://')) {
      // Add a public IPFS gateway or your own; example below uses Cloudflare
      const gateway = 'https://cloudflare-ipfs.com/ipfs/';
      return [ meta.image.replace('ipfs://', gateway) ];
    }
    if (/^https?:\/\//.test(meta.image)) return [meta.image];
    // Relative path in repo
    return [normalizeRel(meta.image)];
  }

  // Fallback: assume /frog/png/{id}.png exists
  return [`${FROG_BASE}/png/${id}.png`];

  // If you need proper layer-by-layer composition based on traits, replace the
  // above with something like:
  // const order = meta.attributes?.map(a => a.value) ?? [];
  // return order.map(name => `${FROG_BASE}/layers/${name}.png`);
}

function normalizeRel(p) {
  // Ensure paths like "./frog/png/12.png" work from games/ page
  return p.replace(/^\.?\//, '../');
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    // For same-origin GitHub Pages assets this is safe; keep to avoid CORS hassles if you move to a CDN.
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = (e) => rej(new Error(`Failed to load image ${url}`));
    img.src = url;
  });
}

function attr(meta, key) {
  const a = meta?.attributes?.find(a => a.trait_type === key);
  return a ? a.value : undefined;
}

/* ---------------- Game Logic ---------------- */
const G = {
  running: false, t: 0, score: 0,
  frog: { x: 20, y: 96, vy: 0, onGround: true, jumps: 0, maxJumps: 1, speed: 1.0 },
  obstacles: []
};

// Map traits to gameplay tweaks (adjust to your collection’s schema)
function applyTraits(meta) {
  // Example mappings; customize these:
  G.frog.maxJumps = (attr(meta, 'Hat') === 'Propeller' || attr(meta, 'Headwear') === 'Propeller') ? 2 : 1;
  G.frog.speed = (attr(meta, 'Background') === 'Swamp') ? 1.15 : 1.0;
}

$('startBtn').onclick = startGame;

async function startGame() {
  const id = $('frogSelect').value;
  if (!id) { setMsg('Select a frog you own.'); return; }
  try {
    const meta = await (await fetch(`${FROG_BASE}/json/${id}.json`, { cache: 'no-store' })).json();
    applyTraits(meta);
    G.running = true; G.t = 0; G.score = 0;
    G.obstacles = [];
    setMsg('');
    loop();
  } catch (e) {
    console.error(e);
    setMsg('Could not start game (metadata issue).');
  }
}

// Input
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (G.frog.onGround || G.frog.jumps < G.frog.maxJumps) {
      G.frog.vy = -3.2;
      G.frog.onGround = false;
      G.frog.jumps++;
    }
    e.preventDefault();
  }
}, { passive: false });

// Main loop
function loop() {
  if (!G.running) return;
  update(); draw();
  requestAnimationFrame(loop);
}

function update() {
  G.t++;

  // Gravity
  G.frog.vy += 0.18;
  G.frog.y += G.frog.vy;
  if (G.frog.y >= 96) { G.frog.y = 96; G.frog.vy = 0; G.frog.onGround = true; G.frog.jumps = 0; }

  // Spawn obstacles
  if (G.t % Math.floor(90 / G.frog.speed) === 0) {
    G.obstacles.push({ x: 240, y: 104, w: 8, h: 8, vx: -(1.5 * G.frog.speed) });
  }

  // Move obstacles & cull
  for (const o of G.obstacles) o.x += o.vx;
  G.obstacles = G.obstacles.filter(o => o.x > -16);

  // Collisions
  for (const o of G.obstacles) {
    if (intersect(20, G.frog.y, 12, 12, o.x, o.y, o.w, o.h)) {
      endRun();
      break;
    }
  }

  // Score
  G.score += 1 * G.frog.speed;
}

function intersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
}

async function draw() {
  // Clear
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, 240, 120);
  // Ground
  ctx.fillStyle = '#1a2330'; ctx.fillRect(0, 108, 240, 12);

  // Frog sprite (12x12 scaled from 128x128)
  const id = $('frogSelect').value;
  if (id) {
    const bmp = await composeFrog(id);
    ctx.drawImage(bmp, 0, 0, 128, 128, G.frog.x, G.frog.y - 12, 12, 12);
  }

  // Obstacles
  ctx.fillStyle = '#88ee88';
  for (const o of G.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);

  // HUD
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '8px monospace';
  ctx.fillText(`Score ${Math.floor(G.score)}`, 6, 10);
}

function endRun() {
  G.running = false;
  const s = Math.floor(G.score);
  $('lastScore').textContent = s;
  if (s > best) { best = s; localStorage.setItem('frogjumper_best', String(s)); $('bestScore').textContent = s; }
}

/* ---------------- Helpers ---------------- */
function truncate(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
