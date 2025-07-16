import Fastify from "fastify";
import jwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { SECRETKEY, PORT } from "./config/config.js";
import { initializeRedis } from "./redis/redis.js";
import registerRoutes from "./routes/index.js";

async function main() {
  const fastify = Fastify();

  try {
    await fastify.register(fastifyCookie);
    await fastify.register(jwt, { secret: SECRETKEY });
    await initializeRedis(fastify);
  } catch (err) {
    console.error("Failed to register plugins:", err.message);
    process.exit(1);
  }

  await fastify.register(registerRoutes);

  try {
    const address = await fastify.listen({
      port: PORT,
      host: "0.0.0.0",
    });
    fastify.log.info(`server listening on ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
