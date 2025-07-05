import fastify from "fastify";

const fastify = fastify();

export const isDev = process.env.NODE_ENV === "development";

const devPort = 3002;

export let onlineUsers = [];

export const PORT = isDev ? devPort : process.env.PRESENCES_SERVICE_PORT;

export const PRESENCES_SERVICE_TIMEOUT = 2000;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

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