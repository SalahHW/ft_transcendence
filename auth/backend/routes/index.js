export default async function authRoutes(app) {
    await app.register(import('./me.js'));
    await app.register(import('./wallet/request-message.js'));
    await app.register(import('./wallet/verify.js'));
}
