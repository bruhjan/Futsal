// app.js

import * as DB from "./db.js";
import * as UI from "./ui.js";

// --- STATE MANAGEMENT ---
// This object will hold all our data, acting as a single source of truth.
const state = {
  currentTeam: { name: "", players: [] },
  teams: [],
  players: [],
  matches: [],
  playerMatchStats: [],
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
});

/**
 * Fetches all data from Firestore and initializes the UI.
 */
async function initializeApp() {
  console.log("Initializing app and fetching data...");
  try {
    // Fetch all data collections in parallel
    const [teams, players, matches, playerMatchStats] = await Promise.all([
      DB.getTeams(),
      DB.getPlayers(),
      DB.getMatches(),
      DB.getPlayerMatchStats(),
    ]);

    // Update the state
    state.teams = teams;
    state.players = players;
    state.matches = matches;
    state.playerMatchStats = playerMatchStats;

    console.log("Data fetched successfully:", state);

    // Render the initial UI with the fetched data
    refreshAllTabs();
  } catch (error) {
    console.error("Failed to initialize the application:", error);
    alert(
      "Error: Could not load tournament data. Please check the console and refresh."
    );
  }
}

/**
 * Sets up all the event listeners for the application.
 */
function setupEventListeners() {
  // --- Navigation Tabs ---
  document.querySelector(".nav-tabs").addEventListener("click", (e) => {
    if (e.target.matches(".nav-tab")) {
      const tabName = e.target.dataset.tab;
      UI.showTab(tabName);
      refreshTabContent(tabName);
    }
  });

  // --- Team Registration ---
  document.getElementById("addPlayerBtn").addEventListener("click", addPlayer);
  document.getElementById("saveTeamBtn").addEventListener("click", saveTeam);
  document
    .getElementById("clearTeamBtn")
    .addEventListener("click", clearCurrentTeam);
  document.getElementById("playerName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addPlayer();
  });

  // --- Schedule Generation ---
  document
    .getElementById("generateScheduleBtn")
    .addEventListener("click", generateSchedule);

  // --- Record Results (using event delegation) ---
  document.getElementById("resultsDisplay").addEventListener("click", (e) => {
    if (e.target.classList.contains("record-result-btn")) {
      const matchId = e.target.dataset.matchId;
      recordResult(matchId);
    }
  });

  // --- Tournament Reset ---
  document
    .getElementById("resetTournamentBtn")
    .addEventListener("click", resetTournament);
}

// --- UI REFRESH LOGIC ---

/**
 * Refreshes the content of all tabs based on the current state.
 */
function refreshAllTabs() {
  refreshTabContent("teams");
  refreshTabContent("schedule");
  refreshTabContent("results");
  refreshTabContent("stats");
}

/**
 * Refreshes the content of a specific tab.
 * @param {string} tabName - The name of the tab to refresh.
 */
function refreshTabContent(tabName) {
  switch (tabName) {
    case "teams":
      UI.updateTeamsDisplay(state.teams, state.players);
      break;
    case "schedule":
      UI.updateScheduleDisplay(state.matches);
      break;
    case "results":
      const pendingMatches = state.matches.filter((m) => !m.Completed);
      UI.updateResultsDisplay(pendingMatches, state.players);
      break;
    case "stats":
      UI.updateStatsDisplay(state.teams, state.players, state.playerMatchStats);
      break;
  }
}

// --- CORE LOGIC FUNCTIONS ---

function addPlayer() {
  const playerNameInput = document.getElementById("playerName");
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert("Player name cannot be empty.");
    return;
  }
  if (state.currentTeam.players.length >= 7) {
    alert("Maximum of 7 players per team.");
    return;
  }
  state.currentTeam.players.push(playerName);
  playerNameInput.value = "";
  UI.updateCurrentTeamDisplay(state.currentTeam);
}

function clearCurrentTeam() {
  state.currentTeam = { name: "", players: [] };
  document.getElementById("teamName").value = "";
  UI.updateCurrentTeamDisplay(state.currentTeam);
}

async function saveTeam() {
  const teamNameInput = document.getElementById("teamName");
  const teamName = teamNameInput.value.trim();

  if (!teamName) {
    alert("Team name must be filled.");
    return;
  }
  if (state.currentTeam.players.length !== 7) {
    alert("Team must have exactly 7 players.");
    return;
  }
  if (
    state.teams.some((team) => team.id.toLowerCase() === teamName.toLowerCase())
  ) {
    alert("A team with this name already exists.");
    return;
  }

  try {
    await DB.saveTeam(teamName, state.currentTeam.players);
    alert(`Team "${teamName}" saved successfully!`);
    clearCurrentTeam();
    initializeApp(); // Re-fetch all data to update the state
  } catch (error) {
    console.error("Error saving team: ", error);
    alert("Failed to save team. See console for details.");
  }
}

async function generateSchedule() {
  if (state.teams.length !== 4) {
    alert("Need exactly 4 teams to generate a schedule.");
    return;
  }
  try {
    await DB.generateSchedule(state.teams);
    alert("Schedule generated successfully!");
    initializeApp(); // Re-fetch all data
  } catch (error) {
    console.error("Error generating schedule: ", error);
    alert("Failed to generate schedule.");
  }
}

async function recordResult(matchId) {
  const matchData = state.matches.find((m) => m.id === matchId);
  if (!matchData) return;

  const homeGoals =
    parseInt(document.getElementById(`homeGoals_${matchId}`).value, 10) || 0;
  const awayGoals =
    parseInt(document.getElementById(`awayGoals_${matchId}`).value, 10) || 0;

  // Collect player stats from the specific match card
  const matchCard = document.querySelector(
    `.match-card[data-match-id="${matchId}"]`
  );
  const playerStatInputs = matchCard.querySelectorAll("[data-player-id]");

  const playerStats = [];
  const statsByPlayer = {};

  playerStatInputs.forEach((input) => {
    const playerId = input.dataset.playerId;
    const statType = input.dataset.stat;
    const value = parseInt(input.value, 10) || 0;

    if (value > 0) {
      if (!statsByPlayer[playerId]) {
        statsByPlayer[playerId] = { playerId, goals: 0, assists: 0 };
      }
      statsByPlayer[playerId][statType] = value;
    }
  });

  try {
    await DB.recordMatchResult(
      matchId,
      matchData,
      homeGoals,
      awayGoals,
      Object.values(statsByPlayer)
    );
    alert("Result recorded successfully!");
    initializeApp(); // Re-fetch all data to reflect the changes
  } catch (error) {
    console.error("Error recording result: ", error);
    alert("Failed to record result.");
  }
}

async function resetTournament() {
  if (
    confirm(
      "Are you sure you want to reset all match results and player stats? This action cannot be undone."
    )
  ) {
    try {
      console.log("Resetting tournament data...");
      await DB.resetTournamentData();
      alert("Tournament progress has been successfully reset.");
      initializeApp(); // Re-fetch and re-render everything
    } catch (error) {
      console.error("Failed to reset tournament:", error);
      alert(
        "An error occurred while resetting the tournament. Please check the console."
      );
    }
  }
}
