// frog-game-state.js
// All mutable runtime state for the game.

window.FrogGameState = {
  container: null,

  frogs: [],
  snake: null,
  orbs: [],
  dyingSnakes: [],

  animId: null,
  lastTime: 0,
  elapsedTime: 0,
  gameOver: false,
  gamePaused: false,

  nextOrbTime: 0,
  score: 0,
  frogsEatenCount: 0,

  lastRunScore: 0,
  lastRunTime: 0,

  // upgrade timers
  nextPermanentChoiceTime: 60,
  nextEpicChoiceTime: 180,
  legendaryEventTriggered: false,

  // snake shed / color / turn
  snakeShedStage: 0,
  snakeShedCount: 0,
  nextShedTime: null,      // will be set from SHED_INTERVAL
  snakeTurnRate: null,     // will be set from config

  snakeEggPending: false,
  epicChainPending: false,

  // Buff timers
  speedBuffTime: 0,
  jumpBuffTime: 0,
  snakeSlowTime: 0,
  snakeConfuseTime: 0,
  snakeShrinkTime: 0,
  frogShieldTime: 0,
  timeSlowTime: 0,
  orbMagnetTime: 0,
  scoreMultiTime: 0,
  panicHopTime: 0,
  cloneSwarmTime: 0,
  lifeStealTime: 0,

  frogDeathRattleChance: 0,
  permaLifeStealOrbsRemaining: 0,
  cannibalFrogCount: 0,
  lastStandActive: false,
  orbCollectorActive: false,

  snakeFrenzyTime: 0,

  // Global permanent factors
  frogPermanentSpeedFactor: 1.0,
  frogPermanentJumpFactor: 1.0,
  snakePermanentSpeedFactor: 1.0,
  buffDurationFactor: 1.0,
  orbSpawnIntervalFactor: 1.0,

  // UI / overlay bits
  hud: null,
  timerLabel: null,
  frogsLabel: null,
  scoreLabel: null,
  miniBoard: null,
  gameOverBanner: null,

  infoOverlay: null,
  infoPage: 0,
  infoContentEl: null,
  infoPageLabel: null,
  infoPrevBtn: null,
  infoNextBtn: null,
  infoLeaderboardData: [],

  howToOverlay: null,
  hasShownHowToOverlay: false,

  buffGuideOverlay: null,
  buffGuideContentEl: null,
  buffGuidePageLabel: null,
  buffGuidePrevBtn: null,
  buffGuideNextBtn: null,
  buffGuidePage: 0,

  upgradeOverlay: null,
  upgradeOverlayButtonsContainer: null,
  upgradeOverlayTitleEl: null,
  currentUpgradeOverlayMode: "normal",
  initialUpgradeDone: false,
  firstTimedNormalChoiceDone: false,

  // Mouse
  mouse: {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
    follow: false,
  },
};
