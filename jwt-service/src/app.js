import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";

import { SECRETKEY, PORT } from "./config/config.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();

fastify.register(cookie);
fastify.register(jwt, { secret: SECRETKEY });

await fastify.register(registerRoutes);

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
