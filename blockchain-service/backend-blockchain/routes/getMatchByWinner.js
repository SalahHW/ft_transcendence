const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.get(
    "/match/winner/:address",
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
      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      const { address } = request.params;

      try {
        const matches = await contract.getMatchesByWinner(address);
        reply.send(bigIntToString({ success: true, matches }));
      } catch (error) {
        request.log.error(error);

        const reason =
          error?.reason || error?.error?.message || error?.message || "";

        if (reason.includes("No matches found")) {
          return reply.status(404).send({
            success: false,
            error: "No matches found for this wallet.",
          });
        }

        return reply.status(500).send({
          success: false,
          error: "Internal server error",
          details: reason,
        });
      }
    }
  );
};
