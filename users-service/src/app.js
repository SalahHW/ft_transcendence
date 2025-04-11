import { PORT } from "./config/config.js";
import Fastify from "fastify";
import jwtPlugin from "./plugins/jwt.js";
import { initializeDatabase } from "./models/initDb.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();

// Initialize the database
try {
  // TODO: make it async
  initializeDatabase();
} catch (err) {
  console.error("Failed to initialize the database:");
  process.exit(1);
}

// Register plugins
await fastify.register(jwtPlugin);
// Registers routes
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
    fastify.log.info(`server listening on ${address}`);
  }
);
