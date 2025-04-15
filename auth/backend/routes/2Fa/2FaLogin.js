import speakeasy from 'speakeasy';
import users from '../../models/users.js';

export default async function login2FARoute(app) {
    app.post('/auth/2fa/login', async (request, reply) => {
        const { token, tempToken } = request.body;

        if (!token || !tempToken) {
            return reply.status(400).send({ error: '2FA code and tempToken are required' });
        }

        let decoded;
        try {
            decoded = app.jwt.verify(tempToken);
        } catch (err) {
            return reply.status(401).send({ error: 'Invalid or expired tempToken' });
        }

        if (decoded.is2faValidated !== false) {
            return reply.status(400).send({ error: 'Invalid token for 2FA validation' });
        }

        const user = users.find(u => u.id === decoded.id);
        if (!user || !user.secret2fa) {
            return reply.status(401).send({ error: '2FA not setup for this user' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.secret2fa,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return reply.status(401).send({ error: 'Invalid 2FA code' });
        }

        const accessToken = app.jwt.sign(
            { id: user.id, email: user.email },
            { expiresIn: '15m' }
        );

        const refreshToken = app.jwt.sign(
            { id: user.id },
            { expiresIn: '7d' }
        );

        return reply.send({ accessToken, refreshToken });
    });
}
