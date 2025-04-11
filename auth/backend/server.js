import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });
const PORT = process.env.PORT || 4000;

const fastifyCors = (await import('@fastify/cors')).default;
await app.register(fastifyCors);

await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
});

app.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        return reply.send(err);
    }
});

// Route TEST
app.get('/', async (request, reply) => {
    return { message: 'Auth service is up and running' };
});

// Route AUTH
await app.register(import('./routes/auth/index.js'));

// Launch server
try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${PORT}`);
} catch (error) {
    app.log.error(error);
    process.exit(1);
}