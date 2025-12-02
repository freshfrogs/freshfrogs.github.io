// frog-audio.js
// Handles all sound loading & playback for the frog snake game,
// using small audio pools + simple throttling so late-game doesn’t lag or glitch.

(function () {
  "use strict";

  const AUDIO_BASE = "https://freshfrogs.github.io/snake/audio/";

  // ------------------------------------------------------------
  // SIMPLE AUDIO POOLING
  // ------------------------------------------------------------
  const pools = {};
  let audioInitialized = false;

  /**
   * Create a small pool of Audio elements for a given key.
   * @param {string} key
   * @param {string} filename  e.g. "munch.mp3"
   * @param {object} options   { poolSize, volume, minIntervalMs }
   */
  function createPool(key, filename, options) {
    const poolSize = (options && options.poolSize) || 3;
    const volume = (options && options.volume) != null ? options.volume : 0.9;
    const minIntervalMs = (options && options.minIntervalMs) || 0;

    const players = [];
    for (let i = 0; i < poolSize; i++) {
      try {
        const a = new Audio(AUDIO_BASE + filename);
        a.preload = "auto";
        a.volume = volume;
        a.crossOrigin = "anonymous";
        players.push(a);
      } catch (e) {
        // If something goes wrong creating audio, just stop building pool.
        break;
      }
    }

    pools[key] = {
      players,
      index: 0,
      lastPlay: 0,
      minIntervalMs
    };
  }

  /**
   * Play from a pool with basic rate-limiting.
   * Will reuse paused/ended instances; if all are in use, it “steals” the next one.
   */
  function playFromPool(key) {
    if (!audioInitialized) return;
    const pool = pools[key];
    if (!pool || !pool.players.length) return;

    const now = (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();

    if (pool.minIntervalMs > 0 && now - pool.lastPlay < pool.minIntervalMs) {
      // Throttled: too soon since last play
      return;
    }

    pool.lastPlay = now;

    const { players } = pool;
    const len = players.length;

    // Try to find a free instance
    for (let i = 0; i < len; i++) {
      const idx = (pool.index + i) % len;
      const audio = players[idx];
      if (audio.paused || audio.ended) {
        try {
          audio.currentTime = 0;
        } catch (e) {}
        const p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {}); // ignore autoplay / codec errors
        }
        pool.index = (idx + 1) % len;
        return;
      }
    }

    // Fallback: steal one
    const audio = players[pool.index];
    try {
      audio.currentTime = 0;
    } catch (e) {}
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
    pool.index = (pool.index + 1) % len;
  }

  // ------------------------------------------------------------
  // INIT – BUILD ALL POOLS
  // ------------------------------------------------------------
  function initAudio() {
    if (audioInitialized) return;

    try {
      // Core ribbits (slightly throttled, bigger pool)
      createPool("ribbit1",    "ribbitOne.mp3",   { poolSize: 4, volume: 0.8, minIntervalMs: 90 });
      createPool("ribbit2",    "ribbitTwo.mp3",   { poolSize: 4, volume: 0.8, minIntervalMs: 90 });
      createPool("ribbit3",    "ribbitThree.mp3", { poolSize: 4, volume: 0.8, minIntervalMs: 90 });
      createPool("ribbitBase", "ribbitBase.mp3",  { poolSize: 4, volume: 0.8, minIntervalMs: 90 });

      // Death / snake / orb
      createPool("frogDeath", "frogDeath.mp3", { poolSize: 3, volume: 0.9, minIntervalMs: 120 });
      createPool("snakeMunch", "munch.mp3",    { poolSize: 4, volume: 0.9, minIntervalMs: 50 });

      createPool("orbSpawn1", "orbSpawn.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 120 });
      createPool("orbSpawn2", "orbSpawnTwo.mp3", { poolSize: 2, volume: 0.9, minIntervalMs: 120 });

      // Temp buff sounds (minute / orb buffs)
      createPool("buff_speed",        "superSpeed.mp3",   { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_jump",         "superJump.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_spawn",        "frogSpawn.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_snakeSlow",    "snakeSlow.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_snakeConfuse", "snakeConfuse.mp3", { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_snakeShrink",  "snakeShrink.mp3",  { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_frogShield",   "frogShield.mp3",   { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_timeSlow",     "timeSlow.mp3",     { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_orbMagnet",    "orbMagnet.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_megaSpawn",    "megaSpawn.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_scoreMulti",   "scoreMulti.mp3",   { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_panicHop",     "panicHop.mp3",     { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_cloneSwarm",   "cloneSwarm.mp3",   { poolSize: 2, volume: 0.9, minIntervalMs: 150 });
      createPool("buff_lifeSteal",    "lifeSteal.mp3",    { poolSize: 2, volume: 0.9, minIntervalMs: 150 });

      // Per-run permanent upgrade (minute overlay)
      createPool("permanentChoice", "permanentBuffChoice.mp3", { poolSize: 1, volume: 1.0, minIntervalMs: 400 });

      // Per-frog permanent upgrade sounds
      createPool("perfrog_champion", "championFrog.mp3",  { poolSize: 1, volume: 1.0, minIntervalMs: 250 });
      createPool("perfrog_aura",     "auraFrog.mp3",      { poolSize: 1, volume: 1.0, minIntervalMs: 250 });
      createPool("perfrog_shield",   "shieldFrog.mp3",    { poolSize: 1, volume: 1.0, minIntervalMs: 250 });
      createPool("perfrog_magnet",   "magnetFrog.mp3",    { poolSize: 1, volume: 1.0, minIntervalMs: 250 });
      createPool("perfrog_lucky",    "luckyFrog.mp3",     { poolSize: 1, volume: 1.0, minIntervalMs: 250 });
      createPool("perfrog_zombie",   "zombieFrog.mp3",    { poolSize: 1, volume: 1.0, minIntervalMs: 250 });

      audioInitialized = true;
    } catch (e) {
      // If audio init fails for some reason, fail silently.
      audioInitialized = false;
    }
  }

  // ------------------------------------------------------------
  // PUBLIC PLAY HELPERS (SAME API AS BEFORE)
  // ------------------------------------------------------------

  function playRandomRibbit() {
    // Choose randomly among the four ribbit variants
    const ribbits = ["ribbit1", "ribbit2", "ribbit3", "ribbitBase"];
    const key = ribbits[Math.floor(Math.random() * ribbits.length)];
    playFromPool(key);
  }

  function playFrogDeath() {
    playFromPool("frogDeath");
  }

  function playSnakeMunch() {
    playFromPool("snakeMunch");
  }

  function playRandomOrbSpawnSound() {
    const keys = ["orbSpawn1", "orbSpawn2"];
    const key = keys[Math.floor(Math.random() * keys.length)];
    playFromPool(key);
  }

  function playButtonClick() {
    //if (!audioEnabled) return;            // whatever flag you use in that file
    const s = new Audio("buttonClick.mp3");
    s.volume = masterVolume * 0.7 || 0.7; // adjust to your mix
    s.play().catch(() => {});
  }


  /**
   * Temp buff audio – `type` matches your existing game logic:
   * "speed", "jump", "spawn", "snakeSlow", "snakeConfuse", "snakeShrink",
   * "frogShield", "timeSlow", "orbMagnet", "megaSpawn",
   * "scoreMulti", "panicHop", "cloneSwarm", "lifeSteal"
   */
  function playBuffSound(type) {
    let key = null;
    switch (type) {
      case "speed":        key = "buff_speed";        break;
      case "jump":         key = "buff_jump";         break;
      case "spawn":        key = "buff_spawn";        break;
      case "snakeSlow":    key = "buff_snakeSlow";    break;
      case "snakeConfuse": key = "buff_snakeConfuse"; break;
      case "snakeShrink":  key = "buff_snakeShrink";  break;
      case "frogShield":   key = "buff_frogShield";   break;
      case "timeSlow":     key = "buff_timeSlow";     break;
      case "orbMagnet":    key = "buff_orbMagnet";    break;
      case "megaSpawn":    key = "buff_megaSpawn";    break;
      case "scoreMulti":   key = "buff_scoreMulti";   break;
      case "panicHop":     key = "buff_panicHop";     break;
      case "cloneSwarm":   key = "buff_cloneSwarm";   break;
      case "lifeSteal":    key = "buff_lifeSteal";    break;
    }
    if (key) playFromPool(key);
  }

  function playPermanentChoiceSound() {
    playFromPool("permanentChoice");
  }

  /**
   * Per-frog permanent upgrade sounds – `role` matches your existing code:
   * "champion", "aura", "shield", "magnet", "lucky", "zombie"
   */
  function playPerFrogUpgradeSound(role) {
    let key = null;
    switch (role) {
      case "champion": key = "perfrog_champion"; break;
      case "aura":     key = "perfrog_aura";     break;
      case "shield":   key = "perfrog_shield";   break;
      case "magnet":   key = "perfrog_magnet";   break;
      case "lucky":    key = "perfrog_lucky";    break;
      case "zombie":   key = "perfrog_zombie";   break;
    }
    if (key) playFromPool(key);
  }

  // ------------------------------------------------------------
  // EXPORT API
  // ------------------------------------------------------------
  window.FrogGameAudio = {
    initAudio,
    playRandomRibbit,
    playFrogDeath,
    playSnakeMunch,
    playRandomOrbSpawnSound,
    playBuffSound,
    playPermanentChoiceSound,
    playPerFrogUpgradeSound,
    playButtonClick
  };
})();
