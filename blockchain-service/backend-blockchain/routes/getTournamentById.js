const parseContractError = require("../utils/parseContractError");
const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify) => {
  const contract = fastify.masterContract;

  fastify.get(
    "/tournament/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      const { id } = request.params;

      try {
        const [endTimestamp, matchIds, tournamentId, winnerAddress] =
          await contract.getTournamentById(id);

        reply.send(
          bigIntToString({
            success: true,
            tournament: {
              endTimestamp,
              matchIds,
              tournamentId,
              winnerAddress,
            },
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
