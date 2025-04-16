import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import requestMessage from './routes/request-message.js';
import verifyWallet from './routes/verify.js';
import dotenv from 'dotenv';

dotenv.config();

export async function buildApp() {
    const app = Fastify({ logger: true });

    await app.register(swagger, {
        mode: 'static',
        specification: {
            path: './backend/openapi.yaml'
        }
    });

    await app.register(swaggerUI, {
        routePrefix: '/docs'
    });

    await app.register(requestMessage, { prefix: '/auth/wallet' });
    await app.register(verifyWallet, { prefix: '/auth/wallet' });

    return app;
}

if (process.env.NODE_ENV !== 'test') {
    const app = await buildApp();
    const port = process.env.PORT || 4000;
    app.listen({ port, host: '0.0.0.0' });
}
