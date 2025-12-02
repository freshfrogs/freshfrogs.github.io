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
  const playButtonClick          = AudioMod.playButtonClick          || function(){};

  const LMod = window.FrogGameLeaderboard || {};
  const initLeaderboard        = LMod.initLeaderboard        || function(){};
  const submitScoreToServer    = LMod.submitScoreToServer    || (async () => null);
  const fetchLeaderboard       = LMod.fetchLeaderboard       || (async () => null);
  const updateMiniLeaderboard  = LMod.updateMiniLeaderboard  || function(){};
  const openScoreboardOverlay  = LMod.openScoreboardOverlay  || function(){};
  const hideScoreboardOverlay  = LMod.hideScoreboardOverlay  || function(){};

  // --------------------------------------------------
  // BASIC CONSTANTS
  // --------------------------------------------------
  const FROG_SIZE       = 64;
  const MAX_TOKEN_ID    = 200;
  const META_BASE       = "../frog/json/";
  const META_EXT        = ".json";
  const BUILD_BASE      = "../frog/build_files";
  const STARTING_FROGS  = 50;
  const MAX_FROGS       = 100;

    // --------------------------------------------------
  // SNAKE CONSTANTS
  // --------------------------------------------------
  const SNAKE_SEGMENT_SIZE  = 64;
  const SNAKE_BASE_SPEED    = 90;
  const SNAKE_TURN_RATE     = Math.PI * 0.75;
  const SNAKE_SEGMENT_GAP   = 48;
  const SNAKE_INITIAL_SEGMENTS = 6;
  const SNAKE_EAT_RADIUS_BASE = 48;

  const SNAKE_EGG_BUFF_PCT = 1.11;

  // Base turn rate and cap
  const SNAKE_TURN_RATE_BASE = Math.PI * 0.75;
  const SNAKE_TURN_RATE_CAP  = Math.PI * 1.60;

  // --------------------------------------------------
  // BUFFS
  // --------------------------------------------------
  const SPEED_BUFF_DURATION = 10;
  const JUMP_BUFF_DURATION  = 10;

  const SNAKE_SLOW_DURATION    = 10;
  const SNAKE_CONFUSE_DURATION = 10;
  const SNAKE_SHRINK_DURATION  = 10;
  const FROG_SHIELD_DURATION   = 10;
  const TIME_SLOW_DURATION     = 10;
  const ORB_MAGNET_DURATION    = 10;
  const SCORE_MULTI_DURATION   = 20;
  const PANIC_HOP_DURATION     = 7;
  const CLONE_SWARM_DURATION   = 1;
  const LIFE_STEAL_DURATION    = 10;
  // Permanent lifesteal upgrade: how many orbs it affects
  const PERMA_LIFESTEAL_ORB_COUNT = 20;

  // How strong each buff is
  const SPEED_BUFF_FACTOR        = 0.80;  // frogs act 2× faster (0.5 = half their cycle)
  const PANIC_HOP_SPEED_FACTOR   = 0.60;  // panic hop speed factor
  const JUMP_BUFF_FACTOR         = 3.00;  // jump buff height multiplier

  // Snake speed + Lucky config
  const SNAKE_SLOW_FACTOR      = 0.6;  // snake slow buff → 50% speed
  const TIME_SLOW_FACTOR       = 0.5;  // time slow → 40% speed
  const FRENZY_SPEED_FACTOR    = 1.25; // legendary Frenzy → +25% speed

  const SCORE_MULTI_FACTOR       = 2.0;  // score x2

  // Aura / champion / lucky
  const CHAMPION_SPEED_FACTOR    = 0.75;
  const CHAMPION_JUMP_FACTOR     = 1.35;
  const AURA_JUMP_FACTOR         = 1.25;
  const LUCKY_BUFF_DURATION_BOOST = 1.50;
  const AURA_SPEED_FACTOR        = 0.80;
  const LUCKY_SCORE_BONUS_PER    = 0.15; // +10% per Lucky frog
  


  // --------------------------------------------------
  // UPGRADE CONFIG (permanent choices)
  // --------------------------------------------------

  // Normal upgrade multipliers
  const FROG_SPEED_UPGRADE_FACTOR     = 0.90; // ~15% faster hops each pick
  const FROG_JUMP_UPGRADE_FACTOR      = 1.30; // ~70% higher jumps each pick
  const BUFF_DURATION_UPGRADE_FACTOR  = 1.10; // +20% buff duration each pick
  const ORB_INTERVAL_UPGRADE_FACTOR   = 0.85; // ~15% faster orb spawns each pick
  const ORB_COLLECTOR_CHANCE = 0.20;
  const TOTAL_HIGHLIGHT_COLOR = "#ffb347"; // for showing new total values

  // --- HARD CAPS for permanent upgrades / buffs ---
  // Frogs can't be faster than 50% of the original hop cycle
  const MIN_FROG_SPEED_FACTOR         = 0.50;
  const MAX_FROG_JUMP_FACTOR          = 3.0;
  const MAX_BUFF_DURATION_FACTOR      = 3.5;
  const MIN_ORB_SPAWN_INTERVAL_FACTOR = 0.40;
  const MAX_DEATHRATTLE_CHANCE        = 0.45;
  const MAX_ORB_COLLECTOR_TOTAL       = 1.0;
  const SNAKE_SHED_SPEEDUP = 1.20;

  const MAX_SNAKE_SEGMENTS = 150;
  const CANNIBAL_ROLE_CHANCE = 0.05;

  const ORB_STORM_COUNT = 15;
  // Spawn amounts
  const NORMAL_SPAWN_AMOUNT           = 20;   // normal menu
  const EPIC_SPAWN_AMOUNT             = 30;   // epic menu
  const LEGENDARY_SPAWN_AMOUNT        = 30;   // legendary menu

  // Deathrattle chances
  const COMMON_DEATHRATTLE_CHANCE = 0.05;
  const EPIC_DEATHRATTLE_CHANCE       = 0.15; // 25%
  const LEGENDARY_DEATHRATTLE_CHANCE  = 0.25; // 50%

  const GRAVE_WAVE_MIN_GHOSTS = 10;
  const GRAVE_WAVE_MAX_GHOSTS = 20;

  // Legendary buff duration spike
  const LEGENDARY_BUFF_DURATION_FACTOR = 2.0; // x2 all buff durations
  const LAST_STAND_MIN_CHANCE = 0.33;

  const container = document.getElementById("frog-game");
  if (!container) return;

  // Keep these arrays consistent with your scatter-frogs setup
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

  const SKIP_TRAITS = new Set(["Background", "background", "BG", "Bg"]);

  // --------------------------------------------------
  // GAME STATE
  // --------------------------------------------------
  let frogs = [];
  let snake = null;
  let orbs  = [];

  let animId        = null;
  let lastTime      = 0;
  let elapsedTime   = 0;
  let gameOver      = false;
  let gamePaused    = false;
  let nextOrbTime   = 0;
  let score         = 0;
  let frogsEatenCount = 0; // grow one segment every 2 frogs

  let lastRunScore  = 0;
  let lastRunTime   = 0;

  // every 60 seconds we pause for a global permanent upgrade
  let nextPermanentChoiceTime = 60;

  // every 180 seconds we pause for an EPIC upgrade
  let nextEpicChoiceTime = 180;

  // 10-minute legendary choice
  const LEGENDARY_EVENT_TIME = 600; // 10 minutes

  // Snake shedding every 5 minutes
  const SHED_INTERVAL = 300; // 5 minutes

  let legendaryEventTriggered = false;

  let infoOverlay = null;
  let infoPage = 0;
  let infoContentEl = null;
  let infoPageLabel = null;
  let infoPrevBtn = null;
  let infoNextBtn = null;
  let infoLeaderboardData = [];

    // This is the value actually used in movement and scaled on each shed
  let snakeTurnRate        = SNAKE_TURN_RATE_BASE;


  // Shed state
  let snakeShedStage   = 0;          // 0 = base, 1 = yellow, 2 = orange, 3+ = red
  let snakeShedCount   = 0;          // how many times we've shed this run
  let nextShedTime     = SHED_INTERVAL;

  let snakeEggPending = false; // EPIC: next shed uses reduced speed bonus
  let epicChainPending = false;

  // Old snakes that are despawning chunk-by-chunk
  let dyingSnakes = [];

  let speedBuffTime   = 0;
  let jumpBuffTime    = 0;
  let snakeSlowTime   = 0;
  let snakeConfuseTime= 0;
  let snakeShrinkTime = 0;
  let frogShieldTime  = 0;
  let timeSlowTime    = 0;
  let orbMagnetTime   = 0;
  let scoreMultiTime  = 0;
  let panicHopTime    = 0;
  let cloneSwarmTime  = 0;
  let lifeStealTime   = 0;
  let frogDeathRattleChance = 0.0;  // 0.25 when epic is picked
  let permaLifeStealOrbsRemaining = 0;
  let cannibalFrogCount = 0;       // how many cannibal frogs are currently alive
  let lastStandActive = false;
  let orbCollectorActive   = false;
  let orbCollectorChance   = 0;    // current chance (0–1) that an orb spawns a frog
  let orbSpecialistActive  = false;

  // Legendary Frenzy timer (snake + frogs go wild)
  let snakeFrenzyTime = 0;

  // global permanent buffs
  let frogPermanentSpeedFactor = 1.0; // <1 = faster hops
  let frogPermanentJumpFactor  = 1.0; // >1 = higher hops
  let snakePermanentSpeedFactor= 1.0;
  let buffDurationFactor       = 1.0; // >1 = longer temp buffs
  let orbSpawnIntervalFactor   = 0.95; // <1 = more orbs

  // ---- RUN STATS (for leaderboard / post-run summary) ----
  let totalFrogsSpawned = 0;
  let totalOrbsSpawned = 0;
  let totalOrbsCollected = 0;

  // Optional extras if you want them:
  let totalGhostFrogsSpawned = 0;  // for Grave Wave, etc.
  let totalCannibalEvents = 0;     // number of Frog-eat-Frog kills

  let graveWaveActive   = false;
  let frogEatFrogActive = false;

  const AURA_RADIUS  = 200;
  const AURA_RADIUS2 = AURA_RADIUS * AURA_RADIUS;

  // --------------------------------------------------
  // MOUSE
  // --------------------------------------------------
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
    follow: false
  };
  
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  
  window.addEventListener("click", () => {
    if (gameOver) {
      restartGame();
      return;
    }
    mouse.follow = true;
  });  

  // --------------------------------------------------
  // HUD
  // --------------------------------------------------
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
  const scoreLabel = document.createElement("span");
  frogsLabel.style.marginLeft = "12px";
  scoreLabel.style.marginLeft = "12px";

  hud.appendChild(timerLabel);
  hud.appendChild(frogsLabel);
  hud.appendChild(scoreLabel);
  container.appendChild(hud);

  // mini leaderboard
  const miniBoard = document.createElement("div");
  miniBoard.id = "frog-mini-leaderboard";
  miniBoard.style.position = "absolute";
  miniBoard.style.top = "10px";
  miniBoard.style.right = "10px";
  miniBoard.style.padding = "6px 10px";
  miniBoard.style.borderRadius = "8px";
  miniBoard.style.background = "rgba(0,0,0,0.55)";
  miniBoard.style.color = "#fff";
  miniBoard.style.fontFamily = "monospace";
  miniBoard.style.fontSize = "11px";
  miniBoard.style.zIndex = "100";
  miniBoard.style.maxWidth = "220px";
  miniBoard.style.pointerEvents = "none";
  miniBoard.textContent = "Loading leaderboard…";
  container.appendChild(miniBoard);

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
    scoreLabel.textContent = `Score: ${Math.floor(score)}`;
  }

  function showGameOver() {
    gameOverBanner.style.display = "block";
  }

  function hideGameOver() {
    gameOverBanner.style.display = "none";
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function snakeShed(stage) {
    if (!snake) return;

    // Capture the old snake so we can despawn it over time.
    const oldSnake = snake;
    const oldHeadEl = oldSnake.head && oldSnake.head.el ? oldSnake.head.el : null;
    const oldSegmentEls = Array.isArray(oldSnake.segments)
      ? oldSnake.segments.map(seg => seg.el).filter(Boolean)
      : [];

    if (oldHeadEl || oldSegmentEls.length) {
      dyingSnakes.push({
        headEl: oldHeadEl,
        segmentEls: oldSegmentEls,
        nextDespawnTime: 0.08   // seconds between chunks disappearing
      });
    }

    // Permanent speed bonus each shed.
    // Normally +20%, but if Snake Egg is pending, only +11% (20% - 9%).
    let speedMult = SNAKE_SHED_SPEEDUP;
    if (snakeEggPending) {
      speedMult = SNAKE_EGG_BUFF_PCT;   // +11% instead of +20%
      snakeEggPending = false; // consume the egg buff
    }
    snakePermanentSpeedFactor *= speedMult;

    // Turn radius: slightly tighter turns each shed (20% per shed, capped)
    // NOTE: higher snakeTurnRate = sharper turns (tighter radius).
    snakeTurnRate = Math.min(SNAKE_TURN_RATE_CAP, snakeTurnRate * 1.2);

    // Decide new color stage (1 = yellow, 2 = orange, 3+ = red).
    snakeShedStage = stage;


    // Spawn the new snake roughly where the old head was.
    const width  = window.innerWidth;
    const height = window.innerHeight;

    const startX = (oldSnake.head && typeof oldSnake.head.x === "number")
      ? oldSnake.head.x
      : width * 0.15;
    const startY = (oldSnake.head && typeof oldSnake.head.y === "number")
      ? oldSnake.head.y
      : height * 0.5;

    // Decide how many segments the new snake should start with:
    // - 1/4 of the old snake's length
    // - minimum SNAKE_INITIAL_SEGMENTS
    // - maximum 50 segments
    const oldCountRaw = oldSegmentEls.length || SNAKE_INITIAL_SEGMENTS;
    let newSegCount = Math.round(oldCountRaw / 4);

    if (newSegCount < SNAKE_INITIAL_SEGMENTS) {
      newSegCount = SNAKE_INITIAL_SEGMENTS;
    }
    if (newSegCount > 20) {
      newSegCount = 20;
    }

    // Create new head
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
    headEl.style.backgroundImage = "url(https://freshfrogs.github.io/snake/images/head.png)";
    container.appendChild(headEl);

    // Create new segments
    const segments = [];
    for (let i = 0; i < newSegCount; i++) {
      const segEl = document.createElement("div");
      const isTail = i === newSegCount - 1;
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
        ? "url(https://freshfrogs.github.io/snake/images/tail.png)"
        : "url(https://freshfrogs.github.io/snake/images/body.png)";
      container.appendChild(segEl);

      segments.push({ el: segEl, x: startX, y: startY });
    }

    // New path for the new snake
    const path = [];
    const maxPath = (segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    for (let i = 0; i < maxPath; i++) {
      path.push({ x: startX, y: startY });
    }

    // Replace global snake reference with the new snake
    snake = {
      head: { el: headEl, x: startX, y: startY, angle: 0 },
      segments,
      path,
      isFrenzyVisual: false
    };

    // Apply the appropriate color tint for this shed stage
    applySnakeAppearance();

    // Grave Wave: every shed, raise a wave of ghost frogs
    if (graveWaveActive) {
      const ghostCount = randInt(GRAVE_WAVE_MIN_GHOSTS, GRAVE_WAVE_MAX_GHOSTS);
      spawnGhostWave(ghostCount);
    }

  }

  function updateDyingSnakes(dt) {
    // Walk backwards so we can safely splice as things fully disappear
    for (let i = dyingSnakes.length - 1; i >= 0; i--) {
      const ds = dyingSnakes[i];

      // Countdown to the next piece disappearing
      ds.nextDespawnTime -= dt;

      if (ds.nextDespawnTime <= 0) {
        // Reset timer between chunks
        ds.nextDespawnTime = 0.08; // ~12–13 segments per second

        // 1) Remove one body segment at a time
        if (ds.segmentEls && ds.segmentEls.length > 0) {
          const segEl = ds.segmentEls.pop();
          if (segEl && segEl.parentNode === container) {
            container.removeChild(segEl);
          }
        }
        // 2) Once all segments are gone, remove the head
        else if (ds.headEl) {
          if (ds.headEl.parentNode === container) {
            container.removeChild(ds.headEl);
          }
          ds.headEl = null;
        }
        // 3) When nothing is left, drop this dying snake entry
        else {
          dyingSnakes.splice(i, 1);
        }
      }
    }
  }


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

  // --------------------------------------------------
  // METADATA + LAYERS (MATCHES SCATTER FROGS)
  // --------------------------------------------------
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

  // --------------------------------------------------
  // FROG CREATION (KEEPING ORIGINAL HOP FEEL)
  // --------------------------------------------------
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

  function refreshFrogPermaGlow(frog) {
    const glows = [];
    if (frog.isChampion)      glows.push("0 0 12px rgba(255,215,0,0.9)");
    if (frog.isAura)          glows.push("0 0 12px rgba(0,255,200,0.9)");
    if (frog.hasPermaShield)  glows.push("0 0 10px rgba(135,206,250,0.9)");
    if (frog.isMagnet)        glows.push("0 0 10px rgba(173,255,47,0.9)");
    if (frog.isLucky)         glows.push("0 0 10px rgba(255,105,180,0.9)");
    if (frog.isZombie)        glows.push("0 0 10px rgba(148,0,211,0.9)");
    if (frog.isCannibal)      glows.push("0 0 12px rgba(255,69,0,0.95)"); // NEW
    frog.el.style.boxShadow = glows.join(", ");
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

      // per-frog permanent upgrades
      speedMult: 1.0,
      jumpMult: 1.0,
      isChampion: false,
      isAura: false,
      hasPermaShield: false,
      isMagnet: false,
      isLucky: false,
      isZombie: false,
      shieldGrantedAt: null,
      // per-frog deathrattle (for special cases like Zombie Horde)
      specialDeathRattleChance: null,

      // NEW – special roles
      isCannibal: false,
      extraDeathRattleChance: 0,  // per-frog extra chance (e.g. Zombie Horde)
      cannibalIcon: null,         // overlay icon for cannibal

      cloneEl: null,
      layers: []
    };

    frogs.push(frog);
    refreshFrogPermaGlow(frog);

    totalFrogsSpawned++;

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

    function spawnZombieHorde(count) {
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const margin = 16;

    const toSpawn = Math.min(count, MAX_FROGS - frogs.length);
    for (let i = 0; i < toSpawn; i++) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const tokenId = randInt(1, MAX_TOKEN_ID);
      const frog = createFrogAt(x, y, tokenId);

      // Mark these as special “Zombie Horde” zombies:
      frog.isZombie = true;
      frog.specialDeathRattleChance = 0.5; // 50% DR just for these guys
      refreshFrogPermaGlow(frog);          // keep your purple glow
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

function spawnFrogPromotion(count) {
  const width  = window.innerWidth;
  const height = window.innerHeight;
  const margin = 16;

  const toSpawn = Math.min(count, MAX_FROGS - frogs.length);
  for (let i = 0; i < toSpawn; i++) {
    const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
    const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
    const tokenId = randInt(1, MAX_TOKEN_ID);
    const frog = createFrogAt(x, y, tokenId);

    // Give each spawned frog a random permanent role
    grantRandomPermaFrogUpgrade(frog);
    refreshFrogPermaGlow(frog);
  }
}

  function markGhostFrog(frog) {
    if (!frog) return;
    frog.isGhost = true;
    // Visual: slightly faded, ghosty look
    frog.el.style.opacity = "0.7";
    frog.el.style.filter = "grayscale(1) brightness(1.2)";
  }

  function spawnGhostWave(count) {
    if (frogs.length >= MAX_FROGS) return;
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const margin = 16;

    const toSpawn = Math.min(count, MAX_FROGS - frogs.length);
    for (let i = 0; i < toSpawn; i++) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const tokenId = randInt(1, MAX_TOKEN_ID);
      const frog = createFrogAt(x, y, tokenId);
      markGhostFrog(frog);
    }
  }


  function getSpeedFactor(frog) {
    let factor = frogPermanentSpeedFactor * (frog.speedMult || 1);

    // aura speed boost
    let auraFactor = 1.0;
    for (const other of frogs) {
      if (!other.isAura) continue;
      const dx = (other.x + FROG_SIZE / 2) - (frog.x + FROG_SIZE / 2);
      const dy = (other.baseY + FROG_SIZE / 2) - (frog.baseY + FROG_SIZE / 2);
      const d2 = dx * dx + dy * dy;
      if (d2 <= AURA_RADIUS2) auraFactor *= AURA_SPEED_FACTOR; // 0.9 etc.
    }
    factor *= auraFactor;

    // champion frogs are a bit faster
    if (frog.isChampion) {
      factor *= CHAMPION_SPEED_FACTOR; // 0.85 → ~15% faster cycle
    }

    if (speedBuffTime > 0)   factor *= SPEED_BUFF_FACTOR;      // e.g. 0.5
    if (panicHopTime > 0)    factor *= PANIC_HOP_SPEED_FACTOR; // e.g. 0.6

    return factor;
  }

function getJumpFactor(frog) {
  let factor = frogPermanentJumpFactor * (frog.jumpMult || 1);

  // Aura jump boost
  for (const other of frogs) {
    if (!other.isAura) continue;
    const dx = (other.x + FROG_SIZE / 2) - (frog.x + FROG_SIZE / 2);
    const dy = (other.baseY + FROG_SIZE / 2) - (frog.baseY + FROG_SIZE / 2);
    const d2 = dx * dx + dy * dy;
    if (d2 <= AURA_RADIUS2) {
      factor *= AURA_JUMP_FACTOR; // 1.15
    }
  }

  // Temporary jump buff
  if (jumpBuffTime > 0) {
    factor *= JUMP_BUFF_FACTOR; // e.g. 3.2
  }

  // Champion jump boost
  if (frog.isChampion) {
    factor *= CHAMPION_JUMP_FACTOR; // 1.25
  }

  return factor;
}

  function getSnakeSpeedFactor() {
    let factor = snakePermanentSpeedFactor;

    if (snakeSlowTime > 0)   factor *= SNAKE_SLOW_FACTOR;
    if (timeSlowTime > 0)    factor *= TIME_SLOW_FACTOR;
    if (snakeFrenzyTime > 0) factor *= FRENZY_SPEED_FACTOR; // +25% speed during Frenzy

    return factor;
  }

  function getSnakeEatRadius() {
    return snakeShrinkTime > 0 ? 24 : SNAKE_EAT_RADIUS_BASE;
  }

  function getSnakeResistance() {
    if (!snake || !snake.segments) return 0;
    const extraSegments = Math.max(0, snake.segments.length - SNAKE_INITIAL_SEGMENTS);
    const RESIST_PER_SEGMENT = 0.04;
    const maxResist = 0.8;
    return Math.max(0, Math.min(maxResist, extraSegments * RESIST_PER_SEGMENT));
  }

function grantChampionFrog(frog) {
  if (frog.isChampion) return;
  frog.isChampion = true;
  frog.speedMult *= 0.85;
  frog.jumpMult  *= 1.25;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("champion");
}

function grantAuraFrog(frog) {
  if (frog.isAura) return;
  frog.isAura = true;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("aura");
}

function grantShieldFrog(frog) {
  if (!frog) return;
  frog.hasPermaShield = true;
  frog.shieldGrantedAt = elapsedTime;  // start 40s timer from now
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("shield");
}

function grantMagnetFrog(frog) {
  if (frog.isMagnet) return;
  frog.isMagnet = true;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("magnet");
}

function grantLuckyFrog(frog) {
  if (frog.isLucky) return;
  frog.isLucky = true;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("lucky");
}

function grantZombieFrog(frog) {
  if (frog.isZombie) return;
  frog.isZombie = true;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
  playPerFrogUpgradeSound("zombie");
}

function updateFrogRoleEmoji(frog) {
  if (!frog || !frog.el) return;

  // Remove previous badge, if any
  if (frog.cannibalIcon && frog.cannibalIcon.parentNode === frog.el) {
    frog.el.removeChild(frog.cannibalIcon);
  }
  frog.cannibalIcon = null;

  const emojis = [];
  if (frog.isChampion)     emojis.push("🏅");
  if (frog.isAura)         emojis.push("🌈");
  if (frog.hasPermaShield) emojis.push("🛡️");
  if (frog.isMagnet)       emojis.push("🧲");
  if (frog.isLucky)        emojis.push("🍀");
  if (frog.isZombie)       emojis.push("🧟");
  if (frog.isCannibal)     emojis.push("🦴");

  if (!emojis.length) return;

  const badge = document.createElement("div");
  badge.className = "frog-role-emoji";
  badge.textContent = emojis.join("");
  badge.style.position = "absolute";
  badge.style.bottom = "-2px";
  badge.style.right = "-2px";
  badge.style.fontSize = "11px";
  badge.style.pointerEvents = "none";
  badge.style.textShadow = "0 0 2px #000";

  frog.el.appendChild(badge);
  frog.cannibalIcon = badge;
}

function grantRandomPermaFrogUpgrade(frog) {
  if (!frog) return;
  const roles = ["champion", "aura", "shield", "magnet", "lucky", "zombie", "cannibal"];

  const available = roles.filter((r) => {
    switch (r) {
      case "champion": return !frog.isChampion;
      case "aura":     return !frog.isAura;
      case "shield":   return !frog.hasPermaShield;
      case "magnet":   return !frog.isMagnet;
      case "lucky":    return !frog.isLucky;
      case "zombie":   return !frog.isZombie;
      case "cannibal": return !frog.isCannibal;
      default:         return true;
    }
  });

  const pool = available.length ? available : roles;
  const role = pool[Math.floor(Math.random() * pool.length)];

  switch (role) {
    case "champion": grantChampionFrog(frog);   break;
    case "aura":     grantAuraFrog(frog);       break;
    case "shield":   grantShieldFrog(frog);     break;
    case "magnet":   grantMagnetFrog(frog);     break;
    case "lucky":    grantLuckyFrog(frog);      break;
    case "zombie":   grantZombieFrog(frog);     break;
    case "cannibal": markCannibalFrog(frog);    break;
  }
}

// --------------------------------------------------
// SPECIAL ROLES: CANNIBAL & HELPERS
// --------------------------------------------------

function markCannibalFrog(frog) {
  if (!frog || frog.isCannibal) return;

  frog.isCannibal = true;

  // +5% "overall stats": slightly faster cycle + higher jumps
  frog.speedMult *= 0.95;          // 5% faster hops
  frog.jumpMult  *= 1.05;          // 5% higher jumps

  // +5% personal deathrattle
  frog.extraDeathRattleChance = (frog.extraDeathRattleChance || 0) + 0.05;

  cannibalFrogCount++;
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
}

function unmarkCannibalFrog(frog) {
  if (!frog || !frog.isCannibal) return;

  frog.isCannibal = false;
  cannibalFrogCount = Math.max(0, cannibalFrogCount - 1);
  refreshFrogPermaGlow(frog);
  updateFrogRoleEmoji(frog);
}


  // Spawn a single "random" frog at a random position and return it
  function createRandomFrog() {
    if (frogs.length >= MAX_FROGS) return null;

    const width  = window.innerWidth;
    const height = window.innerHeight;
    const margin = 16;

    const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
    const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
    const tokenId = randInt(1, MAX_TOKEN_ID);
    return createFrogAt(x, y, tokenId);
  }

function computeDeathRattleChanceForFrog(frog) {
  let chance = frogDeathRattleChance || 0;

  // Cannibal aura: +5% per cannibal frog alive (while they exist)
  if (cannibalFrogCount > 0) {
    chance += cannibalFrogCount * 0.05;
  }

  // Per-frog bonus (Zombie Horde, Cannibal stats, etc.)
  if (frog && frog.extraDeathRattleChance) {
    chance += frog.extraDeathRattleChance;
  }

  // Lifeline: push the chance up to at least the configured max,
  // but don't exceed it.
  if (lifeStealTime > 0) {
    chance = Math.max(chance, MAX_DEATHRATTLE_CHANCE);
  }

  // Hard cap at configured max and floor at 0%
  if (chance > MAX_DEATHRATTLE_CHANCE) chance = MAX_DEATHRATTLE_CHANCE;
  if (chance < 0)                       chance = 0;

  return chance;
}


    // Attempt to kill a frog at index `index`, with a specific source ("snake", "cannibal", etc.)
// Attempt to kill a frog at index `index`, with a specific source ("snake", "cannibal", etc.)
function tryKillFrogAtIndex(index, source) {
  const frog = frogs[index];
  if (!frog || !frog.el) return false;

  const wasLastFrog = (frogs.length === 1);

  // -----------------------------
  // Snake-specific protections
  // -----------------------------
  if (source === "snake") {
    // Global temporary shield from orb: protects vs snake hits
    if (frogShieldTime > 0) {
      return false;
    }

    // Clone Swarm: chance that the snake bites a fake decoy instead
    if (cloneSwarmTime > 0) {
      const DECOY_CHANCE = 0.65;
      if (Math.random() < DECOY_CHANCE) {
        playSnakeMunch(); // snake thinks it ate something
        return false;
      }
    }
  }

  // -----------------------------
  // Remove clone visual if any
  // -----------------------------
  if (frog.cloneEl && frog.cloneEl.parentNode === container) {
    container.removeChild(frog.cloneEl);
    frog.cloneEl = null;
  }

  // If this frog *is* a cannibal, unmark it so global counters stay correct
  if (frog.isCannibal) {
    unmarkCannibalFrog(frog);
  }

  // -----------------------------
  // Remove frog DOM + from array
  // -----------------------------
  if (frog.el.parentNode === container) {
    container.removeChild(frog.el);
  }
  frogs.splice(index, 1);

  // -----------------------------
  // On-death effects: zombie, global + per-frog deathrattle, Lifeline, Last Stand
  // -----------------------------

  // Zombie on-death effect (any zombie frog)
  if (frog.isZombie) {
    spawnExtraFrogs(5);
    if (source === "snake") {
      snakeSlowTime = Math.max(snakeSlowTime, 3 * buffDurationFactor);
    }
  }

  let drChance = computeDeathRattleChanceForFrog(frog);

  // Last Stand: if active and this was the last frog, guarantee at least X%,
  // but still never exceed the global cap.
  if (lastStandActive && wasLastFrog) {
    drChance = Math.max(drChance, LAST_STAND_MIN_CHANCE);
    if (drChance > MAX_DEATHRATTLE_CHANCE) {
      drChance = MAX_DEATHRATTLE_CHANCE;
    }
  }

  if (drChance > 0 && Math.random() < drChance) {
    // Spawn a replacement frog
    const newFrog = createRandomFrog();
    if (newFrog) {
      // Zombies keep being zombies, but we do NOT keep their extra 50% DR forever
      if (frog.isZombie) {
        grantZombieFrog(newFrog);
      }

      // Cannibal respawns stay cannibals
      if (frog.isCannibal) {
        markCannibalFrog(newFrog);
      }

      // If this frog was eaten by a cannibal, its respawn gets a random permanent role
      if (source === "cannibal") {
        grantRandomPermaFrogUpgrade(newFrog);
      }

      // NOTE: we do NOT copy frog.extraDeathRattleChance:
      // special 50% bonuses (Zombie Horde) only apply to that one life.
    }
  }

  // -----------------------------
  // Sounds based on source
  // -----------------------------
  if (source === "snake") {
    playSnakeMunch();
    playFrogDeath();
  } else if (source === "cannibal") {
    // Cannibal eats frog: just play death sound (no snake munch)
    playFrogDeath();
  }

  return true; // a frog actually died
}


  // EPIC: spawn a Cannibal Frog
  function spawnCannibalFrog() {
    const frog = createRandomFrog();
    if (!frog) return;
    markCannibalFrog(frog);
  }

  // EPIC: give all frogs random permanent roles
  function giveAllFrogsRandomRoles() {
    for (const frog of frogs) {
      grantRandomPermaFrogUpgrade(frog);
    }
  }

  // EPIC: spawn 3 special zombie frogs with 50% personal deathrattle
  function spawnZombieHorde() {
    for (let i = 0; i < 3; i++) {
      const frog = createRandomFrog();
      if (!frog) continue;
      grantZombieFrog(frog);
      frog.extraDeathRattleChance = 0.5; // 50% personal deathrattle on this life only
    }
  }


function applyBuff(type, frog) {
  // Lucky frogs extend buff durations
  const isLuckyCollector = frog && frog.isLucky;
  const durBoost = isLuckyCollector
    ? LUCKY_BUFF_DURATION_BOOST   // from config, e.g. 1.4
    : 1.0;

  switch (type) {
    case "speed":
      speedBuffTime = SPEED_BUFF_DURATION * buffDurationFactor * durBoost;
      break;

    case "jump":
      jumpBuffTime = JUMP_BUFF_DURATION * buffDurationFactor * durBoost;
      break;

    case "spawn": {
      const base  = randInt(1, 10);
      const bonus = isLuckyCollector ? randInt(1, 4) : 0;
      spawnExtraFrogs(base + bonus);
      break;
    }

    case "snakeSlow":
      snakeSlowTime = SNAKE_SLOW_DURATION * buffDurationFactor * durBoost;
      break;

    case "snakeConfuse":
      snakeConfuseTime = SNAKE_CONFUSE_DURATION * buffDurationFactor * durBoost;
      break;

    case "snakeShrink":
      snakeShrinkTime = SNAKE_SHRINK_DURATION * buffDurationFactor * durBoost;
      break;

    case "frogShield":
      frogShieldTime = FROG_SHIELD_DURATION * buffDurationFactor * durBoost;
      break;

    case "timeSlow":
      timeSlowTime = TIME_SLOW_DURATION * buffDurationFactor * durBoost;
      break;

    case "orbMagnet":
      orbMagnetTime = ORB_MAGNET_DURATION * buffDurationFactor * durBoost;
      break;

    case "megaSpawn": {
      const base  = randInt(15, 25);
      const bonus = isLuckyCollector ? randInt(3, 8) : 0;
      spawnExtraFrogs(base + bonus);
      break;
    }

    case "scoreMulti":
      scoreMultiTime = SCORE_MULTI_DURATION * buffDurationFactor * durBoost;
      break;

    case "panicHop":
      panicHopTime = PANIC_HOP_DURATION * buffDurationFactor * durBoost;
      break;

    case "cloneSwarm":
      cloneSwarmTime = CLONE_SWARM_DURATION * buffDurationFactor * durBoost;
      break;

    case "lifeSteal":
      lifeStealTime = LIFE_STEAL_DURATION * buffDurationFactor * durBoost;
      break;

    default:
      break;
  }

  if (type !== "permaFrog") {
    playBuffSound(type);
  }
}


  function applySnakeAppearance() {
    if (!snake) return;

    const elements = [];
    if (snake.head && snake.head.el) elements.push(snake.head.el);
    if (Array.isArray(snake.segments)) {
      for (const seg of snake.segments) {
        if (seg.el) elements.push(seg.el);
      }
    }

    let filter = "";

    // Base color per shed stage:
    // 0: default
    // 1: yellow
    // 2: orange
    // 3+: red
    if (snakeShedStage === 1) {
      // yellow-ish
      filter = "hue-rotate(-40deg) saturate(1.6) brightness(1.1)";
    } else if (snakeShedStage === 2) {
      // orange-ish
      filter = "hue-rotate(-20deg) saturate(1.7) brightness(1.05)";
    } else if (snakeShedStage >= 3) {
      // red-ish
      filter = "hue-rotate(-60deg) saturate(1.8)";
    }

    // Legendary Frenzy overlay (red tint)
    if (snakeFrenzyTime > 0) {
      filter += (filter ? " " : "") + "hue-rotate(-80deg) saturate(2)";
    }

    for (const el of elements) {
      el.style.filter = filter;
    }
  }


  function setSnakeFrenzyVisual(active) {
    if (!snake) return;
    snake.isFrenzyVisual = active;
    applySnakeAppearance();
  }

  function updateBuffTimers(dt) {
    if (speedBuffTime   > 0) speedBuffTime   = Math.max(0, speedBuffTime   - dt);
    if (jumpBuffTime    > 0) jumpBuffTime    = Math.max(0, jumpBuffTime    - dt);
    if (frogShieldTime  > 0) frogShieldTime  = Math.max(0, frogShieldTime  - dt);
    if (orbMagnetTime   > 0) orbMagnetTime   = Math.max(0, orbMagnetTime   - dt);
    if (scoreMultiTime  > 0) scoreMultiTime  = Math.max(0, scoreMultiTime  - dt);
    if (panicHopTime    > 0) panicHopTime    = Math.max(0, panicHopTime    - dt);
    if (cloneSwarmTime  > 0) cloneSwarmTime  = Math.max(0, cloneSwarmTime  - dt);
    if (lifeStealTime   > 0) lifeStealTime   = Math.max(0, lifeStealTime   - dt);

    // Frenzy timer (not affected by snake resistance)
    if (snakeFrenzyTime > 0) {
      snakeFrenzyTime = Math.max(0, snakeFrenzyTime - dt);
      if (snakeFrenzyTime === 0) {
        setSnakeFrenzyVisual(false);
      }
    }

    const snakeResist = getSnakeResistance();
    const debuffTickMultiplier = 1 + snakeResist;

    if (snakeSlowTime    > 0) snakeSlowTime    = Math.max(0, snakeSlowTime    - dt * debuffTickMultiplier);
    if (snakeConfuseTime > 0) snakeConfuseTime = Math.max(0, snakeConfuseTime - dt * debuffTickMultiplier);
    if (snakeShrinkTime  > 0) snakeShrinkTime  = Math.max(0, snakeShrinkTime  - dt * debuffTickMultiplier);
    if (timeSlowTime     > 0) timeSlowTime     = Math.max(0, timeSlowTime     - dt * debuffTickMultiplier);
  }

  // --------------------------------------------------
  // FROG MOVEMENT (ORIGINAL FEEL)
  // --------------------------------------------------
  function chooseHopDestination(frog, width, height) {
    let targetX = frog.x;
    let targetBaseY = frog.baseY;

    const marginY = 24;
    const marginX = 8;

    const baseMaxStep = 40;
    const speedBuffed = (speedBuffTime > 0 || panicHopTime > 0) ? 1.7 : 1.0;
    const championBoost = frog.isChampion ? 1.4 : 1.0;
    const jumpFactor = getJumpFactor(frog);  // <-- add this line
    const maxStep = baseMaxStep * speedBuffed * championBoost * jumpFactor;

    let goalX = null;
    let goalY = null;

    if (mouse.follow && mouse.active && !frog.isGhost) {
      goalX = mouse.x - FROG_SIZE / 2;
      goalY = mouse.y - FROG_SIZE / 2;
    }

    // Ghost frogs + panic hop ignore mouse and dart randomly
    if (panicHopTime > 0 || frog.isGhost) {
      goalX = null;
      goalY = null;
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

          const baseDur = randRange(frog.hopDurMin, frog.hopDurMax);
          frog.hopDuration = baseDur * getSpeedFactor(frog);

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
          frog.hopHeight = hopHeight * getJumpFactor(frog);

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

          const baseIdle = randRange(frog.idleMin, frog.idleMax);
          frog.idleTime = baseIdle * getSpeedFactor(frog);

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

      // Clone Swarm visual
      if (cloneSwarmTime > 0) {
        if (!frog.cloneEl) {
          const cloneEl = frog.el.cloneNode(true);
          cloneEl.style.opacity = "0.35";
          cloneEl.style.filter = "brightness(1.3)";
          cloneEl.style.pointerEvents = "none";
          cloneEl.style.zIndex = "9";
          container.appendChild(cloneEl);
          frog.cloneEl = cloneEl;
        }
        const offset = 8;
        frog.cloneEl.style.transform =
          `translate3d(${frog.x + offset}px, ${frog.y - offset}px, 0)`;
      } else if (frog.cloneEl) {
        if (frog.cloneEl.parentNode === container) {
          container.removeChild(frog.cloneEl);
        }
        frog.cloneEl = null;
      }
    }
    // --- Cannibal Frogs --- //
    const cannibals = frogs.filter(f => f.isCannibal);
    if (cannibals.length > 0) {
      const eatRadius = FROG_SIZE * 0.6;
      const eatR2 = eatRadius * eatRadius;

      for (const cannibal of cannibals) {
        let victim = null;
        let bestD2 = Infinity;

        const cx = cannibal.x + FROG_SIZE / 2;
        const cy = cannibal.baseY + FROG_SIZE / 2;

        for (const candidate of frogs) {
          if (candidate === cannibal) continue;
          const fx = candidate.x + FROG_SIZE / 2;
          const fy = candidate.baseY + FROG_SIZE / 2;
          const dx = fx - cx;
          const dy = fy - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < eatR2 && d2 < bestD2) {
            bestD2 = d2;
            victim = candidate;
          }
        }
        if (victim) {
          // Chance to actually eat the frog (from config, default 10%)
          if (Math.random() < cannibalEatChance) {
            const idx = frogs.indexOf(victim);
            if (idx !== -1) {
              // Cannibal kill; uses deathrattle logic but no snake growth
              tryKillFrogAtIndex(idx, "cannibal");
            }
          }
        }
      }
    }

  }

  // --------------------------------------------------
  // ORBS
  // --------------------------------------------------
  const ORB_RADIUS  = 12;
  const ORB_TTL     = 24;
  const ORB_SPAWN_INTERVAL_MIN = 4;
  const ORB_SPAWN_INTERVAL_MAX = 9;

  function spawnOrbRandom(width, height) {
    if (frogs.length === 0) return;

    const marginX = 24;
    const marginY = 48;

    const x = marginX + Math.random() * (width - marginX * 2);
    const y = marginY + Math.random() * (height - marginY * 2);

    const types = [
      "speed",
      "jump",
      "spawn",
      "snakeSlow",
      "snakeConfuse",
      "snakeShrink",
      "frogShield",
      "orbMagnet",
      "megaSpawn",
      "scoreMulti",
      "panicHop",
      "lifeSteal",
      "permaFrog"
    ];
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

    // orb.gif in center
    el.style.backgroundImage = "url(https://freshfrogs.github.io/snake/images/orb.gif)";
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";

    if (type === "speed")      el.style.boxShadow = "0 0 14px #32ff9b";
    else if (type === "jump")  el.style.boxShadow = "0 0 14px #b857ff";
    else if (type === "spawn") el.style.boxShadow = "0 0 14px #ffe66b";
    else if (type === "snakeSlow")    el.style.boxShadow = "0 0 14px #ff6b6b";
    else if (type === "snakeConfuse") el.style.boxShadow = "0 0 14px #ff9ff3";
    else if (type === "snakeShrink")  el.style.boxShadow = "0 0 14px #74b9ff";
    else if (type === "frogShield")   el.style.boxShadow = "0 0 14px #55efc4";
    else if (type === "timeSlow")     el.style.boxShadow = "0 0 14px #ffeaa7";
    else if (type === "orbMagnet")    el.style.boxShadow = "0 0 14px #a29bfe";
    else if (type === "megaSpawn")    el.style.boxShadow = "0 0 14px #fd79a8";
    else if (type === "scoreMulti")   el.style.boxShadow = "0 0 14px #fdcb6e";
    else if (type === "panicHop")     el.style.boxShadow = "0 0 14px #fab1a0";
    else if (type === "lifeSteal")    el.style.boxShadow = "0 0 14px #00ff88";
    else if (type === "permaFrog")    el.style.boxShadow = "0 0 14px #ffd700";
    else                              el.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";

    container.appendChild(el);
    orbs.push({ type, x, y, ttl: ORB_TTL, el });

    totalOrbsSpawned++;

    playRandomOrbSpawnSound();
  }

  function updateOrbs(dt) {
    const MAGNET_RANGE = 220;
    const MAGNET_RANGE2 = MAGNET_RANGE * MAGNET_RANGE;

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

      // magnet logic
      const magnetFrogs = frogs.filter(f => f.isMagnet);
      if ((orbMagnetTime > 0 || magnetFrogs.length > 0) && frogs.length > 0) {
        let target = null;
        let bestD2 = Infinity;

        for (const mf of magnetFrogs) {
          const fx = mf.x + FROG_SIZE / 2;
          const fy = mf.baseY + FROG_SIZE / 2;
          const dx = fx - orb.x;
          const dy = fy - orb.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAGNET_RANGE2 && d2 < bestD2) {
            bestD2 = d2;
            target = { fx, fy };
          }
        }

        if (!target && orbMagnetTime > 0) {
          for (const frog of frogs) {
            const fx = frog.x + FROG_SIZE / 2;
            const fy = frog.baseY + FROG_SIZE / 2;
            const dx = fx - orb.x;
            const dy = fy - orb.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
              bestD2 = d2;
              target = { fx, fy };
            }
          }
        }

        if (target) {
          const dx = target.fx - orb.x;
          const dy = target.fy - orb.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pull = 80 * dt;
          orb.x += (dx / dist) * pull;
          orb.y += (dy / dist) * pull;
        }
      }

      const lifeT = orb.ttl / ORB_TTL;
      const bob   = Math.sin((1 - lifeT) * Math.PI * 2) * 3;
      const scale = 1 + 0.1 * Math.sin((1 - lifeT) * Math.PI * 4);

      const renderY = orb.y + bob;
      orb.el.style.transform =
        `translate3d(${orb.x - ORB_RADIUS}px, ${renderY - ORB_RADIUS}px, 0) scale(${scale})`;
      orb.el.style.opacity = String(Math.max(0, Math.min(1, lifeT + 0.2)));

      // collection
      const ocx = orb.x;
      const ocy = orb.y;

      let collectedBy = null;
      for (const frog of frogs) {
        const fx = frog.x + FROG_SIZE / 2;
        const fy = frog.baseY + FROG_SIZE / 2;
        const dx = fx - ocx;
        const dy = fy - ocy;
        const rad = FROG_SIZE / 2 + ORB_RADIUS;
        if (dx * dx + dy * dy <= rad * rad) {
          collectedBy = frog;
          break;
        }
      }

      if (collectedBy) {
        if (orb.type === "permaFrog") {
          grantRandomPermaFrogUpgrade(collectedBy);
        } else {
          applyBuff(orb.type, collectedBy);
        }

        // 🧪 Orb Specialist + Orb Collector + permanent lifesteal synergy
        let frogsToSpawnFromOrb = 0;

        // Orb Specialist: every orb always spawns 1 frog,
        // plus a 50% chance for a second frog.
        if (orbSpecialistActive) {
          frogsToSpawnFromOrb += 1; // guaranteed
          //if (Math.random() < 0.5) {
           // frogsToSpawnFromOrb += 1; // 50% extra
          //}
        }

        // Permanent lifesteal upgrade: next N orbs also spawn frogs.
        if (permaLifeStealOrbsRemaining > 0) {
          permaLifeStealOrbsRemaining -= 1;
          frogsToSpawnFromOrb += 1;
        }

        // Orb Collector: now adds an additional frog on top of the above.
        if (orbCollectorChance > 0 && Math.random() < orbCollectorChance) {
          frogsToSpawnFromOrb += 1;
        }

        if (frogsToSpawnFromOrb > 0) {
          spawnExtraFrogs(frogsToSpawnFromOrb);
        }

        if (orb.el && orb.el.parentNode === container) {
          container.removeChild(orb.el);
        }
        orbs.splice(i, 1);
      }

    }
  }

  // --------------------------------------------------
  // SNAKE
  // --------------------------------------------------
  function initSnake(width, height) {
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
    headEl.style.backgroundImage = "url(https://freshfrogs.github.io/snake/images/head.png)";
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
        ? "url(https://freshfrogs.github.io/snake/images/tail.png)"
        : "url(https://freshfrogs.github.io/snake/images/body.png)";
      container.appendChild(segEl);

      segments.push({ el: segEl, x: startX, y: startY });
    }

    const path = [];
    const maxPath = (SNAKE_INITIAL_SEGMENTS + 2) * SNAKE_SEGMENT_GAP + 2;
    for (let i = 0; i < maxPath; i++) {
      path.push({ x: startX, y: startY });
    }

    snake = {
      head: { el: headEl, x: startX, y: startY, angle: 0 },
      segments,
      path,
      isFrenzyVisual: false
    };
    // apply current stage color on fresh snake
    applySnakeAppearance();
  }

function growSnake(extraSegments) {
  if (!snake) return;
  extraSegments = extraSegments || 1;

  // 🔒 Do not grow beyond MAX_SNAKE_SEGMENTS
  const currentLen = snake.segments.length;
  const allowedExtra = Math.max(0, MAX_SNAKE_SEGMENTS - currentLen);
  if (allowedExtra <= 0) {
    return; // already at or above cap
  }

  extraSegments = Math.min(extraSegments, allowedExtra);

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
    segEl.style.backgroundImage = "url(https://freshfrogs.github.io/snake/images/body.png)";
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

  // ✅ Make sure new segments match current shed color / frenzy tint
  applySnakeAppearance();
}

function updateSnake(dt, width, height) {
  if (!snake) return;

  const marginX = 8;
  const marginY = 24;

  const head = snake.head;
  if (!head) return;

  const isMobile = window.matchMedia("(max-device-width: 768px)").matches;
  const segmentGap = isMobile ? 14 : SNAKE_SEGMENT_GAP;


  // -----------------------------
  // Targeting logic
  // -----------------------------
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

  let desiredAngle = head.angle;

  if (snakeConfuseTime > 0) {
    // confused: random-ish turning
    desiredAngle = head.angle + (Math.random() - 0.5) * Math.PI;
    targetFrog = null;
  } else if (targetFrog) {
    const fx = targetFrog.x + FROG_SIZE / 2;
    const fy = targetFrog.baseY + FROG_SIZE / 2;
    desiredAngle = Math.atan2(fy - head.y, fx - head.x);
  } else {
    // no frogs? just wander
    desiredAngle += (Math.random() - 0.5) * dt;
  }

  let angleDiff =
    ((desiredAngle - head.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const maxTurn = snakeTurnRate * dt;
  if (angleDiff > maxTurn) angleDiff = maxTurn;
  if (angleDiff < -maxTurn) angleDiff = -maxTurn;
  head.angle += angleDiff;

  const speedFactor = getSnakeSpeedFactor();
  const speed = SNAKE_BASE_SPEED * speedFactor * (0.8 + Math.random() * 0.4);
  head.x += Math.cos(head.angle) * speed * dt;
  head.y += Math.sin(head.angle) * speed * dt;

  // Keep inside bounds
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

  // -----------------------------
  // Path + segments follow
  // -----------------------------
  snake.path.unshift({ x: head.x, y: head.y });
  const maxPathLength = (snake.segments.length + 2) * segmentGap + 2;
  while (snake.path.length > maxPathLength) {
    snake.path.pop();
  }

  const shrinkScale = snakeShrinkTime > 0 ? 0.8 : 1.0;

  // 🔸 Head: fully rotate with movement
  head.el.style.transform =
    `translate3d(${head.x}px, ${head.y}px, 0) rotate(${head.angle}rad) scale(${shrinkScale})`;

  for (let i = 0; i < snake.segments.length; i++) {
    const seg = snake.segments[i];
    const idx = Math.min(
      snake.path.length - 1,
      (i + 1) * segmentGap
    );
    const p = snake.path[idx] || snake.path[snake.path.length - 1];

    const nextIdx = Math.max(0, idx - 2);
    const q = snake.path[nextIdx] || p;
    const angle = Math.atan2(p.y - q.y, p.x - q.x);

    seg.x = p.x;
    seg.y = p.y;

    seg.el.style.transform =
      `translate3d(${seg.x}px, ${seg.y}px, 0) rotate(${angle}rad) scale(${shrinkScale})`;
  }

  // -----------------------------
  // Collisions with frogs
  // -----------------------------
  const eatRadius = getSnakeEatRadius();
  const eatR2 = eatRadius * eatRadius;

  // ✅ Use the *center* of the head sprite as the bite point
  const headCx = head.x + SNAKE_SEGMENT_SIZE / 2;
  const headCy = head.y + SNAKE_SEGMENT_SIZE / 2;

  for (let i = frogs.length - 1; i >= 0; i--) {
    const frog = frogs[i];
    if (!frog || !frog.el) continue;

    const fx = frog.x + FROG_SIZE / 2;
    const fy = frog.baseY + FROG_SIZE / 2;
    const dx = fx - headCx;
    const dy = fy - headCy;
    const d2 = dx * dx + dy * dy;

    if (d2 <= eatR2) {
      // Shared kill logic (shields, zombies, deathrattle, sounds, cannibal tracking)
      const killed = tryKillFrogAtIndex(i, "snake");

      if (killed) {
        // Only grow one segment for every 2 frogs eaten
        frogsEatenCount++;
        if (frogsEatenCount % 2 === 0) {
          growSnake(1);
        }
      }
    }
  }
}

  // --------------------------------------------------
  // PERMANENT, EPIC & LEGENDARY UPGRADE OVERLAY
  // --------------------------------------------------
  let upgradeOverlay = null;
  let upgradeOverlayButtonsContainer = null;
  let upgradeOverlayTitleEl = null;
  let currentUpgradeOverlayMode = "normal"; // "normal" | "epic" | "legendary"
  let initialUpgradeDone = false;          // starting upgrade before timer
  let firstTimedNormalChoiceDone = false;  // first 1-minute panel


  // How-to-play overlay shown once before the very first buff choice
  let howToOverlay = null;
  let hasShownHowToOverlay = false;

  // Buff guide (READ ME) overlay
  let buffGuideOverlay = null;
  let buffGuideContentEl = null;
  let buffGuidePageLabel = null;
  let buffGuidePrevBtn = null;
  let buffGuideNextBtn = null;
  let buffGuidePage = 0;

function getEpicUpgradeChoices() {
  const neon = "#4defff";
  const epicTitleColor = "#ffb347"; // soft orange for EPIC titles
  const totalColor = TOTAL_HIGHLIGHT_COLOR;

  const deathPerPickPct = Math.round(EPIC_DEATHRATTLE_CHANCE * 100);
  const currentDRChance = frogDeathRattleChance;
  const nextDRChance    = Math.min(1, currentDRChance + EPIC_DEATHRATTLE_CHANCE);
  const drTotalPct      = Math.round(nextDRChance * 100);

  const epicBuffFactor  = BUFF_DURATION_UPGRADE_FACTOR + 0.25;
  const buffPerPickPct  = Math.round((epicBuffFactor - 1) * 100);
  const nextBuffFactor  = buffDurationFactor * epicBuffFactor;
  const buffTotalPct    = Math.round((nextBuffFactor - 1) * 100);

  const orbStormCount   = 10;
  const snakeEggBuffPct = 11; // +11% instead of +20%

  const upgrades = [];

  upgrades.push(
    {
      id: "epicSpawn50",
      label: `
        🐸 Spawn Frogs<br>
        Spawn <span style="color:${epicTitleColor};">${EPIC_SPAWN_AMOUNT}</span> frogs now
      `,
      apply: () => {
        spawnExtraFrogs(EPIC_SPAWN_AMOUNT);
      }
    },
    {
      id: "epicDeathRattle",
      label: `
        💀 Deathrattle<br>
        +<span style="color:${epicTitleColor};">${deathPerPickPct}%</span> deathrattle chance
      `,
      apply: () => {
        frogDeathRattleChance += EPIC_DEATHRATTLE_CHANCE;
      }
    },
    {
      id: "epicBuffDuration",
      label: `
        ⏳ Buffs extended<br>
        +<span style="color:${epicTitleColor};">${buffPerPickPct}%</span> buff duration
      `,
      apply: () => {
        buffDurationFactor *= epicBuffFactor;
      }
    },
    /* Cannibal Frog
    {
      id: "epicCannibalFrog",
      label: `
        🦴 Cannibal Frog<br>
        Spawn a <span style="color:${neon};">Cannibal</span> frog with<br>
        +<span style="color:${neon};">5%</span> deathrattle chance<br>
        +<span style="color:${neon};">5%</span> overall stats<br>
        • Eats nearby frogs that get in its way
      `,
      apply: () => {
        spawnCannibalFrog();
      }
    },*/
    // ORB STORM
    {
      id: "epicOrbStorm",
      label: `
        🌩️ Orb Storm<br>
        Drop <span style="color:${epicTitleColor};">${ORB_STORM_COUNT}</span> random orbs right now
      `,
      apply: () => {
        const width  = window.innerWidth;
        const height = window.innerHeight;
        for (let i = 0; i < orbStormCount; i++) {
          spawnOrbRandom(width, height);
        }
      }
    },
    // SNAKE EGG
    {
      id: "snakeEgg",
      label: `
        🥚 Snake Egg<br>
        The <span style="color:${epicTitleColor};">next shed</span> only gives the new snake
        <span style="color:${epicTitleColor};">+${snakeEggBuffPct}%</span> speed instead of +20%
      `,
      apply: () => {
        snakeEggPending = true;
      }
    },
    {
      id: "frogPromotion",
      label: `
        🐸⭐ Frog Promotion<br>
        Summon <span style="color:${epicTitleColor};">10</span> frogs,<br>
        each with a random permanent role
      `,
      apply: () => {
        spawnFrogPromotion(10);
      }
    }
  );

  // 🔹 NEW EPIC: Grave Wave (only once)
  if (!graveWaveActive) {
    upgrades.push({
      id: "graveWave",
      label: `
        👻 Grave Wave<br>
        Each shed summons <span style="color:${epicTitleColor};">10–20</span> uncontrollable ghost frogs
      `,
      apply: () => {
        graveWaveActive = true;
      }
    });
  }

  // 🧪 Orb Specialist – orbs always spawn at least one frog
  if (!orbSpecialistActive) {
    upgrades.push({
      id: "epicOrbSpecialist",
      label:
        `🧪 Orb specialist<br>
        Orbs always spawn <span style="color:${epicTitleColor};">1</span> frog. Orb Collector chance rolls for extra frogs.
        `,
      apply: () => {
        orbSpecialistActive = true;
      },
    });
  }

  /* 🔹 NEW EPIC: Frog Eat Frog (only once)
  if (!frogEatFrogActive) {
    upgrades.push({
      id: "frogEatFrog",
      label: `
        🍖 Frog Eat Frog<br>
        Frogs sometimes <span style="color:${epicTitleColor};">eat each other;</span> respawns gain random roles
      `,
      apply: () => {
        frogEatFrogActive = true;
      }
    });
  }*/

  return upgrades;
}


function getUpgradeChoices() {
  const neon = "#4defff";

  // per-pick effects
  const speedPerPickPct     = Math.round((1 - FROG_SPEED_UPGRADE_FACTOR) * 100);
  const jumpPerPickPct      = Math.round((FROG_JUMP_UPGRADE_FACTOR - 1) * 100);
  const buffPerPickPct      = Math.round((BUFF_DURATION_UPGRADE_FACTOR - 1) * 100);
  const orbFasterPerPickPct = Math.round((1 - ORB_INTERVAL_UPGRADE_FACTOR) * 100);
  const deathPerPickPct     = Math.round(COMMON_DEATHRATTLE_CHANCE * 100);
  const orbPerPickPct       = Math.round(ORB_COLLECTOR_CHANCE * 100);

  const lastStandPct = Math.round(LAST_STAND_MIN_CHANCE * 100);

  const upgrades = [];

  // Frogs hop faster (capped)
  if (frogPermanentSpeedFactor > MIN_FROG_SPEED_FACTOR + 1e-4) {
    upgrades.push({
      id: "frogSpeed",
      label: `
        💨 Quicker Hops<br>
        Frogs hop ~<span style="color:${neon};">${speedPerPickPct}%</span> faster (stacks)
      `,
      apply: () => {
        frogPermanentSpeedFactor *= FROG_SPEED_UPGRADE_FACTOR;
        if (frogPermanentSpeedFactor < MIN_FROG_SPEED_FACTOR) {
          frogPermanentSpeedFactor = MIN_FROG_SPEED_FACTOR;
        }
      }
    });
  }

  // Frogs jump higher (capped)
  if (frogPermanentJumpFactor < MAX_FROG_JUMP_FACTOR - 1e-4) {
    upgrades.push({
      id: "frogJump",
      label: `
        🦘Higher Hops<br>
        +<span style="color:${neon};">${jumpPerPickPct}%</span> jump height (stacks)
      `,
      apply: () => {
        frogPermanentJumpFactor *= FROG_JUMP_UPGRADE_FACTOR;
        if (frogPermanentJumpFactor > MAX_FROG_JUMP_FACTOR) {
          frogPermanentJumpFactor = MAX_FROG_JUMP_FACTOR;
        }
      }
    });
  }

  // Spawn frogs (always allowed)
  upgrades.push({
    id: "spawn20",
    label: `
        🐸 Spawn frogs<br>
        <span style="color:${neon};">${NORMAL_SPAWN_AMOUNT}</span> frogs right now
      `,
    apply: () => {
      spawnExtraFrogs(NORMAL_SPAWN_AMOUNT);
    }
  });

  // Buff duration (capped)
  if (buffDurationFactor < MAX_BUFF_DURATION_FACTOR - 1e-4) {
    upgrades.push({
      id: "buffDuration",
      label: `
        ⏳ Buffs last longer<br>
        +<span style="color:${neon};">${buffPerPickPct}%</span> buff duration (stacks)
      `,
      apply: () => {
        buffDurationFactor *= BUFF_DURATION_UPGRADE_FACTOR;
        if (buffDurationFactor > MAX_BUFF_DURATION_FACTOR) {
          buffDurationFactor = MAX_BUFF_DURATION_FACTOR;
        }
      }
    });
  }

  // Orb spawn interval (capped)
  if (orbSpawnIntervalFactor > MIN_ORB_SPAWN_INTERVAL_FACTOR + 1e-4) {
    upgrades.push({
      id: "moreOrbs",
      label: `
        🎯 More orbs over time<br>
        ~<span style="color:${neon};">${orbFasterPerPickPct}%</span> faster orb spawns (stacks)
      `,
      apply: () => {
        orbSpawnIntervalFactor *= ORB_INTERVAL_UPGRADE_FACTOR;
        if (orbSpawnIntervalFactor < MIN_ORB_SPAWN_INTERVAL_FACTOR) {
          orbSpawnIntervalFactor = MIN_ORB_SPAWN_INTERVAL_FACTOR;
        }
      }
    });
  }

  // Global deathrattle (capped)
  if (frogDeathRattleChance < MAX_DEATHRATTLE_CHANCE - 1e-4) {
    upgrades.push({
      id: "commonDeathRattle",
      label: `
        💀 Deathrattle<br>
        +<span style="color:${neon};">${deathPerPickPct}%</span> chance that dead frogs respawn (stacks)
      `,
      apply: () => {
        frogDeathRattleChance = Math.min(
          MAX_DEATHRATTLE_CHANCE,
          frogDeathRattleChance + COMMON_DEATHRATTLE_CHANCE
        );
      }
    });
  }

  // Orb Collector (capped) – ONLY if Orb Specialist is NOT active
  if (
    //!orbSpecialistActive &&
    orbCollectorChance < MAX_ORB_COLLECTOR_TOTAL - 1e-4
  ) {
    upgrades.push({
      id: "orbCollector",
      label: `
        🌌 Orb Collector<br>
        Every orb gains +<span style="color:${neon};">${orbPerPickPct}%</span> chance to spawn a frog (stacks)
      `,
      apply: () => {
        orbCollectorActive = true;
        orbCollectorChance = Math.min(
          MAX_ORB_COLLECTOR_TOTAL,
          orbCollectorChance + ORB_COLLECTOR_CHANCE
        );
      }
    });
  }

  // Last Stand – only once
  if (!lastStandActive) {
    upgrades.push({
      id: "lastStand",
      label: `
        🏹 Last Stand<br>
        Your <span style="color:${neon};">last frog</span> has
        at least <span style="color:${neon};">${lastStandPct}%</span> chance to respawn instead of dying
      `,
      apply: () => {
        lastStandActive = true;
      }
    });
  }

  return upgrades;
}

  // LEGENDARY choices at 10 minutes (placeholders, TODO)
function getLegendaryUpgradeChoices() {
  const neon = "#4defff";
  const deathPct = Math.round(LEGENDARY_DEATHRATTLE_CHANCE * 100);

  return [
    {
      id: "legendaryBuffDuration",
      label: `
        ⏳⏳ LEGENDARY buff surge<br>
        All buff durations ×<span style="color:${neon};">${LEGENDARY_BUFF_DURATION_FACTOR.toFixed(1)}</span>
      `,
      apply: () => {
        buffDurationFactor *= LEGENDARY_BUFF_DURATION_FACTOR;
      }
    },
    {
      id: "legendarySpawn75",
      label: `
        🐸🌊🌊 LEGENDARY frog wave<br>
        Spawn <span style="color:${neon};">${LEGENDARY_SPAWN_AMOUNT}</span> frogs now
      `,
      apply: () => {
        spawnExtraFrogs(LEGENDARY_SPAWN_AMOUNT);
      }
    },
    {
      id: "legendaryDeathRattle",
      label: `
        💀💀 LEGENDARY deathrattle<br>
        <span style="color:${neon};">${deathPct}%</span> chance a dead frog respawns
      `,
      apply: () => {
        frogDeathRattleChance += LEGENDARY_DEATHRATTLE_CHANCE;
      }
    }
  ];
}


function ensureHowToOverlay() {
  if (howToOverlay) return;

  howToOverlay = document.createElement("div");
  howToOverlay.className = "frog-howto-overlay";

  howToOverlay.style.position = "absolute";
  howToOverlay.style.inset = "0";
  howToOverlay.style.background = "rgba(0,0,0,0.7)";
  howToOverlay.style.display = "none";
  howToOverlay.style.zIndex = "160";
  howToOverlay.style.alignItems = "center";
  howToOverlay.style.justifyContent = "center";
  howToOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "18px 22px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "left";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "420px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  const title = document.createElement("div");
  title.textContent = "escape the snake 🐍";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "4px";

  const subtitle = document.createElement("div");
  subtitle.textContent = "-- How to Play --";
  subtitle.style.marginBottom = "10px";
  subtitle.style.fontSize = "13px";
  subtitle.style.opacity = "0.9";

  const list = document.createElement("ul");
  list.style.paddingLeft = "18px";
  list.style.margin = "0 0 14px 0";
  list.style.fontSize = "13px";
  list.style.lineHeight = "1.4";

  [
    "Avoid the snake and stay alive as long as possible!",
    "Collect orbs to gain buffs and upgrades.",
    "Beat the high score to get on the leaderboard.",
    "Control frogs with your mouse."
  ].forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });

  // Buttons row: Start & Learn more
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "space-between";
  btnRow.style.gap = "8px";
  btnRow.style.marginTop = "4px";

  const startBtn = document.createElement("button");
  startBtn.textContent = "Start & choose buff";
  startBtn.style.fontFamily = "monospace";
  startBtn.style.fontSize = "13px";
  startBtn.style.padding = "6px 10px";
  startBtn.style.borderRadius = "6px";
  startBtn.style.border = "1px solid #555";
  startBtn.style.background = "#222";
  startBtn.style.color = "#fff";
  startBtn.style.cursor = "pointer";
  startBtn.style.flex = "1";
  startBtn.onmouseenter = () => { startBtn.style.background = "#333"; };
  startBtn.onmouseleave = () => { startBtn.style.background = "#222"; };
  startBtn.onclick = () => {
    playButtonClick();
    hasShownHowToOverlay = true;
    if (howToOverlay) {
      howToOverlay.style.display = "none";
    }
    openUpgradeOverlay("normal");
  };

  const learnBtn = document.createElement("button");
  learnBtn.textContent = "Learn buffs 📖";
  learnBtn.style.fontFamily = "monospace";
  learnBtn.style.fontSize = "13px";
  learnBtn.style.padding = "6px 10px";
  learnBtn.style.borderRadius = "6px";
  learnBtn.style.border = "1px solid #555";
  learnBtn.style.background = "#222";
  learnBtn.style.color = "#fff";
  learnBtn.style.cursor = "pointer";
  learnBtn.style.flex = "0 0 auto";
  learnBtn.onmouseenter = () => { learnBtn.style.background = "#333"; };
  learnBtn.onmouseleave = () => { learnBtn.style.background = "#222"; };
  learnBtn.onclick = () => {
    playButtonClick();
    ensureBuffGuideOverlay();
    openBuffGuideOverlay();
  };

  btnRow.appendChild(startBtn);
  btnRow.appendChild(learnBtn);

  panel.appendChild(title);
  panel.appendChild(subtitle);
  panel.appendChild(list);
  panel.appendChild(btnRow);

  howToOverlay.appendChild(panel);
  container.appendChild(howToOverlay);
}

function openHowToOverlay() {
  ensureHowToOverlay();
  gamePaused = true;
  if (howToOverlay) {
    howToOverlay.style.display = "flex";
  }
}


function ensureInfoOverlay() {
  if (infoOverlay) return;

  infoOverlay = document.createElement("div");
  infoOverlay.className = "frog-info-overlay";
  infoOverlay.style.position = "absolute";
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
  panel.style.maxWidth = "480px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = "escape the snake 🐍 – info";
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

  // Footer nav row
  const navRow = document.createElement("div");
  navRow.style.display = "flex";
  navRow.style.justifyContent = "space-between";
  navRow.style.alignItems = "center";
  navRow.style.marginTop = "10px";

  const leftBtns = document.createElement("div");
  leftBtns.style.display = "flex";
  leftBtns.style.gap = "6px";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ Prev";
  prevBtn.style.fontFamily = "monospace";
  prevBtn.style.fontSize = "12px";
  prevBtn.style.padding = "4px 8px";
  prevBtn.style.borderRadius = "6px";
  prevBtn.style.border = "1px solid #555";
  prevBtn.style.background = "#222";
  prevBtn.style.color = "#fff";
  prevBtn.style.cursor = "pointer";
  prevBtn.onmouseenter = () => { prevBtn.style.background = "#333"; };
  prevBtn.onmouseleave = () => { prevBtn.style.background = "#222"; };
    prevBtn.onclick = () => {
    playButtonClick();
    setInfoPage(infoPage - 1);
  };
  infoPrevBtn = prevBtn;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ▶";
  nextBtn.style.fontFamily = "monospace";
  nextBtn.style.fontSize = "12px";
  nextBtn.style.padding = "4px 8px";
  nextBtn.style.borderRadius = "6px";
  nextBtn.style.border = "1px solid #555";
  nextBtn.style.background = "#222";
  nextBtn.style.color = "#fff";
  nextBtn.style.cursor = "pointer";
  nextBtn.onmouseenter = () => { nextBtn.style.background = "#333"; };
  nextBtn.onmouseleave = () => { nextBtn.style.background = "#222"; };
    nextBtn.onclick = () => {
    playButtonClick();
    setInfoPage(infoPage + 1);
  };
  infoNextBtn = nextBtn;

  leftBtns.appendChild(prevBtn);
  leftBtns.appendChild(nextBtn);

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
  closeBtn.onclick = () => {
    playButtonClick();
    closeInfoOverlay();
  };

  navRow.appendChild(leftBtns);
  navRow.appendChild(closeBtn);

  panel.appendChild(headerRow);
  panel.appendChild(content);
  panel.appendChild(navRow);

  infoOverlay.appendChild(panel);
  container.appendChild(infoOverlay);

  // clicking dark background closes the panel
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      closeInfoOverlay();
    }
  });

  // start on page 0 (leaderboard)
  setInfoPage(0);
}

function setInfoPage(pageIndex) {
  if (!infoContentEl || !infoPageLabel) return;
  const neon = "#4defff";

  const maxPage = 4; // 0..4: 5 total pages
  infoPage = Math.max(0, Math.min(maxPage, pageIndex));

  let html = "";

  if (infoPage === 0) {
    // PAGE 0 – Leaderboard
    html += "<b>🏆 Leaderboard</b><br><br>";
    const list = infoLeaderboardData || [];
    if (!list.length) {
      html += "<div>No scores yet — be the first to escape the snake.</div>";
    } else {
      html += "<table style='width:100%; border-collapse:collapse; font-size:12px;'>";
      html += "<tr><th style='text-align:left;'>#</th><th style='text-align:left;'>Tag</th><th style='text-align:right;'>Score</th><th style='text-align:right;'>Time</th></tr>";
      list.slice(0, 20).forEach((entry, i) => {
        const rank = i + 1;
        const tagBase = entry.tag || entry.name || `Player ${rank}`;

        // ✅ Use bestScore / bestTime if score/time aren’t present
        const rawScore =
          typeof entry.score === "number"
            ? entry.score
            : typeof entry.bestScore === "number"
              ? entry.bestScore
              : null;

        const scoreStr = rawScore == null ? "—" : Math.floor(rawScore);

        const secs =
          typeof entry.time === "number"
            ? entry.time
            : typeof entry.bestTime === "number"
              ? entry.bestTime
              : 0;

        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        const tStr = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        // ✅ Highlight "me" (same flag used by the game-over overlay)
        const isMe = !!entry.isMe;
        const rowStyle = isMe
          ? " style='background:rgba(255,215,0,0.18);color:#ffd700;'"
          : "";

        const tag =
          isMe
            ? `${tagBase} <span style="font-size:10px;opacity:0.9;">(you)</span>`
            : tagBase;

        html += `
          <tr${rowStyle}>
            <td>${rank}</td>
            <td>${tag}</td>
            <td style="text-align:right;">${scoreStr}</td>
            <td style="text-align:right;">${tStr}</td>
          </tr>
        `;
      });
      html += "</table>";
      html += `<div style="margin-top:6px; font-size:11px; opacity:0.8;">
        Beat your own best score to update your entry.
      </div>`;
    }
  } else if (infoPage === 1) {
    // PAGE 1 – How to Play
    html = `
<b>🐍 How to Play</b><br><br>
• Avoid the snake and keep the frogs alive as long as possible.<br>
• Frogs hop around the screen. Move your mouse to guide the swarm.<br>
• Collect orbs to trigger buffs and upgrades.<br>
• Every minute you choose a <span style="color:${neon};">common</span> upgrade.<br>
• Every 3 minutes you get a <span style="color:${neon};">common + epic</span> upgrade chain.<br>
• Every 5 minutes the snake sheds, gets stronger, and changes color.<br>
• Your run ends when <span style="color:${neon};">all frogs are gone</span>.
`;
  } else if (infoPage === 2) {
    // PAGE 2 – Orb buffs
    html = `
<b>🟢 Orb Buffs</b><br><br>
⚡ <b>Speed</b> – frogs act faster for a short time (stacks with upgrades).<br>
🦘 <b>Jump</b> – frogs jump much higher for a short time.<br>
🐸➕ <b>Spawn</b> – instantly spawns extra frogs (more if the collector is Lucky).<br>
🧊 <b>Snake Slow</b> – snake moves slower for a few seconds (less effective as it grows).<br>
🤪 <b>Confuse</b> – snake turns randomly instead of targeting frogs.<br>
📏 <b>Shrink</b> – snake body and bite radius shrink temporarily.<br>
🛡️ <b>Team Shield</b> – all frogs ignore snake hits for a short duration.<br>
⏱️ <b>Time Slow</b> – slows the whole game (and the snake) briefly.<br>
🧲 <b>Orb Magnet</b> – orbs drift toward frogs, preferring magnet frogs.<br>
🐸🌊 <b>Mega Spawn</b> – large wave of frogs appears at once.<br>
💰 <b>Score ×2</b> – score gain is multiplied for a short window.<br>
😱 <b>Panic Hop</b> – frogs hop faster but in random directions.<br>
🩺 <b>Lifeline</b> – frogs that die during the buff have a chance to instantly respawn.<br>
⭐ <b>PermaFrog</b> – upgrades one frog with a permanent role (Champion, Aura, Magnet, Lucky, Zombie, etc.).
`;
  } else if (infoPage === 3) {
    // PAGE 3 – Permanent frog roles
    html = `
<b>🐸 Permanent Frog Roles</b><br><br>
🏅 <b>Champion</b> – that frog's hop cycle is faster and jumps are higher.<br>
🌈 <b>Aura</b> – nearby frogs get bonus speed and jump height in a radius around this frog.<br>
🧲 <b>Magnet</b> – orbs in a radius are strongly pulled toward this frog.<br>
🍀 <b>Lucky</b> – buffs last longer, more frogs spawn from some effects, and score gain is boosted slightly per Lucky frog.<br>
🧟 <b>Zombie</b> – when this frog dies, it causes extra chaos (like extra frogs and snake debuffs).<br><br>
Perma roles stack with global upgrades and orb buffs, making some frogs into mini “heroes” of the swarm.
`;
  } else if (infoPage === 4) {
    // PAGE 4 – Global upgrades
    html = `
<b>🏗️ Global Upgrades</b><br><br>
⏩ <b>Frogs hop faster forever</b> – reduces the hop cycle, making the whole swarm act more often.<br>
🦘⬆️ <b>Frogs jump higher forever</b> – increases base jump height for all frogs.<br>
🐸💥 <b>Spawn frogs</b> – instant injections of frogs from common / epic menus.<br>
⏳ <b>Buffs last longer</b> – multiplies the duration of all temporary buffs (orb effects).<br>
🎯 <b>More orbs</b> – orbs spawn more frequently over time.<br>
💀 <b>Deathrattle</b> – dead frogs have a chance to respawn immediately (common and epic versions stack).<br>
🏹 <b>Last Stand</b> – your final remaining frog has a strong chance to respawn instead of dying.<br>
🌌 <b>Orb Collector</b> – every collected orb has a flat chance to spawn an extra frog (one-time pick).<br>
🐸⭐ <b>Frog Promotion (epic)</b> – summons multiple frogs, each with a random permanent role.<br>
🍖 <b>Cannibal Frog (epic)</b> – spawns a cannibal frog that eats nearby frogs and buffs global deathrattle while alive.<br>
💫 <b>Orb Storm / Snake Egg (epic)</b> – high-impact utilities that affect orb spawns or the next snake after a shed.<br><br>
Synergize permanent upgrades, frog roles, and epic choices to keep the swarm alive deep into later sheds.
`;
  }

  infoContentEl.innerHTML = html;
  infoPageLabel.textContent = `Page ${infoPage + 1} / 5`;

  if (infoPrevBtn) {
    infoPrevBtn.disabled = (infoPage === 0);
    infoPrevBtn.style.opacity = infoPage === 0 ? "0.5" : "1";
  }
  if (infoNextBtn) {
    infoNextBtn.disabled = (infoPage === maxPage);
    infoNextBtn.style.opacity = infoNextBtn.disabled ? "0.5" : "1";
  }
}

function openInfoOverlay(startPage) {
  ensureInfoOverlay();
  gamePaused = true;
  if (typeof startPage === "number") {
    setInfoPage(startPage);
  } else {
    setInfoPage(infoPage);
  }
  if (infoOverlay) {
    infoOverlay.style.display = "flex";
  }
}

function closeInfoOverlay() {
  if (infoOverlay) {
    infoOverlay.style.display = "none";
  }
  gamePaused = false;
}


function ensureBuffGuideOverlay() {
  if (buffGuideOverlay) return;

  buffGuideOverlay = document.createElement("div");
  buffGuideOverlay.className = "frog-buff-guide-overlay";
  buffGuideOverlay.style.position = "absolute";
  buffGuideOverlay.style.inset = "0";
  buffGuideOverlay.style.background = "rgba(0,0,0,0.75)";
  buffGuideOverlay.style.display = "none";
  buffGuideOverlay.style.zIndex = "170";
  buffGuideOverlay.style.alignItems = "center";
  buffGuideOverlay.style.justifyContent = "center";
  buffGuideOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "16px 20px 12px 20px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "left";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "440px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = "Buffs & upgrades";
  title.style.fontSize = "14px";
  title.style.fontWeight = "bold";

  const pageLabel = document.createElement("div");
  pageLabel.style.fontSize = "11px";
  pageLabel.style.opacity = "0.8";
  buffGuidePageLabel = pageLabel;

  headerRow.appendChild(title);
  headerRow.appendChild(pageLabel);

  const content = document.createElement("div");
  content.style.fontSize = "13px";
  content.style.marginTop = "4px";
  content.style.lineHeight = "1.4";
  buffGuideContentEl = content;

  const navRow = document.createElement("div");
  navRow.style.display = "flex";
  navRow.style.justifyContent = "space-between";
  navRow.style.alignItems = "center";
  navRow.style.marginTop = "10px";

  const leftBtns = document.createElement("div");
  leftBtns.style.display = "flex";
  leftBtns.style.gap = "6px";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ Prev";
  prevBtn.style.fontFamily = "monospace";
  prevBtn.style.fontSize = "12px";
  prevBtn.style.padding = "4px 8px";
  prevBtn.style.borderRadius = "6px";
  prevBtn.style.border = "1px solid #555";
  prevBtn.style.background = "#222";
  prevBtn.style.color = "#fff";
  prevBtn.style.cursor = "pointer";
  prevBtn.onmouseenter = () => { prevBtn.style.background = "#333"; };
  prevBtn.onmouseleave = () => { prevBtn.style.background = "#222"; };
  prevBtn.onclick = () => {
    playButtonClick();
    setBuffGuidePage(buffGuidePage - 1);
  };
  buffGuidePrevBtn = prevBtn;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ▶";
  nextBtn.style.fontFamily = "monospace";
  nextBtn.style.fontSize = "12px";
  nextBtn.style.padding = "4px 8px";
  nextBtn.style.borderRadius = "6px";
  nextBtn.style.border = "1px solid #555";
  nextBtn.style.background = "#222";
  nextBtn.style.color = "#fff";
  nextBtn.style.cursor = "pointer";
  nextBtn.onmouseenter = () => { nextBtn.style.background = "#333"; };
  nextBtn.onmouseleave = () => { nextBtn.style.background = "#222"; };
  nextBtn.onclick = () => {
    playButtonClick();
    setBuffGuidePage(buffGuidePage + 1);
  };
  buffGuideNextBtn = nextBtn;

  leftBtns.appendChild(prevBtn);
  leftBtns.appendChild(nextBtn);

  const backBtn = document.createElement("button");
  backBtn.textContent = "Close ×";
  backBtn.style.fontFamily = "monospace";
  backBtn.style.fontSize = "12px";
  backBtn.style.padding = "4px 8px";
  backBtn.style.borderRadius = "6px";
  backBtn.style.border = "1px solid #555";
  backBtn.style.background = "#222";
  backBtn.style.color = "#fff";
  backBtn.style.cursor = "pointer";
  backBtn.onmouseenter = () => { backBtn.style.background = "#333"; };
  backBtn.onmouseleave = () => { backBtn.style.background = "#222"; };
  backBtn.onclick = () => {
    playButtonClick();
    closeBuffGuideOverlay();
  };

  navRow.appendChild(leftBtns);
  navRow.appendChild(backBtn);

  panel.appendChild(headerRow);
  panel.appendChild(content);
  panel.appendChild(navRow);

  buffGuideOverlay.appendChild(panel);
  container.appendChild(buffGuideOverlay);

  // clicking the dim background also closes it
  buffGuideOverlay.addEventListener("click", (e) => {
    if (e.target === buffGuideOverlay) {
      closeBuffGuideOverlay();
    }
  });

  // start on page 0
  setBuffGuidePage(0);
}

function setBuffGuidePage(pageIndex) {
  if (!buffGuideContentEl || !buffGuidePageLabel) return;

  const neon = "#4defff";

  // --- local helpers that safely use constants or fall back ---

  function secFromConst(constVal, fallback) {
    const v = (typeof constVal !== "undefined" ? constVal : fallback);
    return Math.max(0, Math.round(v)) + "s";
  }

  function percentFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    return Math.round(v * 100) + "%";
  }

  function multFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    return v.toFixed(1) + "×";
  }

  function percentFromBonus(b, fallback) {
    const v = (typeof b !== "undefined" ? b : fallback);
    return Math.round(v * 100) + "%";
  }

  // how much faster vs factor (e.g. 0.85 → ~15% faster)
  function fasterPercentFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    const pct = (1 - v) * 100;
    return Math.round(pct) + "%";
  }

  function minsFromSeconds(secVal, fallback) {
    const v = (typeof secVal !== "undefined" ? secVal : fallback);
    return Math.max(0, Math.round(v / 60)) + "m";
  }

  // radius from AURA_RADIUS2 if present
  const auraRadiusPx = (typeof AURA_RADIUS2 !== "undefined")
    ? Math.round(Math.sqrt(AURA_RADIUS2))
    : 200;

  // --- resolve constants / defaults we care about ---

  // Orb / timed buffs
  const speedDur       = (typeof SPEED_BUFF_DURATION       !== "undefined" ? SPEED_BUFF_DURATION       : 10);
  const jumpDur        = (typeof JUMP_BUFF_DURATION        !== "undefined" ? JUMP_BUFF_DURATION        : 10);
  const slowDur        = (typeof SNAKE_SLOW_DURATION       !== "undefined" ? SNAKE_SLOW_DURATION       : 10);
  const confuseDur     = (typeof SNAKE_CONFUSE_DURATION    !== "undefined" ? SNAKE_CONFUSE_DURATION    : 10);
  const shrinkDur      = (typeof SNAKE_SHRINK_DURATION     !== "undefined" ? SNAKE_SHRINK_DURATION     : 10);
  const shieldDur      = (typeof FROG_SHIELD_DURATION      !== "undefined" ? FROG_SHIELD_DURATION      : 10);
  const timeSlowDur    = (typeof TIME_SLOW_DURATION        !== "undefined" ? TIME_SLOW_DURATION        : 10);
  const orbMagDur      = (typeof ORB_MAGNET_DURATION       !== "undefined" ? ORB_MAGNET_DURATION       : 10);
  const scoreDur       = (typeof SCORE_MULTI_DURATION      !== "undefined" ? SCORE_MULTI_DURATION      : 20);
  const panicDur       = (typeof PANIC_HOP_DURATION        !== "undefined" ? PANIC_HOP_DURATION        : 7);
  const lifeStealDur   = (typeof LIFE_STEAL_DURATION       !== "undefined" ? LIFE_STEAL_DURATION       : 10);
  const lifelineDur    = (typeof LIFELINE_DURATION         !== "undefined" ? LIFELINE_DURATION         : 10);
  const frenzyDur      = (typeof LEGENDARY_FRENZY_DURATION !== "undefined" ? LEGENDARY_FRENZY_DURATION : 13);

  const jumpBuffFactor = (typeof JUMP_BUFF_FACTOR          !== "undefined" ? JUMP_BUFF_FACTOR          : 3.0);
  const snakeSlowFact  = (typeof SNAKE_SLOW_FACTOR         !== "undefined" ? SNAKE_SLOW_FACTOR         : 0.6);
  const timeSlowFact   = (typeof TIME_SLOW_FACTOR          !== "undefined" ? TIME_SLOW_FACTOR          : 0.5);
  const scoreMultiFact = (typeof SCORE_MULTI_FACTOR        !== "undefined" ? SCORE_MULTI_FACTOR        : 2.0);
  const panicSpeedFact = (typeof PANIC_HOP_SPEED_FACTOR    !== "undefined" ? PANIC_HOP_SPEED_FACTOR    : 0.6);
  const lifeStealFact  = (typeof LIFE_STEAL_FACTOR         !== "undefined" ? LIFE_STEAL_FACTOR         : 0.5);
  const frenzySpeedFact= (typeof FRENZY_SPEED_FACTOR       !== "undefined" ? FRENZY_SPEED_FACTOR       : 1.25);
  const frenzyJumpFact = (typeof FRENZY_JUMP_FACTOR        !== "undefined" ? FRENZY_JUMP_FACTOR        : 1.25);

  // Spawn amounts
  const normalSpawnAmt = (typeof NORMAL_SPAWN_AMOUNT       !== "undefined" ? NORMAL_SPAWN_AMOUNT       : 20);
  const epicSpawnAmt   = (typeof EPIC_SPAWN_AMOUNT         !== "undefined" ? EPIC_SPAWN_AMOUNT         : 30);
  const megaSpawnMin   = (typeof MEGA_SPAWN_MIN            !== "undefined" ? MEGA_SPAWN_MIN            : 15);
  const megaSpawnMax   = (typeof MEGA_SPAWN_MAX            !== "undefined" ? MEGA_SPAWN_MAX            : 25);

  // Permanent roles
  const champSpeedFact = (typeof CHAMPION_SPEED_FACTOR     !== "undefined" ? CHAMPION_SPEED_FACTOR     : 0.75);
  const champJumpFact  = (typeof CHAMPION_JUMP_FACTOR      !== "undefined" ? CHAMPION_JUMP_FACTOR      : 1.35);
  const auraJumpFact   = (typeof AURA_JUMP_FACTOR          !== "undefined" ? AURA_JUMP_FACTOR          : 1.25);
  const luckyDurBoost  = (typeof LUCKY_BUFF_DURATION_BOOST !== "undefined" ? LUCKY_BUFF_DURATION_BOOST : 1.5);
  const luckyScorePer  = (typeof LUCKY_SCORE_BONUS_PER     !== "undefined" ? LUCKY_SCORE_BONUS_PER     : 0.15);
  const zombieSpawnOnDeath = (typeof ZOMBIE_SPAWN_ON_DEATH !== "undefined" ? ZOMBIE_SPAWN_ON_DEATH    : 5);
  const cannibalDeathBonus = (typeof CANNIBAL_DEATHRATTLE_BONUS !== "undefined" ? CANNIBAL_DEATHRATTLE_BONUS : 0.05);
  const cannibalEatChance  = (typeof CANNIBAL_EAT_CHANCE        !== "undefined" ? CANNIBAL_EAT_CHANCE        : 0.10);

// upgrade factors (safe fallbacks)


  // upgrade factors (safe fallbacks)
  const frogSpeedUp    = (typeof FROG_SPEED_UPGRADE_FACTOR    !== "undefined" ? FROG_SPEED_UPGRADE_FACTOR    : 0.90);
  const frogJumpUp     = (typeof FROG_JUMP_UPGRADE_FACTOR     !== "undefined" ? FROG_JUMP_UPGRADE_FACTOR     : 1.30);
  const buffDurUp      = (typeof BUFF_DURATION_UPGRADE_FACTOR !== "undefined" ? BUFF_DURATION_UPGRADE_FACTOR : 1.10);
  const orbIntervalUp  = (typeof ORB_INTERVAL_UPGRADE_FACTOR  !== "undefined" ? ORB_INTERVAL_UPGRADE_FACTOR  : 0.85);

  // deathrattle / last stand / orb collector
  const commonDeathChance = (typeof COMMON_DEATHRATTLE_CHANCE    !== "undefined" ? COMMON_DEATHRATTLE_CHANCE    : 0.05);
  const epicDeathChance   = (typeof EPIC_DEATHRATTLE_CHANCE      !== "undefined" ? EPIC_DEATHRATTLE_CHANCE      : 0.15);
  const legDeathChance    = (typeof LEGENDARY_DEATHRATTLE_CHANCE !== "undefined" ? LEGENDARY_DEATHRATTLE_CHANCE : 0.25);
  const deathBaseCap      = (typeof DEATHRATTLE_BASE_CAP         !== "undefined" ? DEATHRATTLE_BASE_CAP         : 0.45);

  const lastStandMin      = (typeof LAST_STAND_MIN_CHANCE        !== "undefined" ? LAST_STAND_MIN_CHANCE        : 0.33);
  const lastStandMax      = (typeof LAST_STAND_MAX_CHANCE        !== "undefined" ? LAST_STAND_MAX_CHANCE        : 0.50);

  const orbCollectorStep  = (typeof ORB_COLLECTOR_CHANCE_PER     !== "undefined" ? ORB_COLLECTOR_CHANCE_PER     : 0.10);
  const orbCollectorCap   = (typeof ORB_COLLECTOR_MAX_CHANCE     !== "undefined" ? ORB_COLLECTOR_MAX_CHANCE     : 1.00);

  // legendary / epic globals
  const zombieHordeCount  = (typeof ZOMBIE_HORDE_COUNT           !== "undefined" ? ZOMBIE_HORDE_COUNT           : 3);
  const zombieHordeDR     = (typeof ZOMBIE_HORDE_DEATHRATTLE     !== "undefined" ? ZOMBIE_HORDE_DEATHRATTLE     : 0.50);
  const orbStormCount     = (typeof ORB_STORM_COUNT              !== "undefined" ? ORB_STORM_COUNT              : 12);

  const snakeShedInterval = (typeof SNAKE_SHED_INTERVAL          !== "undefined" ? SNAKE_SHED_INTERVAL          : 300);
  const snakeShedSpeedFact= (typeof SNAKE_SHED_SPEED_FACTOR      !== "undefined" ? SNAKE_SHED_SPEED_FACTOR      : 1.27);
  const snakeEggSpeedFact = (typeof SNAKE_EGG_SPEED_FACTOR       !== "undefined" ? SNAKE_EGG_SPEED_FACTOR       : 1.11);

  const pages = [
    // Page 0 – orb buffs (movement & control)
    `
<b>🟢 Orb buffs – movement & control</b><br><br>
⚡ <b>Speed</b> – frogs act faster for <span style="color:${neon};">${secFromConst(speedDur, 10)}</span>.<br>
🦘 <b>Jump</b> – jump ≈ <span style="color:${neon};">${multFromFactor(jumpBuffFactor, 3.0)}</span> higher for <span style="color:${neon};">${secFromConst(jumpDur, 10)}</span>.<br>
🛡️ <b>Frog Shield</b> – frogs ignore snake hits for <span style="color:${neon};">${secFromConst(shieldDur, 10)}</span>.<br>
🧊 <b>Snake slow</b> – snake speed set to <span style="color:${neon};">${percentFromFactor(snakeSlowFact, 0.6)}</span> for <span style="color:${neon};">${secFromConst(slowDur, 10)}</span>.<br>
🤪 <b>Confuse</b> – snake steering is random for <span style="color:${neon};">${secFromConst(confuseDur, 10)}</span>.<br>
📏 <b>Shrink</b> – snake + bite radius shrink for <span style="color:${neon};">${secFromConst(shrinkDur, 10)}</span>.<br>
😱 <b>Panic hop</b> – frogs hop in random directions for <span style="color:${neon};">${secFromConst(panicDur, 7)}</span>.<br>
`,

    // Page 1 – orb buffs (score & survival)
    `
<b>🟢 Orb buffs – score & survival</b><br><br>
🐸➕ <b>Spawn</b> – +<span style="color:${neon};">${normalSpawnAmt}</span> frogs (Lucky can add more).<br>
🐸🌊 <b>Mega spawn</b> – +<span style="color:${neon};">${megaSpawnMin}–${megaSpawnMax}</span> frogs in a burst.<br>
🧲 <b>Orb magnet</b> – orbs drift toward frogs for <span style="color:${neon};">${secFromConst(orbMagDur, 10)}</span> (prefers Magnet frogs).<br>
💰 <b>Score x${scoreMultiFact.toFixed(1)}</b> – score gain ×<span style="color:${neon};">${multFromFactor(scoreMultiFact, 2.0)}</span> for <span style="color:${neon};">${secFromConst(scoreDur, 20)}</span>.<br>
🩺 <b>Life steal</b> – for <span style="color:${neon};">${secFromConst(lifelineDur, 10)}</span>, dying frogs get an extra respawn roll.<br>
🔥 <b>Frenzy</b> – for <span style="color:${neon};">${secFromConst(frenzyDur, 13)}</span>, hops ≈ <span style="color:${neon};">${multFromFactor(frenzySpeedFact, 1.25)}</span> faster, jumps ≈ <span style="color:${neon};">${multFromFactor(frenzyJumpFact, 1.25)}</span> higher.<br>
⭐ <b>PermaFrog</b> – permanently gives that frog a random role (Champion, Aura, Lucky, etc.).<br>
`,

    // Page 2 – permanent roles
    `
<b>🐸 Permanent frog roles</b><br><br>
🏅 <b>Champion</b> – hops ≈ <span style="color:${neon};">${fasterPercentFromFactor(champSpeedFact, 0.75)}</span> faster, jumps ≈ <span style="color:${neon};">${multFromFactor(champJumpFact, 1.35)}</span> higher.<br>
🌈 <b>Aura</b> – buffs frogs in ~<span style="color:${neon};">${auraRadiusPx}</span>px radius; jump ≈ <span style="color:${neon};">${multFromFactor(auraJumpFact, 1.25)}</span> for friends.<br>
🧲 <b>Magnet</b> – orbs within ~<span style="color:${neon};">220px</span> are pulled to this frog.<br>
🍀 <b>Lucky</b> – buffs last ≈ <span style="color:${neon};">${multFromFactor(luckyDurBoost, 1.5)}</span> longer and each Lucky frog adds ≈ <span style="color:${neon};">${percentFromBonus(luckyScorePer, 0.15)}</span> score rate.<br>
🧟 <b>Zombie</b> – on death, spawns <span style="color:${neon};">${zombieSpawnOnDeath}</span> frogs and often slows the snake briefly.<br>
💀 <b>Cannibal</b> – eats frogs but adds ≈ <span style="color:${neon};">${percentFromBonus(cannibalDeathBonus, 0.05)}</span> global deathrattle per cannibal; sometimes “spares” a victim and rerolls its role.<br>
`,

    // Page 3 – global upgrades
    `
<b>🏗️ Global upgrades</b><br><br>
⏩ <b>Frogs hop faster</b> – each pick ≈ <span style="color:${neon};">${percentFromBonus(1 - frogSpeedUp, 0.10)}</span> faster hops (stacks).<br>
🦘⬆️ <b>Frogs jump higher</b> – each pick ≈ <span style="color:${neon};">${percentFromBonus(frogJumpUp - 1, 0.30)}</span> jump height (stacks).<br>
🐸💥 <b>Spawn ${normalSpawnAmt}/${epicSpawnAmt}</b> – common: +<span style="color:${neon};">${normalSpawnAmt}</span> frogs; epic: +<span style="color:${neon};">${epicSpawnAmt}</span> frogs.<br>
⏳ <b>Buffs last longer</b> – each pick ×<span style="color:${neon};">${multFromFactor(buffDurUp, 1.10)}</span> duration (~${percentFromBonus(buffDurUp - 1, 0.10)} longer, stacks).<br>
🎯 <b>More orbs</b> – each pick shrinks interval to ×<span style="color:${neon};">${multFromFactor(orbIntervalUp, 0.85)}</span> (~${fasterPercentFromFactor(orbIntervalUp, 0.85)} more orbs).<br>
💀 <b>Deathrattle</b> – common +<span style="color:${neon};">${percentFromBonus(commonDeathChance, 0.05)}</span>, epic +<span style="color:${neon};">${percentFromBonus(epicDeathChance, 0.15)}</span>, legendary +<span style="color:${neon};">${percentFromBonus(legDeathChance, 0.25)}</span> base respawn (cap ≈ <span style="color:${neon};">${percentFromBonus(deathBaseCap, 0.45)}</span>).<br>
🎲 <b>Orb collector</b> – each pick adds <span style="color:${neon};">${percentFromBonus(orbCollectorStep, 0.10)}</span> chance orbs also spawn a frog (cap ≈ <span style="color:${neon};">${percentFromBonus(orbCollectorCap, 1.00)}</span>).<br>
🏹 <b>Last Stand</b> – final frog gets at least <span style="color:${neon};">${percentFromBonus(lastStandMin, 0.33)}</span> respawn chance, up to ~<span style="color:${neon};">${percentFromBonus(lastStandMax, 0.50)}</span> with upgrades.<br>
`,

    // Page 4 – epic effects & snake rules
    `
<b>🐍 Epics & snake rules</b><br><br>
🐸⭐ <b>Frog Promotion</b> – summons <span style="color:${neon};">10</span> frogs, each with a random permanent role.<br>
🌩️ <b>Orb Storm</b> – drops about <span style="color:${neon};">${orbStormCount}</span> orbs at once, strong with Magnet / Orb Collector builds.<br>
🥚 <b>Snake Egg</b> – next shed snake only gets speed ×<span style="color:${neon};">${multFromFactor(snakeEggSpeedFact, 1.11)}</span> instead of ×<span style="color:${neon};">${multFromFactor(snakeShedSpeedFact, 1.27)}</span>.<br>
🧪 <b>Orb specialist</b> – every collected orb always spawns 1 frog; Orb Collector can add extra frogs.<br>
👻 <b>Grave Wave (epic)</b> – every snake shed raises <span style="color:${neon};">10–20</span> ghost frogs that join the swarm.<br><br>
🔥 <b>Snake sheds</b><br>
• Every ~<span style="color:${neon};">${minsFromSeconds(snakeShedInterval, 300)}</span> the snake sheds and a new one spawns.<br>
• Each shed: speed up, shorter body, higher danger.<br><br>
⏱ <b>Upgrade timing</b><br>
• ~60s: common upgrades.<br>
• ~180s: common + epic choice.<br>
• ~300s: shed phase & big difficulty spike.<br>
`
  ];

  const maxPage = pages.length - 1;
  buffGuidePage = Math.max(0, Math.min(maxPage, pageIndex));

  buffGuideContentEl.innerHTML = pages[buffGuidePage];
  buffGuidePageLabel.textContent = `Page ${buffGuidePage + 1} / ${pages.length}`;

  if (buffGuidePrevBtn) {
    buffGuidePrevBtn.disabled = buffGuidePage === 0;
    buffGuidePrevBtn.style.opacity = buffGuidePage === 0 ? "0.5" : "1";
  }
  if (buffGuideNextBtn) {
    buffGuideNextBtn.disabled = buffGuidePage === maxPage;
    buffGuideNextBtn.style.opacity = buffGuideNextBtn.disabled ? "0.5" : "1";
  }
}

  function openBuffGuideOverlay() {
    ensureBuffGuideOverlay();
    if (buffGuideOverlay) {
      buffGuideOverlay.style.display = "flex";
    }
  }

  function closeBuffGuideOverlay() {
    if (buffGuideOverlay) {
      buffGuideOverlay.style.display = "none";
    }
  }

  function ensureUpgradeOverlay() {
    if (upgradeOverlay) return;

    upgradeOverlay = document.createElement("div");
    upgradeOverlay.className = "frog-upgrade-overlay";

    upgradeOverlay.style.position = "absolute";
    upgradeOverlay.style.inset = "0";
    upgradeOverlay.style.background = "rgba(0,0,0,0.7)";
    upgradeOverlay.style.display = "none"; // hidden by default
    upgradeOverlay.style.zIndex = "150";
    upgradeOverlay.style.alignItems = "center";
    upgradeOverlay.style.justifyContent = "center";
    upgradeOverlay.style.pointerEvents = "auto";

    const panel = document.createElement("div");
    panel.style.background = "#111";
    panel.style.padding = "16px 20px";
    panel.style.borderRadius = "10px";
    panel.style.border = "1px solid #444";
    panel.style.color = "#fff";
    panel.style.fontFamily = "monospace";
    panel.style.textAlign = "center";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "360px";
    panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

    const title = document.createElement("div");
    title.textContent = "Choose an upgrade";
    title.style.marginBottom = "12px";
    title.style.fontSize = "14px";
    upgradeOverlayTitleEl = title;

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexDirection = "column";
    buttonsContainer.style.gap = "8px";
    buttonsContainer.style.alignItems = "stretch";

    upgradeOverlayButtonsContainer = buttonsContainer;

    panel.appendChild(title);
    panel.appendChild(buttonsContainer);
    upgradeOverlay.appendChild(panel);
    container.appendChild(upgradeOverlay);
  }

function populateUpgradeOverlayChoices(mode) {
  ensureUpgradeOverlay();
  const containerEl = upgradeOverlayButtonsContainer;
  if (!containerEl) return;

  currentUpgradeOverlayMode = mode || "normal";
  const isEpic      = currentUpgradeOverlayMode === "epic";
  const isLegendary = currentUpgradeOverlayMode === "legendary";

  containerEl.innerHTML = "";
  const neon = "#4defff";

  if (upgradeOverlayTitleEl) {
    upgradeOverlayTitleEl.textContent = "Choose an upgrade";
  }

  let choices = [];

  if (isEpic) {
    // 🔥 EPIC: pick a random 3 from the full epic pool
    let pool = getEpicUpgradeChoices().slice();
    while (choices.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
  } else if (isLegendary && typeof getLegendaryUpgradeChoices === "function") {
    choices = getLegendaryUpgradeChoices().slice();
  } else {
    // 🟢 NORMAL per-minute upgrades
    let pool = getUpgradeChoices().slice();

    // Starting pre-game upgrade: optionally filter stuff out here
    if (!initialUpgradeDone) {
      pool = pool.filter(c => c.id !== "permaLifeSteal"); // safe even if commented out
    }

    // This is the FIRST timed common after the run has started (~1:00 mark)
    const isFirstTimedNormal = initialUpgradeDone && !firstTimedNormalChoiceDone;

    if (isFirstTimedNormal) {
      firstTimedNormalChoiceDone = true;

      // ✅ Guarantee spawn20 is in the options
      let spawnChoiceIndex = pool.findIndex(c => c.id === "spawn20");
      let spawnChoice;

      if (spawnChoiceIndex !== -1) {
        spawnChoice = pool.splice(spawnChoiceIndex, 1)[0];
      } else {
        // Fallback: recreate the spawn20 choice if it somehow went missing
        spawnChoice = {
          id: "spawn20",
          label: `
            🐸 Spawn frogs<br>
            <span style="color:${neon};">${NORMAL_SPAWN_AMOUNT}</span> frogs right now
          `,
          apply: () => {
            spawnExtraFrogs(NORMAL_SPAWN_AMOUNT);
          }
        };
      }

      choices.push(spawnChoice);

      // Fill remaining slots randomly until we have 3 total
      while (choices.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
    } else {
      // All other common upgrades: just pick any 3 at random
      while (choices.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
    }
  }

  function makeButton(label, onClick) {
    const btn = document.createElement("button");
    btn.innerHTML = label; // allow emojis + <span> highlight
    btn.style.fontFamily = "monospace";
    btn.style.fontSize = "13px";
    btn.style.padding = "6px 8px";
    btn.style.border = "1px solid #555";
    btn.style.borderRadius = "6px";
    btn.style.background = "#222";
    btn.style.color = "#fff";
    btn.style.cursor = "pointer";
    btn.style.textAlign = "left";
    btn.onmouseenter = () => { btn.style.background = "#333"; };
    btn.onmouseleave = () => { btn.style.background = "#222"; };
    btn.onclick = () => {
      playButtonClick();
      try {
        onClick();
      } catch (e) {
        console.error("Error applying upgrade:", e);
      }
      playPermanentChoiceSound();
      closeUpgradeOverlay();
    };
    return btn;
  }

  if (!choices.length) {
    const span = document.createElement("div");
    span.textContent = "No upgrades available.";
    span.style.fontSize = "13px";
    containerEl.appendChild(span);
    return;
  }

  for (const choice of choices) {
    containerEl.appendChild(makeButton(choice.label, choice.apply));
  }
}

    function makeButton(label, onClick) {
      const btn = document.createElement("button");
      btn.innerHTML = label; // ⬅ was textContent
      btn.style.fontFamily = "monospace";
      btn.style.fontSize = "13px";
      btn.style.padding = "6px 8px";
      btn.style.border = "1px solid #555";
      btn.style.borderRadius = "6px";
      btn.style.background = "#222";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.onmouseenter = () => { btn.style.background = "#333"; };
      btn.onmouseleave = () => { btn.style.background = "#222"; };
      btn.onclick = () => {
        try {
          onClick();
        } catch (e) {
          console.error("Error applying upgrade:", e);
        }
        playPermanentChoiceSound();
        closeUpgradeOverlay();
      };
      return btn;
    }

  function openUpgradeOverlay(mode) {
    ensureUpgradeOverlay();
    populateUpgradeOverlayChoices(mode);

    gamePaused = true;
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "flex";
    }
  }

  function triggerLegendaryFrenzy() {
    // 13-second Frenzy: snake faster + frogs panic hop randomly
    snakeFrenzyTime = 13;
    panicHopTime = Math.max(panicHopTime, 13);
    setSnakeFrenzyVisual(true);
  }

  function closeUpgradeOverlay() {
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "none";
    }
    gamePaused = false;

    // --- schedule next timers based on what we just picked ---
    if (!initialUpgradeDone && currentUpgradeOverlayMode === "normal") {
      // First-ever normal upgrade at game start
      initialUpgradeDone = true;
      nextPermanentChoiceTime = elapsedTime + 60;
    } else {
      if (currentUpgradeOverlayMode === "normal") {
        // Any regular normal upgrade (including the one that happens at epic marks)
        nextPermanentChoiceTime = elapsedTime + 60;
      } else if (currentUpgradeOverlayMode === "epic") {
        // Epic picked: next epic in 3 minutes
        nextEpicChoiceTime = elapsedTime + 180;
        // NOTE: we do NOT touch nextPermanentChoiceTime here; it was already
        // set when the normal half of the chain closed.
      }
    }

    // --- epic chain: if we hit an epic mark, go normal -> epic back-to-back ---
    if (epicChainPending && currentUpgradeOverlayMode === "normal") {
      epicChainPending = false;
      // Immediately show the EPIC choices now that the player picked a normal one
      openUpgradeOverlay("epic");
    }
  }

  // --------------------------------------------------
  // SCORE / LEADERBOARD
  // --------------------------------------------------
  function getLuckyScoreBonusFactor() {
    let count = 0;
    for (const frog of frogs) {
      if (frog.isLucky) count++;
    }
    return 1 + LUCKY_SCORE_BONUS_PER * count;
  }

  function endGame() {
    gameOver = true;

    lastRunTime  = elapsedTime;
    lastRunScore = score;

    const finalStats = {
      // Core run results
      score: lastRunScore,
      timeSeconds: lastRunTime,
  
      // Live buff values at the end of the run
      deathrattleChance: frogDeathRattleChance,
      frogSpeedFactor: frogPermanentSpeedFactor,
      frogJumpFactor: frogPermanentJumpFactor,
      buffDurationFactor,
      orbSpawnIntervalFactor,
      orbCollectorChance,
      orbSpecialistActive,
  
      // Totals for this run
      totalFrogsSpawned,
      //totalOrbsSpawned,
      //totalOrbsCollected,
      //totalGhostFrogsSpawned,
      //totalCannibalEvents,
    };
  
  (async () => {
    const posted  = await submitScoreToServer(lastRunScore, lastRunTime, finalStats);
    const rawList = posted || (await fetchLeaderboard()) || [];

    // ✅ Hard cap: only keep top 10 entries
    const topList = rawList.slice(0, 30);

    updateMiniLeaderboard(topList);
    openScoreboardOverlay(topList, lastRunScore, lastRunTime, finalStats);
  })();

    showGameOver();
  }

  function restartGame() {
    // Stop old loop
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    // Remove all frogs
    for (const frog of frogs) {
      if (frog.cloneEl && frog.cloneEl.parentNode === container) {
        container.removeChild(frog.cloneEl);
      }
      if (frog.el && frog.el.parentNode === container) {
        container.removeChild(frog.el);
      }
    }
    frogs = [];

    // Remove all orbs
    for (const orb of orbs) {
      if (orb.el && orb.el.parentNode === container) {
        container.removeChild(orb.el);
      }
    }
    orbs = [];

    // Remove snake graphics
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
    // Remove any old shed skins still fading out
    for (const ds of dyingSnakes) {
      if (ds.headEl && ds.headEl.parentNode === container) {
        container.removeChild(ds.headEl);
      }
      if (Array.isArray(ds.segmentEls)) {
        for (const el of ds.segmentEls) {
          if (el && el.parentNode === container) {
            container.removeChild(el);
          }
        }
      }
    }
    dyingSnakes = [];


    // Reset game state
    elapsedTime     = 0;
    lastTime        = 0;
    gameOver        = false;
    gamePaused      = false;
    score           = 0;
    frogsEatenCount = 0;
    nextOrbTime     = 0;
    mouse.follow    = false;

    // Reset upgrade timing
    // Reset upgrade timing / sheds
    // Reset upgrade timing / sheds
    initialUpgradeDone       = false;
    nextPermanentChoiceTime  = 60;
    nextEpicChoiceTime       = 180;
    legendaryEventTriggered  = false;
    orbSpecialistActive      = false; 

    snakeShedStage           = 0;
    snakeShedCount           = 0;
    nextShedTime             = SHED_INTERVAL;
    dyingSnakes              = [];

    snakeEggPending          = false;
    orbCollectorActive       = false;
    orbCollectorChance       = 0.10;
    lastStandActive          = false;

    snakeTurnRate            = SNAKE_TURN_RATE_BASE;
    graveWaveActive   = false;
    frogEatFrogActive = false;

    // Reset all temporary buff timers
    speedBuffTime   = 0;
    jumpBuffTime    = 0;
    snakeSlowTime   = 0;
    snakeConfuseTime= 0;
    snakeShrinkTime = 0;
    frogShieldTime  = 0;
    timeSlowTime    = 0;
    orbMagnetTime   = 0;
    scoreMultiTime  = 0;
    panicHopTime    = 0;
    cloneSwarmTime  = 0;
    lifeStealTime   = 0;
    permaLifeStealOrbsRemaining = 0;
    snakeFrenzyTime = 0;
    setSnakeFrenzyVisual(false);

    // Reset EPIC deathrattle
    frogDeathRattleChance = 0.0;
    cannibalFrogCount = 0;

    // Reset global permanent buffs
    frogPermanentSpeedFactor = 1.0;
    frogPermanentJumpFactor  = 1.0;
    buffDurationFactor       = 1.0;
    orbSpawnIntervalFactor   = 0.9;
    snakePermanentSpeedFactor= 1.0;

    // Hide overlays
    hideGameOver();
    if (upgradeOverlay) upgradeOverlay.style.display = "none";
    hideScoreboardOverlay();

    // Recreate frogs + snake
    const width  = window.innerWidth;
    const height = window.innerHeight;

    createInitialFrogs(width, height).then(() => {});
    initSnake(width, height);

    setNextOrbTime();
    updateHUD();

    // Show the upgrade menu again at the start of a new run
    openUpgradeOverlay("normal");

    animId = requestAnimationFrame(drawFrame);
  }

  function setNextOrbTime() {
    const min = ORB_SPAWN_INTERVAL_MIN * orbSpawnIntervalFactor;
    const max = ORB_SPAWN_INTERVAL_MAX * orbSpawnIntervalFactor;
    nextOrbTime = randRange(min, max);
  }

  // --------------------------------------------------
  // GAME LOOP
  // --------------------------------------------------
  function drawFrame(time) {
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!gameOver) {
      if (!gamePaused) {
        elapsedTime += dt;

        //
        // 1) Snake sheds every 5 minutes
        //
        if (elapsedTime >= nextShedTime) {
          snakeShedCount += 1;
          // Stage 1 = yellow, 2 = orange, 3+ = red
          const stage = Math.min(snakeShedCount, 3);
          snakeShed(stage);
          nextShedTime += SHED_INTERVAL;
        }

        //
        // 2) Upgrade menus (epic + normal)
        //
        if (elapsedTime >= nextEpicChoiceTime) {
          // At epic milestones: player picks a NORMAL upgrade first,
          // then immediately an EPIC upgrade.
          epicChainPending = true;
          openUpgradeOverlay("normal");
        }
        else if (elapsedTime >= nextPermanentChoiceTime) {
          // Regular 1-minute normal upgrades
          openUpgradeOverlay("normal");
        }
        else {
          // ... normal update logic: buffs, frogs, snake, orbs, score, etc.
          updateBuffTimers(dt);

          const slowFactor = timeSlowTime > 0 ? 0.4 : 1.0;

          updateFrogs(dt, width, height);
          updateSnake(dt * slowFactor, width, height);

          // 🔹 Despawn old shed snakes segment-by-segment
          updateDyingSnakes(dt);

          updateOrbs(dt * slowFactor);

          let scoreFactor = scoreMultiTime > 0 ? 2 : 1;
          scoreFactor *= getLuckyScoreBonusFactor();
          score += dt * scoreFactor;

          nextOrbTime -= dt;
          if (nextOrbTime <= 0) {
            spawnOrbRandom(width, height);
            setNextOrbTime();
          }

          if (frogs.length === 0) {
            endGame();
          }
        }
      }
    }

    updateHUD();
    animId = requestAnimationFrame(drawFrame);
  }

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------
async function startGame() {
  initAudio();
  initLeaderboard(container);
  ensureUpgradeOverlay();
  ensureInfoOverlay();  // unified info panel

  const topList = await fetchLeaderboard();
  if (topList) {
    updateMiniLeaderboard(topList);
    infoLeaderboardData = topList;
  } else {
    infoLeaderboardData = [];
  }

  const width  = window.innerWidth;
  const height = window.innerHeight;

  await createInitialFrogs(width, height);
  initSnake(width, height);

  setNextOrbTime();
  updateHUD();

  // Show the how-to-play menu before the first upgrade
  openHowToOverlay();

  // Always offer a common upgrade at the very start of the game
  // (same behavior as restartGame)
  openUpgradeOverlay("normal");

  animId = requestAnimationFrame(drawFrame);
}


  window.addEventListener("load", startGame);
})();
