export default async function (fastify) {
    const contract = fastify.masterContract;

    fastify.get('/player/:name', {
        schema: {
            params: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                },
            },
        },
        handler: async (request, reply) => {
            if (!contract) {
                return reply
                    .status(503)
                    .send({ error: 'Contract not initialized' });
            }

            try {
                const player = await contract.getPlayerAddress(
                    request.params.name
                );
                reply.send({ success: true, player });
            } catch (error) {
                request.log.error(error);
                reply
                    .status(500)
                    .send({ success: false, error: error.message });
            }
        },
    });
}
