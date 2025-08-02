// db.js

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  increment,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- FETCH FUNCTIONS ---
async function fetchCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export const getTeams = () => fetchCollection("teams");
export const getPlayers = () => fetchCollection("players");
export const getMatches = () => fetchCollection("match");
export const getPlayerMatchStats = () => fetchCollection("player_match_stat");

// --- WRITE FUNCTIONS ---

export async function saveTeam(teamName, playerNames) {
  const batch = writeBatch(db);
  const teamRef = doc(db, "teams", teamName);
  batch.set(teamRef, {
    "Goals For": 0,
    "Goals Against": 0,
    Wins: 0,
    Loss: 0,
    Draw: 0,
  });
  playerNames.forEach((playerName) => {
    const playerRef = doc(collection(db, "players"));
    batch.set(playerRef, { Name: playerName, Team: teamName });
  });
  await batch.commit();
}

export async function generateSchedule(teams) {
  const batch = writeBatch(db);
  const existingMatches = await getMatches();
  existingMatches.forEach((match) => {
    batch.delete(doc(db, "match", match.id));
  });

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
        isFinal: false,
      });
    }
  }
  await batch.commit();
}

export async function createFinalMatch(team1, team2) {
  // Creates a new document in the 'match' collection for the final.
  await addDoc(collection(db, "match"), {
    Home: team1.id,
    Away: team2.id,
    "Home Goals": 0,
    "Away Goals": 0,
    Completed: false,
    "Home Win": false,
    isFinal: true,
  });
}

export async function recordMatchResult(
  matchId,
  matchData,
  homeGoals,
  awayGoals,
  playerStats
) {
  const batch = writeBatch(db);
  const matchRef = doc(db, "match", matchId);
  batch.update(matchRef, {
    Completed: true,
    "Home Goals": homeGoals,
    "Away Goals": awayGoals,
    "Home Win": homeGoals > awayGoals,
  });

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

  // This will now update team stats for ALL matches, including the final.
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

  await batch.commit();
}

export async function resetTournamentData() {
  const batch = writeBatch(db);
  const [teams, matches, playerMatchStats] = await Promise.all([
    getTeams(),
    getMatches(),
    getPlayerMatchStats(),
  ]);

  // CORRECTED: Deletes all documents from the specified collections.
  playerMatchStats.forEach((stat) =>
    batch.delete(doc(db, "player_match_stat", stat.id))
  );
  matches.forEach((match) => batch.delete(doc(db, "match", match.id)));

  // Resets team stats to 0
  teams.forEach((team) =>
    batch.update(doc(db, "teams", team.id), {
      "Goals For": 0,
      "Goals Against": 0,
      Wins: 0,
      Loss: 0,
      Draw: 0,
    })
  );

  await batch.commit();
}
