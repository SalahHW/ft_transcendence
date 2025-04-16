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

        const accessToken = app.jwt.sign(payload, {
            algorithm: 'RS256',
            expiresIn: '15m',
            key: app.jwtKeys.private
        });

        const refreshToken = app.jwt.sign(payload, {
            algorithm: 'RS256',
            expiresIn: '7d',
            key: app.jwtKeys.private
        });

        return reply.send({ accessToken, refreshToken });
    });
}