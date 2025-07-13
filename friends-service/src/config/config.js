export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.FRIENDS_SERVICE_PORT;
export const DB_PATH = isDev
  ? process.env.DEV_DB_PATH
  : process.env.FRIENDSHIPS_DB_PATH;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}

// JWT Service
export const JWT_SERVICE_PORT = process.env.JWT_SERVICE_PORT;
export const JWT_SERVICE_HOST = isDev
  ? "localhost"
  : process.env.JWT_SERVICE_HOST;

if (!JWT_SERVICE_PORT) {
  console.error("Unable to load jwt service port from environment variables");
  process.exit(1);
}

if (!JWT_SERVICE_HOST) {
  console.error("Unable to load jwt service host from environment variables");
  process.exit(1);
}

// Users Service
export const USERS_SERVICE_PORT = process.env.USERS_SERVICE_PORT;
export const USERS_SERVICE_HOST = isDev
  ? "localhost"
  : process.env.USERS_SERVICE_HOST;

if (!USERS_SERVICE_PORT) {
  console.error("Unable to load users service port from environment variables");
  process.exit(1);
}

if (!USERS_SERVICE_HOST) {
  console.error("Unable to load users service host from environment variables");
  process.exit(1);
}

export const USERS_SERVICE_TIMEOUT = 2000;
