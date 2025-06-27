import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { SECRETKEY, PORT } from "./config/config.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();
fastify.register(jwt, { secret: SECRETKEY });

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
