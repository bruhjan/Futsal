// db.js

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- FETCH FUNCTIONS ---

/**
 * Fetches all documents from a given collection.
 * @param {string} collectionName - The name of the collection to fetch.
 * @returns {Promise<Array>} A promise that resolves to an array of documents with their IDs.
 */
async function fetchCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export const getTeams = () => fetchCollection("teams");
export const getPlayers = () => fetchCollection("players");
export const getMatches = () => fetchCollection("match");
export const getPlayerMatchStats = () => fetchCollection("player_match_stat");

// --- WRITE FUNCTIONS ---

/**
 * Saves a new team and its players to Firestore using a batch write.
 * @param {string} teamName - The name of the team, used as the document ID.
 * @param {Array<string>} playerNames - An array of player names.
 */
export async function saveTeam(teamName, playerNames) {
  const batch = writeBatch(db);

  // 1. Create the team document. The team name is the ID.
  const teamRef = doc(db, "teams", teamName);
  batch.set(teamRef, {
    // Use bracket notation for fields with spaces
    "Goals For": 0,
    "Goals Against": 0,
    Wins: 0,
    Loss: 0,
    Draw: 0,
  });

  // 2. Create a document for each player.
  playerNames.forEach((playerName) => {
    const playerRef = doc(collection(db, "players")); // Auto-generates a unique ID
    batch.set(playerRef, {
      Name: playerName,
      Team: teamName, // Reference to the team's document ID
    });
  });

  // 3. Commit the batch write.
  await batch.commit();
}

/**
 * Creates all round-robin matches for the registered teams.
 * @param {Array<Object>} teams - An array of team objects.
 */
export async function generateSchedule(teams) {
  const batch = writeBatch(db);

  // Delete existing matches to prevent duplicates
  const existingMatches = await getMatches();
  existingMatches.forEach((match) => {
    const matchRef = doc(db, "match", match.id);
    batch.delete(matchRef);
  });

  // Create new matches
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const matchRef = doc(collection(db, "match"));
      batch.set(matchRef, {
        Home: teams[i].id,
        Away: teams[j].id,
        "Home Goals": 0,
        "Away Goals": 0,
        Completed: false,
        "Home Win": false,
      });
    }
  }
  await batch.commit();
}

/**
 * Records the result of a match and updates all relevant stats in a single transaction.
 * @param {string} matchId - The ID of the match document.
 * @param {Object} matchData - The original match data.
 * @param {number} homeGoals - Goals scored by the home team.
 * @param {number} awayGoals - Goals scored by the away team.
 * @param {Array<Object>} playerStats - Array of player performance objects {playerId, goals, assists}.
 */
export async function recordMatchResult(
  matchId,
  matchData,
  homeGoals,
  awayGoals,
  playerStats
) {
  const batch = writeBatch(db);

  // 1. Update the match document itself
  const matchRef = doc(db, "match", matchId);
  batch.update(matchRef, {
    Completed: true,
    "Home Goals": homeGoals,
    "Away Goals": awayGoals,
    "Home Win": homeGoals > awayGoals,
  });

  // 2. Create player_match_stat documents for players who contributed
  playerStats.forEach((stat) => {
    if (stat.goals > 0 || stat.assists > 0) {
      const statRef = doc(collection(db, "player_match_stat"));
      batch.set(statRef, {
        "Match ID": matchId,
        "Player ID": stat.playerId,
        Goals: stat.goals,
        Assists: stat.assists,
      });
    }
  });

  // 3. Update the home team's stats
  const homeTeamRef = doc(db, "teams", matchData.Home);
  batch.update(homeTeamRef, {
    "Goals For": increment(homeGoals),
    "Goals Against": increment(awayGoals),
    ...(homeGoals > awayGoals
      ? { Wins: increment(1) }
      : homeGoals < awayGoals
      ? { Loss: increment(1) }
      : { Draw: increment(1) }),
  });

  // 4. Update the away team's stats
  const awayTeamRef = doc(db, "teams", matchData.Away);
  batch.update(awayTeamRef, {
    "Goals For": increment(awayGoals),
    "Goals Against": increment(homeGoals),
    ...(awayGoals > homeGoals
      ? { Wins: increment(1) }
      : awayGoals < homeGoals
      ? { Loss: increment(1) }
      : { Draw: increment(1) }),
  });

  // 5. Commit all changes atomically
  await batch.commit();
}

/**
 * Resets all match results and team statistics in Firestore.
 */
export async function resetTournamentData() {
  const batch = writeBatch(db);

  // 1. Get all collections that need to be modified/deleted
  const [teams, matches, playerMatchStats] = await Promise.all([
    getTeams(),
    getMatches(),
    getPlayerMatchStats(),
  ]);

  // 2. Delete all player_match_stat documents
  playerMatchStats.forEach((stat) => {
    const statRef = doc(db, "player_match_stat", stat.id);
    batch.delete(statRef);
  });

  // 3. Reset all team documents
  teams.forEach((team) => {
    const teamRef = doc(db, "teams", team.id);
    batch.update(teamRef, {
      "Goals For": 0,
      "Goals Against": 0,
      Wins: 0,
      Loss: 0,
      Draw: 0,
    });
  });

  // 4. Reset all match documents
  matches.forEach((match) => {
    const matchRef = doc(db, "match", match.id);
    batch.update(matchRef, {
      "Home Goals": 0,
      "Away Goals": 0,
      Completed: false,
      "Home Win": false,
    });
  });

  // 5. Commit all changes
  await batch.commit();
}
