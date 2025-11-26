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
  let animId = null;
  let lastTime = 0;

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
  // Public API (still works if you want it)
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
  // Create random base frogs
  // -----------------------------
  async function createFrogs(width, height) {
    frogs = [];
    container.innerHTML = "";

    const positions = computeFrogPositions(width, height);
    const tokenIds  = pickRandomTokenIds(positions.length);

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const tokenId = tokenIds[i];

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

    await createFrogs(width, height);
    animId = requestAnimationFrame(drawFrame);
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", resetAndStart);
})();
