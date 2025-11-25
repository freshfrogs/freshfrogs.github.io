// assets/scatter-frogs.js
(function () {
  const FROG_SIZE   = 64;
  const BUILD_BASE  = "/frog/build_files";
  const MAX_MORPHS  = 150;
  const MAX_SCATTER = 150;

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


  const container = document.getElementById("frog-bg");
  if (!container) return;

  let frogs = [];
  let animId = null;
  let lastTime = 0;

  // Where frogs drift after clicks / events
  const target = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false
  };

  // Scroll parallax + group-hop throttle
  let scrollOffsetY = 0;
  let lastScrollY = window.scrollY || 0;
  let lastGroupHopTime = 0;

  // Trait types to skip (avoids drawing backgrounds)
  const SKIP_TRAITS = new Set([
    "Background",
    "background",
    "BG",
    "Bg"
  ]);

  // -----------------------------
  // Public API (for site.js / morph.js)
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

    // don't spam
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
    }
  }

  // expose a few hooks globally
  window.ffScatterFrogsGoto = function (nx, ny) {
    setTargetNormalized(nx, ny);
  };
  window.ffScatterFrogsGotoMorph = function () {
    // drift toward right-center (morph panel-ish)
    setTargetNormalized(0.8, 0.45);
    triggerGroupHop("morph-view");
  };
  window.ffScatterFrogsGotoPond = function () {
    // drift toward bottom-center (pond vibe)
    setTargetNormalized(0.5, 0.85);
    triggerGroupHop("pond-view");
  };
  window.ffScatterFrogsGotoCenter = function () {
    setTargetNormalized(0.5, 0.5);
  };
  window.ffScatterFrogsCelebrateMorph = function (meta) {
    // drift upward and do a celebration burst
    setTargetNormalized(0.5, 0.3);
    triggerGroupHop("new-morph");
  };

  // -----------------------------
  // Global events
  // -----------------------------

  // Click: set target + nearest frog big-hop
  window.addEventListener("click", (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    target.x = clickX;
    target.y = clickY;
    target.active = true;

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
    }
  });

  // Scroll: parallax + group hops at top/bottom
  window.addEventListener("scroll", () => {
    const y = window.scrollY || 0;
    const dy = y - lastScrollY;
    lastScrollY = y;

    // subtle parallax
    scrollOffsetY -= dy * 0.15;
    const maxOffset = 80;
    if (scrollOffsetY > maxOffset) scrollOffsetY = maxOffset;
    if (scrollOffsetY < -maxOffset) scrollOffsetY = -maxOffset;

    const doc = document.documentElement || document.body;
    const maxScroll = (doc.scrollHeight - doc.clientHeight) || 0;
    if (maxScroll > 0) {
      const atTop = y <= 5;
      const atBottom = y + 5 >= maxScroll;
      if (atTop) {
        triggerGroupHop("scroll-top");
      } else if (atBottom) {
        triggerGroupHop("scroll-bottom");
      }
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

  function computeFrogPositions(width, height, maxCountOverride) {
    const area = width * height;
    const maxFrogs = typeof maxCountOverride === "number"
      ? maxCountOverride
      : 120;

    const approxPerFrogArea = (FROG_SIZE * FROG_SIZE) * 5;
    let targetCount = Math.floor(area / approxPerFrogArea);
    targetCount = Math.max(15, Math.min(maxFrogs, targetCount));

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

  async function fetchMorphedMetadata(limit) {
    try {
      if (typeof window.ffFetchRecentMorphedFrogs === "function") {
        // uses your worker via the function from site.js
        return await window.ffFetchRecentMorphedFrogs(limit);
      }
    } catch (err) {
      console.warn("fetchMorphedMetadata failed:", err);
    }
    return [];
  }

  // Load a single trait image as <img>, trying GIF first only if value is in SCATTER_ANIMATED_VALUES
  async function loadTraitImage(traitType, value) {
    const v = String(value); // exact metadata value
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
      if (SKIP_TRAITS.has(traitType)) continue; // don't draw backgrounds

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
  // Create frogs from morphed metadata
  // -----------------------------
  async function createFrogs(width, height) {
    frogs = [];
    container.innerHTML = "";

    const morphMetas = await fetchMorphedMetadata(MAX_MORPHS);
    if (!morphMetas.length) {
      console.warn("No morphed frogs returned for scatter background.");
      return;
    }

    const maxScatter = Math.min(morphMetas.length, MAX_SCATTER);
    const positions = computeFrogPositions(width, height, maxScatter);
    const count = Math.min(positions.length, morphMetas.length);

    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      const meta = morphMetas[i];

      const el = document.createElement("div");
      el.className = "frog-sprite";
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      container.appendChild(el);

      const personalityRoll = Math.random();
      let idleMin, idleMax, hopMin, hopMax, heightMin, heightMax, vxRange;

      if (personalityRoll < 0.25) {
        // hyper
        idleMin = 0.3; idleMax = 1.0;
        hopMin = 0.25; hopMax = 0.55;
        heightMin = 14; heightMax = 48;
        vxRange = 20;
      } else if (personalityRoll < 0.6) {
        // normal
        idleMin = 0.8; idleMax = 3.0;
        hopMin = 0.35; hopMax = 0.7;
        heightMin = 10; heightMax = 26;
        vxRange = 12;
      } else {
        // lazy
        idleMin = 2.0; idleMax = 5.0;
        hopMin = 0.45; hopMax = 0.9;
        heightMin = 6;  heightMax = 20;
        vxRange = 8;
      }

      const frog = {
        meta,
        el,
        x: pos.x,
        y: pos.y,
        baseY: pos.y,
        vx: randRange(-vxRange, vxRange),
        seekFactorX: randRange(0.05, 0.15),
        seekFactorY: randRange(0.03, 0.08),

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
      // build its layered morph (traits) asynchronously
      buildLayersForFrog(frog, meta).catch(() => {});
    }
  }

  // -----------------------------
  // Animation
  // -----------------------------
  function updateFrogs(dt, width, height) {
    for (const frog of frogs) {
      const centerX = frog.x + FROG_SIZE / 2;
      const centerBaseY = frog.baseY + FROG_SIZE / 2;

      // Drift toward last target (click / nav / morph)
      if (target.active) {
        const dx = target.x - centerX;
        const dy = target.y - centerBaseY;
        frog.x     += dx * frog.seekFactorX * dt;
        frog.baseY += dy * frog.seekFactorY * dt;
      }

      // small sideways drift
      frog.x += frog.vx * dt * 0.3;
      if (frog.x < -FROG_SIZE * 0.25) {
        frog.x = -FROG_SIZE * 0.25;
        frog.vx *= -1;
      } else if (frog.x > width - FROG_SIZE * 0.75) {
        frog.x = width - FROG_SIZE * 0.75;
        frog.vx *= -1;
      }

      // clamp vertical
      const marginY = 24;
      frog.baseY = Math.max(
        marginY,
        Math.min(height - marginY - FROG_SIZE, frog.baseY)
      );

      // idle / hopping behavior
      if (frog.state === "idle") {
        frog.idleTime -= dt;
        frog.y = frog.baseY;

        if (frog.idleTime <= 0) {
          frog.state = "hopping";
          frog.hopTime = 0;
          frog.hopDuration = randRange(frog.hopDurMin, frog.hopDurMax);

          const spice = Math.random();
          if (spice < 0.1) {
            frog.hopHeight = randRange(frog.hopHeightMax * 1.1, frog.hopHeightMax * 1.8);
          } else if (spice < 0.25) {
            frog.hopHeight = randRange(2, frog.hopHeightMin * 0.7);
          } else {
            frog.hopHeight = randRange(frog.hopHeightMin, frog.hopHeightMax);
          }
        }
      } else if (frog.state === "hopping") {
        frog.hopTime += dt;
        const t = Math.min(1, frog.hopTime / frog.hopDuration);

        const offset = -4 * frog.hopHeight * t * (1 - t);
        frog.y = frog.baseY + offset;

        if (frog.hopTime >= frog.hopDuration) {
          frog.state = "idle";
          frog.idleTime = randRange(frog.idleMin, frog.idleMax);
          frog.y = frog.baseY;
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

    await createFrogs(width, height);
    animId = requestAnimationFrame(drawFrame);
  }

  function setupNavScatterHooks() {
    const navLinks = document.querySelectorAll("nav a[data-view]");
    if (!navLinks.length) return;

    navLinks.forEach((link) => {
      const view = link.getAttribute("data-view");
      if (!view) return;

      link.addEventListener(
        "click",
        () => {
          // Only do the animation if the scatter has already started
          if (!frogs.length) return;

          switch (view) {
            case "collection":
              // center of the screen
              if (window.ffScatterFrogsGotoCenter) {
                window.ffScatterFrogsGotoCenter();
              }
              break;

            case "rarity":
              // bias a bit left/top for a different feel
              if (window.ffScatterFrogsGoto) {
                window.ffScatterFrogsGoto(0.25, 0.35);
              }
              break;

            case "pond":
              if (window.ffScatterFrogsGotoPond) {
                window.ffScatterFrogsGotoPond();
              }
              break;

            case "morph":
              if (window.ffScatterFrogsGotoMorph) {
                window.ffScatterFrogsGotoMorph();
              }
              break;

            case "wallet":
              if (window.ffScatterFrogsGoto) {
                // drift toward upper-left (wallet panel vibe)
                window.ffScatterFrogsGoto(0.18, 0.3);
              }
              break;
          }
        },
        { passive: true }
      );
    });
  }

  window.addEventListener("resize", resetAndStart);
  window.addEventListener("load", function () {
    resetAndStart();
    setupNavScatterHooks();
  });
})();

