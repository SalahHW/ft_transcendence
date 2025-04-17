export default async function status2FA(app) {
    app.get('/status', async (req, reply) => {
        return reply.send({ status: '2FA service is up and running' });
    });
}
