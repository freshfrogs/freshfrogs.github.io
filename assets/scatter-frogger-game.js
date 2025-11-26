// assets/scatter-frogger-game.js
(function () {
  const SAFE_ZONE_HEIGHT = 100;   // top rescue strip (px from top of #frog-bg)
  const START_ZONE_HEIGHT = 140;  // bottom-ish area frogs usually spawn in
  const LANES = 4;
  const HAZARDS_PER_LANE = 4;

  let frogs = [];   // { el, alive, rescued }
  let hazards = []; // { el, x, y, w, dir, speed }

  let savedCount = 0;
  let lostCount = 0;
  let aliveCount = 0;
  let gameOver = false;
  let lastTime = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function initGame() {
    const container = document.getElementById("frog-bg");
    if (!container) return;

    // Grab whatever scatter-frogs.js created
    const frogNodes = Array.from(container.querySelectorAll(".frog-sprite"));
    if (!frogNodes.length) {
      // If scatter hasn't run yet, wait a tick
      setTimeout(initGame, 150);
      return;
    }

    frogs = frogNodes.map(el => ({
      el,
      alive: true,
      rescued: false
    }));

    aliveCount = frogs.length;
    updateHUD();

    // Build hazards
    createHazards(container);

    // Fire a synthetic click once to put scatter-frogs into "follow mouse" mode
    try {
      const ev = new MouseEvent("click", {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
        bubbles: true
      });
      window.dispatchEvent(ev);
    } catch (e) {
      // Ignore if synthetic event fails; user click will still trigger follow
    }

    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function createHazards(container) {
    hazards = [];
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    const laneAreaHeight = height - SAFE_ZONE_HEIGHT - START_ZONE_HEIGHT;
    const laneSpacing = laneAreaHeight / LANES;

    for (let lane = 0; lane < LANES; lane++) {
      const laneY = SAFE_ZONE_HEIGHT + lane * laneSpacing + laneSpacing / 2;
      const dir = lane % 2 === 0 ? 1 : -1;
      const baseSpeed = 60 + Math.random() * 70; // px/sec

      for (let i = 0; i < HAZARDS_PER_LANE; i++) {
        const w = 80 + Math.random() * 120;
        const x = Math.random() * width;

        const el = document.createElement("div");
        el.className = "frogger-hazard";
        el.style.width = w + "px";
        el.style.left = x + "px";
        el.style.top = laneY + "px";

        container.appendChild(el);

        hazards.push({
          el,
          x,
          y: laneY,
          w,
          dir,
          speed: baseSpeed * (0.8 + Math.random() * 0.6)
        });
      }
    }
  }

  function loop(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!gameOver) {
      updateHazards(dt);
      checkCollisions();
    }

    requestAnimationFrame(loop);
  }

  function updateHazards(dt) {
    const container = document.getElementById("frog-bg");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;

    for (const h of hazards) {
      h.x += h.dir * h.speed * dt;

      if (h.dir > 0 && h.x > width + 60) {
        h.x = -h.w - 60;
      } else if (h.dir < 0 && h.x + h.w < -60) {
        h.x = width + 60;
      }

      h.el.style.left = h.x + "px";
    }
  }

  function rectsOverlap(a, b) {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  function checkCollisions() {
    const container = document.getElementById("frog-bg");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const safeTopY = containerRect.top + SAFE_ZONE_HEIGHT;

    const hazardRects = hazards.map(h => ({
      h,
      rect: h.el.getBoundingClientRect()
    }));

    for (const f of frogs) {
      if (!f.alive || f.rescued) continue;

      const r = f.el.getBoundingClientRect();

      // Saved if they reach the safe top zone
      if (r.top <= safeTopY) {
        f.rescued = true;
        aliveCount--;
        savedCount++;
        f.el.classList.add("frog-rescued");
        updateHUD();
        if (aliveCount <= 0) endGame();
        continue;
      }

      // Check hazards
      for (const hr of hazardRects) {
        if (rectsOverlap(r, hr.rect)) {
          f.alive = false;
          aliveCount--;
          lostCount++;
          f.el.classList.add("frog-lost");
          updateHUD();
          if (aliveCount <= 0) endGame();
          break;
        }
      }
    }
  }

  function updateHUD() {
    const savedEl = $("frogger-saved");
    const lostEl  = $("frogger-lost");
    const leftEl  = $("frogger-left");
    if (savedEl) savedEl.textContent = savedCount;
    if (lostEl)  lostEl.textContent  = lostCount;
    if (leftEl)  leftEl.textContent  = aliveCount;
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;

    const overlay = $("frogger-overlay");
    const inner   = $("frogger-overlay-inner");
    if (!overlay || !inner) return;

    inner.innerHTML = `
      <h1>All Frogs Accounted For</h1>
      <p>
        Saved: <strong>${savedCount}</strong><br/>
        Lost: <strong>${lostCount}</strong>
      </p>
      <button id="frogger-restart">Play Again</button>
    `;

    overlay.classList.add("visible");

    const btn = document.getElementById("frogger-restart");
    if (btn) {
      btn.addEventListener("click", () => {
        // easiest, keeps scatter behaviour identical
        window.location.reload();
      });
    }
  }

  window.addEventListener("load", initGame);
})();
