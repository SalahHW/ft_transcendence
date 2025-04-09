module.exports = async function (fastify) {
    fastify.addHook('preSerialization', async (request, reply, payload) => {
        fastify.log.warn('✅ preSerialization hook triggered');

        try {
            const serialized = JSON.parse(
                JSON.stringify(payload, (_, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                )
            );
            return serialized;
        } catch (err) {
            fastify.log.warn('⚠️ Failed to serialize payload in bigIntSerializer:', err);
            return payload;
        }
    });
};
