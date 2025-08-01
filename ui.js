// ui.js

export function showTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".nav-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.getElementById(tabName).classList.add("active");
  document
    .querySelector(`.nav-tab[data-tab="${tabName}"]`)
    .classList.add("active");
}

export function updateCurrentTeamDisplay(currentTeam) {
  const display = document.getElementById("currentTeamPlayers");
  if (currentTeam.players.length === 0) {
    display.innerHTML = "";
    return;
  }
  const html = `
        <div class="team-card">
            <h4>Current Players (${currentTeam.players.length}/7):</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${
                  (currentTeam.players.length / 7) * 100
                }%"></div>
            </div>
            <div class="player-grid">
                ${currentTeam.players
                  .map((player) => `<div class="player-item">${player}</div>`)
                  .join("")}
            </div>
        </div>`;
  display.innerHTML = html;
}

export function updateTeamsDisplay(teams, players) {
  const display = document.getElementById("teamsDisplay");
  if (teams.length === 0) {
    display.innerHTML =
      '<div class="alert alert-info">No teams registered yet.</div>';
    return;
  }

  let html = teams
    .map((team) => {
      const teamPlayers = players.filter((p) => p.Team === team.id);
      return `
        <div class="team-card">
            <div class="team-name">${team.id}</div>
            <div class="player-grid">
                ${teamPlayers
                  .map((p) => `<div class="player-item">${p.Name}</div>`)
                  .join("")}
            </div>
        </div>
    `;
    })
    .join("");

  if (teams.length < 4) {
    html += `<div class="alert alert-info">Teams registered: ${
      teams.length
    }/4. Need ${4 - teams.length} more.</div>`;
  } else {
    html +=
      '<div class="alert alert-success">All teams registered! Ready to generate the schedule.</div>';
  }
  display.innerHTML = html;
}

export function updateScheduleDisplay(matches) {
  const display = document.getElementById("scheduleDisplay");
  const roundRobinMatches = matches.filter((m) => !m.isFinal);
  if (roundRobinMatches.length === 0) {
    display.innerHTML =
      '<div class="alert alert-info">No matches scheduled.</div>';
    return;
  }

  const html = roundRobinMatches
    .map(
      (match) => `
        <div class="match-card">
            <div class="match-header">
                <div class="match-teams">${
                  match.Home
                } <span class="vs-badge">VS</span> ${match.Away}</div>
                <div class="match-status ${
                  match.Completed ? "status-completed" : "status-pending"
                }">
                    ${match.Completed ? "Completed" : "Pending"}
                </div>
            </div>
            ${
              match.Completed
                ? `<div style="text-align: center; font-size: 1.5rem; font-weight: 700;">
                Final Score: ${match.Home} ${match["Home Goals"]} - ${match["Away Goals"]} ${match.Away}
            </div>`
                : ""
            }
        </div>
    `
    )
    .join("");
  display.innerHTML = html;
}

export function updateResultsDisplay(
  pendingMatches,
  players,
  showCreateFinalButton
) {
  const display = document.getElementById("resultsDisplay");
  let html = "";

  if (pendingMatches.length > 0) {
    const getPlayersForTeam = (teamId) =>
      players.filter((p) => p.Team === teamId);
    html += pendingMatches
      .map(
        (match) => `
            <div class="match-card" data-match-id="${match.id}">
                <div class="match-header">
                    <div class="match-teams">${
                      match.Home
                    } <span class="vs-badge">VS</span> ${match.Away}</div>
                </div>
                <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin: 20px 0;">
                    <input type="number" id="homeGoals_${
                      match.id
                    }" class="stat-input" min="0" placeholder="0">
                    <span>-</span>
                    <input type="number" id="awayGoals_${
                      match.id
                    }" class="stat-input" min="0" placeholder="0">
                </div>
                <div class="player-stats-grid">
                    ${[match.Home, match.Away]
                      .map(
                        (teamId) => `
                        <div class="team-players">
                            <h4>⚽ ${teamId} Players</h4>
                            ${getPlayersForTeam(teamId)
                              .map(
                                (p) => `
                                <div class="player-stat-row">
                                    <span class="player-name">${p.Name}</span>
                                    <div class="stat-inputs">
                                        <input type="number" class="stat-input" data-player-id="${p.id}" data-stat="goals" min="0" placeholder="G">
                                        <input type="number" class="stat-input" data-player-id="${p.id}" data-stat="assists" min="0" placeholder="A">
                                    </div>
                                </div>`
                              )
                              .join("")}
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn btn-success record-result-btn" data-match-id="${
                      match.id
                    }">Record Match Result</button>
                </div>
            </div>
        `
      )
      .join("");
  } else {
    html =
      '<div class="alert alert-success">All round-robin matches completed!</div>';
  }

  if (showCreateFinalButton) {
    html += `
            <div class="card" style="text-align: center;">
                <h3 style="margin-bottom: 15px;">Ready for the Final?</h3>
                <p style="margin-bottom: 20px;">All group stage matches are complete. You can now create the championship final.</p>
                <button id="createFinalBtn" class="btn btn-success">🏆 Create Final Match</button>
            </div>
        `;
  }

  display.innerHTML = html;
}

export function updateStatsDisplay(teams, players, playerMatchStats) {
  const display = document.getElementById("statsDisplay");
  if (teams.length === 0) {
    display.innerHTML =
      '<div class="alert alert-info">No teams registered yet.</div>';
    return;
  }

  const allPlayersWithStats = [];
  players.forEach((p) => {
    const stats = playerMatchStats.filter((s) => s["Player ID"] === p.id);
    const goals = stats.reduce((sum, s) => sum + s.Goals, 0);
    const assists = stats.reduce((sum, s) => sum + s.Assists, 0);
    allPlayersWithStats.push({
      ...p,
      goals,
      assists,
      mvpPoints: goals * 2 + assists,
    });
  });

  allPlayersWithStats.sort(
    (a, b) => b.mvpPoints - a.mvpPoints || b.goals - a.goals
  );

  const topScorer = [...allPlayersWithStats].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  )[0];
  const topAssister = [...allPlayersWithStats].sort(
    (a, b) => b.assists - a.assists || b.goals - a.goals
  )[0];
  const mvp = allPlayersWithStats[0];

  let html = `
        <div class="card" style="margin-bottom: 30px;">
            <h3 style="text-align: center; font-size: 1.8rem; margin-bottom: 25px;">🏆 Tournament Awards</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px;">
                ${
                  mvp && mvp.mvpPoints > 0
                    ? `
                <div class="mvp-card">
                    <h4 style="text-align: center;">👑 Tournament MVP</h4>
                    <div class="mvp-player">
                        <div class="mvp-crown">🏆</div>
                        <div class="mvp-info">
                            <div class="mvp-name">${mvp.Name}</div>
                            <div class="mvp-team">${mvp.Team}</div>
                            <div class="mvp-stats">${mvp.goals}G • ${mvp.assists}A • ${mvp.mvpPoints} MVP Points</div>
                        </div>
                    </div>
                </div>`
                    : ""
                }
                ${
                  topScorer && topScorer.goals > 0
                    ? `
                <div class="mvp-card">
                    <h4 style="text-align: center;">⚽ Top Goal Scorer</h4>
                    <div class="mvp-player">
                        <div class="mvp-crown">⚽</div>
                        <div class="mvp-info">
                            <div class="mvp-name">${topScorer.Name}</div>
                            <div class="mvp-team">${topScorer.Team}</div>
                            <div class="mvp-stats">${topScorer.goals} Goals</div>
                        </div>
                    </div>
                </div>`
                    : ""
                }
                ${
                  topAssister && topAssister.assists > 0
                    ? `
                <div class="mvp-card">
                    <h4 style="text-align: center;">🎯 Top Assist Provider</h4>
                    <div class="mvp-player">
                        <div class="mvp-crown">🎯</div>
                        <div class="mvp-info">
                            <div class="mvp-name">${topAssister.Name}</div>
                            <div class="mvp-team">${topAssister.Team}</div>
                            <div class="mvp-stats">${topAssister.assists} Assists</div>
                        </div>
                    </div>
                </div>`
                    : ""
                }
            </div>
        </div>
        
        <div class="card">
            <h3 style="text-align: center; font-size: 1.8rem; margin-bottom: 20px;">📊 Player Leaderboard</h3>
            <div class="leaderboard-table">
                <div class="leaderboard-header">
                    <div class="rank-col">Rank</div><div class="player-col">Player</div><div class="team-col">Team</div>
                    <div class="goals-col">Goals</div><div class="assists-col">Assists</div><div class="mvp-col">MVP Pts</div>
                </div>
                ${
                  allPlayersWithStats
                    .filter((p) => p.mvpPoints > 0)
                    .slice(0, 10)
                    .map(
                      (p, i) => `
                    <div class="leaderboard-row ${i < 3 ? "top-three" : ""}">
                        <div class="rank-col"><span class="rank-badge ${
                          i === 0
                            ? "first"
                            : i === 1
                            ? "second"
                            : i === 2
                            ? "third"
                            : ""
                        }">${i + 1}</span></div>
                        <div class="player-col">${p.Name}</div>
                        <div class="team-col">${p.Team}</div>
                        <div class="goals-col">${p.goals}</div>
                        <div class="assists-col">${p.assists}</div>
                        <div class="mvp-col">${p.mvpPoints}</div>
                    </div>
                `
                    )
                    .join("") ||
                  '<div class="no-stats" style="grid-column: 1 / -1;">No player stats yet.</div>'
                }
            </div>
        </div>
    `;
  display.innerHTML = html;
}

export function updatePodiumDisplay(finalists) {
  const display = document.getElementById("podiumDisplay");
  if (finalists.length < 2) {
    display.innerHTML = "";
    return;
  }
  display.innerHTML = `
        <div class="podium">
            <h3>🏆 Championship Finalists</h3>
            <div class="finalists">
                ${finalists
                  .map(
                    (team, index) => `
                    <div class="finalist">
                        <h4>${index === 0 ? "🥇" : "🥈"} ${team.id}</h4>
                        <div class="finalist-stats">
                            ${team.Wins * 3 + team.Draws} points | ${
                      team["Goals For"] - team["Goals Against"] > 0 ? "+" : ""
                    }${team["Goals For"] - team["Goals Against"]} GD
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `;
}

export function updateFinalsDisplay(finalMatch, players, isAdmin) {
  const display = document.getElementById("finalsDisplay");
  if (!finalMatch) {
    display.innerHTML =
      '<div class="alert alert-info">The final match will appear here once created by the admin.</div>';
    return;
  }

  if (finalMatch.Completed) {
    const winner =
      finalMatch["Home Goals"] > finalMatch["Away Goals"]
        ? finalMatch.Home
        : finalMatch["Away Goals"] > finalMatch["Home Goals"]
        ? finalMatch.Away
        : "Draw";
    display.innerHTML = `
            <div class="match-card">
                <div style="text-align: center; font-size: 2rem; font-weight: 700;">
                    ${finalMatch.Home} ${finalMatch["Home Goals"]} - ${
      finalMatch["Away Goals"]
    } ${finalMatch.Away}
                </div>
                <div style="text-align: center; font-size: 1.5rem; color: #059669; font-weight: 700; margin-top: 20px;">
                    🎉 ${
                      winner !== "Draw"
                        ? `${winner} wins the championship!`
                        : "The final is a draw!"
                    }
                </div>
            </div>
        `;
    triggerConfetti();
  } else {
    const getPlayersForTeam = (teamId) =>
      players.filter((p) => p.Team === teamId);
    display.innerHTML = `
            <div class="match-card" data-match-id="${finalMatch.id}">
                <div class="match-header">
                    <div class="match-teams">${
                      finalMatch.Home
                    } <span class="vs-badge">FINAL</span> ${
      finalMatch.Away
    }</div>
                </div>
                ${
                  isAdmin
                    ? `
                <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin: 20px 0;">
                    <input type="number" id="homeGoals_${
                      finalMatch.id
                    }" class="stat-input" min="0" placeholder="0">
                    <span>-</span>
                    <input type="number" id="awayGoals_${
                      finalMatch.id
                    }" class="stat-input" min="0" placeholder="0">
                </div>
                <div class="player-stats-grid">
                    ${[finalMatch.Home, finalMatch.Away]
                      .map(
                        (teamId) => `
                        <div class="team-players">
                            <h4>⚽ ${teamId} Players</h4>
                            ${getPlayersForTeam(teamId)
                              .map(
                                (p) => `
                                <div class="player-stat-row">
                                    <span class="player-name">${p.Name}</span>
                                    <div class="stat-inputs">
                                        <input type="number" class="stat-input" data-player-id="${p.id}" data-stat="goals" min="0" placeholder="G">
                                        <input type="number" class="stat-input" data-player-id="${p.id}" data-stat="assists" min="0" placeholder="A">
                                    </div>
                                </div>`
                              )
                              .join("")}
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn btn-success record-result-btn" data-match-id="${
                      finalMatch.id
                    }">🏆 Record Final Result</button>
                </div>
                `
                    : `<div class="alert alert-info" style="text-align: center;">The final match is pending.</div>`
                }
            </div>
        `;
  }
}

function triggerConfetti() {
  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    if (typeof confetti === "function") {
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }
  }, 250);
}

// Simple confetti script - include this or a library
(function () {
  const script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
  script.onload = () => console.log("Confetti loaded.");
  document.head.appendChild(script);
})();
