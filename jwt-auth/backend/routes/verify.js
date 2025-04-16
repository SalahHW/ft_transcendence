import { getRevokedSince } from '../models/revokedTokens.js';
import jwt from 'jsonwebtoken';

export default async function verifyRoute(app) {
    app.get('/jwt/verify', async (req, reply) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, app.jwtKeys.public, {
                algorithms: ['RS256']
            });

            const revokedSince = getRevokedSince(decoded.address);
            if (revokedSince && decoded.iat * 1000 < revokedSince) {
                return reply.code(401).send({ error: 'Token has been revoked' });
            }

            return reply.send({ valid: true, payload: decoded });

        } catch (err) {
            return reply.code(401).send({ valid: false, error: 'Invalid or expired token' });
        }
    });
}