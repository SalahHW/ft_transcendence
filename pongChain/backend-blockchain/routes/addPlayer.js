module.exports = async (fastify, opts) => {
    const contract = fastify.masterContract

    fastify.post('/add-player', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'address'],
                properties: {
                    name: { type: 'string' },
                    address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }
                }
            }
        }
    }, async (request, reply) => {
        if (!contract) {
            return reply.status(500).send({ error: 'Contract not initialized' });
        }

        const { name, address } = request.body;

        try {
            const tx = await contract.addPlayer(name, address)
            const receipt = await tx.wait();

            reply.send({
                success: true,
                transactionHash: tx.hash // Copy past in SnowTrace
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