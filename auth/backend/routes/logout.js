import users from '../models/users.js';

export default async function logoutRoute(app) {
    app.post('/auth/logout', { preValidation: [app.authenticate] }, async (request, reply) => {
        const user = users.find(u => u.id === request.user.id);
        if (user) {
            user.lastLogoutAt = Date.now();
        }
        return reply.send({ success: true });
    });
}
