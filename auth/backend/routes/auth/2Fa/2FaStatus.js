import users from '../../../models/users.js';

export default async function twoFAStatusRoute(app) {
    app.get('/auth/2fa/status', { preValidation: [app.authenticate] }, async (request, reply) => {
        const user = users.find(u => u.id === request.user.id);
        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return reply.send({ is2fa: user.is2fa });
    });
}
