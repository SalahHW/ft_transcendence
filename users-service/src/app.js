import Fastify from 'fastify';
import { initializeDatabase } from './models/db.js';
import registerRoutes from './routes/index.js';

const fastify = Fastify();

// Initialize the database
initializeDatabase();

// Process env variables
const PORT = process.env.USERS_SERVICE_PORT;
const validEnvironement = PORT;

if (!validEnvironement) {
  console.error('Unable to load environement variables');
  process.exit(1);
}

fastify.register(registerRoutes);

fastify.listen({
  port: 3000,
  host: '0.0.0.0'
}, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
})