// frog-game-main.js
(function () {
  "use strict";

  const AudioMod = window.FrogGameAudio || {};
  const LMod = window.FrogGameLeaderboard || {};
  const UI = window.FrogGameUI;
  const State = window.FrogGameState;
  const Config = window.FrogGameConfig;

  const initAudio = AudioMod.initAudio || function () {};
  const playRandomRibbit = AudioMod.playRandomRibbit || function () {};
  // ...keep the rest of your audio hooks exactly as-is...

  const initLeaderboard = LMod.initLeaderboard || function () {};
  const submitScoreToServer = LMod.submitScoreToServer || (async () => null);
  const fetchLeaderboard = LMod.fetchLeaderboard || (async () => null);
  const updateMiniLeaderboard = LMod.updateMiniLeaderboard || function () {};
  const openScoreboardOverlay = LMod.openScoreboardOverlay || function () {};
  const hideScoreboardOverlay = LMod.hideScoreboardOverlay || function () {};

  // hook mouse just like before, but update State.mouse
  window.addEventListener("mousemove", (e) => {
    State.mouse.x = e.clientX;
    State.mouse.y = e.clientY;
    State.mouse.active = true;
  });

  window.addEventListener("click", () => {
    if (State.gameOver) {
      window.FrogGameLogic.restartGame(); // exported from your logic module
      return;
    }
    State.mouse.follow = true;
  });

  async function startGame() {
    const container = document.getElementById("frog-game");
    if (!container) return;
    State.container = container;

    initAudio();
    initLeaderboard(container);
    UI.initHUD(container);

    // Set initial shed timers based on config
    State.nextShedTime = Config.SHED_INTERVAL;
    State.snakeTurnRate = Config.SNAKE_TURN_RATE_BASE;

    const topList = await fetchLeaderboard();
    if (topList) {
      updateMiniLeaderboard(topList);
      State.infoLeaderboardData = topList;
    } else {
      State.infoLeaderboardData = [];
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    await window.FrogGameEntities.createInitialFrogs(width, height);
    window.FrogGameEntities.initSnake(width, height);

    window.FrogGameLogic.setNextOrbTime();
    UI.updateHUD();

    if (!State.hasShownHowToOverlay) {
      State.hasShownHowToOverlay = true;
      window.FrogGameInfo.openInfoOverlay(0);
    } else {
      window.FrogGameUpgrades.openUpgradeOverlay("normal");
    }

    State.animId = requestAnimationFrame(window.FrogGameLogic.drawFrame);
  }

  window.addEventListener("load", startGame);
  window.FrogGameMain = { startGame };
})();
