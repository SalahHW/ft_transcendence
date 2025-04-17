import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export default async function generate2FA(app) {
    app.get('/generate', async (req, reply) => {
        const { address } = req.query;

        if (!address) {
            return reply.code(400).send({ error: 'Missing address' });
        }

        const secret = speakeasy.generateSecret({
            name: `WalletApp (${address})`
        });

        const otpauth = secret.otpauth_url;

        try {
            const qrCodeDataURL = await qrcode.toDataURL(otpauth);

            return reply.send({
                secret: secret.base32,
                otpauth_url: otpauth,
                qr_code: qrCodeDataURL
            });
        } catch (err) {
            return reply.code(500).send({ error: 'Failed to generate QR code' });
        }
    });
}
