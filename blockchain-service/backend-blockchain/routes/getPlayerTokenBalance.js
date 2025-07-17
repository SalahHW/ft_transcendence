const parseContractError = require("../utils/parseContractError");

module.exports = async function (fastify) {
  fastify.get(
    "/token/balance/:address",
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
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              address: { type: "string" },
              balance: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { address } = request.params;
      const contract = fastify.masterContract;

      try {
        const balance = await contract.getPongTokenBalance(address);
        reply.send({
          success: true,
          address,
          balance: balance.toString(),
        });
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
