const parseContractError = require("../utils/parseContractError");
const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify) => {
  const contract = fastify.masterContract;

  fastify.get(
    "/tournaments/byPlayer/:address",
    {
      schema: {
        params: {
          type: "object",
          required: ["address"],
          properties: {
            address: {
              type: "string",
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const { address } = request.params;

      try {
        const tournaments = await contract.getTournamentsByPlayer(address);
        reply.send(
          bigIntToString({
            success: true,
            tournaments: tournaments.map(
              ([endTimestamp, matchIds, tournamentId, winnerAddress]) => ({
                endTimestamp,
                matchIds,
                tournamentId,
                winnerAddress,
              })
            ),
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
