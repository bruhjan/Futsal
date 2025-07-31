// app.js

import { db } from "./firebase-config.js";
import * as DB from "./db.js";
import * as UI from "./ui.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth();

// --- STATE MANAGEMENT ---
const state = {
  isAdmin: false,
  currentTeam: { name: "", players: [] },
  teams: [],
  players: [],
  matches: [],
  playerMatchStats: [],
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById("loader");
    const appContainer = document.getElementById("app-container");

    state.isAdmin = !!user; // Sets to true if user exists, false otherwise
    console.log(
      state.isAdmin
        ? `Admin user signed in: ${user.email}`
        : "Proceeding as Guest."
    );

    configureUIForRole(state.isAdmin);
    initializeApp();

    loader.style.display = "none";
    appContainer.style.display = "block";
  });

  setupEventListeners();
});

async function initializeApp() {
  try {
    const [teams, players, matches, playerMatchStats] = await Promise.all([
      DB.getTeams(),
      DB.getPlayers(),
      DB.getMatches(),
      DB.getPlayerMatchStats(),
    ]);

    state.teams = teams;
    state.players = players;
    state.matches = matches;
    state.playerMatchStats = playerMatchStats;

    refreshAllTabs();
  } catch (error) {
    console.error("Failed to initialize the application:", error);
    alert("Error: Could not load tournament data.");
  }
}

function setupEventListeners() {
  document.querySelector(".nav-tabs").addEventListener("click", (e) => {
    if (e.target.matches(".nav-tab")) {
      UI.showTab(e.target.dataset.tab);
      refreshTabContent(e.target.dataset.tab);
    }
  });

  document.getElementById("addPlayerBtn").addEventListener("click", addPlayer);
  document.getElementById("saveTeamBtn").addEventListener("click", saveTeam);
  document
    .getElementById("clearTeamBtn")
    .addEventListener("click", clearCurrentTeam);
  document.getElementById("playerName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addPlayer();
  });

  document
    .getElementById("generateScheduleBtn")
    .addEventListener("click", generateSchedule);
  document
    .getElementById("resetTournamentBtn")
    .addEventListener("click", resetTournament);

  // Listeners for Login and Logout buttons
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("loginRedirectBtn").addEventListener("click", () => {
    window.location.href = "index.html"; // Redirect guest to login page
  });

  document.getElementById("resultsDisplay").addEventListener("click", (e) => {
    if (e.target.classList.contains("record-result-btn")) {
      recordResult(e.target.dataset.matchId);
    }
  });
}

function configureUIForRole(isAdmin) {
  const adminOnlyElements = [
    document.querySelector('[data-tab="results"]'),
    document.getElementById("team-registration-card"),
    document.getElementById("generateScheduleBtn"),
    document.getElementById("resetTournamentBtn"),
  ];

  const loginBtn = document.getElementById("loginRedirectBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (isAdmin) {
    adminOnlyElements.forEach((el) => {
      if (el) el.style.display = "block";
    });
    logoutBtn.style.display = "block";
    loginBtn.style.display = "none";
  } else {
    adminOnlyElements.forEach((el) => {
      if (el) el.style.display = "none";
    });
    logoutBtn.style.display = "none";
    loginBtn.style.display = "block";

    const activeTab = document.querySelector(".nav-tab.active");
    if (activeTab && activeTab.dataset.tab === "results") {
      UI.showTab("schedule");
    }
  }
}

// --- UI REFRESH LOGIC ---
function refreshAllTabs() {
  refreshTabContent("teams");
  refreshTabContent("schedule");
  if (state.isAdmin) refreshTabContent("results");
  refreshTabContent("stats");
}

function refreshTabContent(tabName) {
  switch (tabName) {
    case "teams":
      UI.updateTeamsDisplay(state.teams, state.players);
      break;
    case "schedule":
      UI.updateScheduleDisplay(state.matches);
      break;
    case "results":
      if (state.isAdmin) {
        const pendingMatches = state.matches.filter((m) => !m.Completed);
        UI.updateResultsDisplay(pendingMatches, state.players);
      }
      break;
    case "stats":
      UI.updateStatsDisplay(state.teams, state.players, state.playerMatchStats);
      break;
  }
}

// --- CORE LOGIC FUNCTIONS ---
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

function addPlayer() {
  const playerNameInput = document.getElementById("playerName");
  const playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Player name cannot be empty.");
  if (state.currentTeam.players.length >= 7)
    return alert("Maximum of 7 players per team.");
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
  if (!state.isAdmin) return alert("Guests cannot register teams.");
  const teamNameInput = document.getElementById("teamName");
  const teamName = teamNameInput.value.trim();
  if (!teamName) return alert("Team name must be filled.");
  if (state.currentTeam.players.length !== 7)
    return alert("Team must have exactly 7 players.");
  if (
    state.teams.some((team) => team.id.toLowerCase() === teamName.toLowerCase())
  )
    return alert("A team with this name already exists.");

  try {
    await DB.saveTeam(teamName, state.currentTeam.players);
    alert(`Team "${teamName}" saved successfully!`);
    clearCurrentTeam();
    initializeApp();
  } catch (error) {
    console.error("Error saving team: ", error);
  }
}

async function generateSchedule() {
  if (!state.isAdmin) return alert("Guests cannot generate schedules.");
  if (state.teams.length !== 4)
    return alert("Need exactly 4 teams to generate a schedule.");

  try {
    await DB.generateSchedule(state.teams);
    alert("Schedule generated successfully!");
    initializeApp();
  } catch (error) {
    console.error("Error generating schedule: ", error);
  }
}

async function recordResult(matchId) {
  if (!state.isAdmin) return;
  const matchData = state.matches.find((m) => m.id === matchId);
  if (!matchData) return;

  const homeGoals =
    parseInt(document.getElementById(`homeGoals_${matchId}`).value, 10) || 0;
  const awayGoals =
    parseInt(document.getElementById(`awayGoals_${matchId}`).value, 10) || 0;

  const matchCard = document.querySelector(
    `.match-card[data-match-id="${matchId}"]`
  );
  const playerStatInputs = matchCard.querySelectorAll("[data-player-id]");

  const statsByPlayer = {};
  playerStatInputs.forEach((input) => {
    const playerId = input.dataset.playerId;
    const statType = input.dataset.stat;
    const value = parseInt(input.value, 10) || 0;
    if (value > 0) {
      if (!statsByPlayer[playerId])
        statsByPlayer[playerId] = { playerId, goals: 0, assists: 0 };
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
    initializeApp();
  } catch (error) {
    console.error("Error recording result: ", error);
  }
}

async function resetTournament() {
  if (!state.isAdmin) return alert("Guests cannot reset the tournament.");
  if (
    confirm(
      "Are you sure you want to reset all match results and player stats? This action cannot be undone."
    )
  ) {
    try {
      await DB.resetTournamentData();
      alert("Tournament progress has been successfully reset.");
      initializeApp();
    } catch (error) {
      console.error("Failed to reset tournament:", error);
    }
  }
}
