const retryUntilSuccess = require("../utils/retryUntilSuccess");
const parseContractError = require("../utils/parseContractError");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.post(
    "/add-player",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "address"],
          properties: {
            name: { type: "string" },
            address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      const { name, address } = request.body;

      try {
        const { tx } = await retryUntilSuccess(
          () => contract.addPlayer(name, address),
          10,
          3000,
          parseContractError
        );
        reply.send({
          success: true,
          transactionHash: tx.hash,
        });
      } catch (error) {
        request.log.error(error, "Add player failed");
        reply.status(422).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
};
