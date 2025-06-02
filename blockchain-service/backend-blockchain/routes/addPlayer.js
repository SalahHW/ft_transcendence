export default async function (fastify, opts) {
    const contract = fastify.masterContract;

    fastify.get('/protected', {
        preHandler: fastify.verifyJWT,
        handler: async (request, reply) => {
            return { msg: 'Success', user: request.user };
        },
    });

    fastify.post('/add-player', {
        preHandler: fastify.verifyJWT,
        schema: {
            body: {
                type: 'object',
                required: ['name', 'address'],
                properties: {
                    name: { type: 'string' },
                    address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
                },
            },
        },
        handler: async (request, reply) => {
            if (!contract) {
                return reply
                    .code(503)
                    .send({ error: 'Contract not initialized' });
            }

            const { name, address } = request.body;

            try {
                const tx = await contract.addPlayer(name, address);
                const receipt = await tx.wait();

                reply.send({
                    success: true,
                    transactionHash: tx.hash,
                });
            } catch (error) {
                request.log.error(error);
                reply.code(422).send({
                    success: false,
                    error: error.message,
                });
            }
        },
    });
}
