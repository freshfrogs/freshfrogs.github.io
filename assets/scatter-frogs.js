// assets/scatter-frogs.js
(function () {
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "/frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "/frog/build_files";
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
    // ...add more if needed...
  ]);

  // Traits we skip as "background"
  const SKIP_TRAITS = new Set([
    "Background",
    "background",
    "BG",
    "Bg"
  ]);

  const container = document.getElementById("frog-bg");
  if (!container) return;

  let frogs = [];
  let animId = null;
  let lastTime = 0;
  let forcedTokenIds = null; // <-- optional override list from site.js

  // Mouse tracking: used only to choose hop destination
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
    follow: false  // becomes true after first click
  };

  // Optional nav/other target (used only if mouse.follow = false)
  const target = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false
  };

  // Scroll parallax + group hops
  let scrollOffsetY = 0;
  let lastScrollY   = window.scrollY || 0;

  // -----------------------------
  // Snake + powerups
  // -----------------------------
  const SNAKE_ENABLED          = true;
  const SNAKE_SEGMENT_SIZE     = 52;
  const SNAKE_INITIAL_SEGMENTS = 9;
  const SNAKE_BASE_SPEED       = 70;  // px/sec baseline
  const SNAKE_MAX_TURN_RATE    = Math.PI * 0.7; // radians/sec
  const SNAKE_EAT_RADIUS       = 46; // px
  const SNAKE_GROW_PER_FROG    = 1;

  const POWERUP_RADIUS         = 15;
  const POWERUP_TTL            = 10; // seconds
  const POWERUP_DROP_CHANCE    = 0.5; // chance a frog drop creates a powerup

  let powerups = [];

  // Global status effects
  let frogSpeedBase       = 1;   // permanent speed multiplier (green orbs)
  let frogSpeedTemp       = 1;   // temporary speed multiplier (blue orbs)
  let frogSpeedTempTimer  = 0;

  let frogJumpTempMult    = 1;   // temporary jump multiplier (yellow orbs)
  let frogJumpTempTimer   = 0;

  let snakeSpeedFactor    = 1;   // affected by white orbs
  let snakeSlowTimer      = 0;

  // Survival timer
  let elapsedTime = 0;
  let bestTime    = 0;
  let isGameOver  = false;
  let hudEl       = null;

  function rollPowerupType() {
    // Map to colors:
    // red    -> spawn more frogs
    // blue   -> temp frog speed
    // yellow -> temp big jumps
    // green  -> perm frog speed (small, stacks)
    // white  -> temp snake slow
    const r = Math.random();
    if (r < 0.25) return "spawn";       // red
    if (r < 0.50) return "temp-speed";  // blue
    if (r < 0.70) return "temp-jump";   // yellow
    if (r < 0.90) return "perm-speed";  // green
    return "snake-slow";                // white
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
    el.style.left = (centerX - POWERUP_RADIUS) + "px";
    el.style.top = (centerY - POWERUP_RADIUS) + "px";
    el.style.transform = "translate3d(0,0,0)";
    el.style.imageRendering = "pixelated";
    el.style.pointerEvents = "none";
    el.style.borderRadius = "50%";
    el.style.zIndex = "20";
    el.style.boxShadow = "0 0 8px rgba(0,0,0,0.45)";
    el.style.border = "1px solid rgba(0,0,0,0.7)";

    // Solid color by type
    if (type === "spawn") {
      // red
      el.style.backgroundColor = "#ff5555";
    } else if (type === "temp-speed") {
      // blue
      el.style.backgroundColor = "#4da3ff";
    } else if (type === "temp-jump") {
      // yellow
      el.style.backgroundColor = "#ffd93b";
    } else if (type === "perm-speed") {
      // green
      el.style.backgroundColor = "#46ff8a";
    } else if (type === "snake-slow") {
      // white
      el.style.backgroundColor = "#f8f8ff";
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

  // Snake state
  let snake = null;

  function createSnake(width, height) {
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
    headEl.style.pointerEvents = "none";
    headEl.style.zIndex = "30";
    // TODO: replace with your real head sprite
    headEl.style.backgroundImage = "url(/snake/head.png)";
    container.appendChild(headEl);

    // Body + tail
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
      segEl.style.zIndex = "25";
      // TODO: update to your body / tail sprites
      segEl.style.backgroundImage = isTail
        ? "url(/snake/tail.png)"
        : "url(/snake/body.png)";
      container.appendChild(segEl);

      segments.push({
        x: startX - i * (SNAKE_SEGMENT_SIZE - 8),
        y: startY,
        angle: 0,
        el: segEl
      });
    }

    snake = {
      head: {
        x: startX,
        y: startY,
        angle: 0,
        speed: SNAKE_BASE_SPEED,
        el: headEl
      },
      segments
    };
  }

  function destroySnake() {
    if (!snake) return;

    if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
      container.removeChild(snake.head.el);
    }

    for (const seg of snake.segments) {
      if (seg.el && seg.el.parentNode === container) {
        container.removeChild(seg.el);
      }
    }

    snake = null;
  }

  function playSnakeEatSound() {
    try {
      const audio = new Audio("/snake/munch.mp3");
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function growSnake(amount) {
    if (!snake) return;

    const last = snake.segments[snake.segments.length - 1];
    if (!last) return;

    for (let i = 0; i < amount; i++) {
      const segEl = document.createElement("div");
      segEl.className = "snake-tail";
      segEl.style.position = "absolute";
      segEl.style.width = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering = "pixelated";
      segEl.style.backgroundSize = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      segEl.style.pointerEvents = "none";
      segEl.style.zIndex = "25";
      segEl.style.backgroundImage = "url(/snake/tail.png)";
      container.appendChild(segEl);

      snake.segments.push({
        x: last.x,
        y: last.y,
        angle: last.angle,
        el: segEl
      });
    }
  }

  function applyPowerup(type, centerX, centerY) {
    // centerX/centerY are world coordinates of the orb center
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (type === "spawn") {
      // spawn a small cluster of frogs near the orb
      const extra = 4 + Math.floor(Math.random() * 3); // 4–6
      for (let i = 0; i < extra; i++) {
        if (frogs.length >= MAX_FROGS) break;
        const offsetX = (Math.random() - 0.5) * 120;
        const offsetY = (Math.random() - 0.5) * 90;
        const x = clamp(centerX + offsetX - FROG_SIZE / 2, 8, width - 8 - FROG_SIZE);
        const y = clamp(centerY + offsetY - FROG_SIZE / 2, 8, height - 8 - FROG_SIZE);

        const tokenId = chooseTokenIdForNewFrog();
        createSingleFrog(tokenId, x, y);
      }
    } else if (type === "temp-speed") {
      // big temporary frog speed boost
      frogSpeedTemp      = 1.7;
      frogSpeedTempTimer = 6.0; // seconds
    } else if (type === "temp-jump") {
      // big temporary jump boost
      frogJumpTempMult   = 2.5;
      frogJumpTempTimer  = 6.0;
    } else if (type === "perm-speed") {
      // small permanent frog speed boost (stacks a bit)
      frogSpeedBase = Math.min(frogSpeedBase + 0.12, 2.5);
    } else if (type === "snake-slow") {
      // temporarily slow the snake
      snakeSlowTimer   = 5.0;
      snakeSpeedFactor = 0.45;
    }
  }

  function updatePowerups(dt, width, height) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.ttl -= dt;

      if (p.ttl <= 0) {
        if (p.el && p.el.parentNode === container) {
          container.removeChild(p.el);
        }
        powerups.splice(i, 1);
        continue;
      }

      // Simple float/bob
      const t = POWERUP_TTL - p.ttl;
      const bob = Math.sin(t * 4) * 4;
      p.el.style.transform = `translate3d(0, ${bob}px, 0)`;

      // Check collision with frogs (frogs collect powerups)
      const pcx = p.x + POWERUP_RADIUS;
      const pcy = p.baseY + POWERUP_RADIUS;

      let collected = false;

      for (const frog of frogs) {
        if (!frog || !frog.el) continue;
        const fx = frog.x + FROG_SIZE / 2;
        const fy = frog.baseY + FROG_SIZE / 2;
        const dx = fx - pcx;
        const dy = fy - pcy;
        const rad = FROG_SIZE / 2 + POWERUP_RADIUS;

        if (dx * dx + dy * dy <= rad * rad) {
          applyPowerup(p.type, pcx, pcy);
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

  function updateStatusEffects(dt) {
    // Temporary frog speed
    if (frogSpeedTempTimer > 0) {
      frogSpeedTempTimer -= dt;
      if (frogSpeedTempTimer <= 0) {
        frogSpeedTempTimer = 0;
        frogSpeedTemp = 1;
      }
    }

    // Temporary jump height
    if (frogJumpTempTimer > 0) {
      frogJumpTempTimer -= dt;
      if (frogJumpTempTimer <= 0) {
        frogJumpTempTimer = 0;
        frogJumpTempMult = 1;
      }
    }

    // Temporary snake slow
    if (snakeSlowTimer > 0) {
      snakeSlowTimer -= dt;
      if (snakeSlowTimer <= 0) {
        snakeSlowTimer = 0;
        snakeSpeedFactor = 1;
      }
    }
  }

  function updateSnake(dt, width, height) {
    if (!snake || !snake.head) return;
    const head = snake.head;

    // Determine target
    let tx, ty;
    if (mouse.follow && mouse.active) {
      tx = mouse.x;
      ty = mouse.y;
    } else if (target.active) {
      tx = target.x;
      ty = target.y;
    } else {
      tx = width * 0.7;
      ty = height * 0.25;
    }

    const dx = tx - head.x;
    const dy = ty - head.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const desiredAngle = Math.atan2(dy, dx);
    let angleDiff = desiredAngle - head.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const maxTurn = SNAKE_MAX_TURN_RATE * dt;
    if (angleDiff > maxTurn) angleDiff = maxTurn;
    if (angleDiff < -maxTurn) angleDiff = -maxTurn;

    head.angle += angleDiff;

    const speed = head.speed * snakeSpeedFactor;
    head.x += Math.cos(head.angle) * speed * dt;
    head.y += Math.sin(head.angle) * speed * dt;

    // clamp
    const margin = 32;
    head.x = clamp(head.x, margin, width - margin);
    head.y = clamp(head.y, margin, height - margin);

    head.el.style.transform =
      `translate3d(${head.x - SNAKE_SEGMENT_SIZE / 2}px, ${head.y - SNAKE_SEGMENT_SIZE / 2 + scrollOffsetY}px, 0)`;

    // body segments follow
    let prev = head;
    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      const ddx = prev.x - seg.x;
      const ddy = prev.y - seg.y;
      const d   = Math.sqrt(ddx * ddx + ddy * ddy) || 1;

      const desiredDist = SNAKE_SEGMENT_SIZE - 6;
      const move = (d - desiredDist) * 8 * dt;

      seg.x += (ddx / d) * move;
      seg.y += (ddy / d) * move;
      seg.angle = Math.atan2(ddy, ddx);

      seg.el.style.transform =
        `translate3d(${seg.x - SNAKE_SEGMENT_SIZE / 2}px, ${seg.y - SNAKE_SEGMENT_SIZE / 2 + scrollOffsetY}px, 0)`;

      prev = seg;
    }

    // Eat frogs (NO automatic respawn)
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const ddx2 = fx - head.x;
      const ddy2 = fy - head.y;
      const d2 = ddx2 * ddx2 + ddy2 * ddy2;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        const centerX = fx;
        const centerY = fy;

        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        playSnakeEatSound();
        growSnake(SNAKE_GROW_PER_FROG);

        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnPowerup(centerX, centerY);
        }
      }
    }
  }

  function initSnake(width, height) {
    destroySnake();
    createSnake(width, height);
  }

  // -----------------------------
  // Textures / meta loading
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

  function computeFrogPositionsForTokenCount(count, width, height) {
    const positions = [];
    if (!count || count <= 0) return positions;

    const margin = 16;
    const usableW = Math.max(1, width - margin * 2 - FROG_SIZE);
    const usableH = Math.max(1, height - margin * 2 - FROG_SIZE);

    const cols = Math.max(1, Math.round(Math.sqrt(count * (usableW / usableH))));
    const rows = Math.max(1, Math.ceil(count / cols));

    const stepX = cols > 1 ? usableW / (cols - 1) : 0;
    const stepY = rows > 1 ? usableH / (rows - 1) : 0;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      let x = margin + (cols === 1 ? usableW / 2 : col * stepX);
      let y = margin + (rows === 1 ? usableH / 2 : row * stepY);

      x += (Math.random() - 0.5) * 20;
      y += (Math.random() - 0.5) * 16;

      if (x < margin) x = margin;
      if (x > width - margin - FROG_SIZE) x = width - margin - FROG_SIZE;
      if (y < margin) y = margin;
      if (y > height - margin - FROG_SIZE) y = height - margin - FROG_SIZE;

      positions.push({ x, y });
    }

    return positions;
  }

  async function fetchMetadata(tokenId) {
    const url = `${META_BASE}${tokenId}${META_EXT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Metadata fetch failed for " + tokenId);
    return res.json();
  }

  // Try GIF only if value is in SCATTER_ANIMATED_VALUES, else just PNG
  async function loadTraitImage(traitType, value) {
    const v = String(value);
    const pngUrl = `${BUILD_BASE}/${traitType}/${v}.png`;
    const canAnimate = SCATTER_ANIMATED_VALUES.has(v);

    if (canAnimate) {
      const gifUrl = `${BUILD_BASE}/${traitType}/animations/${v}_animation.gif`;
      try {
        const img = new Image();
        img.decoding = "async";
        img.loading = "lazy";
        img.src = gifUrl;
        await img.decode();
        return img;
      } catch (_) {
        // fall back to PNG below
      }
    }

    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.src = pngUrl;
    await img.decode();
    return img;
  }

  async function buildFrogLayers(frog) {
    try {
      const meta = await fetchMetadata(frog.tokenId);
      const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];

      frog.layers = [];

      for (const attr of attrs) {
        const traitType = String(attr.trait_type || "").trim();
        const value     = attr.value;
        if (!traitType || SKIP_TRAITS.has(traitType)) continue;
        if (value === undefined || value === null || value === "") continue;

        const img = await loadTraitImage(traitType, value);
        if (!img) continue;

        img.alt = "";
        img.style.position = "absolute";
        img.style.inset = "0";
        img.style.width = "100%";
        img.style.height = "100%";

        frog.layers.push(img);
        frog.el.appendChild(img);
      }
    } catch (err) {
      console.warn("[scatter-frogs] metadata/layers failed for token", frog.tokenId, err);
    }
  }

  function chooseTokenIdForNewFrog() {
    const useForced = Array.isArray(forcedTokenIds) && forcedTokenIds.length > 0;
    if (useForced) {
      return forcedTokenIds[randInt(0, forcedTokenIds.length - 1)];
    }
    return randInt(1, MAX_TOKEN_ID);
  }

  function createSingleFrog(tokenId, x, y) {
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
      idleMin = 1.2; idleMax = 4.0;
      hopMin = 0.4; hopMax = 0.8;
      heightMin = 8;  heightMax = 22;
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

      idleMin, idleMax,
      hopDurMin: hopMin,
      hopDurMax: hopMax,
      hopHeightMin: heightMin,
      hopHeightMax: heightMax,

      layers: []
    };

    frogs.push(frog);
    buildFrogLayers(frog);
    return frog;
  }

  // -----------------------------
  // Frog simulation
  // -----------------------------
  function chooseHopDestination(frog, width, height) {
    const minX = 8;
    const maxX = width - FROG_SIZE - 8;
    const minY = 8;
    const maxY = height - FROG_SIZE - 8;

    let tx, ty;

    if (mouse.follow && mouse.active) {
      tx = mouse.x - FROG_SIZE / 2;
      ty = mouse.y - FROG_SIZE / 2;
    } else if (target.active) {
      tx = target.x - FROG_SIZE / 2;
      ty = target.y - FROG_SIZE / 2;
    } else {
      // wander
      const dir = Math.random() * Math.PI * 2;
      const dist = randRange(40, 220);
      tx = frog.x + Math.cos(dir) * dist;
      ty = frog.baseY + Math.sin(dir) * dist;
    }

    tx = clamp(tx, minX, maxX);
    ty = clamp(ty, minY, maxY);

    frog.hopStartX      = frog.x;
    frog.hopStartBaseY  = frog.baseY;
    frog.hopEndX        = tx;
    frog.hopEndBaseY    = ty;
    frog.hopTime        = 0;
    frog.hopDuration    = randRange(frog.hopDurMin, frog.hopDurMax);
    frog.hopHeight      = randRange(frog.hopHeightMin, frog.hopHeightMax);
    frog.state          = "hopping";
  }

  function updateFrogs(dt, width, height) {
    const speedFactor = frogSpeedBase * frogSpeedTemp;
    const jumpFactor  = frogJumpTempMult;

    for (const frog of frogs) {
      if (!frog || !frog.el) continue;

      if (frog.state === "idle") {
        frog.idleTime -= dt * speedFactor;
        if (frog.idleTime <= 0) {
          frog.idleTime = 0;

          // vary hop height a bit
          const spice = Math.random();
          if (spice < 0.1) {
            frog.hopHeight = randRange(frog.hopHeightMax * 1.1, frog.hopHeightMax * 1.8);
          } else if (spice < 0.25) {
            frog.hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            frog.hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }

          chooseHopDestination(frog, width, height);
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt * speedFactor;
        const t = Math.min(1, frog.hopTime / frog.hopDuration);

        // interpolate along the ground path
        const groundX = frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY = frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        // parabolic hop offset with global jump multiplier
        const offset = -4 * frog.hopHeight * jumpFactor * t * (1 - t);

        frog.x = groundX;
        frog.baseY = groundBaseY;
        frog.y = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";
          frog.idleTime = randRange(frog.idleMin, frog.idleMax);
          frog.y = frog.baseY;
        }
      }

      const drawY = frog.y + scrollOffsetY;
      frog.el.style.transform = `translate3d(${frog.x}px, ${drawY}px, 0)`;
    }
  }

  // Group hop triggers (for scroll / nav)
  function triggerGroupHop(reason) {
    for (const frog of frogs) {
      if (!frog || !frog.el) continue;

      frog.hopStartX = frog.x;
      frog.hopStartBaseY = frog.baseY;
      frog.hopEndX = frog.x;
      frog.hopEndBaseY = frog.baseY;
      frog.hopTime = 0;
      frog.hopDuration = randRange(frog.hopDurMin, frog.hopDurMax);
      frog.hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
      frog.state = "hopping";
    }
  }

  function setTargetNormalized(nx, ny) {
    const width  = window.innerWidth;
    const height = window.innerHeight;
    target.active = true;
    target.x = width * nx;
    target.y = height * ny;
  }

  // Optional nav hooks
  window.ffScatterFrogsGoto = function (nx, ny) {
    setTargetNormalized(nx, ny);
  };
  window.ffScatterFrogsGotoMorph = function () {
    setTargetNormalized(0.8, 0.45);
    triggerGroupHop("morph-view");
  };
  window.ffScatterFrogsGotoPond = function () {
    setTargetNormalized(0.5, 0.85);
    triggerGroupHop("pond-view");
  };
  window.ffScatterFrogsGotoCenter = function () {
    setTargetNormalized(0.5, 0.5);
  };
  window.ffScatterFrogsCelebrateMorph = function () {
    setTargetNormalized(0.5, 0.3);
    triggerGroupHop("new-morph");
  };

  // Let site.js inject a specific list of tokenIds (e.g., all staked frogs)
  window.ffScatterSetTokenIds = function (ids) {
    if (!Array.isArray(ids) || !ids.length) return;

    forcedTokenIds = ids
      .map((v) => parseInt(v, 10))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= MAX_TOKEN_ID);

    if (!forcedTokenIds.length) return;

    if (typeof resetAndStart === "function") {
      resetAndStart();
    }
  };

  // -----------------------------
  // Events
  // -----------------------------
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
    target.active = false;
  });

  window.addEventListener("scroll", () => {
    const y = window.scrollY || 0;
    const dy = y - lastScrollY;
    lastScrollY = y;

    scrollOffsetY -= dy * 0.15;
    const maxOffset = 80;
    if (scrollOffsetY > maxOffset) scrollOffsetY = maxOffset;
    if (scrollOffsetY < -maxOffset) scrollOffsetY = -maxOffset;

    const doc = document.documentElement || document.body;
    const maxScroll = (doc.scrollHeight - doc.clientHeight) || 0;
    if (maxScroll > 0) {
      const atTop = y <= 5;
      const atBottom = y + 5 >= maxScroll;
      if (atTop) triggerGroupHop("scroll-top");
      else if (atBottom) triggerGroupHop("scroll-bottom");
    }
  });

  // -----------------------------
  // HUD (timer)
  // -----------------------------
  function ensureHud() {
    if (hudEl) return;
    hudEl = document.createElement("div");
    hudEl.className = "scatter-hud";
    hudEl.style.position = "fixed";
    hudEl.style.top = "10px";
    hudEl.style.left = "10px";
    hudEl.style.zIndex = "9999";
    hudEl.style.padding = "4px 8px";
    hudEl.style.borderRadius = "4px";
    hudEl.style.background = "rgba(0,0,0,0.55)";
    hudEl.style.color = "#f5f7ff";
    hudEl.style.fontFamily = "monospace";
    hudEl.style.fontSize = "13px";
    hudEl.style.pointerEvents = "none";
    document.body.appendChild(hudEl);
  }

  function formatTime(sec) {
    const s = Math.max(0, sec);
    const whole = Math.floor(s);
    const tenths = Math.floor((s - whole) * 10);
    const minutes = Math.floor(whole / 60);
    const seconds = whole % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${seconds}.${tenths}s`;
  }

  function updateHud() {
    if (!hudEl) return;
    const current = formatTime(elapsedTime);
    const best    = bestTime > 0 ? formatTime(bestTime) : "--";
    const frogsCount = frogs.length;
    const status = isGameOver ? " – GAME OVER" : "";
    hudEl.textContent = `Time: ${current}  |  Best: ${best}  |  Frogs: ${frogsCount}${status}`;
  }

  // -----------------------------
  // Main loop
  // -----------------------------
  function drawFrame(timestamp) {
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const t = timestamp * 0.001;
    const dt = lastTime ? (t - lastTime) : 0;
    lastTime = t;

    // status effects / timers
    updateStatusEffects(dt);

    // survival timer
    if (!isGameOver) {
      elapsedTime += dt;
    }

    updateFrogs(dt, width, height);
    if (SNAKE_ENABLED) {
      updateSnake(dt, width, height);
    }
    updatePowerups(dt, width, height);

    // Check for game over (no frogs left)
    if (!isGameOver && frogs.length === 0) {
      isGameOver = true;
      if (elapsedTime > bestTime) {
        bestTime = elapsedTime;
      }
    }

    updateHud();

    animId = requestAnimationFrame(drawFrame);
  }

  async function createFrogs(width, height) {
    frogs = [];
    powerups = [];
    container.innerHTML = "";

    let positions;
    let tokenIds;

    const useForced = Array.isArray(forcedTokenIds) && forcedTokenIds.length > 0;

    if (useForced) {
      tokenIds = forcedTokenIds.slice();
      positions = computeFrogPositionsForTokenCount(tokenIds.length, width, height);
    } else {
      positions = computeFrogPositions(width, height);
      tokenIds  = pickRandomTokenIds(positions.length);
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i % tokenIds.length];
      createSingleFrog(tokenId, pos.x, pos.y);
    }
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
    mouse.follow = false;

    // reset status + timers for a fresh run
    frogSpeedBase       = 1;
    frogSpeedTemp       = 1;
    frogSpeedTempTimer  = 0;
    frogJumpTempMult    = 1;
    frogJumpTempTimer   = 0;
    snakeSpeedFactor    = 1;
    snakeSlowTimer      = 0;
    elapsedTime         = 0;
    isGameOver          = false;

    ensureHud();

    await createFrogs(width, height);

    if (SNAKE_ENABLED) {
      initSnake(width, height);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
