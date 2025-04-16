import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fs from 'fs';
import path from 'path';
import signRoute from './routes/sign.js';
import refreshRoute from './routes/refresh.js';
import verifyRoute from './routes/verify.js';
import logoutRoute from './routes/logout.js';

const app = Fastify({ logger: true });

// Load RS256 keys
const privateKey = fs.readFileSync(path.resolve('backend/keys/private.key'));
const publicKey = fs.readFileSync(path.resolve('backend/keys/public.key'));

// Inject keys into app instance
app.decorate('jwtKeys', {
    private: privateKey,
    public: publicKey
});

// Swagger doc
await app.register(swagger, {
    mode: 'static',
    specification: {
        path: './backend/openapi.yaml'
    }
});

await app.register(swaggerUI, {
    routePrefix: '/docs'
});

// Register JWT routes
await app.register(signRoute);
await app.register(refreshRoute);
await app.register(verifyRoute);
await app.register(logoutRoute);

// Start server
const port = process.env.PORT || 5000;
app.listen({ port, host: '0.0.0.0' });
