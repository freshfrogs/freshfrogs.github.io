// ------------------------------------
// Basic setup
// ------------------------------------
let canvas, ctx;

const GAME = {
  viewWidth: 800,
  viewHeight: 450,
  groundY: 380
};

let cameraX = 0;

const keys = {};
const bullets = [];
const enemies = [];
const obstacles = [];

let nextObstacleX = 400;

let lastTime = 0;
let gameStarted = false;
let score = 0;

// ------------------------------------
// Player
// ------------------------------------
const player = {
  x: 120,               // world X
  y: GAME.groundY - 64, // world Y (top)
  w: 64,
  h: 64,
  vx: 0,
  vy: 0,
  facing: 1, // 1 = right, -1 = left
  onGround: true,
  frame: 0,
  frameTime: 0,
  muzzleActive: false,
  muzzleFrame: 0,
  muzzleTimer: 0
};

const MOVE_SPEED = 180;
const JUMP_SPEED = -300;
const GRAVITY = 900;
let shotCooldown = 0;

// ------------------------------------
// Images / sprites
// ------------------------------------
let assetsLoaded = 0;
const ASSET_COUNT = 9;

function assetLoaded() {
  assetsLoaded++;
  if (assetsLoaded >= ASSET_COUNT) startGame();
}

// Soldier base sprites
const spriteIdle = new Image();
const spriteRunR = new Image();
const spriteRunL = new Image();

// Idle+shoot sprites
const spriteShootIdleR = new Image();
const spriteShootIdleL = new Image();

// Muzzle flash spritesheet (3x3 of 32x32)
const spriteMuzzle = new Image();

// Enemy skull sprites
const skullLeft = new Image();
const skullRight = new Image();
const skullFloat = new Image();

// IMPORTANT: replace these src paths with your own when you move to GitHub
spriteIdle.onload = assetLoaded;
spriteRunR.onload = assetLoaded;
spriteRunL.onload = assetLoaded;
spriteShootIdleR.onload = assetLoaded;
spriteShootIdleL.onload = assetLoaded;
spriteMuzzle.onload = assetLoaded;
skullLeft.onload = assetLoaded;
skullRight.onload = assetLoaded;
skullFloat.onload = assetLoaded;

spriteIdle.src = "ArmyCharacterIdle.png";
spriteRunR.src = "ArmyCharacterAnimationRunRight(shaded)(runOnly).png";
spriteRunL.src = "ArmyCharacterAnimationRunLeft(shaded)(runOnly).png";
spriteShootIdleR.src = "ArmyCharacterShootingRight.png";
spriteShootIdleL.src = "ArmyCharacterShootingLeft.png";
spriteMuzzle.src = "ArmyCharacterShoot.png";

skullLeft.src = "GreenSkullMovingLeft.png";
skullRight.src = "GreenSkullMovingRight.png";
skullFloat.src = "GreenSkull floating.png";

const SOLDIER_FRAME_SIZE = 32; // in spritesheets
const SOLDIER_DRAW_SIZE = 64;

const MUZZLE_FRAME_SIZE = 32;
const MUZZLE_TOTAL_FRAMES = 9;

const SKULL_FRAME_SIZE = 50;
const SKULL_DRAW_SIZE = 64;

// ------------------------------------
// Input
// ------------------------------------
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// ------------------------------------
// Sound helper
// ------------------------------------
function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.play();
  } catch (e) {
    // ignore autoplay errors
  }
}

// ------------------------------------
// Game loop
// ------------------------------------
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// ------------------------------------
// Update
// ------------------------------------
let enemySpawnTimer = 0;

function update(dt) {
  ensureObstacles();
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);

  // Camera follows player to the right
  const targetCamX = player.x - GAME.viewWidth / 2;
  cameraX = Math.max(0, targetCamX);
}

function ensureObstacles() {
  // Generate simple ground obstacles ahead of player, endlessly
  const ahead = player.x + 2000;
  while (nextObstacleX < ahead) {
    const width = 60 + Math.random() * 60;
    const height = 24 + Math.random() * 24;
    const gap = 220 + Math.random() * 200;

    obstacles.push({
      x: nextObstacleX,
      y: GAME.groundY - height,
      w: width,
      h: height
    });

    nextObstacleX += width + gap;
  }
}

function updatePlayer(dt) {
  const prevX = player.x;
  const prevY = player.y;

  player.vx = 0;

  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const up = keys["ArrowUp"] || keys["KeyW"];

  if (left) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
  }
  if (right) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
  }

  if (up && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
    playSound("sndJump");
  }

  // Shooting
  shotCooldown -= dt;
  if (shotCooldown <= 0 && keys["Space"]) {
    spawnBullet();
    shotCooldown = 0.25;
    triggerMuzzleFlash();
    playSound("sndShoot");
  }

  // Physics integration
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vy += GRAVITY * dt;

  // Ground
  if (player.y + player.h >= GAME.groundY) {
    player.y = GAME.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // World bounds (no going left of 0)
  if (player.x < 0) player.x = 0;

  // Obstacle collisions
  for (const o of obstacles) {
    if (!rectsOverlap(player, o)) continue;

    const fromLeft = prevX + player.w <= o.x;
    const fromRight = prevX >= o.x + o.w;
    const fromTop = prevY + player.h <= o.y;
    const fromBottom = prevY >= o.y + o.h;

    if (fromTop && player.vy >= 0) {
      // Land on top
      player.y = o.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (fromLeft) {
      player.x = o.x - player.w;
    } else if (fromRight) {
      player.x = o.x + o.w;
    } else if (fromBottom) {
      player.y = o.y + o.h;
      player.vy = 0;
    }
  }

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

  // Muzzle flash animation
  if (player.muzzleActive) {
    player.muzzleTimer += dt;
    if (player.muzzleTimer > 0.05) {
      player.muzzleTimer = 0;
      player.muzzleFrame++;
      if (player.muzzleFrame >= MUZZLE_TOTAL_FRAMES) {
        player.muzzleActive = false;
      }
    }
  }
}

function triggerMuzzleFlash() {
  player.muzzleActive = true;
  player.muzzleFrame = 0;
  player.muzzleTimer = 0;
}

function spawnBullet() {
  const speed = 400 * player.facing;
  const offsetX = player.facing === 1 ? player.w : -8;

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

    if (b.x < cameraX - 200 || b.x > cameraX + GAME.viewWidth + 200) {
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
    enemySpawnTimer = 1.4 + Math.random() * 1.4;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x += e.vx * dt;

    const screenX = e.x - cameraX;
    if (screenX + e.w < -200 || screenX > GAME.viewWidth + 200) {
      enemies.splice(i, 1);
      continue;
    }

    // Enemy hits player
    if (rectsOverlap(e, player)) {
      playSound("sndHit");
      resetGame();
      return;
    }

    // Floater slight bobbing
    if (e.type === "floater") {
      e.bobPhase += dt * 4;
      e.y = e.baseY + Math.sin(e.bobPhase) * 6;
    }

    // Animate frames
    e.frameTime += dt;
    if (e.frameTime > 0.1) {
      e.frameTime = 0;
      e.frame = (e.frame + 1) % e.totalFrames;
    }
  }
}

function spawnEnemy() {
  const fromLeftSide = Math.random() < 0.5;
  const type = Math.random() < 0.7 ? "ground" : "floater";

  let x, vx, facing, sheet, totalFrames, y;

  if (fromLeftSide) {
    x = cameraX - 100;
    vx = 80 + Math.random() * 60;
    facing = 1;
  } else {
    x = cameraX + GAME.viewWidth + 100;
    vx = -80 - Math.random() * 60;
    facing = -1;
  }

  if (type === "ground") {
    y = GAME.groundY - SKULL_DRAW_SIZE;
    sheet = facing === 1 ? skullRight : skullLeft;
    totalFrames = 6; // 3x2
  } else {
    y = GAME.groundY - 140 - Math.random() * 60;
    sheet = skullFloat;
    totalFrames = 9; // 3x3
  }

  enemies.push({
    x,
    y,
    w: SKULL_DRAW_SIZE,
    h: SKULL_DRAW_SIZE,
    vx,
    facing,
    type,
    sheet,
    frame: 0,
    totalFrames,
    frameTime: 0,
    bobPhase: 0,
    baseY: y
  });
}

function resetGame() {
  enemies.length = 0;
  bullets.length = 0;
  obstacles.length = 0;
  nextObstacleX = 400;

  player.x = 120;
  player.y = GAME.groundY - 64;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.onGround = true;
  player.muzzleActive = false;

  cameraX = 0;
  score = 0;
}

// ------------------------------------
// Draw
// ------------------------------------
function draw() {
  ctx.clearRect(0, 0, GAME.viewWidth, GAME.viewHeight);

  drawBackground();
  drawObstacles();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawUI();
}

function drawBackground() {
  // Ground line
  ctx.strokeStyle = "#065f46";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, GAME.groundY + 0.5);
  ctx.lineTo(GAME.viewWidth, GAME.groundY + 0.5);
  ctx.stroke();

  // Simple distant shapes
  ctx.fillStyle = "#022c22";
  const cam = cameraX * 0.3; // parallax
  ctx.fillRect(40 - cam, GAME.groundY - 40, 120, 40);
  ctx.fillRect(260 - cam, GAME.groundY - 60, 100, 60);
  ctx.fillRect(480 - cam, GAME.groundY - 50, 140, 50);
}

function drawObstacles() {
  ctx.fillStyle = "#4b5563";
  for (const o of obstacles) {
    const screenX = o.x - cameraX;
    if (screenX + o.w < -50 || screenX > GAME.viewWidth + 50) continue;
    ctx.fillRect(Math.floor(screenX), Math.floor(o.y), o.w, o.h);
  }
}

function drawPlayer() {
  const running = Math.abs(player.vx) > 1;
  const screenX = Math.floor(player.x - cameraX);
  const screenY = Math.floor(player.y);

  const frame = player.frame;
  const fx = (frame % 3) * SOLDIER_FRAME_SIZE;
  const fy = Math.floor(frame / 3) * SOLDIER_FRAME_SIZE;

  if (running) {
    const sheet = player.facing === 1 ? spriteRunR : spriteRunL;
    ctx.drawImage(
      sheet,
      fx,
      fy,
      SOLDIER_FRAME_SIZE,
      SOLDIER_FRAME_SIZE,
      screenX,
      screenY,
      SOLDIER_DRAW_SIZE,
      SOLDIER_DRAW_SIZE
    );
  } else if (player.muzzleActive) {
    // Idle + shooting base sprite
    const sheet = player.facing === 1 ? spriteShootIdleR : spriteShootIdleL;
    ctx.drawImage(
      sheet,
      0,
      0,
      SOLDIER_FRAME_SIZE,
      SOLDIER_FRAME_SIZE,
      screenX,
      screenY,
      SOLDIER_DRAW_SIZE,
      SOLDIER_DRAW_SIZE
    );
  } else {
    // Regular idle
    ctx.drawImage(
      spriteIdle,
      0,
      0,
      SOLDIER_FRAME_SIZE,
      SOLDIER_FRAME_SIZE,
      screenX,
      screenY,
      SOLDIER_DRAW_SIZE,
      SOLDIER_DRAW_SIZE
    );
  }

  // Muzzle flash overlay
  if (player.muzzleActive) {
    const mFrame = player.muzzleFrame;
    const mx = (mFrame % 3) * MUZZLE_FRAME_SIZE;
    const my = Math.floor(mFrame / 3) * MUZZLE_FRAME_SIZE;
    const size = SOLDIER_DRAW_SIZE;

    if (player.facing === 1) {
      ctx.drawImage(
        spriteMuzzle,
        mx,
        my,
        MUZZLE_FRAME_SIZE,
        MUZZLE_FRAME_SIZE,
        screenX,
        screenY,
        size,
        size
      );
    } else {
      ctx.save();
      ctx.translate(screenX + size, screenY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        spriteMuzzle,
        mx,
        my,
        MUZZLE_FRAME_SIZE,
        MUZZLE_FRAME_SIZE,
        0,
        0,
        size,
        size
      );
      ctx.restore();
    }
  }
}

function drawBullets() {
  ctx.fillStyle = "#f97316";
  for (const b of bullets) {
    const screenX = b.x - cameraX;
    ctx.fillRect(Math.floor(screenX), Math.floor(b.y), b.w, b.h);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    const screenX = e.x - cameraX;
    const frame = e.frame;
    const cols = e.totalFrames === 6 ? 3 : 3;
    const sx = (frame % cols) * SKULL_FRAME_SIZE;
    const sy = Math.floor(frame / cols) * SKULL_FRAME_SIZE;

    ctx.drawImage(
      e.sheet,
      sx,
      sy,
      SKULL_FRAME_SIZE,
      SKULL_FRAME_SIZE,
      Math.floor(screenX),
      Math.floor(e.y),
      SKULL_DRAW_SIZE,
      SKULL_DRAW_SIZE
    );
  }
}

function drawUI() {
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Score: " + score, 14, 24);
}

// ------------------------------------
// Helpers
// ------------------------------------
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ------------------------------------
// Boot
// ------------------------------------
window.addEventListener("load", () => {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
});
