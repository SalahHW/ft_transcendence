const parseContractError = require("../utils/parseContractError");
const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify) => {
  const contract = fastify.masterContract;

  fastify.get(
    "/match/player/:address",
    {
      schema: {
        params: {
          type: "object",
          required: ["address"],
          properties: {
            address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      try {
        const rawMatches = await contract.getMatchesByPlayer(
          request.params.address
        );

        const matches = rawMatches.map(
          ([
            player1,
            player2,
            player1Score,
            player2Score,
            winner,
            endTimestamp,
          ]) => ({
            player1,
            player2,
            player1Score,
            player2Score,
            winner,
            endTimestamp,
          })
        );

        reply.send(
          bigIntToString({
            success: true,
            matches,
          })
        );
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
