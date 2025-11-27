// frog-game.js
// Frog Snake survival game for FreshFrogs.

(function () {
  "use strict";

  // -----------------------------
  // FROG + METADATA CONSTANTS
  // -----------------------------
  const FROG_SIZE       = 64;
  const MAX_TOKEN_ID    = 4040;
  const META_BASE       = "../frog/json/";
  const META_EXT        = ".json";
  const BUILD_BASE      = "../frog/build_files";
  const STARTING_FROGS  = 50;
  const MAX_FROGS       = 150;

  // Worker endpoint
  const LEADERBOARD_URL = "https://lucky-king-0d37.danielssouthworth.workers.dev/leaderboard"; // change this

  let lastRunScore = 0;
  let lastRunTime  = 0;

  // scoreboard overlay
  let scoreboardOverlay = null;


  // Values that have animation variants for frogs (same as scatter-frogs.js)
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

  // Trait types to skip (avoid backgrounds)
  const SKIP_TRAITS = new Set(["Background", "background", "BG", "Bg"]);

  const container = document.getElementById("frog-game");
  if (!container) return;

  let frogs = [];
  let snake = null;
  let orbs  = [];

  let animId        = null;
  let lastTime      = 0;
  let elapsedTime   = 0;
  let gameOver      = false;
  let gamePaused    = false;
  let nextOrbTime   = 0;

  let score = 0;

  // minute-based permanent upgrades
  let nextPermanentChoiceTime = 60; // seconds
  let upgradeOverlay = null;

  // -----------------------------
  // MOUSE TRACKING
  // -----------------------------
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

  function ensureScoreboardOverlay() {
  if (scoreboardOverlay) return;

  scoreboardOverlay = document.createElement("div");
  scoreboardOverlay.style.position = "absolute";
  scoreboardOverlay.style.inset = "0";
  scoreboardOverlay.style.background = "rgba(0,0,0,0.78)";
  scoreboardOverlay.style.display = "none";
  scoreboardOverlay.style.zIndex = "200";
  scoreboardOverlay.style.display = "flex";
  scoreboardOverlay.style.alignItems = "center";
  scoreboardOverlay.style.justifyContent = "center";
  scoreboardOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "16px 20px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "center";
  panel.style.minWidth = "320px";
  panel.style.maxWidth = "480px";

  const title = document.createElement("div");
  title.textContent = "Run Summary";
  title.style.fontSize = "16px";
  title.style.marginBottom = "8px";

  const summary = document.createElement("div");
  summary.style.fontSize = "13px";
  summary.style.marginBottom = "10px";
  summary.id = "frog-score-summary";

  const leaderboardTitle = document.createElement("div");
  leaderboardTitle.textContent = "Top Scores";
  leaderboardTitle.style.fontSize = "14px";
  leaderboardTitle.style.margin = "10px 0 4px";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "12px";
  table.id = "frog-score-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["#", "Tag", "Score", "Time"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.borderBottom = "1px solid #444";
    th.style.padding = "2px 4px";
    th.style.textAlign = h === "#" ? "right" : "left";
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "10px";
  closeBtn.style.fontFamily = "monospace";
  closeBtn.style.fontSize = "13px";
  closeBtn.style.padding = "6px 10px";
  closeBtn.style.borderRadius = "6px";
  closeBtn.style.border = "1px solid #555";
  closeBtn.style.background = "#222";
  closeBtn.style.color = "#fff";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => {
    scoreboardOverlay.style.display = "none";
  };
  closeBtn.onmouseenter = () => { closeBtn.style.background = "#333"; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = "#222"; };

  panel.appendChild(title);
  panel.appendChild(summary);
  panel.appendChild(leaderboardTitle);
  panel.appendChild(table);
  panel.appendChild(closeBtn);

  scoreboardOverlay.appendChild(panel);
  container.appendChild(scoreboardOverlay);
}

async function submitScoreToServer(score, time) {
  try {
    const res = await fetch(LEADERBOARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, time }),
    });
    if (!res.ok) throw new Error("submit failed");
    return await res.json(); // expect array top scores
  } catch (e) {
    console.error("submitScoreToServer error", e);
    return null;
  }
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(LEADERBOARD_URL, {
      method: "GET"
    });
    if (!res.ok) throw new Error("get failed");
    return await res.json();
  } catch (e) {
    console.error("fetchLeaderboard error", e);
    return null;
  }
}

function openScoreboardOverlay(topList) {
  ensureScoreboardOverlay();
  const summary = document.getElementById("frog-score-summary");
  const table   = document.getElementById("frog-score-table");
  if (!summary || !table) return;

  summary.textContent =
    `Time: ${formatTime(lastRunTime)}  |  Score: ${Math.floor(lastRunScore)}`;

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  if (!Array.isArray(topList) || !topList.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No scores yet.";
    td.style.padding = "4px";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    topList.forEach((entry, idx) => {
      const tr = document.createElement("tr");

      const tdRank = document.createElement("td");
      tdRank.textContent = String(idx + 1);
      tdRank.style.textAlign = "right";
      tdRank.style.padding = "2px 4px";

      const tdTag = document.createElement("td");
      tdTag.textContent = entry.tag || "Unknown";
      tdTag.style.padding = "2px 4px";

      const tdScore = document.createElement("td");
      tdScore.textContent = entry.bestScore != null
        ? String(Math.floor(entry.bestScore))
        : "-";
      tdScore.style.padding = "2px 4px";

      const tdTime = document.createElement("td");
      tdTime.textContent = entry.bestTime != null
        ? formatTime(entry.bestTime)
        : "-";
      tdTime.style.padding = "2px 4px";

      tr.appendChild(tdRank);
      tr.appendChild(tdTag);
      tr.appendChild(tdScore);
      tr.appendChild(tdTime);
      tbody.appendChild(tr);
    });
  }

  scoreboardOverlay.style.display = "flex";
}

  // -----------------------------
  // AUDIO
  // -----------------------------
  let audioRibbits = [];
  let audioFrogDeath = null;
  let audioSnakeEat  = null;
  let audioOrbSpawn1 = null;
  let audioOrbSpawn2 = null;
  let audioSuperSpeed = null;
  let audioSuperJump  = null;
  let audioFrogSpawn  = null;

  // New buff audio placeholders
  let audioSnakeSlow    = null;
  let audioSnakeConfuse = null;
  let audioSnakeShrink  = null;
  let audioFrogShield   = null;
  let audioTimeSlow     = null;
  let audioOrbMagnet    = null;
  let audioMegaSpawn    = null;
  let audioScoreMulti   = null;
  let audioPanicHop     = null;

  // Permanent upgrade audio
  let audioPermanentChoice = null;

  function initAudio() {
    audioRibbits = [
      new Audio("https://freshfrogs.github.io/snake/audio/ribbitOne.mp3"),
      new Audio("https://freshfrogs.github.io/snake/audio/ribbitTwo.mp3"),
      new Audio("https://freshfrogs.github.io/snake/audio/ribbitThree.mp3"),
      new Audio("https://freshfrogs.github.io/snake/audio/ribbitBase.mp3"),
    ];
    audioRibbits.forEach(a => a.volume = 0.8);

    audioFrogDeath = new Audio("https://freshfrogs.github.io/snake/audio/frogDeath.mp3");
    audioFrogDeath.volume = 0.9;

    audioSnakeEat = new Audio("https://freshfrogs.github.io/snake/audio/munch4.mp3");
    audioSnakeEat.volume = 0.7;

    audioOrbSpawn1 = new Audio("https://freshfrogs.github.io/snake/audio/orbSpawn.mp3");
    audioOrbSpawn2 = new Audio("https://freshfrogs.github.io/snake/audio/orbSpawnTwo.mp3");
    audioOrbSpawn1.volume = 0.8;
    audioOrbSpawn2.volume = 0.8;

    audioSuperSpeed = new Audio("https://freshfrogs.github.io/snake/audio/superSpeed.mp3");
    audioSuperJump  = new Audio("https://freshfrogs.github.io/snake/audio/superJump.mp3");
    audioFrogSpawn  = new Audio("https://freshfrogs.github.io/snake/audio/frogSpawn.mp3");
    audioSuperSpeed.volume = 0.9;
    audioSuperJump.volume  = 0.9;
    audioFrogSpawn.volume  = 0.9;

    // new buff audios (placeholders)
    audioSnakeSlow    = new Audio("https://freshfrogs.github.io/snake/audio/snakeSlow.mp3");
    audioSnakeConfuse = new Audio("https://freshfrogs.github.io/snake/audio/snakeConfuse.mp3");
    audioSnakeShrink  = new Audio("https://freshfrogs.github.io/snake/audio/snakeShrink.mp3");
    audioFrogShield   = new Audio("https://freshfrogs.github.io/snake/audio/frogShield.mp3");
    audioTimeSlow     = new Audio("https://freshfrogs.github.io/snake/audio/timeSlow.mp3");
    audioOrbMagnet    = new Audio("https://freshfrogs.github.io/snake/audio/orbMagnet.mp3");
    audioMegaSpawn    = new Audio("https://freshfrogs.github.io/snake/audio/megaSpawn.mp3");
    audioScoreMulti   = new Audio("https://freshfrogs.github.io/snake/audio/scoreMulti.mp3");
    audioPanicHop     = new Audio("https://freshfrogs.github.io/snake/audio/panicHop.mp3");

    const allNew = [
      audioSnakeSlow,
      audioSnakeConfuse,
      audioSnakeShrink,
      audioFrogShield,
      audioTimeSlow,
      audioOrbMagnet,
      audioMegaSpawn,
      audioScoreMulti,
      audioPanicHop
    ];
    allNew.forEach(a => { if (a) a.volume = 0.9; });

    audioPermanentChoice = new Audio("/audio/permanentBuffChoice.mp3");
    if (audioPermanentChoice) audioPermanentChoice.volume = 0.9;
  }

  function playClone(base) {
    if (!base) return;
    try {
      const clone = base.cloneNode();
      clone.volume = base.volume;
      clone.play();
    } catch (e) {}
  }

  function playRandomRibbit() {
    if (!audioRibbits.length) return;
    const base = audioRibbits[Math.floor(Math.random() * audioRibbits.length)];
    playClone(base);
  }

  function playFrogDeath() {
    playClone(audioFrogDeath);
  }

  function playSnakeMunch() {
    playClone(audioSnakeEat);
  }

  function playRandomOrbSpawnSound() {
    const choices = [audioOrbSpawn1, audioOrbSpawn2].filter(Boolean);
    if (!choices.length) return;
    const base = choices[Math.floor(Math.random() * choices.length)];
    playClone(base);
  }

  function playBuffSound(type) {
    let base = null;
    switch (type) {
      case "speed":       base = audioSuperSpeed;    break;
      case "jump":        base = audioSuperJump;     break;
      case "spawn":       base = audioFrogSpawn;     break;
      case "snakeSlow":   base = audioSnakeSlow;     break;
      case "snakeConfuse":base = audioSnakeConfuse;  break;
      case "snakeShrink": base = audioSnakeShrink;   break;
      case "frogShield":  base = audioFrogShield;    break;
      case "timeSlow":    base = audioTimeSlow;      break;
      case "orbMagnet":   base = audioOrbMagnet;     break;
      case "megaSpawn":   base = audioMegaSpawn;     break;
      case "scoreMulti":  base = audioScoreMulti;    break;
      case "panicHop":    base = audioPanicHop;      break;
    }
    if (base) playClone(base);
  }

  function playPermanentChoiceSound() {
    playClone(audioPermanentChoice);
  }

  // -----------------------------
  // HUD
  // -----------------------------
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

  // Mini on-screen leaderboard (top-right)
  const miniBoard = document.createElement("div");
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
  miniBoard.id = "frog-mini-leaderboard";
  miniBoard.textContent = "Loading leaderboard…";
  container.appendChild(miniBoard);


  const timerLabel = document.createElement("span");
  const frogsLabel = document.createElement("span");
  const scoreLabel = document.createElement("span");
  frogsLabel.style.marginLeft = "12px";
  scoreLabel.style.marginLeft = "12px";

  hud.appendChild(timerLabel);
  hud.appendChild(frogsLabel);
  hud.appendChild(scoreLabel);
  container.appendChild(hud);

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

  // -----------------------------
  // HELPERS
  // -----------------------------
  function randInt(min, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function updateMiniLeaderboard(list) {
  const el = document.getElementById("frog-mini-leaderboard");
  if (!el) return;

  if (!Array.isArray(list) || !list.length) {
    el.textContent = "No scores yet.";
    return;
  }

  let text = "Top Scores:\n";
  list.slice(0, 5).forEach((entry, idx) => {
    const tag   = entry.tag || "Unknown";
    const score = entry.bestScore != null ? Math.floor(entry.bestScore) : 0;
    text += `${idx + 1}. ${tag} — ${score}\n`;
  });

  el.textContent = text.trim();
}


  function pickRandomTokenIds(count) {
    const set = new Set();
    while (set.size < count) {
      set.add(randInt(1, MAX_TOKEN_ID));
    }
    return Array.from(set);
  }

  // -----------------------------
  // METADATA + LAYERING
  // -----------------------------
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

  // -----------------------------
  // FROG CREATION
  // -----------------------------
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

      layers: []
    };

    frogs.push(frog);

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

  // -----------------------------
  // BUFFS
  // -----------------------------
  const SPEED_BUFF_DURATION = 15;
  const JUMP_BUFF_DURATION  = 18;

  const SNAKE_SLOW_DURATION    = 8;
  const SNAKE_CONFUSE_DURATION = 6;
  const SNAKE_SHRINK_DURATION  = 8;
  const FROG_SHIELD_DURATION   = 6;
  const TIME_SLOW_DURATION     = 6;
  const ORB_MAGNET_DURATION    = 10;
  const SCORE_MULTI_DURATION   = 10;
  const PANIC_HOP_DURATION     = 8;

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

  // permanent (milder) buffs
  let frogPermanentSpeedFactor = 1.0; // <1 = faster hops
  let frogPermanentJumpFactor  = 1.0; // >1 = higher hops
  let snakePermanentSpeedFactor= 1.0; // reserved if you want to use later

  function getSpeedFactor() {
    // smaller factor = faster hopping rhythm
    let factor = frogPermanentSpeedFactor;
    if (speedBuffTime > 0) factor *= 0.5;
    if (panicHopTime > 0) factor *= 0.6;
    return factor;
  }

  function getJumpFactor() {
    let factor = frogPermanentJumpFactor;
    if (jumpBuffTime > 0) factor *= 10.0; // super jump
    return factor;
  }

  function getSnakeSpeedFactor() {
    let factor = snakePermanentSpeedFactor;
    if (snakeSlowTime > 0) factor *= 0.5;
    if (timeSlowTime > 0)  factor *= 0.4; // time dilation
    return factor;
  }

  const SNAKE_EAT_RADIUS_BASE = 40;
  function getSnakeEatRadius() {
    return snakeShrinkTime > 0 ? 24 : SNAKE_EAT_RADIUS_BASE;
  }

  function applyBuff(type) {
    switch (type) {
      case "speed":
        speedBuffTime = SPEED_BUFF_DURATION;
        break;
      case "jump":
        jumpBuffTime = JUMP_BUFF_DURATION;
        break;
      case "spawn":
        spawnExtraFrogs(randInt(1, 10));
        break;
      case "snakeSlow":
        snakeSlowTime = SNAKE_SLOW_DURATION;
        break;
      case "snakeConfuse":
        snakeConfuseTime = SNAKE_CONFUSE_DURATION;
        break;
      case "snakeShrink":
        snakeShrinkTime = SNAKE_SHRINK_DURATION;
        break;
      case "frogShield":
        frogShieldTime = FROG_SHIELD_DURATION;
        break;
      case "timeSlow":
        timeSlowTime = TIME_SLOW_DURATION;
        break;
      case "orbMagnet":
        orbMagnetTime = ORB_MAGNET_DURATION;
        break;
      case "megaSpawn":
        spawnExtraFrogs(randInt(15, 25));
        break;
      case "scoreMulti":
        scoreMultiTime = SCORE_MULTI_DURATION;
        break;
      case "panicHop":
        panicHopTime = PANIC_HOP_DURATION;
        break;
    }
    playBuffSound(type);
  }

  function updateBuffTimers(dt) {
    if (speedBuffTime   > 0) speedBuffTime   = Math.max(0, speedBuffTime   - dt);
    if (jumpBuffTime    > 0) jumpBuffTime    = Math.max(0, jumpBuffTime    - dt);
    if (snakeSlowTime   > 0) snakeSlowTime   = Math.max(0, snakeSlowTime   - dt);
    if (snakeConfuseTime> 0) snakeConfuseTime= Math.max(0, snakeConfuseTime- dt);
    if (snakeShrinkTime > 0) snakeShrinkTime = Math.max(0, snakeShrinkTime - dt);
    if (frogShieldTime  > 0) frogShieldTime  = Math.max(0, frogShieldTime  - dt);
    if (timeSlowTime    > 0) timeSlowTime    = Math.max(0, timeSlowTime    - dt);
    if (orbMagnetTime   > 0) orbMagnetTime   = Math.max(0, orbMagnetTime   - dt);
    if (scoreMultiTime  > 0) scoreMultiTime  = Math.max(0, scoreMultiTime  - dt);
    if (panicHopTime    > 0) panicHopTime    = Math.max(0, panicHopTime    - dt);
  }

  // -----------------------------
  // FROG MOVEMENT
  // -----------------------------
  function chooseHopDestination(frog, width, height) {
    let targetX = frog.x;
    let targetBaseY = frog.baseY;

    const marginY = 24;
    const marginX = 8;

    const baseMaxStep = 40;
    const maxStep = baseMaxStep * (speedBuffTime > 0 || panicHopTime > 0 ? 1.7 : 1.0);

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
          frog.hopDuration = baseDur * getSpeedFactor();

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
          frog.hopHeight = hopHeight * getJumpFactor();

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
          frog.idleTime = baseIdle * getSpeedFactor();

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
    }
  }

  // -----------------------------
  // ORBS
  // -----------------------------
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
      "timeSlow",
      "orbMagnet",
      "megaSpawn",
      "scoreMulti",
      "panicHop"
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

    // use shared orb.gif for all buffs
    el.style.backgroundImage = "url(/snake/orb.gif)";
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";

    // different colored glow per buff type so you can still tell them apart
    if (type === "speed") {
      el.style.boxShadow = "0 0 14px #32ff9b";
    } else if (type === "jump") {
      el.style.boxShadow = "0 0 14px #b857ff";
    } else if (type === "spawn") {
      el.style.boxShadow = "0 0 14px #ffe66b";
    } else if (type === "snakeSlow") {
      el.style.boxShadow = "0 0 14px #ff6b6b";
    } else if (type === "snakeConfuse") {
      el.style.boxShadow = "0 0 14px #ff9ff3";
    } else if (type === "snakeShrink") {
      el.style.boxShadow = "0 0 14px #74b9ff";
    } else if (type === "frogShield") {
      el.style.boxShadow = "0 0 14px #55efc4";
    } else if (type === "timeSlow") {
      el.style.boxShadow = "0 0 14px #ffeaa7";
    } else if (type === "orbMagnet") {
      el.style.boxShadow = "0 0 14px #a29bfe";
    } else if (type === "megaSpawn") {
      el.style.boxShadow = "0 0 14px #fd79a8";
    } else if (type === "scoreMulti") {
      el.style.boxShadow = "0 0 14px #fdcb6e";
    } else if (type === "panicHop") {
      el.style.boxShadow = "0 0 14px #fab1a0";
    } else {
      el.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";
    }


    container.appendChild(el);
    orbs.push({
      type,
      x,
      y,
      ttl: ORB_TTL,
      el
    });

    playRandomOrbSpawnSound();
  }

  function updateOrbs(dt) {
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

      // Magnet effect
      if (orbMagnetTime > 0 && frogs.length > 0) {
        let target = null;
        let bestD2 = Infinity;
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

      const ocx = orb.x;
      const ocy = orb.y;

      let collected = false;
      for (const frog of frogs) {
        const fx = frog.x + FROG_SIZE / 2;
        const fy = frog.baseY + FROG_SIZE / 2;
        const dx = fx - ocx;
        const dy = fy - ocy;
        const rad = FROG_SIZE / 2 + ORB_RADIUS;
        if (dx * dx + dy * dy <= rad * rad) {
          collected = true;
          applyBuff(orb.type);
          break;
        }
      }

      if (collected) {
        if (orb.el && orb.el.parentNode === container) {
          container.removeChild(orb.el);
        }
        orbs.splice(i, 1);
      }
    }
  }

  // -----------------------------
  // SNAKE
  // -----------------------------
  const SNAKE_SEGMENT_SIZE  = 48;
  const SNAKE_BASE_SPEED    = 90;
  const SNAKE_TURN_RATE     = Math.PI * 1.5;
  const SNAKE_SEGMENT_GAP   = 24; // more spacing between segments
  const SNAKE_INITIAL_SEGMENTS = 6;

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
    headEl.style.backgroundImage = "url(/snake/head.png)";
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
  }

  function growSnake(extraSegments) {
    if (!snake) return;
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
      segEl.style.backgroundImage = "url(/snake/body.png)";
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
  }

  function updateSnake(dt, width, height) {
    if (!snake) return;

    const marginX = 8;
    const marginY = 24;

    const head = snake.head;
    if (!head) return;

    // Pick nearest frog as target
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
      // snake is confused: wander erratically
      desiredAngle = head.angle + (Math.random() - 0.5) * Math.PI;
      targetFrog = null;
    } else if (targetFrog) {
      const fx = targetFrog.x + FROG_SIZE / 2;
      const fy = targetFrog.baseY + FROG_SIZE / 2;
      desiredAngle = Math.atan2(fy - head.y, fx - head.x);
    } else {
      desiredAngle += (Math.random() - 0.5) * dt;
    }

    let angleDiff =
      ((desiredAngle - head.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const maxTurn = SNAKE_TURN_RATE * dt;
    if (angleDiff > maxTurn) angleDiff = maxTurn;
    if (angleDiff < -maxTurn) angleDiff = -maxTurn;
    head.angle += angleDiff;

    const speedFactor = getSnakeSpeedFactor();
    const speed = SNAKE_BASE_SPEED * speedFactor * (0.8 + Math.random() * 0.4);
    head.x += Math.cos(head.angle) * speed * dt;
    head.y += Math.sin(head.angle) * speed * dt;

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

    snake.path.unshift({ x: head.x, y: head.y });
    const maxPathLength =
      (snake.segments.length + 2) * SNAKE_SEGMENT_GAP + 2;
    while (snake.path.length > maxPathLength) {
      snake.path.pop();
    }

    const shrinkScale = snakeShrinkTime > 0 ? 0.8 : 1.0;

    head.el.style.transform =
      `translate3d(${head.x}px, ${head.y}px, 0) rotate(${head.angle}rad) scale(${shrinkScale})`;

    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      const idx = Math.min(
        snake.path.length - 1,
        (i + 1) * SNAKE_SEGMENT_GAP
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

    // Frog collisions
    const eatRadius = getSnakeEatRadius();
    const eatR2 = eatRadius * eatRadius;

    for (let i = frogs.length - 1; i >= 0; i--) {
      const frog = frogs[i];
      if (!frog || !frog.el) continue;

      const fx = frog.x + FROG_SIZE / 2;
      const fy = frog.baseY + FROG_SIZE / 2;
      const dx = fx - head.x;
      const dy = fy - head.y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= eatR2) {
        if (frogShieldTime > 0) {
          // shield active: snake can't eat right now
          continue;
        }

        if (frog.el.parentNode === container) {
          container.removeChild(frog.el);
        }
        frogs.splice(i, 1);

        playSnakeMunch();
        playFrogDeath();
        growSnake(1);
      }
    }
  }

  // -----------------------------
  // PERMANENT UPGRADE OVERLAY
  // -----------------------------
  function ensureUpgradeOverlay() {
    if (upgradeOverlay) return;

    upgradeOverlay = document.createElement("div");
    upgradeOverlay.style.position = "absolute";
    upgradeOverlay.style.inset = "0";
    upgradeOverlay.style.background = "rgba(0,0,0,0.7)";
    upgradeOverlay.style.display = "none";
    upgradeOverlay.style.zIndex = "150";
    upgradeOverlay.style.display = "flex";
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

    const title = document.createElement("div");
    title.textContent = "Choose a permanent upgrade";
    title.style.marginBottom = "12px";
    title.style.fontSize = "14px";

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexDirection = "column";
    buttonsContainer.style.gap = "8px";

    function makeButton(label, onClick) {
      const btn = document.createElement("button");
      btn.textContent = label;
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
        onClick();
        closeUpgradeOverlay();
      };
      return btn;
    }

    const btnSpeed = makeButton(
      "Frogs hop a bit faster forever",
      () => { frogPermanentSpeedFactor *= 0.9; }
    );

    const btnJump = makeButton(
      "Frogs jump higher forever",
      () => { frogPermanentJumpFactor *= 1.25; }
    );

    const btnSpawn = makeButton(
      "Spawn 20 frogs right now",
      () => { spawnExtraFrogs(20); }
    );

    buttonsContainer.appendChild(btnSpeed);
    buttonsContainer.appendChild(btnJump);
    buttonsContainer.appendChild(btnSpawn);

    panel.appendChild(title);
    panel.appendChild(buttonsContainer);
    upgradeOverlay.appendChild(panel);
    container.appendChild(upgradeOverlay);
  }

  function openUpgradeOverlay() {
    ensureUpgradeOverlay();
    gamePaused = true;
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "flex";
    }
  }

  function closeUpgradeOverlay() {
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "none";
    }
    gamePaused = false;
    nextPermanentChoiceTime += 60;
    playPermanentChoiceSound();
  }

  // -----------------------------
  // GAME LOOP
  // -----------------------------
  function endGame() {
    gameOver = true;

    // capture last run
    lastRunTime  = elapsedTime;
    lastRunScore = score;

    // submit score, then show scoreboard overlay + refresh mini leaderboard
    (async () => {
      const topList = await submitScoreToServer(lastRunScore, lastRunTime)
                    || await fetchLeaderboard()
                    || [];

      // 🔹 update the small HUD leaderboard
      updateMiniLeaderboard(topList);

      // 🔹 open the big end-of-run overlay
      openScoreboardOverlay(topList);
    })();

    showGameOver();
  }

  function restartGame() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    for (const frog of frogs) {
      if (frog.el && frog.el.parentNode === container) {
        container.removeChild(frog.el);
      }
    }
    frogs = [];

    for (const orb of orbs) {
      if (orb.el && orb.el.parentNode === container) {
        container.removeChild(orb.el);
      }
    }
    orbs = [];

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

    elapsedTime   = 0;
    lastTime      = 0;
    gameOver      = false;
    gamePaused    = false;
    score         = 0;
    nextOrbTime   = 0;
    mouse.follow  = false;
    nextPermanentChoiceTime = 60;

    speedBuffTime = jumpBuffTime = 0;
    snakeSlowTime = snakeConfuseTime = snakeShrinkTime = 0;
    frogShieldTime = timeSlowTime = orbMagnetTime = 0;
    scoreMultiTime = panicHopTime = 0;

    frogPermanentSpeedFactor = 1.0;
    frogPermanentJumpFactor  = 1.0;

    hideGameOver();
    if (upgradeOverlay) upgradeOverlay.style.display = "none";

    const width  = window.innerWidth;
    const height = window.innerHeight;

    createInitialFrogs(width, height).then(() => {});
    initSnake(width, height);
    updateHUD();

    animId = requestAnimationFrame(drawFrame);
  }

  function drawFrame(time) {
    const width  = window.innerWidth;
    const height = window.innerHeight;

    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!gameOver) {
      if (!gamePaused) {
        elapsedTime += dt;

        // minute-based permanent upgrade pause
        if (elapsedTime >= nextPermanentChoiceTime) {
          openUpgradeOverlay();
        } else {
          updateBuffTimers(dt);

          // time slow: only snake + orbs
          const slowFactor = timeSlowTime > 0 ? 0.4 : 1.0;

          updateFrogs(dt, width, height);
          updateSnake(dt * slowFactor, width, height);
          updateOrbs(dt * slowFactor);

          // score (buff affects score per second)
          const scoreFactor = scoreMultiTime > 0 ? 2 : 1;
          score += dt * scoreFactor;

          nextOrbTime -= dt;
          if (nextOrbTime <= 0) {
            spawnOrbRandom(width, height);
            nextOrbTime = randRange(ORB_SPAWN_INTERVAL_MIN, ORB_SPAWN_INTERVAL_MAX);
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

  // -----------------------------
  // INIT
  // -----------------------------
async function startGame() {
  initAudio();
  ensureUpgradeOverlay();
  ensureScoreboardOverlay();

  // 🔹 load leaderboard once when the game boots
  const topList = await fetchLeaderboard();
  if (topList) updateMiniLeaderboard(topList);

  const width  = window.innerWidth;
  const height = window.innerHeight;

  await createInitialFrogs(width, height);
  initSnake(width, height);

  nextOrbTime = randRange(ORB_SPAWN_INTERVAL_MIN, ORB_SPAWN_INTERVAL_MAX);
  updateHUD();
  animId = requestAnimationFrame(drawFrame);
}

  window.addEventListener("load", startGame);
})();
