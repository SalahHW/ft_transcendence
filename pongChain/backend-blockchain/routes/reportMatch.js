module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract

    fastify.post('/report-match', {
        schema: {
            body: {
                type: 'object',
                required: ['matchId', 'winner', 'loser', 'scoreWinner', 'scoreLoser'],
                properties: {
                    matchId: { type: 'integer' },
                    winner: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
                    loser: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
                    scoreWinner: { type: 'integer' },
                    scoreLoser: { type: 'integer' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(500).send({ error: 'Contract not initialized' });
        }

        const { matchId, winner, loser, scoreWinner, scoreLoser } = request.body;

        try {
            const tx = await contract.reportMatch(matchId, winner, loser, scoreWinner, scoreLoser)
            const receipt = await tx.wait();
            reply.send({
                success: true,
                transactionHash: receipt.transactionHash // Copy past in SnowTrace
            })
        } catch (error) {
            request.log.error(error)
            reply.status(500).send({
                success: false,
                error: error.message
            })
        }
    })
}