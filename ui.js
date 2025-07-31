// ui.js

/**
 * Handles switching between tabs.
 * @param {string} tabName - The name of the tab to show.
 */
export function showTab(tabName) {
  // Hide all tab content
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  // Deactivate all nav tabs
  document
    .querySelectorAll(".nav-tab")
    .forEach((tab) => tab.classList.remove("active"));

  // Show the selected tab content and activate the nav tab
  document.getElementById(tabName).classList.add("active");
  document
    .querySelector(`.nav-tab[data-tab="${tabName}"]`)
    .classList.add("active");
}

/**
 * Displays the list of players added to the current team being registered.
 * @param {Object} currentTeam - The team object with a 'players' array.
 */
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

/**
 * Renders the list of all registered teams and their players.
 * @param {Array<Object>} teams - Array of team objects from Firestore.
 * @param {Array<Object>} players - Array of player objects from Firestore.
 */
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

/**
 * Renders the match schedule.
 * @param {Array<Object>} matches - Array of match objects.
 */
export function updateScheduleDisplay(matches) {
  const display = document.getElementById("scheduleDisplay");
  if (matches.length === 0) {
    display.innerHTML =
      '<div class="alert alert-info">No matches scheduled. Generate schedule once 4 teams are registered.</div>';
    return;
  }

  const html = matches
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

/**
 * Renders the UI for recording match results.
 * @param {Array<Object>} pendingMatches - Matches that are not yet completed.
 * @param {Array<Object>} players - All registered players.
 */
export function updateResultsDisplay(pendingMatches, players) {
  const display = document.getElementById("resultsDisplay");
  if (pendingMatches.length === 0) {
    display.innerHTML =
      '<div class="alert alert-success">All round-robin matches completed!</div>';
    return;
  }

  const getPlayersForTeam = (teamId) =>
    players.filter((p) => p.Team === teamId);

  const html = pendingMatches
    .map((match) => {
      const homeTeamPlayers = getPlayersForTeam(match.Home);
      const awayTeamPlayers = getPlayersForTeam(match.Away);

      return `
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
                <div class="team-players">
                    <h4>⚽ ${match.Home} Players</h4>
                    ${homeTeamPlayers
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
                <div class="team-players">
                    <h4>⚽ ${match.Away} Players</h4>
                    ${awayTeamPlayers
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
            </div>
            <div style="text-align: center; margin-top: 25px;">
                <button class="btn btn-success record-result-btn" data-match-id="${
                  match.id
                }">Record Match Result</button>
            </div>
        </div>
        `;
    })
    .join("");
  display.innerHTML = html;
}

/**
 * Renders the statistics page with leaderboards and team standings.
 * @param {Array<Object>} teams - All team objects.
 * @param {Array<Object>} players - All player objects.
 * @param {Array<Object>} playerMatchStats - All player_match_stat objects.
 */
export function updateStatsDisplay(teams, players, playerMatchStats) {
  const display = document.getElementById("statsDisplay");

  // 1. Aggregate Player Stats
  const playerTotals = {};
  players.forEach((p) => {
    playerTotals[p.id] = { ...p, goals: 0, assists: 0, mvpPoints: 0 };
  });

  playerMatchStats.forEach((stat) => {
    // Use bracket notation here
    const playerId = stat["Player ID"];
    if (playerTotals[playerId]) {
      playerTotals[playerId].goals += stat.Goals;
      playerTotals[playerId].assists += stat.Assists;
    }
  });

  Object.values(playerTotals).forEach((p) => {
    p.mvpPoints = p.goals * 2 + p.assists;
  });

  // 2. Sort players and teams
  const sortedPlayers = Object.values(playerTotals).sort(
    (a, b) => b.mvpPoints - a.mvpPoints
  );
  const sortedTeams = [...teams].sort((a, b) => {
    const pointsA = a.Wins * 3 + a.Draw;
    const pointsB = b.Wins * 3 + b.Draw;
    if (pointsB !== pointsA) return pointsB - pointsA;
    const gdA = a["Goals For"] - a["Goals Against"];
    const gdB = b["Goals For"] - b["Goals Against"];
    if (gdB !== gdA) return gdB - gdA;
    return b["Goals For"] - a["Goals For"];
  });

  // 3. Render HTML
  let html = `
        <div class="card">
            <h3 style="text-align: center; font-size: 1.8rem; margin-bottom: 20px;">Player Leaderboard</h3>
            <div class="leaderboard-table">
                <div class="leaderboard-header">
                    <div class="rank-col">Rank</div>
                    <div class="player-col">Player</div>
                    <div class="team-col">Team</div>
                    <div class="goals-col">Goals</div>
                    <div class="assists-col">Assists</div>
                    <div class="mvp-col">MVP Pts</div>
                </div>
                ${
                  sortedPlayers
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
                  '<div class="no-stats" style="grid-column: 1 / -1; padding: 20px;">No player stats yet.</div>'
                }
            </div>
        </div>

        <div class="card">
            <h3 style="text-align: center; font-size: 1.8rem; margin-bottom: 20px;">Team Standings</h3>
            <div class="stats-grid">
                ${sortedTeams
                  .map((team, index) => {
                    const goalDifference =
                      team["Goals For"] - team["Goals Against"];
                    return `
                    <div class="stats-card">
                        <div class="stats-header">
                            <div class="rank-badge ${
                              index === 0
                                ? "first"
                                : index === 1
                                ? "second"
                                : ""
                            }">${index + 1}</div>
                            ${team.id}
                        </div>
                        <div class="stat-row"><span class="stat-label">Points:</span><span class="stat-value">${
                          team.Wins * 3 + team.Draw
                        }</span></div>
                        <div class="stat-row"><span class="stat-label">Record (W-D-L):</span><span class="stat-value">${
                          team.Wins
                        }-${team.Draw}-${team.Loss}</span></div>
                        <div class="stat-row"><span class="stat-label">Goals For:</span><span class="stat-value">${
                          team["Goals For"]
                        }</span></div>
                        <div class="stat-row"><span class="stat-label">Goals Against:</span><span class="stat-value">${
                          team["Goals Against"]
                        }</span></div>
                        <div class="stat-row"><span class="stat-label">Goal Difference:</span><span class="stat-value">${
                          goalDifference > 0 ? "+" : ""
                        }${goalDifference}</span></div>
                    </div>
                `;
                  })
                  .join("")}
            </div>
        </div>
    `;

  display.innerHTML = html;
}
