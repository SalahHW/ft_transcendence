import { PORT, isDev } from "./config/config.js";
import Fastify from "fastify";
import jwtPlugin from "./plugins/jwt.js";
import fastifyCookie from "@fastify/cookie";
import { initializeDatabase } from "./models/database.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();

// Initialize the database
try {
  await initializeDatabase();
} catch (error) {
  console.error("Failed to initialize the database: ", error.message);
  process.exit(1);
}

// Register Swagger in dev environment
if (isDev) {
  const { swagger, swaggerUi, swaggerConfig, swaggerUiConfig } = await import(
    "./config/swagger.js"
  );
  await fastify.register(swagger, swaggerConfig);
  await fastify.register(swaggerUi, swaggerUiConfig);
}

await fastify.register(jwtPlugin);
await fastify.register(fastifyCookie);
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
