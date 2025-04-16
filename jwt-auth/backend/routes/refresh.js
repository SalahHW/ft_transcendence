import jwt from 'jsonwebtoken';
import { getRevokedSince } from '../models/revokedTokens.js';

export default async function refreshRoute(app) {
    app.post('/jwt/refresh', async (req, reply) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return reply.code(400).send({ error: 'Missing refreshToken' });
        }

        try {
            const decoded = jwt.verify(refreshToken, app.jwtKeys.public, {
                algorithms: ['RS256']
            });

            const revokedSince = getRevokedSince(decoded.address);
            if (revokedSince && decoded.iat * 1000 < revokedSince) {
                return reply.code(401).send({ error: 'Token has been revoked' });
            }

            const now = Math.floor(Date.now() / 1000);

            const payload = {
                address: decoded.address,
                iat: now
            };

            const newAccessToken = jwt.sign(payload, app.jwtKeys.private, {
                algorithm: 'RS256',
                expiresIn: '15m'
            });

            const newRefreshToken = jwt.sign(payload, app.jwtKeys.private, {
                algorithm: 'RS256',
                expiresIn: '7d'
            });

            return reply.send({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });

        } catch (err) {
            return reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }
    });
}
