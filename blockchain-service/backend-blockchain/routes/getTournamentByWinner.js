import bigIntToString from '../utils/bigIntToString.js';

export default async function (fastify) {
    const contract = fastify.masterContract;

    fastify.get('/tournament/winner/:address', {
        schema: {
            params: {
                type: 'object',
                required: ['address'],
                properties: {
                    address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
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
                const tournaments = await contract.getTournamentByWinner(
                    request.params.address
                );
                reply.send(bigIntToString({ success: true, tournaments }));
            } catch (error) {
                request.log.error(error);
                reply
                    .status(500)
                    .send({ success: false, error: error.message });
            }
        },
    });
}
