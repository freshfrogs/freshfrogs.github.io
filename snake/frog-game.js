// /snake/frog-game.js
(function () {
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "./frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "./frog/build_files";
  const MAX_FROGS    = 120;

  // Values that have animation variants for scatter frogs (value strings must match metadata exactly)
  const SCATTER_ANIMATED_VALUES = new Set([
    'goldenDartFrog',
    'blueDartFrog',
    'blueTreeFrog',
    'brownTreeFrog',
    'redEyedTreeFrog',
    'tongueSpiderRed',
    'tongueSpider',
    'tongueFly',
    'croaking',
    'peace',
    'inversedEyes',
    'closedEyes',
    'thirdEye',
    'mask',
    'smoking',
    'smokingCigar',
    'smokingPipe',
    'circleShadesRed',
    'circleShadesPurple',
    'shades',
    'shadesPurple',
    'shadesThreeD',
    'shadesWhite',
    'circleNightVision',
    'crown',
    'wizardHat'
  ]);

  const container = document.getElementById("frog-bg");
  if (!container) return;

  container.classList.add("frog-scatter-container");

  const style = document.createElement("style");
  style.textContent = `
    #frog-bg.frog-scatter-container {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
      background: #7cc1ff;
    }

    .frog-sprite {
      position: absolute;
      width: ${FROG_SIZE}px;
      height: ${FROG_SIZE}px;
      image-rendering: pixelated;
      transform: translate3d(0, 0, 0);
    }

    .frog-layer {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-size: contain;
      background-position: center center;
    }

    .snake-head,
    .snake-body,
    .snake-tail {
      position: absolute;
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      pointer-events: none;
      background-repeat: no-repeat;
      background-size: contain;
      background-position: center center;
      transform-origin: 50% 50%;
      z-index: 30;
    }

    .snake-head { background-image: url("/snake/head.png"); z-index: 32; }
    .snake-body { background-image: url("/snake/body.png"); z-index: 31; }
    .snake-tail { background-image: url("/snake/tail.png"); z-index: 30; }

    .frog-buff-orb {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      z-index: 25;
    }

    body {
      background-color: #7cc1ff;
    }
  `;
  document.head.appendChild(style);

  // -----------------------------
  // Global state
  // -----------------------------
  let frogs = [];
  let orbs  = [];
  let animId = null;
  let lastTime = 0;

  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
    follow: false
  };

  const target = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  let scrollOffsetY = 0;
  let lastScrollY = window.scrollY || 0;

  // -----------------------------
  // Snake config + state
  // -----------------------------
  const SNAKE_ENABLED = container.hasAttribute("data-snake-game");
  const SNAKE_SEGMENT_SIZE = 48;
  const SNAKE_SPEED = 90;
  const SNAKE_TURN_RATE = Math.PI * 1.5;
  const SNAKE_SEGMENT_GAP = 12;
  const SNAKE_INITIAL_SEGMENTS = 10;
  const SNAKE_EAT_RADIUS = 40;

  let snake = null;
  let snakeEatSound = null;

  // -----------------------------
  // Audio
  // -----------------------------
  const FROG_JUMP_SOUNDS = [
    "audio/ribbitOne.mp3",
    "audio/ribbitTwo.mp3",
    "audio/ribbitThree.mp3",
    "audio/ribbitBase.mp3"
  ];
  const FROG_DEATH_SOUND = "audio/frogDeath.mp3";

  const BUFF_SOUND_SUPER_SPEED = "audio/superSpeed.mp3";
  const BUFF_SOUND_SUPER_JUMP  = "audio/superJump.mp3";
  const BUFF_SOUND_FROG_SPAWN  = "audio/frogSpawn.mp3";

  const ORB_SPAWN_SOUNDS = [
    "audio/orbSpawn.mp3",
    "audio/orbSpawnTwo.mp3"
  ];

  const MAX_SIMULTANEOUS_FROG_JUMPS = 6;
  const MAX_SIMULTANEOUS_FROG_DEATHS = 4;
  const activeFrogJumpSounds = [];
  const activeFrogDeathSounds = [];

  let frogJumpLastPlay = 0;
  const FROG_JUMP_MIN_INTERVAL_MS = 300;

  // -----------------------------
  // Timer
  // -----------------------------
  let gameStartTime = null;
  let gameElapsed = 0;
  let gameEnded = false;
  let timerEl = null;

  // -----------------------------
  // Buffs & orbs
  // -----------------------------
  let buffSpeedActiveUntil = 0;
  let buffJumpActiveUntil  = 0;

  const ORB_RADIUS = 9;
  const ORB_MIN_SPAWN_INTERVAL = 6;
  const ORB_MAX_SPAWN_INTERVAL = 14;
  const ORB_MAX_ON_SCREEN      = 5;

  let nextOrbSpawnAt = 0;

  function isSpeedBuffActive() {
    return SNAKE_ENABLED && gameElapsed < buffSpeedActiveUntil;
  }
  function isJumpBuffActive() {
    return SNAKE_ENABLED && gameElapsed < buffJumpActiveUntil;
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function randInt(min, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return mm + ":" + ss;
  }

  function updateTimerDisplay(totalSeconds) {
    if (!SNAKE_ENABLED || !timerEl) return;
    timerEl.textContent = "Time: " + formatTime(totalSeconds);
  }

  function playSnakeEatSound() {
    if (!snakeEatSound) return;
    try {
      snakeEatSound.currentTime = 0;
      snakeEatSound.play();
    } catch (e) {}
  }

  function playFrogJumpSound(force = false) {
    if (!SNAKE_ENABLED || !FROG_JUMP_SOUNDS.length) return;

    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!force && now - frogJumpLastPlay < FROG_JUMP_MIN_INTERVAL_MS) {
      return;
    }
    frogJumpLastPlay = now;

    if (activeFrogJumpSounds.length >= MAX_SIMULTANEOUS_FROG_JUMPS) {
      return;
    }

    const idx = Math.floor(Math.random() * FROG_JUMP_SOUNDS.length);
    const src = FROG_JUMP_SOUNDS[idx];
    const audio = new Audio(src);
    audio.volume = 0.7;

    audio.addEventListener("ended", () => {
      const i = activeFrogJumpSounds.indexOf(audio);
      if (i !== -1) activeFrogJumpSounds.splice(i, 1);
    });

    activeFrogJumpSounds.push(audio);

    try {
      audio.play();
    } catch (e) {}
  }

  function playFrogDeathSound() {
    if (!SNAKE_ENABLED || !FROG_DEATH_SOUND) return;

    if (activeFrogDeathSounds.length >= MAX_SIMULTANEOUS_FROG_DEATHS) {
      return;
    }

    const audio = new Audio(FROG_DEATH_SOUND);
    audio.volume = 0.8;

    audio.addEventListener("ended", () => {
      const i = activeFrogDeathSounds.indexOf(audio);
      if (i !== -1) activeFrogDeathSounds.splice(i, 1);
    });

    activeFrogDeathSounds.push(audio);

    try {
      audio.play();
    } catch (e) {}
  }

  function playOneShotSound(src, volume = 1.0) {
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = volume;
    try {
      audio.play();
    } catch (e) {}
  }

  // -----------------------------
  // Metadata & frog layers
  // -----------------------------
  async function loadFrogMetadata(frog) {
    try {
      const resp = await fetch(META_BASE + frog.tokenId + META_EXT);
      if (!resp.ok) return;
      const meta = await resp.json();
      applyFrogMetadata(frog, meta);
    } catch (e) {
      // ignore
    }
  }

  function applyFrogMetadata(frog, meta) {
    frog.el.innerHTML = "";

    const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];
    for (const attr of attrs) {
      const traitType = attr.trait_type;
      const value = attr.value;
      if (!traitType || value == null || value === "None") continue;

      const tStr = String(traitType);
      const vStr = String(value);

      const layer = document.createElement("div");
      layer.className = "frog-layer";

      const animated = SCATTER_ANIMATED_VALUES.has(vStr);
      let url;
      if (animated) {
        url = `${BUILD_BASE}/${tStr}/animations/${vStr}_animation.gif`;
      } else {
        url = `${BUILD_BASE}/${tStr}/${vStr}.png`;
      }

      layer.style.backgroundImage = `url("${url}")`;
      frog.el.appendChild(layer);
    }
  }

  // -----------------------------
  // Frog creation
  // -----------------------------
  function pickRandomTokenIds(count) {
    const set = new Set();
    while (set.size < count) {
      set.add(randInt(1, MAX_TOKEN_ID));
    }
    return Array.from(set);
  }

  function computeFrogPositions(width, height, desiredCount) {
    const positions = [];
    const MIN_DIST = 52;
    const margin = 16;

    let targetCount;
    if (typeof desiredCount === "number" && !isNaN(desiredCount)) {
      targetCount = Math.max(1, Math.min(MAX_FROGS, Math.floor(desiredCount)));
    } else {
      const area = width * height;
      const approxPerFrogArea = (FROG_SIZE * FROG_SIZE) * 5;
      targetCount = Math.floor(area / approxPerFrogArea);
      targetCount = Math.max(15, Math.min(MAX_FROGS, targetCount));
    }

    let safety = targetCount * 50;
    while (positions.length < targetCount && safety-- > 0) {
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

  function createFrogAtPosition(pos) {
    const x = pos.x;
    const y = pos.y;

    const el = document.createElement("div");
    el.className = "frog-sprite";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    container.appendChild(el);

    const idleMin   = 0.8;
    const idleMax   = 3.5;
    const hopMin    = 0.45;
    const hopMax    = 0.90;
    const heightMin = 18;
    const heightMax = 36;

    const frog = {
      tokenId: randInt(1, MAX_TOKEN_ID),
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

      idleMin, idleMax,
      hopDurMin: hopMin,
      hopDurMax: hopMax,
      hopHeightMin: heightMin,
      hopHeightMax: heightMax
    };

    frogs.push(frog);
    loadFrogMetadata(frog);
    return frog;
  }

  function spawnExtraFrogsRandom(count) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = 16;

    for (let i = 0; i < count && frogs.length < MAX_FROGS; i++) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      createFrogAtPosition({ x, y });
    }
  }

  async function createFrogs(width, height) {
    frogs = [];
    orbs = [];
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height, SNAKE_ENABLED ? 50 : null);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const frog = createFrogAtPosition(pos);
      frog.tokenId = tokenIds[i];
      loadFrogMetadata(frog);
    }
  }

  // -----------------------------
  // Frog animation
  // -----------------------------
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

          let hopDurMin = frog.hopDurMin;
          let hopDurMax = frog.hopDurMax;
          let hopDistMin = 24;
          let hopDistMax = 96;

          if (isSpeedBuffActive()) {
            hopDurMin *= 0.6;
            hopDurMax *= 0.6;
            hopDistMin *= 1.4;
            hopDistMax *= 1.4;
          }

          frog.hopDuration = randRange(hopDurMin, hopDurMax);

          if (SNAKE_ENABLED) {
            playFrogJumpSound(false);
          }

          let hopHeightMin = frog.hopHeightMin;
          let hopHeightMax = frog.hopHeightMax;

          const spice = Math.random();
          if (spice < 0.1) {
            frog.hopHeight = randRange(hopHeightMax * 1.0, hopHeightMax * 1.6);
          } else if (spice > 0.9) {
            frog.hopHeight = randRange(hopHeightMin * 0.7, hopHeightMin * 1.1);
          } else {
            frog.hopHeight = randRange(hopHeightMin, hopHeightMax);
          }

          if (isJumpBuffActive()) {
            frog.hopHeight *= 2.5;
          }

          const angle = Math.random() * Math.PI * 2;
          const dist  = randRange(hopDistMin, hopDistMax);

          let targetX = frog.x + Math.cos(angle) * dist;
          let targetBaseY = frog.baseY + Math.sin(angle) * dist;

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
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const tRaw = frog.hopTime / frog.hopDuration;
        const t = Math.min(1, Math.max(0, tRaw));

        const groundX = frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY = frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        const offset = -4 * frog.hopHeight * t * (1 - t);

        frog.x = groundX;
        frog.baseY = groundBaseY;
        frog.y = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";

          let idleMin = frog.idleMin;
          let idleMax = frog.idleMax;
          if (isSpeedBuffActive()) {
            idleMin *= 0.5;
            idleMax *= 0.5;
          }
          frog.idleTime = randRange(idleMin, idleMax);

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

      const renderY = frog.y + scrollOffsetY;
      frog.el.style.transform = `translate3d(${frog.x}px, ${renderY}px, 0)`;
    }
  }

  // -----------------------------
  // Snake logic
  // -----------------------------
  function initSnake(width, height) {
    if (!SNAKE_ENABLED) return;

    if (snake && snake.segments) {
      for (const seg of snake.segments) {
        if (seg.el && seg.el.parentNode === container) {
          container.removeChild(seg.el);
        }
      }
    }

    snake = {
      x: width / 2,
      y: height / 2,
      angle: 0,
      speed: SNAKE_SPEED,
      segments: [],
      head: null
    };

    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    container.appendChild(headEl);

    const headSeg = {
      x: snake.x,
      y: snake.y,
      angle: snake.angle,
      el: headEl,
      isHead: true
    };

    snake.head = headSeg;
    snake.segments.push(headSeg);

    let prev = headSeg;
    for (let i = 1; i < SNAKE_INITIAL_SEGMENTS; i++) {
      const segEl = document.createElement("div");
      const isTail = i === SNAKE_INITIAL_SEGMENTS - 1;
      segEl.className = isTail ? "snake-tail" : "snake-body";
      container.appendChild(segEl);

      const seg = {
        x: prev.x - Math.cos(prev.angle) * (SNAKE_SEGMENT_SIZE + SNAKE_SEGMENT_GAP),
        y: prev.y - Math.sin(prev.angle) * (SNAKE_SEGMENT_SIZE + SNAKE_SEGMENT_GAP),
        angle: prev.angle,
        el: segEl,
        isHead: false
      };
      snake.segments.push(seg);
      prev = seg;
    }

    snakeEatSound = new Audio("audio/snake-munch.mp3");
    snakeEatSound.volume = 0.8;
  }

  function growSnake(count) {
    if (!snake) return;

    for (let i = 0; i < count; i++) {
      const last = snake.segments[snake.segments.length - 1];

      const segEl = document.createElement("div");
      segEl.className = "snake-tail";
      container.appendChild(segEl);

      if (snake.segments.length >= 2) {
        const prevTail = snake.segments[snake.segments.length - 1];
        if (prevTail.el && prevTail.el.className === "snake-tail") {
          prevTail.el.className = "snake-body";
        }
      }

      const seg = {
        x: last.x - Math.cos(last.angle) * (SNAKE_SEGMENT_SIZE + SNAKE_SEGMENT_GAP),
        y: last.y - Math.sin(last.angle) * (SNAKE_SEGMENT_SIZE + SNAKE_SEGMENT_GAP),
        angle: last.angle,
        el: segEl,
        isHead: false
      };
      snake.segments.push(seg);
    }
  }

  function updateSnake(dt, width, height) {
    if (!SNAKE_ENABLED || !snake) return;

    const marginX = 8;
    const marginY = 24;
    const head = snake.head;
    if (!head) return;

    let tx = mouse.follow && mouse.active ? mouse.x : width / 2;
    let ty = mouse.follow && mouse.active ? mouse.y : height / 2;

    const dxTarget = tx - head.x;
    const dyTarget = ty - head.y;
    const desiredAngle = Math.atan2(dyTarget, dxTarget);

    let delta = desiredAngle - snake.angle;
    delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;

    const maxTurn = SNAKE_TURN_RATE * dt;
    if (delta > maxTurn) delta = maxTurn;
    if (delta < -maxTurn) delta = -maxTurn;

    snake.angle += delta;

    const moveDist = snake.speed * dt;
    const vx = Math.cos(snake.angle) * moveDist;
    const vy = Math.sin(snake.angle) * moveDist;

    head.x += vx;
    head.y += vy;

    head.x = Math.max(marginX + SNAKE_SEGMENT_SIZE / 2, Math.min(width - marginX - SNAKE_SEGMENT_SIZE / 2, head.x));
    head.y = Math.max(marginY + SNAKE_SEGMENT_SIZE / 2, Math.min(height - marginY - SNAKE_SEGMENT_SIZE / 2, head.y));

    head.angle = snake.angle;

    head.el.style.transform =
      `translate3d(${head.x - SNAKE_SEGMENT_SIZE / 2}px, ${head.y - SNAKE_SEGMENT_SIZE / 2 + scrollOffsetY}px, 0) rotate(${head.angle}rad)`;

    for (let i = 1; i < snake.segments.length; i++) {
      const prev = snake.segments[i - 1];
      const seg = snake.segments[i];

      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

      const idealDist = SNAKE_SEGMENT_SIZE + SNAKE_SEGMENT_GAP;
      const t = (dist - idealDist) / dist;

      seg.x += dx * t;
      seg.y += dy * t;

      seg.angle = Math.atan2(prev.y - seg.y, prev.x - seg.x);

      seg.el.style.transform =
        `translate3d(${seg.x - SNAKE_SEGMENT_SIZE / 2}px, ${seg.y - SNAKE_SEGMENT_SIZE / 2 + scrollOffsetY}px, 0) rotate(${seg.angle}rad)`;
    }

    // Snake eats frogs
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
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

        playSnakeEatSound();
        playFrogDeathSound();
        growSnake(1);
      }
    }
  }

  // -----------------------------
  // Orbs & buffs
  // -----------------------------
  function scheduleNextOrb(timeSeconds) {
    nextOrbSpawnAt = timeSeconds + randRange(ORB_MIN_SPAWN_INTERVAL, ORB_MAX_SPAWN_INTERVAL);
  }

  function spawnOrb(width, height) {
    if (orbs.length >= ORB_MAX_ON_SCREEN) return;

    const margin = 24;
    const x = margin + Math.random() * (width - margin * 2);
    const y = margin + Math.random() * (height - margin * 2);

    const orbEl = document.createElement("div");
    orbEl.className = "frog-buff-orb";

    // Pick a buff type and color
    const buffTypes = ["speed", "jump", "spawn"];
    const buffType = buffTypes[randInt(0, buffTypes.length - 1)];

    let hue;
    if (buffType === "speed") hue = 50;      // yellow / orange
    else if (buffType === "jump") hue = 300; // magenta
    else hue = 190;                          // cyan

    const base = `hsl(${hue}, 90%, 55%)`;
    const light = `hsl(${hue}, 100%, 80%)`;
    orbEl.style.background = `radial-gradient(circle at 30% 30%, ${light}, ${base})`;

    container.appendChild(orbEl);

    const orb = {
      x,
      y,
      r: ORB_RADIUS,
      el: orbEl,
      type: buffType
    };
    orbs.push(orb);

    const spawnSrc = ORB_SPAWN_SOUNDS[randInt(0, ORB_SPAWN_SOUNDS.length - 1)];
    playOneShotSound(spawnSrc, 0.8);
  }

  function applyBuff(type) {
    if (type === "speed") {
      buffSpeedActiveUntil = Math.max(buffSpeedActiveUntil, gameElapsed + 7);
      playOneShotSound(BUFF_SOUND_SUPER_SPEED, 0.9);
    } else if (type === "jump") {
      buffJumpActiveUntil = Math.max(buffJumpActiveUntil, gameElapsed + 7);
      playOneShotSound(BUFF_SOUND_SUPER_JUMP, 0.9);
    } else if (type === "spawn") {
      const n = randInt(1, 10);
      spawnExtraFrogsRandom(n);
      playOneShotSound(BUFF_SOUND_FROG_SPAWN, 0.9);
    }
  }

  function updateOrbs(dt, width, height) {
    if (!SNAKE_ENABLED) return;
    if (gameEnded) return;

    if (gameElapsed >= nextOrbSpawnAt && orbs.length < ORB_MAX_ON_SCREEN) {
      spawnOrb(width, height);
      scheduleNextOrb(gameElapsed);
    }

    for (const orb of orbs) {
      const renderY = orb.y + scrollOffsetY;
      orb.el.style.transform =
        `translate3d(${orb.x - orb.r}px, ${renderY - orb.r}px, 0)`;
    }

    const frogRadius = FROG_SIZE / 2;
    const R2Base = (frogRadius + ORB_RADIUS) * (frogRadius + ORB_RADIUS);

    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      let collected = false;

      for (const frog of frogs) {
        const fx = frog.x + frogRadius;
        const fy = frog.baseY + frogRadius;
        const dx = fx - orb.x;
        const dy = fy - orb.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= R2Base) {
          collected = true;
          break;
        }
      }

      if (collected) {
        if (orb.el.parentNode === container) {
          container.removeChild(orb.el);
        }
        orbs.splice(i, 1);
        applyBuff(orb.type);
      }
    }
  }

  // -----------------------------
  // Main loop
  // -----------------------------
  function drawFrame(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (SNAKE_ENABLED && !gameEnded) {
      if (gameStartTime === null) {
        gameStartTime = time;
        scheduleNextOrb(0);
      }
      gameElapsed = (time - gameStartTime) / 1000;
      updateTimerDisplay(gameElapsed);
    }

    updateFrogs(dt, width, height);

    if (SNAKE_ENABLED) {
      updateSnake(dt, width, height);
      updateOrbs(dt, width, height);

      if (!gameEnded && frogs.length === 0) {
        gameEnded = true;
        if (timerEl) {
          timerEl.textContent =
            "Time: " + formatTime(gameElapsed) + " – All frogs eaten!";
        }
      }
    }

    if (!SNAKE_ENABLED || !gameEnded) {
      animId = requestAnimationFrame(drawFrame);
    }
  }

  // -----------------------------
  // Input
  // -----------------------------
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("click", (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    mouse.follow = true;

    let nearest = null;
    let nearestDist2 = Infinity;

    for (const frog of frogs) {
      const cx = frog.x + FROG_SIZE / 2;
      const cy = frog.y + FROG_SIZE / 2;
      const dx = clickX - cx;
      const dy = clickY - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist2) {
        nearestDist2 = d2;
        nearest = frog;
      }
    }

    const MAX_CLICK_RADIUS = 120;
    if (nearest && nearestDist2 <= MAX_CLICK_RADIUS * MAX_CLICK_RADIUS) {
      if (SNAKE_ENABLED) {
        playFrogJumpSound(true);
      }

      nearest.state = "hopping";
      nearest.hopTime = 0;
      nearest.hopDuration = randRange(nearest.hopDurMin * 0.6, nearest.hopDurMax * 0.9);
      nearest.hopHeight = randRange(nearest.hopHeightMax * 1.1, nearest.hopHeightMax * 1.7);

      nearest.hopStartX = nearest.x;
      nearest.hopStartBaseY = nearest.baseY;
      nearest.hopEndX = nearest.x;
      nearest.hopEndBaseY = nearest.baseY;
    }
  });

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY || 0;
    const deltaY = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;
    scrollOffsetY -= deltaY * 0.15;
  });

  // -----------------------------
  // Start / resize
  // -----------------------------
  async function resetAndStart() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    lastTime = 0;
    scrollOffsetY = 0;
    lastScrollY = window.scrollY || 0;
    mouse.follow = false;

    orbs = [];
    buffSpeedActiveUntil = 0;
    buffJumpActiveUntil = 0;
    gameStartTime = null;
    gameElapsed = 0;
    gameEnded = false;

    await createFrogs(width, height);

    if (SNAKE_ENABLED) {
      initSnake(width, height);

      if (!timerEl) {
        timerEl = document.createElement("div");
        timerEl.id = "snake-timer";
        timerEl.style.position = "fixed";
        timerEl.style.top = "10px";
        timerEl.style.left = "50%";
        timerEl.style.transform = "translateX(-50%)";
        timerEl.style.padding = "4px 10px";
        timerEl.style.background = "rgba(0, 0, 0, 0.6)";
        timerEl.style.color = "#ffffff";
        timerEl.style.fontFamily =
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        timerEl.style.fontSize = "14px";
        timerEl.style.borderRadius = "4px";
        timerEl.style.zIndex = "50";
        timerEl.style.pointerEvents = "none";
        container.appendChild(timerEl);
      }

      updateTimerDisplay(0);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
