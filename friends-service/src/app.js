import { PORT } from "./config/config.js";
import Fastify from "fastify";
import { initializeDatabase } from "./models/database.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();

async function main() {
  try {
    await initializeDatabase();
  } catch (err) {
    console.error("Failed to initialize the database: ", err.message);
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
