// ----- Basic setup -----
let canvas, ctx;

const WORLD = {
  width: 800,
  height: 450,
  groundY: 380
};

const keys = {};
const bullets = [];
const enemies = [];

let lastTime = 0;
let gameStarted = false;
let score = 0;

// ----- Player -----
const player = {
  x: 120,
  y: WORLD.groundY - 64,  // was -32
  w: 64,                  // was 32
  h: 64,                  // was 32
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: true,
  frame: 0,
  frameTime: 0
};


const MOVE_SPEED = 180;       // pixels per second
const JUMP_SPEED = -300;
const GRAVITY = 900;
let shotCooldown = 0;

// ----- Sprites -----
const spriteIdle = new Image();
const spriteRunR = new Image();
const spriteRunL = new Image();

let assetsLoaded = 0;
const ASSET_COUNT = 3;

function assetLoaded() {
  assetsLoaded++;
  if (assetsLoaded >= ASSET_COUNT) {
    startGame();
  }
}

// IMPORTANT: in GitHub, change these src paths to wherever you put the PNGs.
spriteIdle.onload = assetLoaded;
spriteRunR.onload = assetLoaded;
spriteRunL.onload = assetLoaded;

spriteIdle.src = "ArmyCharacterIdle.png";
spriteRunR.src = "ArmyCharacterAnimationRunRight(shaded)(runOnly).png";
spriteRunL.src = "ArmyCharacterAnimationRunLeft(shaded)(runOnly).png";

// ----- Input -----
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// ----- Game loop -----
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000; // seconds
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// ----- Update -----
let enemySpawnTimer = 0;

function update(dt) {
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
}

function updatePlayer(dt) {
  player.vx = 0;

  if (keys["ArrowLeft"] || keys["KeyA"]) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
  }
  if (keys["ArrowRight"] || keys["KeyD"]) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
  }

  if ((keys["ArrowUp"] || keys["KeyW"]) && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
  }

  // Shooting
  shotCooldown -= dt;
  if (shotCooldown <= 0 && keys["Space"]) {
    spawnBullet();
    shotCooldown = 0.25;
  }

  // Physics
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vy += GRAVITY * dt;

  // Ground collision
  if (player.y + player.h >= WORLD.groundY) {
    player.y = WORLD.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // Bounds
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WORLD.width) player.x = WORLD.width - player.w;

  // Animation
  const running = Math.abs(player.vx) > 1;
  if (running) {
    player.frameTime += dt;
    if (player.frameTime > 0.08) {
      player.frame = (player.frame + 1) % 9; // 3x3 frames
      player.frameTime = 0;
    }
  } else {
    player.frame = 0;
    player.frameTime = 0;
  }
}

function spawnBullet() {
  const speed = 400 * player.facing;
  const offsetX = player.facing === 1 ? player.w : 0;

  bullets.push({
    x: player.x + offsetX,
    y: player.y + player.h / 2 - 2,
    w: 8,
    h: 4,
    vx: speed
  });
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;

    if (b.x < -20 || b.x > WORLD.width + 20) {
      bullets.splice(i, 1);
      continue;
    }

    // Bullet vs enemy
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (rectsOverlap(b, e)) {
        enemies.splice(j, 1);
        bullets.splice(i, 1);
        score++;
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  enemySpawnTimer -= dt;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = 1.8 + Math.random() * 1.4;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x += e.vx * dt;

    if (e.x + e.w < -50) {
      enemies.splice(i, 1);
      continue;
    }

    // Enemy hits player
    if (rectsOverlap(e, player)) {
      resetGame();
      return;
    }
  }
}

function spawnEnemy() {
  enemies.push({
    x: WORLD.width + 40,
    y: WORLD.groundY - 32,
    w: 26,
    h: 32,
    vx: -110 - Math.random() * 60
  });
}

function resetGame() {
  enemies.length = 0;
  bullets.length = 0;
  player.x = 120;
  player.y = WORLD.groundY - 32;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  score = 0;
}

// ----- Draw -----
function draw() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);

  // Simple background (ground line & distant rectangles)
  drawBackground();

  // Player
  drawPlayer();

  // Bullets
  ctx.fillStyle = "#f97316";
  bullets.forEach((b) => {
    ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.w, b.h);
  });

  // Enemies
  ctx.fillStyle = "#dc2626";
  enemies.forEach((e) => {
    ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
  });

  // Score
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Score: " + score, 14, 24);
}

function drawBackground() {
  // Ground line
  ctx.strokeStyle = "#065f46";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.groundY + 0.5);
  ctx.lineTo(WORLD.width, WORLD.groundY + 0.5);
  ctx.stroke();

  // Little hills / buildings
  ctx.fillStyle = "#022c22";
  ctx.fillRect(40, WORLD.groundY - 40, 120, 40);
  ctx.fillRect(260, WORLD.groundY - 60, 100, 60);
  ctx.fillRect(480, WORLD.groundY - 50, 140, 50);
}

function drawPlayer() {
  const frameSize = 32;          // size of each frame in the spritesheet
  const drawSize  = 64;          // NEW: on-screen size

  const running = Math.abs(player.vx) > 1;

  if (!running) {
    ctx.drawImage(
      spriteIdle,
      0,
      0,
      frameSize,
      frameSize,
      Math.floor(player.x),
      Math.floor(player.y),
      drawSize,                  // was frameSize
      drawSize                   // was frameSize
    );
    return;
  }

  const sheet = player.facing === 1 ? spriteRunR : spriteRunL;
  const frame = player.frame;
  const sx = (frame % 3) * frameSize;
  const sy = Math.floor(frame / 3) * frameSize;

  ctx.drawImage(
    sheet,
    sx,
    sy,
    frameSize,
    frameSize,
    Math.floor(player.x),
    Math.floor(player.y),
    drawSize,                    // was frameSize
    drawSize                     // was frameSize
  );
}

// Rectangle collision helper
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + (a.w || 0) > b.x &&
    a.y < b.y + b.h &&
    a.y + (a.h || 0) > b.y
  );
}

// ----- Boot -----
window.addEventListener("load", () => {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
   ctx.imageSmoothingEnabled = false;
});
