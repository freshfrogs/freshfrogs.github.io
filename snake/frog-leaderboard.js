// frog-leaderboard.js
// Handles leaderboard fetch/save and UI overlays for the Frog Snake game.

(function () {
  "use strict";

  // Cloudflare Worker URL
  const LEADERBOARD_URL =
    "https://lucky-king-0d37.danielssouthworth.workers.dev/leaderboard";

  let containerEl = null;
  let scoreboardOverlay = null;
  let scoreboardOverlayInner = null;

  // Last 'myEntry' returned by the worker (for correct tag highlighting)
  let lastMyEntry = null;

  // --------------------------------------------------
  // PLAYER TAG CONFIG (client-side only)
  // --------------------------------------------------
  const TAG_STORAGE_KEY   = "frogSnake_username";
  const TAG_MIN_LENGTH    = 2;
  const TAG_MAX_LENGTH    = 12;

  // Root patterns we want to block after normalization.
  // (Avoid very short generic roots like "ass" to prevent false positives.)
  const PROFANE_ROOTS = [
    "fuck",
    "shit",
    "bitch",
    "cunt",
    "asshole",
    "dick",
    "cock",
    "pussy",
    "slut",
    "whore",
    "bastard",
    "piss",
    "damn",
    "nigger",
    "faggot",
    "retard",
    "kike",
    "spic",
    "chink",
  ];

  /**
   * Normalize a tag for profanity matching:
   * - lowercase
   * - convert common leetspeak (0->o, 1->i, @->a, $->s, etc.)
   * - strip non-alphanumeric chars (spaces, underscores, punctuation)
   */
  function normalizeForProfanity(str) {
    const map = {
      "0": "o",
      "1": "i",
      "2": "z",
      "3": "e",
      "4": "a",
      "5": "s",
      "6": "g",
      "7": "t",
      "8": "b",
      "9": "g",
      "@": "a",
      "$": "s",
      "!": "i",
      "+": "t",
    };

    const lower = String(str).toLowerCase();
    let out = "";
    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      if (map[ch]) {
        out += map[ch];
      } else if (/[a-z0-9]/.test(ch)) {
        out += ch;
      } else {
        // drop spaces, punctuation, emojis, etc.
      }
    }
    return out;
  }

  function isProfaneTag(tag) {
    if (!tag) return false;
    const norm = normalizeForProfanity(tag);
    if (!norm) return false;

    for (const bad of PROFANE_ROOTS) {
      if (norm.includes(bad)) {
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatTime(seconds) {
    if (seconds == null || !isFinite(seconds) || seconds <= 0) {
      return "00:00.0";
    }
    const total = Math.max(0, seconds);
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    const sStr = s.toFixed(1);
    return `${pad2(m)}:${sStr.padStart(4, "0")}`;
  }

  // Always return a number, never undefined/NaN
  function getEntryScore(entry) {
    if (!entry || typeof entry !== "object") return 0;
    const keys = ["bestScore", "score", "maxScore", "points", "value"];
    for (const k of keys) {
      if (!(k in entry)) continue;
      let v = entry[k];
      if (typeof v === "string") v = parseFloat(v);
      if (typeof v === "number" && isFinite(v)) return v;
    }
    return 0;
  }

  // Always return a number, never undefined/NaN
  function getEntryTime(entry) {
    if (!entry || typeof entry !== "object") return 0;
    const keys = ["bestTime", "time", "seconds", "duration"];
    for (const k of keys) {
      if (!(k in entry)) continue;
      let v = entry[k];
      if (typeof v === "string") v = parseFloat(v);
      if (typeof v === "number" && isFinite(v) && v >= 0) return v;
    }
    return 0;
  }

  function getDisplayName(entry, fallback) {
    if (entry && typeof entry.tag === "string" && entry.tag.trim() !== "") {
      return entry.tag;
    }
    if (entry && typeof entry.name === "string" && entry.name.trim() !== "") {
      return entry.name;
    }
    return fallback || "Player";
  }

  function ensureScoreboardOverlay(container) {
    if (scoreboardOverlay) return;

    containerEl = container || document.body;

    scoreboardOverlay = document.createElement("div");
    scoreboardOverlay.id = "frog-scoreboard-overlay";
    scoreboardOverlay.style.position = "fixed";
    scoreboardOverlay.style.inset = "0";
    scoreboardOverlay.style.background = "rgba(0,0,0,0.65)";
    scoreboardOverlay.style.display = "none";
    scoreboardOverlay.style.alignItems = "center";
    scoreboardOverlay.style.justifyContent = "center";
    scoreboardOverlay.style.zIndex = "9999";

    scoreboardOverlayInner = document.createElement("div");
    scoreboardOverlayInner.style.background = "#111";
    scoreboardOverlayInner.style.borderRadius = "8px";
    scoreboardOverlayInner.style.border = "1px solid #444";
    scoreboardOverlayInner.style.padding = "14px 18px 10px 18px";
    scoreboardOverlayInner.style.minWidth = "260px";
    scoreboardOverlayInner.style.maxWidth = "420px";
    scoreboardOverlayInner.style.color = "#eee";
    scoreboardOverlayInner.style.fontFamily = "monospace";
    scoreboardOverlayInner.style.fontSize = "12px";
    scoreboardOverlayInner.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";
    scoreboardOverlayInner.style.textAlign = "left";

    scoreboardOverlay.appendChild(scoreboardOverlayInner);
    containerEl.appendChild(scoreboardOverlay);

    scoreboardOverlay.addEventListener("click", (ev) => {
      if (ev.target === scoreboardOverlay) {
        hideScoreboardOverlay();
      }
    });
  }

  // --------------------------------------------------
  // FIND "MY" ENTRY / ROW (for full overlay)
  // --------------------------------------------------
  function findMyIndexInList(list, lastRunScore, lastRunTime) {
    if (!Array.isArray(list) || list.length === 0) {
      return { index: -1, entry: null };
    }

    // 1) Prefer matching by userId (most accurate)
    if (lastMyEntry && lastMyEntry.userId) {
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e && e.userId && e.userId === lastMyEntry.userId) {
          return { index: i, entry: e };
        }
      }
    }

    // 2) Fallback: match by tag + score/time
    if (lastMyEntry && lastMyEntry.tag) {
      let bestDist = Infinity;
      let bestIndex = -1;
      let bestEntry = null;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e) continue;
        if (e.tag !== lastMyEntry.tag) continue;
        const es = getEntryScore(e);
        const et = getEntryTime(e);
        const ds = es - getEntryScore(lastMyEntry);
        const dt = et - getEntryTime(lastMyEntry);
        const dist = ds * ds + dt * dt;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
          bestEntry = e;
        }
      }
      if (bestIndex !== -1) {
        return { index: bestIndex, entry: bestEntry };
      }
    }

    // 3) Old behaviour: closest score+time
    let bestDist = Infinity;
    let bestIndex = -1;
    let bestEntry = null;
    const targetScore =
      lastRunScore || (lastMyEntry ? getEntryScore(lastMyEntry) : 0);
    const targetTime =
      lastRunTime || (lastMyEntry ? getEntryTime(lastMyEntry) : 0);

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      const ds = getEntryScore(e) - targetScore;
      const dt = getEntryTime(e) - targetTime;
      const dist = ds * ds + dt * dt;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        bestEntry = e;
      }
    }

    if (bestIndex === -1) {
      return { index: -1, entry: null };
    }
    return { index: bestIndex, entry: bestEntry };
  }

  // --------------------------------------------------
  // CURRENT USER TAG HELPERS
  // --------------------------------------------------
  function getCurrentUserLabelFromLeaderboard() {
    try {
      if (lastMyEntry) {
        if (typeof lastMyEntry.tag === "string" && lastMyEntry.tag.trim() !== "") {
          return lastMyEntry.tag;
        }
        if (
          typeof lastMyEntry.name === "string" &&
          lastMyEntry.name.trim() !== ""
        ) {
          return lastMyEntry.name;
        }
      }

      if (typeof localStorage !== "undefined") {
        const stored =
          localStorage.getItem("frogSnake_username") ||
          localStorage.getItem("frogSnake_tag") ||
          localStorage.getItem("frogSnakeUserTag") ||
          null;
        if (stored && String(stored).trim() !== "") {
          return stored;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // --------------------------------------------------
  // NETWORK: FETCH & SUBMIT
  // --------------------------------------------------
  async function fetchLeaderboard() {
    try {
      const res = await fetch(LEADERBOARD_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        console.warn("fetchLeaderboard non-OK:", res.status);
        return [];
      }

      const data = await res.json();

      let entries = [];
      lastMyEntry = null;

      if (Array.isArray(data)) {
        entries = data;
      } else if (data && Array.isArray(data.entries)) {
        entries = data.entries;
        if (data.myEntry) lastMyEntry = data.myEntry;
      }

      return entries;
    } catch (err) {
      console.error("fetchLeaderboard error", err);
      return [];
    }
  }

  async function submitScoreToServer(score, time, stats, tag) {
    try {
      let finalTag = null;

      if (typeof tag === "string") {
        finalTag = tag.trim();
      }

      // Fallback: if caller didn't pass a tag, try localStorage
      if (!finalTag && typeof localStorage !== "undefined") {
        try {
          const stored = localStorage.getItem(TAG_STORAGE_KEY);
          if (stored && stored.trim() !== "") {
            finalTag = stored.trim();
          }
        } catch (e) {
          // ignore
        }
      }

      const payload = {
        score,
        time,
        stats: stats || null,
      };

      if (finalTag && finalTag.length > 0) {
        payload.tag = finalTag;
      }

      const res = await fetch(LEADERBOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        console.warn("Failed to submit score:", res.status, res.statusText);
        return null;
      }
      
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.entries)) {
        console.warn("Leaderboard response missing entries:", data);
        return null;
      }

      const entries = data.entries;
      if (data.myEntry) {
        lastMyEntry = data.myEntry;
      }
      
      return entries;
    } catch (err) {
      console.error("Error submitting score:", err);
      return null;
    }
  }
  
  // --------------------------------------------------
  // MINI LEADERBOARD (top-right HUD / pre-game view)
  // --------------------------------------------------
  // This is the one you care about.
  // It now highlights *your* row in gold if you're on the board.
  function updateMiniLeaderboard(topList, myEntryOverride) {
    const mini = document.getElementById("frog-mini-leaderboard");
    if (!mini) return;

    let entries = [];
    let myEntry = myEntryOverride || null;

    // Support either:
    //  - updateMiniLeaderboard(array)
    //  - updateMiniLeaderboard({ entries, myEntry })
    if (Array.isArray(topList)) {
      entries = topList;
    } else if (topList && Array.isArray(topList.entries)) {
      entries = topList.entries;
      if (!myEntry && topList.myEntry) {
        myEntry = topList.myEntry;
      }
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      mini.textContent = "No runs yet.";
      return;
    }

    // If no explicit myEntry passed, fall back to the last one from the server
    if (!myEntry && lastMyEntry) {
      myEntry = lastMyEntry;
    }

    let myIndex = -1;
    if (myEntry && myEntry.userId) {
      myIndex = entries.findIndex(
        (e) => e && e.userId && e.userId === myEntry.userId
      );
    }

    mini.innerHTML = "";
    const maxRows = Math.min(5, entries.length);

    for (let i = 0; i < maxRows; i++) {
      const entry = entries[i] || {};
      const rank = i + 1;
      const name = getDisplayName(entry, `Player ${rank}`);
      const score = getEntryScore(entry);
      const time = getEntryTime(entry);

      const row = document.createElement("div");
      row.style.fontFamily = "monospace";
      row.style.fontSize = "11px";

      row.textContent = `${rank}. ${name} — ${formatTime(
        time
      )}, ${Math.floor(score)}`;

      // Highlight your row (gold + bold) if you're on the board
      if (i === myIndex) {
        row.style.color = "#ffd700";
        row.style.fontWeight = "bold";
      }

      mini.appendChild(row);
    }
  }

  // --------------------------------------------------
  // FULL SCOREBOARD OVERLAY (after a run)
  // --------------------------------------------------
  function openScoreboardOverlay(entries, lastScore, lastTime, finalStats) {

    if (!scoreboardOverlay || !scoreboardOverlayInner) return;
  
    const safeList = Array.isArray(entries) ? entries : [];
  
    scoreboardOverlayInner.innerHTML = "";
  
    const title = document.createElement("div");
    title.textContent = "Run summary & leaderboard";
    title.style.fontSize = "14px";
    title.style.marginBottom = "10px";
    title.style.textAlign = "center";
    scoreboardOverlayInner.appendChild(title);
  
    const { index: myIndex, entry: myEntry } =
      findMyIndexInList(safeList, lastScore, lastTime);
    let summary = null;

    // ---- Player tag input (always shown in summary; pre-filled if saved) ----
    (function setupTagInput() {
      let storedTag = null;

      try {
        if (typeof localStorage !== "undefined") {
          storedTag = localStorage.getItem(TAG_STORAGE_KEY);
          if (storedTag) storedTag = storedTag.trim();
        }
      } catch (e) {
        // ignore
      }

      const tagBox = document.createElement("div");
      tagBox.style.marginBottom = "10px";
      tagBox.style.fontSize = "12px";

      const label = document.createElement("div");
      label.textContent =
        "Choose a player tag to show on the leaderboard (optional):";
      label.style.marginBottom = "4px";
      tagBox.appendChild(label);

      const tagInput = document.createElement("input");
      tagInput.type = "text";
      tagInput.placeholder = "Example: SwampWizard";
      tagInput.maxLength = TAG_MAX_LENGTH;
      tagInput.style.width = "100%";
      tagInput.style.padding = "4px 6px";
      tagInput.style.borderRadius = "4px";
      tagInput.style.border = "1px solid #444";
      tagInput.style.background = "#000";
      tagInput.style.color = "#eee";
      tagInput.style.fontFamily = "inherit";
      tagInput.style.fontSize = "12px";

      // If we already have a saved tag, pre-fill the input with it
      if (storedTag) {
        tagInput.value = storedTag;
      }

      tagBox.appendChild(tagInput);

      const buttonsRow = document.createElement("div");
      buttonsRow.style.display = "flex";
      buttonsRow.style.gap = "6px";
      buttonsRow.style.marginTop = "6px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save tag";
      saveBtn.style.padding = "2px 6px";
      saveBtn.style.background = "#222";
      saveBtn.style.border = "1px solid #444";
      saveBtn.style.color = "#eee";
      saveBtn.style.borderRadius = "3px";
      saveBtn.style.cursor = "pointer";

      const skipBtn = document.createElement("button");
      skipBtn.textContent = "Skip";
      skipBtn.style.padding = "2px 6px";
      skipBtn.style.background = "transparent";
      skipBtn.style.border = "1px solid #444";
      skipBtn.style.color = "#aaa";
      skipBtn.style.borderRadius = "3px";
      skipBtn.style.cursor = "pointer";

      const error = document.createElement("div");
      error.style.marginTop = "4px";
      error.style.fontSize = "11px";
      error.style.color = "#ff8080";
      error.style.minHeight = "14px";

      buttonsRow.appendChild(saveBtn);
      buttonsRow.appendChild(skipBtn);
      tagBox.appendChild(buttonsRow);
      tagBox.appendChild(error);

      scoreboardOverlayInner.appendChild(tagBox);

      function finish(tagValue) {
        try {
          if (typeof localStorage !== "undefined") {
            if (tagValue) {
              localStorage.setItem(TAG_STORAGE_KEY, tagValue);
            }
          }
        } catch (e) {
          // ignore
        }

        if (tagValue) {
          // Update current in-memory entry so the highlight + name use this tag
          if (myEntry) {
            myEntry.tag = tagValue;
          }
          lastMyEntry = lastMyEntry || {};
          lastMyEntry.tag = tagValue;

          // Send a lightweight update to the worker so the stored entry
          // gets this tag as well (score/time only matter for PB logic).
          const safeScore =
            typeof lastScore === "number" ? lastScore : getEntryScore(myEntry);
          const safeTime =
            typeof lastTime === "number" ? lastTime : getEntryTime(myEntry);

          submitScoreToServer(
            typeof safeScore === "number" ? safeScore : 0,
            typeof safeTime === "number" ? safeTime : 0,
            null,
            tagValue
          );

          // Refresh summary text (if it already exists)
          if (summary) {
            const newName = getDisplayName(myEntry, "You");
            summary.innerHTML =
              "Run summary:<br>" +
              `<span style="color:#ffd700;font-weight:bold;">${escapeHtml(
                newName
              )}</span>` +
              ` — Time ${formatTime(lastTime)}, Score ${Math.floor(lastScore)}`;
          }
        }

        tagBox.style.display = "none";
      }

      saveBtn.addEventListener("click", () => {
        const raw = (tagInput.value || "").trim();
        if (!raw) {
          error.textContent = "Enter at least 2 characters, or click Skip.";
          return;
        }
        if (raw.length < TAG_MIN_LENGTH || raw.length > TAG_MAX_LENGTH) {
          error.textContent = `Tag must be ${TAG_MIN_LENGTH}-${TAG_MAX_LENGTH} characters.`;
          return;
        }
        if (isProfaneTag(raw)) {
          error.textContent =
            "That tag isn't allowed. Please choose something cleaner.";
          return;
        }
        error.textContent = "";
        finish(raw);
      });

      // Skip: just hide for this run; will show again next run
      skipBtn.addEventListener("click", () => {
        error.textContent = "";
        tagBox.style.display = "none";
      });
    })();

    const myName = getDisplayName(myEntry, "You");

    summary = document.createElement("div");
    summary.style.marginBottom = "12px";
    summary.style.fontSize = "13px";
    summary.innerHTML =
      "Run summary:<br>" +
      `<span style="color:#ffd700;font-weight:bold;">${escapeHtml(
        myName
      )}</span>` +
      ` — Time ${formatTime(lastTime)}, Score ${Math.floor(lastScore)}`;
    scoreboardOverlayInner.appendChild(summary);
  
    // ----- Leaderboard table with pagination (10 per page) -----
    const PAGE_SIZE = 10;
    let currentPage = 0;
    const totalEntries = safeList.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    const thRank = document.createElement("th");
    const thName = document.createElement("th");
    const thTime = document.createElement("th");
    const thScore = document.createElement("th");

    thRank.textContent = "#";
    thName.textContent = "Name";
    thTime.textContent = "Time";
    thScore.textContent = "Score";

    for (const th of [thRank, thName, thTime, thScore]) {
      th.style.borderBottom = "1px solid #444";
      th.style.padding = "2px 4px";
      th.style.textAlign = "left";
      th.style.fontWeight = "bold";
    }

    headRow.appendChild(thRank);
    headRow.appendChild(thName);
    headRow.appendChild(thTime);
    headRow.appendChild(thScore);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    scoreboardOverlayInner.appendChild(table);

    // Pagination controls
    const pager = document.createElement("div");
    pager.style.display = "flex";
    pager.style.alignItems = "center";
    pager.style.justifyContent = "space-between";
    pager.style.marginTop = "6px";
    pager.style.fontSize = "11px";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀ Prev";
    prevBtn.style.padding = "2px 6px";
    prevBtn.style.background = "#222";
    prevBtn.style.border = "1px solid #444";
    prevBtn.style.color = "#eee";
    prevBtn.style.borderRadius = "3px";
    prevBtn.style.cursor = "pointer";

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ▶";
    nextBtn.style.padding = "2px 6px";
    nextBtn.style.background = "#222";
    nextBtn.style.border = "1px solid #444";
    nextBtn.style.color = "#eee";
    nextBtn.style.borderRadius = "3px";
    nextBtn.style.cursor = "pointer";

    const pageInfo = document.createElement("div");
    pageInfo.style.flex = "1";
    pageInfo.style.textAlign = "center";
    pageInfo.style.opacity = "0.85";

    pager.appendChild(prevBtn);
    pager.appendChild(pageInfo);
    pager.appendChild(nextBtn);
    scoreboardOverlayInner.appendChild(pager);

    function renderPage() {
      tbody.innerHTML = "";

      if (totalEntries === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = "No scores yet.";
        td.style.padding = "4px";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tbody.appendChild(tr);

        pageInfo.textContent = "No entries";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        prevBtn.style.opacity = "0.4";
        nextBtn.style.opacity = "0.4";
        return;
      }

      const startIndex = currentPage * PAGE_SIZE;
      const endIndex = Math.min(startIndex + PAGE_SIZE, totalEntries);

      for (let i = startIndex; i < endIndex; i++) {
        const e = safeList[i];
        if (!e) continue;

        const rank = i + 1; // global rank
        const name = getDisplayName(e, `Frog #${rank}`);
        const score = getEntryScore(e);
        const time = getEntryTime(e);

        const tr = document.createElement("tr");

        const rankCell = document.createElement("td");
        const nameCell = document.createElement("td");
        const timeCell = document.createElement("td");
        const scoreCell = document.createElement("td");

        rankCell.textContent = rank;
        nameCell.textContent = name;
        timeCell.textContent = formatTime(time);
        scoreCell.textContent = Math.floor(score);

        for (const td of [rankCell, nameCell, timeCell, scoreCell]) {
          td.style.padding = "2px 4px";
          td.style.borderBottom = "1px solid #222";
        }

        // Highlight "you" if this is your entry
        if (i === myIndex) {
          nameCell.style.color = "#ffd700";
          nameCell.style.fontWeight = "bold";
        }

        tr.appendChild(rankCell);
        tr.appendChild(nameCell);
        tr.appendChild(timeCell);
        tr.appendChild(scoreCell);
        tbody.appendChild(tr);
      }

      const fromNum = startIndex + 1;
      const toNum = endIndex;
      pageInfo.textContent = `Showing ${fromNum}–${toNum} of ${totalEntries}`;

      prevBtn.disabled = currentPage === 0;
      nextBtn.disabled = currentPage >= totalPages - 1;
      prevBtn.style.opacity = prevBtn.disabled ? "0.4" : "1.0";
      nextBtn.style.opacity = nextBtn.disabled ? "0.4" : "1.0";
    }

    prevBtn.addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage--;
        renderPage();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderPage();
      }
    });

    // Initial render
    renderPage();
  
    // ---- Run stats block (uses finalStats if provided) ----
    if (finalStats && typeof finalStats === "object") {
      const s = finalStats;
  
      const statsBox = document.createElement("div");
      statsBox.style.marginTop = "10px";
      statsBox.style.padding = "8px 10px";
      statsBox.style.borderTop = "1px solid #333";
      statsBox.style.fontSize = "11px";
      statsBox.style.textAlign = "left";
  
      function fmtPct(val) {
        return typeof val === "number" ? (val * 100).toFixed(1) + "%" : "—";
      }
  
      function fmtMult(val) {
        return typeof val === "number" ? "×" + val.toFixed(2) : "—";
      }
  
      function fmtInt(val) {
        return typeof val === "number" ? String(Math.floor(val)) : "—";
      }
  
      const deathrattleChance =
        typeof s.deathrattleChance === "number"
          ? s.deathrattleChance
          : (typeof s.frogDeathRattleChance === "number"
              ? s.frogDeathRattleChance
              : null);
  
      /*
      statsBox.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">Run stats</div>
        <div>Deathrattle chance: ${fmtPct(deathrattleChance)}</div>
        <div>Frog speed factor: ${fmtMult(s.frogSpeedFactor)}</div>
        <div>Frog jump factor: ${fmtMult(s.frogJumpFactor)}</div>
        <div>Buff duration: ${fmtMult(s.buffDurationFactor)}</div>
        <div>Orb spawn interval factor: ${fmtMult(s.orbSpawnIntervalFactor)}</div>
        <div>Total frogs spawned: ${fmtInt(s.totalFrogsSpawned)}</div>
      `;

  
      scoreboardOverlayInner.appendChild(statsBox);
      */
    }
  
    const hint = document.createElement("div");
    hint.textContent = "Click outside this panel to close.";
    hint.style.marginTop = "8px";
    hint.style.fontSize = "11px";
    hint.style.opacity = "0.8";
    hint.style.textAlign = "center";
    scoreboardOverlayInner.appendChild(hint);
  
    scoreboardOverlay.style.display = "flex";
  }  

  function hideScoreboardOverlay() {
    if (!scoreboardOverlay) return;
    scoreboardOverlay.style.display = "none";
  }

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------
  function initLeaderboard(container) {
    ensureScoreboardOverlay(container || document.body);
  }

  // Also auto-load the mini leaderboard once on page load
  document.addEventListener("DOMContentLoaded", function () {
    fetchLeaderboard().then(function (entries) {
      updateMiniLeaderboard(entries);
    }).catch(function () {});
  });

  // --------------------------------------------------
  // EXPORT
  // --------------------------------------------------
  window.FrogGameLeaderboard = {
    initLeaderboard,
    fetchLeaderboard,
    submitScoreToServer,
    updateMiniLeaderboard,
    openScoreboardOverlay,
    hideScoreboardOverlay,
    getCurrentUserLabel: getCurrentUserLabelFromLeaderboard,
  };
})();
