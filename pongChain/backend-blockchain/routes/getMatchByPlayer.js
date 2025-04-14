const bigIntToString = require("../utils/bigIntToString");

module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract

    fastify.get('/match/player/:name', {
        schema: {
            params: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(500).send({ error: 'Contract not initialized' });
        }

        try {
            const matches = await contract.getMatchesByPlayer(request.params.name)
            reply.send(bigIntToString({ success: true, matches }))
        } catch (error) {
            request.log.error(error)
            reply.status(500).send({ success: false, error: error.message })
        }
    })
}