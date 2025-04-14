import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import users from '../../../models/users.js';

export default async function setup2FARoute(app) {
    app.post('/auth/setup-2fa', { preValidation: [app.authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const user = users.find(u => u.id === userId);

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        if (user.is2fa && user.secret2fa) {
            return reply.status(400).send({ error: '2FA already enabled' });
        }

        const secret = speakeasy.generateSecret({
            name: `ft_transcendence (${user.email})`,
            length: 20
        });

        user.secret2fa = secret.base32;

        const otpauthUrl = secret.otpauth_url;

        const qrCode = await qrcode.toDataURL(otpauthUrl);

        return reply.send({
            qrCode,
            manualKey: secret.base32
        });
    });
}
