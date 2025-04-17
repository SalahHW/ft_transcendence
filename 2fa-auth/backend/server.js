import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import generate2FA from './routes/generate.js';
import verify2FA from './routes/verify.js';
import status2FA from './routes/status.js';
import enable2FA from './routes/enable2fa.js';

export async function buildApp() {
    const app = Fastify({ logger: true });

    await app.register(swagger, {
        mode: 'static',
        specification: {
            path: './backend/openapi.yaml',
            baseDir: './'
        }
    });

    await app.register(swaggerUI, {
        routePrefix: '/docs'
    });

    await app.register(generate2FA, { prefix: '/2fa' });
    await app.register(verify2FA, { prefix: '/2fa' });
    await app.register(status2FA, { prefix: '/2fa' });
    await app.register(enable2FA, { prefix: '/2fa' });

    return app;
}

if (process.env.NODE_ENV !== 'test') {
    const app = await buildApp();
    const port = process.env.PORT || 4000;
    app.listen({ port, host: '0.0.0.0' });
}
