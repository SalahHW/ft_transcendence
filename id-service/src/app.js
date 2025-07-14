import { PORT } from "./config/config.js";
import Fastify from "fastify";
import { initializeDatabase } from "./models/database.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify({
  logger: true
});

// Initialize the database
try {
  await initializeDatabase();
} catch (error) {
  console.error("Failed to initialize the database: ", error.message);
  process.exit(1);
}

// Register routes
await fastify.register(registerRoutes);

// Start the server
fastify.listen(
  {
    port: PORT,
    host: "0.0.0.0",
  },
  (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`ID service listening on ${address}`);
  }
); 