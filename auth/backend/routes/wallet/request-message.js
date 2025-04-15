import { createOrGetUser } from '../../models/walletUsers.js';

export default async function requestMessage(app) {
    app.post('/auth/wallet/request-message', async (req, reply) => {
        const { address } = req.body;

        if (!address) {
            return reply.code(400).send({ error: 'Missing address' });
        }

        const user = createOrGetUser(address);
        const message = `Sign to login.\nNonce: ${user.nonce}`;

        return reply.send({ message });
    });
}