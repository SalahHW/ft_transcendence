import bigIntToString from '../utils/bigIntToString.js';

export default async function (fastify) {
    const contract = fastify.masterContract;

    fastify.get('/match/player/:name', {
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
                const matches = await contract.getMatchesByPlayer(
                    request.params.name
                );
                reply.send(bigIntToString({ success: true, matches }));
            } catch (error) {
                request.log.error(error);
                reply
                    .status(500)
                    .send({ success: false, error: error.message });
            }
        },
    });
}
