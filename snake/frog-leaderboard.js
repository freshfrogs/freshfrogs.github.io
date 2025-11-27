// frog-leaderboard.js
// Leaderboard + scoreboard overlay for frog snake game.

(function () {
  "use strict";

  const LEADERBOARD_URL =
    "https://lucky-king-0d37.danielssouthworth.workers.dev/leaderboard";

  let containerRef = null;
  let scoreboardOverlay = null;

  function initLeaderboard(container) {
    containerRef = container;
  }

  async function submitScoreToServer(score, time) {
    try {
      const res = await fetch(LEADERBOARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, time })
      });
      if (!res.ok) throw new Error("submit failed");
      return await res.json(); // expected top scores array
    } catch (e) {
      console.error("submitScoreToServer error", e);
      return null;
    }
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch(LEADERBOARD_URL, { method: "GET" });
      if (!res.ok) throw new Error("get failed");
      return await res.json();
    } catch (e) {
      console.error("fetchLeaderboard error", e);
      return null;
    }
  }

  function updateMiniLeaderboard(list) {
    const el = document.getElementById("frog-mini-leaderboard");
    if (!el) return;

    if (!Array.isArray(list) || !list.length) {
      el.textContent = "No scores yet.";
      return;
    }

    let text = "Top Scores:\n";
    list.slice(0, 5).forEach((entry, idx) => {
      const tag   = entry.tag || "Unknown";
      const score = entry.bestScore != null ? Math.floor(entry.bestScore) : 0;
      text += `${idx + 1}. ${tag} — ${score}\n`;
    });

    el.textContent = text.trim();
  }

  function ensureScoreboardOverlay() {
    if (scoreboardOverlay || !containerRef) return;

    scoreboardOverlay = document.createElement("div");
    scoreboardOverlay.style.position = "absolute";
    scoreboardOverlay.style.inset = "0";
    scoreboardOverlay.style.background = "rgba(0,0,0,0.78)";
    scoreboardOverlay.style.display = "none";
    scoreboardOverlay.style.zIndex = "200";
    scoreboardOverlay.style.display = "flex";
    scoreboardOverlay.style.alignItems = "center";
    scoreboardOverlay.style.justifyContent = "center";
    scoreboardOverlay.style.pointerEvents = "auto";

    const panel = document.createElement("div");
    panel.style.background = "#111";
    panel.style.padding = "16px 20px";
    panel.style.borderRadius = "10px";
    panel.style.border = "1px solid #444";
    panel.style.color = "#fff";
    panel.style.fontFamily = "monospace";
    panel.style.textAlign = "center";
    panel.style.minWidth = "320px";
    panel.style.maxWidth = "480px";

    const title = document.createElement("div");
    title.textContent = "Run Summary";
    title.style.fontSize = "16px";
    title.style.marginBottom = "8px";

    const summary = document.createElement("div");
    summary.style.fontSize = "13px";
    summary.style.marginBottom = "10px";
    summary.id = "frog-score-summary";

    const leaderboardTitle = document.createElement("div");
    leaderboardTitle.textContent = "Top Scores";
    leaderboardTitle.style.fontSize = "14px";
    leaderboardTitle.style.margin = "10px 0 4px";

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";
    table.id = "frog-score-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "Tag", "Score", "Time"].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.style.borderBottom = "1px solid #444";
      th.style.padding = "2px 4px";
      th.style.textAlign = h === "#" ? "right" : "left";
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.marginTop = "10px";
    closeBtn.style.fontFamily = "monospace";
    closeBtn.style.fontSize = "13px";
    closeBtn.style.padding = "6px 10px";
    closeBtn.style.borderRadius = "6px";
    closeBtn.style.border = "1px solid #555";
    closeBtn.style.background = "#222";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => {
      scoreboardOverlay.style.display = "none";
    };
    closeBtn.onmouseenter = () => { closeBtn.style.background = "#333"; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = "#222"; };

    panel.appendChild(title);
    panel.appendChild(summary);
    panel.appendChild(leaderboardTitle);
    panel.appendChild(table);
    panel.appendChild(closeBtn);

    scoreboardOverlay.appendChild(panel);
    containerRef.appendChild(scoreboardOverlay);
  }

  function formatTime(t) {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  }

  function openScoreboardOverlay(topList, runScore, runTime) {
    ensureScoreboardOverlay();
    if (!scoreboardOverlay) return;

    const summary = document.getElementById("frog-score-summary");
    const table   = document.getElementById("frog-score-table");
    if (!summary || !table) return;

    summary.textContent =
      `Time: ${formatTime(runTime)}  |  Score: ${Math.floor(runScore)}`;

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    if (!Array.isArray(topList) || !topList.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No scores yet.";
      td.style.padding = "4px";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      topList.forEach((entry, idx) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.textContent = String(idx + 1);
        tdRank.style.textAlign = "right";
        tdRank.style.padding = "2px 4px";

        const tdTag = document.createElement("td");
        tdTag.textContent = entry.tag || "Unknown";
        tdTag.style.padding = "2px 4px";

        const tdScore = document.createElement("td");
        tdScore.textContent = entry.bestScore != null
          ? String(Math.floor(entry.bestScore))
          : "-";
        tdScore.style.padding = "2px 4px";

        const tdTime = document.createElement("td");
        tdTime.textContent = entry.bestTime != null
          ? formatTime(entry.bestTime)
          : "-";
        tdTime.style.padding = "2px 4px";

        tr.appendChild(tdRank);
        tr.appendChild(tdTag);
        tr.appendChild(tdScore);
        tr.appendChild(tdTime);
        tbody.appendChild(tr);
      });
    }

    scoreboardOverlay.style.display = "flex";
  }

  function hideScoreboardOverlay() {
    if (scoreboardOverlay) {
      scoreboardOverlay.style.display = "none";
    }
  }

  window.FrogGameLeaderboard = {
    initLeaderboard,
    submitScoreToServer,
    fetchLeaderboard,
    updateMiniLeaderboard,
    openScoreboardOverlay,
    hideScoreboardOverlay
  };
})();
