import speakeasy from 'speakeasy';
import users from '../../models/users.js';

export default async function verify2FARoute(app) {
    app.post('/auth/2fa/verify', { preValidation: [app.authenticate] }, async (request, reply) => {
        const { token } = request.body;
        const user = users.find(u => u.id === request.user.id);

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        if (!user.secret2fa) {
            return reply.status(400).send({ error: '2FA not initialized' });
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

        user.is2fa = true;

        return reply.send({ success: true, message: '2FA successfully enabled' });
    });
}
