import config from './config/config.js';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { initializeDatabase } from './models/db.js';
import registerRoutes from './routes/index.js';

const fastify = Fastify();

// Initialize the database
try {
  initializeDatabase();
} catch (err) {
  console.error('Failed to initialize the database:');
  process.exit(1);
}

fastify.register(registerRoutes);

fastify.listen({
  port: config.PORT,
  host: '0.0.0.0'
}, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
})