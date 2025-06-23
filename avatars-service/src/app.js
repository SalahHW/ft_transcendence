import { PORT, isDev } from "./config/config.js";
import Fastify from "fastify";
import Multipart from "@fastify/multipart";
import { initializeDatabase } from "./models/database.js";
import registerRoutes from "./routes/index.js";

const fastify = Fastify();

await fastify.register(Multipart, {
  limits: {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 10 * 1024 * 1024, // For multipart forms, the max file size in bytes (10 MB)
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
      parts: 1000, // For multipart forms, the max number of parts (fields + files)
    },
  },
});

// Initialize the database
try {
  await initializeDatabase();
} catch (error) {
  console.error("Failed to initialize the database: ", error.message);
  process.exit(1);
}

fastify.register(registerRoutes);

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
