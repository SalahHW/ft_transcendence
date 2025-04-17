export default async function enable2FA(app) {
    app.post('/enable', async (req, reply) => {
        const { address } = req.body;

        if (!address) {
            return reply.code(400).send({ error: 'Missing address' });
        }

        return reply.send({ success: true, message: '2FA enabled' });
    });
}
