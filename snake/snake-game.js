// /snake/snake-game.js
(function () {
  // -----------------------------
  // Config & constants
  // -----------------------------
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "/frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "/frog/build_files";

  const FROG_COUNT   = 100;

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
    "partyHat",
    "sombrero",
    "wizardHatPurple",
    "wizardHatBlue"
  ]);

  // Traits we don’t render as layers
  const SKIP_TRAITS = new Set(["Background", "background", "BG", "Bg"]);

  // Power-up settings
  const POWERUP_RADIUS      = 14;
  const POWERUP_TTL         = 8;
  const POWERUP_SPAWN_EVERY = 4;  // seconds between spawn attempts
  const POWERUP_MAX_ACTIVE  = 4;
  const BUFF_DURATION       = 6;  // seconds

  // Snake settings
  const SNAKE_SEGMENT_SIZE     = 48;
  const SNAKE_BASE_SPEED       = 110;
  const SNAKE_SEGMENT_GAP      = 7;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS       = 40;

  // -----------------------------
  // DOM & global state
  // -----------------------------
  const container = document.getElementById("frog-bg");
  if (!container) return;

  const frogs = [];
  const powerups = [];
  let snake = null;

  // Mouse
  const mouse = {
    x: 0,
    y: 0,
    seen: false
  };

  // Scroll offset (if page ever scrolls)
  let scrollOffsetY = 0;
  let lastScrollY   = window.scrollY || 0;

  // Buff timers (affect frogs)
  let frogSpeedBuffTime = 0;
  let frogJumpBuffTime  = 0;
  let frogSlowBuffTime  = 0;

  // Power-up spawn timer
  let powerupSpawnTimer = 0;

  // Game timer
  let gameElapsedTime = 0;
  let gameOver        = false;
  let timerEl         = null;

  // Animation
  let lastTime = 0;
  let rafId    = null;

  // Metadata caches
  const metaCache        = new Map();
  const traitImageCache  = new Map();

  // -----------------------------
  // Utility helpers
  // -----------------------------
  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function pickRandomTokenIds(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(1 + Math.floor(Math.random() * MAX_TOKEN_ID));
    }
    return ids;
  }

  // -----------------------------
  // Sound pools (no queuing)
  // -----------------------------
  function makeSoundPool(srcs, volume, poolPerSrc) {
    const audios = [];
    const per    = poolPerSrc || 3;
    const vol    = volume == null ? 1 : volume;

    srcs.forEach(function (src) {
      for (let i = 0; i < per; i++) {
        const a = new Audio(src);
        a.volume = vol;
        audios.push(a);
      }
    });

    return function playRandom() {
      if (!audios.length) return;
      const startIndex = Math.floor(Math.random() * audios.length);
      for (let i = 0; i < audios.length; i++) {
        const a = audios[(startIndex + i) % audios.length];
        if (a.paused || a.ended) {
          try {
            a.currentTime = 0;
            a.play();
          } catch (e) {}
          return;
        }
      }
      // all voices busy → drop this event, do NOT queue
    };
  }

  // audio instances
  let playFrogHop       = null;
  let playFrogDeath     = null;
  let playFrogSpeedBuff = null;
  let playFrogJumpBuff  = null;
  let playFrogSlowBuff  = null;
  let playSnakeEat      = null;

  function initAudio() {
    if (playFrogHop) return;

    const base = "."; // sounds live next to snake-game.js in /snake/

    playFrogHop = makeSoundPool(
      [
        base + "/ribbitOne.mp3",
        base + "/ribbitTwo.mp3",
        base + "/ribbitThree.mp3",
        base + "/ribbitBase.mp3"
      ],
      0.6,
      2
    );
    playFrogDeath     = makeSoundPool([base + "/frogDeath.mp3"],   0.85, 4);
    playFrogSpeedBuff = makeSoundPool([base + "/superSpeed.mp3"],  0.85, 2);
    playFrogJumpBuff  = makeSoundPool([base + "/superJump.mp3"],   0.85, 2);
    playFrogSlowBuff  = makeSoundPool([base + "/slowed.mp3"],      0.85, 2);
    playSnakeEat      = makeSoundPool([base + "/munch.mp3"],       0.7,  4);
  }

  // -----------------------------
  // Timer UI
  // -----------------------------
  function ensureTimer() {
    if (timerEl) return;
    timerEl = document.createElement("div");
    timerEl.className = "snake-timer";
    timerEl.textContent = "Time 00:00";
    document.body.appendChild(timerEl);
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const mins  = Math.floor(total / 60);
    const secs  = total % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function updateTimerText() {
    if (!timerEl) return;
    const label = gameOver ? "Final Time" : "Time";
    timerEl.textContent = label + " " + formatTime(gameElapsedTime);
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    updateTimerText();
    if (timerEl) {
      timerEl.style.background = "rgba(0,0,0,0.85)";
    }
  }

  // -----------------------------
  // Metadata & layering
  // -----------------------------
  function fetchMetadata(tokenId) {
    if (metaCache.has(tokenId)) {
      return metaCache.get(tokenId);
    }
    const url = META_BASE + tokenId + META_EXT;
    const p = fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Metadata HTTP " + res.status);
        return res.json();
      })
      .catch(function () {
        return { attributes: [] };
      });
    metaCache.set(tokenId, p);
    return p;
  }

  function loadTraitImage(traitType, value) {
    const v   = String(value);
    const key = traitType + "::" + v;

    if (traitImageCache.has(key)) {
      return traitImageCache.get(key);
    }

    const pngUrl = BUILD_BASE + "/" + traitType + "/" + v + ".png";
    const canAnimate = SCATTER_ANIMATED_VALUES.has(v);

    const p = new Promise(function (resolve) {
      if (!canAnimate) {
        const png = new Image();
        png.decoding = "async";
        png.onload   = function () { resolve(png); };
        png.onerror  = function () { resolve(null); };
        png.src      = pngUrl;
        return;
      }

      const gifUrl = BUILD_BASE + "/" + traitType + "/animations/" + v + "_animation.gif";
      const gif = new Image();
      gif.decoding = "async";
      gif.onload   = function () { resolve(gif); };
      gif.onerror  = function () {
        const png = new Image();
        png.decoding = "async";
        png.onload   = function () { resolve(png); };
        png.onerror  = function () { resolve(null); };
        png.src      = pngUrl;
      };
      gif.src = gifUrl;
    });

    traitImageCache.set(key, p);
    return p;
  }

  async function buildLayersForFrog(frog, meta) {
    if (!frog || !frog.el) return;
    frog.el.innerHTML = "";
    frog.layers = [];

    const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (!attr) continue;
      const traitType = attr.trait_type;
      const value     = attr.value;
      if (!traitType || typeof value === "undefined") continue;
      if (SKIP_TRAITS.has(traitType)) continue;

      const img = await loadTraitImage(traitType, value);
      if (!img) continue;

      img.alt = "";
      img.style.position = "absolute";
      img.style.inset    = "0";
      img.style.width    = "100%";
      img.style.height   = "100%";
      img.style.imageRendering = "pixelated";
      img.style.objectFit      = "contain";
      img.style.pointerEvents  = "none";

      frog.el.appendChild(img);
      frog.layers.push(img);
    }
  }

  function hydrateFrogAppearance(frog) {
    fetchMetadata(frog.tokenId)
      .then(function (meta) { return buildLayersForFrog(frog, meta); })
      .catch(function () {});
  }

  // -----------------------------
  // Frogs: creation & hopping
  // -----------------------------
  function computeFrogPositions(width, height, count) {
    const positions = [];
    const MIN_DIST  = 52;
    const margin    = 16;

    let safety = count * 80;
    while (positions.length < count && safety-- > 0) {
      const x = margin + Math.random() * (width  - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const cx = x + FROG_SIZE / 2;
      const cy = y + FROG_SIZE / 2;

      let ok = true;
      for (let i = 0; i < positions.length; i++) {
        const p  = positions[i];
        const px = p.x + FROG_SIZE / 2;
        const py = p.y + FROG_SIZE / 2;
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) positions.push({ x: x, y: y });
    }
    return positions;
  }

  function createFrogs(width, height) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    frogs.length = 0;

    const positions = computeFrogPositions(width, height, FROG_COUNT);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos     = positions[i];
      const tokenId = tokenIds[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";
      el.style.width  = FROG_SIZE + "px";
      el.style.height = FROG_SIZE + "px";
      el.style.transform = "translate3d(" + pos.x + "px," + pos.y + "px,0)";
      container.appendChild(el);

      // Frog "personality" for timing
      const roll = Math.random();
      let idleMin, idleMax, hopMin, hopMax, hMin, hMax;
      if (roll < 0.25) {
        idleMin = 0.3; idleMax = 1.0;
        hopMin  = 0.25; hopMax = 0.55;
        hMin    = 14;   hMax   = 32;
      } else if (roll < 0.6) {
        idleMin = 0.8; idleMax = 3.0;
        hopMin  = 0.35; hopMax = 0.7;
        hMin    = 10;   hMax   = 26;
      } else {
        idleMin = 1.5; idleMax = 4.5;
        hopMin  = 0.45; hopMax = 0.9;
        hMin    = 6;    hMax   = 20;
      }

      const frog = {
        tokenId: tokenId,
        el: el,
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
        hopHeight: randRange(hMin, hMax),

        idleMin: idleMin,
        idleMax: idleMax,
        hopDurMin: hopMin,
        hopDurMax: hopMax,
        hopHeightMin: hMin,
        hopHeightMax: hMax,

        layers: []
      };

      frogs.push(frog);
      hydrateFrogAppearance(frog);
    }
  }

  function chooseHopDestination(frog, width, height) {
    const marginX = 8;
    const marginY = 24;
    const maxStep = 40;

    let targetX = frog.x;
    let targetBaseY = frog.baseY;

    if (mouse.seen) {
      const goalX = mouse.x - FROG_SIZE / 2;
      const goalY = mouse.y - FROG_SIZE / 2;

      const dx = goalX - frog.x;
      const dy = goalY - frog.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = Math.min(maxStep, dist);

      targetX     = frog.x     + (dx / dist) * step;
      targetBaseY = frog.baseY + (dy / dist) * step;
    } else {
      targetX     = frog.x     + randRange(-12, 12);
      targetBaseY = frog.baseY + randRange(-6,  6);
    }

    targetX     = clamp(targetX,     marginX,                 width  - marginX - FROG_SIZE);
    targetBaseY = clamp(targetBaseY, marginY,                 height - marginY - FROG_SIZE);

    frog.hopStartX      = frog.x;
    frog.hopStartBaseY  = frog.baseY;
    frog.hopEndX        = targetX;
    frog.hopEndBaseY    = targetBaseY;
  }

  function getBuffState() {
    let hopDurationMul = 1;
    let idleTimeMul    = 1;
    let hopHeightMul   = 1;

    if (frogSpeedBuffTime > 0) {
      hopDurationMul *= 0.7;
      idleTimeMul    *= 0.6;
    }
    if (frogSlowBuffTime > 0) {
      hopDurationMul *= 1.4;
      idleTimeMul    *= 1.6;
    }
    if (frogJumpBuffTime > 0) {
      hopHeightMul   *= 2.5;
    }

    return {
      hopDurationMul: hopDurationMul,
      idleTimeMul:    idleTimeMul,
      hopHeightMul:   hopHeightMul
    };
  }

  function updateFrogs(dt, width, height) {
    const marginX = 8;
    const marginY = 24;
    const buff    = getBuffState();

    for (let i = 0; i < frogs.length; i++) {
      const frog = frogs[i];

      if (frog.state === "idle") {
        frog.idleTime -= dt;
        frog.y = frog.baseY;

        if (!gameOver && frog.idleTime <= 0) {
          frog.state = "hopping";
          frog.hopTime = 0;

          let hopDuration = randRange(frog.hopDurMin, frog.hopDurMax);
          hopDuration *= buff.hopDurationMul;
          frog.hopDuration = hopDuration;

          const spice = Math.random();
          let hopHeight;
          if (spice < 0.1) {
            hopHeight = randRange(frog.hopHeightMax * 1.1, frog.hopHeightMax * 1.8);
          } else if (spice < 0.25) {
            hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }
          hopHeight *= buff.hopHeightMul;
          frog.hopHeight = hopHeight;

          if (playFrogHop && !gameOver) playFrogHop();

          chooseHopDestination(frog, width, height);
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const t = clamp(frog.hopTime / frog.hopDuration, 0, 1);

        const groundX =
          frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY =
          frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        const offset = -4 * frog.hopHeight * t * (1 - t);

        frog.x     = groundX;
        frog.baseY = groundBaseY;
        frog.y     = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";

          let idleTime = randRange(frog.idleMin, frog.idleMax);
          idleTime *= buff.idleTimeMul;
          frog.idleTime = idleTime;

          frog.x     = frog.hopEndX;
          frog.baseY = frog.hopEndBaseY;
          frog.y     = frog.baseY;

          frog.x     = clamp(frog.x,     marginX,                 width  - marginX - FROG_SIZE);
          frog.baseY = clamp(frog.baseY, marginY,                 height - marginY - FROG_SIZE);
        }
      }

      const renderY = frog.y + scrollOffsetY;
      frog.el.style.transform =
        "translate3d(" + frog.x + "px," + renderY + "px,0)";
    }
  }

  // -----------------------------
  // Power-ups
  // -----------------------------
  function rollPowerupType() {
    const r = Math.random();
    if (r < 0.4) return "frog-speed";
    if (r < 0.75) return "frog-jump";
    return "frog-slow";
  }

  function spawnPowerup(width, height) {
    if (powerups.length >= POWERUP_MAX_ACTIVE) return;

    const type = rollPowerupType();
    const size = POWERUP_RADIUS * 2;
    const margin = 40;

    const x = margin + Math.random() * (width  - margin * 2 - size);
    const y = margin + Math.random() * (height - margin * 2 - size);

    const el = document.createElement("div");
    el.className = "frog-powerup";
    el.style.position      = "absolute";
    el.style.width         = size + "px";
    el.style.height        = size + "px";
    el.style.borderRadius  = "50%";
    el.style.border        = "2px solid rgba(0,0,0,0.6)";
    el.style.boxShadow     = "0 0 10px rgba(0,0,0,0.4)";
    el.style.pointerEvents = "none";
    el.style.zIndex        = "20";

    if (type === "frog-speed") {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #7bffb1)";
    } else if (type === "frog-jump") {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #7cc1ff)";
    } else {
      el.style.background =
        "radial-gradient(circle at 30% 30%, #ffffff, #ffd36b)";
    }

    container.appendChild(el);

    powerups.push({
      type: type,
      x: x,
      baseY: y,
      ttl: POWERUP_TTL,
      el: el
    });
  }

  function applyPowerup(type) {
    if (type === "frog-speed") {
      frogSpeedBuffTime = BUFF_DURATION;
      if (playFrogSpeedBuff) playFrogSpeedBuff();
    } else if (type === "frog-jump") {
      frogJumpBuffTime = BUFF_DURATION;
      if (playFrogJumpBuff) playFrogJumpBuff();
    } else if (type === "frog-slow") {
      frogSlowBuffTime = BUFF_DURATION;
      if (playFrogSlowBuff) playFrogSlowBuff();
    }
  }

  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (!p) continue;

      if (!gameOver) {
        p.ttl -= dt;
      }
      if (p.ttl <= 0) {
        if (p.el && p.el.parentNode === container) {
          container.removeChild(p.el);
        }
        powerups.splice(i, 1);
        continue;
      }

      const lifeT = p.ttl / POWERUP_TTL;
      const pulse = 1 + 0.15 * Math.sin((1 - lifeT) * Math.PI * 4);
      const bob   = Math.sin((1 - lifeT) * Math.PI * 2) * 3;

      const renderY = p.baseY + scrollOffsetY + bob;
      p.el.style.transform =
        "translate3d(" + p.x + "px," + renderY + "px,0) scale(" + pulse + ")";
      p.el.style.opacity = String(clamp(lifeT + 0.2, 0, 1));

      // collision with frogs
      const pcx = p.x + POWERUP_RADIUS;
      const pcy = p.baseY + POWERUP_RADIUS;

      let collected = false;
      for (let j = 0; j < frogs.length; j++) {
        const frog = frogs[j];
        const fx   = frog.x + FROG_SIZE / 2;
        const fy   = frog.baseY + FROG_SIZE / 2;
        const dx   = fx - pcx;
        const dy   = fy - pcy;
        const rad  = FROG_SIZE / 2 + POWERUP_RADIUS;

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

  // -----------------------------
  // Snake
  // -----------------------------
  function initSnake(width, height) {
    // clear any existing snake dom
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (let i = 0; i < snake.segments.length; i++) {
          const seg = snake.segments[i];
          if (seg && seg.el && seg.el.parentNode === container) {
            container.removeChild(seg.el);
          }
        }
      }
    }

    const startX = width * 0.25;
    const startY = height * 0.5;

    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    headEl.style.backgroundImage = "url(./head.png)";
    container.appendChild(headEl);

    const segments = [];
    for (let i = 0; i < SNAKE_INITIAL_SEGMENTS; i++) {
      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.backgroundImage = "url(./body.png)";
      container.appendChild(segEl);

      segments.push({
        el: segEl,
        x: startX - (i + 1) * SNAKE_SEGMENT_GAP,
        y: startY
      });
    }

    const path = [];
    for (let i = 0; i < (SNAKE_INITIAL_SEGMENTS + 4) * SNAKE_SEGMENT_GAP; i++) {
      path.push({ x: startX - i, y: startY });
    }

    snake = {
      head: {
        el: headEl,
        x: startX,
        y: startY,
        angle: 0
      },
      segments: segments,
      path: path
    };
  }

  function growSnake(extraSegments) {
    if (!snake) return;
    const segments = snake.segments;
    const count    = extraSegments || 1;

    for (let i = 0; i < count; i++) {
      const tailIndex = segments.length - 1;
      const tailSeg   = segments[tailIndex];

      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.backgroundImage = "url(./body.png)";
      container.appendChild(segEl);

      segments.push({
        el: segEl,
        x: tailSeg ? tailSeg.x : snake.head.x,
        y: tailSeg ? tailSeg.y : snake.head.y
      });
    }

    const desiredLen = (segments.length + 4) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length < desiredLen) {
      const last = snake.path[snake.path.length - 1];
      snake.path.push({ x: last.x, y: last.y });
    }
  }

  function updateSnake(dt, width, height, scrollDelta) {
    if (!snake) return;

    const head     = snake.head;
    const segments = snake.segments;
    const path     = snake.path;

    const speed = SNAKE_BASE_SPEED;

    // Smooth follow mouse; if we never saw the mouse, wander right
    const targetX = mouse.seen ? mouse.x : head.x + 1;
    const targetY = mouse.seen ? mouse.y : head.y;

    head.x += (targetX - head.x) * dt * 4;
    head.y += (targetY - head.y) * dt * 4;

    head.y += scrollDelta * 0.1;

    // Path history
    if (!gameOver) {
      path.push({ x: head.x, y: head.y });
      while (path.length > (segments.length + 4) * SNAKE_SEGMENT_GAP) {
        path.shift();
      }
    }

    // Direction along path
    let closestIndex = 0;
    let closestDist  = Infinity;
    for (let i = 0; i < path.length; i++) {
      const dx = path[i].x - head.x;
      const dy = path[i].y - head.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDist) {
        closestDist  = d2;
        closestIndex = i;
      }
    }

    const nextIndex = Math.min(path.length - 1, closestIndex + 1);
    const dirX = path[nextIndex].x - head.x;
    const dirY = path[nextIndex].y - head.y;
    const angle = Math.atan2(dirY, dirX);
    head.angle = angle;

    if (!gameOver) {
      head.x += Math.cos(angle) * speed * dt;
      head.y += Math.sin(angle) * speed * dt;
    }

    const headRenderY = head.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
    head.el.style.transform =
      "translate3d(" +
      (head.x - SNAKE_SEGMENT_SIZE / 2) + "px," +
      headRenderY + "px,0) rotate(" + angle + "rad)";

    // position segments
    let segIndex = closestIndex;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      segIndex = Math.min(path.length - 1, segIndex + SNAKE_SEGMENT_GAP);
      const p = path[segIndex];
      if (!p) continue;

      seg.x = p.x;
      seg.y = p.y;

      const segY = seg.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
      seg.el.style.transform =
        "translate3d(" +
        (seg.x - SNAKE_SEGMENT_SIZE / 2) + "px," +
        segY + "px,0) rotate(" + angle + "rad)";
    }

    if (gameOver) return;

    // Eat frogs
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        const cx = fx;
        const cy = fy;

        if (frog.el && frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1); // never respawn

        if (playFrogDeath) playFrogDeath();
        if (playSnakeEat)  playSnakeEat();

        growSnake(1);

        // chance to drop an extra power-up on death
        if (Math.random() < 0.5) {
          spawnPowerup(width, height);
        }
      }
    }
  }

  // -----------------------------
  // Input & scroll
  // -----------------------------
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.seen = true;
  });

  window.addEventListener("scroll", function () {
    const y  = window.scrollY || 0;
    const dy = y - lastScrollY;
    lastScrollY   = y;
    scrollOffsetY -= dy * 0.5;
  });

  // -----------------------------
  // Main loop
  // -----------------------------
  function step(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    const width  = window.innerWidth;
    const height = window.innerHeight;

    // Scroll delta for snake/powerups
    const y  = window.scrollY || 0;
    const dy = y - lastScrollY;
    lastScrollY   = y;
    scrollOffsetY -= dy * 0.5;

    if (!gameOver) {
      // timers
      if (frogSpeedBuffTime > 0) frogSpeedBuffTime = Math.max(0, frogSpeedBuffTime - dt);
      if (frogJumpBuffTime  > 0) frogJumpBuffTime  = Math.max(0, frogJumpBuffTime  - dt);
      if (frogSlowBuffTime  > 0) frogSlowBuffTime  = Math.max(0, frogSlowBuffTime  - dt);

      gameElapsedTime += dt;
      updateTimerText();

      powerupSpawnTimer += dt;
      if (powerupSpawnTimer >= POWERUP_SPAWN_EVERY) {
        powerupSpawnTimer = 0;
        spawnPowerup(width, height);
      }

      updateFrogs(dt, width, height);
      updateSnake(dt, width, height, dy);
      updatePowerups(dt);

      if (!frogs.length) {
        endGame();
      }
    } else {
      // keep snake & powerups glued to scroll even after game over
      updateSnake(0, width, height, dy);
      updatePowerups(0);
    }

    rafId = window.requestAnimationFrame(step);
  }

  function startGame() {
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    lastTime         = 0;
    scrollOffsetY    = 0;
    lastScrollY      = window.scrollY || 0;
    frogSpeedBuffTime = 0;
    frogJumpBuffTime  = 0;
    frogSlowBuffTime  = 0;
    powerupSpawnTimer = 0;
    gameElapsedTime   = 0;
    gameOver          = false;

    initAudio();
    ensureTimer();
    updateTimerText();
    createFrogs(width, height);
    initSnake(width, height);

    rafId = window.requestAnimationFrame(step);
  }

  window.addEventListener("load", startGame);
  window.addEventListener("resize", startGame);
})();
