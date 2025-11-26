// /snake/frog-meta.js
(function (global) {
  const FROG_SIZE    = 64;
  const MAX_TOKEN_ID = 4040;
  const META_BASE    = "https://freshfrogs.github.io/frog/json/";
  const META_EXT     = ".json";
  const BUILD_BASE   = "https://freshfrogs.github.io/frog/build_files";

  // Only these trait values have animation variants
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
    "partyHat",
    "sombrero",
    "wizardHatPurple",
    "wizardHatBlue"
  ]);

  // Traits we *don’t* render as layers (background handled by CSS / page)
  const SKIP_TRAITS = new Set([
    "Background",
    "background",
    "BG",
    "Bg"
  ]);

  const metaCache = new Map();
  const traitImageCache = new Map();

  async function fetchMetadata(tokenId) {
    if (metaCache.has(tokenId)) {
      return metaCache.get(tokenId);
    }
    const url = META_BASE + tokenId + META_EXT;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Metadata fetch failed for frog " + tokenId);
    }
    const json = await res.json();
    metaCache.set(tokenId, json);
    return json;
  }

  function traitKey(traitType, value) {
    return String(traitType) + "::" + String(value);
  }

  // Always uses /frog/build_files/... – no IPFS here
  async function loadTraitImage(traitType, value) {
    const v   = String(value);
    const key = traitKey(traitType, v);
    if (traitImageCache.has(key)) {
      return traitImageCache.get(key);
    }

    const pngUrl = `${BUILD_BASE}/${traitType}/${v}.png`;
    const canAnimate = SCATTER_ANIMATED_VALUES.has(v);

    const promise = new Promise((resolve) => {
      // If no animation, just load PNG
      if (!canAnimate) {
        const png = new Image();
        png.decoding = "async";
        png.onload   = () => resolve(png);
        png.onerror  = () => resolve(null);
        png.src      = pngUrl;
        return;
      }

      // Try GIF first, then fall back to PNG
      const gifUrl = `${BUILD_BASE}/${traitType}/animations/${v}_animation.gif`;
      const gif = new Image();
      gif.decoding = "async";
      gif.onload   = () => resolve(gif);
      gif.onerror  = () => {
        const png = new Image();
        png.decoding = "async";
        png.onload   = () => resolve(png);
        png.onerror  = () => resolve(null);
        png.src      = pngUrl;
      };
      gif.src = gifUrl;
    });

    traitImageCache.set(key, promise);
    return promise;
  }

  // Build layered frog from trait images (ignores meta.image / IPFS)
  async function buildLayersForFrog(frog, meta) {
    if (!frog || !frog.el) return;

    frog.el.innerHTML = "";
    frog.layers = [];

    const attrs = Array.isArray(meta.attributes) ? meta.attributes : [];
    for (const attr of attrs) {
      if (!attr) continue;
      const traitType = attr.trait_type;
      const value     = attr.value;
      if (!traitType || typeof value === "undefined") continue;
      if (SKIP_TRAITS.has(traitType)) continue;

      const img = await loadTraitImage(traitType, value);
      if (!img) continue;

      img.alt = "";
      img.style.position        = "absolute";
      img.style.inset           = "0";
      img.style.width           = "100%";
      img.style.height          = "100%";
      img.style.imageRendering  = "pixelated";
      img.style.objectFit       = "contain";

      frog.el.appendChild(img);
      frog.layers.push(img);
    }
  }

  async function loadAndApplyMetadata(frog) {
    try {
      const meta = await fetchMetadata(frog.tokenId);
      await buildLayersForFrog(frog, meta);
    } catch (err) {
      console.error("Frog metadata/layers failed for", frog.tokenId, err);
    }
  }

  global.SnakeFrogMeta = {
    FROG_SIZE,
    MAX_TOKEN_ID,
    loadAndApplyMetadata
  };
})(window);
