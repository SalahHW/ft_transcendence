export default async function (fastify) {
  const contract = fastify.masterContract;
  fastify.get(
    "/player/:name",
    {
      schema: {
        params: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      try {
        const player = await contract.getPlayerAddress(request.params.name);

        if (player === "0x0000000000000000000000000000000000000000") {
          request.log.warn(
            `Player '${request.params.name}' not found on-chain.`
          );
          return reply.status(404).send({
            success: false,
            error: "Player not found on-chain",
          });
        }

        reply.send({ success: true, player });
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({
          success: false,
          error: "Failed to retrieve player",
          details: error.message,
        });
      }
    }
  );
}
