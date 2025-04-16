import { getUser, updateNonce } from '../models/walletUsers.js';
import { verifyMessage } from 'ethers';

export default async function verifyWallet(app) {
    app.post('/wallet/verify', async (req, reply) => {
        const { address, signature } = req.body;

        if (!address || !signature) {
            return reply.code(400).send({ error: 'Missing fields' });
        }

        const user = getUser(address);
        if (!user) {
            return reply.code(400).send({ error: 'Unknown address' });
        }

        const expectedMessage = `Sign to login.\nNonce: ${user.nonce}`;

        try {
            const recovered = verifyMessage(expectedMessage, signature);
            if (recovered.toLowerCase() !== address.toLowerCase()) {
                return reply.code(401).send({ error: 'Invalid signature' });
            }

            updateNonce(address);

            return reply.send({
                address: recovered,
                is2faRequired: !!user.is2fa
            });

        } catch (err) {
            console.error("Verification failed:", err);
            return reply.code(500).send({ error: 'Verification error' });
        }
    });
}
