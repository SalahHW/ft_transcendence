import users from '../../models/users.js';

export default async function refreshRoute(app) {
    app.post('/auth/refresh', async (request, reply) => {
        const { refreshToken } = request.body;

        if (!refreshToken) {
            return reply.status(400).send({ error: 'Refresh token is required' });
        }

        try {
            const decoded = app.jwt.verify(refreshToken);

            const user = users.find(u => u.id === decoded.id);
            if (!user) {
                return reply.status(401).send({ error: 'Invalid refresh token user' });
            }

            const accessToken = app.jwt.sign(
                { id: user.id, email: user.email },
                { expiresIn: '15m' }
            );

            const newRefreshToken = app.jwt.sign(
                { id: user.id },
                { expiresIn: '7d' }
            );

            return reply.send({ accessToken, refreshToken: newRefreshToken });
        } catch (err) {
            return reply.status(401).send({ error: 'Invalid or expired refresh token' });
        }
    });
}
