const parseContractError = require("../utils/parseContractError");

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
            "matchIds",
            "winner",
            "tournamentTokenIds",
          ],
          properties: {
            endTimestamp: { type: "integer", minimum: 0 },
            matchIds: {
              type: "array",
              items: { type: "integer", minimum: 0 },
            },
            winner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            tournamentTokenIds: {
              type: "array",
              items: { type: "integer", minimum: 0 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const { endTimestamp, matchIds, winner, tournamentTokenIds } =
        request.body;

      try {
        const tx = await contract.reportTournament(
          endTimestamp,
          matchIds,
          winner,
          tournamentTokenIds[0]
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
