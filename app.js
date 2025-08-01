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

    state.isAdmin = !!user;
    console.log(
      state.isAdmin ? `Admin user signed in` : "Proceeding as Guest."
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

  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("loginRedirectBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("record-result-btn")) {
      recordResult(e.target.dataset.matchId);
    }
    if (e.target.id === "createFinalBtn") {
      createFinalMatch();
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
  const finalMatch = state.matches.find((m) => m.isFinal);

  refreshTabContent("teams");
  refreshTabContent("schedule");
  if (state.isAdmin) refreshTabContent("results");
  refreshTabContent("stats");
  if (finalMatch) {
    document.querySelector('[data-tab="finals"]').style.display = "flex";
    refreshTabContent("finals");
  } else {
    document.querySelector('[data-tab="finals"]').style.display = "none";
  }
}

function refreshTabContent(tabName) {
  const finalMatch = state.matches.find((m) => m.isFinal);

  switch (tabName) {
    case "teams":
      UI.updateTeamsDisplay(state.teams, state.players);
      break;
    case "schedule":
      UI.updateScheduleDisplay(state.matches);
      break;
    case "results":
      if (state.isAdmin) {
        const roundRobinMatches = state.matches.filter((m) => !m.isFinal);
        const pendingMatches = roundRobinMatches.filter((m) => !m.Completed);
        const allRoundRobinDone =
          roundRobinMatches.length === 6 && pendingMatches.length === 0;
        UI.updateResultsDisplay(
          pendingMatches,
          state.players,
          allRoundRobinDone && !finalMatch
        );
      }
      break;
    case "stats":
      UI.updateStatsDisplay(state.teams, state.players, state.playerMatchStats);
      const roundRobinMatches = state.matches.filter((m) => !m.isFinal);
      if (
        roundRobinMatches.length === 6 &&
        roundRobinMatches.every((m) => m.Completed)
      ) {
        const sortedTeams = getSortedTeams();
        UI.updatePodiumDisplay(sortedTeams.slice(0, 2));
      } else {
        UI.updatePodiumDisplay([]);
      }
      break;
    case "finals":
      UI.updateFinalsDisplay(finalMatch, state.players, state.isAdmin);
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

  const matchCard = document.querySelector(`[data-match-id="${matchId}"]`);
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
    await initializeApp();
  } catch (error) {
    console.error("Error recording result: ", error);
  }
}

async function resetTournament() {
  if (!state.isAdmin) return alert("Guests cannot reset the tournament.");
  if (
    confirm(
      "Are you sure you want to reset all tournament data? This action cannot be undone."
    )
  ) {
    try {
      await DB.resetTournamentData();
      alert("Tournament has been successfully reset.");
      initializeApp();
    } catch (error) {
      console.error("Failed to reset tournament:", error);
    }
  }
}

// --- FINALS LOGIC ---
function getSortedTeams() {
  // This calculates standings based on round-robin results only
  const teamsWithStandings = state.teams.map((team) => {
    const roundRobinMatches = state.matches.filter(
      (m) => !m.isFinal && (m.Home === team.id || m.Away === team.id)
    );
    let wins = 0,
      draws = 0,
      losses = 0,
      goalsFor = 0,
      goalsAgainst = 0;

    roundRobinMatches.forEach((m) => {
      if (m.Completed) {
        if (m.Home === team.id) {
          goalsFor += m["Home Goals"];
          goalsAgainst += m["Away Goals"];
          if (m["Home Goals"] > m["Away Goals"]) wins++;
          else if (m["Home Goals"] < m["Away Goals"]) losses++;
          else draws++;
        } else {
          goalsFor += m["Away Goals"];
          goalsAgainst += m["Home Goals"];
          if (m["Away Goals"] > m["Home Goals"]) wins++;
          else if (m["Away Goals"] < m["Home Goals"]) losses++;
          else draws++;
        }
      }
    });
    return {
      ...team,
      Wins: wins,
      Draws: draws,
      Losses: losses,
      "Goals For": goalsFor,
      "Goals Against": goalsAgainst,
    };
  });

  return teamsWithStandings.sort((a, b) => {
    const pointsA = a.Wins * 3 + a.Draws;
    const pointsB = b.Wins * 3 + b.Draws;
    if (pointsB !== pointsA) return pointsB - pointsA;
    const gdA = a["Goals For"] - a["Goals Against"];
    const gdB = b["Goals For"] - b["Goals Against"];
    if (gdB !== gdA) return gdB - gdA;
    return b["Goals For"] - a["Goals For"];
  });
}

async function createFinalMatch() {
  if (!state.isAdmin) return;
  const sortedTeams = getSortedTeams();
  const top2 = sortedTeams.slice(0, 2);
  try {
    await DB.createFinalMatch(top2[0], top2[1]);
    alert(`Final match created between ${top2[0].id} and ${top2[1].id}!`);
    await initializeApp();
  } catch (error) {
    console.error("Error creating final match:", error);
  }
}
