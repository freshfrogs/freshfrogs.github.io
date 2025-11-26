// /snake/snake-game.js
(function (global) {
  const Meta  = global.SnakeFrogMeta;
  const Field = global.SnakeFrogField;

  if (!Meta || !Field) {
    console.error("Snake game missing SnakeFrogMeta or SnakeFrogField.");
    return;
  }

  const container = Field.container;
  if (!container) {
    console.warn("No #frog-bg; snake game not started.");
    return;
  }

  const FROG_SIZE = Meta.FROG_SIZE;
  const frogs     = Field.frogs;
  const mouse     = Field.mouse;

  // Where head/body PNG + sounds live (relative to /snake/index.html)
  const ASSET_BASE = ".";

  // Snake constants
  const SNAKE_SEGMENT_SIZE     = 48;
  const SNAKE_BASE_SPEED       = 90;
  const SNAKE_SEGMENT_GAP      = 6;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS       = 40;

  // Power-ups
  const POWERUP_RADIUS       = 14;
  const POWERUP_TTL          = 8;
  const POWERUP_DROP_CHANCE  = 0.7;

  // Buff timings
  const BUFF_DURATION = 6; // seconds

  let snake = null;
  let snakeSpeedFactor = 1;
  let snakeEatSound = null;

  let powerups = [];

  // Buff timers
  let frogSpeedBuffTime = 0;
  let frogJumpBuffTime  = 0;
  let frogSlowBuffTime  = 0;

  // Sounds
  let playFrogHop       = null;
  let playFrogDeath     = null;
  let playFrogSpeedBuff = null;
  let playFrogJumpBuff  = null;
  let playFrogSlowBuff  = null;

  // Timer & game state
  let timerEl = null;
  let gameElapsedTime = 0;
  let gameOver        = false;

  // Animation state
  let lastTime   = 0;
  let animId     = null;
  let lastScrollY = global.window.scrollY || 0;
  let scrollOffsetY = 0;

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // --- Audio helpers (sound pools so sounds can overlap) ---
  function createSoundPool(src, volume, poolSize) {
    if (volume == null)   volume   = 1;
    if (poolSize == null) poolSize = 6;

    const pool = [];
    for (let i = 0; i < poolSize; i++) {
      const a = new Audio(src);
      a.volume = volume;
      pool.push(a);
    }

    return function play() {
      for (const a of pool) {
        if (a.paused || a.ended) {
          try {
            a.currentTime = 0;
            a.play();
          } catch (e) {}
          return;
        }
      }
      const extra = new Audio(src);
      extra.volume = volume;
      pool.push(extra);
      try {
        extra.play();
      } catch (e) {}
    };
  }

  function createMultiSoundPool(srcArray, volume, poolSizePer) {
    if (volume == null)      volume      = 1;
    if (poolSizePer == null) poolSizePer = 2;
    const pools = srcArray.map((src) => createSoundPool(src, volume, poolSizePer));
    return function playRandom() {
      if (!pools.length) return;
      const idx = Math.floor(Math.random() * pools.length);
      pools[idx]();
    };
  }

  function ensureGameAudio() {
    if (playFrogHop) return; // already made

    playFrogHop = createMultiSoundPool(
      [
        `${ASSET_BASE}/ribbitOne.mp3`,
        `${ASSET_BASE}/ribbitTwo.mp3`,
        `${ASSET_BASE}/ribbitThree.mp3`,
        `${ASSET_BASE}/ribbitBase.mp3`
      ],
      0.6,
      2
    );
    playFrogDeath     = createSoundPool(`${ASSET_BASE}/frogDeath.mp3`,   0.85, 4);
    playFrogSpeedBuff = createSoundPool(`${ASSET_BASE}/superSpeed.mp3`,  0.85, 2);
    playFrogJumpBuff  = createSoundPool(`${ASSET_BASE}/superJump.mp3`,   0.85, 2);
    playFrogSlowBuff  = createSoundPool(`${ASSET_BASE}/slowed.mp3`,      0.85, 2);
    snakeEatSound     = createSoundPool(`${ASSET_BASE}/munch.mp3`,       0.7,  6);

    // Hook frog hop sound into field
    Field.setHopSound(playFrogHop);
  }

  function playSnakeEat() {
    if (!snakeEatSound) return;
    try {
      snakeEatSound();
    } catch (e) {}
  }

  // --- Timer UI ---
  function ensureTimerElement() {
    if (timerEl) return;

    timerEl = document.createElement("div");
    timerEl.className = "snake-timer";
    timerEl.style.position = "fixed";
    timerEl.style.top      = "12px";
    timerEl.style.left     = "50%";
    timerEl.style.transform = "translateX(-50%)";
    timerEl.style.padding   = "6px 12px";
    timerEl.style.borderRadius = "999px";
    timerEl.style.background   = "rgba(0,0,0,0.55)";
    timerEl.style.color        = "#fff";
    timerEl.style.fontFamily   =
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    timerEl.style.fontSize     = "14px";
    timerEl.style.letterSpacing = "0.08em";
    timerEl.style.textTransform = "uppercase";
    timerEl.style.zIndex        = "50";
    timerEl.style.pointerEvents = "none";
    timerEl.textContent = "Time 00:00";
    document.body.appendChild(timerEl);
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const mins  = Math.floor(total / 60);
    const secs  = total % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function updateTimerDisplay() {
    if (!timerEl) return;
    const label = gameOver ? "Final Time" : "Time";
    timerEl.textContent = `${label} ${formatTime(gameElapsedTime)}`;
  }

  function showGameOver() {
    gameOver = true;
    updateTimerDisplay();
    if (timerEl) {
      timerEl.style.background = "rgba(0,0,0,0.8)";
    }
  }

  // --- Power-ups ---
  function rollPowerupType() {
    const r = Math.random();
    if (r < 0.4) return "frog-speed";
    if (r < 0.7) return "frog-jump";
    return "frog-slow";
  }

  function spawnPowerup(centerX, centerY) {
    const type = rollPowerupType();
    const size = POWERUP_RADIUS * 2;

    const el = document.createElement("div");
    el.className = "frog-powerup";
    el.style.position = "absolute";
    el.style.width    = size + "px";
    el.style.height   = size + "px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.zIndex   = "20";
    el.style.border   = "2px solid rgba(0,0,0,0.6)";
    el.style.boxShadow = "0 0 10px rgba(0,0,0,0.35)";

    if (type === "frog-speed") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7bffb1)";
    } else if (type === "frog-jump") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7cc1ff)";
    } else {
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

  function updatePowerups(dt, width, height) {
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

  // --- Snake setup & movement ---
  function initSnake(width, height) {
    // Clean old snake if exists
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (const seg of snake.segments) {
          if (seg && seg.el && seg.el.parentNode === container) {
            container.removeChild(seg.el);
          }
        }
      }
    }

    const startX = width * 0.2;
    const startY = height * 0.5;

    const headEl = document.createElement("div");
    headEl.className = "snake-head";
    headEl.style.position = "absolute";
    headEl.style.width    = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.height   = SNAKE_SEGMENT_SIZE + "px";
    headEl.style.imageRendering  = "pixelated";
    headEl.style.backgroundSize  = "contain";
    headEl.style.backgroundRepeat = "no-repeat";
    headEl.style.backgroundImage  = `url(${ASSET_BASE}/head.png)`;
    container.appendChild(headEl);

    const segments = [];
    for (let i = 0; i < SNAKE_INITIAL_SEGMENTS; i++) {
      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.position = "absolute";
      segEl.style.width    = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height   = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering  = "pixelated";
      segEl.style.backgroundSize  = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      segEl.style.backgroundImage  = `url(${ASSET_BASE}/body.png)`;
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
  }

  function growSnake(extraSegments) {
    if (!snake) return;
    extraSegments = extraSegments || 1;

    for (let i = 0; i < extraSegments; i++) {
      const tailIndex = snake.segments.length - 1;
      const tailSeg   = snake.segments[tailIndex];

      const segEl = document.createElement("div");
      segEl.className = "snake-body";
      segEl.style.position = "absolute";
      segEl.style.width    = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.height   = SNAKE_SEGMENT_SIZE + "px";
      segEl.style.imageRendering  = "pixelated";
      segEl.style.backgroundSize  = "contain";
      segEl.style.backgroundRepeat = "no-repeat";
      segEl.style.backgroundImage  = `url(${ASSET_BASE}/body.png)`;
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

  function updateSnake(dt, width, height, scrollDelta) {
    if (!snake) return;

    const head     = snake.head;
    const path     = snake.path;
    const segments = snake.segments;

    const speed = SNAKE_BASE_SPEED * snakeSpeedFactor;

    const targetX = mouse.follow && mouse.active ? mouse.x : head.x + 1;
    const targetY = mouse.follow && mouse.active ? mouse.y : head.y;

    // Smooth chase
    head.x += (targetX - head.x) * dt * 4;
    head.y += (targetY - head.y) * dt * 4;

    // Minor scroll influence
    head.y += scrollDelta * 0.1;

    // Path history for body segments
    if (path.length > 0 && !gameOver) {
      path.push({ x: head.x, y: head.y });
      while (path.length > (segments.length + 2) * SNAKE_SEGMENT_GAP) {
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

    const headRenderY =
      head.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
    head.el.style.transform =
      `translate3d(${head.x - SNAKE_SEGMENT_SIZE / 2}px, ${headRenderY}px, 0) rotate(${angle}rad)`;

    // Position segments along the path
    let segmentIndex = closestIndex;
    for (const seg of segments) {
      segmentIndex = Math.min(path.length - 1, segmentIndex + SNAKE_SEGMENT_GAP);
      const p = path[segmentIndex];
      if (!p) continue;

      seg.x = p.x;
      seg.y = p.y;

      const renderY = seg.y + scrollOffsetY - SNAKE_SEGMENT_SIZE / 2;
      seg.el.style.transform =
        `translate3d(${seg.x - SNAKE_SEGMENT_SIZE / 2}px, ${renderY}px, 0) rotate(${angle}rad)`;
    }

    if (gameOver) return;

    // Snake eats frogs
    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= SNAKE_EAT_RADIUS * SNAKE_EAT_RADIUS) {
        const centerX = fx;
        const centerY = fy;

        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1); // frogs do NOT respawn

        if (playFrogDeath) playFrogDeath();
        playSnakeEat();

        growSnake(1);

        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnPowerup(centerX, centerY);
        }
      }
    }
  }

  // --- Buff state passed into frog field ---
  function computeBuffState() {
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
      hopHeightMul *= 2.5;
    }

    return { hopDurationMul, idleTimeMul, hopHeightMul };
  }

  // --- Main loop ---
  function step(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    const width  = global.window.innerWidth;
    const height = global.window.innerHeight;

    // Scroll parallax shared with frogs & powerups
    const scrollY = global.window.scrollY || 0;
    const scrollDelta = scrollY - lastScrollY;
    lastScrollY = scrollY;

    scrollOffsetY -= scrollDelta * 0.5;
    Field.setScrollOffsetY(scrollOffsetY);

    if (!gameOver) {
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

      const buffState = computeBuffState();
      Field.updateFrogs(dt, width, height, buffState);
      updateSnake(dt, width, height, scrollDelta);
      updatePowerups(dt, width, height);

      if (!frogs.length) {
        showGameOver();
      }
    } else {
      // Freeze animation, but keep snake/powerups glued to scroll
      updateSnake(0, width, height, scrollDelta);
      updatePowerups(0, width, height);
    }

    animId = requestAnimationFrame(step);
  }

  function startGame() {
    const width  = global.window.innerWidth;
    const height = global.window.innerHeight;

    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    lastTime        = 0;
    scrollOffsetY   = 0;
    lastScrollY     = global.window.scrollY || 0;
    snakeSpeedFactor = 1;
    powerups        = [];

    frogSpeedBuffTime = 0;
    frogJumpBuffTime  = 0;
    frogSlowBuffTime  = 0;
    gameElapsedTime   = 0;
    gameOver          = false;

    Field.createFrogs(width, height, 100); // always 100 random frogs
    ensureGameAudio();
    ensureTimerElement();
    updateTimerDisplay();
    initSnake(width, height);

    animId = requestAnimationFrame(step);
  }

  global.addEventListener("load", startGame);
  global.addEventListener("resize", startGame);
})(window);
