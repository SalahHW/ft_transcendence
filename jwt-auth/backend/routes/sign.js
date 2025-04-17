import jwt from 'jsonwebtoken';

export default async function signRoute(app) {
    app.post('/jwt/sign', async (req, reply) => {
        const { address } = req.body;

        if (!address) {
            return reply.code(400).send({ error: 'Missing address' });
        }

        const payload = {
            address,
            iat: Math.floor(Date.now() / 1000)
        };

        const accessToken = jwt.sign(payload, app.jwtKeys.private, {
            algorithm: 'RS256',
            expiresIn: '15m'
        });

        const refreshToken = jwt.sign(payload, app.jwtKeys.private, {
            algorithm: 'RS256',
            expiresIn: '7d'
        });

        return reply.send({ accessToken, refreshToken });
    });
}
