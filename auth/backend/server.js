import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });
const PORT = process.env.PORT || 4000;

// CORS
const fastifyCors = (await import('@fastify/cors')).default;
await app.register(fastifyCors);

// JWT
await app.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET
});

// Swagger + UI
const fastifySwagger = (await import('@fastify/swagger')).default;
const fastifySwaggerUI = (await import('@fastify/swagger-ui')).default;

await app.register(fastifySwagger, {
    mode: 'static',
    specification: {
        path: './backend/openapi.yaml',
        type: 'yaml',
    }
});

await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    }
});

// Middleware global d’authentification
app.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        return reply.send(err);
    }
});

// Route de test
app.get('/', async (request, reply) => {
    return { message: 'Auth service is up and running' };
});

// Routes d’auth
await app.register(import('./routes/index.js'));

// Démarrage du serveur
try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
} catch (error) {
    app.log.error(error);
    process.exit(1);
}
