export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.USERS_SERVICE_PORT;
export const DB_PATH = isDev
  ? process.env.DEV_DB_PATH
  : process.env.USERS_DB_PATH;

// Redis service
export const REDIS_HOST = process.env.REDIS_SERVICE_HOST;
export const REDIS_PORT = process.env.REDIS_SERVICE_PORT;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

export const REDIS_STREAMS = {
  USERS: process.env.USERS_SERVICE_STREAM,
};

export const REDIS_EVENTS = {
  USER_DELETED: process.env.USER_DELETED_EVENT,
};

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}

if (!REDIS_HOST) {
  console.error("Unable to load redis host from environmet variables");
  process.exit(1);
}
if (!REDIS_PORT) {
  console.error("Unable to load redis port from environmet variables");
  process.exit(1);
}
if (!REDIS_PASSWORD) {
  console.error("Unable to load redis password from environmet variables");
  process.exit(1);
}

if (!REDIS_STREAMS.USERS) {
  console.error("Unable to load users service stream from environment variables");
  process.exit(1);
}

if (!REDIS_EVENTS.USER_DELETED) {
  console.error("Unable to load user deleted event from environment variables");
  process.exit(1);
}
