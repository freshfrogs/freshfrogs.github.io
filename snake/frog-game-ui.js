  // frog-game-ui.js
// Upgrade overlays, buff guide, info panel, etc.

"use strict";
  
  // --------------------------------------------------
  // PERMANENT, EPIC & LEGENDARY UPGRADE OVERLAY
  // --------------------------------------------------
  let upgradeOverlay = null;
  let upgradeOverlayButtonsContainer = null;
  let upgradeOverlayTitleEl = null;
  let currentUpgradeOverlayMode = "normal"; // "normal" | "epic" | "legendary"
  let initialUpgradeDone = false;          // starting upgrade before timer
  let firstTimedNormalChoiceDone = false;  // first 1-minute panel


  // How-to-play overlay shown once before the very first buff choice
  let howToOverlay = null;
  let hasShownHowToOverlay = false;

  // Buff guide (READ ME) overlay
  let buffGuideOverlay = null;
  let buffGuideContentEl = null;
  let buffGuidePageLabel = null;
  let buffGuidePrevBtn = null;
  let buffGuideNextBtn = null;
  let buffGuidePage = 0;

function getEpicUpgradeChoices() {
  const neon = "#4defff";
  const speedPct = Math.round((1 - FROG_SPEED_UPGRADE_FACTOR) * 100);
  const deathPct = Math.round(EPIC_DEATHRATTLE_CHANCE * 100);
  const buffBonusPct  = 25; // ~25% extra here for epic
  const orbStormCount = 10;
  const snakeEggBuffPct = 11; // +11% instead of +20%

  return [
    {
      id: "epicSpawn50",
      label: `
        🐸 Spawn Frogs<br>
        Spawn <span style="color:${neon};">${EPIC_SPAWN_AMOUNT}</span> frogs now
      `,
      apply: () => {
        spawnExtraFrogs(EPIC_SPAWN_AMOUNT);
      }
    },
    {
      id: "epicDeathRattle",
      label: `
        💀 Deathrattle<br>
        +<span style="color:${neon};">${deathPct}%</span> deathrattle chance
      `,
      apply: () => {
        frogDeathRattleChance += EPIC_DEATHRATTLE_CHANCE;
      }
    },
    {
      id: "epicBuffDuration",
      label: `
        ⏳ Buffs extended<br>
        +<span style="color:${neon};">${buffBonusPct}%</span> buff duration
      `,
      apply: () => {
        buffDurationFactor *= BUFF_DURATION_UPGRADE_FACTOR + 0.25;
      }
    },

    // NEW EPIC: Cannibal Frog
    {
      id: "epicCannibalFrog",
      label: `
        🦴 Cannibal Frog<br>
        Spawn a <span style="color:${neon};">Cannibal</span> frog with<br>
        +<span style="color:${neon};">5%</span> deathrattle chance<br>
        +<span style="color:${neon};">5%</span> overall stats<br>
        • Eats nearby frogs that get in its way
      `,
      apply: () => {
        spawnCannibalFrog();
      }
    },

    // 🌩️ ORB STORM – drop a bunch of orbs right now
    {
      id: "epicOrbStorm",
      label: `
        🌩️ Orb Storm<br>
        Drop <span style="color:${neon};">${orbStormCount}</span> random orbs right now
      `,
      apply: () => {
        const width  = window.innerWidth;
        const height = window.innerHeight;
        for (let i = 0; i < orbStormCount; i++) {
          spawnOrbRandom(width, height);
        }
      }
    },

    // 🥚 SNAKE EGG – next shed snake only gets +11% speed instead of +20%
    {
      id: "snakeEgg",
      label: `
        🥚 Snake Egg<br>
        The <span style="color:${neon};">next shed</span> only gives the new snake
        <span style="color:${neon};">+${snakeEggBuffPct}%</span> speed instead of +20%
      `,
      apply: () => {
        snakeEggPending = true;
      }
    },

    // NEW EPIC: Zombie Horde
    {
      id: "zombieHorde",
      label: `
        🧟🧟🧟 Zombie Horde<br>
        Summon <span style="color:${neon};">3</span> zombie frogs
        with <span style="color:${neon};">50%</span> deathrattle
      `,
      apply: () => {
        spawnZombieHorde(3);
      }
    }
  ];
}


function getUpgradeChoices() {
  const neon = "#4defff";

  // --- derived percentages for labels ---
  // e.g. factor 0.9 => 10% faster, factor 1.25 => +25%, etc.
  const speedBonusPct = Math.round((1 - FROG_SPEED_UPGRADE_FACTOR) * 100);      // faster hops
  const jumpBonusPct  = Math.round((FROG_JUMP_UPGRADE_FACTOR - 1) * 100);       // more jump height
  const buffBonusPct  = Math.round((BUFF_DURATION_UPGRADE_FACTOR - 1) * 100);        // longer duration
  const orbFasterPct  = Math.round((1 - ORB_INTERVAL_UPGRADE_FACTOR) * 100);    // faster orb spawns
  const deathPct = Math.round(COMMON_DEATHRATTLE_CHANCE * 100);
  const orbSpawnFrog = Math.round(ORB_COLLECTOR_CHANCE * 100);

  const upgrades = [
    {
      id: "frogSpeed",
      label: `
        ⏩ Frogs hop faster<br>
        ~<span style="color:${neon};">${speedBonusPct}%</span> faster hop cycle
      `,
      apply: () => {
        // use the config constant directly
        frogPermanentSpeedFactor *= FROG_SPEED_UPGRADE_FACTOR;
      }
    },
    {
      id: "frogJump",
      label: `
        🦘⬆️ Frogs jump higher<br>
        ~<span style="color:${neon};">+${jumpBonusPct}%</span> jump height
      `,
      apply: () => {
        // use the config constant directly
        frogPermanentJumpFactor *= FROG_JUMP_UPGRADE_FACTOR;
      }
    },
    {
      id: "spawn20",
      label: `
        🐸 Spawn frogs<br>
        <span style="color:${neon};">${NORMAL_SPAWN_AMOUNT}</span> frogs right now
      `,
      apply: () => {
        spawnExtraFrogs(NORMAL_SPAWN_AMOUNT);
      }
    },
    {
      id: "buffDuration",
      label: `
        ⏳ Buffs last longer<br>
        +<span style="color:${neon};">${buffBonusPct}%</span> buff duration
      `,
      apply: () => {
        buffDurationFactor *= BUFF_DURATION_UPGRADE_FACTOR;
      }
    },
    {
      id: "moreOrbs",
      label: `
        🎯 More orbs over time<br>
        ~<span style="color:${neon};">${orbFasterPct}%</span> faster orb spawns
      `,
      apply: () => {
        orbSpawnIntervalFactor *= ORB_INTERVAL_UPGRADE_FACTOR;
      }
    },
    {
      id: "permaLifeSteal",
      label: `
        🩸 Lifesteal (upgrade)<br>
        Next <span style="color:${neon};">${PERMA_LIFESTEAL_ORB_COUNT}</span> orbs also spawn frogs
      `,
      apply: () => {
        permaLifeStealOrbsRemaining += PERMA_LIFESTEAL_ORB_COUNT;
      }
    },
    {
      id: "commonDeathRattle",
      label: `
        💀 Deathrattle<br>
        +<span style="color:${neon};">${deathPct}%</span> increased chance a dead frog respawns
      `,
      apply: () => {
        frogDeathRattleChance += COMMON_DEATHRATTLE_CHANCE;
      }
    }
  ];

   // 🔹 Only include Last Stand if it hasn't been picked yet
  if (!lastStandActive) {
    upgrades.push({
      id: "lastStand",
      label: `
        🏹 Last Stand<br>
        Your <span style="color:${neon};">last frog</span> always has
        <span style="color:${neon};">33%</span> deathrattle chance
      `,
      apply: () => {
        lastStandActive = true;
      }
    });
  }

  // 🔹 Orb Collector – only if not already taken
  if (!orbCollectorActive) {
    upgrades.push({
      id: "orbCollector",
      label: `
        🌌 Orb Collector<br>
        Every orb has a <span style="color:${neon};">${orbSpawnFrog}%</span> chance to spawn
        <span style="color:${neon};">+1</span> extra frog
      `,
      apply: () => {
        orbCollectorActive = true;
      }
    });
  }

  return upgrades;
}

  // LEGENDARY choices at 10 minutes (placeholders, TODO)
function getLegendaryUpgradeChoices() {
  const neon = "#4defff";
  const deathPct = Math.round(LEGENDARY_DEATHRATTLE_CHANCE * 100);

  return [
    {
      id: "legendaryBuffDuration",
      label: `
        ⏳⏳ LEGENDARY buff surge<br>
        All buff durations ×<span style="color:${neon};">${LEGENDARY_BUFF_DURATION_FACTOR.toFixed(1)}</span>
      `,
      apply: () => {
        buffDurationFactor *= LEGENDARY_BUFF_DURATION_FACTOR;
      }
    },
    {
      id: "legendarySpawn75",
      label: `
        🐸🌊🌊 LEGENDARY frog wave<br>
        Spawn <span style="color:${neon};">${LEGENDARY_SPAWN_AMOUNT}</span> frogs now
      `,
      apply: () => {
        spawnExtraFrogs(LEGENDARY_SPAWN_AMOUNT);
      }
    },
    {
      id: "legendaryDeathRattle",
      label: `
        💀💀 LEGENDARY deathrattle<br>
        <span style="color:${neon};">${deathPct}%</span> chance a dead frog respawns
      `,
      apply: () => {
        frogDeathRattleChance += LEGENDARY_DEATHRATTLE_CHANCE;
      }
    }
  ];
}


function ensureHowToOverlay() {
  if (howToOverlay) return;

  howToOverlay = document.createElement("div");
  howToOverlay.className = "frog-howto-overlay";

  howToOverlay.style.position = "absolute";
  howToOverlay.style.inset = "0";
  howToOverlay.style.background = "rgba(0,0,0,0.7)";
  howToOverlay.style.display = "none";
  howToOverlay.style.zIndex = "160";
  howToOverlay.style.alignItems = "center";
  howToOverlay.style.justifyContent = "center";
  howToOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "18px 22px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "left";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "420px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  const title = document.createElement("div");
  title.textContent = "escape the snake 🐍";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "4px";

  const subtitle = document.createElement("div");
  subtitle.textContent = "-- How to Play --";
  subtitle.style.marginBottom = "10px";
  subtitle.style.fontSize = "13px";
  subtitle.style.opacity = "0.9";

  const list = document.createElement("ul");
  list.style.paddingLeft = "18px";
  list.style.margin = "0 0 14px 0";
  list.style.fontSize = "13px";
  list.style.lineHeight = "1.4";

  [
    "Avoid the snake and stay alive as long as possible!",
    "Collect orbs to gain buffs and upgrades.",
    "Beat the high score to get on the leaderboard.",
    "Control frogs with your mouse."
  ].forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });

  // Buttons row: Start & Learn more
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "space-between";
  btnRow.style.gap = "8px";
  btnRow.style.marginTop = "4px";

  const startBtn = document.createElement("button");
  startBtn.textContent = "Start & choose buff";
  startBtn.style.fontFamily = "monospace";
  startBtn.style.fontSize = "13px";
  startBtn.style.padding = "6px 10px";
  startBtn.style.borderRadius = "6px";
  startBtn.style.border = "1px solid #555";
  startBtn.style.background = "#222";
  startBtn.style.color = "#fff";
  startBtn.style.cursor = "pointer";
  startBtn.style.flex = "1";
  startBtn.onmouseenter = () => { startBtn.style.background = "#333"; };
  startBtn.onmouseleave = () => { startBtn.style.background = "#222"; };
  startBtn.onclick = () => {
    hasShownHowToOverlay = true;
    if (howToOverlay) {
      howToOverlay.style.display = "none";
    }
    openUpgradeOverlay("normal");
  };

  const learnBtn = document.createElement("button");
  learnBtn.textContent = "Learn buffs 📖";
  learnBtn.style.fontFamily = "monospace";
  learnBtn.style.fontSize = "13px";
  learnBtn.style.padding = "6px 10px";
  learnBtn.style.borderRadius = "6px";
  learnBtn.style.border = "1px solid #555";
  learnBtn.style.background = "#222";
  learnBtn.style.color = "#fff";
  learnBtn.style.cursor = "pointer";
  learnBtn.style.flex = "0 0 auto";
  learnBtn.onmouseenter = () => { learnBtn.style.background = "#333"; };
  learnBtn.onmouseleave = () => { learnBtn.style.background = "#222"; };
  learnBtn.onclick = () => {
    ensureBuffGuideOverlay();
    openBuffGuideOverlay();
  };

  btnRow.appendChild(startBtn);
  btnRow.appendChild(learnBtn);

  panel.appendChild(title);
  panel.appendChild(subtitle);
  panel.appendChild(list);
  panel.appendChild(btnRow);

  howToOverlay.appendChild(panel);
  container.appendChild(howToOverlay);
}

function openHowToOverlay() {
  ensureHowToOverlay();
  gamePaused = true;
  if (howToOverlay) {
    howToOverlay.style.display = "flex";
  }
}


  function openHowToOverlay() {
    ensureHowToOverlay();
    gamePaused = true;
    if (howToOverlay) {
      howToOverlay.style.display = "flex";
    }
  }

function ensureInfoOverlay() {
  if (infoOverlay) return;

  infoOverlay = document.createElement("div");
  infoOverlay.className = "frog-info-overlay";
  infoOverlay.style.position = "absolute";
  infoOverlay.style.inset = "0";
  infoOverlay.style.background = "rgba(0,0,0,0.75)";
  infoOverlay.style.display = "none";
  infoOverlay.style.zIndex = "180";
  infoOverlay.style.alignItems = "center";
  infoOverlay.style.justifyContent = "center";
  infoOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "16px 20px 12px 20px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "left";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "480px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = "escape the snake 🐍 – info";
  title.style.fontSize = "14px";
  title.style.fontWeight = "bold";

  const pageLabel = document.createElement("div");
  pageLabel.style.fontSize = "11px";
  pageLabel.style.opacity = "0.8";
  infoPageLabel = pageLabel;

  headerRow.appendChild(title);
  headerRow.appendChild(pageLabel);

  const content = document.createElement("div");
  content.style.fontSize = "13px";
  content.style.marginTop = "4px";
  content.style.lineHeight = "1.4";
  infoContentEl = content;

  // Footer nav row
  const navRow = document.createElement("div");
  navRow.style.display = "flex";
  navRow.style.justifyContent = "space-between";
  navRow.style.alignItems = "center";
  navRow.style.marginTop = "10px";

  const leftBtns = document.createElement("div");
  leftBtns.style.display = "flex";
  leftBtns.style.gap = "6px";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ Prev";
  prevBtn.style.fontFamily = "monospace";
  prevBtn.style.fontSize = "12px";
  prevBtn.style.padding = "4px 8px";
  prevBtn.style.borderRadius = "6px";
  prevBtn.style.border = "1px solid #555";
  prevBtn.style.background = "#222";
  prevBtn.style.color = "#fff";
  prevBtn.style.cursor = "pointer";
  prevBtn.onmouseenter = () => { prevBtn.style.background = "#333"; };
  prevBtn.onmouseleave = () => { prevBtn.style.background = "#222"; };
  prevBtn.onclick = () => setInfoPage(infoPage - 1);
  infoPrevBtn = prevBtn;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ▶";
  nextBtn.style.fontFamily = "monospace";
  nextBtn.style.fontSize = "12px";
  nextBtn.style.padding = "4px 8px";
  nextBtn.style.borderRadius = "6px";
  nextBtn.style.border = "1px solid #555";
  nextBtn.style.background = "#222";
  nextBtn.style.color = "#fff";
  nextBtn.style.cursor = "pointer";
  nextBtn.onmouseenter = () => { nextBtn.style.background = "#333"; };
  nextBtn.onmouseleave = () => { nextBtn.style.background = "#222"; };
  nextBtn.onclick = () => setInfoPage(infoPage + 1);
  infoNextBtn = nextBtn;

  leftBtns.appendChild(prevBtn);
  leftBtns.appendChild(nextBtn);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close ×";
  closeBtn.style.fontFamily = "monospace";
  closeBtn.style.fontSize = "12px";
  closeBtn.style.padding = "4px 8px";
  closeBtn.style.borderRadius = "6px";
  closeBtn.style.border = "1px solid #555";
  closeBtn.style.background = "#222";
  closeBtn.style.color = "#fff";
  closeBtn.style.cursor = "pointer";
  closeBtn.onmouseenter = () => { closeBtn.style.background = "#333"; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = "#222"; };
  closeBtn.onclick = () => closeInfoOverlay();

  navRow.appendChild(leftBtns);
  navRow.appendChild(closeBtn);

  panel.appendChild(headerRow);
  panel.appendChild(content);
  panel.appendChild(navRow);

  infoOverlay.appendChild(panel);
  container.appendChild(infoOverlay);

  // clicking dark background closes the panel
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) {
      closeInfoOverlay();
    }
  });

  // start on page 0 (leaderboard)
  setInfoPage(0);
}

function setInfoPage(pageIndex) {
  if (!infoContentEl || !infoPageLabel) return;
  const neon = "#4defff";

  const maxPage = 4; // 0..4: 5 total pages
  infoPage = Math.max(0, Math.min(maxPage, pageIndex));

  let html = "";

  if (infoPage === 0) {
    // PAGE 0 – Leaderboard
    html += "<b>🏆 Leaderboard</b><br><br>";
    const list = infoLeaderboardData || [];
    if (!list.length) {
      html += "<div>No scores yet — be the first to escape the snake.</div>";
    } else {
      html += "<table style='width:100%; border-collapse:collapse; font-size:12px;'>";
      html += "<tr><th style='text-align:left;'>#</th><th style='text-align:left;'>Tag</th><th style='text-align:right;'>Score</th><th style='text-align:right;'>Time</th></tr>";
      list.slice(0, 10).forEach((entry, i) => {
        const rank = i + 1;
        const tagBase = entry.tag || entry.name || `Player ${rank}`;

        // ✅ Use bestScore / bestTime if score/time aren’t present
        const rawScore =
          typeof entry.score === "number"
            ? entry.score
            : typeof entry.bestScore === "number"
              ? entry.bestScore
              : null;

        const scoreStr = rawScore == null ? "—" : Math.floor(rawScore);

        const secs =
          typeof entry.time === "number"
            ? entry.time
            : typeof entry.bestTime === "number"
              ? entry.bestTime
              : 0;

        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        const tStr = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        // ✅ Highlight "me" (same flag used by the game-over overlay)
        const isMe = !!entry.isMe;
        const rowStyle = isMe
          ? " style='background:rgba(255,215,0,0.18);color:#ffd700;'"
          : "";

        const tag =
          isMe
            ? `${tagBase} <span style="font-size:10px;opacity:0.9;">(you)</span>`
            : tagBase;

        html += `
          <tr${rowStyle}>
            <td>${rank}</td>
            <td>${tag}</td>
            <td style="text-align:right;">${scoreStr}</td>
            <td style="text-align:right;">${tStr}</td>
          </tr>
        `;
      });
      html += "</table>";
      html += `<div style="margin-top:6px; font-size:11px; opacity:0.8;">
        Beat your own best score to update your entry.
      </div>`;
    }
  } else if (infoPage === 1) {
    // PAGE 1 – How to Play
    html = `
<b>🐍 How to Play</b><br><br>
• Avoid the snake and keep the frogs alive as long as possible.<br>
• Frogs hop around the screen. Move your mouse to guide the swarm.<br>
• Collect orbs to trigger buffs and upgrades.<br>
• Every minute you choose a <span style="color:${neon};">common</span> upgrade.<br>
• Every 3 minutes you get a <span style="color:${neon};">common + epic</span> upgrade chain.<br>
• Every 5 minutes the snake sheds, gets stronger, and changes color.<br>
• Your run ends when <span style="color:${neon};">all frogs are gone</span>.
`;
  } else if (infoPage === 2) {
    // PAGE 2 – Orb buffs
    html = `
<b>🟢 Orb Buffs</b><br><br>
⚡ <b>Speed</b> – frogs act faster for a short time (stacks with upgrades).<br>
🦘 <b>Jump</b> – frogs jump much higher for a short time.<br>
🐸➕ <b>Spawn</b> – instantly spawns extra frogs (more if the collector is Lucky).<br>
🧊 <b>Snake Slow</b> – snake moves slower for a few seconds (less effective as it grows).<br>
🤪 <b>Confuse</b> – snake turns randomly instead of targeting frogs.<br>
📏 <b>Shrink</b> – snake body and bite radius shrink temporarily.<br>
🛡️ <b>Team Shield</b> – all frogs ignore snake hits for a short duration.<br>
⏱️ <b>Time Slow</b> – slows the whole game (and the snake) briefly.<br>
🧲 <b>Orb Magnet</b> – orbs drift toward frogs, preferring magnet frogs.<br>
🐸🌊 <b>Mega Spawn</b> – large wave of frogs appears at once.<br>
💰 <b>Score ×2</b> – score gain is multiplied for a short window.<br>
😱 <b>Panic Hop</b> – frogs hop faster but in random directions.<br>
🩺 <b>Lifeline</b> – frogs that die during the buff have a chance to instantly respawn.<br>
⭐ <b>PermaFrog</b> – upgrades one frog with a permanent role (Champion, Aura, Magnet, Lucky, Zombie, etc.).
`;
  } else if (infoPage === 3) {
    // PAGE 3 – Permanent frog roles
    html = `
<b>🐸 Permanent Frog Roles</b><br><br>
🏅 <b>Champion</b> – that frog's hop cycle is faster and jumps are higher.<br>
🌈 <b>Aura</b> – nearby frogs get bonus speed and jump height in a radius around this frog.<br>
🧲 <b>Magnet</b> – orbs in a radius are strongly pulled toward this frog.<br>
🍀 <b>Lucky</b> – buffs last longer, more frogs spawn from some effects, and score gain is boosted slightly per Lucky frog.<br>
🧟 <b>Zombie</b> – when this frog dies, it causes extra chaos (like extra frogs and snake debuffs).<br><br>
Perma roles stack with global upgrades and orb buffs, making some frogs into mini “heroes” of the swarm.
`;
  } else if (infoPage === 4) {
    // PAGE 4 – Global upgrades
    html = `
<b>🏗️ Global Upgrades</b><br><br>
⏩ <b>Frogs hop faster forever</b> – reduces the hop cycle, making the whole swarm act more often.<br>
🦘⬆️ <b>Frogs jump higher forever</b> – increases base jump height for all frogs.<br>
🐸💥 <b>Spawn frogs</b> – instant injections of frogs from common / epic menus.<br>
⏳ <b>Buffs last longer</b> – multiplies the duration of all temporary buffs (orb effects).<br>
🎯 <b>More orbs</b> – orbs spawn more frequently over time.<br>
💀 <b>Deathrattle</b> – dead frogs have a chance to respawn immediately (common and epic versions stack).<br>
🏹 <b>Last Stand</b> – your final remaining frog has a strong chance to respawn instead of dying.<br>
🌌 <b>Orb Collector</b> – every collected orb has a flat chance to spawn an extra frog (one-time pick).<br>
🧟‍♂️ <b>Zombie Horde (epic)</b> – summons special zombie frogs with boosted deathrattle while they last.<br>
🍖 <b>Cannibal Frog (epic)</b> – spawns a cannibal frog that eats nearby frogs and buffs global deathrattle while alive.<br>
💫 <b>Orb Storm / Snake Egg (epic)</b> – high-impact utilities that affect orb spawns or the next snake after a shed.<br><br>
Synergize permanent upgrades, frog roles, and epic choices to keep the swarm alive deep into later sheds.
`;
  }

  infoContentEl.innerHTML = html;
  infoPageLabel.textContent = `Page ${infoPage + 1} / 5`;

  if (infoPrevBtn) {
    infoPrevBtn.disabled = (infoPage === 0);
    infoPrevBtn.style.opacity = infoPage === 0 ? "0.5" : "1";
  }
  if (infoNextBtn) {
    infoNextBtn.disabled = (infoPage === maxPage);
    infoNextBtn.style.opacity = infoNextBtn.disabled ? "0.5" : "1";
  }
}

function openInfoOverlay(startPage) {
  ensureInfoOverlay();
  gamePaused = true;
  if (typeof startPage === "number") {
    setInfoPage(startPage);
  } else {
    setInfoPage(infoPage);
  }
  if (infoOverlay) {
    infoOverlay.style.display = "flex";
  }
}

function closeInfoOverlay() {
  if (infoOverlay) {
    infoOverlay.style.display = "none";
  }
  gamePaused = false;
}


function ensureBuffGuideOverlay() {
  if (buffGuideOverlay) return;

  buffGuideOverlay = document.createElement("div");
  buffGuideOverlay.className = "frog-buff-guide-overlay";
  buffGuideOverlay.style.position = "absolute";
  buffGuideOverlay.style.inset = "0";
  buffGuideOverlay.style.background = "rgba(0,0,0,0.75)";
  buffGuideOverlay.style.display = "none";
  buffGuideOverlay.style.zIndex = "170";
  buffGuideOverlay.style.alignItems = "center";
  buffGuideOverlay.style.justifyContent = "center";
  buffGuideOverlay.style.pointerEvents = "auto";

  const panel = document.createElement("div");
  panel.style.background = "#111";
  panel.style.padding = "16px 20px 12px 20px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid #444";
  panel.style.color = "#fff";
  panel.style.fontFamily = "monospace";
  panel.style.textAlign = "left";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "440px";
  panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = "Buffs & upgrades";
  title.style.fontSize = "14px";
  title.style.fontWeight = "bold";

  const pageLabel = document.createElement("div");
  pageLabel.style.fontSize = "11px";
  pageLabel.style.opacity = "0.8";
  buffGuidePageLabel = pageLabel;

  headerRow.appendChild(title);
  headerRow.appendChild(pageLabel);

  const content = document.createElement("div");
  content.style.fontSize = "13px";
  content.style.marginTop = "4px";
  content.style.lineHeight = "1.4";
  buffGuideContentEl = content;

  const navRow = document.createElement("div");
  navRow.style.display = "flex";
  navRow.style.justifyContent = "space-between";
  navRow.style.alignItems = "center";
  navRow.style.marginTop = "10px";

  const leftBtns = document.createElement("div");
  leftBtns.style.display = "flex";
  leftBtns.style.gap = "6px";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ Prev";
  prevBtn.style.fontFamily = "monospace";
  prevBtn.style.fontSize = "12px";
  prevBtn.style.padding = "4px 8px";
  prevBtn.style.borderRadius = "6px";
  prevBtn.style.border = "1px solid #555";
  prevBtn.style.background = "#222";
  prevBtn.style.color = "#fff";
  prevBtn.style.cursor = "pointer";
  prevBtn.onmouseenter = () => { prevBtn.style.background = "#333"; };
  prevBtn.onmouseleave = () => { prevBtn.style.background = "#222"; };
  prevBtn.onclick = () => setBuffGuidePage(buffGuidePage - 1);
  buffGuidePrevBtn = prevBtn;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ▶";
  nextBtn.style.fontFamily = "monospace";
  nextBtn.style.fontSize = "12px";
  nextBtn.style.padding = "4px 8px";
  nextBtn.style.borderRadius = "6px";
  nextBtn.style.border = "1px solid #555";
  nextBtn.style.background = "#222";
  nextBtn.style.color = "#fff";
  nextBtn.style.cursor = "pointer";
  nextBtn.onmouseenter = () => { nextBtn.style.background = "#333"; };
  nextBtn.onmouseleave = () => { nextBtn.style.background = "#222"; };
  nextBtn.onclick = () => setBuffGuidePage(buffGuidePage + 1);
  buffGuideNextBtn = nextBtn;

  leftBtns.appendChild(prevBtn);
  leftBtns.appendChild(nextBtn);

  const backBtn = document.createElement("button");
  backBtn.textContent = "Close ×";
  backBtn.style.fontFamily = "monospace";
  backBtn.style.fontSize = "12px";
  backBtn.style.padding = "4px 8px";
  backBtn.style.borderRadius = "6px";
  backBtn.style.border = "1px solid #555";
  backBtn.style.background = "#222";
  backBtn.style.color = "#fff";
  backBtn.style.cursor = "pointer";
  backBtn.onmouseenter = () => { backBtn.style.background = "#333"; };
  backBtn.onmouseleave = () => { backBtn.style.background = "#222"; };
  backBtn.onclick = () => closeBuffGuideOverlay();

  navRow.appendChild(leftBtns);
  navRow.appendChild(backBtn);

  panel.appendChild(headerRow);
  panel.appendChild(content);
  panel.appendChild(navRow);

  buffGuideOverlay.appendChild(panel);
  container.appendChild(buffGuideOverlay);

  // clicking the dim background also closes it
  buffGuideOverlay.addEventListener("click", (e) => {
    if (e.target === buffGuideOverlay) {
      closeBuffGuideOverlay();
    }
  });

  // start on page 0
  setBuffGuidePage(0);
}
function setBuffGuidePage(pageIndex) {
  if (!buffGuideContentEl || !buffGuidePageLabel) return;

  const neon = "#4defff";

  // --- local helpers that safely use constants or fall back ---

  function secFromConst(constVal, fallback) {
    const v = (typeof constVal !== "undefined" ? constVal : fallback);
    return Math.max(0, Math.round(v)) + "s";
  }

  function percentFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    return Math.round(v * 100) + "%";
  }

  function multFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    return v.toFixed(1) + "×";
  }

  function percentFromBonus(b, fallback) {
    const v = (typeof b !== "undefined" ? b : fallback);
    return Math.round(v * 100) + "%";
  }

  // how much faster vs factor (e.g. 0.85 → ~15% faster)
  function fasterPercentFromFactor(f, fallback) {
    const v = (typeof f !== "undefined" ? f : fallback);
    const pct = (1 - v) * 100;
    return Math.round(pct) + "%";
  }

  // radius from AURA_RADIUS2 if present
  const auraRadiusPx = (typeof AURA_RADIUS2 !== "undefined")
    ? Math.round(Math.sqrt(AURA_RADIUS2))
    : 200;

  // --- resolve constants / defaults we care about ---

  const speedDur       = typeof SPEED_BUFF_DURATION       !== "undefined" ? SPEED_BUFF_DURATION       : 15;
  const jumpDur        = typeof JUMP_BUFF_DURATION        !== "undefined" ? JUMP_BUFF_DURATION        : 18;
  const slowDur        = typeof SNAKE_SLOW_DURATION       !== "undefined" ? SNAKE_SLOW_DURATION       : 8;
  const confuseDur     = typeof SNAKE_CONFUSE_DURATION    !== "undefined" ? SNAKE_CONFUSE_DURATION    : 6;
  const shrinkDur      = typeof SNAKE_SHRINK_DURATION     !== "undefined" ? SNAKE_SHRINK_DURATION     : 8;
  const shieldDur      = typeof FROG_SHIELD_DURATION      !== "undefined" ? FROG_SHIELD_DURATION      : 6;
  const timeSlowDur    = typeof TIME_SLOW_DURATION        !== "undefined" ? TIME_SLOW_DURATION        : 6;
  const orbMagDur      = typeof ORB_MAGNET_DURATION       !== "undefined" ? ORB_MAGNET_DURATION       : 10;
  const scoreDur       = typeof SCORE_MULTI_DURATION      !== "undefined" ? SCORE_MULTI_DURATION      : 10;
  const panicDur       = typeof PANIC_HOP_DURATION        !== "undefined" ? PANIC_HOP_DURATION        : 8;
  const lifeStealDur   = typeof LIFE_STEAL_DURATION       !== "undefined" ? LIFE_STEAL_DURATION       : 12;

  const jumpBuffFactor = typeof JUMP_BUFF_FACTOR          !== "undefined" ? JUMP_BUFF_FACTOR          : 3.2;
  const snakeSlowFact  = typeof SNAKE_SLOW_FACTOR         !== "undefined" ? SNAKE_SLOW_FACTOR         : 0.5;
  const timeSlowFact   = typeof TIME_SLOW_FACTOR          !== "undefined" ? TIME_SLOW_FACTOR          : 0.4;
  const scoreMultiFact = typeof SCORE_MULTI_FACTOR        !== "undefined" ? SCORE_MULTI_FACTOR        : 2.0;
  const panicSpeedFact = typeof PANIC_HOP_SPEED_FACTOR    !== "undefined" ? PANIC_HOP_SPEED_FACTOR    : 0.6;

  const champSpeedFact = typeof CHAMPION_SPEED_FACTOR     !== "undefined" ? CHAMPION_SPEED_FACTOR     : 0.85;
  const champJumpFact  = typeof CHAMPION_JUMP_FACTOR      !== "undefined" ? CHAMPION_JUMP_FACTOR      : 1.25;
  const auraJumpFact   = typeof AURA_JUMP_FACTOR          !== "undefined" ? AURA_JUMP_FACTOR          : 1.15;
  const luckyDurBoost  = typeof LUCKY_BUFF_DURATION_BOOST !== "undefined" ? LUCKY_BUFF_DURATION_BOOST : 1.4;
  const luckyScorePer  = typeof LUCKY_SCORE_BONUS_PER     !== "undefined" ? LUCKY_SCORE_BONUS_PER     : 0.10;

  // upgrade factors (safe fallbacks)
  const frogSpeedUp    = typeof FROG_SPEED_UPGRADE_FACTOR    !== "undefined" ? FROG_SPEED_UPGRADE_FACTOR    : 0.9;
  const frogJumpUp     = typeof FROG_JUMP_UPGRADE_FACTOR     !== "undefined" ? FROG_JUMP_UPGRADE_FACTOR     : 1.25;
  const buffDurUp      = typeof BUFF_DURATION_UPGRADE_FACTOR !== "undefined" ? BUFF_DURATION_UPGRADE_FACTOR : 1.15;
  const orbIntervalUp  = typeof ORB_INTERVAL_UPGRADE_FACTOR  !== "undefined" ? ORB_INTERVAL_UPGRADE_FACTOR  : 0.85;

  const epicDeathChance  = typeof EPIC_DEATHRATTLE_CHANCE    !== "undefined" ? EPIC_DEATHRATTLE_CHANCE      : 0.25;
  const legDeathChance   = typeof LEGENDARY_DEATHRATTLE_CHANCE !== "undefined" ? LEGENDARY_DEATHRATTLE_CHANCE : 0.50;
  const frenzyDur        = typeof LEGENDARY_FRENZY_DURATION  !== "undefined" ? LEGENDARY_FRENZY_DURATION    : 13;
  const frenzySpeedFact  = typeof FRENZY_SPEED_FACTOR        !== "undefined" ? FRENZY_SPEED_FACTOR          : 1.25;

  const pages = [
    // Page 0 – orb buffs
    `
<b>🟢 Orb buffs</b><br><br>
⚡ <b>Speed</b> – frogs act faster for <span style="color:${neon};">${secFromConst(speedDur, 15)}</span> (longer with upgrades).<br>
🦘 <b>Jump</b> – frogs jump higher for <span style="color:${neon};">${secFromConst(jumpDur, 18)}</span> (about <span style="color:${neon};">${multFromFactor(jumpBuffFactor, 3.2)}</span> height).<br>
🐸➕ <b>Spawn</b> – spawn <span style="color:${neon};">1–10</span> frogs (+ extra if Lucky).<br>
🧊 <b>Snake slow</b> – snake speed cut to <span style="color:${neon};">${percentFromFactor(snakeSlowFact, 0.5)}</span> for <span style="color:${neon};">${secFromConst(slowDur, 8)}</span> (before resistance).<br>
🤪 <b>Confuse</b> – snake steers randomly for <span style="color:${neon};">${secFromConst(confuseDur, 6)}</span>.<br>
📏 <b>Shrink</b> – snake smaller, eat radius shrinks for <span style="color:${neon};">${secFromConst(shrinkDur, 8)}</span> (bite zone reduced).<br>
🛡️ <b>Team shield</b> – all frogs ignore snake hits for <span style="color:${neon};">${secFromConst(shieldDur, 6)}</span>.<br>
⏱️ <b>Time slow</b> – game + snake run at ~<span style="color:${neon};">${percentFromFactor(timeSlowFact, 0.4)}</span> speed for <span style="color:${neon};">${secFromConst(timeSlowDur, 6)}</span>.<br>
🧲 <b>Orb magnet</b> – orbs drift toward frogs for <span style="color:${neon};">${secFromConst(orbMagDur, 10)}</span>, preferring magnets.<br>
🐸🌊 <b>Mega spawn</b> – spawn <span style="color:${neon};">15–25</span> frogs (+ bonus if Lucky).<br>
💰 <b>Score x2</b> – score gain boosted by <span style="color:${neon};">${multFromFactor(scoreMultiFact, 2.0)}</span> for <span style="color:${neon};">${secFromConst(scoreDur, 10)}</span>.<br>
😱 <b>Panic hop</b> – frogs hop faster but in random directions for <span style="color:${neon};">${secFromConst(panicDur, 8)}</span>.<br>
🩺 <b>Lifeline</b> – frogs that die during this buff have a chance to respawn instead of being lost.<br>
⭐ <b>PermaFrog</b> – gives that frog a random permanent role.
`,
    // Page 1 – permanent frog roles (shield frog removed)
    `
<b>🐸 Permanent frog roles</b><br><br>
🏅 <b>Champion</b> – that frog's hop cycle is ~<span style="color:${neon};">${fasterPercentFromFactor(champSpeedFact, 0.85)}</span> faster and jumps <span style="color:${neon};">${multFromFactor(champJumpFact, 1.25)}</span> higher.<br>
🌈 <b>Aura</b> – nearby frogs get faster + higher jumps in a <span style="color:${neon};">${auraRadiusPx}</span>px radius (jump <span style="color:${neon};">${multFromFactor(auraJumpFact, 1.15)}</span>).<br>
🧲 <b>Magnet</b> – orbs within ~<span style="color:${neon};">220px</span> home in on this frog.<br>
🍀 <b>Lucky</b> – buffs last <span style="color:${neon};">${multFromFactor(luckyDurBoost, 1.4)}</span> longer, spawn more frogs, and each Lucky frog adds <span style="color:${neon};">${percentFromBonus(luckyScorePer, 0.10)}</span> score rate.<br>
🧟 <b>Zombie</b> – on death: spawn <span style="color:${neon};">5</span> frogs and briefly slow the snake.<br>
💀 <b>Cannibal</b> – hunts nearby frogs; sometimes “spares” a victim and grants it a random permanent role instead of killing it.
`,
    // Page 2 – global upgrades / epic / special rules
    `
<b>🏗️ Global upgrades & special rules</b><br><br>
⏩ <b>Frogs hop faster</b> – each pick makes hops ~<span style="color:${neon};">${percentFromBonus(1 - frogSpeedUp, 0.1)}</span> faster (stacks).<br>
🦘⬆️ <b>Frogs jump higher</b> – each pick adds ~<span style="color:${neon};">${percentFromBonus(frogJumpUp - 1, 0.25)}</span> jump height (stacks).<br>
🐸💥 <b>Spawn ${NORMAL_SPAWN_AMOUNT}/${EPIC_SPAWN_AMOUNT}</b> – instant extra frogs from normal / epic choices.<br>
⏳ <b>Buffs last longer</b> – each pick multiplies durations by <span style="color:${neon};">${multFromFactor(buffDurUp, 1.15)}</span> (stacks).<br>
🎯 <b>More orbs</b> – orbs spawn faster every time you pick this (interval factor <span style="color:${neon};">${multFromFactor(orbIntervalUp, 0.85)}</span> per pick).<br>
💀 <b>Deathrattle (global)</b> – increases the base chance that any dead frog respawns.<br>
🏹 <b>Last Stand</b> – when this upgrade is taken, your <span style="color:${neon};">final frog</span> has up to <span style="color:${neon};">50%</span> chance to respawn instead of dying.<br>
🧟‍♂️ <b>Zombie Horde (epic)</b> – summons special zombies with a high deathrattle chance; if they respawn, they lose that bonus but stay zombies.<br>
🌩️ <b>Orb Storm (epic)</b> – unleashes a burst of orbs onto the field at once.<br>
🥚 <b>Snake Egg (epic)</b> – weakens the <span style="color:${neon};">next</span> snake that enters, reducing its shed speed bonus.<br>
🔥 <b>Snake sheds</b> – every 5 minutes the snake sheds, gains permanent speed, and respawns shorter and deadlier.
`
  ];

  const maxPage = pages.length - 1;
  buffGuidePage = Math.max(0, Math.min(maxPage, pageIndex));

  buffGuideContentEl.innerHTML = pages[buffGuidePage];
  buffGuidePageLabel.textContent = `Page ${buffGuidePage + 1} / ${pages.length}`;

  if (buffGuidePrevBtn) {
    buffGuidePrevBtn.disabled = buffGuidePage === 0;
    buffGuidePrevBtn.style.opacity = buffGuidePage === 0 ? "0.5" : "1";
  }
  if (buffGuideNextBtn) {
    buffGuideNextBtn.disabled = buffGuidePage === maxPage;
    buffGuideNextBtn.style.opacity = buffGuideNextBtn.disabled ? "0.5" : "1";
  }
}

  function openBuffGuideOverlay() {
    ensureBuffGuideOverlay();
    if (buffGuideOverlay) {
      buffGuideOverlay.style.display = "flex";
    }
  }

  function closeBuffGuideOverlay() {
    if (buffGuideOverlay) {
      buffGuideOverlay.style.display = "none";
    }
  }

  function ensureUpgradeOverlay() {
    if (upgradeOverlay) return;

    upgradeOverlay = document.createElement("div");
    upgradeOverlay.className = "frog-upgrade-overlay";

    upgradeOverlay.style.position = "absolute";
    upgradeOverlay.style.inset = "0";
    upgradeOverlay.style.background = "rgba(0,0,0,0.7)";
    upgradeOverlay.style.display = "none"; // hidden by default
    upgradeOverlay.style.zIndex = "150";
    upgradeOverlay.style.alignItems = "center";
    upgradeOverlay.style.justifyContent = "center";
    upgradeOverlay.style.pointerEvents = "auto";

    const panel = document.createElement("div");
    panel.style.background = "#111";
    panel.style.padding = "16px 20px";
    panel.style.borderRadius = "10px";
    panel.style.border = "1px solid #444";
    panel.style.color = "#fff";
    panel.style.fontFamily = "monospace";
    panel.style.textAlign = "center";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "360px";
    panel.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";

    const title = document.createElement("div");
    title.textContent = "Choose an upgrade";
    title.style.marginBottom = "12px";
    title.style.fontSize = "14px";
    upgradeOverlayTitleEl = title;

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexDirection = "column";
    buttonsContainer.style.gap = "8px";
    buttonsContainer.style.alignItems = "stretch";

    upgradeOverlayButtonsContainer = buttonsContainer;

    panel.appendChild(title);
    panel.appendChild(buttonsContainer);
    upgradeOverlay.appendChild(panel);
    container.appendChild(upgradeOverlay);
  }

function populateUpgradeOverlayChoices(mode) {
  ensureUpgradeOverlay();
  const containerEl = upgradeOverlayButtonsContainer;
  if (!containerEl) return;

  currentUpgradeOverlayMode = mode || "normal";
  const isEpic      = currentUpgradeOverlayMode === "epic";
  const isLegendary = currentUpgradeOverlayMode === "legendary";

  containerEl.innerHTML = "";
  const neon = "#4defff";

  if (upgradeOverlayTitleEl) {
    upgradeOverlayTitleEl.textContent = "Choose an upgrade";
  }

  let choices = [];

  if (isEpic) {
    // 🔥 EPIC: pick a random 3 from the full epic pool
    let pool = getEpicUpgradeChoices().slice();
    while (choices.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
  } else if (isLegendary && typeof getLegendaryUpgradeChoices === "function") {
    choices = getLegendaryUpgradeChoices().slice();
  } else {
    // normal per-minute upgrades
    let pool = getUpgradeChoices().slice();

    // Starting pre-game upgrade: no perma lifesteal yet
    if (!initialUpgradeDone) {
      pool = pool.filter(c => c.id !== "permaLifeSteal");
    }

    const isFirstTimedNormal = initialUpgradeDone && !firstTimedNormalChoiceDone;

    if (isFirstTimedNormal) {
      firstTimedNormalChoiceDone = true;

      // guarantee spawn20 is one of the options
      let spawnChoiceIndex = pool.findIndex(c => c.id === "spawn20");
      let spawnChoice;

      if (spawnChoiceIndex !== -1) {
        spawnChoice = pool.splice(spawnChoiceIndex, 1)[0];
      } else {
        // fallback: create spawn20 choice if it somehow went missing
        spawnChoice = {
          id: "spawn20",
          label: `
            🐸➕ Spawn frogs<br>
            <span style="color:${neon};">${NORMAL_SPAWN_AMOUNT}</span> frogs right now
          `,
          apply: () => { spawnExtraFrogs(NORMAL_SPAWN_AMOUNT); }
        };
      }

      choices.push(spawnChoice);

      // fill remaining slots randomly until we have 3 choices total
      while (choices.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
    } else {
      // regular case: pick any 3 at random
      while (choices.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(idx, 1)[0]);
      }
    }
  }

  function makeButton(label, onClick) {
    const btn = document.createElement("button");
    btn.innerHTML = label; // allow emojis + <span> highlight
    btn.style.fontFamily = "monospace";
    btn.style.fontSize = "13px";
    btn.style.padding = "6px 8px";
    btn.style.border = "1px solid #555";
    btn.style.borderRadius = "6px";
    btn.style.background = "#222";
    btn.style.color = "#fff";
    btn.style.cursor = "pointer";
    btn.style.textAlign = "left";
    btn.onmouseenter = () => { btn.style.background = "#333"; };
    btn.onmouseleave = () => { btn.style.background = "#222"; };
    btn.onclick = () => {
      try {
        onClick();
      } catch (e) {
        console.error("Error applying upgrade:", e);
      }
      playPermanentChoiceSound();
      closeUpgradeOverlay();
    };
    return btn;
  }

  if (!choices.length) {
    const span = document.createElement("div");
    span.textContent = "No upgrades available.";
    span.style.fontSize = "13px";
    containerEl.appendChild(span);
    return;
  }

  for (const choice of choices) {
    containerEl.appendChild(makeButton(choice.label, choice.apply));
  }
}


    function makeButton(label, onClick) {
      const btn = document.createElement("button");
      btn.innerHTML = label; // ⬅ was textContent
      btn.style.fontFamily = "monospace";
      btn.style.fontSize = "13px";
      btn.style.padding = "6px 8px";
      btn.style.border = "1px solid #555";
      btn.style.borderRadius = "6px";
      btn.style.background = "#222";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.onmouseenter = () => { btn.style.background = "#333"; };
      btn.onmouseleave = () => { btn.style.background = "#222"; };
      btn.onclick = () => {
        try {
          onClick();
        } catch (e) {
          console.error("Error applying upgrade:", e);
        }
        playPermanentChoiceSound();
        closeUpgradeOverlay();
      };
      return btn;
    }

  function openUpgradeOverlay(mode) {
    ensureUpgradeOverlay();
    populateUpgradeOverlayChoices(mode);

    gamePaused = true;
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "flex";
    }
  }

  function triggerLegendaryFrenzy() {
    // 13-second Frenzy: snake faster + frogs panic hop randomly
    snakeFrenzyTime = 13;
    panicHopTime = Math.max(panicHopTime, 13);
    setSnakeFrenzyVisual(true);
  }

  function closeUpgradeOverlay() {
    if (upgradeOverlay) {
      upgradeOverlay.style.display = "none";
    }
    gamePaused = false;

    // --- schedule next timers based on what we just picked ---
    if (!initialUpgradeDone && currentUpgradeOverlayMode === "normal") {
      // First-ever normal upgrade at game start
      initialUpgradeDone = true;
      nextPermanentChoiceTime = elapsedTime + 60;
    } else {
      if (currentUpgradeOverlayMode === "normal") {
        // Any regular normal upgrade (including the one that happens at epic marks)
        nextPermanentChoiceTime = elapsedTime + 60;
      } else if (currentUpgradeOverlayMode === "epic") {
        // Epic picked: next epic in 3 minutes
        nextEpicChoiceTime = elapsedTime + 180;
        // NOTE: we do NOT touch nextPermanentChoiceTime here; it was already
        // set when the normal half of the chain closed.
      }
    }

    // --- epic chain: if we hit an epic mark, go normal -> epic back-to-back ---
    if (epicChainPending && currentUpgradeOverlayMode === "normal") {
      epicChainPending = false;
      // Immediately show the EPIC choices now that the player picked a normal one
      openUpgradeOverlay("epic");
    }
  }

  // --------------------------------------------------
  // SCORE / LEADERBOARD
  // --------------------------------------------------
  function getLuckyScoreBonusFactor() {
    let count = 0;
    for (const frog of frogs) {
      if (frog.isLucky) count++;
    }
    return 1 + LUCKY_SCORE_BONUS_PER * count;
  }

  function endGame() {
    gameOver = true;

    lastRunTime  = elapsedTime;
    lastRunScore = score;

    (async () => {
      const posted = await submitScoreToServer(lastRunScore, lastRunTime);
      const topList = posted || await fetchLeaderboard() || [];
      updateMiniLeaderboard(topList);
      openScoreboardOverlay(topList, lastRunScore, lastRunTime);
    })();

    showGameOver();
  }

  function restartGame() {
    // Stop old loop
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    // Remove all frogs
    for (const frog of frogs) {
      if (frog.cloneEl && frog.cloneEl.parentNode === container) {
        container.removeChild(frog.cloneEl);
      }
      if (frog.el && frog.el.parentNode === container) {
        container.removeChild(frog.el);
      }
    }
    frogs = [];

    // Remove all orbs
    for (const orb of orbs) {
      if (orb.el && orb.el.parentNode === container) {
        container.removeChild(orb.el);
      }
    }
    orbs = [];

    // Remove snake graphics
    if (snake) {
      if (snake.head && snake.head.el && snake.head.el.parentNode === container) {
        container.removeChild(snake.head.el);
      }
      if (Array.isArray(snake.segments)) {
        for (const seg of snake.segments) {
          if (seg.el && seg.el.parentNode === container) {
            container.removeChild(seg.el);
          }
        }
      }
    }
    snake = null;
    // Remove any old shed skins still fading out
    for (const ds of dyingSnakes) {
      if (ds.headEl && ds.headEl.parentNode === container) {
        container.removeChild(ds.headEl);
      }
      if (Array.isArray(ds.segmentEls)) {
        for (const el of ds.segmentEls) {
          if (el && el.parentNode === container) {
            container.removeChild(el);
          }
        }
      }
    }
    dyingSnakes = [];


    // Reset game state
    elapsedTime     = 0;
    lastTime        = 0;
    gameOver        = false;
    gamePaused      = false;
    score           = 0;
    frogsEatenCount = 0;
    nextOrbTime     = 0;
    mouse.follow    = false;

    // Reset upgrade timing
    // Reset upgrade timing / sheds
    // Reset upgrade timing / sheds
    initialUpgradeDone       = false;
    nextPermanentChoiceTime  = 60;
    nextEpicChoiceTime       = 180;
    legendaryEventTriggered  = false;

    snakeShedStage           = 0;
    snakeShedCount           = 0;
    nextShedTime             = SHED_INTERVAL;
    dyingSnakes              = [];
    snakeEggPending          = false;
    orbCollectorActive = false;
    lastStandActive = false;
    snakeTurnRate            = SNAKE_TURN_RATE_BASE;

    // Reset all temporary buff timers
    speedBuffTime   = 0;
    jumpBuffTime    = 0;
    snakeSlowTime   = 0;
    snakeConfuseTime= 0;
    snakeShrinkTime = 0;
    frogShieldTime  = 0;
    timeSlowTime    = 0;
    orbMagnetTime   = 0;
    scoreMultiTime  = 0;
    panicHopTime    = 0;
    cloneSwarmTime  = 0;
    lifeStealTime   = 0;
    permaLifeStealOrbsRemaining = 0;
    snakeFrenzyTime = 0;
    setSnakeFrenzyVisual(false);

    // Reset EPIC deathrattle
    frogDeathRattleChance = 0.0;
    cannibalFrogCount = 0;

    // Reset global permanent buffs
    frogPermanentSpeedFactor = 1.0;
    frogPermanentJumpFactor  = 1.0;
    buffDurationFactor       = 1.0;
    orbSpawnIntervalFactor   = 1.0;
    snakePermanentSpeedFactor= 1.0;

    // Hide overlays
    hideGameOver();
    if (upgradeOverlay) upgradeOverlay.style.display = "none";
    hideScoreboardOverlay();

    // Recreate frogs + snake
    const width  = window.innerWidth;
    const height = window.innerHeight;

    createInitialFrogs(width, height).then(() => {});
    initSnake(width, height);

    setNextOrbTime();
    updateHUD();

    // Show the upgrade menu again at the start of a new run
    openUpgradeOverlay("normal");

    animId = requestAnimationFrame(drawFrame);
  }

  function setNextOrbTime() {
    const min = ORB_SPAWN_INTERVAL_MIN * orbSpawnIntervalFactor;
    const max = ORB_SPAWN_INTERVAL_MAX * orbSpawnIntervalFactor;
    nextOrbTime = randRange(min, max);
  }
