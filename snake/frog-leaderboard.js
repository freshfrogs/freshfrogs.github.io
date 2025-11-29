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
  // HELPERS
  // --------------------------------------------------
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatTime(seconds) {
    if (!seconds || seconds <= 0) return "00:00.0";
    const total = Math.max(0, seconds);
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return `${pad2(m)}:${s.toFixed(1).padStart(4, "0")}`;
  }

  function getEntryScore(entry) {
    if (!entry || typeof entry !== "object") return 0;
    if (typeof entry.bestScore === "number") return entry.bestScore;
    if (typeof entry.score === "number") return entry.score;
    // fallback: first numeric field containing "score"
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v === "number" && /score/i.test(k)) {
        return v;
      }
    }
    return 0;
  }

  function getEntryTime(entry) {
    if (!entry || typeof entry !== "object") return 0;
    if (typeof entry.bestTime === "number") return entry.bestTime;
    if (typeof entry.time === "number") return entry.time;
    // fallback: first numeric field containing "time" / "second" / "duration"
    for (const [k, v] of Object.entries(entry)) {
      if (
        typeof v === "number" &&
        /(time|second|duration)/i.test(k)
      ) {
        return v;
      }
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
  
    // Use the frog-game container if provided, otherwise fall back to body
    containerEl = container || document.body;
  
    scoreboardOverlay = document.createElement("div");
    scoreboardOverlay.id = "frog-scoreboard-overlay";
  
    // Fullscreen overlay inside the game container
    scoreboardOverlay.style.position = "absolute";
    scoreboardOverlay.style.inset = "0"; // top/right/bottom/left = 0
    scoreboardOverlay.style.display = "none"; // shown via showScoreboardOverlay
    scoreboardOverlay.style.alignItems = "center";
    scoreboardOverlay.style.justifyContent = "center";
    scoreboardOverlay.style.background = "rgba(0,0,0,0.65)";
    scoreboardOverlay.style.zIndex = "200"; // above HUD but below dev tools
    scoreboardOverlay.style.pointerEvents = "auto";
  
    scoreboardOverlayInner = document.createElement("div");
    scoreboardOverlayInner.style.background = "#111";
    scoreboardOverlayInner.style.borderRadius = "10px";
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
  
    // Click outside the panel to close
    scoreboardOverlay.addEventListener("click", (e) => {
      if (e.target === scoreboardOverlay) {
        hideScoreboardOverlay();
      }
    });
  }
  

  // Find the current user's row in the leaderboard list.
  // Prefer the exact myEntry.userId from the worker; fall back to
  // the old "closest score+time" heuristic only if needed.
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

    // 2) Fallback: match by tag + score/time (for older data with no userId)
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

    // 3) Old behaviour: pick the row whose score+time is closest to this run
    let bestDist = Infinity;
    let bestIndex = -1;
    let bestEntry = null;

    for (let i = 0; i < list.length; i++) {
      const e = list[i] || {};
      const es = getEntryScore(e);
      const et = getEntryTime(e);
      const ds = es - lastRunScore;
      const dt = et - lastRunTime;
      const dist = ds * ds + dt * dt;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        bestEntry = e;
      }
    }

    return { index: bestIndex, entry: bestEntry };
  }

  // --------------------------------------------------
  // API CALLS
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

  async function submitScoreToServer(score, time) {
    try {
      const payload = {
        score: Math.floor(score),
        time: time,
      };

      const res = await fetch(LEADERBOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn("submitScoreToServer non-OK:", res.status);
        return null;
      }

      const data = await res.json();

      let entries = null;
      lastMyEntry = null;

      if (Array.isArray(data)) {
        entries = data;
      } else if (data && Array.isArray(data.entries)) {
        entries = data.entries;
        if (data.myEntry) lastMyEntry = data.myEntry;
      }

      return entries;
    } catch (err) {
      console.error("submitScoreToServer error", err);
      return null;
    }
  }

  // --------------------------------------------------
  // MINI LEADERBOARD (top-right HUD)
  // --------------------------------------------------
  function updateMiniLeaderboard(topList) {
    const mini = document.getElementById("frog-mini-leaderboard");
    if (!mini) return;

    if (!Array.isArray(topList) || topList.length === 0) {
      mini.textContent = "No scores yet.";
      return;
    }

    const lines = [];
    const maxRows = Math.min(5, topList.length);

    for (let i = 0; i < maxRows; i++) {
      const entry = topList[i] || {};
      const rank = i + 1;
      const name = getDisplayName(entry, `Player ${rank}`);
      const score = getEntryScore(entry);
      const time = getEntryTime(entry);

      lines.push(
        `${rank}. ${name} — ${formatTime(time)}, ${Math.floor(score)}`
      );
    }

    mini.innerHTML = lines.map(escapeHtml).join("<br/>");
  }

  // --------------------------------------------------
  // BIG OVERLAY (run summary + full leaderboard)
  // --------------------------------------------------
  function openScoreboardOverlay(topList, lastRunScore, lastRunTime) {
    if (!scoreboardOverlay || !scoreboardOverlayInner) return;

    const safeList = Array.isArray(topList) ? topList : [];

    scoreboardOverlayInner.innerHTML = "";

    const title = document.createElement("div");
    title.textContent = "Run summary & leaderboard";
    title.style.fontSize = "14px";
    title.style.marginBottom = "10px";
    title.style.textAlign = "center";
    scoreboardOverlayInner.appendChild(title);

    const { index: myIndex, entry: myEntry } =
      findMyIndexInList(safeList, lastRunScore, lastRunTime);

    const myName = getDisplayName(myEntry, "You");

    const summary = document.createElement("div");
    summary.style.marginBottom = "12px";
    summary.style.fontSize = "13px";
    summary.innerHTML =
      "Run summary:<br>" +
      `<span style="color:#ffd700;font-weight:bold;">${escapeHtml(
        myName
      )}</span>` +
      ` — Time ${formatTime(lastRunTime)}, Score ${Math.floor(lastRunScore)}`;
    scoreboardOverlayInner.appendChild(summary);

    const hr = document.createElement("div");
    hr.style.height = "1px";
    hr.style.background = "#333";
    hr.style.margin = "8px 0 10px 0";
    scoreboardOverlayInner.appendChild(hr);

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

    if (safeList.length > 0) {
      for (let i = 0; i < safeList.length; i++) {
        const entry = safeList[i] || {};
        const tr = document.createElement("tr");

        const rankCell = document.createElement("td");
        const nameCell = document.createElement("td");
        const timeCell = document.createElement("td");
        const scoreCell = document.createElement("td");

        const rank = i + 1;
        const name = getDisplayName(entry, `Player ${rank}`);
        const score = getEntryScore(entry);
        const time = getEntryTime(entry);

        rankCell.textContent = String(rank);
        nameCell.textContent = name;
        timeCell.textContent = formatTime(time);
        scoreCell.textContent = String(Math.floor(score));

        for (const td of [rankCell, nameCell, timeCell, scoreCell]) {
          td.style.padding = "2px 4px";
          td.style.borderBottom = "1px solid #222";
        }

        // Highlight the row that actually belongs to the current user
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
    } else {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No scores yet.";
      td.style.padding = "4px";
      td.style.textAlign = "center";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    scoreboardOverlayInner.appendChild(table);

    const hint = document.createElement("div");
    hint.textContent = "Click outside this panel to close.";
    hint.style.marginTop = "8px";
    hint.style.fontSize = "11px";
    hint.style.textAlign = "center";
    hint.style.color = "#aaa";
    scoreboardOverlayInner.appendChild(hint);

    scoreboardOverlay.style.display = "flex";
  }

  function hideScoreboardOverlay() {
    if (scoreboardOverlay) {
      scoreboardOverlay.style.display = "none";
    }
  }

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------
  function initLeaderboard(container) {
    ensureScoreboardOverlay(container || document.body);
  }

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
  };
})();
