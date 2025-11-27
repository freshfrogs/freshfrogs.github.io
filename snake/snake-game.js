// /snake/snake-game.js
(function () {
  // -----------------------------
  // Basic config
  // -----------------------------
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "/frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "/frog/build_files";

  const FROG_COUNT   = 100;

  // Values that have animation variants for scatter frogs
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

  // Traits we don't render as layers
  const SKIP_TRAITS = new Set(["Background", "background", "BG", "Bg"]);

  // Snake config (keyboard controlled)
  const SNAKE_SEGMENT_SIZE = 48;
  const SNAKE_SPEED        = 160; // px/s
  const SNAKE_SEG_SPACING  = 12;
  const SNAKE_SEGMENTS_INIT = 6;
  const SNAKE_EAT_RADIUS   = 40;

  // Power-ups (still simple, can refine later)
  const POWERUP_RADIUS      = 14;
  const POWERUP_TTL         = 8;
  const POWERUP_SPAWN_EVERY = 6; // seconds between spawn tries
  const POWERUP_MAX_ACTIVE  = 4;
  const BUFF_DURATION       = 6;

  const container = document.getElementById("frog-bg");
  if (!container) return;

  // -----------------------------
  // State
  // -----------------------------
  let frogs    = [];
  let powerups = [];
  let snake    = null;

  let scrollOffsetY = 0;
  let lastScrollY   = window.scrollY || 0;

  // Keyboard direction for snake (no mouse)
  const dir = { x: 1, y: 0 }; // starts moving right

  // Buff timers
  let frogSpeedBuffTime = 0;
  let frogJumpBuffTime  = 0;
  let frogSlowBuffTime  = 0;

  // Powerup spawn timer
  let powerupSpawnTimer = 0;

  // Timer / game state
  let timerEl         = null;
  let gameElapsedTime = 0;
  let gameOver        = false;

  // Animation
  let lastTime = 0;
  let rafId    = null;

  // Metadata caches
  const metaCache       = new Map();
  const traitImageCache = new Map();

  // -----------------------------
  // Helpers
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
  function makeSoundPool(srcs, volume, perSrc) {
    const vol = volume == null ? 1 : volume;
    const per = perSrc || 3;
    const audios = [];

    srcs.forEach((src) => {
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
          } catch (_) {}
          return;
        }
      }
      // all busy -> drop this sound (no queue)
    };
  }

  let playFrogHop       = null;
  let playFrogDeath     = null;
  let playFrogSpeedBuff = null;
  let playFrogJumpBuff  = null;
  let playFrogSlowBuff  = null;
  let playSnakeEat      = null;

  function initAudio() {
    if (playFrogHop) return;
    const base = "."; // /snake

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
    playSnakeEat      = makeSoundPool([base + "/munch.mp3"],       0.7,  3);
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

  function formatTime(secs) {
    const t   = Math.floor(secs);
    const min = Math.floor(t / 60);
    const s   = t % 60;
    return String(min).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function updateTimerText() {
    if (!timerEl) return;
    const label = gameOver ? "Final Time" : "Time";
    timerEl.textContent = `${label} ${formatTime(gameElapsedTime)}`;
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
  // Metadata & trait images
  // -----------------------------
  function fetchMetadata(tokenId) {
    if (metaCache.has(tokenId)) return metaCache.get(tokenId);
    const url = META_BASE + tokenId + META_EXT;
    const p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(() => ({ attributes: [] }));
    metaCache.set(tokenId, p);
    return p;
  }

  function loadTraitImage(traitType, value) {
    const v = String(value);
    const key = traitType + "::" + v;
    if (traitImageCache.has(key)) return traitImageCache.get(key);

    const pngUrl = `${BUILD_BASE}/${traitType}/${v}.png`;
    const canAnim = SCATTER_ANIMATED_VALUES.has(v);

    const p = new Promise((resolve) => {
      if (!canAnim) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = pngUrl;
        return;
      }

      const gifUrl = `${BUILD_BASE}/${traitType}/animations/${v}_animation.gif`;
      const gif = new Image();
      gif.decoding = "async";
      gif.onload = () => resolve(gif);
      gif.onerror = () => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = pngUrl;
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
    for (const attr of attrs) {
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

    // Fallback: if no layers, show a simple colored tile so the frog is visible
    if (!frog.layers.length) {
      frog.el.style.background =
        "linear-gradient(135deg, #4caf50, #8bc34a)";
    }
  }

  function hydrateFrogAppearance(frog) {
    fetchMetadata(frog.tokenId)
      .then((meta) => buildLayersForFrog(frog, meta))
      .catch(() => {});
  }

  // -----------------------------
  // Frogs & hopping
  // -----------------------------
  function computeFrogPositions(width, height, count) {
    const positions = [];
    const MIN_DIST  = 52;
    const margin    = 16;
    let safety      = count * 100;

    while (positions.length < count && safety-- > 0) {
      const x = margin + Math.random() * (width  - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const cx = x + FROG_SIZE / 2;
      const cy = y + FROG_SIZE / 2;

      let ok = true;
      for (const p of positions) {
        const px = p.x + FROG_SIZE / 2;
        const py = p.y + FROG_SIZE / 2;
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) positions.push({ x, y });
    }

    return positions;
  }

  function createFrogs(width, height) {
    frogs = [];
    powerups = [];
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height, FROG_COUNT);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos     = positions[i];
      const tokenId = tokenIds[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";
      el.style.width  = FROG_SIZE + "px";
      el.style.height = FROG_SIZE + "px";
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      container.appendChild(el);

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
        hopHeight: randRange(hMin, hMax),

        idleMin, idleMax,
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

  function getFrogBuffState() {
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

    return { hopDurationMul, idleTimeMul, hopHeightMul };
  }

  function updateFrogs(dt, width, height) {
    const marginY = 24;
    const marginX = 8;
    const buff    = getFrogBuffState();

    for (const frog of frogs) {
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

          // random small hop direction
          frog.hopStartX     = frog.x;
          frog.hopStartBaseY = frog.baseY;
          let targetX        = frog.x + randRange(-16, 16);
          let targetBaseY    = frog.baseY + randRange(-10, 10);

          targetX     = clamp(targetX,     marginX,                 width  - marginX - FROG_SIZE);
          targetBaseY = clamp(targetBaseY, marginY,                 height - marginY - FROG_SIZE);

          frog.hopEndX      = targetX;
          frog.hopEndBaseY  = targetBaseY;
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
      frog.el.style.transform = `translate3d(${frog.x}px, ${renderY}px, 0)`;
    }
  }

  // -----------------------------
  // Powerups (collected by frogs)
  // -----------------------------
  function rollPowerupType() {
    const r = Math.random();
    if (r < 0.4) return "frog-speed";
    if (r < 0.75) return "frog-jump";
    return "frog-slow";
  }

  function spawnPowerup(width, height) {
    if (powerups.length >= POWERUP_MAX_ACTIVE) return;

    const size   = POWERUP_RADIUS * 2;
    const margin = 40;
    const x      = margin + Math.random() * (width  - margin * 2 - size);
    const y      = margin + Math.random() * (height - margin * 2 - size);

    const type = rollPowerupType();

    const el = document.createElement("div");
    el.className = "frog-powerup";
    el.style.position = "absolute";
    el.style.width    = size + "px";
    el.style.height   = size + "px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.zIndex       = "20";
    el.style.border       = "2px solid rgba(0,0,0,0.6)";
    el.style.boxShadow    = "0 0 10px rgba(0,0,0,0.35)";

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
      x,
      baseY: y,
      ttl: POWERUP_TTL,
      el
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
        `translate3d(${p.x}px, ${renderY}px, 0) scale(${pulse})`;
      p.el.style.opacity = String(clamp(lifeT + 0.2, 0, 1));

      // frog collects powerup
      const pcx = p.x + POWERUP_RADIUS;
      const pcy = p.baseY + POWERUP_RADIUS;
      let collected = false;

      for (const frog of frogs) {
        const fx  = frog.x + FROG_SIZE / 2;
        const fy  = frog.baseY + FROG_SIZE / 2;
        const dx  = fx - pcx;
        const dy  = fy - pcy;
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

  // -----------------------------
  // Snake (keyboard controlled)
  // -----------------------------
  function initSnake(width, height) {
    // remove old snake
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (const s of snake.segments) {
          if (s && s.el && s.el.parentNode === container) {
            container.removeChild(s.el);
          }
        }
      }
    }

    const startX = width * 0.2;
    const startY = height * 0.5;

    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    headEl.style.backgroundImage = "url(./head.png)";
    container.appendChild(headEl);

    const segments = [];
    for (let i = 0; i < SNAKE_SEGMENTS_INIT; i++) {
      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.backgroundImage = "url(./body.png)";
      container.appendChild(segEl);

      segments.push({
        el: segEl,
        x: startX - (i + 1) * SNAKE_SEG_SPACING,
        y: startY
      });
    }

    snake = {
      head: {
        el: headEl,
        x: startX,
        y: startY
      },
      segments
    };
  }

  function growSnake(extra) {
    if (!snake) return;
    const count = extra || 1;
    for (let i = 0; i < count; i++) {
      const tail = snake.segments[snake.segments.length - 1] || snake.head;
      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.backgroundImage = "url(./body.png)";
      container.appendChild(segEl);

      snake.segments.push({
        el: segEl,
        x: tail.x,
        y: tail.y
      });
    }
  }

  function updateSnake(dt, width, height, scrollDelta) {
    if (!snake) return;

    const margin = 24;

    // Move head by keyboard dir
    snake.head.x += dir.x * SNAKE_SPEED * dt;
    snake.head.y += dir.y * SNAKE_SPEED * dt;

    // Clamp inside screen
    snake.head.x = clamp(
      snake.head.x,
      margin + SNAKE_SEGMENT_SIZE / 2,
      width - margin - SNAKE_SEGMENT_SIZE / 2
    );
    snake.head.y = clamp(
      snake.head.y,
      margin + SNAKE_SEGMENT_SIZE / 2,
      height - margin - SNAKE_SEGMENT_SIZE / 2
    );

    // Scroll influence (if any)
    snake.head.y += scrollDelta * 0.1;

    // Body segments follow previous segment
    const all = [snake.head, ...snake.segments];
    for (let i = 1; i < all.length; i++) {
      const prev = all[i - 1];
      const seg  = all[i];

      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

      const desired = SNAKE_SEG_SPACING;
      if (dist > desired) {
        const step = dist - desired;
        seg.x += (dx / dist) * step;
        seg.y += (dy / dist) * step;
      }
    }

    // Render snake
    const angle = Math.atan2(
      all[1].y - snake.head.y,
      all[1].x - snake.head.x
    );
    const headRenderY = snake.head.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
    snake.head.el.style.transform =
      `translate3d(${snake.head.x - SNAKE_SEGMENT_SIZE / 2}px, ${headRenderY}px, 0) rotate(${angle}rad)`;

    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      const segY = seg.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
      seg.el.style.transform =
        `translate3d(${seg.x - SNAKE_SEGMENT_SIZE / 2}px, ${segY}px, 0) rotate(${angle}rad)`;
    }

    if (gameOver) return;

    // Eat frogs (never respawn)
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;
      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - snake.head.x;
      const dy = fy - snake.head.y;
      if (dx * dx + dy * dy <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        const centerX = fx;
        const centerY = fy;

        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        if (playFrogDeath) playFrogDeath();
        if (playSnakeEat)  playSnakeEat();
        growSnake(1);

        // small chance to spawn extra buff on death
        if (Math.random() < 0.4) {
          spawnPowerup(width, height);
        }
      }
    }
  }

  // -----------------------------
  // Keyboard controls (NO mouse)
  // -----------------------------
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (key === "arrowup" || key === "w") {
      if (dir.y === 1) return; // prevent instant reverse
      dir.x = 0; dir.y = -1;
    } else if (key === "arrowdown" || key === "s") {
      if (dir.y === -1) return;
      dir.x = 0; dir.y = 1;
    } else if (key === "arrowleft" || key === "a") {
      if (dir.x === 1) return;
      dir.x = -1; dir.y = 0;
    } else if (key === "arrowright" || key === "d") {
      if (dir.x === -1) return;
      dir.x = 1; dir.y = 0;
    }

    // user interaction -> make sure audio is unmuted
    initAudio();
  });

  // Track scroll for simple parallax
  window.addEventListener("scroll", () => {
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
      // freeze frogs; keep snake/powerups stuck to scroll only
      updateSnake(0, width, height, dy);
      updatePowerups(0);
    }

    rafId = window.requestAnimationFrame(step);
  }

  function startGame() {
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (rafId) window.cancelAnimationFrame(rafId);

    // Reset everything
    scrollOffsetY      = 0;
    lastScrollY        = window.scrollY || 0;
    frogSpeedBuffTime  = 0;
    frogJumpBuffTime   = 0;
    frogSlowBuffTime   = 0;
    powerupSpawnTimer  = 0;
    gameElapsedTime    = 0;
    gameOver           = false;
    lastTime           = 0;

    // Reset direction
    dir.x = 1; dir.y = 0;

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
