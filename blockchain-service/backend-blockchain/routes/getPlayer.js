const parseContractError = require("../utils/parseContractError");

module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.get(
    "/player/:address",
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
        const name = await contract.getPlayerName(request.params.address);
        reply.send({ success: true, name });
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
