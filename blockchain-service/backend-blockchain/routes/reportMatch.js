const parseContractError = require("../utils/parseContractError");

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
            "matchId",
            "player1Score",
            "player2Score",
            "winner",
          ],
          properties: {
            player1: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            player2: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            matchId: { type: "integer", minimum: 0 },
            player1Score: { type: "integer", minimum: 0, maximum: 255 },
            player2Score: { type: "integer", minimum: 0, maximum: 255 },
            winner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const { player1, player2, matchId, player1Score, player2Score, winner } =
        request.body;

      try {
        const tx = await contract.reportMatch(
          player1,
          player2,
          matchId,
          player1Score,
          player2Score,
          winner
        );
        await tx.wait();
        reply.send({ success: true, transactionHash: tx.hash });
      } catch (error) {
        request.log.error(error);
        const { code, error: message, details } = parseContractError(error);
        reply
          .status(code)
          .send({
            success: false,
            error: message,
            ...(details && { details }),
          });
      }
    }
  );
};
