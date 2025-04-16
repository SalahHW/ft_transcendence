import jwt from 'jsonwebtoken';
import { revokeAll } from '../models/revokedTokens.js';

export default async function logoutRoute(app) {
    app.post('/jwt/logout', async (req, reply) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, app.jwtKeys.public, {
                algorithms: ['RS256']
            });

            revokeAll(decoded.address);

            return reply.send({ success: true });

        } catch {
            return reply.code(401).send({ error: 'Invalid or expired token' });
        }
    });
}