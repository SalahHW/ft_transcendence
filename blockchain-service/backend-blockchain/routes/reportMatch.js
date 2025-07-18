const parseContractError = require("../utils/parseContractError");
const retryUntilSuccess = require("../utils/retryUntilSuccess");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.post(
    "/report-match",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "player1",
            "player2",
            "player1Score",
            "player2Score",
            "winner",
            "endTimestamp",
          ],
          properties: {
            player1: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            player2: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            player1Score: { type: "integer", minimum: 0, maximum: 255 },
            player2Score: { type: "integer", minimum: 0, maximum: 255 },
            winner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            endTimestamp: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const {
        player1,
        player2,
        player1Score,
        player2Score,
        winner,
        endTimestamp,
      } = request.body;

      try {
        const { tx } = await retryUntilSuccess(
          () =>
            contract.reportMatch(
              player1,
              player2,
              player1Score,
              player2Score,
              winner,
              endTimestamp
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
