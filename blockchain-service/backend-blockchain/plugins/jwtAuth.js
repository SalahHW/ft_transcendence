const fp = require('fastify-plugin');
const axios = require('axios');

async function jwtAuth(fastify, opts) {
    fastify.decorate('verifyJWT', async (request, reply) => {
        const authHeader = request.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Authorization header missing or invalid.' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const { data } = await axios.post(`${opts.jwtServiceUrl}/verify`, { token });

        } catch (error) {
            return reply.status(401).send({ error: 'Invalid or expired JWT.' });
        }
    });
}

module.exports = fp(jwtAuth);
