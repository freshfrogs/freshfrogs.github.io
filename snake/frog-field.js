// /snake/frog-field.js
(function (global) {
  const Meta = global.SnakeFrogMeta;
  if (!Meta) {
    console.error("SnakeFrogMeta missing; SnakeFrogField disabled.");
    return;
  }

  const FROG_SIZE          = Meta.FROG_SIZE;
  const MAX_TOKEN_ID       = Meta.MAX_TOKEN_ID;
  const loadAndApplyFrog   = Meta.loadAndApplyMetadata;

  const container = document.getElementById("frog-bg");
  if (!container) {
    console.warn("No #frog-bg container found; SnakeFrogField disabled.");
    return;
  }

  const frogs = [];
  let scrollOffsetY = 0;

  const mouse = {
    x: 0,
    y: 0,
    follow: false,
    active: false
  };

  // Hook mouse so frogs can follow
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  window.addEventListener("mousedown", () => {
    mouse.follow = true;
  });
  window.addEventListener("mouseup", () => {
    mouse.follow = false;
  });

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function computeFrogPositions(width, height, count) {
    const positions = [];
    const MIN_DIST = 52;
    const margin = 16;
    let safety = count * 60;

    while (positions.length < count && safety-- > 0) {
      const x = margin + Math.random() * (width - margin * 2 - FROG_SIZE);
      const y = margin + Math.random() * (height - margin * 2 - FROG_SIZE);
      const cx = x + FROG_SIZE / 2;
      const cy = y + FROG_SIZE / 2;

      let ok = true;
      for (const p of positions) {
        const px = p.x + FROG_SIZE / 2;
        const py = p.y + FROG_SIZE / 2;
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) positions.push({ x, y });
    }

    return positions;
  }

  function pickRandomTokenIds(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(1 + Math.floor(Math.random() * MAX_TOKEN_ID));
    }
    return ids;
  }

  function createFrogs(width, height, count) {
    frogs.length = 0;
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height, count);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";
      el.style.position = "absolute";
      el.style.width    = FROG_SIZE + "px";
      el.style.height   = FROG_SIZE + "px";
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      container.appendChild(el);

      // Personality for hop timing
      const roll = Math.random();
      let idleMin, idleMax, hopMin, hopMax, heightMin, heightMax;
      if (roll < 0.25) {
        idleMin = 0.3; idleMax = 1.0;
        hopMin  = 0.25; hopMax = 0.55;
        heightMin = 14; heightMax = 32;
      } else if (roll < 0.6) {
        idleMin = 0.8; idleMax = 3.0;
        hopMin  = 0.35; hopMax = 0.7;
        heightMin = 10; heightMax = 26;
      } else {
        idleMin = 1.5; idleMax = 4.5;
        hopMin  = 0.45; hopMax = 0.9;
        heightMin = 6;  heightMax = 20;
      }

      const frog = {
        tokenId,
        el,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,

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
      // Async load of /frog/json/{id}.json and build layers
      loadAndApplyFrog(frog);
    }
  }

  function chooseHopDestination(frog, width, height) {
    const marginY = 24;
    const marginX = 8;
    const maxStep = 40;

    let targetX = frog.x;
    let targetBaseY = frog.baseY;

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
      targetX    = frog.x + randRange(-12, 12);
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

  let hopSoundFn = null;
  function setHopSound(fn) {
    hopSoundFn = typeof fn === "function" ? fn : null;
  }

  // buffState: { hopDurationMul, idleTimeMul, hopHeightMul }
  function updateFrogs(dt, width, height, buffState) {
    const marginY = 24;
    const marginX = 8;

    const hopDurationMul = buffState && buffState.hopDurationMul || 1;
    const idleTimeMul    = buffState && buffState.idleTimeMul    || 1;
    const hopHeightMul   = buffState && buffState.hopHeightMul   || 1;

    for (const frog of frogs) {
      if (frog.state === "idle") {
        frog.idleTime -= dt;
        frog.y = frog.baseY;

        if (frog.idleTime <= 0) {
          frog.state = "hopping";
          frog.hopTime = 0;

          let hopDuration = randRange(frog.hopDurMin, frog.hopDurMax);
          hopDuration *= hopDurationMul;
          frog.hopDuration = hopDuration;

          const spice = Math.random();
          let hopHeight;
          if (spice < 0.1) {
            hopHeight = randRange(frog.hopHeightMax * 1.1, frog.hopHeightMax * 1.8);
          } else if (spice < 0.25) {
            hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }
          hopHeight *= hopHeightMul;
          frog.hopHeight = hopHeight;

          if (hopSoundFn) hopSoundFn();

          chooseHopDestination(frog, width, height);
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const t = Math.min(1, frog.hopTime / frog.hopDuration);

        const groundX =
          frog.hopStartX + (frog.hopEndX - frog.hopStartX) * t;
        const groundBaseY =
          frog.hopStartBaseY + (frog.hopEndBaseY - frog.hopStartBaseY) * t;

        const offset = -4 * frog.hopHeight * t * (1 - t);

        frog.x = groundX;
        frog.baseY = groundBaseY;
        frog.y = groundBaseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";

          let idleTime = randRange(frog.idleMin, frog.idleMax);
          idleTime *= idleTimeMul;
          frog.idleTime = idleTime;

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

      const renderY = frog.y + scrollOffsetY;
      frog.el.style.transform = `translate3d(${frog.x}px, ${renderY}px, 0)`;
    }
  }

  function setScrollOffsetY(v) {
    scrollOffsetY = v;
  }

  function getScrollOffsetY() {
    return scrollOffsetY;
  }

  global.SnakeFrogField = {
    container,
    frogs,
    mouse,
    createFrogs,
    updateFrogs,
    setScrollOffsetY,
    getScrollOffsetY,
    setHopSound
  };
})(window);
