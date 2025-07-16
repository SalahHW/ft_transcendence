import redis from "@fastify/redis";
import {
  REDIS_SERVICE_HOST,
  REDIS_SERVICE_PORT,
  REDIS_SERVICE_PASSWORD,
} from "../config/config.js";

let reconnection = 0;

export async function initializeRedis(fastify) {
  await fastify.register(redis, {
    host: REDIS_SERVICE_HOST,
    port: REDIS_SERVICE_PORT,
    password: REDIS_SERVICE_PASSWORD,
    maxRetriesPerRequest: null,
  });

  fastify.redis.on("connect", () => {
    console.log("Redis: Connecting to Redis server...");
  });

  fastify.redis.on("ready", () => {
    console.log("Redis: Connection to Redis server succeed");
    reconnection = 0;
  });

  fastify.redis.on("reconnecting", (time) => {
    console.log(`Redis: Reconecting attempt ${reconnection}`);
    console.log(`Redis: Retrying in ${time} ms`);
    reconnection++;
  });

  fastify.redis.on("error", (err) => {
    console.error("Redis:", err.message);
  });

  try {
    await fastify.redis.ping();
    console.log("Redis: Connected to redis server");
  } catch (err) {
    console.error("Redis: Failed to connect to redis server");
    process.exit(1);
  }
}
