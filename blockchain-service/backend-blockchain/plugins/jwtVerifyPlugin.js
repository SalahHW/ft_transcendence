import fp from 'fastify-plugin';
import axios from 'axios';

async function jwtVerifyPlugin(fastify, opts) {
    fastify.decorate('verifyJWT', async function (request, reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply
                .code(401)
                .send({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.slice(7);

        try {
            const response = await axios.post(
                `${process.env.JWT_SERVICE_URL}/verify`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            request.user = response.data.decoded;
        } catch (err) {
            request.log.error(err.message);
            return reply
                .code(401)
                .send({ error: 'Unauthorized', details: err.message });
        }
    });
}

export default fp(jwtVerifyPlugin);
