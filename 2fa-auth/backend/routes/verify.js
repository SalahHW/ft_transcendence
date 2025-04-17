import speakeasy from 'speakeasy';

export default async function verify2FA(app) {
    app.post('/verify', async (req, reply) => {
        const { address, token, secret } = req.body;

        if (!address || !token || !secret) {
            return reply.code(400).send({ error: 'Missing address, token or secret' });
        }

        const isVerified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!isVerified) {
            return reply.code(401).send({ error: 'Invalid or expired token' });
        }

        return reply.send({ success: true });
    });
}
