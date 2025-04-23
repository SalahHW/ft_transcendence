const bigIntToString = require("../utils/bigIntToString");


module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract

    fastify.get('/tournament/:id', {
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(503).send({ error: 'Contract not initialized' });
        }

        try {
            const tournament = await contract.getTournamentById(request.params.id)
            reply.send(bigIntToString({ success: true, tournament }))
        } catch (error) {
            request.log.error(error)
            reply.status(500).send({ success: false, error: error.message })
        }
    })
}