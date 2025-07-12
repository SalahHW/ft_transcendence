export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.USERS_SERVICE_PORT;
export const DB_PATH = isDev
  ? process.env.DEV_DB_PATH
  : process.env.USERS_DB_PATH;
export const JWT_SERVICE_PORT = process.env.JWT_SERVICE_PORT;
export const JWT_SERVICE_HOST = process.env.JWT_SERVICE_HOST;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}

if (!JWT_SERVICE_PORT) {
  console.error("Unable to load jwt service port from environment variables");
  process.exit(1);
}

if (!JWT_SERVICE_HOST) {
  console.error("Unable to load jwt service host from environment variables");
  process.exit(1);
}
