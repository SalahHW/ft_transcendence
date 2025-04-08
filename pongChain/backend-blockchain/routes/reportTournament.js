module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract;

    fastify.post('/report-tournament', {
        schema: {
            body: {
                type: 'object',
                required: ['endTimestamp', 'matchIds', 'winner'],
                properties: {
                    endTimestamp: { type: 'integer', minimum: 0 },
                    matchIds: {
                        type: 'array',
                        items: { type: 'integer', minimum: 0 }
                    },
                    winner: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(500).send({ error: 'Contract not initialized' });
        }

        const { endTimestamp, matchIds, winner } = request.body;

        try {
            const tx = await contract.reportTournament(endTimestamp, matchIds, winner);
            const receipt = await tx.wait();
            reply.send({
                success: true,
                transactionHash: tx.hash
            });
        } catch (error) {
            request.log.error(error);
            reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });
};

