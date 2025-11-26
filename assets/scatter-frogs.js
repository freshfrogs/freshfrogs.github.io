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
    // 'baseballCapRed',
    // 'baseballCapWhite',
    'yellow',
    'blue(2)',
    'blue',
    'cyan',
    'brown',
    'silverEthChain',
    'goldDollarChain'
    // 'treeFrog(4)'
  ]);

  // Trait types to skip (avoid background tiles)
  const SKIP_TRAITS = new Set([
    "Background",
    "background",
    "BG",
    "Bg"
  ]);

  const container = document.getElementById("frog-bg");
  if (!container) return;

  let frogs = [];
  let powerups = [];
  let animId = null;
  let lastTime = 0;

  // NEW: optional explicit list of token IDs to use (e.g. all staked frogs)
  let forcedTokenIds = null;

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

  // -----------------------------
  // Power-up drops
  // -----------------------------
  const POWERUP_RADIUS       = 14;
  const POWERUP_TTL          = 8;   // seconds before it fades
  const POWERUP_DROP_CHANCE  = 0.7; // chance a power-up appears on frog death

  // Types: frog-speed (buff), frog-spawn (buff), snake-slow (buff for frogs), snake-fast (debuff)
  let powerups = [];

  function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  }

  function rollPowerupType() {
    const r = Math.random();
    if (r < 0.45) return "frog-speed";
    if (r < 0.75) return "frog-spawn";
    if (r < 0.9)  return "snake-slow";
    return "snake-fast";
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
    } else if (type === "frog-spawn") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #7cc1ff)";
    } else if (type === "snake-slow") {
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #ffd36b)";
    } else { // snake-fast (debuff)
      el.style.background = "radial-gradient(circle at 30% 30%, #ffffff, #ff7a7a)";
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
    const width  = window.innerWidth || 1;
    const height = window.innerHeight || 1;

    if (type === "frog-speed") {
      // Frogs hop more often and a bit faster
      for (const frog of frogs) {
        frog.idleMin   *= 0.75;
        frog.idleMax   *= 0.75;
        frog.hopDurMin *= 0.9;
        frog.hopDurMax *= 0.9;
      }
    } else if (type === "frog-spawn") {
      // Burst of new frogs appears
      const extra = 3 + Math.floor(Math.random() * 3); // 3–5
      for (let i = 0; i < extra; i++) {
        spawnExtraFrog(width, height);
      }
    } else if (type === "snake-slow") {
      // Snake slows down (good for frogs)
      snakeSpeedFactor = clamp(snakeSpeedFactor * 0.7, 0.35, 3.0);
    } else if (type === "snake-fast") {
      // Snake speeds up (bad for frogs)
      snakeSpeedFactor = clamp(snakeSpeedFactor * 1.35, 0.35, 3.0);
    }
  }

  function updatePowerups(dt, width, height) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];

      // Lifetime
      p.ttl -= dt;
      if (p.ttl <= 0 || !p.el) {
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

  function initSnake(width, height) {
    if (!SNAKE_ENABLED) return;
    if (!container) return;

    // clean up old snake if present
    if (snake && snake.head && snake.head.el && snake.head.el.parentNode === container) {
      container.removeChild(snake.head.el);
    }
    if (snake && Array.isArray(snake.segments)) {
      for (const seg of snake.segments) {
        if (seg.el && seg.el.parentNode === container) {
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
      segEl.style.zIndex = "29";
      // TODO: replace with your real sprites
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
      segEl.style.pointerEvents = "none";
      segEl.style.zIndex = "29";
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
      idleMin = 2.0; idleMax = 5.0;
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

  function updateSnake(dt, width, height) {
    if (!SNAKE_ENABLED || !snake) return;

    const marginX = 8;
    const marginY = 24;

    const head = snake.head;
    if (!head) return;

    // --- pick nearest frog as target
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

    // --- steering
    let desiredAngle = head.angle;
    if (targetFrog) {
      const fx = targetFrog.x + FROG_SIZE / 2;
      const fy = targetFrog.baseY + FROG_SIZE / 2;
      desiredAngle = Math.atan2(fy - head.y, fx - head.x);
    } else {
      desiredAngle += (Math.random() - 0.5) * dt;
    }

    let angleDiff = ((desiredAngle - head.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const maxTurn = SNAKE_TURN_RATE * dt;
    angleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
    head.angle += angleDiff;

    // --- move head
    const speed = SNAKE_BASE_SPEED * (0.8 + Math.random() * 0.4) * snakeSpeedFactor;
    head.x += Math.cos(head.angle) * speed * dt;
    head.y += Math.sin(head.angle) * speed * dt;

    // bounce off edges
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

    // --- update path
    snake.path.unshift({ x: head.x, y: head.y });
    const maxPathLength = (snake.segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length > maxPathLength) {
      snake.path.pop();
    }

    // --- render head
    const headRenderY = head.y + scrollOffsetY;
    head.el.style.transform =
      `translate3d(${head.x}px, ${headRenderY}px, 0) rotate(${head.angle}rad)`;

    // --- render segments along path
    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      const idx = Math.min(snake.path.length - 1, (i + 1) * SNAKE_SEGMENT_GAP);
      const p = snake.path[idx] || snake.path[snake.path.length - 1];

      const nextIdx = Math.max(0, idx - 2);
      const q = snake.path[nextIdx] || p;
      const angle = Math.atan2(p.y - q.y, p.x - q.x);

      seg.x = p.x;
      seg.y = p.y;

      const renderY = seg.y + scrollOffsetY;
      seg.el.style.transform =
        `translate3d(${seg.x}px, ${renderY}px, 0) rotate(${angle}rad)`;
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

        // play munch sound
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

  // -----------------------------
  // Public API (nav hooks + NEW: set token IDs)
  // -----------------------------
  function setTargetNormalized(nx, ny) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    target.x = width * nx;
    target.y = height * ny;
    target.active = true;
  }

  function triggerGroupHop(reason) {
    const now = (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();

    if (now - lastGroupHopTime < 800) return;
    lastGroupHopTime = now;

    if (!frogs.length) return;
    const count = Math.min(8, frogs.length);

    for (let i = 0; i < count; i++) {
      const frog = frogs[randInt(0, frogs.length - 1)];
      frog.state = "hopping";
      frog.hopTime = 0;
      frog.hopDuration = randRange(frog.hopDurMin * 0.6, frog.hopDurMax * 1.1);
      frog.hopHeight = randRange(frog.hopHeightMax * 1.2, frog.hopHeightMax * 2.0);

      // keep hop start/end as "in place" for group hops
      frog.hopStartX = frog.x;
      frog.hopStartBaseY = frog.baseY;
      frog.hopEndX = frog.x;
      frog.hopEndBaseY = frog.baseY;
    }
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

  // NEW: external hook – call this with ALL currently staked token IDs
  // Example: if you have [16, 27, 580, 1023] as "pond" tokens:
  //   if (window.ffScatterSetTokenIds) ffScatterSetTokenIds(allStakedTokenIds);
  window.ffScatterSetTokenIds = function (tokenIds) {
    if (!Array.isArray(tokenIds) || !tokenIds.length) return;

    const seen = new Set();
    const cleaned = [];

    for (const raw of tokenIds) {
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const t = Math.max(1, Math.min(MAX_TOKEN_ID, Math.floor(n)));
      if (!seen.has(t)) {
        seen.add(t);
        cleaned.push(t);
      }
    }

    if (!cleaned.length) return;

    forcedTokenIds = cleaned;
    resetAndStart();
  };

  // -----------------------------
  // Events
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
      if (d2 < nearestDist2) {
        nearestDist2 = d2;
        nearest = frog;
      }
    }

    const MAX_CLICK_RADIUS = 120;
    if (nearest && nearestDist2 <= MAX_CLICK_RADIUS * MAX_CLICK_RADIUS) {
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

  // Scroll: parallax + group hops at top/bottom
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
  // Helpers
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

  // NEW: layout for "use exactly this many tokens" (e.g. all staked frogs)
  function computeFrogPositionsForTokenCount(count, width, height) {
    const positions = [];
    if (!count) return positions;

    const marginX = 16;
    const marginY = 16;

    // rough grid based on width
    const cols = Math.max(1, Math.floor((width - marginX * 2) / (FROG_SIZE + 8)));
    const rows = Math.max(1, Math.ceil(count / cols));

    const usableWidth = Math.max(FROG_SIZE, width - marginX * 2);
    const usableHeight = Math.max(FROG_SIZE, height - marginY * 2);

    const stepX = cols > 1 ? (usableWidth - FROG_SIZE) / (cols - 1) : 0;
    const stepY = rows > 1 ? (usableHeight - FROG_SIZE) / (rows - 1) : 0;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      let x = marginX + col * stepX;
      let y = marginY + row * stepY;

      // small jitter so it still feels "scattered"
      x += randRange(-6, 6);
      y += randRange(-6, 6);

      x = Math.max(marginX, Math.min(width - marginX - FROG_SIZE, x));
      y = Math.max(marginY, Math.min(height - marginY - FROG_SIZE, y));

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

      frog.layers.push(img);
      frog.el.appendChild(img);
    }
  }

  // -----------------------------
  // Create frogs (random OR forced token list)
  // -----------------------------
  async function createFrogs(width, height) {
    frogs = [];
    powerups = [];
    container.innerHTML = "";

    let positions;
    let tokenIds;

    const useForced = Array.isArray(forcedTokenIds) && forcedTokenIds.length;

    if (useForced) {
      tokenIds = forcedTokenIds.slice(); // use exactly these, all staked frogs
      positions = computeFrogPositionsForTokenCount(tokenIds.length, width, height);
    } else {
      positions = computeFrogPositions(width, height);
      tokenIds  = pickRandomTokenIds(positions.length);
    }

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i % tokenIds.length];

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
        idleMin = 2.0; idleMax = 5.0;
        hopMin = 0.45; hopMax = 0.9;
        heightMin = 6;  heightMax = 20;
      }

      const frog = {
        tokenId,
        el,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,

        // hop path
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
    } else if (target.active) {
      goalX = target.x - FROG_SIZE / 2;
      goalY = target.y - FROG_SIZE / 2;
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
          frog.idleTime = randRange(frog.idleMin, frog.idleMax);

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
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    updateFrogs(dt, width, height);
    if (SNAKE_ENABLED) {
      updateSnake(dt, width, height);
    }
    updatePowerups(dt, width, height);

    animId = requestAnimationFrame(drawFrame);
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

    await createFrogs(width, height);

    // init snake only on snake pages
    if (SNAKE_ENABLED) {
      initSnake(width, height);
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
