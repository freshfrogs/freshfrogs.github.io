// frog-game-ui.js
// HUD, mini leaderboard, and Game Over banner.

(function () {
  const State = window.FrogGameState;
  const Config = window.FrogGameConfig;

  if (!State || !Config) return;

  function formatTime(t) {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  }

  function initHUD(container) {
    State.container = container;

    // HUD
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

    // mini leaderboard (same id & look as before)
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

    // Game over banner (same copy)
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

    // store references in global state
    State.hud = hud;
    State.timerLabel = timerLabel;
    State.frogsLabel = frogsLabel;
    State.scoreLabel = scoreLabel;
    State.miniBoard = miniBoard;
    State.gameOverBanner = gameOverBanner;
  }

  function updateHUD() {
    if (!State.timerLabel || !State.frogsLabel || !State.scoreLabel) return;

    State.timerLabel.textContent = `Time: ${formatTime(State.elapsedTime)}`;
    State.frogsLabel.textContent = `Frogs left: ${State.frogs.length}`;
    State.scoreLabel.textContent = `Score: ${Math.floor(State.score)}`;
  }

  function showGameOver() {
    if (State.gameOverBanner) {
      State.gameOverBanner.style.display = "block";
    }
  }

  function hideGameOver() {
    if (State.gameOverBanner) {
      State.gameOverBanner.style.display = "none";
    }
  }

  window.FrogGameUI = {
    initHUD,
    updateHUD,
    showGameOver,
    hideGameOver,
  };
})();
