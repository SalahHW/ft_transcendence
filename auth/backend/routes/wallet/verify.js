import { getUser, updateNonce } from '../../models/walletUsers.js';
import { ethers } from 'ethers';

export default async function verifySignature(app) {
    app.post('/auth/wallet/verify', async (req, reply) => {
        const { address, signature } = req.body;

        if (!address || !signature) {
            return reply.code(400).send({ error: 'Missing address or signature' });
        }

        const user = getUser(address);
        if (!user) {
            return reply.code(400).send({ error: 'Unknown address' });
        }

        const expectedMessage = `Sign to login.\nNonce: ${user.nonce}`;

        try {
            const recovered = ethers.utils.verifyMessage(expectedMessage, signature);

            if (recovered.toLowerCase() !== address.toLowerCase()) {
                return reply.code(401).send({ error: 'Invalid signature' });
            }

            updateNonce(address);

            const accessToken = app.jwt.sign({ address }, { expiresIn: '15m' });
            const refreshToken = app.jwt.sign({ address }, { expiresIn: '7d' });

            return reply.send({ accessToken, refreshToken });

        } catch (err) {
            console.error('Signature verification error:', err);
            return reply.code(500).send({ error: 'Verification failed' });
        }
    });
}
