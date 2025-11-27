// snake-frog-game.js
// Frog Snake survival game for FreshFrogs.
// - Uses the same frog layering + hop behavior as scatter-frogs
// - Start with 50 frogs, no auto-respawn on death (only via buff)
// - Snake eats frogs and grows, game ends when all frogs are gone
// - Random orbs give temporary buffs when collected by frogs

(function () {
  "use strict";

  // -----------------------------
  // FROG + METADATA CONSTANTS
  // -----------------------------
  const FROG_SIZE       = 64;
  const MAX_TOKEN_ID    = 4040;
  const META_BASE       = "../frog/json/";
  const META_EXT        = ".json";
  const BUILD_BASE      = "../frog/build_files";
  const STARTING_FROGS  = 50;
  const MAX_FROGS       = 150;

  // Values that have animation variants for frogs (same as scatter-frogs.js)
  const SCATTER_ANIMATED_VALUES = new Set([
    "goldenDartFrog",
    "blueDartFrog",
    "blueTreeFrog",
    "brownTreeFrog",
    "redEyedTreeFrog",
    "tongueSpiderRed",
    "tongueSpider",
    "tongueFly",
    "croaking",
    "peace",
    "inversedEyes",
    "closedEyes",
    "thirdEye",
    "mask",
    "smoking",
    "smokingCigar",
    "smokingPipe",
    "circleShadesRed",
    "circleShadesPurple",
    "shades",
    "shadesPurple",
    "shadesThreeD",
    "shadesWhite",
    "circleNightVision",
    "yellow",
    "blue(2)",
    "blue",
    "cyan",
    "brown",
    "silverEthChain",
    "goldDollarChain"
  ]);

  // Trait types to skip (avoid backgrounds) – same as scatter-frogs.js
  const SKIP_TRAITS = new Set(["Background", "background", "BG", "Bg"]);

  const container = document.getElementById("frog-game");
  if (!container) return; // only run on the game page

  let frogs = [];
  let snake = null;
  let orbs  = [];

  let animId        = null;
  let lastTime      = 0;
  let elapsedTime   = 0;
  let gameOver      = false;
  let nextOrbTime   = 0; // seconds until next orb spawn

  // -----------------------------
  // MOUSE TRACKING (follow like scatter frogs)
  // -----------------------------
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
    follow: false // becomes true after first click
  };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("click", () => {
    if (gameOver) {
      // Click after game over → restart
      restartGame();
      return;
    }
    mouse.follow = true;
  });

  // -----------------------------
  // AUDIO
  // -----------------------------
  let audioRibbits = [];
  let audioFrogDeath = null;
  let audioSnakeEat  = null;
  let audioOrbSpawn1 = null;
  let audioOrbSpawn2 = null;
  let audioSuperSpeed = null;
  let audioSuperJump  = null;
  let audioFrogSpawn  = null;

  function initAudio() {
    audioRibbits = [
      new Audio("/snake/audio/ribbitOne.mp3"),
      new Audio("/snake/audio/ribbitTwo.mp3"),
      new Audio("/snake/audio/ribbitThree.mp3"),
      new Audio("/snake/audio/ribbitBase.mp3"),
    ];
    audioRibbits.forEach(a => a.volume = 0.8);

    audioFrogDeath = new Audio("/frogDeath.mp3");
    audioFrogDeath.volume = 0.9;

    audioSnakeEat = new Audio("/snake/munch.mp3");
    audioSnakeEat.volume = 0.7;

    audioOrbSpawn1 = new Audio("/audio/orbSpawn.mp3");
    audioOrbSpawn2 = new Audio("/audio/orbSpawnTwo.mp3");
    audioOrbSpawn1.volume = 0.8;
    audioOrbSpawn2.volume = 0.8;

    audioSuperSpeed = new Audio("/audio/superSpeed.mp3");
    audioSuperJump  = new Audio("/audio/superJump.mp3");
    audioFrogSpawn  = new Audio("/audio/frogSpawn.mp3");
    audioSuperSpeed.volume = 0.9;
    audioSuperJump.volume  = 0.9;
    audioFrogSpawn.volume  = 0.9;
  }

  function playRandomRibbit() {
    if (!audioRibbits.length) return;
    const base = audioRibbits[Math.floor(Math.random() * audioRibbits.length)];
    try {
      const clone = base.cloneNode();
      clone.volume = base.volume;
      clone.play();
    } catch (e) {}
  }

  function playFrogDeath() {
    if (!audioFrogDeath) return;
    try {
      const clone = audioFrogDeath.cloneNode();
      clone.volume = audioFrogDeath.volume;
      clone.play();
    } catch (e) {}
  }

  function playSnakeMunch() {
    if (!audioSnakeEat) return;
    try {
      const clone = audioSnakeEat.cloneNode();
      clone.volume = audioSnakeEat.volume;
      clone.play();
    } catch (e) {}
  }

  function playRandomOrbSpawnSound() {
    const choices = [audioOrbSpawn1, audioOrbSpawn2].filter(Boolean);
    if (!choices.length) return;
    const base = choices[Math.floor(Math.random() * choices.length)];
    try {
      const clone = base.cloneNode();
      clone.volume = base.volume;
      clone.play();
    } catch (e) {}
  }

  function playBuffSound(type) {
    let base = null;
    if (type === "speed") base = audioSuperSpeed;
    else if (type === "jump") base = audioSuperJump;
    else if (type === "spawn") base = audioFrogSpawn;

    if (!base) return;
    try {
      const clone = base.cloneNode();
      clone.volume = base.volume;
      clone.play();
    } catch (e) {}
  }

  // -----------------------------
  // HUD (TIMER + STATUS)
  // -----------------------------
  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.top = "10px";
  hud.style.left = "50%";
  hud.style.transform = "translateX(-50%)";
  hud.style.padding = "6px 12px";
  hud.style.borderRadius = "8px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "monospace";
  hud.style.fontSize = "14px";
  hud.style.zIndex = "100";
  hud.style.pointerEvents = "none";

  const timerLabel = document.createElement("span");
  const frogsLabel = document.createElement("span");
  frogsLabel.style.marginLeft = "12px";

  hud.appendChild(timerLabel);
  hud.appendChild(frogsLabel);
  container.appendChild(hud);

  const gameOverBanner = document.createElement("div");
  gameOverBanner.style.position = "absolute";
  gameOverBanner.style.top = "50%";
  gameOverBanner.style.left = "50%";
  gameOverBanner.style.transform = "translate(-50%, -50%)";
  gameOverBanner.style.padding = "16px 24px";
  gameOverBanner.style.borderRadius = "10px";
  gameOverBanner.style.background = "rgba(0,0,0,0.8)";
  gameOverBanner.style.color = "#fff";
  gameOverBanner.style.fontFamily = "monospace";
  gameOverBanner.style.fontSize = "18px";
  gameOverBanner.style.textAlign = "center";
  gameOverBanner.style.zIndex = "101";
  gameOverBanner.style.pointerEvents = "none";
  gameOverBanner.style.display = "none";
  gameOverBanner.innerHTML = "Game Over<br/><small>Click to play again</small>";
  container.appendChild(gameOverBanner);

  function formatTime(t) {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  }

  function updateHUD() {
    timerLabel.textContent = `Time: ${formatTime(elapsedTime)}`;
    frogsLabel.textContent = `Frogs left: ${frogs.length}`;
  }

  function showGameOver() {
    gameOverBanner.style.display = "block";
  }

  function hideGameOver() {
    gameOverBanner.style.display = "none";
  }

  // -----------------------------
  // HELPERS
  // -----------------------------
  function randInt(min, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandomTokenIds(count) {
    const set = new Set();
    while (set.size < count) {
      set.add(randInt(1, MAX_TOKEN_ID));
    }
    return Array.from(set);
  }

  // -----------------------------
  // METADATA + LAYERING
  // -----------------------------
  async function fetchMetadata(tokenId) {
    const url = `${META_BASE}${tokenId}${META_EXT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Metadata fetch failed for " + tokenId);
    return res.json();
  }

  async function loadTraitImage(traitType, value) {
    const v = String(value);
    const pngUrl = `${BUILD_BASE}/${traitType}/${v}.png`;
    const canAnimate = SCATTER_ANIMATED_VALUES.has(v);

    return new Promise((resolve) => {
      if (!canAnimate) {
        const png = new Image();
        png.decoding = "async";
        png.onload = () => resolve(png);
        png.onerror = () => resolve(null);
        png.src = pngUrl;
        return;
      }

      const gifUrl = `${BUILD_BASE}/${traitType}/animations/${v}_animation.gif`;
      const gif = new Image();
      gif.decoding = "async";
      gif.onload = () => resolve(gif);
      gif.onerror = () => {
        const png = new Image();
        png.decoding = "async";
        png.onload = () => resolve(png);
        png.onerror = () => resolve(null);
        png.src = pngUrl;
      };
      gif.src = gifUrl;
    });
  }

  async function buildLayersForFrog(frog, meta) {
    frog.el.innerHTML = "";
    frog.layers = [];

    const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];
    for (const attr of attrs) {
      const traitType = attr.trait_type;
      const value = attr.value;
      if (!traitType || typeof value === "undefined") continue;
      if (SKIP_TRAITS.has(traitType)) continue;

      const img = await loadTraitImage(traitType, value);
      if (!img) continue;

      img.alt = "";
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.imageRendering = "pixelated";

      frog.layers.push(img);
      frog.el.appendChild(img);
    }
  }

  // -----------------------------
  // FROG CREATION (same hop behavior)
  // -----------------------------
  function computeInitialPositions(width, height, count) {
    const positions = [];
    const MIN_DIST = 52;
    const margin   = 16;

    let safety = count * 80;
    while (positions.length < count && safety-- > 0) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const cx = x + FROG_SIZE / 2;
      const cy = y + FROG_SIZE / 2;

      let ok = true;
      for (const p of positions) {
        const pcx = p.x + FROG_SIZE / 2;
        const pcy = p.y + FROG_SIZE / 2;
        const dx = cx - pcx;
        const dy = cy - pcy;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) positions.push({ x, y });
    }
    return positions;
  }

  function createFrogAt(x, y, tokenId) {
    const el = document.createElement("div");
    el.className = "frog-sprite";
    el.style.position = "absolute";
    el.style.width = FROG_SIZE + "px";
    el.style.height = FROG_SIZE + "px";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.pointerEvents = "none";
    el.style.zIndex = "10";
    container.appendChild(el);

    const personalityRoll = Math.random();
    let idleMin, idleMax, hopMin, hopMax, heightMin, heightMax;

    if (personalityRoll < 0.25) {
      idleMin = 0.3; idleMax = 1.0;
      hopMin = 0.25; hopMax = 0.55;
      heightMin = 14; heightMax = 32;
    } else if (personalityRoll < 0.6) {
      idleMin = 0.8; idleMax = 3.0;
      hopMin = 0.35; hopMax = 0.7;
      heightMin = 10; heightMax = 26;
    } else {
      idleMin = 2.0; idleMax = 5.0;
      hopMin = 0.45; hopMax = 0.9;
      heightMin = 6;  heightMax = 20;
    }

    const frog = {
      tokenId,
      el,
      x,
      y,
      baseY: y,

      hopStartX: x,
      hopStartBaseY: y,
      hopEndX: x,
      hopEndBaseY: y,

      state: "idle",
      idleTime: randRange(idleMin, idleMax),
      hopTime: 0,
      hopDuration: randRange(hopMin, hopMax),
      hopHeight: randRange(heightMin, heightMax),

      idleMin,
      idleMax,
      hopDurMin: hopMin,
      hopDurMax: hopMax,
      hopHeightMin: heightMin,
      hopHeightMax: heightMax,

      layers: []
    };

    frogs.push(frog);

    fetchMetadata(tokenId)
      .then(meta => buildLayersForFrog(frog, meta))
      .catch(() => {});

    return frog;
  }

  async function createInitialFrogs(width, height) {
    frogs = [];
    const count = Math.min(STARTING_FROGS, MAX_FROGS);
    const positions = computeInitialPositions(width, height, count);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i];
      createFrogAt(pos.x, pos.y, tokenId);
    }
  }

  function spawnExtraFrogs(n) {
    if (frogs.length >= MAX_FROGS) return;
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const margin = 16;

    const toSpawn = Math.min(n, MAX_FROGS - frogs.length);
    for (let i = 0; i < toSpawn; i++) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const tokenId = randInt(1, MAX_TOKEN_ID);
      createFrogAt(x, y, tokenId);
    }
  }

  // -----------------------------
  // BUFFS
  // -----------------------------
  const SPEED_BUFF_DURATION = 8;  // seconds
  const JUMP_BUFF_DURATION  = 8;

  let speedBuffTime = 0;
  let jumpBuffTime  = 0;

  function getSpeedFactor() {
    return speedBuffTime > 0 ? 0.55 : 1.0; // smaller duration / idle time → faster movement
  }

  function getJumpFactor() {
    return jumpBuffTime > 0 ? 1.8 : 1.0; // higher hops
  }

  function applyBuff(type) {
    if (type === "speed") {
      speedBuffTime = SPEED_BUFF_DURATION;
    } else if (type === "jump") {
      jumpBuffTime = JUMP_BUFF_DURATION;
    } else if (type === "spawn") {
      const extra = randInt(1, 10);
      spawnExtraFrogs(extra);
    }
    playBuffSound(type);
  }

  function updateBuffTimers(dt) {
    if (speedBuffTime > 0) speedBuffTime = Math.max(0, speedBuffTime - dt);
    if (jumpBuffTime > 0)  jumpBuffTime  = Math.max(0, jumpBuffTime - dt);
  }

  // -----------------------------
  // FROG MOVEMENT (matches scatter-frogs, with buff multipliers)
  // -----------------------------
  function chooseHopDestination(frog, width, height) {
    let targetX = frog.x;
    let targetBaseY = frog.baseY;

    const marginY = 24;
    const marginX = 8;

    // base step distance, scaled by speed buff
    const baseMaxStep = 40;
    const maxStep = baseMaxStep * (speedBuffTime > 0 ? 1.7 : 1.0);

    let goalX = null;
    let goalY = null;

    if (mouse.follow && mouse.active) {
      goalX = mouse.x - FROG_SIZE / 2;
      goalY = mouse.y - FROG_SIZE / 2;
    }

    if (goalX !== null && goalY !== null) {
      const dx = goalX - frog.x;
      const dy = goalY - frog.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = Math.min(maxStep, dist);

      const stepX = (dx / dist) * step;
      const stepY = (dy / dist) * step;

      targetX = frog.x + stepX;
      targetBaseY = frog.baseY + stepY;
    } else {
      targetX = frog.x + randRange(-12, 12);
      targetBaseY = frog.baseY + randRange(-6, 6);
    }

    targetX = Math.max(marginX, Math.min(width - marginX - FROG_SIZE, targetX));
    targetBaseY = Math.max(
      marginY,
      Math.min(height - marginY - FROG_SIZE, targetBaseY)
    );

    frog.hopStartX = frog.x;
    frog.hopStartBaseY = frog.baseY;
    frog.hopEndX = targetX;
    frog.hopEndBaseY = targetBaseY;
  }

  function updateFrogs(dt, width, height) {
    const marginY = 24;
    const marginX = 8;

    for (const frog of frogs) {
      if (frog.state === "idle") {
        frog.idleTime -= dt;
        frog.y = frog.baseY;

        if (frog.idleTime <= 0) {
          frog.state = "hopping";
          frog.hopTime = 0;

          // hop duration, adjusted by speed buff
          const baseDur = randRange(frog.hopDurMin, frog.hopDurMax);
          frog.hopDuration = baseDur * getSpeedFactor();

          // vary hop height a bit, and apply jump buff multiplier
          const spice = Math.random();
          let hopHeight;
          if (spice < 0.1) {
            hopHeight = randRange(
              frog.hopHeightMax * 1.1,
              frog.hopHeightMax * 1.8
            );
          } else if (spice < 0.25) {
            hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }
          frog.hopHeight = hopHeight * getJumpFactor();

          chooseHopDestination(frog, width, height);
          playRandomRibbit();
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const t = Math.min(1, frog.hopTime / frog.hopDuration);

        const groundX = frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY =
          frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        const offset = -4 * frog.hopHeight * t * (1 - t);

        frog.x = groundX;
        frog.baseY = groundBaseY;
        frog.y = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";

          // idle duration, adjusted by speed buff
          const baseIdle = randRange(frog.idleMin, frog.idleMax);
          frog.idleTime = baseIdle * getSpeedFactor();

          frog.x = frog.hopEndX;
          frog.baseY = frog.hopEndBaseY;
          frog.y = frog.baseY;

          frog.x = Math.max(marginX, Math.min(width - marginX - FROG_SIZE, frog.x));
          frog.baseY = Math.max(
            marginY,
            Math.min(height - marginY - FROG_SIZE, frog.baseY)
          );
        }
      }

      frog.el.style.transform = `translate3d(${frog.x}px, ${frog.y}px, 0)`;
    }
  }

  // -----------------------------
  // ORBS (BUFF PICKUPS)
  // -----------------------------
  const ORB_RADIUS  = 12;
  const ORB_TTL     = 12; // seconds before disappearing
  const ORB_SPAWN_INTERVAL_MIN = 4;
  const ORB_SPAWN_INTERVAL_MAX = 9;

  function spawnOrbRandom(width, height) {
    if (frogs.length === 0) return;

    const marginX = 24;
    const marginY = 48;

    const x = marginX + Math.random() * (width - marginX * 2);
    const y = marginY + Math.random() * (height - marginY * 2);

    const types = ["speed", "jump", "spawn"];
    const type = types[Math.floor(Math.random() * types.length)];

    const size = ORB_RADIUS * 2;
    const el = document.createElement("div");
    el.className = "frog-orb";
    el.style.position = "absolute";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.zIndex = "20";
    el.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";

    // Small solid bright colors with shaded background
    if (type === "speed") {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #32ff9b)";
    } else if (type === "jump") {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #b857ff)";
    } else {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #ffe66b)";
    }

    container.appendChild(el);
    orbs.push({
      type,
      x,
      y,
      ttl: ORB_TTL,
      el
    });

    playRandomOrbSpawnSound();
  }

  function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      orb.ttl -= dt;

      if (orb.ttl <= 0 || !orb.el) {
        if (orb.el && orb.el.parentNode === container) {
          container.removeChild(orb.el);
        }
        orbs.splice(i, 1);
        continue;
      }

      // Simple float + fade
      const lifeT = orb.ttl / ORB_TTL;
      const bob   = Math.sin((1 - lifeT) * Math.PI * 2) * 3;
      const scale = 1 + 0.1 * Math.sin((1 - lifeT) * Math.PI * 4);

      const renderY = orb.y + bob;
      orb.el.style.transform =
        `translate3d(${orb.x - ORB_RADIUS}px, ${renderY - ORB_RADIUS}px, 0) scale(${scale})`;
      orb.el.style.opacity = String(Math.max(0, Math.min(1, lifeT + 0.2)));

      // Collision with frogs
      const ocx = orb.x;
      const ocy = orb.y;

      let collected = false;
      for (const frog of frogs) {
        const fx = frog.x + FROG_SIZE / 2;
        const fy = frog.baseY + FROG_SIZE / 2;
        const dx = fx - ocx;
        const dy = fy - ocy;
        const rad = FROG_SIZE / 2 + ORB_RADIUS;
        if (dx * dx + dy * dy <= rad * rad) {
          collected = true;
          applyBuff(orb.type);
          break;
        }
      }

      if (collected) {
        if (orb.el && orb.el.parentNode === container) {
          container.removeChild(orb.el);
        }
        orbs.splice(i, 1);
      }
    }
  }

  // -----------------------------
  // SNAKE
  // -----------------------------
  const SNAKE_SEGMENT_SIZE  = 48;
  const SNAKE_BASE_SPEED    = 90;
  const SNAKE_TURN_RATE     = Math.PI * 1.5;
  const SNAKE_SEGMENT_GAP   = 6;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS    = 40;

  function initSnake(width, height) {
    // cleanup if restarting
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (const seg of snake.segments) {
          if (seg.el && seg.el.parentNode === container) {
            container.removeChild(seg.el);
          }
        }
      }
    }

    const startX = width * 0.15;
    const startY = height * 0.5;

    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    headEl.style.position = "absolute";
    headEl.style.width = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.height = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.imageRendering = "pixelated";
    headEl.style.backgroundSize = "contain";
    headEl.style.backgroundRepeat = "no-repeat";
    headEl.style.pointerEvents = "none";
    headEl.style.zIndex = "30";
    headEl.style.backgroundImage = "url(/snake/head.png)";
    container.appendChild(headEl);

    const segments = [];
    for (let i = 0; i < SNAKE_INITIAL_SEGMENTS; i++) {
      const segEl = document.createElement("div");
      const isTail = i === SNAKE_INITIAL_SEGMENTS - 1;
      segEl.className = isTail ? "snake-tail" : "snake-body";
      segEl.style.position = "absolute";
      segEl.style.width = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering = "pixelated";
      segEl.style.backgroundSize = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      segEl.style.pointerEvents = "none";
      segEl.style.zIndex = "29";
      segEl.style.backgroundImage = isTail
        ? "url(/snake/tail.png)"
        : "url(/snake/body.png)";
      container.appendChild(segEl);

      segments.push({
        el: segEl,
        x: startX,
        y: startY
      });
    }

    const path = [];
    const maxPath = (SNAKE_INITIAL_SEGMENTS + 2) * SNAKE_SEGMENT_GAP + 2;
    for (let i = 0; i < maxPath; i++) {
      path.push({ x: startX, y: startY });
    }

    snake = {
      head: {
        el: headEl,
        x: startX,
        y: startY,
        angle: 0
      },
      segments,
      path
    };
  }

  function growSnake(extraSegments) {
    if (!snake) return;
    extraSegments = extraSegments || 1;

    for (let i = 0; i < extraSegments; i++) {
      const tailIndex = snake.segments.length - 1;
      const tailSeg = snake.segments[tailIndex];

      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.position = "absolute";
      segEl.style.width = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering = "pixelated";
      segEl.style.backgroundSize = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      segEl.style.pointerEvents = "none";
      segEl.style.zIndex = "29";
      segEl.style.backgroundImage = "url(/snake/body.png)";
      container.appendChild(segEl);

      snake.segments.splice(tailIndex, 0, {
        el: segEl,
        x: tailSeg ? tailSeg.x : snake.head.x,
        y: tailSeg ? tailSeg.y : snake.head.y
      });
    }

    const desiredPathLength =
      (snake.segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length < desiredPathLength) {
      const last = snake.path[snake.path.length - 1];
      snake.path.push({ x: last.x, y: last.y });
    }
  }

  function updateSnake(dt, width, height) {
    if (!snake) return;

    const marginX = 8;
    const marginY = 24;

    const head = snake.head;
    if (!head) return;

    // Pick nearest frog as target
    let targetFrog = null;
    let bestDist2 = Infinity;

    for (const frog of frogs) {
      if (!frog || !frog.el) continue;
      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        targetFrog = frog;
      }
    }

    // Steering
    let desiredAngle = head.angle;
    if (targetFrog) {
      const fx = targetFrog.x + FROG_SIZE / 2;
      const fy = targetFrog.baseY + FROG_SIZE / 2;
      desiredAngle = Math.atan2(fy - head.y, fx - head.x);
    } else {
      desiredAngle += (Math.random() - 0.5) * dt;
    }

    let angleDiff =
      ((desiredAngle - head.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const maxTurn = SNAKE_TURN_RATE * dt;
    if (angleDiff > maxTurn) angleDiff = maxTurn;
    if (angleDiff < -maxTurn) angleDiff = -maxTurn;
    head.angle += angleDiff;

    const speed = SNAKE_BASE_SPEED * (0.8 + Math.random() * 0.4);
    head.x += Math.cos(head.angle) * speed * dt;
    head.y += Math.sin(head.angle) * speed * dt;

    // Bounce off edges
    if (head.x < marginX) {
      head.x = marginX;
      head.angle = Math.PI - head.angle;
    } else if (head.x > width - marginX - SNAKE_SEGMENT_SIZE) {
      head.x = width - marginX - SNAKE_SEGMENT_SIZE;
      head.angle = Math.PI - head.angle;
    }
    if (head.y < marginY) {
      head.y = marginY;
      head.angle = -head.angle;
    } else if (head.y > height - marginY - SNAKE_SEGMENT_SIZE) {
      head.y = height - marginY - SNAKE_SEGMENT_SIZE;
      head.angle = -head.angle;
    }

    // Update path
    snake.path.unshift({ x: head.x, y: head.y });
    const maxPathLength =
      (snake.segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length > maxPathLength) {
      snake.path.pop();
    }

    // Render head
    head.el.style.transform =
      `translate3d(${head.x}px, ${head.y}px, 0) rotate(${head.angle}rad)`;

    // Render segments
    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      const idx = Math.min(
        snake.path.length - 1,
        (i + 1) * SNAKE_SEGMENT_GAP
      );
      const p = snake.path[idx] || snake.path[snake.path.length - 1];

      const nextIdx = Math.max(0, idx - 2);
      const q = snake.path[nextIdx] || p;
      const angle = Math.atan2(p.y - q.y, p.x - q.x);

      seg.x = p.x;
      seg.y = p.y;

      seg.el.style.transform =
        `translate3d(${seg.x}px, ${seg.y}px, 0) rotate(${angle}rad)`;
    }

    // Check collisions with frogs (no respawn here; only buff can spawn new ones)
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        playSnakeMunch();
        playFrogDeath();
        growSnake(1);
      }
    }
  }

  // -----------------------------
  // GAME LOOP
  // -----------------------------
  function endGame() {
    gameOver = true;
    showGameOver();
  }

  function restartGame() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    // Clear frogs
    for (const frog of frogs) {
      if (frog.el && frog.el.parentNode === container) {
        container.removeChild(frog.el);
      }
    }
    frogs = [];

    // Clear orbs
    for (const orb of orbs) {
      if (orb.el && orb.el.parentNode === container) {
        container.removeChild(orb.el);
      }
    }
    orbs = [];

    // Clear snake
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (const seg of snake.segments) {
          if (seg.el && seg.el.parentNode === container) {
            container.removeChild(seg.el);
          }
        }
      }
    }
    snake = null;

    elapsedTime   = 0;
    lastTime      = 0;
    gameOver      = false;
    speedBuffTime = 0;
    jumpBuffTime  = 0;
    nextOrbTime   = 0;
    mouse.follow  = false;
    hideGameOver();

    const width  = window.innerWidth;
    const height = window.innerHeight;

    createInitialFrogs(width, height).then(() => {});
    initSnake(width, height);
    updateHUD();

    animId = requestAnimationFrame(drawFrame);
  }

  function drawFrame(time) {
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!gameOver) {
      elapsedTime += dt;
      updateBuffTimers(dt);

      updateFrogs(dt, width, height);
      updateSnake(dt, width, height);
      updateOrbs(dt);

      // Orb spawn timer
      nextOrbTime -= dt;
      if (nextOrbTime <= 0) {
        spawnOrbRandom(width, height);
        nextOrbTime = randRange(ORB_SPAWN_INTERVAL_MIN, ORB_SPAWN_INTERVAL_MAX);
      }

      if (frogs.length === 0) {
        endGame();
      }
    }

    updateHUD();
    animId = requestAnimationFrame(drawFrame);
  }

  // -----------------------------
  // INIT
  // -----------------------------
  async function startGame() {
    initAudio();

    const width  = window.innerWidth;
    const height = window.innerHeight;

    await createInitialFrogs(width, height);
    initSnake(width, height);

    nextOrbTime = randRange(ORB_SPAWN_INTERVAL_MIN, ORB_SPAWN_INTERVAL_MAX);
    updateHUD();
    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("load", startGame);
})();
