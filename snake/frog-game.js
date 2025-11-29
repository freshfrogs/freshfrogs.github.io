// frog-game.js
// Main Frog Snake survival game logic for FreshFrogs.

(function () {
  "use strict";

  // --------------------------------------------------
  // HOOK MODULES
  // --------------------------------------------------
  const AudioMod = window.FrogGameAudio || {};
  const initAudio                = AudioMod.initAudio                || function(){};
  const playRandomRibbit         = AudioMod.playRandomRibbit         || function(){};
  const playFrogDeath            = AudioMod.playFrogDeath            || function(){};
  const playSnakeMunch           = AudioMod.playSnakeMunch           || function(){};
  const playRandomOrbSpawnSound  = AudioMod.playRandomOrbSpawnSound  || function(){};
  const playBuffSound            = AudioMod.playBuffSound            || function(){};
  const playPermanentChoiceSound = AudioMod.playPermanentChoiceSound || function(){};
  const playPerFrogUpgradeSound  = AudioMod.playPerFrogUpgradeSound  || function(){};

  const LMod = window.FrogGameLeaderboard || {};
  const initLeaderboard        = LMod.initLeaderboard        || function(){};
  const fetchLeaderboard       = LMod.fetchLeaderboard       || (async () => []);
  const submitLeaderboardScore = LMod.submitLeaderboardScore || (async () => {});
  const updateMiniLeaderboard  = LMod.updateMiniLeaderboard  || function(){};

  function getCurrentUserLabel() {
    try {
      if (typeof LMod.getCurrentUserLabel === "function") {
        return LMod.getCurrentUserLabel();
      }
      if (typeof LMod.getCurrentTag === "function") {
        return LMod.getCurrentTag();
      }

      const direct =
        LMod.currentUser ||
        LMod.currentUsername ||
        LMod.currentTag;
      if (direct) return direct;

      if (typeof localStorage !== "undefined") {
        return (
          localStorage.getItem("frogSnake_userTag") ||
          localStorage.getItem("freshfrogs_userTag") ||
          localStorage.getItem("frogLeaderboard_userTag")
        );
      }
    } catch (err) {
      console.warn("getCurrentUserLabel failed:", err);
    }
    return null;
  }

  // --------------------------------------------------
  // CONSTANTS & CONFIG
  // --------------------------------------------------
  const BASE_FROG_COUNT          = 25;
  const MAX_FROGS                = 450;
  const NORMAL_SPAWN_AMOUNT      = 20;
  const EPIC_SPAWN_AMOUNT        = 50;

  const ORB_RADIUS               = 10;
  const ORB_SPAWN_INTERVAL_MIN   = 4;
  const ORB_SPAWN_INTERVAL_MAX   = 10;

  const SPEED_BUFF_DURATION      = 15;
  const JUMP_BUFF_DURATION       = 18;
  const SNAKE_SLOW_DURATION      = 8;
  const SNAKE_CONFUSE_DURATION   = 6;
  const SNAKE_SHRINK_DURATION    = 8;
  const TEAM_SHIELD_DURATION     = 7;
  const GLOBAL_TIME_SLOW_DURATION= 5;
  const ORB_MAGNET_DURATION      = 10;
  const SCORE_MULT_DURATION      = 12;
  const PANIC_HOP_DURATION       = 8;
  const LIFESTEAL_DURATION       = 10;
  const PERMA_ROLE_CHANCE        = 0.07;

  const FROG_SPEED_UPGRADE_FACTOR = 0.9;
  const FROG_JUMP_UPGRADE_FACTOR  = 1.25;

  const BUFF_DURATION_UPGRADE_FACTOR = 1.2;
  const ORB_SPAWN_RATE_FACTOR        = 0.9;
  const COMMON_DEATHRATTLE_CHANCE    = 0.15;
  const EPIC_DEATHRATTLE_CHANCE      = 0.25;
  const LAST_STAND_DEATHRATTLE_CHANCE= 0.5;
  const ORB_COLLECTOR_FROG_CHANCE    = 0.15;

  const ZOMBIE_HORDE_COUNT       = 8;
  const SNAKE_BASE_SPEED         = 1.0;
  const SNAKE_SPEED_PER_SHED     = 0.18;

  const BASE_SCORE_PER_SECOND    = 1;
  const SCORE_PER_FROG_ALIVE     = 0.02;

  const DECAP_START_LENGTH       = 50;
  const DECAP_INITIAL_CHANCE     = 0.01;
  const DECAP_CHANCE_INCREMENT   = 0.0005;
  const DECAP_MAX_CHANCE         = 0.11;

  const GAME_SCALE_MAX           = 1.0;
  const GAME_SCALE_MIN           = 0.5;
  const GAME_DESIGN_WIDTH        = 1280;
  const GAME_DESIGN_HEIGHT       = 720;

  const SHED_INTERVAL = 300; // seconds

  const SNAKE_GROW_EVERY_N_FROGS = 2;

  const FROG_SIZE_PX             = 64;
  const FROG_SCALE_MIN           = 0.25;
  const FROG_SCALE_MAX           = 1.0;
  const FROG_SCALE_STEP          = 0.25;

  const ROLE_FLAGS = {
    NONE:           0,
    SWIFT:          1 << 0,
    TANK:           1 << 1,
    ORB_COLLECTOR:  1 << 2,
    ZOMBIE:         1 << 3,
    LIFESTEAL:      1 << 4,
    SHIELDED:       1 << 5
  };

  const FROG_TONGUE_TRAITS = [
    "tongueFly",
    "tongueBee",
    "tongueDragonfly",
    "tongueButterfly",
    "tongueFirefly",
    "tongueSpider",
    "tongueSpiderRed"
  ];

  let gameScale = 1.0;
  const container = document.getElementById("frog-game");
  if (!container) {
    console.error("No #frog-game container found.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d");
  container.appendChild(canvas);

  let width  = canvas.width  = GAME_DESIGN_WIDTH;
  let height = canvas.height = GAME_DESIGN_HEIGHT;

  function computeGameScale() {
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width  / GAME_DESIGN_WIDTH;
    const scaleY = rect.height / GAME_DESIGN_HEIGHT;
    const s = Math.max(GAME_SCALE_MIN, Math.min(GAME_SCALE_MAX, Math.min(scaleX, scaleY)));
    return s;
  }

  function applyGameScale() {
    gameScale = computeGameScale();
    canvas.style.transformOrigin = "top left";
    canvas.style.transform = `scale(${gameScale})`;
    const scaledW = GAME_DESIGN_WIDTH  * gameScale;
    const scaledH = GAME_DESIGN_HEIGHT * gameScale;
    canvas.style.position = "absolute";
    canvas.style.left = `${(container.clientWidth  - scaledW) / 2}px`;
    canvas.style.top  = `${(container.clientHeight - scaledH) / 2}px`;
  }

  applyGameScale();

  let frogs = [];
  let snakeSegments = [];
  let snakeDir = { x: 1, y: 0 };
  let pendingDirection = { x: 1, y: 0 };
  let snakeSpeed = SNAKE_BASE_SPEED;
  let snakeLength = 6;
  let snakeTimer = 0;
  let snakeSegmentSpacing = 18;

  let deadFrogs = [];
  let orbs = [];
  let buffs = [];

  let mousePos = { x: width / 2, y: height / 2 };

  let lastTimestamp = 0;
  let elapsedTime = 0;
  let gameOver = false;
  let gamePaused = false;
  let animId = null;

  let score = 0;
  let frogsEaten = 0;
  let secondsSurvived = 0;

  let lastRunScore = 0;
  let lastRunTime  = 0;

  let legendaryEventTriggered = false;
  let snakeShedStage   = 0;
  let snakeShedCount   = 0;
  let nextShedTime     = SHED_INTERVAL;

  let snakeEggPending    = false;
  let epicChainPending   = false;
  let dyingSnakes        = [];
  let frogsBuffed        = false;
  let globalBuffDuration = 1.0;
  let orbSpawnFactor     = 1.0;

  let orbMagnetActive    = false;
  let orbMagnetTimer     = 0;

  let speedBuffTimer     = 0;
  let jumpBuffTimer      = 0;
  let snakeSlowTimer     = 0;
  let snakeConfuseTimer  = 0;
  let snakeShrinkTimer   = 0;
  let teamShieldTimer    = 0;
  let globalTimeSlowTimer= 0;
  let scoreMultTimer     = 0;
  let panicHopTimer      = 0;
  let lifestealTimer     = 0;

  let scoreMultiplier    = 1.0;
  let decapChance        = 0.0;

  let initialUpgradeDone          = false;
  let hasShownHowToOverlay        = false;
  let pendingInitialUpgradeAfterInfo = false;

  let infoOverlay = null;
  let infoPage = 0;
  let infoContentEl = null;
  let infoPageLabel = null;
  let infoPrevBtn = null;
  let infoNextBtn = null;
  let infoLeaderboardData = [];

  let upgradeOverlay = null;
  let upgradeChoicesEl = null;
  let upgradeTitleEl = null;
  let upgradeType = null;

  let miniLeaderboardEl = null;

  const orbTypes = [
    { id: "frogSpeed", label: "Frogs hop faster (temporary)", color: "#ffec4d" },
    { id: "frogJump",  label: "Frogs jump higher (temporary)", color: "#ffb14d" },
    { id: "snakeSlow", label: "Slow the snake", color: "#6dd5ff" },
    { id: "snakeConfuse", label: "Confuse the snake", color: "#a66dff" },
    { id: "snakeShrink", label: "Shrink the snake", color: "#ff6d6d" },
    { id: "teamShield", label: "Team shield", color: "#6dffb3" },
    { id: "timeSlow", label: "Slow time", color: "#ffffff" },
    { id: "orbMagnet", label: "Orb magnet", color: "#ffa6ff" },
    { id: "scoreMult", label: "Score boost", color: "#ffd56d" },
    { id: "panicHop", label: "Panic hops", color: "#ff8a6d" },
    { id: "lifesteal", label: "Lifesteal", color: "#ff4d9a" },
  ];

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, maxInclusive) {
    return Math.floor(min + Math.random() * (maxInclusive - min + 1));
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function inBounds(x, y, margin) {
    const m = margin || 0;
    return x >= m && x <= width - m && y >= m && y <= height - m;
  }

  function frogHasTongueTrait(frog) {
    if (!frog || !frog.traits) return false;
    const t = frog.traits;
    for (let i = 0; i < t.length; i++) {
      if (FROG_TONGUE_TRAITS.includes(t[i])) return true;
    }
    return false;
  }

  function createFrog(x, y, scale) {
    const s = clamp(
      scale != null ? scale : 1,
      FROG_SCALE_MIN,
      FROG_SCALE_MAX
    );
    const frog = {
      x,
      y,
      vx: 0,
      vy: 0,
      hopCooldown: randomRange(0.4, 1.8),
      hopTimer: 0,
      size: FROG_SIZE_PX,
      scale: s,
      roles: ROLE_FLAGS.NONE,
      traits: [],
      alive: true,
      deathTimer: 0,
      hasTongue: false,
      el: null
    };
    frog.hasTongue = frogHasTongueTrait(frog);
    return frog;
  }

  function spawnInitialFrogs() {
    frogs = [];
    for (let i = 0; i < BASE_FROG_COUNT; i++) {
      const x = randomRange(80, width - 80);
      const y = randomRange(80, height - 80);
      frogs.push(createFrog(x, y, 1));
    }
  }

  function createInitialFrogs() {
    spawnInitialFrogs();
  }

  function initSnake() {
    snakeSegments = [];
    snakeLength = 6;
    const startX = width / 2;
    const startY = height / 2;
    for (let i = 0; i < snakeLength; i++) {
      snakeSegments.push({
        x: startX - i * snakeSegmentSpacing,
        y: startY,
      });
    }
    snakeDir = { x: 1, y: 0 };
    pendingDirection = { x: 1, y: 0 };
    snakeSpeed = SNAKE_BASE_SPEED;
    snakeTimer = 0;
    frogsEaten = 0;
    decapChance = 0;
  }

  function setNextOrbTime() {
    const min = ORB_SPAWN_INTERVAL_MIN * orbSpawnFactor;
    const max = ORB_SPAWN_INTERVAL_MAX * orbSpawnFactor;
    nextOrbSpawnTime = elapsedTime + randomRange(min, max);
  }

  let nextOrbSpawnTime = 0;

  function spawnOrb() {
    const type = pickRandom(orbTypes);
    if (!type) return;
    const orb = {
      x: randomRange(40, width - 40),
      y: randomRange(40, height - 40),
      radius: ORB_RADIUS,
      type: type.id,
      color: type.color,
    };
    orbs.push(orb);
    playRandomOrbSpawnSound();
  }

  function applyBuff(typeId) {
    switch (typeId) {
      case "frogSpeed":
        speedBuffTimer = SPEED_BUFF_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "frogJump":
        jumpBuffTimer = JUMP_BUFF_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "snakeSlow":
        snakeSlowTimer = SNAKE_SLOW_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "snakeConfuse":
        snakeConfuseTimer = SNAKE_CONFUSE_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "snakeShrink":
        snakeShrinkTimer = SNAKE_SHRINK_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "teamShield":
        teamShieldTimer = TEAM_SHIELD_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "timeSlow":
        globalTimeSlowTimer = GLOBAL_TIME_SLOW_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "orbMagnet":
        orbMagnetActive = true;
        orbMagnetTimer = ORB_MAGNET_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "scoreMult":
        scoreMultTimer = SCORE_MULT_DURATION * globalBuffDuration;
        scoreMultiplier = 2.0;
        playBuffSound();
        break;
      case "panicHop":
        panicHopTimer = PANIC_HOP_DURATION * globalBuffDuration;
        playBuffSound();
        break;
      case "lifesteal":
        lifestealTimer = LIFESTEAL_DURATION * globalBuffDuration;
        playBuffSound();
        break;
    }
  }

  function distanceSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function stepFrogs(dt) {
    const slowFactor = globalTimeSlowTimer > 0 ? 0.5 : 1.0;
    const speedFactor = speedBuffTimer > 0 ? 1.5 : 1.0;
    const jumpFactor = jumpBuffTimer > 0 ? 1.3 : 1.0;
    const panicFactor = panicHopTimer > 0 ? 0.5 : 1.0;

    for (let i = 0; i < frogs.length; i++) {
      const frog = frogs[i];
      if (!frog.alive) continue;

      frog.hopTimer -= dt * slowFactor / panicFactor;
      if (frog.hopTimer <= 0) {
        frog.hopTimer = frog.hopCooldown * randomRange(0.6, 1.4);

        let targetX = mousePos.x;
        let targetY = mousePos.y;

        const dx = targetX - frog.x;
        const dy = targetY - frog.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const jumpDist = randomRange(80, 140) * jumpFactor;
        const nx = dx / dist;
        const ny = dy / dist;

        frog.vx = nx * jumpDist * speedFactor;
        frog.vy = ny * jumpDist * speedFactor;
      }

      frog.x += frog.vx * dt * slowFactor;
      frog.y += frog.vy * dt * slowFactor;

      frog.vx *= 0.9;
      frog.vy *= 0.9;

      if (frog.x < 20)  { frog.x = 20;  frog.vx *= -0.5; }
      if (frog.x > width - 20) { frog.x = width - 20; frog.vx *= -0.5; }
      if (frog.y < 20)  { frog.y = 20;  frog.vy *= -0.5; }
      if (frog.y > height - 20) { frog.y = height - 20; frog.vy *= -0.5; }
    }
  }

  function stepSnake(dt) {
    let effectiveSpeed = snakeSpeed;
    if (snakeSlowTimer > 0) {
      effectiveSpeed *= 0.5;
    }
    if (globalTimeSlowTimer > 0) {
      effectiveSpeed *= 0.7;
    }

    snakeTimer += dt * effectiveSpeed * 60;
    const stepThreshold = 12;

    while (snakeTimer >= stepThreshold) {
      snakeTimer -= stepThreshold;

      if (snakeConfuseTimer <= 0) {
        const dx = mousePos.x - snakeSegments[0].x;
        const dy = mousePos.y - snakeSegments[0].y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / mag;
        const dirY = dy / mag;

        const horizontal = Math.abs(dirX) > Math.abs(dirY);
        if (horizontal) {
          pendingDirection = { x: Math.sign(dirX), y: 0 };
        } else {
          pendingDirection = { x: 0, y: Math.sign(dirY) };
        }
      } else {
        if (Math.random() < 0.15) {
          const choices = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ];
          pendingDirection = pickRandom(choices);
        }
      }

      const head = snakeSegments[0];
      const newHead = {
        x: head.x + pendingDirection.x * snakeSegmentSpacing,
        y: head.y + pendingDirection.y * snakeSegmentSpacing,
      };

      if (!inBounds(newHead.x, newHead.y, 30)) {
        newHead.x = clamp(newHead.x, 30, width - 30);
        newHead.y = clamp(newHead.y, 30, height - 30);
      }

      snakeDir = pendingDirection;
      snakeSegments.unshift(newHead);

      while (snakeSegments.length > snakeLength) {
        snakeSegments.pop();
      }
    }
  }

  function decapitateSnake() {
    if (snakeSegments.length <= 6) return;

    const oldSnake = {
      segments: snakeSegments.slice(6),
      despawnIndex: 0,
      timer: 0,
      despawnInterval: 0.1,
    };
    dyingSnakes.push(oldSnake);

    snakeSegments = snakeSegments.slice(0, 6);
    snakeLength = 6;
  }

  function stepDyingSnakes(dt) {
    for (let i = dyingSnakes.length - 1; i >= 0; i--) {
      const ds = dyingSnakes[i];
      ds.timer += dt;
      while (ds.timer >= ds.despawnInterval && ds.despawnIndex < ds.segments.length) {
        ds.timer -= ds.despawnInterval;
        ds.despawnIndex++;
      }
      if (ds.despawnIndex >= ds.segments.length) {
        dyingSnakes.splice(i, 1);
      }
    }
  }

  function handleOrbCollection() {
    const frogRadius = 18;

    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];

      if (orbMagnetActive) {
        const dx = mousePos.x - orb.x;
        const dy = mousePos.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = 160;
        orb.x += (dx / dist) * pull * (1 / 60);
        orb.y += (dy / dist) * pull * (1 / 60);
      }

      let collected = false;
      for (let j = 0; j < frogs.length; j++) {
        const frog = frogs[j];
        if (!frog.alive) continue;
        const d2 = distanceSq(frog.x, frog.y, orb.x, orb.y);
        if (d2 < (frogRadius + orb.radius) * (frogRadius + orb.radius)) {
          collected = true;
          break;
        }
      }

      if (!collected) continue;

      applyBuff(orb.type);

      if (lifestealTimer > 0) {
        if (frogs.length < MAX_FROGS) {
          for (let k = 0; k < 2; k++) {
            const nx = clamp(
              orb.x + randomRange(-40, 40),
              40,
              width - 40
            );
            const ny = clamp(
              orb.y + randomRange(-40, 40),
              40,
              height - 40
            );
            frogs.push(createFrog(nx, ny, 0.8));
          }
        }
      }

      orbs.splice(i, 1);
    }
  }

  function handleFrogDeaths() {
    const head = snakeSegments[0];
    const snakeRadius = 18;
    const frogRadius  = 18;

    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog.alive) continue;

      const d2 = distanceSq(frog.x, frog.y, head.x, head.y);
      if (d2 > (snakeRadius + frogRadius) * (snakeRadius + frogRadius)) {
        continue;
      }

      frog.alive = false;
      frog.deathTimer = 0.5;
      deadFrogs.push(frog);
      frogs.splice(i, 1);

      frogsEaten++;
      playSnakeMunch();

      if (frogsEaten % SNAKE_GROW_EVERY_N_FROGS === 0) {
        snakeLength++;
        if (snakeSegments.length < snakeLength) {
          const tail = snakeSegments[snakeSegments.length - 1];
          snakeSegments.push({ x: tail.x, y: tail.y });
        }

        if (snakeSegments.length > DECAP_START_LENGTH) {
          decapChance = Math.min(
            DECAP_MAX_CHANCE,
            decapChance + DECAP_CHANCE_INCREMENT
          );
          if (Math.random() < decapChance) {
            decapitateSnake();
          }
        }
      }

      lastRunScore = score;
      lastRunTime  = secondsSurvived;
      playFrogDeath();
    }
  }

  function stepBuffTimers(dt) {
    function decTimer(name, extra = null) {
      if (name > 0) name -= dt;
      if (name <= 0) {
        name = 0;
        if (extra === "scoreMult") {
          scoreMultiplier = 1.0;
        } else if (extra === "orbMagnet") {
          orbMagnetActive = false;
        }
      }
      return name;
    }

    speedBuffTimer      = decTimer(speedBuffTimer);
    jumpBuffTimer       = decTimer(jumpBuffTimer);
    snakeSlowTimer      = decTimer(snakeSlowTimer);
    snakeConfuseTimer   = decTimer(snakeConfuseTimer);
    snakeShrinkTimer    = decTimer(snakeShrinkTimer);
    teamShieldTimer     = decTimer(teamShieldTimer);
    globalTimeSlowTimer = decTimer(globalTimeSlowTimer);
    panicHopTimer       = decTimer(panicHopTimer);
    scoreMultTimer      = decTimer(scoreMultTimer, "scoreMult");
    lifestealTimer      = decTimer(lifestealTimer);
    orbMagnetTimer      = decTimer(orbMagnetTimer, "orbMagnet");
  }

  function updateScore(dt) {
    const frogsAlive = frogs.length;
    score += (BASE_SCORE_PER_SECOND + frogsAlive * SCORE_PER_FROG_ALIVE) * dt * scoreMultiplier;
    secondsSurvived += dt;
  }

  function drawFrogs() {
    for (let i = 0; i < frogs.length; i++) {
      const frog = frogs[i];
      ctx.save();
      ctx.translate(frog.x, frog.y);
      const scale = frog.scale || 1;
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#4caf50";
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-8, -5, 3, 0, Math.PI * 2);
      ctx.arc( 8, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawSnake() {
    if (!snakeSegments.length) return;

    const head = snakeSegments[0];

    ctx.fillStyle = "#333";
    for (let i = snakeSegments.length - 1; i >= 0; i--) {
      const seg = snakeSegments[i];
      const radius = i === 0 ? 18 : 16;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(head.x - 6, head.y - 6, 3, 0, Math.PI * 2);
    ctx.arc(head.x + 6, head.y - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(
      head.x + snakeDir.x * 12,
      head.y + snakeDir.y * 12
    );
    ctx.stroke();
  }

  function drawOrbs() {
    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fillStyle = orb.color || "#fff";
      ctx.fill();
    }
  }

  function drawHUD() {
    ctx.save();
    ctx.font = "14px monospace";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "top";

    const scoreStr = Math.floor(score).toLocaleString("en-US");
    const timeSecs = Math.floor(secondsSurvived);
    const m = Math.floor(timeSecs / 60);
    const s = timeSecs % 60;
    const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

    ctx.fillText(`Score: ${scoreStr}`, 10, 10);
    ctx.fillText(`Time: ${timeStr}`, 10, 28);
    ctx.fillText(`Frogs: ${frogs.length}`, 10, 46);

    ctx.restore();
  }

  function drawDyingSnakes() {
    ctx.save();
    ctx.fillStyle = "#555";
    for (let i = 0; i < dyingSnakes.length; i++) {
      const ds = dyingSnakes[i];
      for (let j = ds.despawnIndex; j < ds.segments.length; j++) {
        const seg = ds.segments[j];
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFrame(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dtMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const dt = dtMs / 1000;
    const slowFactor = globalTimeSlowTimer > 0 ? 0.6 : 1.0;
    const stepDt = dt * slowFactor;

    if (!gamePaused && !gameOver) {
      elapsedTime += stepDt;

      if (elapsedTime >= nextShedTime) {
        nextShedTime += SHED_INTERVAL;
        snakeShedCount++;
        snakeSpeed += SNAKE_SPEED_PER_SHED;
        snakeShedStage = Math.min(3, snakeShedStage + 1);
      }

      if (elapsedTime >= nextOrbSpawnTime) {
        spawnOrb();
        setNextOrbTime();
      }

      stepFrogs(stepDt);
      stepSnake(stepDt);
      handleFrogDeaths();
      handleOrbCollection();
      stepBuffTimers(stepDt);
      stepDyingSnakes(stepDt);
      updateScore(stepDt);
    }

    ctx.clearRect(0, 0, width, height);

    drawOrbs();
    drawDyingSnakes();
    drawSnake();
    drawFrogs();
    drawHUD();

    if (!gameOver) {
      animId = requestAnimationFrame(drawFrame);
    }
  }

  function endGame() {
    gameOver = true;

    lastRunScore = score;
    lastRunTime  = secondsSurvived;

    const payload = {
      score: Math.floor(score),
      seconds: Math.floor(secondsSurvived),
    };
    submitLeaderboardScore(payload).then(() => {
      fetchLeaderboard().then(topList => {
        if (topList) {
          infoLeaderboardData = Array.isArray(topList) ? topList : [];
          updateMiniLeaderboard(topList);
        }
        openInfoOverlay(0);
      });
    });
  }

  // --------------------------------------------------
  // SIMPLE RUN SUMMARY OVERLAY (NO READ-MORE PAGES)
  // --------------------------------------------------
  function ensureInfoOverlay() {
    if (infoOverlay) return;

    infoOverlay = document.createElement("div");
    infoOverlay.className = "frog-info-overlay";

    infoOverlay.style.position = "fixed";
    infoOverlay.style.inset = "0";
    infoOverlay.style.background = "rgba(0,0,0,0.75)";
    infoOverlay.style.display = "none";
    infoOverlay.style.zIndex = "180";
    infoOverlay.style.alignItems = "center";
    infoOverlay.style.justifyContent = "center";
    infoOverlay.style.pointerEvents = "auto";

    const panel = document.createElement("div");
    panel.style.background = "#111";
    panel.style.padding = "16px 20px 12px 20px";
    panel.style.borderRadius = "10px";
    panel.style.border = "1px solid #444";
    panel.style.color = "#fff";
    panel.style.fontFamily = "monospace";
    panel.style.textAlign = "left";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "420px";
    panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "6px";

    const title = document.createElement("div");
    title.textContent = "escape the snake 🐍 – summary";
    title.style.fontSize = "14px";
    title.style.fontWeight = "bold";

    const pageLabel = document.createElement("div");
    pageLabel.style.fontSize = "11px";
    pageLabel.style.opacity = "0.8";
    infoPageLabel = pageLabel;

    headerRow.appendChild(title);
    headerRow.appendChild(pageLabel);

    const content = document.createElement("div");
    content.style.fontSize = "13px";
    content.style.marginTop = "4px";
    content.style.lineHeight = "1.4";
    infoContentEl = content;

    const navRow = document.createElement("div");
    navRow.style.display = "flex";
    navRow.style.justifyContent = "flex-end";
    navRow.style.alignItems = "center";
    navRow.style.marginTop = "10px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close ×";
    closeBtn.style.fontFamily = "monospace";
    closeBtn.style.fontSize = "12px";
    closeBtn.style.padding = "4px 8px";
    closeBtn.style.borderRadius = "6px";
    closeBtn.style.border = "1px solid #555";
    closeBtn.style.background = "#222";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.onmouseenter = () => { closeBtn.style.background = "#333"; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = "#222"; };
    closeBtn.onclick = () => closeInfoOverlay();

    navRow.appendChild(closeBtn);

    panel.appendChild(headerRow);
    panel.appendChild(content);
    panel.appendChild(navRow);

    infoOverlay.appendChild(panel);

    infoOverlay.addEventListener("click", (e) => {
      if (e.target === infoOverlay) {
        closeInfoOverlay();
      }
    });

    (document.body || container).appendChild(infoOverlay);

    setInfoPage(0);
  }

  function setInfoPage(pageIndex) {
    if (!infoContentEl || !infoPageLabel) return;
    const neon = "#4defff";

    infoPage = 0;

    let html = "";

    const list = Array.isArray(infoLeaderboardData) ? infoLeaderboardData : [];
    const userLabel = (typeof getCurrentUserLabel === "function")
      ? getCurrentUserLabel()
      : null;

    let meRow = null;
    if (userLabel && list.length > 0) {
      const meLower = userLabel.trim().toLowerCase();
      for (let i = 0; i < list.length; i++) {
        const row = list[i];
        if (!row) continue;

        let tag =
          (typeof row === "object")
            ? (row.tag || row.username || row.user || row.name || row.label || null)
            : String(row);

        if (!tag) continue;
        if (String(tag).trim().toLowerCase() === meLower) {
          meRow = row;
          break;
        }
      }
    }

    const hasSessionRun =
      (typeof lastRunScore === "number" && lastRunScore > 0) ||
      (typeof lastRunTime === "number" && lastRunTime > 0);

    if (!hasSessionRun && !meRow) {
      html += `
        <div style="font-size:13px; line-height:1.5;">
          <b>No runs recorded yet</b><br>
          No previous runs yet for this tag.<br>
          Start a game and try to keep your frogs alive as long as possible!
        </div>
      `;
    } else {
      let displayScore = 0;
      let displaySecs  = 0;

      if (hasSessionRun) {
        displayScore = lastRunScore || 0;
        displaySecs  = Math.max(0, lastRunTime || 0);
      } else if (meRow && typeof meRow === "object") {
        let s = null;
        let t = null;

        if (meRow.score != null)          s = meRow.score;
        else if (meRow.bestScore != null) s = meRow.bestScore;
        else if (meRow.maxScore != null)  s = meRow.maxScore;
        else if (meRow.points != null)    s = meRow.points;

        if (meRow.seconds != null)        t = meRow.seconds;
        else if (meRow.time != null)      t = meRow.time;
        else if (meRow.bestTime != null)  t = meRow.bestTime;

        if (typeof s === "string") {
          const parsed = parseFloat(s);
          if (!Number.isNaN(parsed)) s = parsed;
        }
        if (typeof t === "string") {
          const parsed = parseFloat(t);
          if (!Number.isNaN(parsed)) t = parsed;
        }

        if (typeof s === "number" && s > 0) displayScore = s;
        if (typeof t === "number" && t > 0) displaySecs  = t;
      }

      displayScore = displayScore || 0;
      displaySecs  = Math.max(0, displaySecs || 0);

      const scoreStr = Math.floor(displayScore).toLocaleString("en-US");
      const secs = Math.floor(displaySecs);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      const tStr = `${m}:${s.toString().padStart(2, "0")}`;

      let tagLine = "";
      if (userLabel && typeof userLabel === "string") {
        const esc = userLabel.replace(/[&<>]/g, c => (
          c === "&" ? "&amp;" :
          c === "<" ? "&lt;"  :
          c === ">" ? "&gt;"  : c
        ));
        tagLine = `
          • Your tag: <span style="color:${neon}; font-weight:bold;">${esc}</span><br>
        `;
      }

      html += `
        <div style="font-size:13px; line-height:1.5;">
          <b>Last / Best run</b><br>
          • Time survived: <span style="color:${neon};">${tStr}</span><br>
          • Score: <span style="color:${neon};">${scoreStr}</span><br>
          ${tagLine}
        </div>
      `;
    }

    infoContentEl.innerHTML = html;
    infoPageLabel.textContent = "Run summary";
  }

  function openInfoOverlay(startPage) {
    ensureInfoOverlay();
    gamePaused = true;

    setInfoPage(0);

    if (infoOverlay) {
      infoOverlay.style.display = "flex";
    }
  }

  function closeInfoOverlay() {
    if (infoOverlay) {
      infoOverlay.style.display = "none";
    }

    if (pendingInitialUpgradeAfterInfo && !initialUpgradeDone) {
      pendingInitialUpgradeAfterInfo = false;
      openUpgradeOverlay("normal");
    } else {
      gamePaused = false;
    }
  }

  function ensureUpgradeOverlay() {
    if (upgradeOverlay) return;

    upgradeOverlay = document.createElement("div");
    upgradeOverlay.className = "frog-upgrade-overlay";

    upgradeOverlay.style.position = "fixed";
    upgradeOverlay.style.inset = "0";
    upgradeOverlay.style.background = "rgba(0,0,0,0.6)";
    upgradeOverlay.style.display = "none";
    upgradeOverlay.style.zIndex = "190";
    upgradeOverlay.style.alignItems = "center";
    upgradeOverlay.style.justifyContent = "center";
    upgradeOverlay.style.pointerEvents = "auto";

    const panel = document.createElement("div");
    panel.style.background = "#111";
    panel.style.padding = "16px 18px";
    panel.style.borderRadius = "10px";
    panel.style.border = "1px solid #444";
    panel.style.color = "#fff";
    panel.style.fontFamily = "monospace";
    panel.style.textAlign = "left";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "420px";
    panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

    const title = document.createElement("div");
    title.style.fontSize = "14px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "8px";
    upgradeTitleEl = title;

    const choices = document.createElement("div");
    choices.style.display = "flex";
    choices.style.flexDirection = "column";
    choices.style.gap = "6px";
    upgradeChoicesEl = choices;

    panel.appendChild(title);
    panel.appendChild(choices);

    upgradeOverlay.appendChild(panel);

    upgradeOverlay.addEventListener("click", (e) => {
      if (e.target === upgradeOverlay) {
        return;
      }
    });

    (document.body || container).appendChild(upgradeOverlay);
  }

  function getUpgradeChoices() {
    const neon = "#4defff";

    return [
      {
        id: "frogSpeed",
        label: `
          ⏩ Frogs hop faster forever<br>
          ~<span style="color:${neon};">10%</span> faster hop cycle
        `,
        apply: () => { frogPermanentSpeedFactor *= FROG_SPEED_UPGRADE_FACTOR; }
      },
      {
        id: "frogJump",
        label: `
          🦘⬆️ Frogs jump higher forever<br>
          ~<span style="color:${neon};">+25%</span> jump height
        `,
        apply: () => { frogPermanentJumpFactor *= FROG_JUMP_UPGRADE_FACTOR; }
      },
      {
        id: "spawn20",
        label: `
          🐸➕ Spawn frogs<br>
          <span style="color:${neon};">${NORMAL_SPAWN_AMOUNT}</span> frogs right now
        `,
        apply: () => { spawnExtraFrogs(NORMAL_SPAWN_AMOUNT); }
      },
      {
        id: "buffDuration",
        label: `
          ⏳ Buffs last longer<br>
          ~<span style="color:${neon};">+20%</span> buff duration
        `,
        apply: () => { globalBuffDuration *= BUFF_DURATION_UPGRADE_FACTOR; }
      },
      {
        id: "orbSpawnRate",
        label: `
          🔮 More orbs appear<br>
          ~<span style="color:${neon};">+10%</span> orb spawn rate
        `,
        apply: () => { orbSpawnFactor *= ORB_SPAWN_RATE_FACTOR; setNextOrbTime(); }
      }
    ];
  }

  let frogPermanentSpeedFactor = 1.0;
  let frogPermanentJumpFactor  = 1.0;

  function spawnExtraFrogs(count) {
    for (let i = 0; i < count && frogs.length < MAX_FROGS; i++) {
      const x = randomRange(80, width - 80);
      const y = randomRange(80, height - 80);
      frogs.push(createFrog(x, y, 1));
    }
  }

  function openUpgradeOverlay(type) {
    ensureUpgradeOverlay();
    upgradeType = type;
    gamePaused = true;

    const neon = "#4defff";
    let titleHtml = "";

    const isEpic = (type === "epic");
    if (isEpic) {
      titleHtml = `
        ⭐ <span style="color:${neon}; font-weight:bold;">EPIC UPGRADE</span> – choose one
      `;
    } else {
      titleHtml = `
        🐸 Buff & upgrade – choose one
      `;
    }

    upgradeTitleEl.innerHTML = titleHtml;

    const allChoices = getUpgradeChoices();
    const choices = [];

    if (type === "epic") {
      const epicPool = [
        {
          id: "spawn50",
          label: `
            🐸🐸🐸 Massive spawn<br>
            <span style="color:${neon};">${EPIC_SPAWN_AMOUNT}</span> frogs right now
          `,
          apply: () => { spawnExtraFrogs(EPIC_SPAWN_AMOUNT); }
        },
        {
          id: "deathrattleEpic",
          label: `
            💀🐸 Deathrattle<br>
            <span style="color:${neon};">25%</span> chance to spawn a frog when one dies
          `,
          apply: () => { globalDeathrattleChance = EPIC_DEATHRATTLE_CHANCE; }
        },
        {
          id: "snakeEgg",
          label: `
            🐍🥚 Snake egg<br>
            Next shed gives less speed
          `,
          apply: () => { snakeEggPending = true; }
        },
        {
          id: "zombieHorde",
          label: `
            🧟‍♂️ Zombie frogs<br>
            Spawns a horde, they respawn once
          `,
          apply: () => { spawnZombieHorde(); }
        },
        {
          id: "allFrogsFaster",
          label: `
            🐸💨 All frogs faster<br>
            <span style="color:${neon};">Marginal permanent</span> speed boost
          `,
          apply: () => { frogPermanentSpeedFactor *= 0.9; }
        }
      ];
      const used = new Set();
      while (choices.length < 3 && epicPool.length > 0) {
        const opt = pickRandom(epicPool);
        if (!opt || used.has(opt.id)) continue;
        used.add(opt.id);
        choices.push(opt);
      }
    } else {
      const firstMinuteMustSpawn = (secondsSurvived < 75);
      const spawnOption = allChoices.find(c => c.id === "spawn20");

      const pool = allChoices.slice();
      if (firstMinuteMustSpawn && spawnOption) {
        choices.push(spawnOption);
        const idx = pool.indexOf(spawnOption);
        if (idx >= 0) pool.splice(idx, 1);
        while (choices.length < 3 && pool.length > 0) {
          const c = pickRandom(pool);
          const idx2 = pool.indexOf(c);
          if (idx2 >= 0) pool.splice(idx2, 1);
          choices.push(c);
        }
      } else {
        while (choices.length < 3 && pool.length > 0) {
          const c = pickRandom(pool);
          const idx2 = pool.indexOf(c);
          if (idx2 >= 0) pool.splice(idx2, 1);
          choices.push(c);
        }
      }
    }

    upgradeChoicesEl.innerHTML = "";

    choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.style.display = "block";
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.fontFamily = "monospace";
      btn.style.fontSize = "12px";
      btn.style.padding = "6px 8px";
      btn.style.borderRadius = "6px";
      btn.style.border = "1px solid #555";
      btn.style.background = "#222";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.style.whiteSpace = "normal";

      btn.innerHTML = choice.label;

      btn.onmouseenter = () => { btn.style.background = "#333"; };
      btn.onmouseleave = () => { btn.style.background = "#222"; };

      btn.onclick = () => {
        try {
          if (typeof choice.apply === "function") {
            choice.apply();
          }
        } catch (err) {
          console.error("Error applying upgrade:", err);
        }

        if (!initialUpgradeDone) {
          initialUpgradeDone = true;
          playPermanentChoiceSound();
        } else {
          if (type === "epic") {
            playPerFrogUpgradeSound();
          } else {
            playBuffSound();
          }
        }

        closeUpgradeOverlay();
      };

      upgradeChoicesEl.appendChild(btn);
    });

    upgradeOverlay.style.display = "flex";
  }

  function closeUpgradeOverlay() {
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "none";
    }
    gamePaused = false;
  }

  let globalDeathrattleChance = COMMON_DEATHRATTLE_CHANCE;

  function spawnZombieHorde() {
    for (let i = 0; i < ZOMBIE_HORDE_COUNT && frogs.length < MAX_FROGS; i++) {
      const x = randomRange(80, width - 80);
      const y = randomRange(80, height - 80);
      const fg = createFrog(x, y, 0.8);
      fg.roles |= ROLE_FLAGS.ZOMBIE;
      frogs.push(fg);
    }
  }

  function handleZombieRespawns() {
    for (let i = deadFrogs.length - 1; i >= 0; i--) {
      const frog = deadFrogs[i];
      frog.deathTimer -= 1 / 60;
      if (frog.deathTimer <= 0 && (frog.roles & ROLE_FLAGS.ZOMBIE)) {
        frog.alive = true;
        frog.deathTimer = 0;
        frog.x = clamp(
          frog.x + randomRange(-40, 40),
          40,
          width - 40
        );
        frog.y = clamp(
          frog.y + randomRange(-40, 40),
          40,
          height - 40
        );
        frogs.push(frog);
        deadFrogs.splice(i, 1);
      }
    }
  }

  function handleGlobalDeathrattle() {
    for (let i = deadFrogs.length - 1; i >= 0; i--) {
      const frog = deadFrogs[i];
      if (Math.random() < globalDeathrattleChance) {
        const nx = clamp(
          frog.x + randomRange(-50, 50),
          40,
          width - 40
        );
        const ny = clamp(
          frog.y + randomRange(-50, 50),
          40,
          height - 40
        );
        frogs.push(createFrog(nx, ny, 0.9));
      }
    }
  }

  function ensureMiniLeaderboard(container) {
    if (miniLeaderboardEl) return;
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.top = "8px";
    wrap.style.right = "8px";
    wrap.style.padding = "6px 8px";
    wrap.style.borderRadius = "8px";
    wrap.style.background = "rgba(0,0,0,0.6)";
    wrap.style.color = "#fff";
    wrap.style.fontFamily = "monospace";
    wrap.style.fontSize = "11px";
    wrap.style.lineHeight = "1.3";
    wrap.style.pointerEvents = "none";

    wrap.innerHTML = `
      <div style="font-weight:bold; margin-bottom:2px;">Top frogs</div>
      <div class="frog-mini-leaderboard-lines"></div>
    `;

    miniLeaderboardEl = wrap;
    container.appendChild(wrap);
  }

  function updateMiniLeaderboardView(list) {
    if (!miniLeaderboardEl) return;
    const linesEl = miniLeaderboardEl.querySelector(".frog-mini-leaderboard-lines");
    if (!linesEl) return;
    linesEl.innerHTML = "";

    const maxLines = 5;
    const neon = "#ffeb3b";
    const userLabel = getCurrentUserLabel();

    for (let i = 0; i < Math.min(maxLines, list.length); i++) {
      const row = list[i];
      const line = document.createElement("div");
      line.style.whiteSpace = "nowrap";

      let tag =
        (row.tag || row.username || row.user || row.name || row.label || `Player ${i + 1}`);
      const score =
        row.score != null ? row.score :
        row.bestScore != null ? row.bestScore :
        row.points != null ? row.points : 0;

      const isMe = userLabel &&
        String(tag).trim().toLowerCase() === userLabel.trim().toLowerCase();

      const tagHtml = isMe
        ? `<span style="color:${neon}; font-weight:bold;">${tag}</span>`
        : `<span>${tag}</span>`;

      line.innerHTML = `${i + 1}. ${tagHtml} – ${score}`;
      linesEl.appendChild(line);
    }
  }

  function setupInput() {
    container.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) / gameScale;
      mousePos.y = (e.clientY - rect.top) / gameScale;
    });

    container.addEventListener("touchmove", (e) => {
      if (!e.touches.length) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mousePos.x = (t.clientX - rect.left) / gameScale;
      mousePos.y = (t.clientY - rect.top) / gameScale;
      e.preventDefault();
    }, { passive: false });
  }

  function resetRunState() {
    frogs = [];
    snakeSegments = [];
    orbs = [];
    dyingSnakes = [];
    deadFrogs = [];

    speedBuffTimer      = 0;
    jumpBuffTimer       = 0;
    snakeSlowTimer      = 0;
    snakeConfuseTimer   = 0;
    snakeShrinkTimer    = 0;
    teamShieldTimer     = 0;
    globalTimeSlowTimer = 0;
    panicHopTimer       = 0;
    scoreMultTimer      = 0;
    lifestealTimer      = 0;
    orbMagnetTimer      = 0;

    orbMagnetActive     = false;
    scoreMultiplier     = 1.0;

    globalDeathrattleChance = COMMON_DEATHRATTLE_CHANCE;

    legendaryEventTriggered = false;
    snakeShedStage          = 0;
    snakeShedCount          = 0;
    nextShedTime            = SHED_INTERVAL;
    snakeEggPending         = false;
    epicChainPending        = false;

    score           = 0;
    frogsEaten      = 0;
    secondsSurvived = 0;
    elapsedTime     = 0;
    gameOver        = false;
    gamePaused      = false;
  }

  function restartGame() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    resetRunState();
    createInitialFrogs();
    initSnake();
    setNextOrbTime();
    applyGameScale();
    lastTimestamp = 0;
    animId = requestAnimationFrame(drawFrame);
  }

  async function startGame() {
    initAudio();
    initLeaderboard();

    applyGameScale();
    setupInput();

    ensureMiniLeaderboard(container);

    const topList = await fetchLeaderboard();
    if (topList) {
      infoLeaderboardData = Array.isArray(topList) ? topList : [];
      updateMiniLeaderboardView(topList);
    }

    createInitialFrogs();
    initSnake();
    setNextOrbTime();

    if (!hasShownHowToOverlay) {
      hasShownHowToOverlay = true;
      pendingInitialUpgradeAfterInfo = true;
      openInfoOverlay(0);
    } else {
      openUpgradeOverlay("normal");
    }

    lastTimestamp = 0;
    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", () => {
    applyGameScale();
  });

  window.addEventListener("load", () => {
    startGame().catch(err => {
      console.error("Error starting frog snake game:", err);
    });
  });
})();
