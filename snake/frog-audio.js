// frog-audio.js
// Handles all sound loading & playback for the frog snake game.

(function () {
  "use strict";

  // Core game sounds
  let audioRibbits = [];
  let audioFrogDeath = null;
  let audioSnakeEat  = null;
  let audioOrbSpawn1 = null;
  let audioOrbSpawn2 = null;
  let audioSuperSpeed = null;
  let audioSuperJump  = null;
  let audioFrogSpawn  = null;

  // Temp buff sounds
  let audioSnakeSlow    = null;
  let audioSnakeConfuse = null;
  let audioSnakeShrink  = null;
  let audioFrogShield   = null;
  let audioTimeSlow     = null;
  let audioOrbMagnet    = null;
  let audioMegaSpawn    = null;
  let audioScoreMulti   = null;
  let audioPanicHop     = null;
  let audioCloneSwarm   = null;
  let audioLifeSteal    = null;

  // Per-run permanent upgrade (minute overlay)
  let audioPermanentChoice = null;

  // Per-frog permanent upgrade sounds
  let audioChampionFrog    = null;
  let audioAuraFrog        = null;
  let audioShieldFrogPerma = null;
  let audioMagnetFrogPerma = null;
  let audioLuckyFrogPerma  = null;
  let audioZombieFrogPerma = null;

  function initAudio() {
    try {
      audioRibbits = [
        new Audio("https://freshfrogs.github.io/snake/audio/ribbitOne.mp3"),
        new Audio("https://freshfrogs.github.io/snake/audio/ribbitTwo.mp3"),
        new Audio("https://freshfrogs.github.io/snake/audio/ribbitThree.mp3"),
        new Audio("https://freshfrogs.github.io/snake/audio/ribbitBase.mp3"),
      ];
      audioRibbits.forEach(a => a.volume = 0.8);
    } catch (e) {}

    try {
      audioFrogDeath = new Audio("https://freshfrogs.github.io/snake/audio/frogDeath.mp3");
      audioFrogDeath.volume = 0.9;
    } catch (e) {}

    try {
      audioSnakeEat = new Audio("https://freshfrogs.github.io/snake/audio/munch.mp3");
      audioSnakeEat.volume = 0.7;
    } catch (e) {}

    try {
      audioOrbSpawn1 = new Audio("https://freshfrogs.github.io/snake/audio/orbSpawn.mp3");
      audioOrbSpawn2 = new Audio("https://freshfrogs.github.io/snake/audio/orbSpawnTwo.mp3");
      audioOrbSpawn1.volume = 0.8;
      audioOrbSpawn2.volume = 0.8;
    } catch (e) {}

    try {
      audioSuperSpeed = new Audio("https://freshfrogs.github.io/snake/audio/superSpeed.mp3");
      audioSuperJump  = new Audio("https://freshfrogs.github.io/snake/audio/superJump.mp3");
      audioFrogSpawn  = new Audio("https://freshfrogs.github.io/snake/audio/frogSpawn.mp3");
      audioSuperSpeed.volume = 0.9;
      audioSuperJump.volume  = 0.9;
      audioFrogSpawn.volume  = 0.9;
    } catch (e) {}

    // temp buff placeholders
    try {
      audioSnakeSlow    = new Audio("https://freshfrogs.github.io/snake/audio/snakeSlow.mp3");
      audioSnakeConfuse = new Audio("https://freshfrogs.github.io/snake/audio/snakeConfuse.mp3");
      audioSnakeShrink  = new Audio("https://freshfrogs.github.io/snake/audio/snakeShrink.mp3");
      audioFrogShield   = new Audio("https://freshfrogs.github.io/snake/audio/frogShield.mp3");
      audioTimeSlow     = new Audio("https://freshfrogs.github.io/snake/audio/timeSlow.mp3");
      audioOrbMagnet    = new Audio("https://freshfrogs.github.io/snake/audio/orbMagnet.mp3");
      audioMegaSpawn    = new Audio("https://freshfrogs.github.io/snake/audio/megaSpawn.mp3");
      audioScoreMulti   = new Audio("https://freshfrogs.github.io/snake/audio/scoreMulti.mp3");
      audioPanicHop     = new Audio("https://freshfrogs.github.io/snake/audio/panicHop.mp3");
      audioCloneSwarm   = new Audio("https://freshfrogs.github.io/snake/audio/cloneSwarm.mp3");
      audioLifeSteal    = new Audio("https://freshfrogs.github.io/snake/audio/lifeSteal.mp3");

      [
        audioSnakeSlow,
        audioSnakeConfuse,
        audioSnakeShrink,
        audioFrogShield,
        audioTimeSlow,
        audioOrbMagnet,
        audioMegaSpawn,
        audioScoreMulti,
        audioPanicHop,
        audioCloneSwarm,
        audioLifeSteal
      ].forEach(a => { if (a) a.volume = 0.9; });
    } catch (e) {}

    // per-run permanent choice
    try {
      audioPermanentChoice = new Audio("https://freshfrogs.github.io/snake/audio/permanentBuffChoice.mp3");
      audioPermanentChoice.volume = 0.9;
    } catch (e) {}

    // per-frog permanent upgrades
    try {
      audioChampionFrog    = new Audio("https://freshfrogs.github.io/snake/audio/championFrog.mp3");
      audioAuraFrog        = new Audio("https://freshfrogs.github.io/snake/audio/auraFrog.mp3");
      audioShieldFrogPerma = new Audio("https://freshfrogs.github.io/snake/audio/shieldFrog.mp3");
      audioMagnetFrogPerma = new Audio("https://freshfrogs.github.io/snake/audio/magnetFrog.mp3");
      audioLuckyFrogPerma  = new Audio("https://freshfrogs.github.io/snake/audio/luckyFrog.mp3");
      audioZombieFrogPerma = new Audio("https://freshfrogs.github.io/snake/audio/zombieFrog.mp3");

      [
        audioChampionFrog,
        audioAuraFrog,
        audioShieldFrogPerma,
        audioMagnetFrogPerma,
        audioLuckyFrogPerma,
        audioZombieFrogPerma
      ].forEach(a => { if (a) a.volume = 0.9; });
    } catch (e) {}
  }

  function playClone(base) {
    if (!base) return;
    try {
      const clone = base.cloneNode();
      clone.volume = base.volume;
      const p = clone.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {}); // ignore autoplay / codec errors
      }
    } catch (e) {}
  }

  function playRandomRibbit() {
    if (!audioRibbits.length) return;
    const base = audioRibbits[Math.floor(Math.random() * audioRibbits.length)];
    playClone(base);
  }

  function playFrogDeath() {
    playClone(audioFrogDeath);
  }

  function playSnakeMunch() {
    playClone(audioSnakeEat);
  }

  function playRandomOrbSpawnSound() {
    const choices = [audioOrbSpawn1, audioOrbSpawn2].filter(Boolean);
    if (!choices.length) return;
    const base = choices[Math.floor(Math.random() * choices.length)];
    playClone(base);
  }

  function playBuffSound(type) {
    let base = null;
    switch (type) {
      case "speed":        base = audioSuperSpeed;    break;
      case "jump":         base = audioSuperJump;     break;
      case "spawn":        base = audioFrogSpawn;     break;
      case "snakeSlow":    base = audioSnakeSlow;     break;
      case "snakeConfuse": base = audioSnakeConfuse;  break;
      case "snakeShrink":  base = audioSnakeShrink;   break;
      case "frogShield":   base = audioFrogShield;    break;
      case "timeSlow":     base = audioTimeSlow;      break;
      case "orbMagnet":    base = audioOrbMagnet;     break;
      case "megaSpawn":    base = audioMegaSpawn;     break;
      case "scoreMulti":   base = audioScoreMulti;    break;
      case "panicHop":     base = audioPanicHop;      break;
      case "cloneSwarm":   base = audioCloneSwarm;    break;
      case "lifeSteal":    base = audioLifeSteal;     break;
    }
    if (base) playClone(base);
  }

  function playPermanentChoiceSound() {
    playClone(audioPermanentChoice);
  }

  function playPerFrogUpgradeSound(role) {
    let base = null;
    switch (role) {
      case "champion": base = audioChampionFrog;    break;
      case "aura":     base = audioAuraFrog;        break;
      case "shield":   base = audioShieldFrogPerma; break;
      case "magnet":   base = audioMagnetFrogPerma; break;
      case "lucky":    base = audioLuckyFrogPerma;  break;
      case "zombie":   base = audioZombieFrogPerma; break;
    }
    if (base) playClone(base);
  }

  window.FrogGameAudio = {
    initAudio,
    playRandomRibbit,
    playFrogDeath,
    playSnakeMunch,
    playRandomOrbSpawnSound,
    playBuffSound,
    playPermanentChoiceSound,
    playPerFrogUpgradeSound
  };
})();
