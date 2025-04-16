import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import requestMessage from './routes/request-message.js';
import verifyWallet from './routes/verify.js';

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

await app.register(requestMessage);
await app.register(verifyWallet);

const port = process.env.PORT || 4000;
app.listen({ port, host: '0.0.0.0' });
