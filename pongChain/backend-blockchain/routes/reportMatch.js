module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract

    fastify.post('/report-match', {
        schema: {
            body: {
                type: 'object',
                required: ['player1', 'player2', 'matchId', 'player1Score', 'player2Score', 'winner'],
                properties: {
                    player1: { type: 'string' },
                    player2: { type: 'string' },
                    matchId: { type: 'integer', minimum: 0 },
                    player1Score: { type: 'integer', minimum: 0, maximum: 255 },
                    player2Score: { type: 'integer', minimum: 0, maximum: 255 },
                    winner: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(500).send({ error: 'Contract not initialized' });
        }

        const { player1, player2, matchId, player1Score, player2Score, winner } = request.body;

        try {
            const tx = await contract.reportMatch(player1, player2, matchId, player1Score, player2Score, winner);
            const receipt = await tx.wait();
            reply.send({
                success: true,
                transactionHash: tx.hash // copy paste in SnowTrace
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
