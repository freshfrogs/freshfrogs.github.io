  // frog-game-main.js
// Main loop + startup.

"use strict";
  
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

  // Show unified info panel once at the start of a fresh run
  if (!hasShownHowToOverlay) {
    hasShownHowToOverlay = true;
    openInfoOverlay(0); // start on leaderboard page
  } else {
    openUpgradeOverlay("normal");
  }

  animId = requestAnimationFrame(drawFrame);
}

  window.addEventListener("load", startGame);