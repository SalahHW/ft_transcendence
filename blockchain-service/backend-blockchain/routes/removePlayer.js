module.exports = async (fastify, opts) => {
  const contract = fastify.masterContract;

  fastify.delete(
    "/remove/:address",
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
      const { address } = request.params;

      if (!contract) {
        return reply.status(503).send({ error: "Contract not initialized" });
      }

      try {
        const tx = await contract.removePlayer(address);
        await tx.wait();
        reply.send({ success: true, transactionHash: tx.hash });
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ success: false, error: error.message });
      }
    }
  );
};
