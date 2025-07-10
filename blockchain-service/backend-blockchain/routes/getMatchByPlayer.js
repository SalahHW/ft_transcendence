const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify, opts) => {
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
      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      try {
        const matches = await contract.getMatchesByPlayer(
          request.params.address
        );

        if (!matches || matches.length === 0) {
          return reply.status(404).send({
            success: false,
            error: "No matches found for this wallet.",
          });
        }

        reply.send(bigIntToString({ success: true, matches }));
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ success: false, error: error.message });
      }
    }
  );
};
