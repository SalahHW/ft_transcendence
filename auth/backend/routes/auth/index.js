export default async function authRoutes(app) {
    await app.register(import('./login.js'));
    await app.register(import('./me.js'));
    await app.register(import('./register.js'));
    await app.register(import('./verifyToken.js'));
}
