const parseContractError = require("../utils/parseContractError");
const retryUntilSuccess = require("../utils/retryUntilSuccess");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.post(
    "/report-tournament",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "endTimestamp",
            "winner",
            "second",
            "third",
            "fourth",
            "matches",
          ],
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
                  "second",
                  "third",
                  "fourth",
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
                  second: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                  },
                  third: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                  },
                  fourth: {
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

      const { endTimestamp, winner, second, third, fourth, matches } =
        request.body;

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

        const { tx } = await retryUntilSuccess(
          () =>
            contract.reportTournament(
              endTimestamp,
              winner,
              second,
              third,
              fourth,
              matchStructs
            ),
          10,
          3000,
          parseContractError
        );

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
