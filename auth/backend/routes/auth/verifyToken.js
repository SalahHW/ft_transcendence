export default async function verifyTokenRoute(app) {
    app.get('/auth/verify-token', {
        preValidation: [app.authenticate]
    }, async (request, reply) => {
        return { valid: true, user: request.user };
    });
}