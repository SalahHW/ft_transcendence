const parseContractError = require("../utils/parseContractError");

module.exports = async function (fastify) {
  fastify.get(
    "/nft/goat/:tokenId",
    {
      schema: {
        params: {
          type: "object",
          required: ["tokenId"],
          properties: {
            tokenId: { type: "integer", minimum: 299, maximum: 299 },
          },
        },
      },
    },
    async (request, reply) => {
      const tokenId = request.params.tokenId;
      const contract = fastify.goatNft;

      try {
        const owner = await contract.ownerOf(tokenId);
        reply.send({ success: true, tokenId, owner });
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
