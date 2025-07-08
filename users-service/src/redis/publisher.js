import { redisClient } from "./init.js";
import { isDev, REDIS_STREAMS, REDIS_EVENTS } from "../config/config.js";

export async function publishUserDeleted(userId) {
  const stream = REDIS_STREAMS.USERS;
  const eventType = REDIS_EVENTS.USER_DELETED;

  console.log(userId);
  const payload = {
    userId,
    deletedAt: Date.now(),
  };

  try {
    const eventId = await redisClient.xadd(
      stream,
      "*",
      "event",
      eventType,
      "payload",
      JSON.stringify(payload)
    );

    if (isDev) console.log(`Published user.deleted event with ID: ${eventId}`);
  } catch (err) {
    console.error("Failed to publish user.deleted event:", err.message);
  }
}
