export default async function meRoute(app) {
    app.get('/auth/me', { preValidation: [app.authenticate] }, async (request, reply) => {
        return { address: request.user.address };
    });
}
