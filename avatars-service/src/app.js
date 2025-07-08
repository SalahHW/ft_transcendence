import { PORT, isDev, AVATARS_PATH } from "./config/config.js";
import Fastify from "fastify";
import Multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { initializeDatabase } from "./models/database.js";
import { initializeFileStorage } from "./init/fileStorage.js";
import registerRoutes from "./routes/index.js";
import path from "path";

const fastify = Fastify();

async function main() {
  await initializeDatabase();
  await initializeFileStorage();

  await fastify.register(Multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 10 * 1024 * 1024, // For multipart forms, the max file size in bytes (10 MB)
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
      parts: 1000, // For multipart forms, the max number of parts (fields + files)
    },
  });

  await fastify.register(fastifyStatic, {
    root: path.resolve(AVATARS_PATH),
    prefix: "/avatars/",
  });

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
