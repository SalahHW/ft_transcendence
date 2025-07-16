const parseContractError = require("../utils/parseContractError");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.post(
    "/report-tournament",
    {
      schema: {
        body: {
          type: "object",
          required: ["endTimestamp", "winner", "matches"],
          properties: {
            endTimestamp: { type: "integer", minimum: 0 },
            winner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            matches: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                required: [
                  "player1",
                  "player2",
                  "winner",
                  "player1Score",
                  "player2Score",
                ],
                properties: {
                  player1: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                  },
                  player2: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                  },
                  winner: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                  },
                  player1Score: { type: "integer", minimum: 0 },
                  player2Score: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const { endTimestamp, winner, matches } = request.body;

      // Vérification manuelle côté JS pour éviter une perte de temps côté Solidity
      if (matches.length !== 4) {
        return reply
          .status(400)
          .send({ error: "Exactly 4 matches are required." });
      }

      try {
        const matchStructs = matches.map((match) => ({
          player1: match.player1,
          player2: match.player2,
          player1Score: match.player1Score,
          player2Score: match.player2Score,
          winner: match.winner,
        }));

        const tx = await contract.reportTournament(
          endTimestamp,
          winner,
          matchStructs
        );

        await tx.wait();

        reply.send({ success: true, transactionHash: tx.hash });
      } catch (error) {
        request.log.error(error);
        const { code, error: message, details } = parseContractError(error);
        reply.status(code).send({
          success: false,
          error: message,
          ...(details && { details }),
        });
      }
    }
  );
};
