import { database } from "./database.js";

export const checkAndInsertMatchId = async (matchId) => {
  try {
    // Check if matchId already exists
    const existingMatch = await database.get(
      "SELECT id FROM match_ids WHERE id = ?",
      [matchId]
    );

    if (existingMatch) {
      throw new Error("Match ID already exists");
    }

    // Insert the new matchId
    await database.run("INSERT INTO match_ids (id) VALUES (?)", [matchId]);
    
    return { success: true, message: "Match ID registered successfully" };
  } catch (error) {
    throw error;
  }
};

export const checkAndInsertTournamentId = async (tournamentId) => {
  try {
    // Check if tournamentId already exists
    const existingTournament = await database.get(
      "SELECT id FROM tournament_ids WHERE id = ?",
      [tournamentId]
    );

    if (existingTournament) {
      throw new Error("Tournament ID already exists");
    }

    // Insert the new tournamentId
    await database.run("INSERT INTO tournament_ids (id) VALUES (?)", [tournamentId]);
    
    return { success: true, message: "Tournament ID registered successfully" };
  } catch (error) {
    throw error;
  }
}; 