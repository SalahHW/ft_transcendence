import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fs from 'fs';
import path from 'path';

import signRoute from './routes/sign.js';
import refreshRoute from './routes/refresh.js';
import verifyRoute from './routes/verify.js';
import logoutRoute from './routes/logout.js';

export async function buildApp() {
    const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

    // Load RSA keys
    const privateKey = fs.readFileSync(path.resolve('backend/keys/private.key'));
    const publicKey = fs.readFileSync(path.resolve('backend/keys/public.key'));
    app.decorate('jwtKeys', { private: privateKey, public: publicKey });

    // Register OpenAPI doc
    await app.register(swagger, {
        mode: 'static',
        specification: {
            path: './backend/openapi.yaml'
        }
    });

    await app.register(swaggerUI, { routePrefix: '/docs' });

    // Register all routes
    await app.register(signRoute);
    await app.register(refreshRoute);
    await app.register(verifyRoute);
    await app.register(logoutRoute);

    return app;
}

// Launch only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const app = await buildApp();
    const port = process.env.PORT || 5000;
    app.listen({ port, host: '0.0.0.0' });
}
