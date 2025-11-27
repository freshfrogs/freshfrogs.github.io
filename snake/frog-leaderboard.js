// frog-leaderboard.js
// Handles leaderboard fetch/save and UI overlays for the Frog Snake game.

(function () {
  "use strict";

  // Update this if your Worker URL changes
  const LEADERBOARD_URL = "https://lucky-king-0d37.danielssouthworth.workers.dev/leaderboard";

  let containerEl = null;
  let scoreboardOverlay = null;
  let scoreboardOverlayInner = null;

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  function asNumber(v, fallback = 0) {
    if (typeof v === "number") {
      return Number.isFinite(v) ? v : fallback;
    }
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatTime(t) {
    const total = Math.max(0, asNumber(t, 0));
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // --------------------------------------------------
  // INIT
  // --------------------------------------------------
  function initLeaderboard(container) {
    containerEl = container;

    // Full-screen overlay for run summary + leaderboard
    scoreboardOverlay = document.createElement("div");
    scoreboardOverlay.id = "frog-scoreboard-overlay";
    scoreboardOverlay.style.position = "absolute";
    scoreboardOverlay.style.inset = "0";
    scoreboardOverlay.style.display = "none";
    scoreboardOverlay.style.alignItems = "center";
    scoreboardOverlay.style.justifyContent = "center";
    scoreboardOverlay.style.background = "rgba(0,0,0,0.75)";
    scoreboardOverlay.style.zIndex = "200";
    scoreboardOverlay.style.pointerEvents = "auto";

    scoreboardOverlayInner = document.createElement("div");
    scoreboardOverlayInner.style.background = "#111";
    scoreboardOverlayInner.style.border = "1px solid #444";
    scoreboardOverlayInner.style.borderRadius = "12px";
    scoreboardOverlayInner.style.padding = "18px 22px";
    scoreboardOverlayInner.style.color = "#fff";
    scoreboardOverlayInner.style.fontFamily = "monospace";
    scoreboardOverlayInner.style.fontSize = "13px";
    scoreboardOverlayInner.style.maxWidth = "420px";
    scoreboardOverlayInner.style.maxHeight = "80vh";
    scoreboardOverlayInner.style.overflowY = "auto";
    scoreboardOverlayInner.style.boxShadow = "0 0 20px rgba(0,0,0,0.8)";
    scoreboardOverlayInner.style.textAlign = "left";

    scoreboardOverlay.appendChild(scoreboardOverlayInner);
    containerEl.appendChild(scoreboardOverlay);

    // click outside panel to close
    scoreboardOverlay.addEventListener("click", (e) => {
      if (e.target === scoreboardOverlay) {
        hideScoreboardOverlay();
      }
    });
  }

  // --------------------------------------------------
  // API CALLS
  // --------------------------------------------------
  async function fetchLeaderboard() {
    try {
      const res = await fetch(LEADERBOARD_URL, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) {
        console.warn("fetchLeaderboard non-OK:", res.status);
        return [];
      }
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.entries)) return data.entries;
      return [];
    } catch (err) {
      console.error("fetchLeaderboard error", err);
      return [];
    }
  }

  async function submitScoreToServer(score, time) {
    try {
      const payload = {
        score: Math.floor(score),
        time: time
      };

      const res = await fetch(LEADERBOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn("submitScoreToServer non-OK:", res.status);
        return null;
      }

      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.entries)) return data.entries;
      return null;
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
      const name = entry.userTag || entry.name || `Player ${rank}`;
      const score = asNumber(entry.score, 0);
      const time  = asNumber(entry.time, 0);
      lines.push(
        `${rank}. ${name} — ${formatTime(time)} · ${Math.floor(score)}`
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

    // Find this run in the list (approx match)
    let myIndex = -1;
    let myEntry = null;
    const tolScore = 0.0001;
    const tolTime = 0.05;

    for (let i = 0; i < safeList.length; i++) {
      const e = safeList[i] || {};
      const es = asNumber(e.score, 0);
      const et = asNumber(e.time, 0);
      if (Math.abs(es - lastRunScore) < tolScore &&
          Math.abs(et - lastRunTime) < tolTime) {
        myIndex = i;
        myEntry = e;
        break;
      }
    }

    const myName = myEntry
      ? (myEntry.userTag || myEntry.name || "You")
      : "You";

    // Run summary with name in bright yellow
    const summary = document.createElement("div");
    summary.style.marginBottom = "12px";
    summary.style.fontSize = "13px";
    summary.innerHTML =
      `Run summary:<br>` +
      `<span style="color:#ffd700;font-weight:bold;">${escapeHtml(myName)}</span>` +
      ` — Time ${formatTime(lastRunTime)}, Score ${Math.floor(lastRunScore)}`;
    scoreboardOverlayInner.appendChild(summary);

    const hr = document.createElement("div");
    hr.style.height = "1px";
    hr.style.background = "#333";
    hr.style.margin = "8px 0 10px 0";
    scoreboardOverlayInner.appendChild(hr);

    // Leaderboard table
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
        const name = entry.userTag || entry.name || `Player ${rank}`;
        const score = asNumber(entry.score, 0);
        const time  = asNumber(entry.time, 0);

        rankCell.textContent = String(rank);
        nameCell.textContent = name;
        timeCell.textContent = formatTime(time);
        scoreCell.textContent = String(Math.floor(score));

        for (const td of [rankCell, nameCell, timeCell, scoreCell]) {
          td.style.padding = "2px 4px";
          td.style.borderBottom = "1px solid #222";
        }

        // Highlight THIS run's name in bright yellow
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
    hint.style.marginTop = "10px";
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
  // EXPORT
  // --------------------------------------------------
  window.FrogGameLeaderboard = {
    initLeaderboard,
    fetchLeaderboard,
    submitScoreToServer,
    updateMiniLeaderboard,
    openScoreboardOverlay,
    hideScoreboardOverlay
  };
})();
