module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract;

    fastify.post('/report-tournament', {
        schema: {
            body: {
                type: 'object',
                required: ['endTimestamp', 'matchIds', 'winner', 'tournamentTokenIds'],
                properties: {
                    endTimestamp: { type: 'integer', minimum: 0 },
                    matchIds: {
                        type: 'array',
                        items: { type: 'integer', minimum: 0 }
                    },
                    winner: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
                    tournamentTokenIds: { type: 'integer', minimum: 0 }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(503).send({ error: 'Contract not initialized' });
        }

        const { endTimestamp, matchIds, winner, tournamentTokenIds } = request.body;

        try {
            const tx = await contract.reportTournament(endTimestamp, matchIds, winner, tournamentTokenIds);
            const receipt = await tx.wait();
            reply.send({
                success: true,
                transactionHash: tx.hash
            });
        } catch (error) {
            request.log.error(error);
            const reason = error?.reason || error?.error?.message || error?.message || '';
        
            if (reason.includes('Tournament already reported')) {
                return reply.status(409).send({
                    success: false,
                    error: 'Tournament has already been reported.'
                });
            }
        
            if (reason.includes('Unauthorized')) {
                return reply.status(403).send({
                    success: false,
                    error: 'You are not authorized to report this tournament.'
                });
            }
        
            if (reason.includes('Tournament does not exist')) {
                return reply.status(404).send({
                    success: false,
                    error: 'Tournament not found.'
                });
            }
        
            if (reason.includes('Invalid matchIds') || reason.includes('Winner mismatch')) {
                return reply.status(422).send({
                    success: false,
                    error: 'Invalid match data or winner.'
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

