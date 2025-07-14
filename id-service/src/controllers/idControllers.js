import { checkAndInsertMatchId, checkAndInsertTournamentId } from "../models/idModels.js";

export const registerId = async (request, reply) => {
  try {
    const { matchId, tournamentId } = request.body;

    // Validate that exactly one ID is provided
    if (!matchId && !tournamentId) {
      return reply.status(400).send({
        error: "Either matchId or tournamentId must be provided"
      });
    }

    if (matchId && tournamentId) {
      return reply.status(400).send({
        error: "Only one ID type can be provided at a time"
      });
    }

    // Validate that the ID is an integer
    if (matchId && (!Number.isInteger(matchId) || matchId <= 0)) {
      return reply.status(400).send({
        error: "matchId must be a positive integer"
      });
    }

    if (tournamentId && (!Number.isInteger(tournamentId) || tournamentId <= 0)) {
      return reply.status(400).send({
        error: "tournamentId must be a positive integer"
      });
    }

    let result;

    if (matchId) {
      result = await checkAndInsertMatchId(matchId);
    } else {
      result = await checkAndInsertTournamentId(tournamentId);
    }

    return reply.status(201).send(result);

  } catch (error) {
    if (error.message === "Match ID already exists" || error.message === "Tournament ID already exists") {
      return reply.status(409).send({
        error: error.message
      });
    }

    console.error("Error registering ID:", error);
    return reply.status(500).send({
      error: "Internal server error"
    });
  }
}; 