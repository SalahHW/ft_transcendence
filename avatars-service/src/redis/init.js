import Redis from "ioredis";
import {
  isDev,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
} from "../config/config.js";

export let redisClient;
export let redisReady = false;

export async function initializeRedis() {
  if (isDev) console.log("Initializing redis");
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis reconnect attempt #${times}, waiting ${delay}ms`);
      return delay;
    },
  });
  if (isDev) console.log("Redis initialized");
  redisClient.on("connect", () => {
    if (isDev) console.log("Redis connected");
  });

  redisClient.on("ready", () => {
    if (isDev) console.log("Redis ready to use");
    redisReady = true;
  });

  redisClient.on("error", (err) => {
    if (isDev) console.error("Redis connection error:", err.message);
    redisReady = false;
  });

  redisClient.on("close", () => {
    if (isDev) console.warn("Redis connection closed");
  });

  redisClient.on("reconnecting", () => {
    if (isDev) console.log("Redis reconnecting...");
  });
}
