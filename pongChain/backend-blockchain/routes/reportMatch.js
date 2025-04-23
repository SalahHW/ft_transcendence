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
            return reply.status(503).send({ error: 'Contract not initialized' });
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
        
            const reason = error?.reason || error?.error?.message || error?.message || '';
        
            if (reason.includes('Match already reported')) {
                return reply.status(409).send({
                    success: false,
                    error: 'Match has already been reported.'
                });
            }
        
            if (reason.includes('Invalid winner')) {
                return reply.status(422).send({
                    success: false,
                    error: 'Invalid winner address.'
                });
            }
        
            if (reason.includes('Match not found')) {
                return reply.status(404).send({
                    success: false,
                    error: 'Match not found.'
                });
            }
        
            if (reason.includes('Unauthorized')) {
                return reply.status(403).send({
                    success: false,
                    error: 'You are not allowed to report this match.'
                });
            }
        
            return reply.status(502).send({
                success: false,
                error: 'Blockchain error. Please try again later.',
                details: reason
            });
        }        
    });
};
