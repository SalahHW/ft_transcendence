export default async function verifyTokenRoute(app) {
    app.get('/auth/verify-token', {
        preValidation: [app.authenticate]
    }, async (request, reply) => {
        const user = users.find(u => u.id === request.user.id);
        if (!user) {
            return reply.status(401).send({ valid: false });
        }

        if (user.lastLogoutAt && request.user.iat * 1000 < user.lastLogoutAt) {
            return reply.status(401).send({ valid: false, message: 'Token expired due to logout' });
        }

        return { valid: true, user: request.user };
    });
}