export default async function authRoutes(app) {
    await app.register(import('./login.js'));
    await app.register(import('./me.js'));
    await app.register(import('./register.js'));
    await app.register(import('./verifyToken.js'));
    await app.register(import('./refresh.js'));
    await app.register(import('./logout.js'));
    await app.register(import('./2Fa/setup2fa.js'));
    await app.register(import('./2Fa/verify2fa.js'));
    await app.register(import('./2Fa/2FaLogin.js'));
    await app.register(import('./2Fa/2FaStatus.js'));
}
