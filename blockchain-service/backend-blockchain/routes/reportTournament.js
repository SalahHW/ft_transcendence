const parseContractError = require("../utils/parseContractError");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.post(
    "/report-tournament",
    {
      schema: {
        body: {
          type: "object",
          required: ["endTimestamp", "winner"],
          properties: {
            endTimestamp: { type: "integer", minimum: 0 },
            winner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract)
        return reply.status(503).send({ error: "Contract not initialized" });

      const { endTimestamp, winner } = request.body;

      try {
        const tx = await contract.reportTournament(endTimestamp, winner);
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
