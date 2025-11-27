// assets/scatter-frogs.js
(function () {
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "./frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "./frog/build_files";
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
    //'tongue',
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
    //'baseballCapBlue',
    //'baseballCapBackwards',
    //'topHat',
    //'cowboyHat',
    'crown',
    'wizardHat'
  ]);

  const container = document.getElementById("frog-bg");
  if (!container) {
    return;
  }

  container.classList.add("frog-scatter-container");

  const style = document.createElement("style");
  style.textContent = `
    #frog-bg.frog-scatter-container {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: -1;
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

    .frog-layer.hidden {
      display: none;
    }

    .frog-snake-head,
    .frog-snake-body,
    .frog-snake-tail {
      position: absolute;
      width: ${FROG_SIZE}px;
      height: ${FROG_SIZE}px;
      image-rendering: pixelated;
      pointer-events: none;
      background-repeat: no-repeat;
      background-size: contain;
      background-position: center center;
      transform-origin: 50% 50%;
    }

    .frog-snake-head {
      background-image: url("./frog/snake/head.png");
    }
    .frog-snake-body {
      background-image: url("./frog/snake/body.png");
    }
    .frog-snake-tail {
      background-image: url("./frog/snake/tail.png");
    }

    body {
      background-color: #7cc1ff;
    }
  `;
  document.head.appendChild(style);

  let frogs = [];
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
    y: window.innerHeight / 2,
    active: false
  };

  let scrollOffsetY = 0;
  let lastScrollY = window.scrollY || 0;
  let lastGroupHopTime = 0;

  // -----------------------------
  // Snake game (optional)
  // -----------------------------
  const SNAKE_ENABLED = container && container.hasAttribute("data-snake-game");
  const SNAKE_SEGMENT_SIZE = 48;
  const SNAKE_SPEED = 90;
  const SNAKE_TURN_RATE = Math.PI * 1.5;
  const SNAKE_SEGMENT_GAP = 6;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS = 40;

  let snake = null;
  let snakeEatSound = null;

  // Frog jump / death sounds & game timer (snake game only)
  const FROG_JUMP_SOUNDS = [
    "/audio/ribbitOne.mp3",
    "/audio/ribbitTwo.mp3",
    "/audio/ribbitThree.mp3",
    "/audio/ribbitBase.mp3"
  ];
  const FROG_DEATH_SOUND = "/audio/frogDeath.mp3";
  const MAX_SIMULTANEOUS_FROG_JUMPS = 6;
  const MAX_SIMULTANEOUS_FROG_DEATHS = 4;
  const activeFrogJumpSounds = [];
  const activeFrogDeathSounds = [];

  let gameStartTime = null;
  let gameElapsed = 0;
  let gameEnded = false;
  let timerEl = null;

  function playSnakeEatSound() {
    if (!snakeEatSound) return;
    try {
      snakeEatSound.currentTime = 0;
      snakeEatSound.play();
    } catch (e) {
      // ignore autoplay / other errors
    }
  }

  function playFrogJumpSound() {
    if (!SNAKE_ENABLED || !FROG_JUMP_SOUNDS.length) return;

    // Don't start a new sound if too many are already playing.
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
    } catch (e) {
      // ignore autoplay errors
    }
  }

  function playFrogDeathSound() {
    if (!SNAKE_ENABLED || !FROG_DEATH_SOUND) return;

    // Don't start a new sound if too many are already playing.
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
    } catch (e) {
      // ignore autoplay errors
    }
  }

  function initSnake(width, height) {
    if (!SNAKE_ENABLED) return;
    if (!container) return;

    // clean up old snake if present
    if (snake && snake.head && snake.head.el && snake.head.el.parentNode === container) {
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
      targetX: width / 2,
      targetY: height / 2
    };

    const headEl = document.createElement("div");
    headEl.className = "frog-snake-head";
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
      segEl.className = isTail ? "frog-snake-tail" : "frog-snake-body";
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

    snakeEatSound = new Audio("/audio/snake-munch.mp3");
    snakeEatSound.volume = 0.8;
  }

  function growSnake(count) {
    if (!snake) return;
    for (let i = 0; i < count; i++) {
      const last = snake.segments[snake.segments.length - 1];
      const segEl = document.createElement("div");
      segEl.className = "frog-snake-tail";
      container.appendChild(segEl);

      if (snake.segments.length >= 2) {
        const prevTail = snake.segments[snake.segments.length - 1];
        const prevClass = prevTail.el.className;
        if (prevClass.indexOf("frog-snake-tail") !== -1) {
          prevTail.el.className = "frog-snake-body";
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

    let tx = target.x;
    let ty = target.y;
    if (!mouse.follow || !mouse.active) {
      tx = width / 2;
      ty = height / 2;
    }
    snake.targetX = tx;
    snake.targetY = ty;

    const dxTarget = snake.targetX - head.x;
    const dyTarget = snake.targetY - head.y;
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

    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        // eat frog
        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        // play sounds
        playSnakeEatSound();
        playFrogDeathSound();

        // grow snake (no frog respawn)
        growSnake(1);
      }
    }
  }

  // -----------------------------
  // Metadata / image helpers
  // -----------------------------
  async function fetchMetadata(tokenId) {
    const url = META_BASE + tokenId + META_EXT;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Metadata fetch failed: " + resp.status);
    const meta = await resp.json();
    return meta;
  }

  function buildLayeredFrogElement(frog) {
    const el = frog.el;
    el.innerHTML = "";

    for (const layer of frog.layers) {
      const layerEl = document.createElement("div");
      layerEl.className = "frog-layer";

      let url = layer.url;
      if (layer.animated) {
        const parts = url.split(".");
        const ext = parts.pop();
        url = parts.join(".") + "_animation.gif";
      }

      layerEl.style.backgroundImage = `url("${url}")`;

      el.appendChild(layerEl);
    }
  }

  function pickAnimatedValues(attributes) {
    const body = attributes.find(a => a.trait_type === "Body");
    const special = attributes.find(a => a.trait_type === "Special");
    const eye = attributes.find(a => a.trait_type === "Eye Accessory");
    const hat = attributes.find(a => a.trait_type === "Hat / Head Accessory");

    const animatedValues = [];

    if (body && SCATTER_ANIMATED_VALUES.has(body.value)) {
      animatedValues.push(body.value);
    }
    if (special && SCATTER_ANIMATED_VALUES.has(special.value)) {
      animatedValues.push(special.value);
    }
    if (eye && SCATTER_ANIMATED_VALUES.has(eye.value)) {
      animatedValues.push(eye.value);
    }
    if (hat && SCATTER_ANIMATED_VALUES.has(hat.value)) {
      animatedValues.push(hat.value);
    }

    return new Set(animatedValues);
  }

  function buildLayersForFrog(frog, meta) {
    const attrs = meta.attributes || [];
    const animatedValues = pickAnimatedValues(attrs);
    const layers = [];

    let basePath = `${BUILD_BASE}/base`;
    layers.push({ url: `${basePath}/${meta.imageBase || "base"}.png`, animated: false });

    for (const att of attrs) {
      const traitType = att.trait_type;
      const value = att.value;

      if (!value || value === "None") continue;

      let folder = null;
      switch (traitType) {
        case "Background":
          folder = "background";
          break;
        case "Body":
          folder = "body";
          break;
        case "Belly":
          folder = "belly";
          break;
        case "Spots":
          folder = "spots";
          break;
        case "Mouth":
          folder = "mouth";
          break;
        case "Eye Accessory":
          folder = "eye";
          break;
        case "Special":
          folder = "special";
          break;
        case "Hat / Head Accessory":
          folder = "hat";
          break;
        default:
          continue;
      }

      const valueSafe = String(value).replace(/\s+/g, "");
      const url = `${BUILD_BASE}/${folder}/${valueSafe}.png`;
      const animated = animatedValues.has(valueSafe);
      layers.push({ url, animated });
    }

    frog.layers = layers;
    buildLayeredFrogElement(frog);
  }

  // -----------------------------
  // Frog creation and animation
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

  async function createFrogs(width, height) {
    frogs = [];
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height, SNAKE_ENABLED ? 50 : null);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";

      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

      container.appendChild(el);

      const idleMin = 0.8;
      const idleMax = 3.5;
      const hopMin  = 0.45;
      const hopMax  = 0.90;
      const heightMin = 18;
      const heightMax = 36;

      const frog = {
        tokenId,
        el,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,
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

  // -----------------------------
  // Animation
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
          frog.hopDuration = randRange(frog.hopDurMin, frog.hopDurMax);

          // play ribbit when a frog starts a hop (snake game only)
          if (SNAKE_ENABLED) {
            playFrogJumpSound();
          }

          const spice = Math.random();
          if (spice < 0.1) {
            frog.hopHeight = randRange(frog.hopHeightMax * 1.0, frog.hopHeightMax * 1.6);
          } else if (spice > 0.9) {
            frog.hopHeight = randRange(frog.hopHeightMin * 0.7, frog.hopHeightMin * 1.1);
          } else {
            frog.hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }

          const hopDistMin = 24;
          const hopDistMax = 96;
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
          frog.idleTime = randRange(frog.idleMin, frog.idleMax);

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

  function drawFrame(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (SNAKE_ENABLED) {
      if (gameStartTime === null) {
        gameStartTime = time;
      }
      gameElapsed = (time - gameStartTime) / 1000;
      updateTimerDisplay(gameElapsed);
    }

    updateFrogs(dt, width, height);
    if (SNAKE_ENABLED) {
      updateSnake(dt, width, height);

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

  // First click: enable following mouse via hops; also hop nearest frog
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
      if (
        d2 < nearestDist2
      ) {
        nearestDist2 = d2;
        nearest = frog;
      }
    }

    const MAX_CLICK_RADIUS = 120;
    if (nearest && nearestDist2 <= MAX_CLICK_RADIUS * MAX_CLICK_RADIUS) {
      if (SNAKE_ENABLED) {
        playFrogJumpSound();
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

    await createFrogs(width, height);

    // init snake only on snake pages
    if (SNAKE_ENABLED) {
      initSnake(width, height);

      // (Re)start timer for snake game
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

      gameStartTime = null;
      gameElapsed = 0;
      gameEnded = false;
      updateTimerDisplay(0);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
