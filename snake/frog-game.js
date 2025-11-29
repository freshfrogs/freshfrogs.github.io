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
  const getCurrentUserLabel    = LMod.getCurrentUserLabel    || function(){ return null; };

  // --------------------------------------------------
  // CONSTANTS & CONFIG
  // --------------------------------------------------
  const BASE_FROG_COUNT          = 25;
  const MAX_FROGS                = 450;
  const NORMAL_SPAWN_AMOUNT      = 20;
  const EPIC_SPAWN_AMOUNT        = 50;

  // Orb / buff settings
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

  // time based scoring
  const SCORE_PER_FROG_ALIVE     = 0.02;

  // After 50 segments, enable decapitated buff chance
  const DECAP_START_LENGTH       = 50;
  const DECAP_INITIAL_CHANCE     = 0.01;
  const DECAP_CHANCE_INCREMENT   = 0.0005;
  const DECAP_MAX_CHANCE         = 0.11;

  const GAME_SCALE_MAX           = 1.0;
  const GAME_SCALE_MIN           = 0.5;
  const GAME_DESIGN_WIDTH        = 1280;
  const GAME_DESIGN_HEIGHT       = 720;

  // Sheds every 5 minutes
  const SHED_INTERVAL = 300; // 5 minutes

  let legendaryEventTriggered = false;

  let infoOverlay = null;
  let infoPage = 0;
  let infoContentEl = null;
  let infoPageLabel = null;
  let infoPrevBtn = null;
  let infoNextBtn = null;
  let infoLeaderboardData = [];
  // After showing the info/readme at the start, open the first common upgrade
  let pendingInitialUpgradeAfterInfo = false;

  // Shed state
  let snakeShedStage   = 0;          // 0 = base, 1 = yellow, 2 = orange, 3+ = red
  let snakeShedCount   = 0;          // how many times we've shed this run
  let nextShedTime     = SHED_INTERVAL;

  let snakeEggPending = false; // EPIC: next shed uses reduced speed bonus
  let epicChainPending = false;

  // Old snakes that are despawning chunk-by-chunk
  let dyingSnakes = [];

  // ...
  // [SNIP: all the existing game logic stays exactly the same here –
  // frogs, snake movement, orbs, buffs, upgrades, HUD, etc.]
  // I am only changing the READ MORE / INFO overlay section below.
  // ...

  // --------------------------------------------------
  // HOW-TO OVERLAY (kept but not auto-opened)
  // --------------------------------------------------
  // (unchanged existing howToOverlay / buff guide declarations and functions)
  // ...

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

  // clicking dark background closes
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      closeInfoOverlay();
    }
  });

  // append to BODY (not scaled container)
  (document.body || container).appendChild(infoOverlay);

  setInfoPage(0);
}

function setInfoPage(pageIndex) {
  if (!infoContentEl || !infoPageLabel) return;
  const neon = "#4defff";

  // Single page now: run summary only
  infoPage = 0;

  let html = "";

  // Match summary pulled from stored leaderboard + this session
  const list = Array.isArray(infoLeaderboardData) ? infoLeaderboardData : [];
  const userLabel = (typeof getCurrentUserLabel === "function")
    ? getCurrentUserLabel()
    : null;

  // Find this user's row in the leaderboard, if any
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

  // See if we have a last run from this session
  const hasSessionRun =
    (typeof lastRunScore === "number" && lastRunScore > 0) ||
    (typeof lastRunTime === "number" && lastRunTime > 0);

  if (!hasSessionRun && !meRow) {
    // No data yet
    html += `
      <div style="font-size:13px; line-height:1.5;">
        <b>No runs recorded yet</b><br>
        No previous runs yet for this tag.<br>
        Start a game and try to keep your frogs alive as long as possible!
      </div>
    `;
  } else {
    // Decide what numbers to show:
    // 1) Prefer this-session last run if available
    // 2) Otherwise fall back to best known run from leaderboard
    let displayScore = 0;
    let displaySecs  = 0;

    if (hasSessionRun) {
      displayScore = lastRunScore || 0;
      displaySecs  = Math.max(0, lastRunTime || 0);
    } else if (meRow && typeof meRow === "object") {
      // Best guess for fields coming from the worker
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

    // Fallback if everything is zero
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
  gamePaused = true; // pause game while info is open

  setInfoPage(0);

  if (infoOverlay) {
    infoOverlay.style.display = "flex";
  }
}

function closeInfoOverlay() {
  if (infoOverlay) {
    infoOverlay.style.display = "none";
  }

  // If this was the initial panel shown at the very start of the run,
  // immediately open the first common upgrade instead of unpausing.
  if (pendingInitialUpgradeAfterInfo && !initialUpgradeDone) {
    pendingInitialUpgradeAfterInfo = false;

    // Keep the game effectively paused; the upgrade overlay also pauses.
    openUpgradeOverlay("normal");
  } else {
    // Normal case: just resume the game
    gamePaused = false;
  }
}

  // --------------------------------------------------
  // BUFF GUIDE OVERLAY (left as-is but only reachable via "Learn buffs" button)
  // --------------------------------------------------
  // function ensureBuffGuideOverlay() { ... }
  // function setBuffGuidePage(pageIndex) { ... }
  // function openBuffGuideOverlay() { ... }
  // function closeBuffGuideOverlay() { ... }
  // [unchanged existing buff guide code continues here]

  // ...
  // [Rest of your existing frog-game.js: game loop, startGame(), etc.]
  // ...

  async function startGame() {
    const container = document.getElementById("frog-game");
    if (!container) return;

    // init leaderboard + audio, set up canvas, etc…
    // [unchanged setup code]

    // create and attach mini leaderboard & info summary panel data
    applyGameScale();

    // Fetch leaderboard so we can populate the mini board and Run Summary page
    const topList = await fetchLeaderboard();
    if (topList) {
      updateMiniLeaderboard(topList);
      infoLeaderboardData = Array.isArray(topList) ? topList : [];
    } else {
      infoLeaderboardData = [];
    }

    const width  = getGameWidth();
    const height = getGameHeight();

    await createInitialFrogs(width, height);
    initSnake(width, height);

    setNextOrbTime();
    updateHUD();

    // At very first run: show centered summary at the beginning of the game
    if (!hasShownHowToOverlay) {
      hasShownHowToOverlay = true;
      pendingInitialUpgradeAfterInfo = true;
      openInfoOverlay(0); // now just shows the summary page
    } else {
      // On later runs, skip straight to first common upgrade.
      openUpgradeOverlay("normal");
    }

    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", () => {
    applyGameScale();
  });

  window.addEventListener("load", startGame);
})();
