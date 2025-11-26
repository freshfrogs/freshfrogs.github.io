// assets/scatter-frogs.js
(function () {
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "https://freshfrogs.github.io/frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "https://freshfrogs.github.io/frog/build_files";
  const MAX_FROGS    = 120;

  // Values that have animation variants for scatter frogs
  const SCATTER_ANIMATED_VALUES = new Set([
    // 'witchStraw',
    // 'witchBrown',
    // 'witchBlack',
    'goldenDartFrog',
    'blueDartFrog',
    'blueTreeFrog',
    'brownTreeFrog',
    'redEyedTreeFrog',
    'tongueSpiderRed',
    'tongueSpider',
    // 'tongue',
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
    // 'baseballCapBlue',
    //'baseballCapRed',
    //'beanie',
    //'cowboyHat',
    //'crown',
    //'halo',
    'partyHat',
    //'pirateHat',
    'sombrero',
    //'topHat',
    //'vikingHelmet',
    'wizardHatPurple',
    'wizardHatBlue',
  ]);

  const container = document.getElementById("frog-bg");
  if (!container) {
    return;
  }

  let frogs = [];
  let lastTime = 0;
  let animId = null;

  // Mouse chase state
  const mouse = {
    x: 0,
    y: 0,
    follow: false,
    active: false
  };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  window.addEventListener("mousedown", () => {
    mouse.follow = true;
  });

  window.addEventListener("mouseup", () => {
    mouse.follow = false;
  });

  // Simple metadata cache
  const metaCache = new Map();

  function fetchMetadata(tokenId) {
    if (metaCache.has(tokenId)) {
      return Promise.resolve(metaCache.get(tokenId));
    }
    const url = `${META_BASE}${tokenId}${META_EXT}`;
    return fetch(url)
      .then(resp => {
        if (!resp.ok) throw new Error("Metadata not found");
        return resp.json();
      })
      .then(json => {
        metaCache.set(tokenId, json);
        return json;
      })
      .catch(() => {
        const fallback = {
          image: `${BUILD_BASE}/base/default.png`,
          attributes: []
        };
        metaCache.set(tokenId, fallback);
        return fallback;
      });
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // Helper: pick a build file path for a given attribute/value
  function buildFilePath(traitType, value, isAnimated) {
    if (!traitType || !value) return null;

    const safeTrait = String(traitType).replace(/\s+/g, "");
    const safeValue = String(value).replace(/\s+/g, "");

    if (isAnimated && SCATTER_ANIMATED_VALUES.has(safeValue)) {
      return `${BUILD_BASE}/${safeTrait}/animations/${safeValue}_animation.gif`;
    }
    return `${BUILD_BASE}/${safeTrait}/${safeValue}.png`;
  }

  // Build layered frog DOM (each trait is its own <div> with background image)
  function buildLayersForFrog(frog, meta) {
    if (!frog || !frog.el) return;
    frog.layers = [];

    const baseLayer = document.createElement("div");
    baseLayer.className = "frog-layer";
    baseLayer.style.position = "absolute";
    baseLayer.style.width = FROG_SIZE + "px";
    baseLayer.style.height = FROG_SIZE + "px";
    baseLayer.style.left = "0";
    baseLayer.style.top = "0";
    baseLayer.style.backgroundSize = "contain";
    baseLayer.style.backgroundRepeat = "no-repeat";
    baseLayer.style.imageRendering = "pixelated";
    frog.el.appendChild(baseLayer);
    frog.layers.push(baseLayer);

    if (meta && meta.image) {
      baseLayer.style.backgroundImage = `url(${meta.image})`;
    }

    if (meta && Array.isArray(meta.attributes)) {
      const ordered = meta.attributes.slice().sort((a, b) => {
        const ya = a.trait_type === "Background" ? 0 : 1;
        const yb = b.trait_type === "Background" ? 0 : 1;
        return ya - yb;
      });

      for (const attr of ordered) {
        if (!attr || !attr.trait_type || !attr.value) continue;
        const isAnimated = SCATTER_ANIMATED_VALUES.has(String(attr.value).replace(/\s+/g, ""));

        const path = buildFilePath(attr.trait_type, attr.value, isAnimated);
        if (!path) continue;

        const layer = document.createElement("div");
        layer.className = "frog-layer";
        layer.style.position = "absolute";
        layer.style.width = FROG_SIZE + "px";
        layer.style.height = FROG_SIZE + "px";
        layer.style.left = "0";
        layer.style.top = "0";
        layer.style.backgroundSize = "contain";
        layer.style.backgroundRepeat = "no-repeat";
        layer.style.imageRendering = "pixelated";
        layer.style.backgroundImage = `url(${path})`;
        frog.el.appendChild(layer);
        frog.layers.push(layer);
      }
    }
  }

  // Scroll parallax + group-hop throttle
  let scrollOffsetY = 0;
  let lastScrollY = window.scrollY || 0;
  let lastGroupHopTime = 0;

  // -----------------------------
  // Snake game (optional)
  // -----------------------------
  const SNAKE_ENABLED       = container && container.hasAttribute("data-snake-game");
  const SNAKE_SEGMENT_SIZE  = 48;
  const SNAKE_BASE_SPEED    = 90;
  const SNAKE_TURN_RATE     = Math.PI * 1.5;
  const SNAKE_SEGMENT_GAP   = 6;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS    = 40;

  let snake = null;
  let snakeEatSound = null;
  let snakeSpeedFactor = 1; // modified by power-ups

  // Audio + game state (snake mode only)
  let frogHopSounds = [];
  let frogDeathSound = null;
  let frogSpeedBuffSound = null;
  let frogJumpBuffSound = null;
  let frogSlowBuffSound = null;

  // Buff timers (seconds)
  const BUFF_DURATION = 6;
  let frogSpeedBuffTime = 0;
  let frogJumpBuffTime  = 0;
  let frogSlowBuffTime  = 0;

  // Simple game timer / end condition
  let gameElapsedTime = 0;
  let gameOver = false;
  let timerEl = null;

  // -----------------------------
  // Power-up drops
  // -----------------------------
  const POWERUP_RADIUS       = 14;
  const POWERUP_TTL          = 8;   // seconds before it fades
  const POWERUP_DROP_CHANCE  = 0.7; // chance a power-up appears on frog death

  // Types: frog-speed (buff), frog-jump (buff), frog-slow (debuff to frogs)
  let powerups = [];

  function rollPowerupType() {
    const r = Math.random();
    if (r < 0.4) return "frog-speed";
    if (r < 0.7) return "frog-jump";
    return "frog-slow";
  }

  function spawnPowerup(centerX, centerY) {
    if (!container) return;

    const type = rollPowerupType();
    const size = POWERUP_RADIUS * 2;

    const el = document.createElement("div");
    el.className = "frog-powerup";
    el.style.position = "absolute";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.zIndex = "20";
    el.style.border = "2px solid rgba(0,0,0,0.6)";
    el.style.boxShadow = "0 0 10px rgba(0,0,0,0.35)";

    // Color by type
    if (type === "frog-speed") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7bffb1)";
    } else if (type === "frog-jump") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7cc1ff)";
    } else { // frog-slow
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #ffd36b)";
    }

    container.appendChild(el);

    powerups.push({
      type,
      x: centerX - POWERUP_RADIUS,
      baseY: centerY - POWERUP_RADIUS,
      ttl: POWERUP_TTL,
      el
    });
  }

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function applyPowerup(type) {
    if (!SNAKE_ENABLED) return;

    // All buffs apply to all frogs and are temporary (tracked via timers)
    if (type === "frog-speed") {
      frogSpeedBuffTime = BUFF_DURATION;
      playFrogSpeedBuff();
    } else if (type === "frog-jump") {
      frogJumpBuffTime = BUFF_DURATION;
      playFrogJumpBuff();
    } else if (type === "frog-slow") {
      frogSlowBuffTime = BUFF_DURATION;
      playFrogSlowBuff();
    }
  }

  function updatePowerups(dt, width, height) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (!p) continue;

      p.ttl -= dt;
      if (p.ttl <= 0) {
        if (p.el && p.el.parentNode === container) {
          container.removeChild(p.el);
        }
        powerups.splice(i, 1);
        continue;
      }

      // Float + pulse
      const lifeT = p.ttl / POWERUP_TTL;
      const pulse = 1 + 0.15 * Math.sin((1 - lifeT) * Math.PI * 4);
      const bob   = Math.sin((1 - lifeT) * Math.PI * 2) * 3;

      const renderY = p.baseY + scrollOffsetY + bob;
      p.el.style.transform =
        `translate3d(${p.x}px, ${renderY}px, 0) scale(${pulse})`;
      p.el.style.opacity = String(clamp(lifeT + 0.2, 0, 1));

      // Collision with frogs: frogs collect power-ups
      const pcx = p.x + POWERUP_RADIUS;
      const pcy = p.baseY + POWERUP_RADIUS;

      let collected = false;

      for (const frog of frogs) {
        const fx = frog.x + FROG_SIZE / 2;
        const fy = frog.baseY + FROG_SIZE / 2;
        const dx = fx - pcx;
        const dy = fy - pcy;
        const rad = FROG_SIZE / 2 + POWERUP_RADIUS;
        if (dx * dx + dy * dy <= rad * rad) {
          applyPowerup(p.type);
          collected = true;
          break;
        }
      }

      if (collected) {
        if (p.el && p.el.parentNode === container) {
          container.removeChild(p.el);
        }
        powerups.splice(i, 1);
      }
    }
  }

  function playSnakeEatSound() {
    if (!snakeEatSound) return;
    try {
      snakeEatSound.currentTime = 0;
      snakeEatSound.play();
    } catch (e) {
      // ignore autoplay / other errors
    }
  }

  function ensureGameAudio() {
    if (!SNAKE_ENABLED) return;

    if (!frogHopSounds.length) {
      frogHopSounds = [
        new Audio("/snake/ribbitOne.mp3"),
        new Audio("/snake/ribbitTwo.mp3"),
        new Audio("/snake/ribbitThree.mp3"),
        new Audio("/snake/ribbitBase.mp3")
      ];
      frogHopSounds.forEach(a => {
        a.volume = 0.6;
      });
    }

    if (!frogDeathSound) {
      frogDeathSound = new Audio("/snake/frogDeath.mp3");
      frogDeathSound.volume = 0.8;
    }
    if (!frogSpeedBuffSound) {
      frogSpeedBuffSound = new Audio("/snake/superSpeed.mp3");
      frogSpeedBuffSound.volume = 0.8;
    }
    if (!frogJumpBuffSound) {
      frogJumpBuffSound = new Audio("/snake/superJump.mp3");
      frogJumpBuffSound.volume = 0.8;
    }
    if (!frogSlowBuffSound) {
      frogSlowBuffSound = new Audio("/snake/slowed.mp3");
      frogSlowBuffSound.volume = 0.8;
    }
  }

  function playRandomFrogHop() {
    if (!SNAKE_ENABLED || !frogHopSounds.length) return;
    const idx = Math.floor(Math.random() * frogHopSounds.length);
    const audio = frogHopSounds[idx];
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      // ignore autoplay / other errors
    }
  }

  function playFrogDeath() {
    if (!frogDeathSound) return;
    try {
      frogDeathSound.currentTime = 0;
      frogDeathSound.play();
    } catch (e) {
      // ignore
    }
  }

  function playFrogSpeedBuff() {
    if (!frogSpeedBuffSound) return;
    try {
      frogSpeedBuffSound.currentTime = 0;
      frogSpeedBuffSound.play();
    } catch (e) {}
  }

  function playFrogJumpBuff() {
    if (!frogJumpBuffSound) return;
    try {
      frogJumpBuffSound.currentTime = 0;
      frogJumpBuffSound.play();
    } catch (e) {}
  }

  function playFrogSlowBuff() {
    if (!frogSlowBuffSound) return;
    try {
      frogSlowBuffSound.currentTime = 0;
      frogSlowBuffSound.play();
    } catch (e) {}
  }

  function ensureTimerElement() {
    if (!SNAKE_ENABLED) return;
    if (timerEl) return;

    timerEl = document.createElement("div");
    timerEl.className = "snake-timer";
    timerEl.style.position = "fixed";
    timerEl.style.top = "12px";
    timerEl.style.left = "50%";
    timerEl.style.transform = "translateX(-50%)";
    timerEl.style.padding = "6px 12px";
    timerEl.style.borderRadius = "999px";
    timerEl.style.background = "rgba(0,0,0,0.55)";
    timerEl.style.color = "#fff";
    timerEl.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    timerEl.style.fontSize = "14px";
    timerEl.style.letterSpacing = "0.08em";
    timerEl.style.textTransform = "uppercase";
    timerEl.style.zIndex = "50";
    timerEl.style.pointerEvents = "none";
    timerEl.textContent = "Time 00:00";
    document.body.appendChild(timerEl);
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function updateTimerDisplay() {
    if (!timerEl) return;
    const label = gameOver ? "Final Time" : "Time";
    timerEl.textContent = label + " " + formatTime(gameElapsedTime);
  }

  function showGameOver() {
    gameOver = true;
    updateTimerDisplay();
    if (timerEl) {
      timerEl.style.background = "rgba(0,0,0,0.8)";
    }
  }

  function initSnake(width, height) {
    if (!SNAKE_ENABLED) return;
    if (!container) return;

    // clean up old snake if present
    if (snake && snake.head && snake.head.el && snake.head.el.parentNode === container) {
      container.removeChild(snake.head.el);
    }
    if (snake && Array.isArray(snake.segments)) {
      for (const seg of snake.segments) {
        if (seg && seg.el && seg.el.parentNode === container) {
          container.removeChild(seg.el);
        }
      }
    }

    const startX = width * 0.2;
    const startY = height * 0.5;

    // Head
    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    headEl.style.position = "absolute";
    headEl.style.width = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.height = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.imageRendering = "pixelated";
    headEl.style.backgroundSize = "contain";
    headEl.style.backgroundRepeat = "no-repeat";
    headEl.style.backgroundImage = "url(/snake/head.png)";
    container.appendChild(headEl);

    const segments = [];
    for (let i = 0; i < SNAKE_INITIAL_SEGMENTS; i++) {
      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.position = "absolute";
      segEl.style.width = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering = "pixelated";
      segEl.style.backgroundSize = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      // TODO: your body sprite
      segEl.style.backgroundImage = "url(/snake/body.png)";
      container.appendChild(segEl);

      segments.push({
        el: segEl,
        x: startX - (i + 1) * SNAKE_SEGMENT_GAP,
        y: startY
      });
    }

    const path = [];
    for (let i = 0; i < (SNAKE_INITIAL_SEGMENTS + 2) * SNAKE_SEGMENT_GAP; i++) {
      path.push({ x: startX - i, y: startY });
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
    if (!snakeEatSound) {
      // change this path if needed
      snakeEatSound = new Audio("/snake/munch.mp3");
      snakeEatSound.volume = 0.7;
    }
  }

  function growSnake(extraSegments) {
    if (!snake || !SNAKE_ENABLED) return;
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
      // TODO: your body sprite
      segEl.style.backgroundImage = "url(/snake/body.png)";
      container.appendChild(segEl);

      snake.segments.splice(tailIndex, 0, {
        el: segEl,
        x: tailSeg ? tailSeg.x : snake.head.x,
        y: tailSeg ? tailSeg.y : snake.head.y
      });
    }

    const desiredPathLength = (snake.segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length < desiredPathLength) {
      const last = snake.path[snake.path.length - 1];
      snake.path.push({ x: last.x, y: last.y });
    }
  }

  function updateSnake(dt, width, height) {
    if (!snake || !SNAKE_ENABLED) return;

    const head = snake.head;
    const path = snake.path;
    const segments = snake.segments;

    const speed = SNAKE_BASE_SPEED * (0.8 + Math.random() * 0.4) * snakeSpeedFactor;

    let targetX = mouse.follow && mouse.active ? mouse.x : head.x + 1;
    let targetY = mouse.follow && mouse.active ? mouse.y : head.y;

    head.x += (targetX - head.x) * dt;
    head.y += (targetY - head.y) * dt;

    const scrollY = window.scrollY || 0;
    const scrollDelta = scrollY - lastScrollY;
    lastScrollY = scrollY;
    scrollOffsetY -= scrollDelta * 0.5;

    head.y += scrollDelta * 0.1;

    if (path.length > 0) {
      path.push({ x: head.x, y: head.y });
      while (path.length > (segments.length + 2) * SNAKE_SEGMENT_GAP) {
        path.shift();
      }
    }

    let closestIndex = 0;
    let closestDist = Infinity;
    for (let i = 0; i < path.length; i++) {
      const dx = path[i].x - head.x;
      const dy = path[i].y - head.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDist) {
        closestDist = d2;
        closestIndex = i;
      }
    }

    const nextIndex = Math.min(path.length - 1, closestIndex + 1);
    const dirX = path[nextIndex].x - head.x;
    const dirY = path[nextIndex].y - head.y;
    const angle = Math.atan2(dirY, dirX);
    head.angle = angle;

    head.x += Math.cos(angle) * speed * dt;
    head.y += Math.sin(angle) * speed * dt;

    const headRenderY = head.y + scrollOffsetY;
    head.el.style.transform =
      `translate3d(${head.x - SNAKE_SEGMENT_SIZE / 2}px, ${headRenderY - SNAKE_SEGMENT_SIZE / 2}px, 0) rotate(${angle}rad)`;

    let segmentIndex = closestIndex;
    for (const seg of segments) {
      segmentIndex = Math.min(path.length - 1, segmentIndex + SNAKE_SEGMENT_GAP);
      const p = path[segmentIndex];
      if (!p) continue;

      seg.x = p.x;
      seg.y = p.y;

      const renderY = seg.y + scrollOffsetY;
      seg.el.style.transform =
        `translate3d(${seg.x - SNAKE_SEGMENT_SIZE / 2}px, ${renderY - SNAKE_SEGMENT_SIZE / 2}px, 0) rotate(${angle}rad)`;
    }

    // --- check collisions with frogs (eating)
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        // eat frog (NO respawn here anymore)
        const centerX = fx;
        const centerY = fy;

        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        // frog death + munch sound
        playFrogDeath();
        playSnakeEatSound();

        // grow snake
        growSnake(1);

        // chance to drop a power-up at this spot
        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnPowerup(centerX, centerY);
        }
      }
    }
  }

  function spawnExtraFrog(width, height) {
    if (!container) return;
    if (frogs.length >= MAX_FROGS) return;

    const marginY = 24;
    const marginX = 8;

    const x = marginX + Math.random() * (width - marginX * 2 - FROG_SIZE);
    const y = marginY + Math.random() * (height - marginY * 2 - FROG_SIZE);

    const el = document.createElement("div");
    el.className = "frog-sprite";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
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
      idleMin = 1.5; idleMax = 4.5;
      hopMin = 0.45; hopMax = 0.9;
      heightMin = 6;  heightMax = 20;
    }

    const tokenId = 1 + Math.floor(Math.random() * MAX_TOKEN_ID);

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

      idleMin, idleMax,
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
  }

  // -----------------------------
  // Decide hop destination
  // -----------------------------
  function chooseHopDestination(frog, width, height) {
    // default: small jitter in place
    let targetX = frog.x;
    let targetBaseY = frog.baseY;

    const marginY = 24;
    const marginX = 8;
    const maxStep = 40; // max distance per hop

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
      // no mouse/target → tiny random shuffle
      targetX = frog.x + randRange(-12, 12);
      targetBaseY = frog.baseY + randRange(-6, 6);
    }

    // clamp to screen bounds
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

    // Global buff effects that apply to all frogs
    let timeScale = 1;
    if (frogSpeedBuffTime > 0) timeScale *= 0.6;    // faster hops
    if (frogSlowBuffTime > 0) timeScale *= 1.75;    // slower hops

    const heightScale = frogJumpBuffTime > 0 ? 2.5 : 1;

    for (const frog of frogs) {
      if (frog.state === "idle") {
        frog.idleTime -= dt;
        frog.y = frog.baseY;

        if (frog.idleTime <= 0) {
          frog.state = "hopping";
          frog.hopTime = 0;
          frog.hopDuration = randRange(frog.hopDurMin, frog.hopDurMax) * timeScale;

          // vary hop height a bit
          const spice = Math.random();
          if (spice < 0.1) {
            frog.hopHeight = randRange(frog.hopHeightMax * 1.1, frog.hopHeightMax * 1.8);
          } else if (spice < 0.25) {
            frog.hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            frog.hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }

          frog.hopHeight *= heightScale;

          // Play a random ribbit when a frog starts a hop (game page only)
          if (SNAKE_ENABLED) {
            playRandomFrogHop();
          }

          chooseHopDestination(frog, width, height);
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const t = Math.min(1, frog.hopTime / frog.hopDuration);

        // interpolate along the ground path
        const groundX = frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY = frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        // parabolic hop offset
        const offset = -4 * frog.hopHeight * t * (1 - t);

        frog.x = groundX;
        frog.baseY = groundBaseY;
        frog.y = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";
          frog.idleTime = randRange(frog.idleMin, frog.idleMax) * timeScale;

          frog.x = frog.hopEndX;
          frog.baseY = frog.hopEndBaseY;
          frog.y = frog.baseY;

          // clamp final position
          frog.x = Math.max(marginX, Math.min(width - marginX - FROG_SIZE, frog.x));
          frog.baseY = Math.max(
            marginY,
            Math.min(height - marginY - FROG_SIZE, frog.baseY)
          );
        }
      }

      // apply transform with scroll parallax
      const renderY = frog.y + scrollOffsetY;
      frog.el.style.transform = `translate3d(${frog.x}px, ${renderY}px, 0)`;
    }
  }

  function drawFrame(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    let dt = (time - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // clamp in case of tab switching
    lastTime = time;

    if (SNAKE_ENABLED) {
      if (!gameOver) {
        // Tick buff timers and game clock
        if (frogSpeedBuffTime > 0) {
          frogSpeedBuffTime = Math.max(0, frogSpeedBuffTime - dt);
        }
        if (frogJumpBuffTime > 0) {
          frogJumpBuffTime = Math.max(0, frogJumpBuffTime - dt);
        }
        if (frogSlowBuffTime > 0) {
          frogSlowBuffTime = Math.max(0, frogSlowBuffTime - dt);
        }

        gameElapsedTime += dt;
        updateTimerDisplay();

        updateFrogs(dt, width, height);
        updateSnake(dt, width, height);
        updatePowerups(dt, width, height);

        // End the game when all frogs are gone
        if (frogs.length === 0) {
          showGameOver();
        }
      }
    } else {
      // Background-only scatter frogs (no game, no sounds)
      updateFrogs(dt, width, height);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  // -----------------------------
  // Frog creation
  // -----------------------------
  async function createFrogs(width, height) {
    frogs = [];
    powerups = [];
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
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
        idleMin = 1.5; idleMax = 4.5;
        hopMin = 0.45; hopMax = 0.9;
        heightMin = 6;  heightMax = 20;
      }

      const frog = {
        tokenId,
        el,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,

        hopStartX: pos.x,
        hopStartBaseY: pos.y,
        hopEndX: pos.x,
        hopEndBaseY: pos.y,

        state: "idle",
        idleTime: randRange(idleMin, idleMax),
        hopTime: 0,
        hopDuration: randRange(hopMin, hopMax),
        hopHeight: randRange(heightMin, heightMax),

        idleMin, idleMax,
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
    }
  }

  function computeFrogPositions(width, height) {
    const area = width * height;
    const approxPerFrogArea = (FROG_SIZE * FROG_SIZE) * 5;
    let targetCount = Math.floor(area / approxPerFrogArea);
    targetCount = Math.max(15, Math.min(MAX_FROGS, targetCount));

    const positions = [];
    const MIN_DIST = 52;
    const margin = 16;

    let safety = targetCount * 50;
    while (positions.length < targetCount && safety-- > 0) {
      const x = margin + Math.random() * (width  - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);

      let ok = true;
      for (const p of positions) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) {
        positions.push({ x, y });
      }
    }
    return positions;
  }

  function pickRandomTokenIds(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(1 + Math.floor(Math.random() * MAX_TOKEN_ID));
    }
    return ids;
  }

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
    mouse.follow = false; // they won't follow until user clicks again
    snakeSpeedFactor = 1; // reset any power-up effects

    // reset game-specific state
    gameElapsedTime = 0;
    gameOver = false;
    frogSpeedBuffTime = 0;
    frogJumpBuffTime  = 0;
    frogSlowBuffTime  = 0;

    await createFrogs(width, height);

    // init snake only on snake pages
    if (SNAKE_ENABLED) {
      ensureGameAudio();
      ensureTimerElement();
      updateTimerDisplay();
      initSnake(width, height);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
